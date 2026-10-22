// Single source of truth for group tile geometry — <svc-node-group> positions its cells with it and
// <svc-edge-layer> anchors links to the same cells, so the two can never drift apart.
export const GROUP_PREFIX = 'group:';
export const GROUP_CELL = 56;
export const GROUP_GAP = 10;
export const GROUP_PAD = 12;
export const GROUP_TITLE_H = 26;
const COLLAPSED_SLOTS = 4;
const EXPANDED_COLS = 3;
const MINI_GAP = 4;
const MINI = (GROUP_CELL - MINI_GAP) / 2;

const span = (n) => GROUP_PAD * 2 + n * GROUP_CELL + (n - 1) * GROUP_GAP;
const slot = (col, row) => ({ x: GROUP_PAD + col * (GROUP_CELL + GROUP_GAP), y: GROUP_PAD + row * (GROUP_CELL + GROUP_GAP), size: GROUP_CELL });

export const groupId = (type) => `${GROUP_PREFIX}${type}`;

/** More members than a collapsed 2x2 can show — slot 3 becomes the mini-icon cluster. */
export const hasOverflow = (count) => count > COLLAPSED_SLOTS;

export const overflowSlot = () => slot(1, 1);

export function groupBox(count, expanded) {
    if (!expanded) return { width: span(2), height: span(2) };
    return { width: span(EXPANDED_COLS), height: span(Math.max(1, Math.ceil(count / EXPANDED_COLS))) };
}

/** Cell rects relative to the group box origin, index-aligned with members. */
export function groupCells(count, expanded) {
    const folded = !expanded && hasOverflow(count);
    const cells = [];
    for (let i = 0; i < count; i++) {
        if (expanded) {
            cells.push({ ...slot(i % EXPANDED_COLS, Math.floor(i / EXPANDED_COLS)), mini: false });
        } else if (!folded || i < COLLAPSED_SLOTS - 1) {
            cells.push({ ...slot(i % 2, Math.floor(i / 2)), mini: false });
        } else {
            const m = i - (COLLAPSED_SLOTS - 1);
            const base = overflowSlot();
            // Beyond the 2x2 cluster: not drawn, anchored to the cluster slot itself.
            if (m >= 4) cells.push({ ...base, mini: false, hidden: true });
            else cells.push({ x: base.x + (m % 2) * (MINI + MINI_GAP), y: base.y + Math.floor(m / 2) * (MINI + MINI_GAP), size: MINI, mini: true });
        }
    }
    return cells;
}

/** World-space rect of one member's cell, or null when nodeId isn't in the group. */
export function memberCell(group, nodeId) {
    const index = group.members.findIndex((m) => m.id === nodeId);
    if (index < 0) return null;
    const cell = groupCells(group.members.length, group.expanded)[index];
    return { x: group.x + cell.x, y: group.y + cell.y, size: cell.size };
}
