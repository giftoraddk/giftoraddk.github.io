// src/webs/report/tools/finance-data.js
//
// Tính toán THUẦN (không I/O, không Lit) cho dashboard tài chính (/admin/report — xem
// hook/finance_accounting.md). Nhận `invoices`/`products` ĐÃ TẢI SẴN — không tự gọi Firestore, giữ
// đúng ranh giới "logic" tách khỏi "I/O"/"render" đã dùng xuyên codebase này (xem hook/PAY.rst
// §3.12's tools/render.js). Tái dùng lại `parseInvoiceItems`/`isPendingPayment`/`needsRefund` từ
// domain `pay` — đây là chiều dùng CHUNG hàm THUẦN, không phải report phụ thuộc ngược vào state/UI
// của pay (giống cách `webs/bay` được phép dùng `webs/pay`, xem hook/PAY.rst §1 điểm 4).
//
// GIỚI HẠN DỮ LIỆU THẬT — đọc trước khi thêm mục mới (hook/finance_accounting.md §2 "Không bịa
// số liệu"):
// - KHÔNG có collection chi phí/payroll/ngân sách chi tiêu nào trong hệ thống -> KHÔNG tính được
//   Cash Flow đầy đủ (Operating/Investing/Financing) hay Income Statement thật (Opex/Net Profit) —
//   chỉ tính được phần "tiền thu về" (từ invoice) + 1 mục tiêu doanh thu do admin tự nhập
//   (collection `settings`, xem computeRisk's `target`).
// - `invoice.items` (pipe-string, xem hook/SCHEMA.rst) KHÔNG lưu productId/giá vốn tại thời điểm
//   bán — Gross Margin dưới đây là ƯỚC TÍNH theo giá vốn HIỆN TẠI của `products` (so khớp theo
//   TÊN, không phải id) — sai lệch nếu giá vốn đã đổi từ lúc bán hoặc sản phẩm đã đổi tên/bị xoá.
//   LUÔN hiển thị kèm nhãn "ước tính" + mức độ tin cậy (`confidence`) — không dùng để kết luận số
//   liệu chính thức (hook/finance_accounting.md §30 DATA CONFIDENCE).
// - Mô hình này thu tiền TRƯỚC khi giao hàng (invoice chỉ được tạo SAU khi buyer xác nhận đã thanh
//   toán, xem hook/PAY.rst §1) — không có "công nợ phải thu" kiểu tín dụng truyền thống. "Công nợ"
//   ở đây map sang 2 tín hiệu THẬT có sẵn: đơn đang CHỜ seller xác nhận đã nhận tiền
//   (`isPendingPayment` — rủi ro buyer tự nhận đã trả nhưng chưa xác minh) và đơn CẦN hoàn tiền
//   (`needsRefund` — nợ THẬT phải trả lại khách, huỷ/trả hàng nhưng chưa hoàn tiền).
import { parseInvoiceItems, isPendingPayment, needsRefund } from '@/webs/pay/tools/service.js';

function _total(inv) { return Number((inv.summary || '0~0~0').split('~')[2]) || 0; }
const _month = inv => (inv.issued_at || '').slice(0, 7);
const _isLost = inv => ['cancelled', 'returned'].includes(inv.meta?.sub);

// KPI tổng quan — gross (mọi invoice, tiền đã thu thật), lost (huỷ/trả — không còn là doanh thu
// thật dù tiền đã thu lúc đầu), net = gross - lost.
export function computeOverview(invoices) {
    const gross = invoices.reduce((s, i) => s + _total(i), 0);
    const lostInvoices = invoices.filter(_isLost);
    const lost = lostInvoices.reduce((s, i) => s + _total(i), 0);
    const orderCount = invoices.length;
    return {
        gross, lost, net: gross - lost,
        orderCount, lostCount: lostInvoices.length,
        avgOrder: orderCount ? Math.round(gross / orderCount) : 0,
    };
}

