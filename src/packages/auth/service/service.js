// src/packages/auth/service/service.js
//
// Session cache — ported from astro-micro's src/webs/auth/tools/service.js's `auth` object, logic
// unchanged. astro-micro used its own Storager (localforage wrapper with TTL); this repo's
// services/core/storager.js's cacheGet/cacheSet is the same idea but has no TTL/expiry (see
// svc-aide.js's port header for the identical gap/reasoning) — an expired-vs-not session here isn't
// data that must self-expire client-side anyway, since `auth.clear()` also signs out of Supabase
// itself, and a stale cached profile is harmless (re-fetched on next real read).
import { cacheGet, cacheSet } from '@/services/core/storager.js'
import { supabase } from '@/services/shared/supabase.js'
import { parseRoles } from '../tool/roles.js'

const USER_KEY = 'auth_user'
const TOKEN_KEY = 'auth_token'

export const auth = {
    async get() {
        return cacheGet(USER_KEY)
    },

    async set(user, token) {
        await cacheSet(USER_KEY, user)
        if (token) await cacheSet(TOKEN_KEY, token)
    },

    async clear() {
        await cacheSet(USER_KEY, null)
        await cacheSet(TOKEN_KEY, null)
        // Clearing the local cache alone isn't enough — the real Supabase session still lives in
        // localStorage (supabase-js persists it itself), so a subsequent getSession() would still
        // see it as valid and silently re-authenticate, making "sign out" look like it did nothing.
        try { await supabase.auth.signOut() } catch { /* best-effort — local cache is cleared regardless */ }
    },

    async isLoggedIn() { return !!(await this.get()) },

    async isAdmin() {
        const u = await this.get()
        return !!(u?.status === 'active' && parseRoles(u).isAdmin)
    },

    async hasRole(role) {
        const u = await this.get()
        return !!(u?.status === 'active' && parseRoles(u).roles.includes(role))
    },
}
