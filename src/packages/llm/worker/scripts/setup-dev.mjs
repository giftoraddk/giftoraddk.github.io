#!/usr/bin/env node
/**
 * Auto-fills llm/worker/.dev.vars from the root .env — so `pnpm dev` works immediately for
 * `/v1/data/*` (D1 CRUD) and `/v1/ai/*` (chat + image generation) without any manual
 * copy-pasting. Re-runnable: values present in .env always overwrite .dev.vars; keys .env doesn't
 * provide (e.g. PRO_KEY) keep whatever was filled in by hand.
 *
 * What this CAN derive automatically:
 *   - OPER_KEY / CLOU_KEY / NVID_KEY — read straight off the client's own
 *     PUBLIC_OPER_KEY/PUBLIC_CLOU_KEY/PUBLIC_NVID_KEY (masked
 *     tensor-config-string format, unmasked automatically).
 *   - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — once you've created the project and pasted these
 *     into the root .env yourself. Note the service role key must NOT be PUBLIC_-prefixed — see
 *     the loud warning below if it is.
 *
 * What this CANNOT derive (no source of truth exists yet) — left blank, printed as a reminder:
 *   - PRO_KEY — optional paid-tier AI fallback (see ai.ts's resolveProChain()), never had a
 *     client-side counterpart to derive from. Blank is a fully supported no-op.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..', '..', '..', '..', '..');
const ROOT_ENV = join(ROOT_DIR, '.env');
const DEV_VARS = join(__dirname, '..', '.dev.vars');
const WRANGLER = join(__dirname, '..', 'wrangler.jsonc');

// ALLOWED_ORIGIN for LOCAL dev only (`.dev.vars`) — the Astro dev server's own origin (see root
// astro.config.mjs's `server.port: 5000`), genuinely distinct from whatever real domain gets
// deployed later (wrangler.jsonc's own `vars.ALLOWED_ORIGIN` placeholder), so this is a fixed
// constant, not derived from .env.
const DEV_ALLOWED_ORIGIN = 'http://localhost:5000';

const MASK_MARKER = '~k!t@d~';
const unmask = (raw) => raw.includes(MASK_MARKER) ? raw.split(MASK_MARKER).join('') : raw;

/** Every PUBLIC_*-named var that looks like a real secret is a live bug — Astro/Vite inlines EVERY
 *  PUBLIC_ var into the browser bundle. Warn loudly rather than silently "fixing" it. */
const SECRET_NAME_HINTS = /SERVICE_ROLE|PRIVATE_KEY|SECRET|CLIENT_EMAIL/;
function warnIfPublicLookingSecrets(active) {
    for (const key of Object.keys(active)) {
        if (key.startsWith('PUBLIC_') && SECRET_NAME_HINTS.test(key)) {
            console.warn(`[setup-dev] ⚠️  "${key}" is PUBLIC_-prefixed but looks like a secret — Astro/Vite will ship it to every browser on the next build. Rename it in .env WITHOUT the PUBLIC_ prefix.`);
        }
    }
}

/** Parses `KEY=value` lines whether commented (`# KEY=value`) or not, into two maps. Loose on
 *  purpose — prose comment lines just won't match the KEY=value shape and are skipped. */
function parseEnvFile(text) {
    const active = {}, commented = {};
    for (const rawLine of text.split('\n')) {
        const line = rawLine.trim();
        if (!line) continue;
        const isCommented = line.startsWith('#');
        const body = isCommented ? line.slice(1).trim() : line;
        const eq = body.indexOf('=');
        if (eq === -1) continue;
        const key = body.slice(0, eq).trim();
        if (!/^[A-Z][A-Z0-9_]*$/.test(key)) continue;
        const value = body.slice(eq + 1).trim().replace(/^"(.*)"$/, '$1');
        (isCommented ? commented : active)[key] = value;
    }
    return { active, commented };
}

/** Derives every Worker secret value straight from the root .env's contents. Doesn't apply any
 *  local-dev-only defaults (ALLOWED_ORIGIN etc.) or merge with an existing file — callers layer
 *  that on top for their own use case. */
