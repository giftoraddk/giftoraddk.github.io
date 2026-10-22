/**
 * D1 document store — mỗi row = (tbl, id, doc JSON, created_at, updated_at, deleted_at).
 * Client thấy row phẳng: { ...doc, id, created_at, updated_at, deleted_at }.
 * Ghi luôn là upsert + json_patch (merge sâu, RFC 7396) — gửi thiếu field không xoá field cũ.
 */
const TIME_COLS = ['created_at', 'updated_at', 'deleted_at'] as const;
const FIELD_RE = /^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*$/;

type Doc = Record<string, unknown>;
interface RawRow { id: string; doc: string; created_at: unknown; updated_at: unknown; deleted_at: unknown }

const _path = (field: string) => {
  if (!FIELD_RE.test(field)) throw new Error(`Invalid field: ${field}`);
  return `$.${field}`;
};

const _toRow = (r: RawRow): Doc => ({
  ...JSON.parse(r.doc || '{}'),
  id: r.id, created_at: r.created_at, updated_at: r.updated_at, deleted_at: r.deleted_at,
});

export class DocStore {
  constructor(private db: D1Database) {}

  /** filters = exact match (so sánh dạng text) — field dot-path đi vào JSON. */
  async find(table: string, filters: Record<string, string> = {}): Promise<Doc[]> {
    const where = ['tbl = ?', 'deleted_at IS NULL'];
    const params: unknown[] = [table];
    for (const [k, v] of Object.entries(filters)) {
      if (k === 'id') { where.push('id = ?'); params.push(v); continue; }
      where.push('CAST(json_extract(doc, ?) AS TEXT) = ?');
      params.push(_path(k), String(v));
    }
    const { results } = await this.db
      .prepare(`SELECT id, doc, created_at, updated_at, deleted_at FROM docs WHERE ${where.join(' AND ')} ORDER BY rowid`)
      .bind(...params).all<RawRow>();
    return results.map(_toRow);
  }

  async findById(table: string, id: string): Promise<Doc | null> {
    const r = await this.db
      .prepare('SELECT id, doc, created_at, updated_at, deleted_at FROM docs WHERE tbl = ? AND id = ? AND deleted_at IS NULL')
      .bind(table, id).first<RawRow>();
    return r ? _toRow(r) : null;
  }

  private _upsertStmt(table: string, id: string, data: Doc) {
    const { id: _id, ...rest } = data;
    const doc: Doc = { ...rest };
    for (const c of TIME_COLS) delete doc[c];
    const now = new Date().toISOString();
    const hasDeleted = Object.prototype.hasOwnProperty.call(data, 'deleted_at');
    // created_at chỉ đặt lúc tạo; deleted_at chỉ đổi khi body có gửi (soft-delete / khôi phục)
    return this.db.prepare(`
      INSERT INTO docs (tbl, id, doc, created_at, updated_at, deleted_at) VALUES (?, ?, json(?), ?, ?, ?)
      ON CONFLICT(tbl, id) DO UPDATE SET
        doc        = json_patch(docs.doc, excluded.doc),
        updated_at = excluded.updated_at,
        deleted_at = CASE WHEN ? THEN excluded.deleted_at ELSE docs.deleted_at END
    `).bind(
      table, id, JSON.stringify(doc),
      data.created_at ?? now, data.updated_at ?? now, data.deleted_at ?? null,
      hasDeleted ? 1 : 0,
    );
  }

  async upsert(table: string, id: string, data: Doc): Promise<void> {
    await this._upsertStmt(table, id, data).run();
  }

  async batch(table: string, items: { id: string; data: Doc }[]): Promise<void> {
    if (!items.length) return;
    await this.db.batch(items.map(({ id, data }) => this._upsertStmt(table, id, data)));
  }

  /** Xoá THẬT mọi row của 1 bảng logic (kể cả row đã soft-delete) — trả số row đã xoá. */
  async purge(table: string): Promise<number> {
    const r = await this.db.prepare('DELETE FROM docs WHERE tbl = ?').bind(table).run();
    return r.meta.changes ?? 0;
  }

  /** Cộng/trừ nguyên tử 1 field số, chặn dưới 0 — trả giá trị mới, null nếu row không tồn tại. */
  async bump(table: string, id: string, field: string, delta: number): Promise<number | null> {
    const path = _path(field);
    // json_set không tự tạo object cha còn thiếu (vd row chưa có `meta`) — dựng sẵn từng cấp
    // (path đã qua FIELD_RE nên nối thẳng vào SQL an toàn)
    const parts = field.split('.');
    let base = 'doc';
    for (let i = 1; i < parts.length; i++) {
      const p = `$.${parts.slice(0, i).join('.')}`;
      base = `json_set(${base}, '${p}', json(COALESCE(json_extract(doc, '${p}'), '{}')))`;
    }
    const r = await this.db.prepare(`
      UPDATE docs SET doc = json_set(${base}, ?1, MAX(0, COALESCE(json_extract(doc, ?1), 0) + ?2)), updated_at = ?3
      WHERE tbl = ?4 AND id = ?5 AND deleted_at IS NULL
      RETURNING json_extract(doc, ?1) AS value
    `).bind(path, delta, new Date().toISOString(), table, id).first<{ value: number }>();
    return r ? Number(r.value) : null;
  }

  /** +1 nguyên tử cho field số (top-level) chỉ khi còn < `limit` — trả giá trị mới, null nếu đã chạm trần / không có row. */
  async incrementBelow(table: string, id: string, field: string, limit: number): Promise<number | null> {
    const path = _path(field);
    const r = await this.db.prepare(`
      UPDATE docs SET doc = json_set(doc, ?1, COALESCE(json_extract(doc, ?1), 0) + 1), updated_at = ?2
      WHERE tbl = ?3 AND id = ?4 AND deleted_at IS NULL AND COALESCE(json_extract(doc, ?1), 0) < ?5
      RETURNING json_extract(doc, ?1) AS value
    `).bind(path, new Date().toISOString(), table, id, limit).first<{ value: number }>();
    return r ? Number(r.value) : null;
  }

  /** Đổi `field` từ `from` sang `to` (+ merge `patch`) chỉ khi đang là `from` — true = chính lần gọi này đổi được (CAS). */
  async claim(table: string, id: string, field: string, from: string, to: string, patch: Doc = {}): Promise<boolean> {
    const path = _path(field);
    const r = await this.db.prepare(`
      UPDATE docs SET doc = json_set(json_patch(doc, json(?1)), ?2, ?3), updated_at = ?4
      WHERE tbl = ?5 AND id = ?6 AND deleted_at IS NULL AND json_extract(doc, ?2) = ?7
      RETURNING id
    `).bind(JSON.stringify(patch), path, to, new Date().toISOString(), table, id, from).first<{ id: string }>();
    return !!r;
  }

  /** Thời hạn (ms epoch, top-level) = max(hạn hiện tại, `now`) + `ms` — nguyên tử; trả hạn mới, null nếu không có row. */
  async extendTime(table: string, id: string, field: string, ms: number, now = Date.now()): Promise<number | null> {
    const path = _path(field);
    const r = await this.db.prepare(`
      UPDATE docs SET doc = json_set(doc, ?1, MAX(COALESCE(json_extract(doc, ?1), 0), ?2) + ?3), updated_at = ?4
      WHERE tbl = ?5 AND id = ?6 AND deleted_at IS NULL
      RETURNING json_extract(doc, ?1) AS value
    `).bind(path, now, ms, new Date().toISOString(), table, id).first<{ value: number }>();
    return r ? Number(r.value) : null;
  }
}
