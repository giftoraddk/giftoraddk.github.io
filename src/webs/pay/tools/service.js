// src/webs/pay/tools/service.js
//
// Domain `pay` độc lập hoàn toàn với domain khác (xem docs/PAY.rst §1) — mọi hàm dưới đây tự viết,
// KHÔNG import tools/service.js của domain khác. Không có mesh/P2P — chỉ Firestore `listen()`
// thường, buyer/seller cùng đọc 1 invoice doc.
//
// 4 nhóm hàm trong file này:
//   1. ORDER / PAY FLOW — giỏ hàng tạm (trước khi có invoice) -> promote thành invoice thật ->
//      mọi bước xử lý/giao hàng/huỷ/trả hàng sau đó thao tác thẳng lên invoice (Firestore).
//   2. CART — item ops cho <svc-cart> (giỏ hàng riêng của domain này, không phải checkout).
//   3. PROMO — mã khuyến mãi cho <svc-cart>/<svc-pay-promo> (Storager key riêng).
//   4. CUSTOMER — hồ sơ liên hệ buyer cho <svc-pay-customer> (section riêng `pay_customer`).

import { state, make, get, subscribe as conductorSubscribe } from '@/services/conductor.js';
import { ulid, fmtPrice } from '@/services/helper.js';
import { createService } from '@/services/crud.js';
import { sendTelegramMessage } from '@/services/telegram.js';
import { PAYMENT_WINDOW_MS, DELIVERY_CONFIRM_WINDOW_MS } from './constant.js';

export { state, make, get };

// Wrapper dùng chung cho cả 3 nhóm section (order-local/cart/customer) — chỉ lọc bỏ section
// rỗng, không có gì đặc thù nghiệp vụ nên không cần tách riêng theo nhóm.
export function subscribe(name, listener) {
    return conductorSubscribe(name, section => { if (section) listener(section); });
}

// ════════════════════════════════════════════════════════════════════════════
// 1. ORDER / PAY FLOW
// ════════════════════════════════════════════════════════════════════════════

// ── Local conductor section (trước khi có invoice) ─────────────────────────

function _buildOrder(opts = {}) {
    const now = Date.now();
    return {
        order_id: opts.id || ulid(),
        bay_id: opts.bayId ?? '',
        seller_id: opts.sellerId ?? '',
        buyer_id: opts.buyerId ?? '',
        items: opts.items ?? [],
        notes: opts.notes ?? [], // ghi chú/yêu cầu đặc biệt từ <svc-cart> (cart:checkout's `notes`) — carry sang invoice.note lúc promoteToInvoice()
        promo: opts.promo ?? null, // mã khuyến mãi đã áp dụng lúc checkout (cart:checkout's `promo`) — carry sang invoice.meta.promo
        disc: safeDisc(opts.disc), // số tiền giảm giá đã tính sẵn ở <svc-cart> lúc checkout — subtotal (field `amount` bên dưới) KHÔNG trừ giảm giá; số thực phải trả = amount - disc, xem promoteToInvoice()/svc-pay.js's _comAmount
        amount: (opts.items ?? []).reduce((s, i) => s + Number(i.price ?? 0) * Number(i.qty ?? 1), 0),
        currency: 'VND',
        major: 'order',
        sub: 'placing',
        payment_id: null,
        buyer_confirmed: false,
        seller_confirmed: false,
        fulfillment: 'pickup', // 'delivery' | 'pickup' — chọn ngay ở bước "Đặt hàng" (svc-pay.js's
                                // web-toggle "Giao hàng", mặc định false/pickup), carry sang invoice.meta lúc promoteToInvoice()
        created_at: now,
        expires_at: null,
        updated_at: now,
    };
}

/** Flow setup: opts -> order tạm mới (major='order', sub='placing'). Idempotent — nếu section đã
 *  có order_id (dù terminal hay chưa) thì GIỮ NGUYÊN, không ghi đè. Muốn ép bắt đầu mới hẳn dùng
 *  startNewOrder() bên dưới — xem docs/PAY.rst §3.2. */
export function setup(name, opts = {}) {
    _bindOrderPersist(name); // [1] CHECK: đảm bảo đã bind persist Storager cho section này
    const existing = get(name);
    if (existing?.order_id) return existing; // [1.a] đã có order đang xử lý -> giữ nguyên
    const order = _buildOrder(opts); // [2] PROCESS
    make(name, order); // [3] EXECUTE
    return order; // [4] RETURN
}

/** Flow startNewOrder: opts -> order MỚI (ghi đè hẳn order_id/major/sub, khác setup() idempotent)
 *  — dùng khi order cũ đã terminal và buyer checkout tiếp. Bug-fix lịch sử: xem docs/PAY.rst §5
 *  "Mua tiếp sau khi order trước đã xong". */
export function startNewOrder(name, opts = {}) {
    const order = _buildOrder(opts); // [2] PROCESS
    make(name, order); // [3] EXECUTE
    return order; // [4] RETURN
}

// ── Persist order tạm qua Storager (IndexedDB) — F5/đóng tab không mất order đang xử lý, xem
// docs/PAY.rst §3.2 và §5 "F5 mất order — ĐÃ SỬA".

const _restoredOrderNames = new Set();
const _orderStorageKey = name => `pay_order_${name}`;

function _bindOrderPersist(name) {
    if (_restoredOrderNames.has(name)) return;
    _restoredOrderNames.add(name);
    _restoreOrderStorage(name);
    conductorSubscribe(name, s => {
        if (!s) return;
        import('@/services/storager.js').then(({ default: Storager }) => {
            Storager.set(_orderStorageKey(name), s, 0);
        });
    });
}

