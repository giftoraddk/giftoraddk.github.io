// src/packages/auth/service/rebuild.js
//
// Site `output: 'static'` không có ISR — HTML SSG chỉ đổi khi build lại toàn site qua build-hook của host.
// Chưa cấu hình PUBLIC_DEPLOY_HOOK → no-op.

const DEBOUNCE_MS = 30_000 // nhiều lần lưu liên tiếp trong admin chỉ trigger 1 lần rebuild

let _pending = null

export function triggerRebuild() {
    const url = import.meta.env.PUBLIC_DEPLOY_HOOK
    if (!url) return

    clearTimeout(_pending)
    _pending = setTimeout(() => {
        fetch(url, { method: 'POST' }).catch(err => console.warn('[rebuild] trigger thất bại:', err.message))
    }, DEBOUNCE_MS)
}
