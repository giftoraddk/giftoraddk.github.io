// src/packages/auth/service/profile.js
//
// Self-service account ops behind <svc-profile> — profile row edits go through auth's
// /v1/data/profiles/:id (self-editable fields only: display_name/avatar/email/meta…, see
// worker/src/profiles.ts), credentials (email/password/linked identities/sessions) through Supabase
// Auth directly. Every write refreshes the cached session profile (auth.set) so a reload shows it.
//
// The worker upserts with `merge-duplicates` — column-level merge, so a `meta` patch replaces the
// WHOLE jsonb column: always send the merged object (see _patchMeta), never a partial one.
import requester from '@/services/core/requester.js'
import { supabase } from '@/services/shared/supabase.js'
import { uploadImageBlob } from '@/packages/adopted/service/photor.js'
import { auth } from './service.js'

const ACCOUNT_API = import.meta.env.PUBLIC_AUTH_URL
const DEVICE_KEY = 'auth_device_id'
const DEVICES_MAX = 10
const DEVICE_TOUCH_MS = 60 * 60 * 1000 // re-stamp lastSeen at most hourly — every panel open would otherwise write
const AVATAR_PX = 256

export const PASSWORD_MIN = 6 // Supabase Auth's default minimum — same as svc-auth.js

/** Fresh access token — the cached one from login (auth_token) may have expired since. */
async function _token() {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('Session expired')
    return token
}

/** The signed-in user's row as the Worker has it now — the session cache may be older (another device saved
 *  since, or a column added after they signed in). Mirrored into the cache; falls back to `user` offline. */
export async function fetchProfile(user) {
    const token = await _token()
    const res = await requester({ headers: { Authorization: `Bearer ${token}` } }).get(`${ACCOUNT_API}/v1/data/profiles/${user.id}`)
    if (!res.ok || !res.data) return user
    await auth.set(res.data)
    return res.data
}

/** PATCH own profile row, then mirror the result into the session cache. Returns the merged user. */
export async function saveProfile(user, patch) {
    const token = await _token()
    const res = await requester({ headers: { Authorization: `Bearer ${token}` } })
        .patch(`${ACCOUNT_API}/v1/data/profiles/${user.id}`, patch)
    if (!res.ok) throw new Error(res.message)
    const next = { ...user, ...patch }
    await auth.set(next)
    return next
}

const _patchMeta = (user, metaPatch) => saveProfile(user, { meta: { ...(user.meta ?? {}), ...metaPatch } })

export const saveSettings = (user, settings) => _patchMeta(user, { settings: { ...(user.meta?.settings ?? {}), ...settings } })

// ── Avatar ────────────────────────────────────────────────────────────────────

/** Center-crops + downsizes to a square JPEG before upload — a raw phone photo is several MB. */
async function _squareBlob(file) {
    const bmp = await createImageBitmap(file)
    const side = Math.min(bmp.width, bmp.height)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = AVATAR_PX
    canvas.getContext('2d').drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, AVATAR_PX, AVATAR_PX)
    bmp.close()
    return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', 0.9))
}

/** Uploads the picked image, returns its hosted URL — the caller saves it into `avatar`. */
export async function uploadAvatar(file) {
    return uploadImageBlob(await _squareBlob(file))
}

// ── Credentials (Supabase Auth) ──────────────────────────────────────────────

/** Supabase mails a confirmation link; the address only changes once it's clicked. */
export async function changeEmail(email) {
    const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: window.location.href })
    if (error) throw error
}

export async function changePassword(password) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
}

export async function sendPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.href })
    if (error) throw error
}

// ── Linked accounts ──────────────────────────────────────────────────────────

export async function listIdentities() {
    const { data, error } = await supabase.auth.getUserIdentities()
    if (error) throw error
    return data?.identities ?? []
}

/** Full-page redirect, like svc-auth's Google sign-in. Needs "manual linking" enabled in Supabase Auth. */
export async function linkProvider(provider) {
    const { error } = await supabase.auth.linkIdentity({ provider, options: { redirectTo: window.location.href } })
    if (error) throw error
}

// ── Devices ──────────────────────────────────────────────────────────────────
// Supabase exposes no session list to the client, so devices are self-reported: each browser keeps a
// random id in localStorage and stamps itself into profile meta.devices when the panel opens.

function _deviceId() {
    try {
        let id = localStorage.getItem(DEVICE_KEY)
        if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id) }
        return id
    } catch {
        return 'session' // storage blocked — still lists this device, just not stable across visits
    }
}

export const currentDeviceId = _deviceId

function _deviceName() {
    const ua = navigator.userAgent
    const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome'
        : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
    const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS'
        : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : ''
    const mobile = /Mobi|iPhone|Android/.test(ua)
    return { name: os ? `${browser} · ${os}` : browser, mobile }
}

/** Registers/refreshes this browser in meta.devices. Returns the (possibly unchanged) user. */
export async function touchDevice(user) {
    const id = _deviceId()
    const devices = Array.isArray(user.meta?.devices) ? user.meta.devices : []
    const mine = devices.find((d) => d.id === id)
    if (mine && Date.now() - (mine.lastSeen ?? 0) < DEVICE_TOUCH_MS) return user
    const entry = { id, ..._deviceName(), lastSeen: Date.now() }
    const next = [entry, ...devices.filter((d) => d.id !== id)].slice(0, DEVICES_MAX)
    return _patchMeta(user, { devices: next })
}

/** Revokes every other session (Supabase `scope: 'others'`), then keeps only this device listed. */
export async function signOutOtherDevices(user) {
    const { error } = await supabase.auth.signOut({ scope: 'others' })
    if (error) throw error
    const id = _deviceId()
    return _patchMeta(user, { devices: (user.meta?.devices ?? []).filter((d) => d.id === id) })
}
