#!/usr/bin/env node
/**
 * d1-schema.mjs — đồng bộ D1 của 1 worker về đúng `db/schema.sql` (thay cho wrangler migrations).
 *
 *   node <root>/scripts/d1-schema.mjs <BINDING> --local|--remote
 *
 * Chạy từ thư mục worker (package.json của worker gọi ở predev/deploy):
 *   1. chỉ các CREATE TABLE của db/schema.sql — bảng thiếu thì tạo
 *   2. so cột thật (PRAGMA table_info) với schema → cột thiếu thì ALTER TABLE ADD COLUMN
 *   3. áp nguyên db/schema.sql (index, rồi phần nâng cấp dữ liệu cũ nếu file có) — SAU bước 2, vì index / câu
 *      UPDATE trên cột mới (vd know(owner, type)) sẽ lỗi `no such column` nếu chạy trên bảng cũ chưa có cột đó
 * Không mang dữ liệu giữa các DB — deploy không đưa dữ liệu dev lên production; bản ghi mặc định không có: chuyên môn
 * phòng ban nằm trong code Worker (llm/worker/src/fn/), bảng divisions chỉ giữ face/override. Câu sửa dữ liệu duy nhất
 * được phép nằm trong schema.sql là loại chỉ chạm dòng còn ở dạng cũ (chạy lại không đổi gì) — xem cuối
 * llm/worker/db/schema.sql.
 * Idempotent: chạy bao nhiêu lần cũng được, DB cũ/mới/lệch đều về khớp schema. Không bao giờ xoá cột/bảng.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const CWD = process.cwd();
const SCHEMA = 'db/schema.sql';
const WRANGLER = join(CWD, 'node_modules', 'wrangler', 'bin', 'wrangler.js');

const [binding, ...flags] = process.argv.slice(2);
const target = flags.includes('--remote') ? '--remote' : flags.includes('--local') ? '--local' : '';

const log = (msg) => console.log(`\x1b[1m[d1-schema]\x1b[0m ${msg}`);
const fail = (msg) => { console.error(`\x1b[31m[d1-schema] ✗ ${msg}\x1b[0m`); process.exit(1); };

if (!binding || !target) fail('dùng: d1-schema.mjs <BINDING> --local|--remote');
if (!existsSync(join(CWD, SCHEMA))) fail(`không thấy ${SCHEMA} trong ${CWD}`);
if (!existsSync(WRANGLER)) fail('chưa cài wrangler trong worker này — chạy `pnpm install` trước');

// Gọi thẳng bin JS của wrangler (không qua shell) — tránh vỡ quote của --command trên Windows.
function wrangler(args, { json = false } = {}) {
    const all = ['d1', 'execute', binding, target, ...(target === '--remote' ? ['--yes'] : []), ...(json ? ['--json'] : []), ...args];
    const r = spawnSync(process.execPath, [WRANGLER, ...all], { cwd: CWD, encoding: 'utf8', env: process.env });
    const out = `${r.stdout || ''}\n${r.stderr || ''}`;
    if (r.status !== 0) fail(`wrangler ${all.join(' ')} thất bại:\n${out}`);
    if (!json) return out;
    const s = out.indexOf('['), e = out.lastIndexOf(']');
    try { return JSON.parse(out.slice(s, e + 1)); } catch { fail(`không đọc được JSON từ wrangler:\n${out}`); }
}

const CONSTRAINT = /^(PRIMARY|UNIQUE|FOREIGN|CHECK|CONSTRAINT)\b/i;
const unquote = (name) => name.replace(/^["`[]|["`\]]$/g, '');
// Lines without their `-- comment`. Split on CRLF too: a schema.sql saved on Windows keeps a trailing \r on every
// line, and `/--.*$/` (no `m` flag) then never matches — the comment (and the column's comma) ended up inside the
// ALTER TABLE, and every column after it in the same --command broke.
const codeLines = (text) => text.split(/\r?\n/).map(l => l.replace(/--.*$/, ''));

/** { table: [{ name, def }] } — cần mỗi cột 1 dòng trong CREATE TABLE (quy ước ở đầu schema.sql). */
function parseSchema(sql) {
    const tables = {};
    const re = /CREATE TABLE IF NOT EXISTS\s+("?[\w]+"?)\s*\(([\s\S]*?)\n\s*\);/gi;
    for (const [, rawName, body] of sql.matchAll(re)) {
        tables[unquote(rawName)] = codeLines(body)
            .map(l => l.trim().replace(/,$/, ''))
            .filter(l => l && !CONSTRAINT.test(l))
            .map(def => ({ name: unquote(def.split(/\s+/)[0]), def }));
    }
    return tables;
}

// SQLite không ADD COLUMN được: PRIMARY KEY/UNIQUE, hoặc NOT NULL mà không có DEFAULT.
function addable(def) {
    if (/\b(PRIMARY\s+KEY|UNIQUE)\b/i.test(def)) return false;
    return !/\bNOT\s+NULL\b/i.test(def) || /\bDEFAULT\b/i.test(def);
}

/** Chỉ các câu CREATE [VIRTUAL] TABLE (bỏ comment) — chạy được trên DB cũ trước khi có cột mới. */
function tableStatements(sql) {
    const clean = codeLines(sql).join('\n');
    return clean.match(/CREATE TABLE IF NOT EXISTS[\s\S]*?\n\s*\);|CREATE VIRTUAL TABLE IF NOT EXISTS[^;]*;/gi) ?? [];
}

const sql = readFileSync(join(CWD, SCHEMA), 'utf8');
log(`${binding} ${target} — tạo bảng thiếu theo ${SCHEMA}`);
wrangler([`--command=${tableStatements(sql).join('\n')}`]);

const schema = parseSchema(sql);
const names = Object.keys(schema);
const pragma = (t) => `PRAGMA table_info("${t}")`;
let results = wrangler([`--command=${names.map(pragma).join('; ')}`], { json: true });
// Phòng khi wrangler gộp kết quả nhiều câu lệnh — hỏi từng bảng một.
if (results.length !== names.length) results = names.map(t => wrangler([`--command=${pragma(t)}`], { json: true })[0])

const alters = [];
const blocked = [];
names.forEach((table, i) => {
    const have = new Set((results[i]?.results ?? []).map(c => c.name));
    for (const col of schema[table]) {
        if (have.has(col.name)) continue;
        (addable(col.def) ? alters : blocked).push({ table, ...col });
    }
});

if (blocked.length) {
    fail(`không tự thêm được (cần DEFAULT, hoặc là PRIMARY KEY/UNIQUE) — sửa schema.sql:\n` +
        blocked.map(c => `  ${c.table}.${c.name}: ${c.def}`).join('\n'));
}
if (alters.length) {
    wrangler([`--command=${alters.map(c => `ALTER TABLE "${c.table}" ADD COLUMN ${c.def}`).join('; ')}`]);
    log(`đã thêm ${alters.length} cột: ${alters.map(c => `${c.table}.${c.name}`).join(', ')}`);
} else {
    log(`${names.length} bảng khớp schema (${names.join(', ')})`);
}

wrangler([`--file=${SCHEMA}`]);
log(`đã áp ${SCHEMA} (index)`);
