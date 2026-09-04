/**
 * deployHook.js — Time-based + on-demand revalidation cho trang build tĩnh (SSG).
 *
 * Astro `output: 'static'` không có ISR/per-page cache như Next.js — HTML của các trang SSG
 * (vd `src/pages/post/[id].astro`, đọc qua `fetchCollection()`) được build 1 lần rồi đứng yên
 * cho tới lần `astro build` kế tiếp. Không có adapter/server chạy thường trực (xem
 * astro.config.mjs — adapter Node đang comment out) nên không thể "revalidate 1 page" như Next;
 * tương đương thật duy nhất không cần thêm hạ tầng là REBUILD TOÀN SITE qua build-hook của host
 * (Vercel/Netlify/Cloudflare Pages đều có sẵn 1 URL POST kích hoạt build lại):
 *
 *   - On-demand (tương đương revalidateTag/revalidatePath): gọi triggerRebuild() ngay sau khi
 *     admin save/delete 1 record thuộc bảng có trang SSG phụ thuộc (xem svc-admin.js prop
 *     `revalidate`).
 *   - Time-based (tương đương ISR theo giờ): KHÔNG cần code gì thêm ở đây — cấu hình 1 job chạy
 *     theo lịch bên ngoài repo (cron của host, hoặc 1 GitHub Actions scheduled workflow) gọi
 *     CÙNG URL build-hook này theo chu kỳ mong muốn (vd mỗi 6 giờ).
 *
 * Chưa cấu hình PUBLIC_DEPLOY_HOOK (chưa chọn host) → no-op im lặng, không phải lỗi — đúng tình
 * trạng hiện tại của repo (chưa có vercel.json/netlify.toml/CI nào, xem hook/geo-platform-plan.md).
 */

const DEBOUNCE_MS = 30_000; // nhiều save liên tiếp trong admin chỉ nên trigger 1 lần rebuild

let _pending = null;

/**
 * Debounced trigger — an toàn gọi nhiều lần liên tiếp (vd sửa nhiều bài viết trong 1 phiên admin).
 */
export function triggerRebuild() {
    const url = import.meta.env.PUBLIC_DEPLOY_HOOK;
    if (!url) return; // chưa cấu hình host — im lặng, không phải lỗi

    clearTimeout(_pending);
    _pending = setTimeout(() => {
        fetch(url, { method: 'POST' }).catch(err =>
            console.warn('[deployHook] trigger rebuild thất bại:', err.message)
        );
    }, DEBOUNCE_MS);
}
