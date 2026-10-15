// Gói bán — nguồn duy nhất cho bảng giá (client) VÀ kiểm tra giá phía server (auth import file
// này). File thuần, không import gì, để cả Vite lẫn esbuild của wrangler bundle được.
//
// amount  = số tiền của CẢ kỳ, đơn vị nhỏ nhất (cent). Gói năm hiển thị "/tháng" = amount / 12.
// planIds = Billing Plan (P-…) tương ứng trên PayPal; worker chọn sandbox/live theo PAYPAL_ENV và
//           đối chiếu amount/currency/interval/trial với plan thật — lệch là từ chối tạo subscription.
// Đổi giá: tạo Plan MỚI trên PayPal (subscription cũ giữ plan cũ) → sửa amount + planIds → deploy lại.
// PayPal không nhận VND — giữ USD (hoặc 1 currency PayPal hỗ trợ).
// `grants` = gói mở những gì — llm CHẶN THẬT theo nó (fn/owner.ts resolveCaller), không chỉ để hiển thị:
//   'aide'        <svc-aide> (trợ lý tư vấn) trả lời từ kho kiến thức RIÊNG + nạp kiến thức (API, MCP) + nhúng site
//   'departments' <svc-talk> (Thư ký) + trọn bộ phòng ban (<svc-fn>) — mọi route /v1/fn/* trừ aide/sectors
// Chỉ để hiển thị (worker bỏ qua): `featured` (nút CTA nổi bật), `tints` (cặp màu theme của thẻ,
// vd ['secondary', 'accent']), `limits` ({ vi, en } — mục "Giới hạn gói" phía trên tính năng),
// `groups` ([{ icon, title, items }] — tính năng theo nhóm của <svc-purchase-plans>; thiếu thì dùng `features`).
// `features` (4 dòng đầu) — giữ ngắn gọn.
// `PURCHASE.free` = thẻ "Miễn phí" của <svc-purchase-plans> — KHÔNG phải gói bán (không giá / PayPal), nằm ngoài
// `plans` nên findPlan / checkout / worker không bao giờ thấy nó. Mọi dòng chỉ mô tả thứ hệ thống thật sự làm.
export const GRANTS = ['aide', 'departments']