function deriveSecretsFromRootEnv(rootEnvText) {
    const { active, commented } = parseEnvFile(rootEnvText);
    const pick = (...keys) => { for (const k of keys) { const v = active[k] ?? commented[k]; if (v) return v; } return ''; };

    const derived = {
        // Not a secret, but this Worker verifies JWTs against Supabase (see src/data.ts).
        SUPABASE_URL: pick('PUBLIC_SUPABASE_URL'),
        SUPABASE_SERVICE_ROLE_KEY: pick('SUPABASE_SERVICE_ROLE_KEY'),
        // Real source of truth is the client's PUBLIC_*_KEY (masked tensor-config-string format —
        // e.g. "cf~k!t@d~ut_Ab..." unmasks to "cfut_Ab...", the real Cloudflare token ai.ts's
        // detectProvider() expects). Bare KEY= as a 2nd fallback covers a future hand-added,
        // already-unmasked value (unmask() is a no-op without the marker, so this is safe either
        // way). PRO_KEY has no PUBLIC_ counterpart — always was Worker-only.
        OPER_KEY: unmask(pick('PUBLIC_OPER_KEY', 'OPER_KEY')),
        CLOU_KEY: unmask(pick('PUBLIC_CLOU_KEY', 'CLOU_KEY')),
        NVID_KEY: unmask(pick('PUBLIC_NVID_KEY', 'NVID_KEY')),
        PRO_KEY: pick('PRO_KEY'),
        // Account của CLOU_KEY (Workers AI chat + ảnh) — cùng nguồn với deploy (scripts/stack.mjs deployVars). Thiếu thì
        // wrangler.jsonc's CLOU_ACCOUNT (giá trị prod lần deploy trước, có thể là account khác) → mọi model Cloudflare 401.
        CLOU_ACCOUNT: pick('LLM_ACCOUNT_ID'),
        // /v1/hubs + /mcp — AUTH_URL from the client's PUBLIC_AUTH_URL (billing check); RESEND_API_KEY
        // is Worker-only (never PUBLIC_); MAIL_FROM is the verified Resend sender.
        AUTH_URL: pick('PUBLIC_AUTH_URL'),
        RESEND_API_KEY: pick('RESEND_API_KEY'),
        MAIL_FROM: pick('MAIL_FROM'),
        // Secret chung với auth (≥ 32 ký tự): đọc billing của 1 hub không cần JWT chủ hub (hubs.ts peekBilling).
        BILLING_SERVICE_KEY: pick('BILLING_SERVICE_KEY'),
    };

    return { active, commented, pick, derived };
}

/** Replaces `"VAR_NAME": "..."` inside wrangler.jsonc's `vars` block. No-op (returns false) if
 *  `value` is falsy — an unset .env override should never blank out whatever's already
 *  hand-written, or if the key isn't present at all. Regex string-replace, not
 *  JSON.parse+stringify, so wrangler.jsonc's own comments survive untouched. */
function syncWranglerVar(wranglerPath, varName, value) {
    if (!value) return false;
    const text = readFileSync(wranglerPath, 'utf8');
    const re = new RegExp(`("${varName}"\\s*:\\s*)"[^"]*"`);
    if (!re.test(text)) return false;
    const next = text.replace(re, `$1"${value}"`);
    if (next === text) return false;
    writeFileSync(wranglerPath, next);
    return true;
}

const nonEmpty = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v));

function parseDevVars(text) {
    const out = {};
    for (const rawLine of text.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq === -1) continue;
        out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^"(.*)"$/, '$1');
    }
    return out;
}

