/**
 * /v1/zap/:product/:action[/:id] — bản quyền + thanh toán VietQR của các Chrome extension zap-* (hook/ZAP-SHARE.rst §10,
 * hook/ZAP-SUPPORT.rst §13). :product = id trong zap/products.js (share | support) — mỗi extension có bảng, tiền tố khoá,
 * tiền tố mã đơn, giá và kiểu dùng thử riêng; luồng giống nhau.
 *
 * Thanh toán = chuyển khoản VietQR vào tài khoản của shop (products.js ZAP_PAY), KHÔNG có cổng xác nhận tự động:
 * người mua bấm "Đã thanh toán" → gói kích hoạt NGAY (đơn `claimed`) + báo Telegram cho chủ shop. Chủ shop tự đối soát
 * sao kê rồi trên trang quản lý: `verified` (đã nhận tiền) hoặc `rejected` (không có tiền → trừ lại đúng số ngày đã cộng).
 *
 * Trang /system/extension/<extension> (JWT Supabase của người mua):
 *   GET  license         trạng thái khoá của caller (chưa có → mặc định: chưa khoá, còn nguyên dùng thử)
 *   POST key             tạo / đổi khoá → { key, ...license } — khoá thật CHỈ trả ở đây, D1 chỉ giữ SHA-256. Đổi khoá =
 *                        khoá cũ hết hiệu lực + xoá danh sách máy. Dùng thử / hạn dùng gắn với TÀI KHOẢN, không theo khoá.
 *   POST order           { plan } → { orderId, amount, plan } — đơn `pending`, giá từ products.js (không từ client).
 *                        orderId = nội dung chuyển khoản (tiền tố của extension + 10 ký tự).
 *   POST paid/:orderId   người mua xác nhận đã chuyển → `pending → claimed` đúng 1 lần, cộng hạn, báo Telegram.
 *                        Tối đa UNVERIFIED_MAX đơn `claimed` chưa được kiểm / tài khoản / extension (chống tự bấm liên tục).
 * Quản trị (quyền trên resource `billing` như auth billing.ts — Super Admin qua hết), trang /system/extension/manage:
 *   GET  all             mọi đơn (trừ `pending`) + bản quyền, kèm tên / email / avatar      — billing `list`
 *   POST verify/:orderId đơn → `verified` (đã nhận tiền; từ `rejected` thì cộng lại ngày)    — billing `update`
 *   POST reject/:orderId đơn → `rejected` (không nhận được tiền → trừ lại số ngày đã cộng)   — billing `update`
 *   POST block/:userId   { blocked } — khoá / mở bản quyền của 1 tài khoản                 — billing `cancel`
 * Extension (header X-Zap-Key: khoá, không JWT; body { install } = id ngẫu nhiên của bản cài):
 *   POST check           trạng thái, không trừ lượt. Dùng thử theo ngày: lần check đầu (chưa từng trả tiền) bắt đầu
 *                        đếm `trial.days` ngày.
 *   POST use             (dùng thử theo lượt) 1 lần dùng: còn hạn → cho qua (không đếm); không thì trừ 1 lượt → { use }
 *   POST refund          (dùng thử theo lượt) { use } — lần đó không dùng được → trả lại lượt (mỗi `use` trả được 1 lần)
 *
 * Bảng (DocStore trên ALL_DB — không có trong tables.ts nên /v1/data không đọc / ghi được), tiền tố = products.js `table`:
 *   <t>_licenses  id = userId  { key_sha, key_hint, trial_used? | trial_until?, paid_until, blocked?, installs: { [install]: lastSeenMs } }
 *   <t>_keys      id = sha256(key) { user }
 *   <t>_orders    id = orderId { user, plan, amount, days, status: pending|claimed|verified|rejected, claimed_at?, checked_at?, checked_by? }
 *   <t>_uses      id = use     { user, state: open|refunded }  — chỉ extension dùng thử theo lượt
 */
import { requireAuth, AuthError, type VerifiedUser } from './lib/auth';
import { DocStore } from './docStore';
import { SupabaseTableClient } from './supabaseTable';
import { json } from './lib/http';
import { can } from '../../tool/roles.js';
import { findZapPlan, zapKeyRe, zapProduct } from '../../../zap/products.js';

export interface ZapEnv {
  ALL_DB: D1Database;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  APP_URL: string;
  ALLOWED_ORIGIN?: string;
  TG_BOT_TOKEN?: string; // Telegram báo đơn "đã thanh toán" — trống = không gửi
  TG_CHAT_ID?: string;
}

