/**
 * /v1/billing/* — PayPal Subscriptions for src/packages/purchase (spec: hook/PURCHASE.rst).
 *   POST checkout        {planId, interval} → { subscriptionId, summary }  (APPROVAL_PENDING subscription)
 *   POST activate        {subscriptionId} → bản ghi billing sau khi người mua duyệt trên PayPal
 *   GET  subscription    bản ghi billing/{userId} của caller (null nếu chưa từng mua)
 *   POST cancel          huỷ subscription hiện tại của caller
 *   POST webhook         PayPal → verify chữ ký → ghi billing/{userId}. Không JWT.
 *   GET  peek/:userId    bản ghi billing/{userId} cho llm (server → server, header X-Service-Key = BILLING_SERVICE_KEY,
 *                        không JWT) — để trợ lý nhúng bật/tắt đúng theo gia hạn / hết hạn mà chủ hub không cần mở Cài đặt.
 * Quản trị (svc-purchase-manager) — quyền trên resource `billing` (hook/AUTH_V2.rst, auth/tool/roles.js's can()):
 *   GET  all             mọi bản ghi billing + tên/email/avatar của chủ (profiles)   — billing `list`
 *   POST sync/:userId    đọc lại subscription của user đó từ PayPal                   — billing `update`
 *   POST cancel/:userId  huỷ subscription của user đó                                 — billing `cancel` (MANAGE)
 *
 * Giá không bao giờ đến từ client: planId/interval → purchase/tool/plans.js → PayPal plan id, rồi đối
 * chiếu với Billing Plan thật. Mọi bản ghi đều đọc lại subscription từ PayPal, không tin payload client.
 */
import { requireAuth, AuthError, type VerifiedUser } from './lib/auth';
import { DocStore } from './docStore';
import { SupabaseTableClient } from './supabaseTable';
import { json } from './lib/http';
import { PURCHASE, findPrice, trialDaysOf } from '../../../purchase/tool/plans.js';
import { hasActivePlan, paypalEnv, planMismatch, planSummary, subscriptionIdOf, toBillingRecord } from '../../../purchase/tool/billing.js';
import { can } from '../../tool/roles.js';

export interface BillingEnv {
  ALL_DB: D1Database;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  PAYPAL_ENV: string;
  PAYPAL_CLIENT_ID: string;
  PAYPAL_CLIENT_SECRET: string;
  PAYPAL_WEBHOOK_ID: string;
  APP_URL: string;
  BILLING_SERVICE_KEY?: string; // secret chung với llm — chỉ cho GET peek/:userId; trống = route tắt
}

type PayPalSubscription = { id: string; status: string; plan_id: string; custom_id?: string } & Record<string, unknown>;

const BILLING = 'billing';
const EVENTS = 'paypal_events';
const API_BASE = { sandbox: 'https://api-m.sandbox.paypal.com', live: 'https://api-m.paypal.com' } as const;
const badRequest = (message: string, status = 400) => {
  // 5xx here means config or PayPal trouble — show the reason in `wrangler dev`/tail, not just the status.
  if (status >= 500) console.error(`[billing] ${status} ${message}`);
  return json({ message }, { status });
};

class PayPalError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

const apiBase = (env: BillingEnv) => API_BASE[paypalEnv(env.PAYPAL_ENV)];

