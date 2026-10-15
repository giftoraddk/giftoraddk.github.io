/**
 * Allowlist + mức quyền cho các bảng nội dung trên D1 (`ALL_DB`, xem docStore.ts).
 *   public — ai cũng được (kể cả khách chưa đăng nhập)
 *   auth   — có Supabase JWT hợp lệ (mọi tài khoản — người mua tự đăng ký cũng có)
 *   staff  — Super Admin hoặc có ÍT NHẤT 1 quyền bảng bất kỳ (nhân viên), không phải người mua thường
 *   role   — Super Admin hoặc có token `{table}.*` trong profiles.roles (svc-roles.js cấp)
 *   owner  — list: phải lọc seller_id/buyer_id = chính caller; read: row phải có seller_id/buyer_id = caller — trừ khi có role
 *   invoices ghi KHÔNG đi đường upsert chung: data.ts chuyển qua luật riêng (invoices.ts). Xoá cả bảng / _batch luôn cần role.
 *   promos list công khai chỉ trả mã đang chạy, không riêng tư (data.ts) — mã riêng tư tra đúng `?code=` mới thấy.
 *   bump — field cộng công khai, mỗi lần đúng +1 (lượt xem/thích).
 */
export type Level = 'public' | 'auth' | 'staff' | 'role' | 'owner';

export interface TableConfig {
  read: Level;        // GET /:id
  list: Level;        // GET danh sách
  write: Level;       // PATCH (DELETE cả bảng / _batch luôn là 'role')
  bump?: string[];    // field số được cộng nguyên tử qua _bump (+1 / lần) — mức quyền 'public'
}

export const TABLES: Record<string, TableConfig> = {
  posts:     { read: 'public', list: 'public', write: 'role', bump: ['meta.views', 'meta.likes'] },
  // Tồn kho KHÔNG bump công khai (ai cũng xả kho về 0 được) — Worker tự trừ/cộng khi tạo/huỷ hoá đơn (invoices.ts)
  products:  { read: 'public', list: 'public', write: 'role' },
  // Mua hàng bắt buộc đăng nhập — hoá đơn chỉ người mua / người bán / quản trị đọc được (có tên, SĐT, địa chỉ)
  invoices:  { read: 'owner',  list: 'owner',  write: 'auth' },
  // Mã khuyến mãi — Worker kiểm + tính giảm giá lúc tạo hoá đơn (invoices.ts), quản trị tạo/sửa
  promos:    { read: 'role',   list: 'public', write: 'role' },
  orders:    { read: 'role',   list: 'role',   write: 'role' },
  inventory: { read: 'role',   list: 'role',   write: 'role' },
  staff:     { read: 'role',   list: 'role',   write: 'role' },
  customers: { read: 'role',   list: 'role',   write: 'role' },
  // Lịch sử sửa bản ghi (svc-diffs) — có cả dữ liệu người dùng, nên chỉ nhân viên (người mua cũng có tài khoản)
  revisions: { read: 'staff',  list: 'staff',  write: 'staff' },
  // Output phòng Tài chính (llm/service/talk.js duyệt job 'finance') — chỉ admin
  finance_reports: { read: 'role', list: 'role', write: 'role' },
};

export const isAppTable = (table: string) => Object.prototype.hasOwnProperty.call(TABLES, table);
