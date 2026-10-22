#!/usr/bin/env node
/**
 * stack.mjs — điều phối site (Astro) + 3 Cloudflare Worker (auth :8787, llm :8788, radar :8789) từ root.
 *
 *   pnpm run setup          XOÁ SẠCH bản cài cũ (node_modules, .astro, dist, .wrangler = D1 local, .dev.vars)
 *                           rồi cài lại deps root + 3 worker, sinh .dev.vars từ .env, tạo D1 local mới theo db/schema.sql
 *   pnpm run dev            chạy cả 4 (site :5000, auth :8787, llm :8788, radar :8789), Ctrl+C tắt hết
 *   pnpm run check          kiểm tra 4 server local đang trả lời
 *   pnpm run cf:provision   tạo/tìm D1 ALL_DB (auth) + D1/Vectorize (llm) + D1 (radar) → ghi id vào wrangler.jsonc
 *   pnpm run deploy         provision → đẩy secret + deploy cả 3 worker (site tự build/host riêng)
 *   pnpm run deploy:auth    chỉ 1 worker (cũng :llm, :radar) — provision + secret + deploy của riêng worker đó.
 *                           Gọi qua `pnpm run`: `pnpm deploy` là lệnh có sẵn của pnpm (deploy workspace), không phải script này.
 *
 * Mỗi worker vẫn tự chạy được độc lập trong thư mục của nó — file này chỉ gọi lại script có sẵn
 * của từng worker (scripts/setup-dev.mjs, push-secrets.mjs, `pnpm run dev/deploy`).
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORKERS = {
    auth: { dir: join(ROOT, 'src/packages/auth/worker'), port: 8787, color: 35, envKey: 'PUBLIC_AUTH_URL' },
    // deployVars: vars của wrangler.jsonc điền từ .env lúc deploy — biến → khoá .env (bắt buộc: trống thì dừng), hoặc
    // { key, optional, check } (trống thì giữ nguyên + cảnh báo; check(value) trả về cảnh báo nếu giá trị đáng ngờ).
    llm:  {
        dir: join(ROOT, 'src/packages/llm/worker'), port: 8788, color: 36, envKey: 'PUBLIC_LLM_URL',
        // CLOU_ACCOUNT = account của LLM_API_TOKEN — CLOU_KEY chỉ có quyền Workers AI trên account này (chat + ảnh).
        deployVars: { AUTH_URL: 'PUBLIC_AUTH_URL', CLOU_ACCOUNT: { key: 'LLM_ACCOUNT_ID', optional: true }, MAIL_FROM: { key: 'MAIL_FROM', optional: true, check: (v) => mailFromWarning(v) } },
    },
    radar: { dir: join(ROOT, 'src/packages/radar/worker'), port: 8789, color: 33, envKey: 'PUBLIC_RADAR_URL' },
};
const SITE_PORT = 5000;
// Render node của radar — Camoufox (Python), KHÔNG phải worker: venv riêng trong thư mục của nó (pnpm run setup:render).
// `pnpm run dev` chỉ chạy nó khi venv đã có, để máy không có Python vẫn dev được phần còn lại.
const RENDER = { dir: join(ROOT, 'src/packages/radar/render'), port: 8790, color: 34 };
const ENV_PROD = join(ROOT, '.env.production');
const IS_WIN = process.platform === 'win32';
const RENDER_PY = join(RENDER.dir, '.venv', IS_WIN ? 'Scripts/python.exe' : 'bin/python');

const log = (msg) => console.log(`\x1b[1m[stack]\x1b[0m ${msg}`);
const fail = (msg) => { console.error(`\x1b[31m[stack] ✗ ${msg}\x1b[0m`); process.exit(1); };

/** Chạy đồng bộ, in thẳng output; dừng cả chuỗi nếu lệnh lỗi (trừ khi allowFail). */
function run(cmd, args, cwd = ROOT, { allowFail = false, env = process.env } = {}) {
    log(`$ ${cmd} ${args.join(' ')}  (${cwd === ROOT ? '.' : cwd.replace(ROOT, '').replace(/\\/g, '/')})`);
    const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true, env });
    if (r.status !== 0 && !allowFail) fail(`${cmd} ${args.join(' ')} thất bại (exit ${r.status})`);
    return r.status === 0;
}

function parseEnv(file) {
    if (!existsSync(file)) return {};
    const out = {};
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
        if (m) out[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1');
    }
    return out;
}

