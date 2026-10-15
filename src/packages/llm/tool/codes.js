// src/packages/llm/tool/codes.js
//
// Mã máy trong text AI viết — dạng [CODE] chữ hoa, vd tín hiệu "[WEAK]" của bước Tích hợp. Worker CỐ Ý giữ lại trong
// dữ liệu (bước sau đọc nó để ra quyết định), sếp không cần thấy → mọi chỗ HIỂN THỊ text field đi qua hideCodes.
// Cùng dạng ngoặc với nhãn dữ liệu của prompt ([FINANCIAL_CONTEXT] — worker/src/fn/artifacts.ts dataLabel), nên nhãn
// nào lọt qua bộ lọc Worker cũng được ẩn luôn. ≥ 3 ký tự hoa: "[A]" (phương án A) hay "[sic]" vẫn giữ.
const CODE = /[ \t]*[—–]?[ \t]*\[[A-Z][A-Z0-9_]{2,}\]/g

/** Text field như sếp đọc: bỏ mọi [CODE] cùng gạch nối " — " đứng trước nó. */
export const hideCodes = (text) => String(text ?? '').replace(CODE, '')
