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

/** Short Vietnamese description of each granular capability — see docs/AUTH_ROLES.rst for the full map. */
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

/** `{table}.{capability}` tokens for a preset — e.g. roleCaps('editor', 'posts') → ['posts.read', ...]. */
export const roleCaps = (preset, table) => ROLE_PRESETS[preset].map(c => `${table}.${c}`);