/** Env cho lệnh wrangler của 1 worker. Worker nằm trên account Cloudflare khác account đang
 *  `cf:login` → dùng API token riêng trong .env (<NAME>_API_TOKEN + <NAME>_ACCOUNT_ID, vd AUTH_API_TOKEN);
 *  wrangler ưu tiên CLOUDFLARE_API_TOKEN hơn OAuth. Không khai báo thì dùng OAuth như bình thường. */
function cfEnv(name) {
    const env = parseEnv(join(ROOT, '.env'));
    const key = name.toUpperCase();
    const token = env[`${key}_API_TOKEN`], account = env[`${key}_ACCOUNT_ID`];
    return { ...process.env, ...(token && { CLOUDFLARE_API_TOKEN: token }), ...(account && { CLOUDFLARE_ACCOUNT_ID: account }) };
}

// ── setup ─────────────────────────────────────────────────────────────────────

// Mọi thứ sinh ra được — xoá hết để setup luôn bắt đầu từ trạng thái sạch. .wrangler/ chứa D1 local:
// dữ liệu dev mất, DB tạo lại rỗng theo db/schema.sql (know_fts dựng mới cùng know, không lệch nhau).
// Giữ .env, .env.production, pnpm-lock.yaml (cấu hình + phiên bản deps). Vectorize là index thật trên
// Cloudflare nên không bị xoá; vector mồ côi của dữ liệu dev cũ bị search bỏ qua (không có know_chunks).
const CLEAN_ROOT = ['node_modules', '.astro', 'dist'];
const CLEAN_WORKER = ['node_modules', '.wrangler', '.dev.vars'];

function clean() {
    const targets = [
        ...CLEAN_ROOT.map(p => join(ROOT, p)),
        ...Object.values(WORKERS).flatMap(w => CLEAN_WORKER.map(p => join(w.dir, p))),
    ].filter(existsSync);
    for (const t of targets) {
        log(`xoá ${t.replace(ROOT, '.').replace(/\\/g, '/')}`);
        rmSync(t, { recursive: true, force: true, maxRetries: 3 });
    }
    if (!targets.length) log('không có gì để xoá');
}

