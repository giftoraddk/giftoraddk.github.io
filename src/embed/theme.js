// src/embed/theme.js — bảng màu mặc định cho component nhúng trên site KHÁC (vite.standalone.mjs gọi embedTheme(<tag>) ở
// đầu mỗi bundle public/embed/<tag>.js). Site khách không có theme ApexUI (--color-*), nên đặt sẵn biến NGAY TRÊN thẻ của
// component (biến CSS kế thừa vào shadow DOM, kể cả popover) — không đụng phần còn lại của trang. Bọc :where() nên
// specificity 0: site khách ghi đè được bằng
//     svc-aide { --color-primary: #e11d48; }
// theme="light" | "dark" trên thẻ (mặc định dark, như các svc-*). Trên chính site này (đã có theme) bundle không cần.

const LIGHT = `
    --color-base-100: #ffffff;
    --color-base-200: color-mix(in oklab, var(--color-base-100), black 4%);
    --color-base-300: color-mix(in oklab, var(--color-base-100), black 8%);
    --color-base-content: #161616;
    --color-primary: #2F9ED0;
    --color-secondary: #706FD3;
    --color-accent: #D98DCE;
    --color-info: #00AFC0;
    --color-warning: #F2A900;
    --color-success: #35B96B;
    --color-error: #E94F70;
    --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: var(--color-base-content);
    font-family: var(--font-sans);`

const DARK = `
    --color-base-100: #0d0d0d;
    --color-base-200: color-mix(in oklab, var(--color-base-100), white 4%);
    --color-base-300: color-mix(in oklab, var(--color-base-100), white 8%);
    --color-base-content: #f1f2f4;`

/** Gắn bảng màu mặc định cho thẻ `tag` — 1 lần mỗi thẻ, dù trang tải nhiều bundle. */
export function embedTheme(tag) {
    if (typeof document === 'undefined') return
    const id = `svc-embed-theme-${tag}`
    if (document.getElementById(id)) return
    const style = document.createElement('style')
    style.id = id
    style.textContent = `:where(${tag}) {${LIGHT}\n}\n:where(${tag}:not([theme="light"])) {${DARK}\n}\n`
    document.head.prepend(style) // trước stylesheet của site — luật của site thắng khi cùng độ ưu tiên
}
