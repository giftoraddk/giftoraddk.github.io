// src/packages/node/preset/builder.js
//
// 'builder' — Node Builder, pinned to a corner: every preset node to turn on or off for yourself, and your own copies
// of them with the fields you changed — kept in your account (profiles.notes). preset/mount.js puts them on the
// canvas; <svc-node-builder> edits them. `pinned`: a user can't take it off their canvas.
import { SIGNED_IN, component } from './shared.js';

const load = () => import('../svc-node-builder.js');

/** @returns {import('./index.js').NodePreset} */
export function builderPreset({ x = '1%', y = '1%' } = {}) {
    return {
        id: 'builder',
        title: { vi: 'Node Builder', en: 'Node Builder' },
        icon: 'ri:apps-2-ai-line',
        pinned: true,
        nodes: ({ flow }) => [{
            id: 'builder', moving: false, arrange: false, x, y,
            icon: 'ri:apps-2-ai-line',
            title: 'Node Builder',
            tooltip: { vi: 'Tạo node của bạn', en: 'Build your own nodes' },
            description: {
                vi: 'Thêm node có sẵn lên canvas hoặc tạo node riêng: chọn một node làm mẫu, sửa các field của nó (tên, mô tả, icon, nhóm, vị trí, cấu hình panel) rồi thêm — lưu trong tài khoản',
                en: 'Put ready-made nodes on the canvas or make your own: pick a node as the template, change its fields (name, description, icon, group, position, panel settings) and add it — kept in your account',
            },
            roles: SIGNED_IN,
            agent: true, // <svc-ask> may fill the form for you
            overlay: component('svc-node-builder', load, { for: flow.id }, { title: 'Node Builder' }),
        }],
    };
}