function setup() {
    const env = parseEnv(join(ROOT, '.env'));
    const need = ['PUBLIC_SUPABASE_URL', 'PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
    const missing = need.filter(k => !env[k]);
    if (!existsSync(join(ROOT, '.env'))) fail('Thiếu .env ở root — copy .env.example thành .env rồi điền giá trị.');

    log('── xoá bản cài cũ');
    clean();
    run('pnpm', ['install']);
    for (const [name, w] of Object.entries(WORKERS)) {
        run('pnpm', ['install'], w.dir);
        run('node', ['scripts/setup-dev.mjs'], w.dir); // chỉ sinh .dev.vars — KHÔNG đẩy secret lên Cloudflare
        log(`${name}-worker sẵn sàng (.dev.vars)`);
    }
    // D1 local mới, đúng db/schema.sql (chỉ cấu trúc) — xem scripts/d1-schema.mjs
    for (const w of Object.values(WORKERS)) run('pnpm', ['run', 'db:local'], w.dir);

    if (!existsSync(ENV_PROD)) {
        writeFileSync(ENV_PROD, [
            '# Dùng khi `pnpm run build` — Vite nạp file này đè lên .env.',
            '# Điền URL worker thật (wrangler deploy in ra sau lần deploy đầu, dạng https://<tên>.<subdomain>.workers.dev).',
            'PUBLIC_AUTH_URL=',
            'PUBLIC_LLM_URL=',
            'PUBLIC_RADAR_URL=',
            '',
        ].join('\n'));
        log('đã tạo .env.production (điền URL worker trước khi build site production)');
    }

    log('setup xong.' + (missing.length ? ` \x1b[33mCòn thiếu trong .env: ${missing.join(', ')}\x1b[0m` : ''));
}

// ── dev ───────────────────────────────────────────────────────────────────────

const children = [];

/** Chạy song song, prefix mỗi dòng output theo tên tiến trình. */
/** `optional`: tiến trình phụ (render node) — nó dừng thì chỉ báo, các tiến trình khác vẫn chạy. */
function startProc(name, color, cmd, args, cwd, env = process.env, { optional = false } = {}) {
    const child = spawn(cmd, args, { cwd, shell: true, env: { ...env, FORCE_COLOR: '1' } });
    const tag = `\x1b[${color}m[${name}]\x1b[0m `;
    const pipe = (stream, out) => {
        let buf = '';
        stream.on('data', d => {
            buf += d; const lines = buf.split(/\r?\n/); buf = lines.pop();
            for (const l of lines) out.write(tag + l + '\n');
        });
        stream.on('end', () => { if (buf) out.write(tag + buf + '\n'); buf = ''; });
    };
    pipe(child.stdout, process.stdout);
    pipe(child.stderr, process.stderr);
    // 'close' (không phải 'exit'): đợi stdout/stderr đọc hết — dòng lỗi cuối cùng không bị nuốt.
    child.on('close', code => {
        if (stopping) return;
        if (optional) { log(`${name} dừng (exit ${code}) — các tiến trình khác vẫn chạy`); return; }
        log(`${name} dừng (exit ${code}) — tắt các tiến trình còn lại`);
        shutdown(code ?? 0);
    });
    children.push(child);
}

let stopping = false;
function shutdown(code = 0) {
    if (stopping) return; stopping = true;
    // shell:true → pid là shell; Windows phải kill cả cây (wrangler/astro là tiến trình con)
    for (const c of children) {
        if (c.exitCode !== null) continue;
        if (IS_WIN) spawnSync('taskkill', ['/pid', String(c.pid), '/T', '/F'], { stdio: 'ignore' });
        else c.kill('SIGTERM');
    }
    process.exit(code);
}

/** BROWSER_NODE_SECRET hợp lệ (≥ 32 ký tự, env hoặc root .env) — thiếu thì render node tự thoát ngay khi khởi động. */
const renderSecretOk = () => (process.env.BROWSER_NODE_SECRET || parseEnv(join(ROOT, '.env')).BROWSER_NODE_SECRET || '').length >= 32;
const BROWSER_NODE_SECRET_HINT = 'BROWSER_NODE_SECRET trong .env cần ≥ 32 ký tự (vd `openssl rand -hex 32`), dùng chung với radar';

/** `dev` = tất cả (render node nếu đã setup:render + có BROWSER_NODE_SECRET); `dev llm` / `dev auth site` = chỉ những phần
 *  được liệt kê. Render node là phần phụ: thiếu thì radar vẫn chạy, chỉ các nguồn `render` tạm nghỉ. */
function dev(only = []) {
    const autoRender = !only.length && existsSync(RENDER_PY);
    if (autoRender && !renderSecretOk()) log(`bỏ qua render node — ${BROWSER_NODE_SECRET_HINT}. Nguồn "render" sẽ tạm nghỉ.`);
    const want = only.length ? only : [...Object.keys(WORKERS), 'site', ...(autoRender && renderSecretOk() ? ['render'] : [])];
    const bad = want.filter(n => n !== 'site' && n !== 'render' && !WORKERS[n]);
    if (bad.length) fail(`không có "${bad.join(', ')}" — dùng: ${Object.keys(WORKERS).join(' | ')} | site | render`);
    if (want.includes('render') && !existsSync(RENDER_PY)) fail('render node chưa cài — chạy `pnpm run setup:render` trước.');
    if (want.includes('render') && !renderSecretOk()) fail(`render node: ${BROWSER_NODE_SECRET_HINT}.`);
    for (const n of want) if (WORKERS[n] && !existsSync(join(WORKERS[n].dir, 'node_modules'))) fail(`${n}-worker chưa cài deps — chạy \`pnpm run setup\` trước.`);
    process.on('SIGINT', () => shutdown(0));
    process.on('SIGTERM', () => shutdown(0));
    const urls = [];
    // `pnpm run dev` của worker tự chạy predev (sinh .dev.vars + đồng bộ D1 local theo db/schema.sql).
    // cfEnv: Vectorize/AI của llm luôn gọi Cloudflare thật kể cả khi dev → cần đúng account
    for (const [name, w] of Object.entries(WORKERS)) {
        if (!want.includes(name)) continue;
        startProc(name, w.color, 'pnpm', ['run', 'dev'], w.dir, cfEnv(name));
        urls.push(`${name} http://localhost:${w.port}`);
    }
    if (want.includes('site')) {
        // PUBLIC_<WORKER>_URL thiếu trong .env (vd .env tạo trước khi có radar) → client gọi nhầm vào chính site (404).
        // Dev thì điền sẵn URL local của worker cho tiến trình site — Vite đọc PUBLIC_* từ process.env; .env không bị sửa.
        const dotenv = parseEnv(join(ROOT, '.env'));
        const siteEnv = { ...process.env };
        for (const w of Object.values(WORKERS)) {
            if (process.env[w.envKey] || dotenv[w.envKey]) continue;
            siteEnv[w.envKey] = `http://localhost:${w.port}`;
            log(`${w.envKey} chưa có trong .env — dev dùng ${siteEnv[w.envKey]} (thêm vào .env cho rõ ràng)`);
        }
        startProc('site', 32, 'pnpm', ['exec', 'astro', 'dev'], ROOT, siteEnv);
        urls.unshift(`site http://localhost:${SITE_PORT}`);
    }
    if (want.includes('render')) {
        // Trong `pnpm run dev` (tất cả) render node là phụ — nó chết không kéo site/worker theo; `dev render` thì vẫn chặt.
        startProc('render', RENDER.color, `"${RENDER_PY}"`, ['server.py'], RENDER.dir, process.env, { optional: !only.length });
        urls.push(`render http://127.0.0.1:${RENDER.port}`);
    }
    log(`${urls.join(' · ')} — Ctrl+C để tắt`);
}

// ── check ─────────────────────────────────────────────────────────────────────

async function ping(label, url, init) {
    try {
        const res = await fetch(url, { ...init, signal: AbortSignal.timeout(5000) });
        // worker trả 401/404 JSON cho request không token/không route vẫn = đang chạy
        console.log(`  \x1b[32m✓\x1b[0m ${label.padEnd(6)} ${url} → HTTP ${res.status}`);
        return true;
    } catch (e) {
        console.log(`  \x1b[31m✗\x1b[0m ${label.padEnd(6)} ${url} → ${e.cause?.code || e.name}`);
        return false;
    }
}

async function check() {
    log('kiểm tra server local (chạy `pnpm run dev` ở terminal khác trước):');
    const ok = [
        await ping('site', `http://localhost:${SITE_PORT}/`),
        await ping('auth', `http://localhost:${WORKERS.auth.port}/v1/data/profiles`),
        await ping('llm',  `http://localhost:${WORKERS.llm.port}/v1/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }),
        await ping('radar', `http://localhost:${WORKERS.radar.port}/v1/radar/status`),
    ];
    if (ok.includes(false)) process.exitCode = 1;
}

// ── deploy ────────────────────────────────────────────────────────────────────

/**
 * PUBLIC_<NAME>_URL (.env.production, không có thì .env) dạng https://<worker>.<subdomain>.workers.dev cho biết worker
 * thật đang ở account nào — provision/deploy phải vào ĐÚNG account đó, không thì sinh 1 bản thứ hai ở account khác và
 * site vẫn gọi bản cũ. So subdomain workers.dev của account sẽ dùng (<NAME>_API_TOKEN + <NAME>_ACCOUNT_ID, cfEnv) với
 * URL đó; lệch là dừng. URL không phải *.workers.dev (tên miền riêng) hay dùng OAuth (không token) → chỉ cảnh báo.
 */
async function ensureTarget(name) {
    const key = WORKERS[name].envKey;
    const url = deployEnv(key);
    let host = '';
    try { host = new URL(url).hostname; } catch { /* trống / sai — xử lý ngay dưới */ }
    const want = host.match(/^[^.]+\.([^.]+)\.workers\.dev$/)?.[1];
    if (!want) return log(`${name}: ${key} không phải *.workers.dev (${host || 'trống'}) — bỏ qua kiểm tra account`);
    const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account } = cfEnv(name);
    if (!token || !account) return log(`${name}: không có ${name.toUpperCase()}_API_TOKEN + _ACCOUNT_ID — dùng OAuth, không kiểm tra được account (cần subdomain "${want}")`);
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/subdomain`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json()).catch((err) => ({ success: false, errors: [{ message: err.message }] }));
    if (!res.success) fail(`${name}: không đọc được subdomain workers.dev của ${name.toUpperCase()}_ACCOUNT_ID — ${JSON.stringify(res.errors)}`);
    const got = res.result?.subdomain;
    if (got !== want) {
        fail(`${name}: ${name.toUpperCase()}_ACCOUNT_ID là account có subdomain "${got}", nhưng ${key} trỏ tới "${want}".workers.dev — `
            + `deploy sẽ tạo bản thứ hai ở sai account. Sửa ${name.toUpperCase()}_API_TOKEN + ${name.toUpperCase()}_ACCOUNT_ID trong .env `
            + `thành token + account id của account "${want}" (hook/SETUP.rst §5).`);
    }
    log(`${name}: account đúng (${got}.workers.dev)`);
}

/** Tên worker từ dòng lệnh (`deploy llm radar`) — trống = cả 3; tên lạ thì dừng trước khi đụng tới Cloudflare. */
function pickWorkers(names) {
    const bad = names.filter((n) => !WORKERS[n]);
    if (bad.length) fail(`không có worker "${bad.join(', ')}" — dùng: ${Object.keys(WORKERS).join(' | ')}`);
    return names.length ? names : Object.keys(WORKERS);
}

/** Giá trị .env dùng cho deploy: .env.production trước, rồi .env, rồi biến môi trường. */
const deployEnv = (key) => parseEnv(ENV_PROD)[key] || parseEnv(join(ROOT, '.env'))[key] || process.env[key] || '';

// Resend chỉ gửi từ domain đã xác minh trong Resend — hộp thư miễn phí không bao giờ xác minh được.
const FREE_MAIL = /@(gmail|googlemail|yahoo|ymail|outlook|hotmail|live|msn|icloud|me|aol|proton|protonmail|gmx|zoho|yandex)\.[a-z.]+>?\s*$/i;
const EMAIL_LIKE = /^[^<>@\s]+@[^<>@\s]+$|<[^<>@\s]+@[^<>@\s]+>\s*$/;

function mailFromWarning(value) {
    if (FREE_MAIL.test(value)) return `MAIL_FROM "${value}" là hộp thư miễn phí — Resend sẽ từ chối, email token không đi. `
        + 'Xác minh domain của bạn trong Resend (Domains → Add) rồi đặt dạng "AI Operations <no-reply@chatzui.com>".';
    if (!EMAIL_LIKE.test(value)) return `MAIL_FROM "${value}" không giống địa chỉ email ("Tên <a@domain>" hoặc "a@domain").`;
    return '';
}

/** WORKERS[name].deployVars → wrangler.jsonc `vars` (vd AUTH_URL của llm = PUBLIC_AUTH_URL) — giá trị production đúng với
 *  .env mỗi lần deploy, không phải sửa tay khi đổi tên worker / subdomain. Biến bắt buộc mà trống thì dừng trước khi deploy. */
function syncDeployVars(name) {
    for (const [varName, spec] of Object.entries(WORKERS[name].deployVars ?? {})) {
        const { key, optional = false, check } = typeof spec === 'string' ? { key: spec } : spec;
        const value = deployEnv(key).trim().replace(/\/$/, '');
        if (!value) {
            if (!optional) fail(`${name}: ${key} trống trong .env — cần cho vars.${varName} của ${name}/wrangler.jsonc`);
            log(`${name}: ⚠ ${key} trống trong .env — vars.${varName} giữ nguyên`);
            continue;
        }
        if (value.includes('"')) fail(`${name}: ${key} không được chứa dấu " (giá trị JSON của vars.${varName})`);
        const warning = check?.(value);
        if (warning) log(`${name}: ⚠ ${warning}`);
        setWranglerValue(name, new RegExp(`("${varName}"\\s*:\\s*)"[^"]*"`), value, `vars.${varName}`);
    }
}