/** 1 extension trong products.js + tên bảng / mẫu mã của nó. */
interface Product {
  id: string;
  name: string;
  key: string;
  order: string;
  trial: { uses?: number; days?: number };
  devices: number;
  plans: ReadonlyArray<{ id: string; days: number; amount: number; name: { vi: string; en: string } }>;
  t: { licenses: string; keys: string; orders: string; uses: string };
  keyRe: RegExp;
  orderRe: RegExp;
}

const DAY = 86_400_000;
const SEEN_EVERY = 3_600_000;  // ghi lại lastSeen của 1 máy tối đa 1 lần / giờ
const UNVERIFIED_MAX = 2;      // số đơn tự xác nhận chưa được kiểm / tài khoản
const INSTALL_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const USER_RE = /^[0-9a-f-]{36}$/;
const ORDER_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // không 0/O/1/I — dễ gõ lại khi đối soát

type Doc = Record<string, any>;

const PRODUCTS = new Map<string, Product>();
function productOf(id: string): Product | null {
  if (PRODUCTS.has(id)) return PRODUCTS.get(id)!;
  const p = zapProduct(id) as any;
  if (!p) return null;
  const made: Product = {
    ...p,
    t: { licenses: `${p.table}_licenses`, keys: `${p.table}_keys`, orders: `${p.table}_orders`, uses: `${p.table}_uses` },
    keyRe: zapKeyRe(id),
    orderRe: new RegExp(`^${p.order}[${ORDER_CHARS}]{10}$`),
  };
  PRODUCTS.set(id, made);
  return made;
}

const err = (code: string, status: number) => json({ code, message: code }, { status });
const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
const randomHex = (bytes: number) => hex(crypto.getRandomValues(new Uint8Array(bytes)).buffer);
const newOrderId = (p: Product) => `${p.order}${Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => ORDER_CHARS[b % ORDER_CHARS.length]).join('')}`;

const auth = (request: Request, env: ZapEnv) =>
  requireAuth(request, env.SUPABASE_URL).catch((e) => { throw e instanceof AuthError ? e : new AuthError('Invalid token'); });

const supabase = (env: ZapEnv) => new SupabaseTableClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/** Caller đã đăng nhập, tài khoản active, và có `action` trên resource `billing` (như billing.ts staff). */
async function staff(request: Request, env: ZapEnv, action: string): Promise<VerifiedUser> {
  const caller = await auth(request, env);
  const profile = await supabase(env).findById('profiles', caller.userId);
  if (profile?.status !== 'active' || !can({ id: caller.userId, roles: profile.roles }, 'billing', action)) throw new AuthError('Forbidden');
  return caller;
}

export async function handleZapRoute(request: Request, env: ZapEnv, product: string, action: string, id: string | undefined): Promise<Response> {
  const p = productOf(product);
  if (!p) return err('not_found', 404);
  const method = request.method;
  if (method === 'POST' && action === 'check') return byKey(request, env, p, action);
  if (method === 'POST' && (action === 'use' || action === 'refund') && p.trial.uses) return byKey(request, env, p, action);
  if (action === 'license' && method === 'GET') return license(env, p, await auth(request, env));
  if (action === 'key' && method === 'POST') return newKey(env, p, await auth(request, env));
  if (action === 'order' && method === 'POST') return newOrder(request, env, p, await auth(request, env));
  if (action === 'paid' && method === 'POST' && id) return paid(env, p, await auth(request, env), id, siteOf(request, env));
  if (action === 'all' && method === 'GET') return listAll(env, p, await staff(request, env, 'list'));
  if ((action === 'verify' || action === 'reject') && method === 'POST' && id) return check(env, p, await staff(request, env, 'update'), id, action);
  if (action === 'block' && method === 'POST' && id) return block(request, env, p, await staff(request, env, 'cancel'), id);
  return err('not_found', 404);
}

// ── trạng thái ──────────────────────────────────────────────────────────────

const timeOf = (v: unknown) => (Number.isFinite(v) && Number(v) > 0 ? Number(v) : null);
const paidUntil = (lic: Doc | null) => timeOf(lic?.paid_until);
const trialLeft = (p: Product, lic: Doc | null) => Math.max(0, (p.trial.uses ?? 0) - Number(lic?.trial_used ?? 0));

/** Dùng thử cho trang: theo lượt { uses, used, left } | theo ngày { days, until } (until null = chưa bắt đầu). */
const trialView = (p: Product, lic: Doc | null) => (p.trial.uses
  ? { uses: p.trial.uses, used: Number(lic?.trial_used ?? 0), left: trialLeft(p, lic) }
  : { days: p.trial.days ?? 0, until: timeOf(lic?.trial_until) });

