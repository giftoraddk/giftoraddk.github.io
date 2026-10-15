// src/packages/node/tool/access.js
//
// Who may open a node's panel:
//   · `node.roles` — checked against the signed-in user's roles (svc-node `userRoles`, null = signed out). One listed
//     role is enough; a user role grants a listed one when it is the same or namespaced under it ('products.read'
//     grants 'products'). '*' = any signed-in user. A node without `roles` is open to everyone.
//   · `node.plans` — the plans that cover it (preset/config.js `tiers`: 'free', 'starter', 'pro'…), checked against the
//     user's plan (svc-node `userPlan`, null = 'free'). Left out = every plan. Anyone a node's own staff role (not
//     '*') lets in skips it — roles are for staff tools, plans for what a customer bought.
//   · Super Admin ('admin') passes both, on every node — the Workers treat an admin as the platform itself (llm
//     fn/owner.ts resolveCaller → owner '', every sector incl. unreleased ones). Signing in still comes first.
// The panel says which one is missing; the Workers still check every call behind it.

const granted = (need, userRoles) => need.filter((n) => n !== '*').some((n) => userRoles.some((r) => r === n || r.startsWith(`${n}.`)));

/** → 'ok' | 'signin' (signed out) | 'role' (signed in, none of the roles) | 'plan' (their plan doesn't cover it) */
export function nodeAccess(node, userRoles, userPlan = null) {
    const need = node?.roles;
    if (need?.length && !userRoles) return 'signin';
    if (userRoles?.includes('admin')) return 'ok';
    if (need?.length) {
        if (granted(need, userRoles)) return 'ok';
        if (!need.includes('*')) return 'role';
    }
    const plans = node?.plans;
    if (!Array.isArray(plans)) return 'ok';
    return plans.includes(userPlan || 'free') ? 'ok' : 'plan';
}