function deployWorkers(names) {
    for (const name of names) {
        const w = WORKERS[name];
        log(`── deploy ${name}`);
        const env = cfEnv(name);
        run('node', ['scripts/setup-dev.mjs'], w.dir);            // đồng bộ SUPABASE_URL (.env) → wrangler.jsonc
        syncDeployVars(name);
        run('node', ['scripts/push-secrets.mjs'], w.dir, { env });
        run('pnpm', ['run', 'deploy'], w.dir, { env });           // D1 remote chỉ đồng bộ cấu trúc (không dữ liệu dev) + wrangler deploy
        if (name === 'auth') log(`auth: PayPal webhook phải trỏ tới ${deployEnv('PUBLIC_AUTH_URL').replace(/\/$/, '')}/v1/billing/webhook (PayPal Dashboard → app → Webhooks)`);
    }
}

/** Chạy wrangler của 1 worker và bắt output (không in ra) — dùng khi cần đọc JSON/id trả về. */
function wranglerOut(args, name = 'llm') {
    const r = spawnSync('pnpm', ['exec', 'wrangler', ...args], { cwd: WORKERS[name].dir, shell: true, encoding: 'utf8', env: cfEnv(name) });
    return { ok: r.status === 0, out: `${r.stdout || ''}\n${r.stderr || ''}` };
}

