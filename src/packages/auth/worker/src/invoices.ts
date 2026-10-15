/**
 * Luật ghi bảng `invoices` — mọi tài khoản đăng nhập đều ghi được (mua hàng bắt buộc đăng nhập), nên Worker không tin
 * dữ liệu client (packages/pay/service/service.js chỉ là 1 client như mọi client khác):
 *
 *   Tạo mới (id chưa có)   server DỰNG LẠI hoá đơn: giá / tên / đơn vị lấy từ bảng `products` (theo meta.stockItems
 *                          {id, qty}), tổng tiền tự tính, trạng thái đặt về "chờ thanh toán", buyer_id = chính người
 *                          đang đăng nhập. Mã khuyến mãi (meta.promo = mã) kiểm + tính giảm giá theo bảng `promos`
 *                          (applyPromo), cộng lượt dùng nguyên tử. Trừ kho + báo Telegram (secret của Worker) tại đây.
 *   Người bán / quản trị   admin, có quyền `invoices.*`, hoặc chính seller_id NẾU id đó có trong env SELLER_IDS
 *                          (seller_id do trình duyệt gửi — không thì người mua tự đặt mình làm người bán) — xử lý đơn (meta, status, note);
 *                          chỉ admin / `invoices.*` mới sửa được phần còn lại (trừ id).
 *   Người mua              đúng buyer_id — CHỈ đi được 4 bước của người mua (BUYER_MOVES), server kiểm từ trạng thái
 *                          hiện tại, chỉ đổi đúng các field của bước đó. Đơn cũ của khách vãng lai (buyer_id rỗng):
 *                          chỉ người bán / quản trị xử lý.
 *
 * Hoàn kho: lúc meta.stockRestored chuyển false → true (huỷ / trả hàng) — server tự cộng trả, client không gọi _bump.
 * DELETE cả bảng / _batch / xoá mềm: chỉ admin hoặc `invoices.*` (data.ts).
 */
import type { DocStore } from './docStore';

type Doc = Record<string, any>;

export interface InvoiceActor {
  userId: string;  // người đang đăng nhập (data.ts đã bắt buộc)
  staff: boolean;  // admin hoặc có quyền `invoices.*`
}

export interface InvoiceEnv {
  TG_BOT_TOKEN?: string;
  TG_CHAT_ID?: string;
  SELLER_IDS?: string; // wrangler.jsonc — user id được quyền người bán trên đơn có seller_id = mình
}

export class InvoiceError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

const DELIVERY_CONFIRM_WINDOW_MS = 15 * 60 * 1000; // = packages/pay/tool/constant.js
const MAX_LINES = 50;
const MAX_QTY = 10_000;

const str = (v: unknown, max: number) => String(v ?? '').slice(0, max);
// Ô của chuỗi pipe (items/buyer/seller dùng '~' và '|') — không cho dữ liệu chèn thêm ô/dòng giả
const cell = (v: unknown, max = 200) => str(v, max).replace(/[~|\r\n]+/g, ' ').trim();
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const handlerAt = (h: unknown) => Number(String(h ?? '').split('~')[0]) || 0;

/** Các bước người mua được tự làm: điều kiện trên meta HIỆN TẠI → field meta được ghi → kiểm meta MỚI. */
const BUYER_MOVES: { keys: string[]; when: (m: Doc) => boolean; check: (n: Doc) => boolean }[] = [
  { // requestCancel — chỉ lúc đang chuẩn bị hàng, chưa có yêu cầu đang chờ
    keys: ['cancel', 'subStatus'],
    when: (m) => m.sub === 'preparing' && (!m.subStatus || m.subStatus === 'rejected'),
    check: (n) => n.subStatus === 'pending' && !!handlerAt(n.cancel),
  },
  { // confirmReceived
    keys: ['sub', 'received'],
    when: (m) => m.sub === 'delivered',
    check: (n) => n.sub === 'received',
  },
  { // autoConfirmReceived — chỉ khi đã quá hạn kể từ lúc người bán xác nhận giao tới (giờ server)
    keys: ['sub', 'received', 'autoCompleted'],
    when: (m) => m.sub === 'delivered' && handlerAt(m.delivered) > 0 && Date.now() - handlerAt(m.delivered) >= DELIVERY_CONFIRM_WINDOW_MS,
    check: (n) => n.sub === 'received' && n.autoCompleted === true,
  },
  { // requestReturn
    keys: ['sub', 'return', 'stockRestored'],
    when: (m) => m.major === 'delivery' && (m.sub === 'delivered' || m.sub === 'received'),
    check: (n) => n.sub === 'returned' && n.stockRestored === true,
  },
];

