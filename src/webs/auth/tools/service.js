import Storager from '@/services/storager.js';

const USER_KEY  = 'db_auth';
const TOKEN_KEY = 'db_token';
const DAY_1     = 24 * 60 * 60 * 1000;

/**
 * Parse a pipe-separated roles string ("posts.read|admin") into a usable shape — nhận cả user
 * object (đọc `.roles`) lẫn raw roles string trực tiếp (vd 1 row user khác đang duyệt trong
 * danh sách, không phải session hiện tại) — dùng chung bởi mọi nơi cần check quyền mà không
 * muốn await lại auth.get(), xem svc-logged.js/svc-login.js/svc-roles.js.
 */
export function parseRoles(user) {
    const rolesStr = typeof user === 'string' ? user : user?.roles;
    const roles = (rolesStr || '').split('|').filter(Boolean);
    return { roles, isAdmin: roles.includes('admin'), hasAnyPerm: roles.some(r => r.includes('.')) };
}

/**
 * True if `roles[]` grants `require` — exact match hoặc làm namespace prefix ("posts.read" thoả
 * "posts"). `require` rỗng = mục admin-only, luôn false ở đây (caller tự check isAdmin riêng).
 * Dùng chung bởi svc-logged-nav.js (lọc menu) và svc-logged.js (guard trang admin-only).
 */
export function hasAccess(roles, require) {
    if (!require) return false;
    return roles.some(r => r === require || r.startsWith(require + '.'));
}

export const auth = {
    async get() {
        return Storager.get(USER_KEY, null);
    },

    async set(user, token) {
        await Storager.set(USER_KEY, user, DAY_1);
        if (token) await Storager.set(TOKEN_KEY, token, DAY_1);
    },

    async clear() {
        await Storager.remove(USER_KEY);
        await Storager.remove(TOKEN_KEY);
    },

    async isLoggedIn() { return !!(await this.get()); },

    async isAdmin() {
        const u = await this.get();
        return !!(u?.status === 'active' && parseRoles(u).isAdmin);
    },

    async hasRole(role) {
        const u = await this.get();
        return !!(u?.status === 'active' && parseRoles(u).roles.includes(role));
    },
};