/** Lấy mảng JSON đầu tiên trong output — wrangler có thể in banner/cảnh báo trước JSON. */
function jsonList(out) {
    const s = out.indexOf('['), e = out.lastIndexOf(']');
    try { return s >= 0 && e > s ? JSON.parse(out.slice(s, e + 1)) : []; } catch { return []; }
}

/** Gợi ý sửa cho các lỗi credential hay gặp của Cloudflare API ('' = không nhận ra). */
function cfHint(out, name) {
    const key = `${name.toUpperCase()}_API_TOKEN`;
    if (/code:\s*9109|Cannot use the access token from location/i.test(out)) {
        const ip = out.match(/from location:\s*([0-9a-f:.]+)/i)?.[1];
        return `${key} bật "Client IP Address Filtering" mà IP hiện tại${ip ? ` (${ip})` : ''} không được phép — `
            + 'Cloudflare → My Profile → API Tokens → Edit token: thêm IP này (IPv6 nhà mạng hay đổi, nên thêm cả dải /64 '
            + 'hoặc bỏ lọc IP) rồi chạy lại.';
    }
    if (/code:\s*10000|Authentication error/i.test(out)) {
        return `${key} không có quyền cho thao tác này hoặc sai account — token cần Account: D1 Edit, Workers Scripts Edit, `
            + `Vectorize Edit (llm), và ${name.toUpperCase()}_ACCOUNT_ID phải đúng account của token (hook/SETUP.rst §5).`;
    }
    return '';
}

