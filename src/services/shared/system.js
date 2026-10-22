// src/services/shared/system.js
//
// AI-System — platform tools, not assistants: Intelligent Governance (pages/admin/[table].astro opens these same panels), the Finance Report, Permissions
// (<svc-roles>, hook/AUTH_V2.rst), and one <svc-records> node per managed table (SYSTEM_TABLES). Add a table = add a line, or pass your own `tables`.
import productsSchema from '@/services/schemas/admin/products.js';
import postsSchema from '@/services/schemas/admin/posts.js';
import divisionsSchema from '@/services/schemas/admin/divisions.js';
import knowSchema from '@/services/schemas/admin/know.js';
import usersSchema from '@/services/schemas/admin/users.js';
import customersSchema from '@/services/schemas/admin/customers.js';

const system = () => import('@/packages/auth/svc-records.js');

// src/packages/node/preset/shared.js
//
// What every preset builds its nodes with. A node is plain config (service/models.js SvcNode); these only save typing.
// Any text a node shows may be { vi, en } — preset/mount.js says it in the page's language (tool/lingo.js).

// Who opens a panel — a node's `roles` (tool/access.js): signed-out visitors and plain 'user' accounts get a notice in
// the panel instead. 'admin' = Super Admin; a table name = any `{table}.*` role (svc-roles.js grants them); '*' = anyone
// signed in.
export const SIGNED_IN = ['*'];
export const ADMIN = ['admin'];

/**
 * A component panel. `load` imports the module that registers `tagName` — on the panel's first open, not with the
 * page (overlay-component.js). The page adds `theme` / `lang` to `properties` (preset/index.js).
 */
export const component = (tagName, load, properties = {}, extra = {}) => ({ type: 'component', tagName, load, properties, ...extra });

/** A site framed in the panel — only for sites that allow it; the sandbox keeps it off this page's origin. */
export const site = (url, title) => ({
    type: 'iframe', url, title, sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox',
});

/** A panel that only says what to ask — for services whose site refuses to be framed. `title` / `example`: { vi, en }. */
export const askHere = (title, example) => ({
    type: 'content', title, content: {
        vi: `Hỏi thanh AI bên dưới, ví dụ “${example.vi}” — kết quả hiện ngay trong panel này.`,
        en: `Ask the AI bar below, e.g. “${example.en}” — the answer shows right in this panel.`,
    },
});

/** A public MCP server, reached through the llm Worker's relay (llm/worker/src/mcpRelay.ts) — their CORS won't let
 *  a browser call them directly. */
export const relay = (server) => `${import.meta.env.PUBLIC_LLM_URL}/v1/mcp/${server}`;

/** Places `nodes` in one group: the first one carries the tile's place / title / tints, the rest ride along. */
export const inGroup = (type, { x = 0, y = 0, title, tints } = {}, nodes) => nodes.map((n, i) => ({
    ...n,
    x: i ? 0 : x,
    y: i ? 0 : y,
    group: i ? { type } : { type, ...(title && { title }), ...(tints && { tints }) },
}));


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

/** @returns {import('./index.js').NodePreset} */
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
