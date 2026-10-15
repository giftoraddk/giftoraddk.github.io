// Theme colors a `tints` pair may use — anything else falls back to TINT_DEFAULT slot by slot.
export const TINT_COLORS = ['primary', 'secondary', 'accent', 'info', 'success', 'warning', 'error'];
export const TINT_DEFAULT = ['primary', 'secondary'];

/** 'info secondary' / 'info,secondary' / ['info', 'secondary'] → [top-right, top-left] color names
 *  (<svc-ask>: [left, right] of its gradient, with its own `fallback` pair). */
export function resolveTints(tints, fallback = TINT_DEFAULT) {
    const parts = Array.isArray(tints) ? tints : String(tints ?? '').split(/[\s,]+/);
    return fallback.map((color, i) => (TINT_COLORS.includes(parts[i]) ? parts[i] : color));
}

/** group.type → its tints, first member that sets `group.tints` wins (same rule as `group.title`). */
export function groupTintsByType(nodes) {
    const map = new Map();
    for (const n of nodes) {
        const { type, tints } = n.group ?? {};
        if (type && tints != null && !map.has(type)) map.set(type, tints);
    }
    return map;
}

/** Inline custom props read by css/svc-node-style.css — '' when unset, so the inherited pair applies. */
export function tintVars(tints) {
    if (tints == null) return '';
    const [a, b] = resolveTints(tints);
    return `--color-tint-a:var(--color-${a}); --color-tint-b:var(--color-${b});`;
}
