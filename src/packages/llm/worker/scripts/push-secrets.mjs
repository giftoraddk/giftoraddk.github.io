#!/usr/bin/env node
/**
 * Pushes production secrets for llm (`llm`) straight from the root .env
 * via `wrangler secret bulk`. Safe to re-run — `wrangler secret bulk` just overwrites the same
 * secret names.
 */
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_ENV = join(__dirname, '..', '..', '..', '..', '..', '.env');
const PKG_DIR = join(__dirname, '..');
const FIELDS = ['SUPABASE_SERVICE_ROLE_KEY', 'OPER_KEY', 'CLOU_KEY', 'NVID_KEY', 'PRO_KEY', 'RESEND_API_KEY', 'BILLING_SERVICE_KEY'];
const WORKER_LABEL = 'llm';

const MASK_MARKER = '~k!t@d~';
const unmask = (raw) => raw.includes(MASK_MARKER) ? raw.split(MASK_MARKER).join('') : raw;

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

/** Derives every Worker secret value straight from the root .env's contents. */
function deriveSecretsFromRootEnv(rootEnvText) {
    const { active, commented } = parseEnvFile(rootEnvText);
    const pick = (...keys) => { for (const k of keys) { const v = active[k] ?? commented[k]; if (v) return v; } return ''; };

    return {
        SUPABASE_URL: pick('PUBLIC_SUPABASE_URL'),
        SUPABASE_SERVICE_ROLE_KEY: pick('SUPABASE_SERVICE_ROLE_KEY'),
        OPER_KEY: unmask(pick('PUBLIC_OPER_KEY', 'OPER_KEY')),
        CLOU_KEY: unmask(pick('PUBLIC_CLOU_KEY', 'CLOU_KEY')),
        NVID_KEY: unmask(pick('PUBLIC_NVID_KEY', 'NVID_KEY')),
        PRO_KEY: pick('PRO_KEY'),
        RESEND_API_KEY: pick('RESEND_API_KEY'),
        BILLING_SERVICE_KEY: pick('BILLING_SERVICE_KEY'),
    };
}

function main() {
    if (!existsSync(ROOT_ENV)) {
        console.error(`[push-secrets] root .env not found at ${ROOT_ENV} — skipping.`);
        return;
    }
    const derived = deriveSecretsFromRootEnv(readFileSync(ROOT_ENV, 'utf8'));
    const secrets = Object.fromEntries(FIELDS.map(k => [k, derived[k]]).filter(([, v]) => v));

    if (!Object.keys(secrets).length) {
        console.log('[push-secrets] nothing derivable from .env yet — skipping.');
        return;
    }

    const tmpFile = join(PKG_DIR, '.secrets-bulk.tmp.json');
    writeFileSync(tmpFile, JSON.stringify(secrets, null, 2));
    try {
        console.log(`[push-secrets] pushing ${Object.keys(secrets).length} secret(s) to Cloudflare (${WORKER_LABEL}): ${Object.keys(secrets).join(', ')}`);
        const result = spawnSync('npx', ['wrangler', 'secret', 'bulk', tmpFile], { stdio: 'inherit', cwd: PKG_DIR, shell: true });
        if (result.status !== 0) {
            console.error('[push-secrets] wrangler secret bulk failed — see output above.');
            process.exitCode = 1;
        }
    } finally {
        rmSync(tmpFile, { force: true });
    }
}

main();