let _token: { key: string; value: string; exp: number } | null = null;
async function accessToken(env: BillingEnv): Promise<string> {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) throw new Error('PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET is not configured');
  const key = `${paypalEnv(env.PAYPAL_ENV)}:${env.PAYPAL_CLIENT_ID}`;
  if (_token?.key === key && _token.exp > Date.now()) return _token.value;
  const res = await fetch(`${apiBase(env)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new PayPalError(502, `PayPal auth failed (${res.status})`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  // Refresh a minute early so a token never expires mid-request.
  _token = { key, value: data.access_token, exp: Date.now() + (data.expires_in - 60) * 1000 };
  return data.access_token;
}

async function paypal<T>(env: BillingEnv, path: string, init: { method?: string; body?: string } = {}): Promise<T> {
  const res = await fetch(`${apiBase(env)}${path}`, {
    method: init.method ?? 'GET',
    headers: { Authorization: `Bearer ${await accessToken(env)}`, 'Content-Type': 'application/json' },
    body: init.body,
  });
  if (res.status === 204) return null as T;
  const data = (await res.json().catch(() => null)) as { message?: string; details?: { description?: string }[] } | null;
  if (!res.ok) throw new PayPalError(res.status, data?.details?.[0]?.description ?? data?.message ?? `PayPal ${res.status}`);
  return data as T;
}

// jose throws its own error types for expired/forged tokens — map them to 401, not 500.
const auth = (request: Request, env: BillingEnv) =>
  requireAuth(request, env.SUPABASE_URL).catch((err) => { throw err instanceof AuthError ? err : new AuthError('Invalid token'); });

export async function handleBillingRoute(request: Request, env: BillingEnv, action: string, id: string | undefined): Promise<Response> {
  const method = request.method;
  try {
    if (action === 'webhook' && method === 'POST') return await webhook(request, env);
    if (action === 'checkout' && method === 'POST') return await checkout(request, env, await auth(request, env));
    if (action === 'activate' && method === 'POST') return await activate(request, env, await auth(request, env));
    if (action === 'subscription' && method === 'GET') return await subscription(env, await auth(request, env));
    if (action === 'peek' && method === 'GET' && id) return await peek(request, env, id);
    if (action === 'all' && method === 'GET') return await listAll(env, await staff(request, env, 'list'));
    if (action === 'sync' && method === 'POST' && id) return await syncFor(env, await staff(request, env, 'update'), id);
    if (action === 'cancel' && method === 'POST' && id) return await cancelFor(env, await staff(request, env, 'cancel'), id);
    if (action === 'cancel' && method === 'POST') return await cancel(env, await auth(request, env));
    return badRequest('Not found', 404);
  } catch (err) {
    if (err instanceof PayPalError) return badRequest(err.message, err.status === 404 ? 404 : 502);
    throw err;
  }
}

async function checkout(request: Request, env: BillingEnv, caller: VerifiedUser): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { planId?: string; interval?: string } | null;
  const hit = findPrice(body?.planId, body?.interval);
  if (!hit) return badRequest('Unknown plan or interval');

  const mode = paypalEnv(env.PAYPAL_ENV);
  const planId = hit.price.planIds?.[mode];
  if (!planId) return badRequest(`Plan "${hit.plan.id}" has no ${mode} PayPal plan configured`, 500);

  const store = new DocStore(env.ALL_DB);
  if (hasActivePlan(await store.findById(BILLING, caller.userId))) return badRequest('Already subscribed — cancel it before switching', 409);

  const plan = await paypal<Record<string, unknown>>(env, `/v1/billing/plans/${planId}`);
  const mismatch = planMismatch(plan, {
    amount: hit.price.amount, interval: body!.interval, currency: PURCHASE.currency, trialDays: trialDaysOf(hit.plan),
  });
  if (mismatch) return badRequest(`Plan "${hit.plan.id}" is out of sync with PayPal plan ${planId}: ${mismatch}`, 500);

  const created = await paypal<PayPalSubscription>(env, '/v1/billing/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      plan_id: planId,
      // Ties the subscription to our user — activate/webhook only trust this, never the client.
      custom_id: caller.userId,
      ...(caller.email ? { subscriber: { email_address: caller.email } } : {}),
      application_context: {
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        // Only used when PayPal falls back to a full-page redirect instead of its popup. Both land on the pricing page:
        // its <svc-purchase-manager> sees ?subscription_id= and shows the result (activated, or not approved).
        return_url: `${env.APP_URL}/system/pricing`,
        cancel_url: `${env.APP_URL}/system/pricing`,
      },
    }),
  });
  return json({ subscriptionId: created.id, summary: planSummary(plan) });
}

/** Re-reads the subscription from PayPal and stores it under its owner. */
async function syncSubscription(env: BillingEnv, store: DocStore, subscriptionId: string) {
  const sub = await paypal<PayPalSubscription>(env, `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`);
  const record = toBillingRecord(sub);
  // A cancelled subscription has no next_billing_time — keep the paid-through date it already had, so the plan stays
  // usable until the end of the period paid for (llm hubs.ts hubActive; /system/legal/refund promises this).
  if (sub.custom_id && record.current_period_end == null) {
    const prev = await store.findById(BILLING, sub.custom_id);
    if (prev?.subscription_id === record.subscription_id) record.current_period_end = (prev?.current_period_end as number | null) ?? null;
  }
  if (sub.custom_id) await store.upsert(BILLING, sub.custom_id, record);
  return { owner: sub.custom_id ?? null, record };
}

async function activate(request: Request, env: BillingEnv, caller: VerifiedUser): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { subscriptionId?: string } | null;
  if (!body?.subscriptionId) return badRequest('Missing subscriptionId');
  // Stored under the real owner (custom_id) either way — a foreign id only gets refreshed, never exposed.
  const { owner, record } = await syncSubscription(env, new DocStore(env.ALL_DB), body.subscriptionId);
  if (owner !== caller.userId) throw new AuthError('Forbidden');
  return json(record);
}

async function subscription(env: BillingEnv, caller: VerifiedUser): Promise<Response> {
  return json(await billingOf(env, caller.userId));
}

const billingOf = async (env: BillingEnv, userId: string) => {
  const record = await new DocStore(env.ALL_DB).findById(BILLING, userId);
  return record?.status ? record : null;
};

/** So 2 chuỗi không lộ độ dài khớp qua thời gian — băm SHA-256 rồi so từng byte. */
async function sameSecret(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([a, b].map((v) => crypto.subtle.digest('SHA-256', enc.encode(v))));
  const u = new Uint8Array(x), v = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < u.length; i++) diff |= u[i] ^ v[i];
  return diff === 0;
}

/** Server → server (llm hubs.ts peekBilling): cùng bản ghi `subscription` trả cho chính chủ, theo user id. */
async function peek(request: Request, env: BillingEnv, userId: string): Promise<Response> {
  const key = env.BILLING_SERVICE_KEY ?? '';
  if (key.length < 32) return badRequest('Not found', 404); // chưa cấu hình (hoặc key quá ngắn) = route không tồn tại
  if (!(await sameSecret(request.headers.get('X-Service-Key') ?? '', key))) return badRequest('Forbidden', 403);
  return json(await billingOf(env, userId));
}

const cancel = (env: BillingEnv, caller: VerifiedUser) => cancelOf(env, caller.userId, 'Cancelled by the customer');

/** Huỷ subscription của `userId` trên PayPal (nếu còn chạy) rồi ghi lại bản ghi mới nhất. */
async function cancelOf(env: BillingEnv, userId: string, reason: string): Promise<Response> {
  const store = new DocStore(env.ALL_DB);
  const current = await store.findById(BILLING, userId);
  const subId = current?.subscription_id as string | undefined;
  if (!subId) return badRequest('No subscription yet', 404);
  if (hasActivePlan(current) || current?.status === 'suspended') {
    await paypal(env, `/v1/billing/subscriptions/${encodeURIComponent(subId)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }
  return json((await syncSubscription(env, store, subId)).record);
}