/** Danh sách tài nguyên — lệnh list lỗi thì DỪNG (không được coi là "chưa có" rồi đi tạo mới). */
function cfList(args, name, label) {
    const { ok, out } = wranglerOut(args, name);
    if (!ok) fail(`không đọc được danh sách ${label} (${name}) — ${cfHint(out, name) || `output:\n${out}`}`);
    return jsonList(out);
}

// whoami trả exit 0 cả khi chưa đăng nhập — phải đọc output. Kiểm tra theo từng worker vì mỗi
// worker có thể dùng credential riêng (cfEnv)
function ensureLogin(names = Object.keys(WORKERS)) {
    for (const name of names) {
        const env = cfEnv(name);
        const { out } = wranglerOut(['whoami'], name);
        if (/not authenticated|wrangler login/i.test(out)) {
            fail(env.CLOUDFLARE_API_TOKEN
                ? `${name.toUpperCase()}_API_TOKEN trong .env không hợp lệ/hết hạn — tạo token mới (xem hook/SETUP.rst §5).`
                : 'Chưa đăng nhập Cloudflare — chạy `pnpm run cf:login` trước.');
        }
        const ipBlocked = /code:\s*9109/i.test(out) && cfHint(out, name);
        if (ipBlocked) fail(ipBlocked);
        const who = env.CLOUDFLARE_API_TOKEN ? `API token${env.CLOUDFLARE_ACCOUNT_ID ? ` · account ${env.CLOUDFLARE_ACCOUNT_ID}` : ''}`
            : (out.match(/associated with the email\s+(\S+?)\.?\s*$/im)?.[1] || 'OAuth');
        log(`Cloudflare ${name}: ${who}`);
    }
}

// ── provision (tài nguyên Cloudflare của các worker) ──────────────────────────

const VEC_DIMENSIONS = 1024; // @cf/baai/bge-m3 (llm/worker/src/embed.ts)

const wranglerFile = (name) => join(WORKERS[name].dir, 'wrangler.jsonc');
const readWrangler = (name) => readFileSync(wranglerFile(name), 'utf8');

/** Ghi đè 1 giá trị chuỗi trong wrangler.jsonc bằng regex — giữ nguyên comment của file. */
function setWranglerValue(name, re, value, label) {
    const text = readWrangler(name);
    if (!re.test(text)) fail(`không tìm thấy ${label} trong ${name}/wrangler.jsonc`);
    const next = text.replace(re, `$1"${value}"`);
    if (next !== text) { writeFileSync(wranglerFile(name), next); log(`${name}/wrangler.jsonc: ${label} = ${value}`); }
}

