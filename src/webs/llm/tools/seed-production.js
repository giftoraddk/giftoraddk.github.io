// src/webs/llm/tools/seed-production.js
//
// Chuyên môn phòng "Sản phẩm & Vận hành" bóc tách thành JSON config đọc bởi tools/engine.js.
// Cloned from src/webs/division/tools/seed-production.js (domain-isolation clone) — `steps`/`output`
// unchanged. Giá bán/SKU/tồn kho CỐ Ý không nằm trong output — đó là quyết định kinh doanh thật,
// không phải thứ AI nên tự bịa.
//
// `processTable: ''` (khác bản division gốc, vốn là 'productions') — domain llm KHÔNG có admin
// popup riêng để mirror job đã duyệt vào. svc-talk.js's _dfApprove tự bỏ qua bước mirror khi rỗng.
//
// Division này còn giữ vai trò ĐẶC BIỆT: các division khác có `meta.requiresProduct: true` (vd
// marketing) cần 1 sản phẩm trong bảng `products` (Firestore DB_ALL, KHÔNG đổi backend) khớp topic
// tồn tại TRƯỚC khi được phép chạy — nếu chưa có, svc-talk.js tự dispatch topic đó cho production
// chạy trước (xem svc-talk.js's _reactTurn/_wakeWaitingJobs). Seed 1 lần vào D1 table `divisions`
// (id 'production', server LLM_DB) nếu chưa tồn tại — sửa tiếp qua /admin/divisions.
export const PRODUCTION_DIVISION_SEED = {
    title: 'Sản phẩm & Vận hành',
    description: 'Tạo sản phẩm mới (phân tích khách hàng, thiết kế, quy trình sản xuất) và đảm bảo chất lượng trước khi bàn giao.',
    status: 'active',
    pics: '',
    lang: 'vi',
    ai: '',
    meta: {
        // Các division khác cần sản phẩm đã tồn tại trước khi làm việc thì tự khai
        // `meta.requiresProduct: true` — production KHÔNG khai cờ này (chính nó là nơi tạo sản phẩm).
        processTable: '',
        steps: [
            {
                id: 1, key: 'discovery', vi: 'Phân tích', en: 'Discovery & Analysis', type: 'text',
                role: 'a Senior Product Strategist, Customer Researcher, and Operations Analyst',
                task: 'Task: deeply analyze 1 PRODUCT/SERVICE topic to understand the customer, their real job-to-be-done, and the core problem BEFORE designing anything. Do NOT design the product or write any customer-facing content at this step — analysis only.',
                calls: [
                    {
                        key: 'g1', vi: 'Khách hàng & nhu cầu', en: 'Customer & need',
                        maxTokens: 900, temperature: 0.7, contextKeys: [], dependsOn: [],
                        fields: [
                            { key: 'customerProfile', vi: 'Khách hàng mục tiêu', en: 'Target Customer', desc: 'Primary target customer: who they are, their situation, what they are currently doing to solve this. Max 3 sentences.' },
                            { key: 'coreProblem', vi: 'Vấn đề cốt lõi', en: 'Core Problem', desc: 'The real functional/experience/quality problem the customer faces — not just the surface complaint. Max 3 sentences.' },
                            { key: 'desiredOutcome', vi: 'Kết quả mong muốn', en: 'Desired Outcome', desc: 'The concrete outcome/transformation the customer wants once this product/service works well for them. Max 2 sentences.' },
                        ],
                    },
                    {
                        key: 'g2', vi: 'Rủi ro & tiêu chuẩn chất lượng', en: 'Risk & quality bar',
                        maxTokens: 700, temperature: 0.7, contextKeys: [], dependsOn: [],
                        fields: [
                            { key: 'keyRisks', vi: 'Rủi ro chính', en: 'Key Risks', desc: 'ONLY the top 3 ways this product/service could fail or disappoint the customer (not 5+) — 1 short sentence each. Max 3 sentences total.' },
                            { key: 'qualityBar', vi: 'Tiêu chuẩn chất lượng', en: 'Quality Bar', desc: 'What "good enough to sell" concretely means here — 2-3 observable/measurable quality expectations, not vague words like "good" or "professional". Max 3 sentences.' },
                        ],
                    },
                ],
            },
            {
                // Trả lời câu "sản phẩm thực tế trông như thế nào và được tạo thành từ những gì?"
                // TRƯỚC khi thiết kế quy trình/viết content — nếu không, các step sau dễ viết chung
                // chung (chỉ có tên+mô tả mơ hồ) thay vì bám vào 1 cấu tạo vật lý cụ thể.
                id: 2, key: 'concept', vi: 'Thiết kế sản phẩm', en: 'Product Design', type: 'text',
                role: 'a Senior Product Manager and Industrial/Packaging Designer specializing in physical product and gift-set composition',
                task: 'Based on the customer/problem analysis provided as context below (do not skip it), answer the question: what does this product ACTUALLY look like, and what is it physically made of? Do NOT write a vague marketing idea — define a CONCRETE "Product Concept V0": what it is, who it is for, an estimated budget, and its exact physical component list. Then specify each of those components further.',
                calls: [
                    {
                        key: 'productConcept', vi: 'Ý tưởng & cấu tạo', en: 'Concept & composition',
                        maxTokens: 900, temperature: 0.7, dependsOn: [],
                        contextKeys: ['customerProfile', 'coreProblem', 'desiredOutcome', 'keyRisks', 'qualityBar'],
                        fields: [{ key: 'productConcept', vi: 'Ý tưởng sản phẩm', en: 'Product Concept', desc: 'A "Product Concept V0" write-up in this exact shape: (1) ONE opening sentence naming the concept + target recipient/use-case + an estimated budget RANGE in the customer\'s local currency, a plausible range for this product tier (e.g. "800,000-1,200,000 VND per box"); (2) a blank line, then a short section header meaning "Expected composition"; (3) a bullet list (each line starts with "- ") of the EXACT physical components with quantities (e.g. "01 premium rigid box"), then 1-2 bullets for logo/branding placement, then a final bullet noting 1-2 components may be swapped depending on budget. 6-10 bullets total — grounded in the context below, no generic filler. IMPORTANT: insert a REAL newline character (JSON escape "\\n") between the opening sentence and the header, between the header and the first bullet, and between EVERY bullet — e.g. "...per box.\\n\\nExpected composition:\\n- 01 premium box...\\n- 01 insulated bottle...". NEVER put two bullets or the header on the same line separated only by a space.' }],
                    },
                    {
                        key: 'componentSpecs', vi: 'Cụ thể hoá thành phần', en: 'Component specs',
                        maxTokens: 1600, temperature: 0.6, dependsOn: ['productConcept'],
                        contextKeys: ['productConcept'],
                        fields: [{ key: 'componentSpecs', vi: 'Chi tiết thành phần', en: 'Component Specs', desc: 'For EACH physical component listed in productConcept above (skip logo/branding bullets and the budget-swap note), write one short block specifying its concrete attributes — choose whichever apply to that component\'s type: a box/case -> size, material, color, opening mechanism, logo method; a bottle/container -> capacity, material, color, logo method, packaging; a printed item (notebook/card) -> size, page count/cover, logo method; adapt freely for anything else. Format: the component\'s name on its own line, then each attribute as "label: value" on the next lines, with a blank line separating each component. IMPORTANT: insert a REAL newline character (JSON escape "\\n") between the name and each attribute line, between each attribute, and between components (double "\\n\\n") — e.g. "Insulated bottle\\nCapacity: 500ml\\nMaterial: stainless steel\\n\\nNotebook\\n...". NEVER put the name and its attributes, or two attributes, on the same line.' }],
                    },
                ],
            },
            {
                // Gộp step "Thiết kế quy trình" (process) + step "Nội dung & Kiểm soát chất lượng"
                // (titleDesc/content/tags) làm 1 — `process` chạy wave 1 song song với `titleDesc`
                // (cả 2 dependsOn: []), `content`/`tags` chạy wave 2 (dependsOn: ['titleDesc'], đọc
                // `productionProcess` qua contextKeys) — xem engine.js's orderCallWaves/runTextStep.
                id: 3, key: 'development', vi: 'Phát triển sản phẩm', en: 'Product Development', type: 'text',
                role: 'a Product Manager, Copywriter, and Quality Control Specialist',
                task: 'Based on the customer/problem analysis and approved Product Concept provided as context below, define how this product/service will be produced end-to-end, define the product itself (name, description), write the full product listing content, tag it, AND define how quality will be checked before this reaches a customer.',
                calls: [
                    {
                        // Role/task riêng (ghi đè step.role/step.task — xem engine.js's buildCallPrompt) —
                        // giữ nguyên persona "Process Designer" cũ của step riêng trước khi gộp, vì
                        // role/task chung của step gộp (Copywriter/QC) không hợp cho việc định nghĩa
                        // quy trình sản xuất.
                        key: 'process', vi: 'Quy trình sản xuất', en: 'Production process',
                        role: 'a Senior Product Manager and Process Designer',
                        task: 'Based on the customer/problem analysis and the approved Product Concept provided as context below (do not skip them), define how this product/service will be produced or delivered end-to-end. Do NOT write the product name, description, or any customer-facing content at this call — that happens in the other calls of this step.',
                        maxTokens: 900, temperature: 0.7, dependsOn: [],
                        contextKeys: ['coreProblem', 'desiredOutcome', 'keyRisks', 'productConcept', 'componentSpecs'],
                        fields: [
                            { key: 'productionProcess', vi: 'Quy trình', en: 'Production Process', desc: 'The end-to-end production/delivery steps (input -> preparation -> execution -> inspection -> handover), as a numbered list, max 6 steps. IMPORTANT: put EACH numbered step on its OWN line — insert a REAL newline character (JSON escape "\\n") between every step, e.g. "1. Receive raw materials...\\n2. Prepare...\\n3. Execute...". NEVER write two or more numbered steps on the same line separated only by a space.' },
                        ],
                    },
                    {
                        key: 'titleDesc', vi: 'Tên & mô tả sản phẩm', en: 'Product name & description',
                        maxTokens: 500, temperature: 0.7, dependsOn: [],
                        contextKeys: ['customerProfile', 'coreProblem', 'desiredOutcome', 'productConcept'],
                        fields: [
                            { key: 'title', vi: 'Tên sản phẩm', en: 'Title', desc: 'A clear, specific, sellable product/service name — not a generic category label. About 3-8 words.' },
                            { key: 'description', vi: 'Mô tả ngắn', en: 'Description', desc: 'Short 2-3 sentence description of what it is and the core value it delivers to the customer, written like a real product listing blurb.' },
                        ],
                    },
                    {
                        key: 'content', vi: 'Nội dung sản phẩm', en: 'Product content',
                        maxTokens: 2200, temperature: 0.7, dependsOn: ['titleDesc'],
                        contextKeys: ['title', 'description', 'productionProcess', 'desiredOutcome', 'productConcept', 'componentSpecs'],
                        fields: [{ key: 'content', vi: 'Nội dung', en: 'Content', desc: 'Full product content as valid HTML (use <h2>/<h3>/<p>/<ul>/<li> tags). Include: an opening paragraph on the value/outcome, a section describing what the product physically includes (grounded in the approved component list/specs), and a closing <h2> section heading (meaning "Production Process & Quality Control", written in the OUTPUT_LANGUAGE — never hardcode it in another language) summarizing the production process and the top quality checks before handover. About 300-500 words.' }],
                    },
                    {
                        // Persona/methodology riêng cho call này (call.role/call.task ghi đè step.role/
                        // step.task) — chuyển thể từ hook/keyword.md's "SEO KEYWORD STRATEGY ENGINE"
                        // (TOPIC->CUSTOMER->PROBLEM->NEED->DESIRE->SEARCH INTENT->KEYWORD + 9 loại
                        // keyword + priority score), nén xuống 1 field tags ngắn. Định dạng PHẢI khớp
                        // schema thật (products.tags: `multi:true` — web-texts.js nối/tách bằng '|').
                        key: 'tags', vi: 'Tags', en: 'Tags',
                        role: 'an expert SEO Strategist and Search Intent Analyst',
                        task: `Generate a strategic, prioritized keyword set for this PRODUCT by reasoning through the full chain: TOPIC -> CUSTOMER -> PROBLEM -> NEED -> DESIRE -> SEARCH INTENT -> KEYWORD, grounded in the real customer/problem/need analysis provided as context below (do not invent generic assumptions unrelated to it). Do NOT generate random keyword variations.

Mentally survey the full keyword landscape before picking: primary keywords (core topic), secondary keywords (related concepts/use cases), long-tail keywords (specific phrases with clear intent), problem-aware keywords (the customer's pain), solution-aware keywords (the desired outcome), and commercial/transactional keywords (evaluation or purchase intent) — then select ONLY the highest-priority final set, scored by relevance, search-intent match, content potential, commercial potential, and specificity (a strategic priority judgment, NOT a claim of measured search volume).

Rules for the final selection:
- Prefer a MIX of intent types, not 3-6 near-identical broad tags — include at least 1 problem/solution-oriented keyword AND at least 1 commercial/transactional-intent keyword when genuinely relevant to this product.
- Every tag must read as a short noun phrase/category label — NEVER a full question (no "how"/"what"/"why" phrasing) and NEVER a comparison phrase ("vs", "alternative", "best X for Y", "review").
- Never just repeat a word/phrase already used verbatim in the title.

Output ONLY the final prioritized keyword list in the field below — never your reasoning, the keyword categories, or any priority scores.`,
                        maxTokens: 150, temperature: 0.6, dependsOn: ['titleDesc'],
                        contextKeys: ['title', 'description', 'customerProfile', 'coreProblem', 'desiredOutcome'],
                        fields: [{ key: 'tags', vi: 'Tags', en: 'Tags', desc: 'EXACTLY 3-6 final prioritized keywords chosen per the strategy above (mix of primary + secondary + long-tail + problem/solution + commercial intent, each genuinely SEO-relevant — not filler words, not a plain copy of the title, no questions, no comparison words like vs/alternative/best/review). Format: tag1|tag2|tag3 — separate tags ONLY with a single | character, never with commas or any other punctuation. Correct: gift box|personalized|handmade. Wrong: gift box, personalized, handmade. No quotes, no hashtags, no leading/trailing |.' }],
                    },
                ],
            },
            {
                id: 4, key: 'image', vi: 'Tạo ảnh', en: 'Image Generation', type: 'image',
                concept: { contextKeys: ['coreProblem', 'description', 'productConcept'] },
            },
        ],
        // 'products' — collection thật của /admin/products, GIỮ NGUYÊN Firestore DB_ALL (không đổi
        // backend, xem svc-talk.js's _dfApprove). Giá/SKU/tồn kho không nằm trong output — để
        // trống, người dùng tự điền sau trong admin.
        output: { table: 'products', fields: ['title', 'description', 'content', 'tags', 'pics'], status: 'draft' },
    },
}
