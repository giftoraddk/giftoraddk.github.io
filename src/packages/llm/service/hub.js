// src/packages/llm/service/hub.js
//
// Client của llm /v1/hubs/* (worker/src/hubs.ts) — hub = 1 khách đã mua gói: MCP token + kiến
// thức riêng (know.owner = hub id = user id). requester() tự gắn JWT Supabase cho PUBLIC_LLM_URL.
//
// Import file này là đủ để tự cấp token sau khi mua: nó nghe `purchase-complete` (svc-purchase /
// svc-purchase-manager phát lên window) rồi gọi `issue()` — worker tự kiểm tra gói với auth,
// tạo hub và email MCP_TOKEN (Resend). Domain purchase không import gì của llm (xem hook/PURCHASE.rst).
//
// Owner của kho kiến thức (know.owner) mà svc-aide / svc-division / svc-talk dùng — resolveOwner():
//   1. prop `owner` gán cứng (vd <svc-aide owner="…"> nhúng trên site khách, id này có trong email mua gói)
//   2. `site` (svc-aide site="…" không owner — trợ lý riêng của 1 site nền tảng, vd trang chủ) → '@<host>' (siteOwner):
//      kho riêng của site đó — kiến thức, persona, face — không bao giờ là hub của người đang xem
//   3. không gán → hub của tài khoản đang đăng nhập (hub id = user id), nếu người đó đã mua gói
//   4. còn lại (khách vãng lai, tài khoản chưa có hub, admin) → '' = kiến thức chung của nền tảng
// Đổi tài khoản / vừa mua gói → phát `owner-change` trên window, component tự resolve lại (onOwnerChange).
import requester from '@/services/core/requester.js'
import { auth } from '@/packages/auth/service/service.js'

const LOCAL_HOST = /^(localhost|127(?:\.\d+){3}|\[::1\])$/
// Cùng dạng worker fn/access.ts parseHost: chữ thường, bỏ "www.", giữ port.
const hostOf = (url) => { try { return new URL(url).host.toLowerCase().replace(/^www\./, '') } catch { return '' } }

/**
 * Worker từ chối đọc owner cho trang này (fn/owner.ts ownerAccess) — 403 kèm `code`: 'hub_expired' (gói hết hạn),
 * 'hub_domain' (site không nằm trong danh sách), 'hub_disabled' (tắt nhúng), 'hub_unknown'. Trợ lý nhúng ẩn hẳn.
 */
export const hubDenied = (res) => !res?.ok && typeof res?.code === 'string' && res.code.startsWith('hub_')

/** Trang đang chạy local (pnpm dev / localhost / 127.x) — Worker cũng cho qua, xem worker fn/access.ts isLocalHost. */
export const onLocalHost = () => typeof location !== 'undefined' && LOCAL_HOST.test(location.hostname)

/** Host chuẩn hoá của "shop.com" / "https://shop.com" — '' khi trống. */
export const siteHost = (v) => (v ? hostOf(/^[a-z][a-z\d+.-]*:\/\//i.test(v) ? v : `https://${v}`) : '')

/** Owner của kho riêng 1 site nền tảng (svc-aide site="…" không owner) — worker fn/access.ts siteOfOwner. '' = không có. */
export const siteOwner = (site) => { const host = siteHost(site); return host ? `@${host}` : '' }

const API = `${import.meta.env.PUBLIC_LLM_URL ?? ''}/v1/hubs`
// The worker re-reads billing from auth, which can lag a moment behind the purchase itself.
const ISSUE_RETRY_MS = 3000

export const hub = {
    /** { hub, active, isAdmin, knowledge: {type: n}, pending, mcpUrl, types } — pending = dòng chưa lập chỉ mục của
     *  `owner` (admin: owner bất kỳ, '' = kiến thức chung), bỏ trống = hub của chính mình. */
    me: (owner) => requester().get(`${API}/me${owner != null ? `?owner=${encodeURIComponent(owner)}` : ''}`),
    /** Tạo/làm mới hub; `rotate` = cấp token mới (token cũ hết hiệu lực). data.token chỉ có ở lần cấp. */
    issue: (rotate = false) => requester({ timeoutMs: 20_000 }).post(`${API}/issue`, { rotate }),
    /** Nạp 1 API JSON vào kiến thức: { url, type, owner?, sector?, fn?, itemsPath?, fields?, dryRun? } */
    importApi: (params) => requester({ timeoutMs: 60_000 }).post(`${API}/import`, params),
    removeSource: (id) => requester().post(`${API}/remove-source`, { id }),
    /** Site được chạy trợ lý nhúng của hub: { owner?, domains: string[] } ([] = mọi site) → { owner, domains } */
    setDomains: (params) => requester().post(`${API}/domains`, params),
    /** 1 lượt lập chỉ mục (50 dòng): { owner?, force?, after? } → { processed, indexed, remaining, after } */
    reindex: (params = {}) => requester({ timeoutMs: 60_000 }).post(`${API}/reindex`, params),
}

// user id → Promise<owner>: 1 lần gọi /me cho mỗi tài khoản mỗi lần tải trang; 'hub-change' xoá cache.
const _owners = new Map()

/** Owner hiệu lực: `prop` nếu có; `site` → '@<host>'; không thì hub của người đang đăng nhập, không thì '' (xem đầu file). */
export async function resolveOwner(prop, site = '') {
    if (prop) return prop
    if (site) return siteOwner(site)
    const user = await auth.get().catch(() => null)
    if (!user?.id) return ''
    if (!_owners.has(user.id)) {
        _owners.set(user.id, hub.me()
            .then((res) => (res.ok && res.data?.hub?.id) || '')
            .catch(() => ''))
    }
    return _owners.get(user.id)
}

/** Gọi `fn` mỗi khi owner tự động có thể đã đổi (đăng nhập/đăng xuất, mua gói). Trả về hàm huỷ. */
export function onOwnerChange(fn) {
    window.addEventListener('owner-change', fn)
    return () => window.removeEventListener('owner-change', fn)
}

let _listening = false
if (typeof window !== 'undefined' && !_listening) {
    _listening = true
    // svc-account phát account-change mỗi lần biết user (kể cả lần kiểm tra đầu) — chỉ báo khi id đổi thật
    // so với phiên đã cache lúc tải trang (panel đăng nhập có thể chỉ mount sau đó, vd popover của svc-node).
    let lastUser = auth.get().then((u) => u?.id ?? '', () => '')
    window.addEventListener('account-change', async (e) => {
        const id = e.detail?.user?.id ?? ''
        const prev = await lastUser
        lastUser = id
        if (id !== prev) window.dispatchEvent(new CustomEvent('owner-change'))
    })
    window.addEventListener('hub-change', () => {
        _owners.clear()
        window.dispatchEvent(new CustomEvent('owner-change'))
    })
    window.addEventListener('purchase-complete', async () => {
        let res = await hub.issue()
        if (!res.ok && res.statusCode === 402) {
            await new Promise((r) => setTimeout(r, ISSUE_RETRY_MS))
            res = await hub.issue()
        }
        if (res.ok) window.dispatchEvent(new CustomEvent('hub-change', { detail: res.data }))
        else console.warn('[llm/hub] issue after purchase failed:', res.message)
    })
}
