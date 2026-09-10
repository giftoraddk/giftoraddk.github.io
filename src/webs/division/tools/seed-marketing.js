// src/webs/division/tools/seed-marketing.js
//
// Chuyên môn phòng Marketing bóc tách thành JSON config đọc bởi tools/engine.js — nội dung di dời
// nguyên vẹn từ tools/prompts.js cũ (hook/maketing.md 18-step framework), chỉ đổi hình dạng từ các
// hàm buildStep1Prompt/buildStep2Prompt/buildStep3*Prompt hardcode sang StepConfig[] thuần data.
// `vi`/`en` trên step/call/field chỉ để hiển thị (tên step lớn, tên sub-step, nhãn field trong
// review) — không ảnh hưởng prompt gửi AI (đọc `role`/`task`/`field.desc`).
//
// Seed 1 lần vào Firestore collection `divisions` (doc id 'marketing') nếu doc đó chưa tồn tại —
// xem svc-marketing.js/_dcLoadDivision() và svc-talk.js. Sau khi có trong DB, sửa tiếp qua
// Xuất/Nhập CSV của trang /admin/divisions (xem hook/superpowers/specs/2026-09-05-division-talk-design.md §1).
export const MARKETING_DIVISION_SEED = {
    title: 'Marketing',
    description: 'Chiến lược nội dung, phân tích khách hàng, viết bài SEO và tạo ảnh minh hoạ.',
    status: 'active',
    pics: '',
    lang: 'vi',
    ai: '',
    meta: {
        // sản phẩm liên quan (khớp topic theo tên) phải đã tồn tại trong bảng `products` trước khi
        // marketing được chạy — nếu chưa, svc-talk.js tự dispatch topic cho division 'production'
        // tạo trước (xem svc-talk.js's _reactTurn/_wakeWaitingJobs, tools/seed-production.js).
        requiresProduct: true,
        // Collection lưu tiến trình của svc-marketing.js's admin popup (PHẢI khớp svc-marketing.js's
        // constructor `this.processTable = 'marketing'`) — svc-talk.js đọc giá trị này để mirror job chat
        // đã duyệt vào đây, cho admin mở lại đúng kết quả qua nút "Marketing" trên /admin/posts thay
        // vì thấy popup rỗng (xem svc-talk.js's _dfApprove).
        processTable: 'marketing',
        steps: [
            {
                id: 1, key: 'analysis', vi: 'Phân tích', en: 'Strategy Analysis', type: 'text',
                role: 'a Senior Content Strategist, Customer Researcher, and Consumer Psychologist',
                task: 'Task: deeply analyze 1 marketing TOPIC to understand the customer BEFORE writing any content. Do NOT write marketing content at this step — analysis only. If an EXISTING PRODUCT is described below (see "productContext"), your analysis MUST be grounded in that REAL product — do not invent generic assumptions that contradict it.',
                calls: [
                    {
                        // `productContext` — sản phẩm THẬT liên quan (division `requiresProduct`), do
                        // svc-talk.js tự resolve + patch vào fields TRƯỚC khi chạy step này (xem
                        // svc-talk.js's _runJob/_comProductContext) — không phải field AI tự sinh.
                        key: 'g1', vi: 'Chủ đề & khách hàng', en: 'Topic & customer',
                        maxTokens: 1200, temperature: 0.7, contextKeys: ['productContext'], dependsOn: [],
                        fields: [
                            { key: 'topicAnalysis', vi: 'Phân tích chủ đề', en: 'Topic Analysis', desc: 'Which category the topic belongs to, what problem it solves, who cares about it, why people search for or ignore it. Max 3 sentences.' },
                            { key: 'targetCustomer', vi: 'Khách hàng mục tiêu', en: 'Target Customer', desc: 'Primary target customer profile: current situation, search behavior, who they trust, what drives them to act. Max 3 sentences.' },
                            { key: 'customerSituation', vi: 'Tình huống hiện tại', en: 'Customer Situation', desc: 'Current situation: what they are doing, what frustrates them or is missing, what they are trying to achieve, what happens if they do nothing. Max 3 sentences.' },
                        ],
                    },
                    {
                        key: 'g2', vi: 'Nhu cầu & nỗi đau', en: 'Needs & pain points',
                        maxTokens: 1200, temperature: 0.7, contextKeys: ['productContext'], dependsOn: [],
                        fields: [
                            { key: 'customerNeeds', vi: 'Nhu cầu', en: 'Customer Needs', desc: 'Needs at 3 levels — functional, emotional, identity — 1 short sentence each. Max 3 sentences total.' },
                            { key: 'painPoints', vi: 'Nỗi đau', en: 'Pain Points', desc: 'ONLY the top 3 most important pain points (not 5+) — 1 short sentence each (the problem + its main emotion/consequence). Max 3 sentences total, no long numbered lists.' },
                            { key: 'customerDesires', vi: 'Mong muốn', en: 'Customer Desires', desc: 'What the customer truly wants: 1 sentence surface desire, 1 sentence deeper/emotional desire, 1 sentence transformation. Max 3 sentences total.' },
                        ],
                    },
                    {
                        key: 'g3', vi: 'Động lực & insight', en: 'Motivation & insight',
                        maxTokens: 1200, temperature: 0.7, contextKeys: ['productContext'], dependsOn: [],
                        fields: [
                            { key: 'fearsObjections', vi: 'Nỗi sợ & phản đối', en: 'Fears & Objections', desc: 'ONLY the top 3 most common objections (not 5+) — 1 short sentence each, combining the real reason with the response angle. Max 3 sentences total.' },
                            { key: 'buyingMotivation', vi: 'Động lực mua hàng', en: 'Buying Motivation', desc: 'Strongest buying motivation — current problem + desired outcome + trigger — written as 1 paragraph of 2-3 sentences.' },
                            { key: 'customerInsight', vi: 'Insight khách hàng', en: 'Customer Insight', desc: '1 DEEP, specific, surprising customer insight — connecting what they say/do/fear/want and why. 2-3 sentences, must NOT repeat content from other fields.' },
                        ],
                    },
                ],
            },
            {
                id: 2, key: 'strategy', vi: 'Chiến lược', en: 'Content Strategy', type: 'text',
                role: 'a Content Marketing Strategist',
                task: 'Based on the customer analysis already provided as context below (do not skip it, do not write a generic strategy unrelated to it), build a content strategy.',
                calls: [
                    {
                        key: 'contentPillars', vi: 'Trụ cột nội dung', en: 'Content pillars',
                        maxTokens: 600, temperature: 0.75, dependsOn: [],
                        contextKeys: ['targetCustomer', 'painPoints', 'customerDesires', 'buyingMotivation', 'customerInsight'],
                        fields: [{ key: 'contentPillars', vi: 'Trụ cột nội dung', en: 'Content Pillars', desc: 'ONLY the 3 most important content pillars (not 5+), directly matching the analyzed pain/need/desire — 1 short sentence each (name + purpose). Max 3 sentences total.' }],
                    },
                    {
                        key: 'funnelStrategy', vi: 'Chiến lược phễu', en: 'Funnel strategy',
                        maxTokens: 600, temperature: 0.75, dependsOn: [],
                        contextKeys: ['targetCustomer', 'painPoints', 'customerDesires', 'buyingMotivation', 'customerInsight'],
                        fields: [{ key: 'funnelStrategy', vi: 'Chiến lược phễu', en: 'Funnel Strategy', desc: 'How content guides the customer through Awareness -> Interest -> Consideration -> Conversion, combined into 1 paragraph of 3-4 sentences.' }],
                    },
                    {
                        key: 'contentAngles', vi: 'Góc độ nội dung', en: 'Content angles',
                        maxTokens: 600, temperature: 0.75, dependsOn: [],
                        contextKeys: ['targetCustomer', 'painPoints', 'customerDesires', 'buyingMotivation', 'customerInsight'],
                        fields: [{ key: 'contentAngles', vi: 'Góc độ nội dung', en: 'Content Angles', desc: 'ONLY the 3 most specific content angles (not 6+), 1 short sentence each tied to exactly 1 pain/desire/insight. Max 3 sentences total.' }],
                    },
                ],
            },
            {
                id: 3, key: 'content', vi: 'Nội dung', en: 'Content Generation', type: 'text',
                role: 'a Copywriter specialized in SEO content marketing',
                task: 'Based on the customer/content strategy provided as context below (do not write directly from the topic alone), write copy for an SEO-optimized Blog post and its tags.',
                calls: [
                    {
                        key: 'titleDesc', vi: 'Tiêu đề & mô tả', en: 'Title & description',
                        maxTokens: 500, temperature: 0.75, dependsOn: [],
                        contextKeys: ['customerSituation', 'painPoints', 'customerInsight', 'buyingMotivation', 'contentPillars', 'contentAngles'],
                        fields: [
                            { key: 'title', vi: 'Tiêu đề', en: 'Title', desc: 'SEO-optimized title, about 50-60 characters, containing the main keyword related to the topic, click-worthy but not misleading clickbait. 1 sentence.' },
                            { key: 'description', vi: 'Mô tả', en: 'Description', desc: 'Short 2-3 sentence description, written like a natural Facebook post (emoji/line breaks welcome where fitting), usable both as a caption and as an SEO meta description.' },
                        ],
                    },
                    {
                        key: 'content', vi: 'Nội dung bài viết', en: 'Article content',
                        maxTokens: 3000, temperature: 0.75, dependsOn: ['titleDesc'],
                        contextKeys: ['title', 'customerSituation', 'painPoints', 'customerInsight', 'buyingMotivation', 'contentPillars', 'contentAngles'],
                        fields: [{ key: 'content', vi: 'Nội dung', en: 'Content', desc: 'Full content as valid HTML (use <h2>/<h3>/<p>/<ul>/<li> tags where appropriate), standard SEO blog structure, with an opening that states the problem, a body developed from the analyzed insight/angles, and a closing CTA fitting the funnel stage (no direct sales CTA if the insight shows the customer has not recognized the problem yet). About 400-600 words.' }],
                    },
                    {
                        // Nếu topic này đã có sản phẩm liên quan trong `products` (division `requiresProduct`),
                        // svc-talk.js tự kế thừa sẵn field 'tags' từ đó TRƯỚC khi chạy step này — call ở
                        // đây tự bị skip (engine.js's runTextStep hasData check), không tự generate lại.
                        // Persona/methodology riêng cho call này (call.role/call.task ghi đè step.role/
                        // step.task — xem engine.js's buildCallPrompt) — chuyển thể từ hook/keyword.md's "SEO
                        // KEYWORD STRATEGY ENGINE" (TOPIC->CUSTOMER->PROBLEM->NEED->DESIRE->SEARCH INTENT->
                        // KEYWORD + 9 loại keyword + priority score), nén xuống 1 field tags ngắn thay vì cả
                        // bộ báo cáo markdown gốc (content clusters/mapping/roadmap không áp dụng được cho 1
                        // field `tags` phẳng). Định dạng PHẢI khớp schema thật (posts.tags: `multi:true` —
                        // web-texts.js nối/tách bằng '|', KHÔNG phải ','), không thì hiển thị sai ở /admin/posts.
                        key: 'tags', vi: 'Tags', en: 'Tags',
                        role: 'an expert SEO Strategist and Search Intent Analyst',
                        task: `Generate a strategic, prioritized keyword set for this BLOG POST by reasoning through the full chain: TOPIC -> CUSTOMER -> PROBLEM -> NEED -> DESIRE -> SEARCH INTENT -> KEYWORD, grounded in the real customer/pain-point analysis and content strategy provided as context below (do not invent generic assumptions unrelated to it). Do NOT generate random keyword variations.

Mentally survey the full keyword landscape before picking: primary keywords (core topic), secondary keywords (related concepts/content pillars), long-tail keywords (specific phrases with clear intent), problem-aware keywords (the reader's pain), solution-aware keywords (the desired outcome), and commercial/transactional keywords (evaluation or purchase intent, when relevant to the post's funnel stage) — then select ONLY the highest-priority final set, scored by relevance, search-intent match, content potential, commercial potential, and specificity (a strategic priority judgment, NOT a claim of measured search volume).

Rules for the final selection:
- Prefer a MIX of intent types, not 3-6 near-identical broad tags — include at least 1 problem/solution-oriented keyword, and a commercial/transactional keyword only if the post is genuinely bottom-of-funnel.
- Every tag must read as a short noun phrase/category label — NEVER a full question (no "how"/"what"/"why" phrasing) and NEVER a comparison phrase ("vs", "alternative", "best X for Y", "review").
- Never just repeat a word/phrase already used verbatim in the title.

Output ONLY the final prioritized keyword list in the field below — never your reasoning, the keyword categories, or any priority scores.`,
                        maxTokens: 150, temperature: 0.6, dependsOn: ['titleDesc'],
                        contextKeys: ['title', 'description', 'targetCustomer', 'painPoints', 'customerDesires', 'contentPillars'],
                        fields: [{ key: 'tags', vi: 'Tags', en: 'Tags', desc: 'EXACTLY 3-6 final prioritized keywords chosen per the strategy above (mix of primary + secondary + long-tail + problem/solution + commercial intent, each genuinely SEO-relevant — not filler words, not a plain copy of the title, no questions, no comparison words like vs/alternative/best/review). Format: tag1|tag2|tag3 — separate tags ONLY with a single | character, never with commas or any other punctuation. Correct: cham soc da|meo vat lam dep. Wrong: cham soc da, meo vat lam dep. No quotes, no hashtags, no leading/trailing |.' }],
                    },
                ],
            },
            {
                id: 4, key: 'image', vi: 'Tạo ảnh', en: 'Image Generation', type: 'image',
                concept: { contextKeys: ['topicAnalysis', 'contentPillars'] },
            },
        ],
        // 'posts' — collection thật của /admin/posts (KHÔNG phải `records`+mode — bảng posts là
        // collection riêng, xem src/pages/post/index.astro's fetchCollection('posts')).
        output: { table: 'posts', fields: ['title', 'description', 'content', 'pics', 'tags'], status: 'draft' },
    },
}
