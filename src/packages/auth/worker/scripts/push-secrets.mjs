#!/usr/bin/env node
/**
 * Pushes production secrets for auth (`auth`) straight from the root .env
 * via `wrangler secret bulk`. Safe to re-run — `wrangler secret bulk` just overwrites the same
 * secret names. Same self-contained shape as ../../llm/worker/scripts/push-secrets.mjs.
 */
import { writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ROOT_ENV, WORKER_ENV, rootEnvPicker } from './env.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = join(__dirname, '..');
const WORKER_LABEL = 'auth';

function main() {
    const pick = rootEnvPicker();
    if (!pick) {
        console.error(`[push-secrets] no .env found (root ${ROOT_ENV} or worker ${WORKER_ENV}) — skipping.`);
        return;
    }
    const secrets = Object.fromEntries(
        // TG_* — Telegram báo đơn mới (invoices.ts); không phải PUBLIC_* nên token bot không bao giờ vào bundle trình duyệt
        ['SUPABASE_SERVICE_ROLE_KEY', 'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID', 'BILLING_SERVICE_KEY', 'TG_BOT_TOKEN', 'TG_CHAT_ID']
            .map((k) => [k, k === 'PAYPAL_CLIENT_ID' ? pick(k, 'PUBLIC_PAYPAL_CLIENT_ID') : pick(k)])
            .filter(([, v]) => v),
    );
    const names = Object.keys(secrets);

    if (!names.length) {
        console.log('[push-secrets] no secrets set in .env yet — skipping.');
        return;
    }

    const tmpFile = join(PKG_DIR, '.secrets-bulk.tmp.json');
    writeFileSync(tmpFile, JSON.stringify(secrets, null, 2));
    try {
        console.log(`[push-secrets] pushing ${names.length} secret(s) to Cloudflare (${WORKER_LABEL}): ${names.join(', ')}`);
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