/** Bản ghi cho trang — không có khoá thật, không có id máy. */
const view = (p: Product, lic: Doc | null) => {
  const until = paidUntil(lic);
  return {
    has_key: !!lic?.key_sha,
    key_hint: lic?.key_hint ?? null,
    trial: trialView(p, lic),
    paid_until: until,
    active: !!until && until > Date.now() && !lic?.blocked,
    blocked: !!lic?.blocked,
    devices: Object.keys(lic?.installs ?? {}).length,
    device_max: p.devices,
  };
};

/**
 * Trạng thái cho extension: { plan: 'paid', until } | dùng thử theo lượt { plan: 'trial', left, until: paidUntil cũ }
 * | dùng thử theo ngày { plan: 'trial', until: hết dùng thử } | null (hết lượt / hết hạn).
 */
const standing = (p: Product, lic: Doc, now = Date.now()) => {
  const until = paidUntil(lic);
  if (until && until > now) return { plan: 'paid', until };
  if (p.trial.uses) {
    const left = trialLeft(p, lic);
    return left > 0 ? { plan: 'trial', left, until } : null;
  }
  const trial = timeOf(lic.trial_until);
  return trial && trial > now ? { plan: 'trial', until: trial } : null;
};

const lapsedCode = (lic: Doc) => (paidUntil(lic) ? 'expired' : 'trial_over');

async function license(env: ZapEnv, p: Product, caller: VerifiedUser): Promise<Response> {
  return json(view(p, await new DocStore(env.ALL_DB).findById(p.t.licenses, caller.userId)));
}

/** Tạo / đổi khoá. Khoá cũ (nếu có) mất hiệu lực ngay, mọi máy phải nhập khoá mới. */
async function newKey(env: ZapEnv, p: Product, caller: VerifiedUser): Promise<Response> {
  const store = new DocStore(env.ALL_DB);
  const prev = await store.findById(p.t.licenses, caller.userId);
  const key = `${p.key}${randomHex(24)}`;
  const sha = await sha256(key);
  if (prev?.key_sha) await store.upsert(p.t.keys, String(prev.key_sha), { deleted_at: new Date().toISOString() });
  await store.upsert(p.t.keys, sha, { user: caller.userId });
  // installs: null → json_patch xoá hẳn danh sách máy cũ
  await store.upsert(p.t.licenses, caller.userId, { key_sha: sha, key_hint: key.slice(-4), installs: null });
  return json({ key, ...view(p, await store.findById(p.t.licenses, caller.userId)) });
}

// ── extension (X-Zap-Key) ───────────────────────────────────────────────────

async function byKey(request: Request, env: ZapEnv, p: Product, action: 'check' | 'use' | 'refund'): Promise<Response> {
  const key = request.headers.get('X-Zap-Key') ?? '';
  if (!key) return err('no_key', 401);
  if (!p.keyRe.test(key)) return err('bad_key', 401);
  const body = (await request.json().catch(() => null)) as { install?: string; use?: string } | null;
  const install = String(body?.install ?? '');
  if (!INSTALL_RE.test(install)) return err('bad_payload', 400);

  const store = new DocStore(env.ALL_DB);
  const sha = await sha256(key);
  const owner = (await store.findById(p.t.keys, sha))?.user as string | undefined;
  let lic = owner ? await store.findById(p.t.licenses, owner) : null;
  if (!owner || !lic || lic.key_sha !== sha) return err('bad_key', 401);
  if (lic.blocked) return err('blocked', 403);

  // Giới hạn máy dùng chung 1 khoá — máy mới khi đã đủ → từ chối (đổi khoá trên trang để làm lại danh sách).
  const installs = (lic.installs ?? {}) as Record<string, number>;
  if (!(install in installs) && Object.keys(installs).length >= p.devices) return err('too_many_devices', 403);
  if (Date.now() - Number(installs[install] ?? 0) > SEEN_EVERY) await store.upsert(p.t.licenses, owner, { installs: { [install]: Date.now() } });

  if (action === 'refund') {
    const use = String(body?.use ?? '');
    if (!/^[0-9a-f]{32}$/.test(use)) return err('bad_payload', 400);
    const row = await store.findById(p.t.uses, use);
    if (row?.user !== owner || !(await store.claim(p.t.uses, use, 'state', 'open', 'refunded'))) return json({ ok: false });
    await store.bump(p.t.licenses, owner, 'trial_used', -1);
    return json({ ok: true, ...standing(p, (await store.findById(p.t.licenses, owner))!) });
  }

  // Dùng thử theo ngày: bắt đầu đếm ở lần kiểm đầu tiên của tài khoản chưa từng trả tiền (2 lần kiểm cùng lúc chỉ lệch vài ms).
  if (p.trial.days && !timeOf(lic.trial_until) && !paidUntil(lic)) {
    await store.upsert(p.t.licenses, owner, { trial_until: Date.now() + p.trial.days * DAY });
    lic = (await store.findById(p.t.licenses, owner))!;
  }

  const now = standing(p, lic);
  if (action === 'check') return now ? json({ ok: true, ...now }) : err(lapsedCode(lic), 402);
  if (now?.plan === 'paid') return json({ ok: true, ...now });

  const used = await store.incrementBelow(p.t.licenses, owner, 'trial_used', p.trial.uses ?? 0);
  if (used == null) return err(lapsedCode(lic), 402);
  const use = randomHex(16);
  await store.upsert(p.t.uses, use, { user: owner, state: 'open' });
  return json({ ok: true, plan: 'trial', left: Math.max(0, (p.trial.uses ?? 0) - used), until: paidUntil(lic), use });
}

