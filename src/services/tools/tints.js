// tints.js — cặp màu theme [a, b] dùng chung mọi nơi: svc-node (tile/group/panel), svc-ask, svc-radar, web-table, layout
// trang (tools/page.js). Chỉ nhận tên màu theme (TINT_COLORS) — chuỗi lạ rơi về cặp mặc định, nên giá trị từ config/
// dữ liệu không chèn được CSS tuỳ ý vào style.

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

/** Inline custom props `<prefix>-a` / `<prefix>-b` — '' when unset, so the inherited pair applies.
 *  Default prefix = --color-tint (css/svc-node-style.css, apex/css/pastel.css); web-table: --wt,
 *  layout: --layout-tint. */
export function tintVars(tints, prefix = '--color-tint') {
    if (tints == null) return '';
    const [a, b] = resolveTints(tints);
    return `${prefix}-a:var(--color-${a}); ${prefix}-b:var(--color-${b});`;
}
