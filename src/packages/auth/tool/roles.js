// src/packages/auth/tool/roles.js
//
// Parses a pipe-separated roles string ("posts.read|admin") — accepts either a user object (reads
// `.roles`) or a raw roles string directly (e.g. a different row being reviewed, not the current
// session). Ported from astro-micro's src/webs/auth/tools/service.js — logic unchanged.
export function parseRoles(user) {
    const rolesStr = typeof user === 'string' ? user : user?.roles
    const roles = (rolesStr || '').split('|').filter(Boolean)
    return { roles, isAdmin: roles.includes('admin'), hasAnyPerm: roles.some(r => r.includes('.')) }
}

// True if `roles[]` grants `require` — exact match or as a namespace prefix ("posts.read" satisfies
// "posts"). `require` empty means admin-only — always false here, caller checks isAdmin separately.
export function hasAccess(roles, require) {
    if (!require) return false
    return roles.some(r => r === require || r.startsWith(require + '.'))
}

// ── Authorization v2 — Resource + Access Level + Scope (hook/AUTH_V2.rst) ──
//
// Token trong `profiles.roles`:  admin | {resource}.{LEVEL}[~{scope}] | {resource}.{capability}[~{scope}]
//   LEVEL viết HOA (posts.EDIT~own), capability viết thường (posts.delete), thiếu ~scope = ~all.
//   Token cũ (posts.read, posts.admin) vẫn hợp lệ — `{resource}.admin` = `{resource}.MANAGE`.
// Mọi token vẫn mở đầu bằng `{resource}.` → hasAccess() ở trên + prefix check của worker không đổi.

const VIEW    = ['read', 'list']
const EDIT    = [...VIEW, 'create', 'update', 'save_draft', 'submit_review', 'withdraw_review', 'upload_media', 'view_history']
const REVIEW  = [...VIEW, 'view_history', 'comment', 'approve', 'reject', 'request_edit', 'manage_versions']
const PUBLISH = [...VIEW, 'publish', 'unpublish', 'schedule', 'unschedule']
const MANAGE  = [...new Set([...EDIT, ...REVIEW, ...PUBLISH, 'delete', 'import', 'export', 'manage_status', 'issue', 'cancel'])]

export const LEVELS = { VIEW, EDIT, REVIEW, PUBLISH, MANAGE }
export const LEVEL_ORDER = ['VIEW', 'EDIT', 'REVIEW', 'PUBLISH', 'MANAGE']

// 'team' (AUTH_V2 §5) chưa có dữ liệu team trên profiles/records → chưa đưa ra UI
export const SCOPES = ['own', 'all']

// Bảng phân quyền riêng lẻ được — khớp menu /admin (modules/admin PAGES, trừ divisions/know: chỉ cấp kèm bundle hoặc Super Admin)
// + 2 bảng không có trang /admin riêng: `invoices` (hoá đơn — `invoices.*` xem được mọi hoá đơn, auth
// data.ts; node Finance Report) và `billing` (gói đã bán — svc-purchase-manager / auth billing.ts)
export const ROLE_TABLES = ['users', 'products', 'orders', 'invoices', 'inventory', 'staff', 'posts', 'customers', 'promos', 'report', 'billing', 'radar']

// Cấp quyền cho bảng chính thì áp luôn cho bảng phụ trợ (1 chiều) — `divisions` cố ý không bundle (chỉ Super Admin)
export const TABLE_BUNDLES = {
    products: ['customers', 'report', 'talks', 'know', 'rel'],
}

/** 'posts.EDIT~own' → { resource: 'posts', name: 'EDIT', caps: LEVELS.EDIT, scope: 'own' } */
export function parseGrants(user) {
    const { roles, isAdmin } = parseRoles(user)
    const grants = []
    for (const t of roles) {
        const dot = t.indexOf('.')
        if (dot < 0) continue // 'admin', 'user'
        const [name, scope = 'all'] = t.slice(dot + 1).split('~')
        const caps = LEVELS[name] ?? (name === 'admin' ? MANAGE : [name])
        grants.push({ resource: t.slice(0, dot), name, caps, scope })
    }
    return { isAdmin, grants }
}

const covers = (g, resource) => g.resource === resource || !!TABLE_BUNDLES[g.resource]?.includes(resource)

const inScope = (user, scope, record) => {
    if (scope === 'all' || !record) return true // create / list: không có record — list tự lọc theo scope
    if (scope === 'own') return !!user?.id && record.user_id === user.id
    return false
}

/**
 * Level + Scope (+ bundle). Super Admin qua hết. Workflow / Policy (AUTH_V2 §6–7) chưa gắn ở đây.
 * Không có `record` → chỉ hỏi "có quyền này trên bảng không" (gating nút toolbar).
 */
export function can(user, resource, action, record = null) {
    const { isAdmin, grants } = parseGrants(user)
    if (isAdmin) return true
    return grants.some(g => covers(g, resource) && g.caps.includes(action) && inScope(user, g.scope, record))
}