const priceOf = (p: Doc) => Number(String(p.pricing ?? '').split('~')[0]) || 0;
const unitOf = (p: Doc) => cell(String(p.pricing ?? '').split('~')[2] ?? '', 40);

/**
 * Mã khuyến mãi (bảng `promos`, tra theo `code`) → số tiền giảm. Cùng công thức <svc-cart> (giỏ hiển thị trước):
 * percent → làm tròn subTotal × % (≤ maxDiscount nếu có), fixed → đúng số tiền; không vượt subTotal.
 * Field: code, label, type 'percent'|'fixed', discount, quantity (lượt tối đa, trống/0 = không giới hạn), used,
 * minOrder, maxDiscount, status 'active', expires_at (tuỳ chọn), seller_id (tuỳ chọn — chỉ dùng cho đơn của người bán đó).
 */
async function applyPromo(store: DocStore, rawCode: unknown, subTotal: number, sellerId: string): Promise<{ promo: Doc; disc: number } | null> {
  const code = str(rawCode, 60).trim().toUpperCase();
  if (!code) return null;
  const promo = (await store.find('promos', { code }))[0] as Doc | undefined;
  const bad = (why: string) => new InvoiceError(`Promo code ${code}: ${why}`);
  if (!promo || promo.status !== 'active') throw bad('invalid');
  if (promo.expires_at && !(Date.parse(promo.expires_at) > Date.now())) throw bad('expired');
  if (promo.seller_id && promo.seller_id !== sellerId) throw bad('invalid');
  if (Number(promo.minOrder) > 0 && subTotal < Number(promo.minOrder)) throw bad('below minimum order');
  const value = Math.max(0, Number(promo.discount) || 0);
  const raw = promo.type === 'percent' ? Math.round(subTotal * Math.min(value, 100) / 100) : value;
  const cap = Number(promo.maxDiscount) > 0 ? Number(promo.maxDiscount) : Infinity;
  const disc = Math.min(raw, cap, subTotal);
  if (!(disc > 0)) throw bad('invalid');
  return { promo, disc };
}

/** Giữ 1 lượt dùng (nguyên tử) — hết lượt thì trả lại ngay và từ chối. */
async function takePromo(store: DocStore, promo: Doc) {
  const limit = Number(promo.quantity) || 0;
  const used = await store.bump('promos', promo.id, 'used', 1);
  if (used === null) throw new InvoiceError(`Promo code ${promo.code}: invalid`);
  if (limit > 0 && used > limit) {
    await store.bump('promos', promo.id, 'used', -1);
    throw new InvoiceError(`Promo code ${promo.code}: usage limit reached`);
  }
}

