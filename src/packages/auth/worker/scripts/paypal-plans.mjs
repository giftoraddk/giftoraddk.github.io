#!/usr/bin/env node
/**
 * Creates the PayPal Product + Billing Plans that purchase/tool/plans.js describes and writes each new
 * plan id straight back into plans.js. Only prices whose planIds[PAYPAL_ENV] is still empty are
 * created, so a re-run (or a run that failed halfway) never duplicates a plan. Reads PAYPAL_ENV /
 * PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET via ./env.mjs (worker .env, then root .env).
 *
 *   pnpm paypal:plans                        # from the repo root or auth/worker; sandbox by default
 *   PAYPAL_ENV=live in .env → live plans
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PURCHASE, INTERVALS, trialDaysOf } from '../../../purchase/tool/plans.js';
import { paypalEnv } from '../../../purchase/tool/billing.js';
import { fractionDigits } from '../../../purchase/tool/format.js';
import { ROOT_ENV, WORKER_ENV, publicSecretLeaks, rootEnvPicker } from './env.mjs';

const API_BASE = { sandbox: 'https://api-m.sandbox.paypal.com', live: 'https://api-m.paypal.com' };
const PRODUCT_NAME = 'App subscription';
const PLANS_FILE = fileURLToPath(new URL('../../../purchase/tool/plans.js', import.meta.url));

/** Fills `planIds[env]` of one plan/interval in plans.js, in place — comments and formatting survive. */
function writePlanId(planId, interval, env, paypalId) {
    const text = readFileSync(PLANS_FILE, 'utf8');
    const start = text.indexOf(`id: '${planId}'`);
    const next = start < 0 ? -1 : text.indexOf(`id: '`, start + 1); // the following plan entry, if any
    const block = text.slice(start, next < 0 ? undefined : next);
    const slot = new RegExp(`(${interval}:\\s*\\{[^}]*planIds:\\s*\\{[^}]*\\b${env}:\\s*)''`);
    if (start < 0 || !slot.test(block)) throw new Error(`plans.js has no empty ${planId}.${interval}.planIds.${env} — set it to '${paypalId}' by hand`);
    writeFileSync(PLANS_FILE, text.slice(0, start) + block.replace(slot, `$1'${paypalId}'`) + (next < 0 ? '' : text.slice(next)));
}

async function main() {
    const pick = rootEnvPicker();
    if (!pick) throw new Error(`no .env found (root ${ROOT_ENV} or worker ${WORKER_ENV})`);
    const leaks = publicSecretLeaks(pick);
    if (leaks.length) throw new Error(`remove ${leaks.join(', ')} from the root .env — PUBLIC_ vars can end up in the browser bundle (keep it as PAYPAL_CLIENT_SECRET, ideally in auth/worker/.env)`);
    const env = paypalEnv(pick('PAYPAL_ENV'));
    const clientId = pick('PAYPAL_CLIENT_ID', 'PUBLIC_PAYPAL_CLIENT_ID');
    const secret = pick('PAYPAL_CLIENT_SECRET');
    if (!clientId || !secret) throw new Error('PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET missing in .env');
    const base = API_BASE[env];

    const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
        method: 'POST',
        headers: { Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials',
    });
    if (!tokenRes.ok) throw new Error(`PayPal auth failed (${tokenRes.status}) — is PAYPAL_ENV=${env} the right app type?`);
    const { access_token: token } = await tokenRes.json();

    const call = async (path, body) => {
        const res = await fetch(`${base}${path}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
            body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(`${path} → ${res.status}: ${JSON.stringify(data)}`);
        return data;
    };

    const todo = PURCHASE.plans.flatMap((plan) => INTERVALS
        .filter((interval) => plan.prices[interval] && !plan.prices[interval].planIds?.[env])
        .map((interval) => ({ plan, interval, price: plan.prices[interval] })));
    if (!todo.length) { console.log(`[paypal-plans] every price already has a ${env} plan id — nothing to create.`); return; }

    const product = await call('/v1/catalogs/products', { name: PRODUCT_NAME, type: 'SERVICE', category: 'SOFTWARE' });
    console.log(`[paypal-plans] ${env} product ${product.id}`);

    const currency = PURCHASE.currency.toUpperCase();
    const digits = fractionDigits(PURCHASE.currency);
    const created = [];
    for (const { plan, interval, price } of todo) {
        const trialDays = trialDaysOf(plan);
        // Must match what the worker's planMismatch() expects: optional free DAY×N trial, then 1×interval forever.
        const cycles = [
            ...(trialDays ? [{ tenure_type: 'TRIAL', sequence: 1, total_cycles: 1, frequency: { interval_unit: 'DAY', interval_count: trialDays } }] : []),
            {
                tenure_type: 'REGULAR', sequence: trialDays ? 2 : 1, total_cycles: 0,
                frequency: { interval_unit: interval.toUpperCase(), interval_count: 1 },
                pricing_scheme: { fixed_price: { value: (price.amount / 10 ** digits).toFixed(digits), currency_code: currency } },
            },
        ];
        const res = await call('/v1/billing/plans', {
            product_id: product.id,
            name: `${plan.name?.en ?? plan.id} (${interval})`,
            status: 'ACTIVE',
            billing_cycles: cycles,
            payment_preferences: { auto_bill_outstanding: true, payment_failure_threshold: 1 },
        });
        // Saved right away — a later failure must not orphan a plan that plans.js doesn't know about.
        writePlanId(plan.id, interval, env, res.id);
        created.push(res.id);
        console.log(`[paypal-plans] ${plan.id}.${interval} → ${res.id} (saved)`);
    }

    console.log(`\n[paypal-plans] ${created.length} plan(s) written to plans.js (planIds.${env}).`);
}

main().catch((err) => { console.error(`[paypal-plans] ${err.message}`); process.exitCode = 1; });