export const PURCHASE = {
    currency: 'usd',
    trialDays: 14, // mặc định mọi gói — gói nào cần khác thì đặt `trialDays` riêng
    free: {
        id: 'free',
        name: { vi: 'Miễn phí', en: 'Free' },
        tagline: { vi: 'Dùng thử cả bộ máy — không cần thẻ', en: 'Try the whole system — no card needed' },
        tints: ['info', 'success'],
        limits: {
            vi: ['Mỗi ngành: 1 việc cả nhóm qua Thư ký + 1 việc riêng mỗi phòng ban', '30 tin nhắn mỗi ngành'],
            en: ['Per sector: 1 team task through the Secretary + 1 job per department', '30 messages per sector'],
        },
        groups: [
            {
                icon: 'ri:message-ai-3-line',
                title: { vi: 'Trợ lý tư vấn', en: 'Consultant' },
                items: {
                    vi: ['Chat ngay với trợ lý tư vấn mẫu, không cần đăng ký', 'Trả lời từ kho kiến thức chung của nền tảng', 'Lịch sử chat giữ trên trình duyệt của bạn 30 ngày'],
                    en: ['Chat with the sample consultant right away, no sign-up', "Answers from the platform's shared knowledge", 'Chat history kept in your own browser for 30 days'],
                },
            },
            {
                icon: 'ri:flask-line',
                title: { vi: 'Dùng thử không gian làm việc', en: 'Workspace trial' },
                items: {
                    vi: ['Thư ký AI + 9 phòng ban trên canvas, chỉ cần đăng nhập', 'Đủ 5 ngành: Thương mại điện tử, Giáo dục, F&B, Y tế, Bất động sản', 'Kết quả được duyệt lưu thành kiến thức nháp — còn nguyên khi bạn nâng cấp'],
                    en: ['The AI Secretary + 9 departments on the canvas — just sign in', 'All 5 sectors: E-commerce, Education, F&B, Healthcare, Real Estate', 'Approved results are kept as draft knowledge — still there when you upgrade'],
                },
            },
        ],
    },
    plans: [
        {
            id: 'starter',
            name: { vi: 'Starter', en: 'Starter' },
            tagline: { vi: 'Trợ lý tư vấn AI cho website của bạn', en: 'An AI consultant for your website' },
            grants: ['aide'],
            features: {
                vi: [
                    'Trợ lý tư vấn AI (svc-aide) trả lời 24/7 từ kho kiến thức riêng',
                    'Nhúng lên website bằng 1 thẻ <script>',
                    'Nạp kiến thức từ API JSON, hoặc để AI (Claude, Cursor…) nạp qua MCP',
                    'Tìm kiếm kết hợp vector + từ khoá, trích nguồn',
                    'Lịch sử chat lưu ở trình duyệt khách, 30 ngày',
                    'Hỗ trợ qua email',
                ],
                en: [
                    'AI consultant (svc-aide) answering 24/7 from your own knowledge base',
                    'Embed on your website with one <script> tag',
                    'Load knowledge from a JSON API, or let an AI (Claude, Cursor…) load it over MCP',
                    'Hybrid vector + keyword search, with sources',
                    'Chat history kept in the visitor\'s browser, 30 days',
                    'Email support',
                ],
            },
            groups: [
                {
                    icon: 'ri:message-ai-3-line',
                    title: { vi: 'Trợ lý tư vấn 24/7', en: '24/7 consultant' },
                    items: {
                        vi: ['Trả lời khách từ kho kiến thức riêng của bạn, kèm nguồn', 'Tìm kiếm kết hợp vector + từ khoá — bắt cả mã SKU, tên riêng', 'Trả lời theo ngôn ngữ khách hỏi (Việt / Anh)', 'Tên và ảnh đại diện của trợ lý do bạn đặt'],
                        en: ['Answers visitors from your own knowledge base, with sources', 'Hybrid vector + keyword search — catches SKUs and proper names too', "Replies in the visitor's language (Vietnamese / English)", "Your assistant's own name and avatar"],
                    },
                },
                {
                    icon: 'ri:database-2-line',
                    title: { vi: 'Kho kiến thức', en: 'Knowledge base' },
                    items: {
                        vi: ['Nạp từ API JSON — dán 1 đường dẫn là xong', 'Để AI (Claude, Cursor, VS Code) nạp qua MCP — cài 1 chạm', 'Phân loại theo loại kiến thức, ngành và phòng ban', 'Nạp lại / cập nhật bất cứ lúc nào, tự lập chỉ mục'],
                        en: ['Load from a JSON API — paste one URL', 'Let an AI (Claude, Cursor, VS Code) load it over MCP — one-click install', 'Organised by knowledge type, sector and department', 'Reload or update any time, indexed automatically'],
                    },
                },
                {
                    icon: 'ri:code-s-slash-line',
                    title: { vi: 'Nhúng lên website', en: 'On your website' },
                    items: {
                        vi: ['1 thẻ <script> — chạy trên mọi website', 'Giao diện sáng / tối, vị trí nút tuỳ chỉnh', 'Lịch sử chat lưu ở trình duyệt khách 30 ngày'],
                        en: ['One <script> tag — works on any website', 'Light / dark look, button placement of your choice', "Chat history kept in the visitor's browser for 30 days"],
                    },
                },
                {
                    icon: 'ri:shield-check-line',
                    title: { vi: 'Dữ liệu & bảo mật', en: 'Data & security' },
                    items: {
                        vi: ['Kho kiến thức tách riêng từng khách hàng', 'Token MCP chỉ lưu dạng băm SHA-256, cấp lại là token cũ hết hiệu lực', 'Hỗ trợ qua email'],
                        en: ["Every customer's knowledge is walled off", 'MCP tokens stored only as SHA-256 hashes — reissue and the old one stops', 'Email support'],
                    },
                },
            ],
            prices: {
                month: { amount: 1200, planIds: { sandbox: 'P-4UP14019G5981471WNK2PLQQ', live: '' } },
                year: { amount: 10800, planIds: { sandbox: 'P-3UT15891HV411913TNK2PLQY', live: '' } },
            },
        },
        {
            id: 'pro',
            name: { vi: 'Pro', en: 'Pro' },
            tagline: { vi: 'Cả bộ máy doanh nghiệp chạy bằng AI', en: 'Your whole company, run with AI' },
            featured: true,
            featuresFrom: 'starter',
            grants: ['aide', 'departments'],
            features: {
                vi: [
                    'Thư ký AI (svc-talk) nhận việc và điều phối các phòng ban',
                    'Trọn bộ 9 phòng ban: Chiến lược, Sản phẩm, Marketing, Kinh doanh, Vận hành, Cung ứng, Chất lượng, Tài chính, Công nghệ',
                    'Duyệt từng bước hoặc chế độ Tự động, bàn giao giữa các phòng',
                    'Mỗi phòng dùng kho kiến thức riêng của bạn, theo ngành / phòng',
                    'Không gian làm việc trên canvas tại /system/<ngành>',
                    'Hỗ trợ ưu tiên',
                ],
                en: [
                    'AI Secretary (svc-talk) takes the work and routes it to the departments',
                    'All 9 departments: Strategy, Product, Marketing, Commercial, Operations, Supply, Quality, Finance, Technology',
                    'Approve step by step or let Auto run it, with handoffs between departments',
                    'Every department works from your own knowledge, scoped per sector / department',
                    'A canvas workspace at /system/<sector>',
                    'Priority support',
                ],
            },
            limits: {
                vi: ['100 việc mỗi ngày cho cả doanh nghiệp'],
                en: ['100 jobs a day across your company'],
            },
            groups: [
                {
                    icon: 'ri:connector-line',
                    title: { vi: 'Thư ký AI', en: 'AI Secretary' },
                    items: {
                        vi: ['Giao việc bằng 1 câu — Thư ký dựng bối cảnh và phân công', 'Bảng phân công sửa được: thêm / bỏ phòng, đổi phòng chủ trì', 'Theo dõi bàn giao giữa các phòng ngay trong khung chat', 'Việc phức tạp kết thúc bằng 1 kết luận: Duyệt / Duyệt có điều kiện / Tạm hoãn / Từ chối'],
                        en: ['Hand over work in one sentence — the Secretary frames it and assigns it', 'An editable routing board: add / drop departments, change the lead', 'Follow the handoffs between departments right in the chat', 'Complex work ends with one verdict: Approve / Approve with conditions / Hold / Reject'],
                    },
                },
                {
                    icon: 'ri:building-4-line',
                    title: { vi: '9 phòng ban chuyên môn', en: '9 expert departments' },
                    items: {
                        vi: ['Chiến lược, Sản phẩm, Marketing, Kinh doanh, Vận hành, Cung ứng, Chất lượng, Tài chính, Công nghệ', 'Mỗi phòng làm theo quy trình nhiều bước, chuyên môn riêng theo ngành', 'Duyệt từng bước, sửa tay, hoặc bật Tự động chạy hết', 'Bàn giao có phiên bản — phòng sau tự được báo khi phòng trước đổi'],
                        en: ['Strategy, Product, Marketing, Commercial, Operations, Supply, Quality, Finance, Technology', 'Each runs a multi-step process, with expertise specific to your sector', 'Approve step by step, edit by hand, or turn on Auto', 'Versioned handoffs — downstream departments are told when upstream changes'],
                    },
                },
                {
                    icon: 'ri:brain-line',
                    title: { vi: 'Kiến thức làm việc cho bạn', en: 'Knowledge that works for you' },
                    items: {
                        vi: ['Kết quả được duyệt thành kiến thức, phòng sau và trợ lý tư vấn dùng lại', 'Mỗi phòng đọc kho kiến thức riêng của bạn theo ngành / phòng', 'Ngành cần chuyên gia (Y tế, Bất động sản) có bước ký duyệt bắt buộc'],
                        en: ['Approved results become knowledge the next department and your consultant reuse', 'Each department reads your own knowledge, scoped by sector / department', 'Sectors that need an expert (Healthcare, Real Estate) require a sign-off step'],
                    },
                },
                {
                    icon: 'ri:layout-masonry-line',
                    title: { vi: 'Không gian làm việc', en: 'Workspace' },
                    items: {
                        vi: ['Canvas riêng cho từng ngành tại /system/<ngành>', 'Ra lệnh cho mọi AI từ 1 thanh lệnh duy nhất', 'Hỗ trợ ưu tiên'],
                        en: ['A canvas per sector at /system/<sector>', 'Command every AI from a single command bar', 'Priority support'],
                    },
                },
            ],
            prices: {
                month: { amount: 2400, planIds: { sandbox: 'P-35U313666A463012CNK2PLQY', live: '' } },
                year: { amount: 22800, planIds: { sandbox: 'P-5LN17853T32062410NK2PLRA', live: '' } },
            },
        },
    ],
}

export const INTERVALS = ['month', 'year']

export function findPlan(planId) {
    return PURCHASE.plans.find((p) => p.id === planId) ?? null
}

/** `{ plan, price }` for a plan + billing interval, or null when either is unknown. */
export function findPrice(planId, interval) {
    const plan = findPlan(planId)
    const price = INTERVALS.includes(interval) ? plan?.prices?.[interval] : null
    return plan && price ? { plan, price } : null
}

/** Reverse lookup (either env) — the record keeps the PayPal plan id, not ours. */
export function findByPlanId(paypalPlanId) {
    if (!paypalPlanId) return null
    for (const plan of PURCHASE.plans) {
        for (const interval of INTERVALS) {
            const ids = plan.prices?.[interval]?.planIds ?? {}
            if (ids.sandbox === paypalPlanId || ids.live === paypalPlanId) return { plan, interval }
        }
    }
    return null
}

export const trialDaysOf = (plan) => plan?.trialDays ?? PURCHASE.trialDays

/** Whether plan `planId` opens `grant` (GRANTS) — unknown plan / grant → false. */
export const planGrants = (planId, grant) => Boolean(findPlan(planId)?.grants?.includes(grant))
