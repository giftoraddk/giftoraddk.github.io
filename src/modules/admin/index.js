// Khu quản trị /admin/* — MỘT trang (pages/admin/[table].astro) cho mọi bảng:
// danh sách trang + menu (thanh đáy mobile, menu trái desktop — layouts/CoreMobile.astro `aside`) + quyền từng trang
// (trang tự kiểm khi <svc-account> báo user). Panel của mỗi trang CHÍNH LÀ panel của node trong group "Hệ thống AI" (services/presets/node/system.js:
// SYSTEM_TABLES / tableNode, rolesNode, financeNode) — trang mount `overlay` của node bằng <svc-overlay> như
// <svc-popover> của svc-node, nên sửa panel ở 1 chỗ là cả canvas lẫn /admin cùng đổi.
//   PAGES[i] = { slug, require, title, desc, icon, panels: [overlay…] }   — text { vi, en }
//   require  = token quyền (tool/roles.js hasAccess: 'products' khớp 'products.*'); null = chỉ Super Admin.
// Thêm 1 trang = thêm 1 dòng PAGES. Bảng chỉ có ở /admin (không có node trên canvas) khai trong ADMIN_TABLES, cùng định
// dạng SYSTEM_TABLES. Quyền ghi vẫn do Worker chặn từng request — menu/guard ở đây chỉ để giao diện gọn.
import { component } from '@/services/presets/node/shared.js';
import { SYSTEM_TABLES, tableNode, rolesNode, financeNode } from '@/services/presets/node/system.js';
import ordersSchema from '@/services/presets/admin/orders.js';
import inventorySchema from '@/services/presets/admin/inventory.js';
import staffSchema from '@/services/presets/admin/staff.js';
import relSchema from '@/services/presets/admin/rel.js';
import promosSchema from '@/services/presets/admin/promos.js';
import { site } from '@/services/tools/site';

export const ROOT = '/admin/';
// Cặp màu của group "Hệ thống AI" (services/presets/node/system.js) — quầng sáng trang + menu.
export const TINTS = ['info', 'accent'];

export const ADMIN_TABLES = [
    {
        table: 'orders', initials: 'OR', title: { vi: 'Đơn hàng', en: 'Orders' }, tooltip: { vi: 'Quản lý đơn hàng', en: 'Manage orders' }, icon: 'ri:file-list-3-line',
        schema: ordersSchema, props: {},
    },
    {
        table: 'inventory', initials: 'IN', title: { vi: 'Kho hàng', en: 'Inventory' }, tooltip: { vi: 'Quản lý kho hàng', en: 'Manage inventory' }, icon: 'ri:archive-stack-line',
        schema: inventorySchema, props: { orderable: true },
    },
    {
        table: 'staff', initials: 'ST', title: { vi: 'Nhân viên', en: 'Staff' }, tooltip: { vi: 'Quản lý nhân viên', en: 'Manage staff' }, icon: 'ri:team-line',
        schema: staffSchema, props: { orderable: true },
    },
    {
        // Mã khuyến mãi — Worker kiểm + trừ tiền lúc tạo hoá đơn (auth/worker invoices.ts); giỏ hàng đọc danh sách công khai
        table: 'promos', initials: 'PM', title: { vi: 'Khuyến mãi', en: 'Promos' }, tooltip: { vi: 'Quản lý mã khuyến mãi', en: 'Manage promo codes' }, icon: 'ri:coupon-3-line',
        schema: promosSchema, props: {},
    },
    {
        table: 'rel', initials: 'RE', title: { vi: 'Quan hệ', en: 'Relations' }, tooltip: { vi: 'Quan hệ tri thức (rel)', en: 'Knowledge relations (rel)' }, icon: 'ri:links-line',
        schema: relSchema, props: { server: 'DB_LLMD1', revalidate: true },
    },
];

const TABLES = Object.fromEntries([...SYSTEM_TABLES, ...ADMIN_TABLES].map((t) => [t.id ?? t.table, t]));

/** Trang của 1 bảng: tiêu đề/mô tả/icon lấy từ chính dòng bảng, panel = overlay của tableNode. */
const tablePage = (id, extra = {}) => {
    const t = TABLES[id];
    return { slug: id, require: id, title: t.title, desc: t.tooltip, icon: t.icon, panels: [tableNode(t).overlay], ...extra };
};

// Nạp sản phẩm vào `know` (+ index + `rel`, Worker /v1/hubs/items) — phát 'learn:done', trang tải lại các lưới cùng trang
// (pages/admin/[table].astro). `site` = site.domain → kho riêng '@<host>' của site — đúng kho <svc-aide site> của trang chủ
// đọc (components/Gift/Aide.astro) — kèm link trang sản phẩm trong từng mục.
const learnPanel = component('svc-learn', () => import('@/packages/llm/svc-learn.js'), { ui: 'pastel', site: site.domain });

export const PAGES = [
    tablePage('users'),
    tablePage('products'),
    tablePage('orders'),
    tablePage('inventory'),
    tablePage('staff'),
    tablePage('posts'),
    tablePage('divisions'),
    tablePage('know', { slug: 'knowledge', panels: [learnPanel, tableNode(TABLES.know).overlay, tableNode(TABLES.rel).overlay] }),
    tablePage('customers'),
    tablePage('promos'),
    { slug: 'report', require: 'report', title: financeNode.title, desc: financeNode.tooltip, icon: 'ri:line-chart-line', panels: [financeNode.overlay] },
    { slug: 'roles', require: null, title: rolesNode.title, desc: rolesNode.tooltip, icon: 'ri:shield-user-line', panels: [rolesNode.overlay] },
];

export const pageOf = (slug) => PAGES.find((p) => p.slug === slug) ?? null;
export const pagePath = (slug) => `${ROOT}${slug}/`;

// Menu cho layouts/CoreMobile.astro (Nav/Mobile.astro + Nav/Aside.astro) — trang ẩn mục không có quyền ở trình duyệt.
export const menuItems = PAGES.map((p) => ({ text: p.title, href: pagePath(p.slug), iconMobile: p.icon }));
