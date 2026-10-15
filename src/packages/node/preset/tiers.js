// src/packages/node/preset/tiers.js
//
// Who may use which node, by plan — preset/config.js `tiers`, cheapest first:
//     { free: ['account', 'everyday', 'consult-*'], starter: [...], pro: '*' }
// A tier lists preset ids, node ids, or 'prefix*'; '*' = everything. 'free' = no active plan (or signed out). A node
// gets `plans` = the tiers that cover it (left out when all do) — tool/access.js checks it against svc-node `userPlan`.
import { findPlan } from '@/packages/purchase/tool/plans.js';

const covers = (list, node) => list === '*' || (Array.isArray(list) && list.some((key) => typeof key === 'string'
    && (key === node.id || key === node.preset || (key.endsWith('*') && node.id.startsWith(key.slice(0, -1))))));

/** The tiers that cover `node`, cheapest first — undefined when every tier does (or there are none). */
export function plansOf(node, tiers) {
    const names = tiers ? Object.keys(tiers) : [];
    if (!names.length) return undefined;
    const covered = names.filter((t) => covers(tiers[t], node));
    return covered.length === names.length ? undefined : covered;
}

/** The user's tier: their active plan (auth billing) when `tiers` names it, else 'free'. */
export async function planOfUser(user, tiers) {
    if (!user || !tiers) return 'free';
    try {
        const [{ billing }, { hasActivePlan }] = await Promise.all([
            import('@/packages/purchase/service/service.js'),
            import('@/packages/purchase/tool/billing.js'),
        ]);
        const res = await billing.subscription();
        const plan = res?.ok && hasActivePlan(res.data) ? res.data.plan_id : 'free';
        return typeof plan === 'string' && Object.hasOwn(tiers, plan) ? plan : 'free';
    } catch (err) {
        console.warn('[node/preset] plan unknown — free for now:', err?.message);
        return 'free';
    }
}

/** 'pro' → its name in purchase/tool/plans.js ('Pro'), or the id capitalised. */
export const planLabel = (id, lang = 'vi') => (id ? findPlan(id)?.name?.[lang] ?? id[0].toUpperCase() + id.slice(1) : '');
