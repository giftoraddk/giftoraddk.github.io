/**
 * /v1/data/:table[/:id | /_batch | /:id/_bump] — CRUD các bảng nội dung (DB_ALL) trên D1 `ALL_DB`.
 * Cùng contract với llm: GET list/by-id, PATCH = upsert, POST _batch { items }.
 * Thêm POST /:id/_bump { field, delta: 1 } — bộ đếm nguyên tử (views/likes), không cần quyền ghi bảng.
 * invoices: ghi theo luật riêng invoices.ts (dựng lại giá từ products, giới hạn bước người mua/người bán), phải đăng nhập.
 * promos: list công khai chỉ thấy mã đang chạy + không riêng tư; mã riêng tư chỉ ra khi tra đúng ?code=.
 * DELETE /:table — xoá THẬT toàn bộ bảng (nút "Xoá toàn bộ" của svc-resources), chỉ role `admin`.
 * Quyền theo tables.ts; roles đọc từ Supabase `profiles` của caller (cùng nguồn với profiles.ts).
 */
import { requireAuth, AuthError } from './lib/auth';
import { parseRoles, type RolesUser } from './lib/roles';
import { SupabaseTableClient } from './supabaseTable';
import { DocStore } from './docStore';
import { TABLES, type Level } from './tables';
import { writeInvoice, InvoiceError, type InvoiceEnv } from './invoices';
import { json } from './lib/http';

export interface DataEnv extends InvoiceEnv {
  ALL_DB: D1Database;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

interface Caller { userId: string; roles: string[]; isAdmin: boolean }

const badRequest = (message: string, status = 400) => json({ message }, { status });

/** Có Bearer thì verify + đọc roles; không có → khách (null). Token sai vẫn ném 401. */
async function _caller(request: Request, env: DataEnv): Promise<Caller | null> {
  if (!request.headers.get('Authorization')) return null;
  // jose ném lỗi riêng khi token hết hạn/sai chữ ký — quy về 401 thay vì 500
  const { userId } = await requireAuth(request, env.SUPABASE_URL).catch(err => {
    throw err instanceof AuthError ? err : new AuthError('Invalid token');
  });
  const supa = new SupabaseTableClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const profile = (await supa.findById('profiles', userId)) as RolesUser | null;
  const { roles, isAdmin } = profile?.status === 'active' ? parseRoles(profile) : { roles: [], isAdmin: false };
  return { userId, roles, isAdmin };
}

const _hasRole = (c: Caller | null, table: string) => !!c && (c.isAdmin || c.roles.some(r => r.startsWith(`${table}.`)));

// 'owner': list → filters phải lọc đúng caller; read → truyền chính row (seller_id/buyer_id của row)
function _check(level: Level, caller: Caller | null, table: string, filters: Record<string, unknown> = {}) {
  if (level === 'public') return;
  if (!caller) throw new AuthError('Missing bearer token');
  if (level === 'auth' || _hasRole(caller, table)) return;
  if (level === 'staff' && caller.roles.length) return;
  if (level === 'owner' && (filters.seller_id === caller.userId || filters.buyer_id === caller.userId)) return;
  throw new AuthError('Forbidden');
}

const _promoVisible = (p: Record<string, any>) =>
  p.status === 'active' && p.scope !== 'private' && p.private !== true && (!p.expires_at || Date.parse(p.expires_at) > Date.now());

export async function handleDataRoute(request: Request, env: DataEnv, table: string, id: string | undefined, action: string | undefined): Promise<Response> {
  const cfg = TABLES[table];
  if (!cfg) return badRequest(`Unknown table: ${table}`, 404);

  const store  = new DocStore(env.ALL_DB);
  const caller = await _caller(request, env);
  const method = request.method;

  if (method === 'GET' && id) {
    if (cfg.read !== 'owner') _check(cfg.read, caller, table);
    const row = await store.findById(table, id);
    // 'owner' kiểm sau khi có row — không có quyền thì trả 404 như không tồn tại (không lộ id nào có thật)
    if (row && cfg.read === 'owner') {
      try { _check('owner', caller, table, row); } catch (err) {
        if (!caller) throw err;
        return badRequest('Not found', 404);
      }
    }
    return row ? json(row) : badRequest('Not found', 404);
  }

  if (method === 'GET') {
    const filters = Object.fromEntries(new URL(request.url).searchParams.entries());
    _check(cfg.list, caller, table, filters);
    const rows = await store.find(table, filters);
    if (table === 'promos' && !_hasRole(caller, table)) {
      // Không có ?code= → chỉ mã công khai đang chạy (chip gợi ý ở giỏ); có ?code= → đúng mã đó (cả mã riêng tư), còn hạn
      return json(rows.filter((p: any) => filters.code ? _promoVisible({ ...p, scope: '', private: false }) : _promoVisible(p)));
    }
    return json(rows);
  }

  // _batch luôn cần quyền bảng — kể cả bảng ghi 'auth'/'staff'
  const bulk: Level = 'role';

  // Xoá THẬT cả bảng: chỉ role `admin` — quyền bảng (`{table}.*`) không đủ
  if (method === 'DELETE' && !id) {
    if (!caller) throw new AuthError('Missing bearer token');
    if (!caller.isAdmin) throw new AuthError('Forbidden');
    return json({ deleted: await store.purge(table) });
  }

  let body: any;
  try { body = await request.json(); } catch { return badRequest('Invalid JSON body'); }

  if (method === 'POST' && action === '_bump' && id) {
    const { field, delta } = body ?? {};
    // Công khai → mỗi lần chỉ +1 (1 lượt xem / thích — svc-engage), không đẩy hay trừ số tuỳ ý
    if (!cfg.bump?.includes(field) || Number(delta) !== 1) return badRequest('Field not bumpable');
    const value = await store.bump(table, id, field, Number(delta));
    return value === null ? badRequest('Not found', 404) : json({ value });
  }

  if (table === 'invoices' && (method === 'PATCH' || method === 'PUT') && id) {
    _check(cfg.write, caller, table); // phải đăng nhập — không còn mua hàng kiểu khách vãng lai
    const actor = { userId: caller!.userId, staff: _hasRole(caller, table) };
    try {
      await writeInvoice(store, env, actor, id, body ?? {});
    } catch (err) {
      if (err instanceof InvoiceError) return badRequest(err.message, err.status);
      throw err;
    }
    return new Response(null, { status: 204 });
  }

  if (method === 'POST' && id === '_batch') {
    _check(bulk, caller, table);
    await store.batch(table, Array.isArray(body?.items) ? body.items : []);
    return new Response(null, { status: 204 });
  }

  _check(cfg.write, caller, table);

  if ((method === 'PATCH' || method === 'PUT') && id) {
    // Mã khuyến mãi tra theo `code` (không phân biệt hoa thường) — chuẩn hoá ngay lúc ghi
    if (table === 'promos' && typeof body?.code === 'string') body.code = body.code.trim().toUpperCase();
    await store.upsert(table, id, body ?? {});
    return new Response(null, { status: 204 });
  }

  return badRequest('Unsupported method/path combination', 405);
}