// ── Quản trị ────────────────────────────────────────────────────────────────

const supabase = (env: BillingEnv) => new SupabaseTableClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/** Caller đã đăng nhập, tài khoản active, và có `action` trên resource `billing` — Super Admin qua hết. */
async function staff(request: Request, env: BillingEnv, action: string): Promise<VerifiedUser> {
  const caller = await auth(request, env);
  const profile = await supabase(env).findById('profiles', caller.userId);
  if (profile?.status !== 'active' || !can({ id: caller.userId, roles: profile.roles }, 'billing', action)) throw new AuthError('Forbidden');
  return caller;
}

const PROFILE_COLS = 'id,email,display_name,username,avatar';
const ID_CHUNK = 100; // giữ URL PostgREST `id=in.(…)` ngắn

/** Mọi bản ghi billing (id = userId), kèm tên/email/avatar của chủ — 1 truy vấn profiles mỗi 100 người. */
async function listAll(env: BillingEnv, _caller: VerifiedUser): Promise<Response> {
  const rows = (await new DocStore(env.ALL_DB).find(BILLING)).filter(r => r.status);
  const ids = rows.map(r => String(r.id));
  const people = new Map<string, Record<string, any>>();
  for (let i = 0; i < ids.length; i += ID_CHUNK) {
    for (const p of await supabase(env).findByIds('profiles', ids.slice(i, i + ID_CHUNK), PROFILE_COLS)) people.set(p.id, p);
  }
  const items = rows.map(r => {
    const p = people.get(String(r.id));
    return { ...r, user_id: r.id, email: p?.email ?? null, display_name: p?.display_name ?? null, username: p?.username ?? null, avatar: p?.avatar ?? null };
  });
  return json({ env: paypalEnv(env.PAYPAL_ENV), items });
}