/** Hoá đơn mới — dựng lại từ bảng products, không lấy giá/tổng/trạng thái từ client. */
async function buildNew(store: DocStore, actor: InvoiceActor, id: string, body: Doc): Promise<{ doc: Doc; stock: { id: string; qty: number }[]; promo: Doc | null }> {
  const buyerId = actor.userId; // luôn là người đang đăng nhập — bỏ qua buyer_id client gửi

  const lines = Array.isArray(body.meta?.stockItems) ? body.meta.stockItems : [];
  if (!lines.length || lines.length > MAX_LINES) throw new InvoiceError('Invoice needs 1–50 product lines');
  const qtyById = new Map<string, number>();
  for (const l of lines) {
    const pid = str(l?.id, 100);
    const qty = Math.floor(Number(l?.qty));
    if (!pid || !Number.isFinite(qty) || qty < 1 || qty > MAX_QTY) throw new InvoiceError('Invalid product line');
    qtyById.set(pid, (qtyById.get(pid) ?? 0) + qty);
  }

  const stock: { id: string; qty: number }[] = [];
  const items: string[] = [];
  let subTotal = 0;
  for (const [pid, qty] of qtyById) {
    const p = (await store.findById('products', pid)) as Doc | null;
    if (!p || p.status !== 'active') throw new InvoiceError(`Product not available: ${pid}`);
    const price = priceOf(p);
    if (!price) throw new InvoiceError(`Product has no price (quote only): ${pid}`);
    const line = price * qty;
    subTotal += line;
    items.push([cell(p.title), price, unitOf(p), qty, 0, line, 0, 0].join('~')); // name~price~unit~qty~vat~total~… (pay parseInvoiceItems)
    stock.push({ id: pid, qty });
  }

  const meta = body.meta ?? {};
  const sellerId = str(body.seller_id, 100);
  const applied = await applyPromo(store, meta.promo, subTotal, sellerId);
  const disc = applied?.disc ?? 0;
  // buyer: name~phone~address~email~taxCode~userId — ô cuối luôn là người đang đăng nhập
  const buyer = str(body.buyer, 600).replace(/[|\r\n]+/g, ' ').split('~').slice(0, 5);
  while (buyer.length < 5) buyer.push('');
  const doc: Doc = {
    id,
    order_id: id,
    issued_at: new Date().toISOString(),
    status: 'issued',
    currency: 'VND',
    no: '', series: '',
    note: str(body.note, 1000),
    seller_id: sellerId,
    buyer_id: buyerId,
    seller: str(body.seller, 600).replace(/[|\r\n]+/g, ' '),
    buyer: [...buyer, buyerId].join('~'),
    items: items.join('|'),
    summary: `${subTotal}~0~${subTotal - disc}`, // subTotal~vatAmount~total — total đã trừ giảm giá
    meta: {
      major: 'order', sub: 'paying',
      bay_id: str(meta.bay_id, 100),
      payment_id: str(meta.payment_id, 100),
      buyer_confirmed: true,
      seller_confirmed: false,
      fulfillment: meta.fulfillment === 'pickup' ? 'pickup' : 'delivery',
      promo: applied ? applied.promo.code : null,
      disc,
      subStatus: null,
      stockItems: stock,
      stockRestored: false,
    },
  };
  return { doc, stock, promo: applied?.promo ?? null };
}

/** Patch người mua: chỉ `meta`, khớp đúng 1 bước trong BUYER_MOVES. */
function checkBuyerPatch(existing: Doc, body: Doc): Doc {
  const extra = Object.keys(body).filter((k) => k !== 'meta' && k !== 'id' && !same(body[k], existing[k]));
  if (extra.length) throw new InvoiceError('Forbidden', 403);
  const cur = existing.meta ?? {};
  const next = { ...cur, ...(body.meta ?? {}) };
  const changed = [...new Set([...Object.keys(cur), ...Object.keys(next)])].filter((k) => !same(cur[k], next[k]));
  if (!changed.length) return { meta: cur };
  const ok = BUYER_MOVES.some((m) => m.when(cur) && changed.every((k) => m.keys.includes(k)) && m.check(next));
  if (!ok) throw new InvoiceError('Forbidden', 403);
  return { meta: next };
}

/** Patch người bán (seller_id, không có quyền bảng): chỉ xử lý đơn — meta / status / note. */
function checkSellerPatch(existing: Doc, body: Doc): Doc {
  const allowed = new Set(['meta', 'status', 'note', 'id']);
  if (Object.keys(body).some((k) => !allowed.has(k) && !same(body[k], existing[k]))) throw new InvoiceError('Forbidden', 403);
  const { id: _id, ...rest } = body;
  return rest;
}

