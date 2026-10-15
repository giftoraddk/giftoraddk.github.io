import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GROUP_CELL, groupBox, groupCells, hasOverflow, memberCell, overflowSlot } from './group-layout.js';

test('collapsed group is always a 2x2 box', () => {
    assert.deepEqual(groupBox(1, false), groupBox(9, false));
    assert.equal(groupBox(1, false).width, groupBox(1, false).height);
});

test('up to 4 members fill the 2x2 slots with full-size cells', () => {
    const cells = groupCells(4, false);
    assert.equal(hasOverflow(4), false);
    assert.ok(cells.every((c) => c.size === GROUP_CELL && !c.mini && !c.hidden));
    assert.deepEqual(cells[3], { ...overflowSlot(), mini: false });
});

test('members 4-7 fold into mini cells inside slot 3, the rest are hidden there', () => {
    const cells = groupCells(9, false);
    const slot = overflowSlot();
    assert.ok(cells.slice(0, 3).every((c) => !c.mini));
    for (const c of cells.slice(3, 7)) {
        assert.equal(c.mini, true);
        assert.ok(c.x >= slot.x && c.x + c.size <= slot.x + slot.size);
        assert.ok(c.y >= slot.y && c.y + c.size <= slot.y + slot.size);
    }
    assert.ok(cells.slice(7).every((c) => c.hidden && c.x === slot.x && c.y === slot.y));
});

test('expanded group lays every member out full-size, 3 per row', () => {
    const cells = groupCells(7, true);
    assert.ok(cells.every((c) => c.size === GROUP_CELL && !c.mini && !c.hidden));
    assert.equal(cells[3].x, cells[0].x);
    assert.ok(cells[3].y > cells[0].y);
    assert.ok(groupBox(7, true).height > groupBox(4, true).height);
});

test('memberCell offsets by the group position and ignores non-members', () => {
    const group = { x: 100, y: 50, expanded: false, members: [{ id: 'a' }, { id: 'b' }] };
    const [, b] = groupCells(2, false);
    assert.deepEqual(memberCell(group, 'b'), { x: 100 + b.x, y: 50 + b.y, size: b.size });
    assert.equal(memberCell(group, 'zzz'), null);
});
