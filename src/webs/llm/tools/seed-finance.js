// src/webs/llm/tools/seed-finance.js
//
// Chuyên môn phòng "Tài chính - Kế toán" bóc tách thành JSON config đọc bởi tools/engine.js.
// Cloned from src/webs/division/tools/seed-finance.js (domain-isolation clone) — `steps`/`output`
// unchanged (`processTable: ''` matches the original already — finance never had an admin popup).
//
// KHÁC mọi division khác ở 1 điểm quan trọng: finance KHÔNG viết content mới từ trí tưởng tượng —
// toàn bộ kết luận PHẢI bám vào SỐ LIỆU THẬT (hook/finance_accounting.md §2 "Không bịa số liệu").
// svc-talk.js tự tính `financialContext` (doanh thu/công nợ/rủi ro thật, xem
// tools/finance-helper.js) rồi patch vào `fields` TRƯỚC khi chạy step này — GIỐNG hệt cách
// `productContext` được bơm cho division `requiresProduct` (xem svc-talk.js's _runJob).
//
// Không `requiresProduct` — câu hỏi tài chính không neo vào 1 sản phẩm cụ thể nào cả.
export const FINANCE_DIVISION_SEED = {
    title: 'Tài chính - Kế toán',
    description: 'Phân tích tài chính, dòng tiền, ngân sách, công nợ, rủi ro và đề xuất quyết định GO/NO-GO.',
    status: 'active',
    pics: '',
    lang: 'vi',
    ai: '',
    meta: {
        // Không có admin popup nào cho finance trong domain này — svc-talk.js's _dfApprove tự bỏ
        // qua bước mirror processTable khi rỗng.
        processTable: '',
        steps: [
            {
                id: 1, key: 'analysis', vi: 'Phân tích tài chính', en: 'Financial Analysis', type: 'text',
                role: 'a Financial Controller and CFO — reasoning as a team of accountant/cash-flow-manager/budget-controller/risk-analyst combined',
                task: 'Task: analyze the financial QUESTION or DECISION being asked, grounded STRICTLY in the real data provided below as "financialContext" (do not skip it, do not invent numbers not present in it). Follow DATA -> CHECK -> CLASSIFY -> ANALYZE -> ASSESS RISK -> RECOMMEND -> DECIDE. If financialContext is missing a number needed to answer precisely, say so explicitly instead of guessing.',
                calls: [
                    {
                        key: 'g1', vi: 'Kết luận & phân tích', en: 'Conclusion & analysis',
                        maxTokens: 900, temperature: 0.4, contextKeys: ['financialContext'], dependsOn: [],
                        fields: [
                            { key: 'conclusion', vi: 'Kết luận', en: 'Conclusion', desc: 'The short, direct answer to the financial question asked — 1-2 sentences, no hedging filler.' },
                            { key: 'analysis', vi: 'Phân tích', en: 'Analysis', desc: 'The reasoning behind the conclusion — what the numbers in financialContext show, any trend/ratio/margin relevant, and what data was insufficient or assumed (mark assumptions explicitly as "Giả định:"). Max 5 sentences.' },
                            { key: 'impact', vi: 'Tác động', en: 'Financial Impact', desc: 'Concrete impact on Revenue / Profit / Cash / Risk if this situation continues or this decision is taken — 1 short sentence per dimension that applies, skip ones with no real impact.' },
                        ],
                    },
                    {
                        key: 'g2', vi: 'Rủi ro & quyết định', en: 'Risk & decision',
                        maxTokens: 700, temperature: 0.4, contextKeys: ['financialContext', 'conclusion', 'analysis'], dependsOn: ['g1'],
                        fields: [
                            { key: 'risk', vi: 'Rủi ro', en: 'Risk', desc: 'Start with exactly one of GREEN/YELLOW/ORANGE/RED (hook/finance_accounting.md §29 — mark any threshold you use as "Ngưỡng phân tích đề xuất", never claim it is official company policy), then 1 sentence why.' },
                            { key: 'recommendation', vi: 'Khuyến nghị', en: 'Recommendation', desc: 'The recommended action(s) — what to do, who/which department should act, priority, and the risk of doing nothing. Max 4 sentences.' },
                            { key: 'decision', vi: 'Quyết định', en: 'Decision', desc: 'Start with exactly one of GO / GO WITH CONDITIONS / NO-GO / NEED MORE DATA (hook/finance_accounting.md §25), then 1 sentence justifying it. Use NEED MORE DATA honestly when financialContext lacks what is needed — never force a GO/NO-GO on insufficient data.' },
                        ],
                    },
                ],
            },
        ],
        // `finance_reports` — lưu lại làm DECISION MEMO có thể tra cứu sau. Cũng nguồn cho
        // know-sync.js's syncKnowFromOutputTable (svc-aide.js's knowledge base, type:'finance').
        output: { table: 'finance_reports', fields: ['conclusion', 'analysis', 'impact', 'risk', 'recommendation', 'decision'], status: 'active' },
    },
}
