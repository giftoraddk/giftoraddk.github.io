#!/usr/bin/env node
/**
 * d1-wipe.mjs — xoá DỮ LIỆU trong D1 LOCAL của 1 worker (giữ nguyên bảng, cột, index — chỉ DELETE các dòng).
 *
 *   node <root>/scripts/d1-wipe.mjs <BINDING> [bảng ...]
 *
 * Chạy từ thư mục worker (package.json của worker: `pnpm run db:wipe [bảng ...]`; ở root: `pnpm run wipe:llm talks`).
 *   - không nêu bảng → xoá mọi bảng khai báo trong db/schema.sql
 *   - nêu bảng → chỉ các bảng đó (phải có trong db/schema.sql), kèm bảng dẫn xuất của nó để không lệch nhau:
 *     know → know_chunks, know_fts, rel (index tìm kiếm + quan hệ dựng từ know) · talks → artifacts (bàn giao của task)
 * CHỈ --local: không có cờ --remote, không bao giờ chạm D1 thật trên Cloudflare. Vectorize (index thật trên
 * Cloudflare) không bị xoá — vector mồ côi của dữ liệu cũ bị search bỏ qua vì không còn know_chunks.
 * Binding nào có bộ đếm trong storage Durable Object local (DO_KEYS) thì xoá kèm khi wipe bảng tương ứng (hoặc wipe hết).
 * Luôn dọn thêm cache của worker (CACHES): tài khoản Cloudflare Wrangler đã ghim (node_modules/.cache/wrangler — đổi
 * account thì không đi nhầm account cũ) và Cache API / KV giả lập của `wrangler dev` (.wrangler/state/v3/cache, kv —
 * không worker nào có binding KV, nên không mất dữ liệu). D1 / DO / R2 local không nằm trong danh sách này.
 * In số dòng mỗi bảng trước khi xoá. Nên tắt `pnpm dev` của worker đó trước (tránh khoá file SQLite local; DO đang
 * chạy còn giữ bộ đếm trong bộ nhớ và sẽ ghi đè lại).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const CWD = process.cwd();
const SCHEMA = 'db/schema.sql';
const WRANGLER = join(CWD, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
// Bảng dựng ra từ bảng khác — xoá bảng gốc thì xoá luôn, không để index / bàn giao trỏ vào dòng không còn.
const DERIVED = { know: ['know_chunks', 'know_fts', 'rel'], talks: ['artifacts'] };
// Bộ đếm nằm trong storage Durable Object LOCAL (không phải D1) nhưng đếm theo dữ liệu D1 — xoá bảng `tables` thì xoá
// luôn các key này, kẻo sau wipe quota vẫn coi như đã dùng. Dạng { BINDING: { className, tables, keys } } — hiện không
// worker nào dùng (radar đã gỡ khỏi nhánh giftoraddk.com).
const DO_KEYS = {};
const DO_DIR = join(CWD, '.wrangler', 'state', 'v3', 'do');
// Cache dọn kèm mỗi lần wipe — [đường dẫn trong thư mục worker, mô tả]. Wrangler tự tạo lại khi cần.
const CACHES = [
    [join('node_modules', '.cache', 'wrangler'), 'tài khoản Cloudflare Wrangler đã ghim'],
    [join('.wrangler', 'state', 'v3', 'cache'), 'Cache API local'],
    [join('.wrangler', 'state', 'v3', 'kv'), 'KV local'],
];

const log = (msg) => console.log(`\x1b[1m[d1-wipe]\x1b[0m ${msg}`);
const fail = (msg) => { console.error(`\x1b[31m[d1-wipe] ✗ ${msg}\x1b[0m`); process.exit(1); };

const [binding, ...wanted] = process.argv.slice(2);
if (!binding || binding.startsWith('-')) fail('dùng: d1-wipe.mjs <BINDING> [bảng ...]');
if (wanted.some((a) => a.startsWith('-'))) fail('chỉ nhận tên bảng — script này luôn chạy trên D1 local, không có cờ nào khác');
if (!existsSync(join(CWD, SCHEMA))) fail(`không thấy ${SCHEMA} trong ${CWD}`);
if (!existsSync(WRANGLER)) fail('chưa cài wrangler trong worker này — chạy `pnpm install` trước');

// Gọi thẳng bin JS của wrangler (không qua shell) — tránh vỡ quote của --command trên Windows (như d1-schema.mjs).
function wrangler(command, { json = false } = {}) {
    const args = ['d1', 'execute', binding, '--local', ...(json ? ['--json'] : []), '--command', command];
    const r = spawnSync(process.execPath, [WRANGLER, ...args], { cwd: CWD, encoding: 'utf8', env: process.env });
    const out = `${r.stdout || ''}\n${r.stderr || ''}`;
    if (r.status !== 0) fail(`wrangler d1 execute thất bại:\n${out}`);
    if (!json) return out;
    const s = out.indexOf('['), e = out.lastIndexOf(']');
    try { return JSON.parse(out.slice(s, e + 1)); } catch { fail(`không đọc được JSON từ wrangler:\n${out}`); }
}

// Tên bảng chỉ lấy từ schema.sql — tên người gõ phải khớp 1 trong số đó, nên không có gì lạ lọt vào câu SQL.
const sql = readFileSync(join(CWD, SCHEMA), 'utf8');
const known = [...sql.matchAll(/CREATE (?:VIRTUAL )?TABLE IF NOT EXISTS\s+"?(\w+)"?/gi)].map((m) => m[1]);
if (!known.length) fail(`${SCHEMA} không khai báo bảng nào`);

const unknown = wanted.filter((t) => !known.includes(t));
if (unknown.length) fail(`không có bảng: ${unknown.join(', ')} — các bảng của ${binding}: ${known.join(', ')}`);
const declared = wanted.length ? [...new Set(wanted.flatMap((t) => [t, ...(DERIVED[t] ?? [])]))].filter((t) => known.includes(t)) : known;

// schema.sql có thể đi trước D1 local (bảng mới chưa được `db:local` / predev tạo) — chỉ đụng bảng đang có thật.
const existing = new Set((wrangler(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${declared.map((t) => `'${t}'`).join(', ')})`,
    { json: true },
)[0]?.results ?? []).map((r) => r.name));
const missing = declared.filter((t) => !existing.has(t));
if (missing.length) log(`bỏ qua (chưa có trong D1 local — chạy \`pnpm run db:local\` để tạo): ${missing.join(', ')}`);
const picked = declared.filter((t) => existing.has(t));

if (!picked.length) log('không có bảng nào để xoá');
else {
    const counts = wrangler(`SELECT ${picked.map((t) => `(SELECT COUNT(*) FROM "${t}") AS "${t}"`).join(', ')}`, { json: true })[0]?.results?.[0] ?? {};
    for (const t of picked) log(`${t}: ${counts[t] ?? 0} dòng`);
    if (!picked.some((t) => Number(counts[t]) > 0)) log('không có dòng nào để xoá');
    else {
        wrangler(picked.map((t) => `DELETE FROM "${t}";`).join(' '));
        log(`✓ đã xoá dữ liệu local của ${binding}: ${picked.join(', ')}`);
    }
}

// Bộ đếm DO đi theo bảng gốc của nó (bảng đã khai báo, kể cả khi D1 đang trống) — chạy cả khi D1 không có dòng nào.
const counter = DO_KEYS[binding];
if (counter && counter.tables.some((t) => declared.includes(t))) await wipeDoKeys(counter);

wipeCaches();

/** Xoá các thư mục cache trong CACHES — thư mục đang bị `pnpm dev` giữ (Windows: EBUSY / EPERM) → dừng kèm hướng dẫn. */
function wipeCaches() {
    const cleared = [];
    for (const [rel, label] of CACHES) {
        const dir = join(CWD, rel);
        if (!existsSync(dir)) continue;
        try {
            rmSync(dir, { recursive: true, force: true });
            cleared.push(label);
        } catch (err) {
            fail(`không xoá được cache ${label} (${rel}): ${err.code ?? err.message} — tắt \`pnpm dev\` của worker rồi chạy lại`);
        }
    }
    log(cleared.length ? `✓ đã xoá cache: ${cleared.join(', ')}` : 'cache: không có gì để xoá');
}