// ── đơn VietQR ──────────────────────────────────────────────────────────────

async function newOrder(request: Request, env: ZapEnv, p: Product, caller: VerifiedUser): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { plan?: string } | null;
  const plan = findZapPlan(p.id, body?.plan);
  if (!plan) return err('bad_plan', 400);
  const store = new DocStore(env.ALL_DB);
  const lic = await store.findById(p.t.licenses, caller.userId);
  if (lic?.blocked) return err('blocked', 403);
  if (!lic) await store.upsert(p.t.licenses, caller.userId, { blocked: false }); // để paid() cộng hạn được + hiện ở trang quản lý
  const id = newOrderId(p);
  await store.upsert(p.t.orders, id, { user: caller.userId, email: caller.email, plan: plan.id, amount: plan.amount, days: plan.days, status: 'pending' });
  return json({ orderId: id, amount: plan.amount, plan: plan.id });
}

/** Gốc trang người mua đang dùng (Origin có trong ALLOWED_ORIGIN) → link trang quản lý trong tin Telegram đúng tên miền;
 *  Origin lạ / thiếu → APP_URL. */
function siteOf(request: Request, env: ZapEnv): string {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = (env.ALLOWED_ORIGIN ?? '').split(',').map((o) => o.trim()).filter(Boolean);
  return allowed.includes(origin) ? origin : env.APP_URL;
}

/** Người mua bấm "Đã thanh toán" → kích hoạt ngay (chưa đối soát) + báo Telegram cho chủ shop. */
async function paid(env: ZapEnv, p: Product, caller: VerifiedUser, id: string, site: string): Promise<Response> {
  if (!p.orderRe.test(id)) return err('not_found', 404);
  const store = new DocStore(env.ALL_DB);
  const order = await store.findById(p.t.orders, id);
  if (!order || order.user !== caller.userId) return err('not_found', 404);
  const lic = await store.findById(p.t.licenses, caller.userId);
  if (lic?.blocked) return err('blocked', 403);
  if (order.status === 'pending') {
    const open = (await store.find(p.t.orders, { user: caller.userId, status: 'claimed' })).length;
    if (open >= UNVERIFIED_MAX) return err('too_many_unverified', 429);
    if (await store.claim(p.t.orders, id, 'status', 'pending', 'claimed', { claimed_at: Date.now() })) {
      const until = await store.extendTime(p.t.licenses, caller.userId, 'paid_until', Number(order.days) * DAY);
      await store.upsert(p.t.orders, id, { paid_until: until });
      await notify(env, p, caller, { ...order, id, paid_until: until }, site);
    }
  }
  const now = await store.findById(p.t.orders, id);
  return json({ orderId: id, status: now?.status, paid_until: now?.paid_until ?? null, license: view(p, await store.findById(p.t.licenses, caller.userId)) });
}

