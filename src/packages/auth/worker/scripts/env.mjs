/**
 * .env reader shared by the scripts in this folder (setup-dev, push-secrets, paypal-plans): the worker's own
 * .env (server secrets — Vite never loads it) wins over the root .env (shared with the site build).
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = join(__dirname, '..', '..', '..', '..', '..');
export const ROOT_ENV = join(ROOT_DIR, '.env');
export const WORKER_ENV = join(__dirname, '..', '.env');

/** Parses `KEY=value` lines whether commented (`# KEY=value`) or not, into two maps. Loose on
 *  purpose — prose comment lines just won't match the KEY=value shape and are skipped. */
export function parseEnvFile(text) {
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

// Server-only keys — a PUBLIC_ copy of any of these would be inlinable into the browser bundle by Vite.
const SERVER_SECRETS = ['PAYPAL_CLIENT_SECRET', 'SUPABASE_SERVICE_ROLE_KEY', 'BILLING_SERVICE_KEY'];

/** Server secrets sitting in the ROOT .env under a PUBLIC_ prefix — the site build could bundle them. */
export function publicSecretLeaks(pick) {
    return SERVER_SECRETS.map((k) => `PUBLIC_${k}`).filter((k) => pick.fromRoot(k));
}

const _read = (path) => (existsSync(path) ? parseEnvFile(readFileSync(path, 'utf8')) : null);
const _first = (maps, keys) => { for (const k of keys) for (const m of maps) if (m[k]) return m[k]; return ''; };

/** `pick(...keys)` — first non-empty wins; worker .env before root, active before commented. Null when neither file exists.
 *  `pick.fromRoot(...keys)` reads the root .env alone. */
export function rootEnvPicker() {
    const worker = _read(WORKER_ENV);
    const root = _read(ROOT_ENV);
    if (!worker && !root) return null;
    const maps = [worker?.active, root?.active, worker?.commented, root?.commented].filter(Boolean);
    const pick = (...keys) => _first(maps, keys);
    pick.fromRoot = (...keys) => _first([root?.active, root?.commented].filter(Boolean), keys);
    return pick;
}