/** Xoá `keys` khỏi storage của MỌI object thuộc class này trong miniflare local (.wrangler/state/v3/do/<worker>-<Class>/). */
async function wipeDoKeys({ className, keys }) {
    const dir = existsSync(DO_DIR) ? readdirSync(DO_DIR).find((d) => d.endsWith(`-${className}`)) : null;
    const files = dir ? readdirSync(join(DO_DIR, dir)).filter((f) => f.endsWith('.sqlite') && f !== 'metadata.sqlite') : [];
    if (!files.length) return log(`bộ đếm ${className}: chưa có storage local — không có gì để xoá`);
    const { DatabaseSync } = await import('node:sqlite');
    let removed = 0;
    for (const f of files) {
        let db;
        try {
            db = new DatabaseSync(join(DO_DIR, dir, f));
            const hasKv = db.prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = '_cf_KV'`).get();
            if (hasKv) removed += Number(db.prepare(`DELETE FROM _cf_KV WHERE key IN (${keys.map(() => '?').join(', ')})`).run(...keys).changes);
        } catch (err) {
            fail(`không xoá được bộ đếm ${className} (${f}): ${err.message} — tắt \`pnpm dev\` của worker rồi chạy lại`);
        } finally {
            db?.close();
        }
    }
    log(removed ? `✓ đã xoá bộ đếm ${className}: ${keys.join(', ')}` : `bộ đếm ${className}: không có key ${keys.join(', ')}`);
}