// Bộ capability của preset cũ (Editor/Moderator) — chỉ để nhận diện token legacy ra LEVEL
const LEGACY_EDIT    = ['read', 'create', 'update', 'save_draft', 'submit_review', 'withdraw_review', 'upload_media', 'view_history']
const LEGACY_REVIEW  = ['read', 'view_history', 'comment', 'approve', 'reject', 'request_edit', 'manage_versions']
const LEGACY_PUBLISH = ['read', 'publish', 'unpublish', 'schedule', 'unschedule']
const LEGACY_SETS = {
    MANAGE:  [...LEGACY_EDIT, ...LEGACY_REVIEW, ...LEGACY_PUBLISH, 'delete', 'import', 'export', 'manage_status'],
    EDIT:    LEGACY_EDIT,
    REVIEW:  LEGACY_REVIEW,
    PUBLISH: LEGACY_PUBLISH,
    VIEW:    ['read'],
}

/**
 * Quyền của 1 user trên đúng 1 bảng, dạng UI đọc được: { levels: Set<LEVEL>, scope, custom: [capability lẻ] }.
 * Token legacy được gom về LEVEL theo AUTH_V2 §10 (đủ bộ editor cũ → EDIT…); phần lẻ còn lại giữ ở `custom`.
 */
export function tableAccess(rolesStr, table) {
    const { grants } = parseGrants(rolesStr)
    const own = grants.filter(g => g.resource === table)
    const levels = new Set()
    const caps = new Set()
    let scope = ''
    for (const g of own) {
        if (LEVELS[g.name] || g.name === 'admin') levels.add(LEVELS[g.name] ? g.name : 'MANAGE')
        else caps.add(g.name)
        if (!scope || g.scope !== 'all') scope = g.scope
    }
    for (const [level, set] of Object.entries(LEGACY_SETS)) {
        if (set.every(c => caps.has(c))) levels.add(level)
    }
    const covered = new Set([...levels].flatMap(l => LEVELS[l]))
    return { levels, scope: scope || 'all', custom: [...caps].filter(c => !covered.has(c)) }
}

/** Chỉ các mức không bị mức khác bao: MANAGE bao tất cả, mọi mức bao VIEW. */
export function topLevels(levels) {
    if (levels.has('MANAGE')) return ['MANAGE']
    const others = [...levels].some(l => l !== 'VIEW')
    return LEVEL_ORDER.filter(l => levels.has(l) && (l !== 'VIEW' || !others))
}

/**
 * Mọi bảng user có quyền, mỗi bảng 1 dòng { table, levels: topLevels, scope, custom, with: [bảng bundle] } —
 * bảng bundle (TABLE_BUNDLES) có quyền y hệt bảng chính được gộp vào `with` của bảng chính.
 */
export function accessRows(user) {
    const tables = [...new Set(parseRoles(user).roles.filter(r => r.includes('.')).map(r => r.slice(0, r.indexOf('.'))))]
    const rows = tables.map(table => {
        const a = tableAccess(user, table)
        return { table, levels: topLevels(a.levels), scope: a.scope, custom: a.custom, with: [] }
    })
    const key = r => `${r.levels.join('+')}~${r.scope}~${r.custom.join('+')}`
    return rows.filter(r => {
        const parent = rows.find(p => TABLE_BUNDLES[p.table]?.includes(r.table))
        if (!parent || key(parent) !== key(r)) return true
        parent.with.push(r.table)
        return false
    })
}

// Nhãn dùng chung cho svc-roles (chỉnh) + svc-profile / schema users (hiển thị)
export const ACCESS_TXT = {
    vi: {
        levels: { VIEW: 'Xem', EDIT: 'Biên tập', REVIEW: 'Duyệt', PUBLISH: 'Xuất bản', MANAGE: 'Quản trị' },
        scopes: { own: 'Của mình', all: 'Tất cả' },
        custom: 'quyền lẻ',
    },
    en: {
        levels: { VIEW: 'View', EDIT: 'Edit', REVIEW: 'Review', PUBLISH: 'Publish', MANAGE: 'Manage' },
        scopes: { own: 'Own', all: 'All' },
        custom: 'custom',
    },
}

/** Ghi lại quyền của 1 bảng (+ bảng bundle) vào roles string — token của bảng khác giữ nguyên. */
export function withTableAccess(rolesStr, table, { levels, scope = 'all', custom = [] }) {
    const tables = [table, ...(TABLE_BUNDLES[table] ?? [])]
    const sfx = scope === 'all' ? '' : `~${scope}`
    const lv = topLevels(levels)
    const covered = new Set(lv.flatMap(l => LEVELS[l]))
    const extra = custom.filter(c => !covered.has(c))
    const keep = parseRoles(rolesStr).roles.filter(r => !tables.some(t => r.startsWith(`${t}.`)))
    const next = tables.flatMap(t => [...lv.map(l => `${t}.${l}${sfx}`), ...extra.map(c => `${t}.${c}`)])
    return [...keep, ...next].join('|')
}