/** D1 duy nhất của 1 worker (auth: ALL_DB, llm: LLM_DB, radar: RADAR_DB) — id hiện tại còn trong account thì giữ. */
function provisionD1(name, fallbackName) {
    const text = readWrangler(name);
    const binding = text.match(/"binding"\s*:\s*"([A-Z_]+)"\s*,\s*"database_name"/)?.[1] || 'D1';
    const dbName = text.match(/"database_name"\s*:\s*"([^"]+)"/)?.[1] || fallbackName;
    const current = text.match(/"database_id"\s*:\s*"([^"]*)"/)?.[1];
    const list = cfList(['d1', 'list', '--json'], name, 'D1');
    if (current && list.some(d => d.uuid === current)) return log(`${name} D1 ${binding} ok (${dbName} · ${current})`);
    let id = list.find(d => d.name === dbName)?.uuid;
    if (!id) {
        const { ok, out } = wranglerOut(['d1', 'create', dbName], name);
        id = out.match(/database_id["']?\s*[:=]\s*["']([0-9a-f-]{36})["']/i)?.[1];
        if (!ok || !id) fail(`tạo D1 thất bại:
${out}`);
        log(`đã tạo D1 "${dbName}" (${name})`);
    }
    setWranglerValue(name, /("database_id"\s*:\s*)"[^"]*"/, id, `${binding}.database_id`);
}

function provisionVectorize() {
    const idx = readWrangler('llm').match(/"binding"\s*:\s*"VEC"\s*,\s*"index_name"\s*:\s*"([^"]+)"/)?.[1];
    if (!idx) fail('không tìm thấy vectorize VEC.index_name trong llm/wrangler.jsonc');
    const list = cfList(['vectorize', 'list', '--json'], 'llm', 'Vectorize');
    if (list.some(v => v.name === idx)) return log(`llm Vectorize VEC ok (${idx})`);
    const { ok, out } = wranglerOut(['vectorize', 'create', idx, `--dimensions=${VEC_DIMENSIONS}`, '--metric=cosine'], 'llm');
    if (!ok) fail(`tạo Vectorize thất bại:
${out}`);
    log(`đã tạo Vectorize "${idx}" (${VEC_DIMENSIONS} chiều, cosine)`);
}

// Tài nguyên Cloudflare của từng worker — deploy 1 worker chỉ provision phần của nó.
const PROVISION = {
    auth: () => provisionD1('auth', 'mega-all'),
    llm: () => { provisionD1('llm', 'mega-llm'); provisionVectorize(); },
    radar: () => provisionD1('radar', 'mega-radar'),
};

function provision(names = Object.keys(WORKERS)) {
    log(`── provision tài nguyên Cloudflare (${names.join(', ')})`);
    for (const name of names) PROVISION[name]();
}

// ── render node (Camoufox) ───────────────────────────────────────────────────

/** venv + requirements.txt (bản ghim) + tải binary Camoufox. Chạy lại được: venv có rồi thì chỉ cài/tải bù. */
function renderSetup() {
    if (!existsSync(RENDER_PY)) run(IS_WIN ? 'python' : 'python3', ['-m', 'venv', '.venv'], RENDER.dir);
    run(`"${RENDER_PY}"`, ['-m', 'pip', 'install', '-r', 'requirements.txt'], RENDER.dir);
    run(`"${RENDER_PY}"`, ['-m', 'camoufox', 'fetch'], RENDER.dir);
    log('render node sẵn sàng — cần BROWSER_NODE_SECRET (≥ 32 ký tự) trong .env, dùng chung với radar.');
}

// ── main ──────────────────────────────────────────────────────────────────────

const [cmd, ...rest] = process.argv.slice(2);
const commands = {
    setup,
    'render-setup': renderSetup,
    dev: () => dev(rest),
    check,
    provision: async () => { const names = pickWorkers(rest); ensureLogin(names); for (const n of names) await ensureTarget(n); provision(names); },
    deploy: async () => { const names = pickWorkers(rest); ensureLogin(names); for (const n of names) await ensureTarget(n); provision(names); deployWorkers(names); },
};
if (!commands[cmd]) fail(`lệnh không hợp lệ "${cmd ?? ''}" — dùng: ${Object.keys(commands).join(' | ')}`);
await commands[cmd]();