// [[Tháng 'YYYY-MM', doanh thu ròng], ...] sắp tăng dần — chỉ tính đơn KHÔNG bị huỷ/trả.
export function revenueByMonth(invoices) {
    const map = new Map();
    for (const inv of invoices) {
        if (_isLost(inv)) continue;
        const m = _month(inv);
        if (!m) continue;
        map.set(m, (map.get(m) ?? 0) + _total(inv));
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

// Ước tính Gross Profit/Margin — xem "GIỚI HẠN DỮ LIỆU THẬT" ở đầu file. So khớp item theo TÊN
// (không phân biệt hoa/thường) với `products.pricing`'s slot cost (`price~cost~unit`).
export function estimateMargin(invoices, products) {
    const costByName = new Map();
    for (const p of products) {
        const [, cost] = String(p.pricing || '').split('~');
        if (p.title && cost) costByName.set(p.title.trim().toLowerCase(), Number(cost) || 0);
    }
    let revenue = 0, cogs = 0, matched = 0, unmatched = 0;
    for (const inv of invoices) {
        if (_isLost(inv)) continue;
        for (const item of parseInvoiceItems(inv.items)) {
            revenue += item.price * item.qty;
            const cost = costByName.get((item.name || '').trim().toLowerCase());
            if (cost != null) { cogs += cost * item.qty; matched++; }
            else unmatched++;
        }
    }
    const grossProfit = revenue - cogs;
    const total = matched + unmatched;
    // LOW nếu >30% item không khớp được sản phẩm nào (tên đã đổi/sản phẩm đã xoá) — xem
    // hook/finance_accounting.md §30 DATA CONFIDENCE.
    const confidence = total === 0 ? 'LOW' : (unmatched / total > 0.3 ? 'LOW' : (unmatched > 0 ? 'MEDIUM' : 'HIGH'));
    return {
        revenue, cogs, grossProfit,
        grossMarginPct: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
        confidence, matched, unmatched,
    };
}

// Công nợ — 2 tín hiệu thật, xem "GIỚI HẠN DỮ LIỆU THẬT" ở đầu file.
export function computeReceivablesPayables(invoices) {
    const pendingConfirm = invoices.filter(inv => isPendingPayment(inv.meta || {}));
    const pendingRefund = invoices.filter(inv => needsRefund(inv.meta || {}));
    return {
        pendingConfirmCount: pendingConfirm.length,
        pendingConfirmAmount: pendingConfirm.reduce((s, i) => s + _total(i), 0),
        pendingRefundCount: pendingRefund.length,
        pendingRefundAmount: pendingRefund.reduce((s, i) => s + _total(i), 0),
    };
}

const _RISK_TXT = {
    vi: {
        pendingRefund: (n, amount) => `${n} đơn cần hoàn tiền (${amount.toLocaleString('vi-VN')}đ) chưa xử lý`,
        lostRate: (pct, threshold) => `Tỷ lệ huỷ/trả 30 ngày qua ${pct}% — vượt ngưỡng đề xuất ${threshold}%`,
        belowTarget: pct => `Doanh thu tháng gần nhất chỉ đạt ${pct}% mục tiêu đã đặt`,
        nearTarget: pct => `Doanh thu tháng gần nhất đạt ${pct}% mục tiêu đã đặt`,
        clear: 'Không phát hiện tín hiệu bất thường theo ngưỡng đề xuất hiện tại',
    },
    en: {
        pendingRefund: (n, amount) => `${n} order(s) still owe a refund (${amount.toLocaleString('en-US')}đ) unresolved`,
        lostRate: (pct, threshold) => `Cancel/return rate over the last 30 days is ${pct}% — above the ${threshold}% suggested threshold`,
        belowTarget: pct => `Latest month's revenue only reached ${pct}% of the set target`,
        nearTarget: pct => `Latest month's revenue reached ${pct}% of the set target`,
        clear: 'No unusual signal detected against the current suggested thresholds',
    },
};

// Rủi ro GREEN/YELLOW/ORANGE/RED — ngưỡng ĐỀ XUẤT, chưa phải quy định chính thức của doanh nghiệp
// (hook/finance_accounting.md §29 — bắt buộc phải nói rõ điều này ở UI, không ngầm định là chuẩn).
// `target` (optional) — mục tiêu doanh thu tháng do admin tự nhập, xem collection `settings`.
// `lang` — chỉ ảnh hưởng NGÔN NGỮ của `reasons` (UI hiển thị); `level` luôn là 1 trong 4 mã cố
// định, không dịch.
export function assessRisk(invoices, { target = 0, lang = 'vi' } = {}) {
    const t = _RISK_TXT[lang] ?? _RISK_TXT.vi;
    const order = ['GREEN', 'YELLOW', 'ORANGE', 'RED'];
    let level = 'GREEN';
    const reasons = [];
    const bump = (lvl, reason) => {
        if (order.indexOf(lvl) > order.indexOf(level)) level = lvl;
        reasons.push(reason);
    };

    const { pendingRefundCount, pendingRefundAmount } = computeReceivablesPayables(invoices);
    if (pendingRefundCount > 0) {
        bump(pendingRefundCount >= 5 ? 'RED' : 'ORANGE', t.pendingRefund(pendingRefundCount, pendingRefundAmount));
    }

    const last30 = invoices.filter(i => i.issued_at && Date.now() - new Date(i.issued_at).getTime() < 30 * 86400000);
    const lostRate = last30.length ? last30.filter(_isLost).length / last30.length : 0;
    if (lostRate > 0.3) bump('RED', t.lostRate(Math.round(lostRate * 100), 30));
    else if (lostRate > 0.15) bump('ORANGE', t.lostRate(Math.round(lostRate * 100), 15));

    const months = revenueByMonth(invoices);
    if (target > 0 && months.length) {
        const [, latestRevenue] = months[months.length - 1];
        const pct = Math.round((latestRevenue / target) * 100);
        if (pct < 50) bump('RED', t.belowTarget(pct));
        else if (pct < 80) bump('YELLOW', t.nearTarget(pct));
    }

    if (!reasons.length) reasons.push(t.clear);
    return { level, reasons };
}