const isSeller = (env: InvoiceEnv, userId: string) =>
  String(env.SELLER_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean).includes(userId);

async function adjustStock(store: DocStore, lines: unknown, sign: 1 | -1) {
  for (const l of Array.isArray(lines) ? lines : []) {
    const qty = Math.floor(Number((l as Doc)?.qty));
    const pid = str((l as Doc)?.id, 100);
    if (!pid || !(qty > 0)) continue;
    try { await store.bump('products', pid, 'quantity', sign * qty); } catch { /* sản phẩm đã xoá — bỏ qua */ }
  }
}

async function notifyTelegram(env: InvoiceEnv, doc: Doc) {
  if (!env.TG_BOT_TOKEN || !env.TG_CHAT_ID) return;
  const fmt = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}đ`;
  const [name = '', phone = '', address = ''] = String(doc.buyer ?? '').split('~');
  const lines = String(doc.items).split('|').filter(Boolean).map((l) => {
    const [n, price, , qty] = l.split('~');
    return `• ${n} x${qty} — ${fmt(Number(price) * Number(qty))}`;
  });
  const total = Number(String(doc.summary).split('~')[2]) || 0;
  const text = [
    '🛒 Đơn hàng mới', `Mã đơn: ${doc.id}`, '', 'Sản phẩm:', ...lines, '',
    ...(doc.meta?.promo ? [`Mã khuyến mãi: ${doc.meta.promo} (−${fmt(Number(doc.meta.disc) || 0)})`] : []),
    `Tổng tiền: ${fmt(total)}`,
    `Hình thức: ${doc.meta?.fulfillment === 'pickup' ? 'Nhận tại quầy' : 'Giao hàng'}`,
    ...(doc.note ? ['', 'Yêu cầu đặc biệt:', doc.note] : []),
    '', 'Người mua:', `${name || '—'} — ${phone || '—'}`, ...(address ? [address] : []),
  ].join('\n');
  try {
    await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TG_CHAT_ID, text }),
    });
  } catch { /* best-effort — không chặn tạo đơn */ }
}

/** PATCH/PUT /v1/data/invoices/:id — tạo hoặc cập nhật theo luật ở đầu file. */
export async function writeInvoice(store: DocStore, env: InvoiceEnv, actor: InvoiceActor, id: string, body: Doc): Promise<void> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InvoiceError('Invalid body');
  const existing = (await store.findById('invoices', id)) as Doc | null;

  // Xoá mềm / khôi phục: chỉ quản trị. Mốc thời gian do server đặt (docStore) — bỏ giá trị client gửi.
  if (!actor.staff) {
    if ('deleted_at' in body) throw new InvoiceError('Forbidden', 403);
    delete body.created_at;
    delete body.updated_at;
  }

  if (!existing) {
    if (!/^[0-9A-Za-z_-]{10,64}$/.test(id)) throw new InvoiceError('Invalid invoice id');
    const { doc, stock, promo } = await buildNew(store, actor, id, body);
    if (promo) await takePromo(store, promo);
    await store.upsert('invoices', id, doc);
    await adjustStock(store, stock, -1);
    await notifyTelegram(env, doc);
    return;
  }

  let patch: Doc;
  if (actor.staff) {
    const { id: _id, ...rest } = body;
    patch = rest;
  } else if (actor.userId === existing.seller_id && isSeller(env, actor.userId)) {
    patch = checkSellerPatch(existing, body);
  } else if (existing.buyer_id && actor.userId === existing.buyer_id) {
    patch = checkBuyerPatch(existing, body);
  } else {
    throw new InvoiceError('Forbidden', 403);
  }

  const wasRestored = existing.meta?.stockRestored === true;
  await store.upsert('invoices', id, patch);
  const nowRestored = (patch.meta ?? existing.meta)?.stockRestored === true;
  if (!wasRestored && nowRestored) await adjustStock(store, existing.meta?.stockItems, 1);
}