async function syncFor(env: BillingEnv, _caller: VerifiedUser, userId: string): Promise<Response> {
  const store = new DocStore(env.ALL_DB);
  const subId = (await store.findById(BILLING, userId))?.subscription_id as string | undefined;
  if (!subId) return badRequest('No subscription for this user', 404);
  return json((await syncSubscription(env, store, subId)).record);
}

const cancelFor = (env: BillingEnv, _caller: VerifiedUser, userId: string) => cancelOf(env, userId, 'Cancelled by the service');

const SIGNATURE_HEADERS = {
  auth_algo: 'paypal-auth-algo',
  cert_url: 'paypal-cert-url',
  transmission_id: 'paypal-transmission-id',
  transmission_sig: 'paypal-transmission-sig',
  transmission_time: 'paypal-transmission-time',
} as const;

async function webhook(request: Request, env: BillingEnv): Promise<Response> {
  if (!env.PAYPAL_WEBHOOK_ID) throw new Error('PAYPAL_WEBHOOK_ID is not configured');
  const raw = await request.text();
  let event: { id?: string; event_type?: string };
  try { event = JSON.parse(raw); } catch { return badRequest('Invalid JSON'); }

  const fields = Object.entries(SIGNATURE_HEADERS).map(([k, h]) => `${JSON.stringify(k)}:${JSON.stringify(request.headers.get(h) ?? '')}`);
  // Raw body spliced in as-is — a re-serialized event can fail PayPal's signature check.
  const verifyBody = `{${fields.join(',')},"webhook_id":${JSON.stringify(env.PAYPAL_WEBHOOK_ID)},"webhook_event":${raw}}`;
  const verdict = await paypal<{ verification_status?: string }>(env, '/v1/notifications/verify-webhook-signature', { method: 'POST', body: verifyBody });
  if (verdict?.verification_status !== 'SUCCESS' || !event.id) return badRequest('Invalid signature');

  const store = new DocStore(env.ALL_DB);
  if (await store.findById(EVENTS, event.id)) return json({ received: true, duplicate: true });

  const subId = subscriptionIdOf(event);
  // Re-read instead of trusting the payload: events can arrive out of order. An unknown id is final — no retry.
  if (subId) {
    await syncSubscription(env, store, subId).catch((err) => { if (!(err instanceof PayPalError && err.status === 404)) throw err; });
  }
  // Marked only after processing, so a failure above makes PayPal retry the event.
  await store.upsert(EVENTS, event.id, { type: event.event_type ?? null });
  return json({ received: true });
}