async function notify(env: ZapEnv, p: Product, caller: VerifiedUser, order: Doc, site: string) {
  if (!env.TG_BOT_TOKEN || !env.TG_CHAT_ID) return;
  const profile = await supabase(env).findById('profiles', caller.userId).catch(() => null);
  const plan = findZapPlan(p.id, order.plan);
  const vnd = (n: number) => `${new Intl.NumberFormat('vi-VN').format(n)}đ`;
  const date = (ms: number) => new Date(ms).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const text = [
    `💸 ${p.name} — khách báo ĐÃ CHUYỂN KHOẢN (gói đã kích hoạt, cần đối soát)`,
    `Nội dung CK: ${order.id}`,
    `Số tiền: ${vnd(Number(order.amount))} · Gói: ${plan?.name.vi ?? order.plan} (${order.days} ngày)`,
    `Khách: ${profile?.display_name || profile?.username || '—'} · ${caller.email ?? profile?.email ?? '—'}`,
    `User id: ${caller.userId}`,
    `Hạn dùng mới: ${order.paid_until ? date(Number(order.paid_until)) : '—'}`,
    `Lúc: ${date(Date.now())}`,
    `Kiểm tra / thu hồi: ${site}/system/extension/manage/?p=${p.id}`,
  ].join('\n');
  try {
    await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: env.TG_CHAT_ID, text }),
    });
  } catch { /* best-effort — không chặn kích hoạt */ }
}

// ── quản trị ────────────────────────────────────────────────────────────────

const PROFILE_COLS = 'id,email,display_name,username,avatar';
const ID_CHUNK = 100;

async function listAll(env: ZapEnv, p: Product, _caller: VerifiedUser): Promise<Response> {
  const store = new DocStore(env.ALL_DB);
  const orders = (await store.find(p.t.orders)).filter((o) => o.status !== 'pending');
  const licenses = await store.find(p.t.licenses);
  const ids = [...new Set([...orders.map((o) => String(o.user)), ...licenses.map((l) => String(l.id))])];
  const people = new Map<string, Doc>();
  for (let i = 0; i < ids.length; i += ID_CHUNK) {
    for (const row of await supabase(env).findByIds('profiles', ids.slice(i, i + ID_CHUNK), PROFILE_COLS)) people.set(row.id, row);
  }
  const who = (id: string) => {
    const row = people.get(id);
    return { email: row?.email ?? null, display_name: row?.display_name ?? null, username: row?.username ?? null, avatar: row?.avatar ?? null };
  };
  return json({
    orders: orders.map((o) => ({
      id: o.id, user_id: o.user, plan: o.plan, amount: o.amount, days: o.days, status: o.status,
      claimed_at: o.claimed_at ?? null, checked_at: o.checked_at ?? null, paid_until: o.paid_until ?? null, created_at: o.created_at, ...who(String(o.user)),
    })),
    licenses: licenses.map((l) => ({ user_id: l.id, ...view(p, l), updated_at: l.updated_at, ...who(String(l.id)) })),
  });
}

/** verify: claimed|rejected → verified · reject: claimed|verified → rejected. Ngày dùng cộng / trừ theo đúng `days` của đơn. */
async function check(env: ZapEnv, p: Product, caller: VerifiedUser, id: string, action: 'verify' | 'reject'): Promise<Response> {
  if (!p.orderRe.test(id)) return err('not_found', 404);
  const store = new DocStore(env.ALL_DB);
  const order = await store.findById(p.t.orders, id);
  if (!order || order.status === 'pending') return err('not_found', 404);
  const to = action === 'verify' ? 'verified' : 'rejected';
  const from = action === 'verify' ? ['claimed', 'rejected'] : ['claimed', 'verified'];
  const mark = { checked_at: Date.now(), checked_by: caller.userId };
  let was = '';
  for (const f of from) if (await store.claim(p.t.orders, id, 'status', f, to, mark)) { was = f; break; }
  if (!was) return err('conflict', 409); // đã ở trạng thái đích / vừa bị người khác đổi
  const ms = Number(order.days) * DAY;
  if (to === 'rejected') await store.bump(p.t.licenses, String(order.user), 'paid_until', -ms);
  else if (was === 'rejected') await store.extendTime(p.t.licenses, String(order.user), 'paid_until', ms);
  const lic = await store.findById(p.t.licenses, String(order.user));
  return json({ id, status: to, license: { user_id: order.user, ...view(p, lic) } });
}

async function block(request: Request, env: ZapEnv, p: Product, _caller: VerifiedUser, userId: string): Promise<Response> {
  if (!USER_RE.test(userId)) return err('not_found', 404);
  const body = (await request.json().catch(() => null)) as { blocked?: boolean } | null;
  const store = new DocStore(env.ALL_DB);
  if (!(await store.findById(p.t.licenses, userId))) return err('not_found', 404);
  await store.upsert(p.t.licenses, userId, { blocked: !!body?.blocked });
  return json({ user_id: userId, ...view(p, await store.findById(p.t.licenses, userId)) });
}
