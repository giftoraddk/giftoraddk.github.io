/**
 * services/schemas/roles-constant.js
 *
 * Shared role-preset data — the single source of truth for what Editor/Moderator/Admin
 * mean in terms of raw `{table}.{capability}` tokens. Pure data + tiny pure helpers only
 * (no Lit/UI deps), so both svc-roles.js (the role-editing UI) and any admin schema
 * (e.g. schemas/admin/users.js, for a read-only coarse-role display) can import it directly.
 */

// Rendering order (left → right in svc-roles.js's table header).
export const ORDER_PRESETS = ['editor', 'moderator', 'admin'];

/** Short Vietnamese description of each granular capability — see hook/AUTH_ROLES.rst for the full map. */
// export const CAP_DESCRIPTIONS = {
//     read:            'Xem danh sách và chi tiết nội dung',
//     create:          'Tạo bản ghi mới',
//     update:          'Chỉnh sửa bản ghi, không phân biệt người tạo',
//     save_draft:      'Lưu nháp, chưa gửi duyệt',
//     submit_review:   'Gửi bản ghi vào hàng chờ duyệt',
//     withdraw_review: 'Thu hồi bản ghi đã gửi duyệt (kéo về draft)',
//     upload_media:    'Upload hình ảnh / file đính kèm',
//     view_history:    'Xem lịch sử chỉnh sửa (revisions)',
//     comment:         'Viết bình luận nội bộ trong quá trình duyệt',
//     approve:         'Phê duyệt bản ghi',
//     reject:          'Từ chối bản ghi, trả lại cho người tạo',
//     request_edit:    'Yêu cầu chỉnh sửa lại, chưa reject hẳn',
//     publish:         'Xuất bản — hiển thị công khai',
//     unpublish:       'Gỡ xuất bản',
//     schedule:        'Đặt lịch tự động xuất bản',
//     unschedule:      'Hủy lịch xuất bản đã đặt',
//     manage_versions: 'Xem và khôi phục phiên bản cũ (revision history)',
//     delete:          'Xóa vĩnh viễn bản ghi',
//     import:          'Nhập dữ liệu (CSV import…)',
//     export:          'Xuất dữ liệu (CSV export…)',
//     manage_status:   'Thay đổi trạng thái bản ghi (status field)',
// };

/**
 * Bare (no table prefix) capability list per preset — e.g. 'read', not 'posts.read'.
 * `admin` is a strict superset of `editor` + `moderator` plus its own extra capabilities.
 * See CAP_DESCRIPTIONS above for what each capability actually grants.
 */
export const ROLE_PRESETS = {
    editor: [
        'read', 'create', 'update',
        'save_draft', 'submit_review', 'withdraw_review',
        'upload_media', 'view_history',
    ],
    moderator: [
        'read', 'view_history',
        'comment', 'approve', 'reject', 'request_edit',
        'publish', 'unpublish', 'schedule', 'unschedule', 'manage_versions',
    ],
    admin: [
        'read', 'create', 'update',
        'save_draft', 'submit_review', 'withdraw_review',
        'upload_media', 'view_history',
        'comment', 'approve', 'reject', 'request_edit',
        'publish', 'unpublish', 'schedule', 'unschedule', 'manage_versions',
        'delete', 'import', 'export', 'manage_status',
    ],
};

/**
 * `{table}.{capability}` tokens for a preset — e.g. roleCaps('editor', 'posts') → ['posts.read', ...].
 * `admin` is short-circuited to a single `{table}.admin` token instead of spelling out its whole
 * (strictly superset) capability list — same meaning, much shorter `roles` string. Every reader of
 * that string (svc-roles.js's own checked-state, admin/users.js's summary column, the Worker's
 * table-scoped auth check) treats a bare `.admin` suffix as satisfying every preset for that table.
 */
export const roleCaps = (preset, table) => preset === 'admin' ? [`${table}.admin`] : ROLE_PRESETS[preset].map(c => `${table}.${c}`);

/**
 * Auxiliary admin tools tied to a primary table — toggling a preset for the KEY table in
 * svc-roles.js mirrors the same preset onto each bundled table too, so a user granted product
 * management access gets Customers (sale leads)/Report (revenue dashboard)/Talks (svc-talk.js's
 * boss<->AI-division tool)/Knowledge (know+rel, /admin/knowledge) opened by default instead of
 * needing a separate manual grant per table. One-way only (bundled tables can still be toggled
 * independently in the UI — that does not feed back into `products`). `talks`/`know`/`rel` are
 * additionally recognized server-side by llm-worker's tablePolicy.ts (`tableScoped: true`) — see
 * that file's comment for why a bundled Firestore-side capability token can unlock a D1 table the
 * Worker owns. `divisions` is deliberately NOT bundled here — always Super Admin only, see
 * LayoutAdmin.astro's "Divisions" nav item.
 */
export const TABLE_BUNDLES = {
    products: ['customers', 'report', 'talks', 'know', 'rel'],
};

/**
 * Tables permanently removed from the system — 'mind' (old Firestore DB_LLM knowledge base,
 * replaced by D1 'know'/'rel'). Explicit blocklist rather than inferring "unknown" from whichever
 * table list svc-roles.js's `tables` prop happens to hold at the moment: that prop can be stale
 * (e.g. `<svc-roles transition:persist>` keeps its old attribute value across an Astro ClientRouter
 * soft-nav from before this table was retired), so a leftover `mind.*` capability token would never
 * get pruned until a hard reload. Listing it here strips it unconditionally, independent of prop
 * freshness — see svc-roles.js's _comPruneStaleTables().
 */
export const RETIRED_TABLES = ['mind'];
