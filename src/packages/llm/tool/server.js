// src/packages/llm/tool/server.js
//
// Bảng nào nằm ở worker nào — nguồn duy nhất cho mọi file trong packages/llm.
// Bảng riêng của domain (divisions/talks/know/rel) ở llm D1; bảng nội dung app (products/posts/
// invoices/finance_reports) ở auth, cùng chỗ svc-resources đọc/ghi.
export const LLM_DB = 'DB_LLMD1'

const LLM_TABLES = new Set(['divisions', 'talks', 'know', 'rel'])

export const serverOf = table => (LLM_TABLES.has(table) ? LLM_DB : 'DB_ALL')
