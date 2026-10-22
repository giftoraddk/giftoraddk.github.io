// src/services/presets/node/system.js
//
// AI-System — platform tools, not assistants: Intelligent Governance (pages/admin/[table].astro opens these same panels), the Finance Report, Permissions
// (<svc-roles>, hook/AUTH_V2.rst), and one <svc-records> node per managed table (SYSTEM_TABLES). Add a table = add a line, or pass your own `tables`.
import { ADMIN, component, inGroup } from './shared.js';
import productsSchema from '@/services/presets/admin/products.js';
import postsSchema from '@/services/presets/admin/posts.js';
import divisionsSchema from '@/services/presets/admin/divisions.js';
import knowSchema from '@/services/presets/admin/know.js';
import usersSchema from '@/services/presets/admin/users.js';
import customersSchema from '@/services/presets/admin/customers.js';

const system = () => import('@/packages/auth/svc-records.js');

/**
 * <svc-records> gets the table + its schema factory ((lang) => columns), plus the same switches its admin page sets
 * (the /admin page of that table, modules/admin). `id` names the node when it differs from the table (users → the `profiles` table). `title` /
 * `tooltip` are { vi, en } — the tooltip also heads the panel (`heading`), said in the page's language like the rest.
 */
export const SYSTEM_TABLES = [
    {
        table: 'products', initials: 'PR', title: { vi: 'Sản phẩm', en: 'Products' }, tooltip: { vi: 'Quản lý sản phẩm', en: 'Manage products' }, icon: 'ri:shopping-bag-3-line',
        // fnDivision: phòng ban tạo bản ghi của bảng (nút "Tạo bằng AI" trên form Thêm mới — svc-records)
        schema: productsSchema, props: { orderable: true, revalidate: true, btnDeleteAll: true, fnDivision: 'ecommerce.product' },
    },
    {
        table: 'posts', initials: 'PO', title: { vi: 'Bài viết', en: 'Posts' }, tooltip: { vi: 'Quản lý bài viết', en: 'Manage posts' }, icon: 'ri:article-line',
        schema: postsSchema, props: { orderable: true, revalidate: true, fnDivision: 'ecommerce.marketing' },
    },
    {
        table: 'divisions', initials: 'DV', title: { vi: 'Phòng ban', en: 'Divisions' }, tooltip: { vi: 'Quản lý phòng ban', en: 'Manage divisions' }, icon: 'ri:building-2-line',
        schema: divisionsSchema, props: { server: 'DB_LLMD1', orderable: true },
    },
    {
        table: 'know', initials: 'KN', title: { vi: 'Tri thức', en: 'Knowledge' }, tooltip: { vi: 'Quản lý tri thức', en: 'Manage knowledge' }, icon: 'ri:book-open-line',
        schema: knowSchema, props: { server: 'DB_LLMD1', revalidate: true },
    },
    {
        id: 'users', table: 'profiles', initials: 'US', title: { vi: 'Người dùng', en: 'Users' }, tooltip: { vi: 'Quản lý người dùng', en: 'Manage users' }, icon: 'ri:user-settings-line',
        schema: usersSchema, props: { server: 'DB_ACC', orderable: true },
    },
    {
        table: 'customers', initials: 'CU', title: { vi: 'Khách hàng', en: 'Customers' }, tooltip: { vi: 'Quản lý khách hàng', en: 'Manage customers' }, icon: 'ri:contacts-book-2-line',
        schema: customersSchema, props: {},
    },
];

// The table's icon heads its panel; the node keeps the initials (the tile reads better with letters in a group).
export const tableNode = (t) => ({
    id: `system-${t.id ?? t.table}`,
    initials: t.initials,
    title: t.title,
    tooltip: t.tooltip,
    roles: ['admin', t.table],
    agent: true, // <svc-ask> may operate the table (add / edit / save rows…) — deleting still asks first
    overlay: component('svc-records', system, { dataTable: t.table, schema: t.schema, heading: t.tooltip, icon: t.icon, ...t.props, ui: 'pastel' }),
});

// The group's other two nodes — exported so the /admin pages (modules/admin) open the very same panels.
export const rolesNode = {
    id: 'roles', initials: 'RO',
    title: { vi: 'Phân quyền', en: 'Permissions' },
    tooltip: { vi: 'Phân quyền người dùng theo bảng', en: 'Per-table user permissions' },
    roles: ADMIN, // only a Super Admin may write `profiles.roles` (auth profiles.ts)
    overlay: component('svc-roles', () => import('@/packages/auth/svc-roles.js'), { ui: 'pastel' }),
};

export const financeNode = {
    id: 'finance', initials: 'FR',
    title: { vi: 'Báo cáo tài chính', en: 'Finance Report' },
    tooltip: { vi: 'Doanh thu và hoá đơn', en: 'Revenue and invoices' },
    roles: ['admin', 'invoices', 'report'], // every invoice — a plain account sees only its own
    overlay: component('svc-finance-report', () => import('@/packages/llm/svc-finance-report.js'), { ui: 'pastel' }),
};

/** @returns {import('@/packages/node/preset/index.js').NodePreset} */
export function systemPreset({ x = 120, y = 640, tables = SYSTEM_TABLES } = {}) {
    return {
        id: 'system',
        title: { vi: 'Hệ thống', en: 'System' },
        icon: 'ri:settings-3-line',
        nodes: () => inGroup('system', { x, y, title: { vi: 'Hệ thống AI', en: 'AI-System' }, tints: ['info', 'accent'] }, [
            rolesNode,
            financeNode,
            ...tables.map(tableNode),
        ]),
    };
}