function main() {
    if (!existsSync(ROOT_ENV)) {
        console.error(`[setup-dev] root .env not found at ${ROOT_ENV} — nothing to derive, skipping.`);
        return;
    }
    const { active, derived: derivedSecrets } = deriveSecretsFromRootEnv(readFileSync(ROOT_ENV, 'utf8'));
    const existing = existsSync(DEV_VARS) ? parseDevVars(readFileSync(DEV_VARS, 'utf8')) : {};

    warnIfPublicLookingSecrets(active);

    // .env là nguồn chuẩn — giá trị có trong .env luôn đè .dev.vars cũ; default local chỉ lấp chỗ trống.
    const defaults = { ALLOWED_ORIGIN: DEV_ALLOWED_ORIGIN, AI_FREE_TIMEOUT_MS: '15000' };
    const merged = { ...defaults, ...existing, ...nonEmpty(derivedSecrets) };

    const ALL_FIELDS = ['ALLOWED_ORIGIN', 'AI_FREE_TIMEOUT_MS', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPER_KEY', 'CLOU_KEY', 'CLOU_ACCOUNT', 'NVID_KEY', 'PRO_KEY', 'AUTH_URL', 'RESEND_API_KEY', 'MAIL_FROM', 'BILLING_SERVICE_KEY'];
    for (const f of ALL_FIELDS) merged[f] ??= '';

    const lines = [
        '# Auto-generated by scripts/setup-dev.mjs — key có trong root .env luôn bị đè khi chạy lại;',
        '# chỉ key .env không có (vd PRO_KEY) mới giữ giá trị sửa tay ở đây.',
        '',
        '# Local dev only — wrangler.jsonc\'s copy is the prod placeholder, this overrides it here',
        `ALLOWED_ORIGIN="${merged.ALLOWED_ORIGIN}"`,
        `SUPABASE_URL="${merged.SUPABASE_URL}"`,
        '',
        '# Supabase service role key — from root .env\'s SUPABASE_SERVICE_ROLE_KEY (NOT PUBLIC_-prefixed;',
        '# needs a real project first, see README.md §1)',
        `SUPABASE_SERVICE_ROLE_KEY="${merged.SUPABASE_SERVICE_ROLE_KEY}"`,
        '',
        '# LLM providers (/v1/ai/*) — free chain tried first (OpenRouter/NVIDIA/Cloudflare, see ai.ts\'s',
        '# resolveFreeChain()); PRO_KEY is an optional paid-tier fallback (same tilde-config-string',
        '# format) tried only once no free model started answering within AI_FREE_TIMEOUT_MS — blank is',
        '# a fully supported no-op, nothing to fill in until a paid provider is actually set up.',
        `OPER_KEY="${merged.OPER_KEY}"`,
        `CLOU_KEY="${merged.CLOU_KEY}"`,
        // Trống thì không ghi — 1 CLOU_ACCOUNT="" sẽ đè giá trị của wrangler.jsonc và tắt hẳn Cloudflare.
        ...(merged.CLOU_ACCOUNT ? [`CLOU_ACCOUNT="${merged.CLOU_ACCOUNT}"`] : []),
        `NVID_KEY="${merged.NVID_KEY}"`,
        `PRO_KEY="${merged.PRO_KEY}"`,
        `AI_FREE_TIMEOUT_MS="${merged.AI_FREE_TIMEOUT_MS}"`,
        '',
        '# Hubs + MCP (src/hubs.ts, src/mcp.ts) — AUTH_URL from root .env\'s PUBLIC_AUTH_URL (billing check',
        '# before issuing a token); RESEND_API_KEY + MAIL_FROM send the token email (blank = token shown once, no email).',
        `AUTH_URL="${merged.AUTH_URL}"`,
        `RESEND_API_KEY="${merged.RESEND_API_KEY}"`,
        `MAIL_FROM="${merged.MAIL_FROM}"`,
        '',
        '# Secret chung với auth — trợ lý nhúng bật/tắt theo gia hạn / hết hạn (hubs.ts syncedHub); trống = chỉ',
        '# làm mới billing khi chủ hub mở Cài đặt.',
        `BILLING_SERVICE_KEY="${merged.BILLING_SERVICE_KEY}"`,
        '',
    ];
    writeFileSync(DEV_VARS, lines.join('\n'));

    // wrangler.jsonc's `vars.SUPABASE_URL` is what `wrangler deploy` actually ships (not
    // .dev.vars) — keep it in sync here too, so switching Supabase projects never again means
    // hand-editing wrangler.jsonc separately.
    const synced = [];
    if (syncWranglerVar(WRANGLER, 'SUPABASE_URL', derivedSecrets.SUPABASE_URL)) synced.push('SUPABASE_URL');
    if (synced.length) console.log(`[setup-dev] wrangler.jsonc synced: ${synced.join(', ')}`);

    console.log('[setup-dev] llm/worker/.dev.vars written.');
    const ready = [];
    const missing = [];
    if (merged.SUPABASE_URL && merged.SUPABASE_SERVICE_ROLE_KEY) ready.push('/v1/data/* admin routes (Supabase configured)');
    else if (merged.SUPABASE_URL) missing.push('/v1/data/* admin routes (SUPABASE_URL set, still need SUPABASE_SERVICE_ROLE_KEY)');
    else missing.push('/v1/data/* admin routes (needs a Supabase project — see README.md §1)');
    (merged.OPER_KEY || merged.CLOU_KEY || merged.NVID_KEY ? ready : missing).push('AI chat (/v1/ai/stream)');
    (merged.CLOU_KEY ? ready : missing).push('AI image generation (/v1/ai/image — Cloudflare Workers AI, CLOU_KEY)');
    ready.push(merged.PRO_KEY ? 'AI paid-tier fallback (PRO_KEY set)' : 'AI paid-tier fallback (PRO_KEY unset — optional, no-op)');
    (merged.AUTH_URL ? ready : missing).push(merged.AUTH_URL ? 'Hubs / MCP token issue (/v1/hubs)' : 'Hubs / MCP token issue (needs PUBLIC_AUTH_URL)');
    (merged.RESEND_API_KEY && merged.MAIL_FROM ? ready : missing).push('MCP token email (RESEND_API_KEY + MAIL_FROM)');
    (merged.BILLING_SERVICE_KEY.length >= 32 ? ready : missing).push('Hub billing sync without the owner (BILLING_SERVICE_KEY ≥ 32 chars, same in auth)');

    console.log(`  ready:   ${ready.join(', ') || '(none)'}`);
    if (missing.length) {
        console.log(`  missing: ${missing.join(', ')}`);
        console.log('  → see README.md for what still needs a real Supabase project / service account.');
    }
    console.log('  Remember: wrangler.jsonc\'s LLM_DB database_name and Vectorize index still need');
    console.log('  the real values before deploying (see wrangler.jsonc\'s own comments).');
}

main();