async function _restoreOrderStorage(name) {
    const { default: Storager } = await import('@/services/storager.js');
    const saved = await Storager.get(_orderStorageKey(name));
    if (!saved?.order_id) return;
    const current = get(name);
    if (current && current.sub === 'placing' && !current.items?.length) { // [1] CHECK: order hiện tại còn "trắng" (tránh đè order MỚI vừa bắt đầu)
        make(name, saved);
    }
}

function _sumAmount(items) { return items.reduce((sum, i) => sum + Number(i.qty ?? 1) * Number(i.price ?? 0), 0); }

// Chặn disc âm/NaN/không hữu hạn lọt vào order — <svc-cart>'s custom promo (form không validate số
// âm) hoặc 1 promosStore bên thứ 3 có thể gửi giá trị bất thường; disc ảnh hưởng trực tiếp SỐ TIỀN
// THẬT phải trả (xem promoteToInvoice()/svc-pay.js's _comAmount) nên phải chặn tại nguồn, không tin
// caller. Export để svc-pay.js's _comAmount (đọc trực tiếp `_order.disc`, kể cả order phục hồi từ
// Storager) dùng lại CÙNG 1 guard, tránh 2 nơi tính "amount thật phải trả" lệch nhau.
export function safeDisc(disc) {
    const n = Number(disc);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

export function addItem(name, item) {
    const s = get(name); if (!s) return;
    const items = [...(s.items ?? []), { id: item.id ?? ulid(), name: item.name, qty: item.qty ?? 1, price: item.price ?? 0 }];
    make(name, { items, amount: _sumAmount(items), updated_at: Date.now() });
}

export function removeItem(name, id) {
    const s = get(name); if (!s) return;
    const items = (s.items ?? []).filter(i => i.id !== id);
    make(name, { items, amount: _sumAmount(items), updated_at: Date.now() });
}

export function setQty(name, id, qty) {
    if (qty <= 0) { removeItem(name, id); return; }
    const s = get(name); if (!s) return;
    const items = (s.items ?? []).map(i => i.id === id ? { ...i, qty } : i);
    make(name, { items, amount: _sumAmount(items), updated_at: Date.now() });
}

/** Flow setOrderItems: order tạm (placing|paying) + items (+ optional notes/promo/disc) -> order tạm
 *  (items ghi đè, notes/promo/disc ghi đè NẾU caller có truyền); nếu đang 'paying' thì reset về
 *  'placing' + xoá expires_at (amount/QR cũ không còn đúng nữa) — dùng khi <svc-cart> handoff
 *  items mới sang <svc-pay> (setup() không tự cập nhật lại items cho order đã có order_id).
 *  `opts.notes`/`opts.promo`/`opts.disc` chỉ patch khi caller THẬT SỰ truyền (không mặc định
 *  `[]`/`null`/`0` đè lên giá trị cũ) — svc-pay.js's updated() gọi hàm này chỉ với `items` (đồng
 *  bộ prop `items`), không có ngữ cảnh notes/promo/disc, nên không được phép xoá mất giá trị đã
 *  có. Bug-fix lịch sử: xem docs/PAY.rst §5 "Sửa giỏ lúc đã ở bước paying". */
export function setOrderItems(name, items, opts = {}) {
    const s = get(name);
    if (!s || (s.sub !== 'placing' && s.sub !== 'paying')) return; // [1] CHECK
    const list = items ?? [];
    const wasPaying = s.sub === 'paying';
    make(name, { // [3] EXECUTE
        items: list,
        amount: _sumAmount(list),
        updated_at: Date.now(),
        ...('notes' in opts ? { notes: opts.notes } : {}),
        ...('promo' in opts ? { promo: opts.promo } : {}),
        ...('disc' in opts ? { disc: safeDisc(opts.disc) } : {}),
        ...(wasPaying ? { sub: 'placing', expires_at: null } : {}), // [3.a] paying -> reset về placing
    });
}

/** Flow setFulfillment: order tạm (placing|paying) + fulfillment -> order tạm (fulfillment cập
 *  nhật); nếu đang 'paying' VÀ giá trị thực sự đổi thì tự reset về 'placing' + xoá expires_at
 *  (cùng lý do với setOrderItems() — buộc buyer xác nhận lại, đặc biệt cần khi đổi sang 'delivery'
 *  để buyer còn được yêu cầu điền địa chỉ, chưa chắc đã điền nếu order phục hồi từ trạng thái
 *  'pickup' cũ). Dùng bởi <svc-pay>'s onlyDelivery (order phục hồi từ Storager có thể đang kẹt ở
 *  'paying' với fulfillment cũ trước khi onlyDelivery được set) — xem docs/PAY.rst §3.3 field
 *  `fulfillment`. */
export function setFulfillment(name, fulfillment) {
    const s = get(name);
    if (!s || (s.sub !== 'placing' && s.sub !== 'paying')) return; // [1] CHECK
    const value = fulfillment === 'pickup' ? 'pickup' : 'delivery';
    const wasPaying = s.sub === 'paying' && s.fulfillment !== value;
    make(name, { // [3] EXECUTE
        fulfillment: value,
        updated_at: Date.now(),
        ...(wasPaying ? { sub: 'placing', expires_at: null } : {}), // [3.a] giá trị THẬT SỰ đổi lúc đang paying -> reset về placing
    });
}

/** Flow placeOrder: order tạm (placing, có items) -> order tạm (paying, expires_at set). */
export function placeOrder(name) {
    const s = get(name);
    if (!s || !s.items.length || s.sub !== 'placing') return null; // [1] CHECK
    const now = Date.now();
    make(name, { sub: 'paying', expires_at: now + PAYMENT_WINDOW_MS, updated_at: now }); // [3] EXECUTE
    return get(name); // [4] RETURN
}

// ── Promote: order tạm -> invoice thật (Firestore, đúng docs/SCHEMA.rst bảng `invoice`) ────────

function _encodeItems(items) {
    return (items ?? []).map(i => [i.name ?? '', Number(i.price ?? 0), i.unit ?? '', Number(i.qty ?? 1), 0, Number(i.price ?? 0) * Number(i.qty ?? 1), 0, 0].join('~')).join('|');
}

function _invoiceSvc() { return createService('invoices', '', 'invoices'); }

// ── Đọc lại dữ liệu ĐÃ ĐÓNG BĂNG trên invoice (chuỗi pipe, encode lúc promoteToInvoice()) — dùng
// chung bởi <svc-pay-warden> và <svc-pay>'s panel xem lại major 'order' đã qua. ─────────────────

export function parseInvoiceItems(itemsStr) {
    return (itemsStr || '').split('|').filter(Boolean).map(p => {
        const [name, price, unit, qty] = p.split('~');
        return { name, price: Number(price) || 0, unit, qty: Number(qty) || 0 };
    });
}

// buyer: name~phone~address~email~(rỗng)~userId (xem _buildBuyerSlot).
export function parseInvoiceBuyer(buyerStr) {
    const [name = '', phone = '', address = '', email = ''] = (buyerStr || '').split('~');
    return { name, phone, address, email };
}

// seller: (3 slot tài khoản nhận tiền)~name~phone~address~email~taxCode~userId (xem _buildSellerSlot)
// — slot [3]/[4] là name/phone, khác vị trí với buyer (schema `buyer` chỉ 6 slot, name ở đầu).
export function parseInvoiceSeller(sellerStr) {
    const parts = (sellerStr || '').split('~');
    return { name: parts[3] || '', phone: parts[4] || '', address: parts[5] || '', email: parts[6] || '', taxCode: parts[7] || '' };
}

// Link tra cứu đơn hàng độc lập (src/pages/channel/invoice.astro) — dùng CHUNG bởi svc-pay.js's
// _comInvoiceUrl (QR/link tự hiện sau khi xác nhận thanh toán) VÀ svc-pay-warden.js's nút "mở tab
// mới" trên mỗi dòng. `sellerId`/`bayId` chỉ gắn khi role='seller' — trang đứng riêng, không có
// bay context nào khác, nên cần `bayId` để biết seller đang xử lý đơn này THAY MẶT kênh/bay nào,
// tương tác đúng như đang mở ngay từ chính bay đó (buyer's "đơn của tôi" xuyên mọi seller nên
// không có 1 bay cố định nào để gắn).
export function buildInvoiceUrl(invoiceId, { role, sellerId, bayId } = {}) {
    if (!invoiceId || typeof window === 'undefined') return '';
    const params = new URLSearchParams({ id: invoiceId });
    if (role === 'seller') {
        if (sellerId) params.set('sellerId', sellerId);
        if (bayId) params.set('bayId', bayId);
    }
    return `${window.location.origin}/channel/invoice?${params.toString()}`;
}

// Handler tracking — format tilde `getTime~name~phone~reason` dùng CHUNG mọi field xử lý bước
// (`return` thêm slot 5 `media`) — parse qua parseHandler(). `cancel`/`subStatus` là state machine
// huỷ đơn. Chi tiết từng field/ý nghĩa: xem docs/PAY.rst §3.3 (bảng field) và §3.4 (state machine).
function _encodeHandler(h = {}, withMedia = false) {
    const parts = [h.at ?? Date.now(), (h.name ?? '').trim(), (h.phone ?? '').trim(), (h.note ?? '').trim()];
    if (withMedia) parts.push((h.media ?? '').trim());
    return parts.join('~');
}

export function parseHandler(str) {
    const [at, name = '', phone = '', note = '', media = ''] = (str || '').split('~');
    return { at: Number(at) || 0, name, phone, note, media };
}

// Chuỗi pipe `buyer` đúng schema (docs/SCHEMA.rst: name~phone~address~email~taxCode~userId) —
// lấy từ entry mặc định (`isDefault`, hoặc entry đầu) của <svc-pay-customer> (section RIÊNG
// `pay_customer`, xem nhóm 4. CUSTOMER). Bug-fix lịch sử: xem docs/PAY.rst §5 "invoice.seller
// luôn trống" (cùng lỗi tương tự cũng từng xảy ra ở buyer).
function _buildBuyerSlot(buyerId) {
    const entries = get('pay_customer')?.entries ?? [];
    const entry = entries.find(e => e.isDefault) ?? entries[0] ?? {};
    const addr = (entry.location ?? '').split('~').filter(Boolean).join(', ');
    return [entry.fullName ?? '', entry.phone ?? '', addr, entry.email ?? '', '', buyerId ?? ''].join('~');
}

// Chuỗi pipe `seller` đúng schema (docs/SCHEMA.rst, 9 slot) — ghép `sellerSlot` (prop `seller`
// truyền vào <svc-pay>, 5 slot "name~phone~address~email~taxCode") vào đúng slot 3-7, userId ở
// slot cuối, 3 slot đầu (tài khoản nhận tiền) để trống. Bug-fix lịch sử: xem docs/PAY.rst §5
// "invoice.seller luôn trống".
function _buildSellerSlot(sellerSlot, sellerId) {
    const [name = '', phone = '', address = '', email = '', taxCode = ''] = (sellerSlot ?? '').split('~');
    return ['', '', '', name, phone, address, email, taxCode, sellerId ?? ''].join('~');
}

/** Flow promoteToInvoice: order tạm (paying) + paymentId/sellerSlot -> invoice thật Firestore
 *  (idempotent theo order_id), tạo NGAY khi buyer confirm — không đợi seller; notes/promo cũng
 *  đóng băng vào invoice.note/invoice.meta.promo tại đây. `summary`'s slot `total` đã trừ
 *  `s.disc` — số thực buyer phải trả, xem Addendum 2 (docs/PAY.rst). Lý do/field: xem
 *  docs/PAY.rst §1 điểm 3 và §3.3. */
export async function promoteToInvoice(name, paymentId, sellerSlot) {
    const s = get(name);
    if (!s || s.sub !== 'paying' || !paymentId) return null; // [1] CHECK
    const now = Date.now();
    const invoice = { // [2] PROCESS: dựng invoice đúng schema — chi tiết field: xem docs/PAY.rst §3.3
        id: s.order_id,
        order_id: s.order_id,
        issued_at: new Date(now).toISOString(),
        status: 'issued',
        currency: s.currency,
        no: '', series: '', note: (s.notes ?? []).join('; '), // ghi chú/yêu cầu đặc biệt buyer chọn ở <svc-cart>, đóng băng tại đây — xem docs/SCHEMA.rst's `note` field
        seller_id: s.seller_id,
        buyer_id: s.buyer_id,
        seller: _buildSellerSlot(sellerSlot, s.seller_id),
        buyer: _buildBuyerSlot(s.buyer_id),
        items: _encodeItems(s.items),
        summary: `${s.amount}~0~${Math.max(0, s.amount - safeDisc(s.disc))}`, // subTotal~vatAmount~total (docs/SCHEMA.rst) — total đã trừ s.disc (qua safeDisc phòng trường hợp order phục hồi từ Storager cũ/hỏng), xem docs/PAY.rst's ghi chú Addendum 2
        meta: {
            major: 'order', sub: 'paying',
            bay_id: s.bay_id,
            payment_id: paymentId,
            buyer_confirmed: true,
            seller_confirmed: false,
            fulfillment: s.fulfillment === 'pickup' ? 'pickup' : 'delivery', // chốt tại bước "Đặt hàng", xem setFulfillment()
            promo: s.promo ?? null, // mã khuyến mãi buyer áp dụng lúc checkout, đóng băng tại đây (KHÁC promos catalog của seller)
            subStatus: null,
        },
    };
    try {
        await _invoiceSvc().set(invoice.id, invoice); // [3] EXECUTE: ghi Firestore
    } catch (err) {
        console.error('[pay] promoteToInvoice Firestore error:', err);
        return null;
    }
    make(name, { payment_id: paymentId, buyer_confirmed: true, updated_at: now }); // [3.a] mirror local order
    return invoice; // [4] RETURN
}

/** Flow notifyOrderPlaced: invoice thật (vừa promoteToInvoice() thành công) -> push 1 tin nhắn
 *  Telegram tóm tắt đơn (sản phẩm/tổng tiền/hình thức nhận hàng/người mua). Best-effort — lỗi gửi
 *  (mạng, chưa cấu hình PUBLIC_TG,...) KHÔNG được chặn flow đặt hàng, nên tự bọc try/catch riêng
 *  và không throw/không return gì cho caller chờ. */
export function notifyOrderPlaced(invoice) {
    if (!invoice) return;
    const buyer = parseInvoiceBuyer(invoice.buyer);
    const items = parseInvoiceItems(invoice.items);
    const summaryParts = (invoice.summary || '0~0~0').split('~');
    const subTotal = Number(summaryParts[0]) || 0;
    const totalNum = Number(summaryParts[2]);
    // summary méo (không đủ 3 phần, hoặc slot total không phải số) -> coi như KHÔNG có giảm giá
    // (total = subTotal) thay vì mặc định total=0, tránh hiện nhầm 1 khoản "Giảm giá" giả cho đơn
    // không hề có giảm giá. Number.isFinite (không dùng `||`) để phân biệt total=0 THẬT (đơn được
    // giảm 100%, vd promo FREE100) với total THIẾU/hỏng.
    const total = summaryParts.length === 3 && Number.isFinite(totalNum) ? totalNum : subTotal;
    const discount = Math.max(0, subTotal - total);
    const fulfillmentLabel = invoice.meta?.fulfillment === 'delivery' ? 'Giao hàng' : 'Nhận tại quầy';

    const lines = [
        '🛒 Đơn hàng mới',
        `Mã đơn: ${invoice.id}`,
        '',
        'Sản phẩm:',
        ...items.map(i => `• ${i.name} x${i.qty} — ${fmtPrice(i.price * i.qty)}`),
        '',
        `Tổng tiền: ${fmtPrice(subTotal)}`,
        ...(discount > 0 ? [`Giảm giá: -${fmtPrice(discount)}`, `Thành tiền: ${fmtPrice(total)}`] : []),
        ...(invoice.meta?.promo ? [`Mã khuyến mãi: ${invoice.meta.promo}`] : []),
        `Hình thức: ${fulfillmentLabel}`,
        ...(invoice.note ? ['', 'Yêu cầu đặc biệt:', invoice.note] : []),
        '',
        'Người mua:',
        `${buyer.name || '—'} — ${buyer.phone || '—'}`,
        ...(buyer.address ? [buyer.address] : []),
    ];

    sendTelegramMessage(lines.join('\n')).catch(() => {}); // [3] EXECUTE — fire-and-forget, lỗi tự log trong sendTelegramMessage
}

// ── Post-invoice: mọi thao tác sau đó thẳng lên Firestore, invoiceId là khoá ────────────────────

/** Flow _patchInvoiceMeta: invoiceId + guard/patchFn -> invoice.meta patched (read-modify-write,
 *  crud.js's update() không deep-merge JSONB — cùng tradeoff `bumpMeta`, xem docs/SCHEMA.rst).
 *  guard(meta,row) false -> no-op (null). */
async function _patchInvoiceMeta(invoiceId, guard, patchFn, extra = {}) {
    const svc = _invoiceSvc();
    const row = await svc.findById(invoiceId); // [1] CHECK: load hiện trạng
    if (!row) return null;
    const curMeta = row.meta ?? {};
    if (guard && !guard(curMeta, row)) return null; // [1.a] guard từ chối -> no-op
    const patch = typeof patchFn === 'function' ? patchFn(curMeta, row) : patchFn; // [2] PROCESS
    const meta = { ...curMeta, ...patch };
    const now = Date.now();
    try {
        await svc.update(invoiceId, { meta, ...extra }); // [3] EXECUTE
    } catch (err) {
        console.error('[pay] _patchInvoiceMeta Firestore error:', err);
        return null;
    }
    return { ...row, meta, ...extra, _patchedAt: now }; // [4] RETURN
}

// crud.js's .listen() trả về Promise<unsubscribe> (không đồng bộ) nhưng mọi call site coi
// listenXxx() dưới đây như trả thẳng 1 hàm unsub gọi NGAY được — bọc lại đồng bộ hoá ngay lập
// tức. Bug-fix lịch sử: xem docs/PAY.rst §5 "TypeError: this._unsubInvoice is not a function".
function _syncUnsub(listenPromise) {
    let unsub = null;
    let cancelled = false;
    listenPromise.then(fn => { if (cancelled) fn(); else unsub = fn; });
    return () => { cancelled = true; unsub?.(); unsub = null; };
}

export function listenInvoice(invoiceId, onNext, onErr) {
    return _syncUnsub(_invoiceSvc().listen({}, rows => onNext(rows.find(r => r.id === invoiceId) ?? null), onErr));
}

export function loadSellerInvoices(sellerId) {
    return _invoiceSvc().findAll({ filters: { seller_id: sellerId } });
}

export function listenSellerInvoices(sellerId, onNext, onErr) {
    return _syncUnsub(_invoiceSvc().listen({ filters: { seller_id: sellerId } }, onNext, onErr));
}

// "Đơn của tôi" (buyer) — chỉ lọc buyer_id (xuyên mọi seller đã từng mua), xem docs/PAY.rst §3.9.
export function loadBuyerInvoices(buyerId) {
    return _invoiceSvc().findAll({ filters: { buyer_id: buyerId } });
}

export function listenBuyerInvoices(buyerId, onNext, onErr) {
    return _syncUnsub(_invoiceSvc().listen({ filters: { buyer_id: buyerId } }, onNext, onErr));
}

// ── Meta status predicates — dùng chung bởi <svc-pay-warden>'s badge count + row actions (trước
// đây lặp lại 2-3 lần mỗi biểu thức trong file đó) ──────────────────────────────────────────────

export function isPendingPayment(meta) {
    return meta.major === 'order' && meta.sub === 'paying' && meta.buyer_confirmed && !meta.seller_confirmed;
}

export function isAwaitingReceived(meta) {
    return meta.major === 'delivery' && meta.sub === 'delivered';
}

export function needsRefund(meta) {
    return ['cancelled', 'returned'].includes(meta.sub) && !meta.refunded;
}

/** Flow confirmReceivedMoney: invoice (order/paying, buyer đã xác nhận) + handler -> invoice
 *  (processing/preparing), stamp meta.preparing (dự kiến — completeProcessing() sẽ ghi đè lúc kết
 *  thúc). Chi tiết field/fulfillment: xem docs/PAY.rst §3.3. */
export function confirmReceivedMoney(invoiceId, handler = {}) {
    return _patchInvoiceMeta(
        invoiceId,
        meta => isPendingPayment(meta), // [1] CHECK
        { major: 'processing', sub: 'preparing', seller_confirmed: true, preparing: _encodeHandler(handler) }, // [3] EXECUTE
    );
}

/** Flow completeProcessing: invoice (processing/preparing) + handler -> invoice (processing/done)
 *  HOẶC (delivery/received) nếu fulfillment='pickup' — xem docs/PAY.rst §3.3 field `fulfillment`. */
export function completeProcessing(invoiceId, handler = {}) {
    return _patchInvoiceMeta(
        invoiceId,
        meta => meta.major === 'processing' && meta.sub === 'preparing', // [1] CHECK
        meta => meta.fulfillment === 'pickup' // [2] PROCESS: rẽ nhánh theo fulfillment
            ? { major: 'delivery', sub: 'received', received: _encodeHandler(handler) } // [2.a] pickup: bỏ qua packing/shipping/delivered
            : { sub: 'done', preparing: _encodeHandler(handler) }, // [2.b] delivery: dừng ở done, chờ advanceToDelivery()
    );
}

/** Flow advanceToDelivery: invoice (processing/done) -> invoice (delivery/packing). Không nhận
 *  `handler` — người soạn hàng nhập ngay trên màn 'packing' (xem startShipping()), tránh lệch vai
 *  trò, xem docs/PAY.rst §3.3 field `packing`. */
export function advanceToDelivery(invoiceId) {
    return _patchInvoiceMeta(
        invoiceId,
        meta => meta.major === 'processing' && meta.sub === 'done', // [1] CHECK
        { major: 'delivery', sub: 'packing' }, // [3] EXECUTE
    );
}

/** Flow startShipping: invoice (packing) + handler -> invoice (shipping), stamp meta.packing —
 *  xem docs/PAY.rst §3.3 field `packing`/`shipping`. */
export function startShipping(invoiceId, handler = {}) {
    return _patchInvoiceMeta(invoiceId, meta => meta.sub === 'packing', { sub: 'shipping', packing: _encodeHandler(handler) }); // [1][3]
}

/** Flow confirmShipped: invoice (shipping) + handler -> invoice (delivered), stamp meta.shipping
 *  (ai đã chuyển giao cho đơn vị giao hàng — KHÁC meta.delivered, xem confirmDeliveryDone() ngay
 *  dưới, mốc "đã THẬT SỰ giao tới tay buyer"). */
export function confirmShipped(invoiceId, handler = {}) {
    return _patchInvoiceMeta(invoiceId, meta => meta.sub === 'shipping', { sub: 'delivered', shipping: _encodeHandler(handler) }); // [1][3]
}

/** Flow confirmDeliveryDone: invoice (delivered, chưa meta.delivered) + handler (kèm media, ảnh
 *  minh chứng giống requestReturn()) -> invoice (stamp meta.delivered, KHÔNG đổi sub). Seller/
 *  shipper tự xác nhận NGAY TRÊN màn 'delivered' rằng hàng đã thật sự tới tay buyer — mốc giờ này
 *  mới là cái autoConfirmReceived() dùng để tính deadline, xem docs/PAY.rst §3.6. */
export function confirmDeliveryDone(invoiceId, handler = {}) {
    return _patchInvoiceMeta(
        invoiceId,
        meta => meta.sub === 'delivered' && !meta.delivered, // [1] CHECK: chỉ xác nhận 1 lần
        { delivered: _encodeHandler(handler, true) }, // [3] EXECUTE (withMedia)
    );
}

/** Flow confirmReceived: invoice (delivered) + handler -> invoice (received) — terminal trừ khi
 *  buyer trả hàng sau đó (xem requestReturn()). Buyer có thể tự bấm bất kỳ lúc nào, không phụ
 *  thuộc confirmDeliveryDone() đã chạy hay chưa. */
export function confirmReceived(invoiceId, handler = {}) {
    return _patchInvoiceMeta(invoiceId, meta => meta.sub === 'delivered', { sub: 'received', received: _encodeHandler(handler) }); // [1][3]
}

/** Flow autoConfirmReceived: invoice (delivered, quá hạn DELIVERY_CONFIRM_WINDOW_MS kể từ
 *  meta.delivered) -> invoice (received, autoCompleted=true). Idempotent (guard theo mốc giờ)
 *  — gọi lặp từ client bất kỳ đang mở invoice, xem docs/PAY.rst §3.6. */
export function autoConfirmReceived(invoiceId) {
    return _patchInvoiceMeta(
        invoiceId,
        meta => { // [1] CHECK: đã quá hạn kể từ lúc confirmDeliveryDone() stamp meta.delivered?
            const deliveredAt = parseHandler(meta.delivered).at;
            return meta.sub === 'delivered' && deliveredAt && (Date.now() - deliveredAt >= DELIVERY_CONFIRM_WINDOW_MS);
        },
        { sub: 'received', autoCompleted: true, received: _encodeHandler({}) }, // [3] EXECUTE: tự động, không name/phone/note
    );
}

// ── Cancel: buyer request (+ lý do) -> pending -> seller accept/reject, HOẶC seller tự huỷ thẳng
// (sellerCancelOrder) — state machine đầy đủ: xem docs/PAY.rst §3.4.

/** Flow requestCancel: invoice (preparing, không có yêu cầu huỷ pending) + reason/handler ->
 *  invoice (subStatus='pending'), stamp meta.cancel — xem docs/PAY.rst §3.4. */
export function requestCancel(invoiceId, reason, handler = {}) {
    const trimmed = (reason ?? '').trim();
    if (!trimmed) return null; // [1] CHECK
    return _patchInvoiceMeta(
        invoiceId,
        meta => meta.sub === 'preparing' && (!meta.subStatus || meta.subStatus === 'rejected'), // [1.a] cho gửi lại nếu đã bị reject
        () => ({ cancel: _encodeHandler({ ...handler, note: trimmed }), subStatus: 'pending' }), // [3] EXECUTE
    );
}

/** Flow acceptCancel: invoice (subStatus='pending') + handler -> invoice (cancelled,
 *  buyer_cancelled) terminal, stamp meta.sellerCancelled — xem docs/PAY.rst §3.4. */
export function acceptCancel(invoiceId, handler = {}) {
    return _patchInvoiceMeta(
        invoiceId,
        meta => meta.subStatus === 'pending', // [1] CHECK
        { sub: 'cancelled', subStatus: 'buyer_cancelled', sellerCancelled: _encodeHandler(handler) }, // [3] EXECUTE
        { status: 'cancelled' },
    );
}

/** Flow sellerCancelOrder: invoice (preparing, không đang pending) + reason/handler -> invoice
 *  (cancelled, seller_cancelled) terminal NGAY (không qua accept), stamp meta.cancel — xem
 *  docs/PAY.rst §3.4. */
export function sellerCancelOrder(invoiceId, reason, handler = {}) {
    const trimmed = (reason ?? '').trim();
    if (!trimmed) return null; // [1] CHECK
    return _patchInvoiceMeta(
        invoiceId,
        meta => meta.sub === 'preparing' && meta.subStatus !== 'pending',
        () => ({ sub: 'cancelled', subStatus: 'seller_cancelled', cancel: _encodeHandler({ ...handler, note: trimmed }) }), // [3] EXECUTE
        { status: 'cancelled' },
    );
}

/** Flow confirmRefund: invoice (cancelled|returned, chưa refunded) + handler -> invoice (stamp
 *  meta.refunded, không đổi major/sub) — xem docs/PAY.rst §3.5. */
export function confirmRefund(invoiceId, handler = {}) {
    return _patchInvoiceMeta(
        invoiceId,
        meta => needsRefund(meta), // [1] CHECK
        () => ({ refunded: _encodeHandler(handler) }), // [3] EXECUTE
    );
}

/** Flow rejectCancel: invoice (subStatus='pending') + rejectReason/handler -> invoice
 *  (subStatus='rejected'), stamp meta.sellerCancelled (note = lý do từ chối) — xem
 *  docs/PAY.rst §3.4. */
export function rejectCancel(invoiceId, rejectReason, handler = {}) {
    const trimmed = (rejectReason ?? '').trim();
    if (!trimmed) return null; // [1] CHECK
    return _patchInvoiceMeta(
        invoiceId,
        meta => meta.subStatus === 'pending',
        { subStatus: 'rejected', sellerCancelled: _encodeHandler({ ...handler, note: trimmed }) }, // [3] EXECUTE
    );
}

/** Flow requestReturn: invoice (delivery: delivered|received) + reason/handler -> invoice
 *  (returned) terminal NGAY, stamp meta.return (5 slot, kèm media) — xem docs/PAY.rst §3.5. */
export function requestReturn(invoiceId, reason, handler = {}) {
    const trimmed = (reason ?? '').trim();
    if (!trimmed) return null; // [1] CHECK
    return _patchInvoiceMeta(
        invoiceId,
        meta => meta.major === 'delivery' && (meta.sub === 'delivered' || meta.sub === 'received'),
        () => ({ sub: 'returned', return: _encodeHandler({ ...handler, note: trimmed }, true) }), // [3] EXECUTE
    );
}

// ════════════════════════════════════════════════════════════════════════════
// 2. CART — item ops cho <svc-cart> (bản clone độc lập, chỉ phần "thêm vào giỏ")
// ════════════════════════════════════════════════════════════════════════════

const _restoredCartNames = new Set();
let _activeCartName = null;
let _cellActionBound = false;

function _bindCellAction() {
    if (_cellActionBound) return;
    _cellActionBound = true;
    document.addEventListener('cell-action', (e) => {
        const { action, info } = /** @type {CustomEvent} */ (e).detail ?? {};
        if (action !== 'add-to-cart' || !info?.id || !_activeCartName) return;
        const pricingNum = Number((info.pricing || '').split('~')[0]) || 0;
        const price = info.meta?.price ?? info.price ?? pricingNum;
        addCartItem(_activeCartName, {
            id: info.id,
            name: info.title ?? info.name,
            price,
            formattedPrice: info.meta?.formattedPrice ?? info.formattedPrice,
            img: info.pics ?? info.img,
        });
        make(_activeCartName, { open: true });
    });
}

export function setupCart(name, items = [], opts = {}) {
    make(name, {
        items,
        checkedNotes: [],
        open: opts.open ?? false,
        promos: opts.promos ?? [],
        notes: opts.notes ?? [],
    });
}

export function initCart(name) {
    _activeCartName = name;
    _bindCellAction();
    if (_restoredCartNames.has(name)) return;
    _restoredCartNames.add(name);
    _restoreCartStorage(name);
}

async function _restoreCartStorage(name) {
    const { default: Storager } = await import('@/services/storager.js');
    const [savedItems, savedPromos] = await Promise.all([
        Storager.get(`paycart_${name}`),
        Storager.get(`paycart_promos_${name}`),
    ]);
    if (Array.isArray(savedItems) && savedItems.length) make(name, { items: savedItems });
    if (Array.isArray(savedPromos) && savedPromos.length) make(name, { promos: savedPromos });

    conductorSubscribe(name, s => {
        if (!s) return;
        Storager.set(`paycart_${name}`, s.items ?? [], 0);
        Storager.set(`paycart_promos_${name}`, s.promos ?? [], 0);
    });
}

export function addCartItem(name, item) {
    const s = get(name);
    if (!s) return;
    const items = s.items ?? [];
    const existing = items.find(i => i.id === item.id);
    make(name, {
        items: existing
            ? items.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
            : [...items, { ...item, qty: 1 }],
    });
}

export function removeCartItem(name, id) {
    const s = get(name); if (!s) return;
    make(name, { items: (s.items ?? []).filter(i => i.id !== id) });
}

export function setCartQty(name, id, qty) {
    if (qty <= 0) { removeCartItem(name, id); return; }
    const s = get(name); if (!s) return;
    make(name, { items: (s.items ?? []).map(i => i.id === id ? { ...i, qty } : i) });
}

export function toggleCartNote(name, note) {
    const s = get(name); if (!s) return;
    const notes = new Set(s.checkedNotes ?? []);
    notes.has(note) ? notes.delete(note) : notes.add(note);
    make(name, { checkedNotes: [...notes] });
}

/** Flow clearCart: cart -> items rỗng. CHỈ gọi sau khi payment đã xác nhận (promoteToInvoice()
 *  thành công) — không phải mỗi lần checkout, xem docs/PAY.rst §5 "Giỏ hàng bị xoá NGAY khi
 *  checkout". `promos` không bị đụng (catalog của seller, không phải state của đơn này). */
export function clearCart(name) {
    const s = get(name); if (!s) return; // [1] CHECK
    make(name, { items: [], checkedNotes: [] }); // [3] EXECUTE
}

// ════════════════════════════════════════════════════════════════════════════
// 3. PROMO — mã khuyến mãi cho <svc-cart>/<svc-pay-promo>
// ════════════════════════════════════════════════════════════════════════════
//
// Chủ động CHỈ lưu IndexedDB cục bộ (conductor + Storager) — KHÔNG qua Firestore. Mã seller tạo
// trên thiết bị của họ không tự đồng bộ sang thiết bị khác — đánh đổi đã biết, xem docs/PAY.rst §3.8.

export function addPromo(name, promo) {
    const s = get(name); if (!s) return;
    make(name, { promos: [...(s.promos ?? []), promo] });
}

export function removePromo(name, code) {
    const s = get(name); if (!s) return;
    make(name, { promos: (s.promos ?? []).filter(p => p.code !== code) });
}

export function usePromo(name, code) {
    const s = get(name); if (!s) return;
    make(name, { promos: (s.promos ?? []).map(p => p.code === code ? { ...p, used: (p.used ?? 0) + 1 } : p) });
}

// ════════════════════════════════════════════════════════════════════════════
// 4. CUSTOMER — hồ sơ liên hệ buyer cho <svc-pay-customer> (section RIÊNG `pay_customer`,
//    không dùng chung với store "thông tin khách hàng" nào của domain khác)
// ════════════════════════════════════════════════════════════════════════════

const _CUS_STD = { entries: [], payment: { cards: [], banks: [] } };

export function newCustomerEntry() {
    return { id: Date.now().toString(), fullName: '', phone: '', email: '', location: '', isDefault: false };
}

export function setupCustomer(name) {
    make(name, { ..._CUS_STD });
}

export async function initCustomer(name) {
    const { default: Storager } = await import('@/services/storager.js');
    const saved = await Storager.get(name);
    if (saved) { make(name, { ..._CUS_STD, ...saved }); return; }
}

// Mồi/bổ sung field còn TRỐNG của entry mặc định trong "Thông tin khách hàng" — gọi bởi domain
// biết rõ hơn về người mua (vd svc-bay.js: nếu người đang đăng nhập CHÍNH LÀ chủ 1 bay khác, dùng
// luôn phone/địa chỉ đã xác minh lúc họ tạo bay đó khi đi MUA ở 1 bay khác). Hàm này thuần —
// KHÔNG tự biết gì về "bay", chỉ nhận sẵn field cần điền, giữ `pay` độc lập domain (xem
// docs/PAY.rst §1). Không đè field đã có giá trị (tôn trọng dữ liệu người dùng tự nhập/đã lưu
// trước đó). Có thể chạy TRƯỚC cả initCustomer() (domain gọi ngay lúc mở app, trước khi buyer mở
// tab checkout) — nên đọc/ghi thẳng Storager, không dựa vào state conductor đã setup hay chưa.
// webs/bay (được phép dùng pay, xem docs/PAY.rst §1 điểm 4) gọi hàm này để mồi sẵn dữ liệu.
export async function seedCustomerExtra({ fullName = '', email = '', phone = '', location = '' } = {}, name = 'pay_customer') {
    if (!fullName && !email && !phone && !location) return;
    const { default: Storager } = await import('@/services/storager.js');
    const saved   = (await Storager.get(name)) ?? { ..._CUS_STD };
    const entries = (saved.entries ?? []).length
        ? saved.entries.map(e => e.isDefault ? {
              ...e,
              fullName: e.fullName || fullName, email: e.email || email,
              phone: e.phone || phone, location: e.location || location,
          } : e)
        : [{ ...newCustomerEntry(), fullName, email, phone, location, isDefault: true }];
    const data = { ..._CUS_STD, ...saved, entries };
    make(name, data);
    await Storager.set(name, data, 0);
}

export function saveCustomer(name, data) {
    const clean = { ..._CUS_STD, ...data };
    make(name, clean);
    import('@/services/storager.js').then(({ default: Storager }) => Storager.set(name, clean, 0));
}

export function customerSubscribe(name, listener) {
    const cur = get(name);
    if (cur) listener(cur);
    return conductorSubscribe(name, section => { if (section) listener(section); });
}

// ════════════════════════════════════════════════════════════════════════════
// 5. HANDLER CACHE — tên/sđt "người xử lý bước này" cho <svc-pay-reason> (dùng CHUNG mọi
//    action-panel packing/shipping/delivered/received/confirm-payment/refund/return...) — nhớ lại
//    giá trị lần gõ gần nhất trên CHÍNH thiết bị này để đỡ gõ lại mỗi bước/mỗi đơn mới. Lưu THEO
//    TỪNG BƯỚC riêng (`{ shipping: {name,phone}, delivered: {name,phone}, ... }`, xem `stepKey` ở
//    <svc-pay-reason>) — KHÔNG dùng 1 slot chung, vì mỗi bước thường là 1 người khác nhau (vd
//    người đóng gói khác người giao hàng khác đơn vị vận chuyển). KHÁC hẳn quickName/quickPhone
//    (identity seller/buyer THẬT của đúng invoice đang mở, xem svc-pay.js's
//    _comSellerPrefill/_comBuyerPrefill) — 2 nguồn độc lập, <svc-pay-reason> tự nạp cache này
//    trước, nút "gán nhanh" là lựa chọn khác.
// ════════════════════════════════════════════════════════════════════════════

const HANDLER_CACHE_KEY = 'pay_handler_cache';

export async function loadHandlerCache(stepKey) {
    if (!stepKey) return { name: '', phone: '' };
    const { default: Storager } = await import('@/services/storager.js');
    const all = (await Storager.get(HANDLER_CACHE_KEY)) ?? {};
    return all[stepKey] ?? { name: '', phone: '' };
}

export function saveHandlerCache(stepKey, { name = '', phone = '' } = {}) {
    if (!stepKey || (!name && !phone)) return;
    import('@/services/storager.js').then(async ({ default: Storager }) => {
        const all = (await Storager.get(HANDLER_CACHE_KEY)) ?? {};
        await Storager.set(HANDLER_CACHE_KEY, { ...all, [stepKey]: { name, phone } }, 0);
    });
}
