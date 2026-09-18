// src/webs/llm/tools/revenue-helper.js
//
// Tính toán THUẦN (không I/O, không Lit) cho <svc-finance-report> — dashboard "Phân tích doanh
// thu sản phẩm". Cloned verbatim from division/tools/revenue-helper.js (domain-isolation clone —
// file này không đụng gì tới `divisions`/`talks`, chỉ đọc `invoices`+`products` trực tiếp, nên
// không có gì phải đổi sang D1 cả — clone chỉ để giữ đúng quy tắc "không import chéo domain").
// Nguồn dữ liệu vẫn là `invoices` + `products` (Firestore DB_ALL, KHÔNG có bảng
// orders/orderItems/categories riêng — xem hook/SCHEMA.rst), nên bước "join" map sang: 1 invoice ~
// 1 "order", `parseInvoiceItems(invoice.items)` ~ "orderItems", category lấy từ tag đầu tiên của
// product khớp TÊN.
//
// KHÔNG dùng chung với tools/finance-helper.js (dùng bởi svc-talk.js's division 'finance' — dòng
// tiền/công nợ/rủi ro cấp INVOICE) — file đó giữ nguyên, không đụng vào. File này chỉ phục vụ
// svc-finance-report.js's dashboard cấp sản phẩm.
//
// GIỚI HẠN DỮ LIỆU THẬT: `parseInvoiceItems` (webs/pay/tools/service.js) chỉ tách được
// name~price~unit~qty — không có slot `discount` riêng (giá hiển thị đã là giá cuối cùng) nên
// `discount` luôn = 0 ở đây. `category` lấy từ TAG ĐẦU TIÊN của product khớp tên (hệ thống không
// có bảng categories riêng).
import { parseInvoiceItems } from '@/webs/pay/tools/service.js';

const _isLost = (inv) => ['cancelled', 'returned'].includes(inv.meta?.sub);

function _productMetaByName(products) {
	const map = new Map();
	for (const p of products) {
		if (!p.title) continue;
		const [, cost] = String(p.pricing || '').split('~');
		const category = (p.tags || '').split('|').filter(Boolean)[0] || '';
		map.set(p.title.trim().toLowerCase(), { cost: Number(cost) || 0, category });
	}
	return map;
}

// Bước join + clean gộp làm 1 — mỗi phần tử = 1 dòng sản phẩm hợp lệ trong 1 invoice hợp lệ
// (không huỷ/trả, quantity > 0). `date` chuẩn hoá về 'YYYY-MM-DD' cho filter/aggregate.
export function buildRows(invoices, products) {
	const metaByName = _productMetaByName(products);
	const rows = [];
	for (const inv of invoices) {
		if (_isLost(inv)) continue;
		const date = (inv.issued_at || '').slice(0, 10);
		if (!date) continue;
		for (const item of parseInvoiceItems(inv.items)) {
			if (!item.name || item.qty <= 0) continue;
			const meta = metaByName.get(item.name.trim().toLowerCase());
			const revenue = item.qty * item.price;
			const cost = item.qty * (meta?.cost || 0);
			rows.push({
				date, productName: item.name, category: meta?.category || '',
				quantity: item.qty, unitPrice: item.price, discount: 0,
				revenue, cost, profit: revenue - cost, matched: !!meta,
			});
		}
	}
	return rows;
}

// Filter theo khoảng ngày + danh mục + sản phẩm, 'all'/rỗng = không lọc field đó.
export function filterData(rows, { startDate = '', endDate = '', category = 'all', product = 'all' } = {}) {
	return rows.filter((r) => {
		const matchDate = (!startDate || r.date >= startDate) && (!endDate || r.date <= endDate);
		const matchCategory = !category || category === 'all' || r.category === category;
		const matchProduct = !product || product === 'all' || r.productName === product;
		return matchDate && matchCategory && matchProduct;
	});
}

// KPI tổng quan từ filteredData.
export function calculateDashboard(rows) {
	const revenue = rows.reduce((s, r) => s + r.revenue, 0);
	const cost = rows.reduce((s, r) => s + r.cost, 0);
	const profit = revenue - cost;
	const units = rows.reduce((s, r) => s + r.quantity, 0);
	const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
	return { revenue, cost, profit, units, margin };
}

// Tăng trưởng so với kỳ trước, tránh chia cho 0.
export function calculateGrowth(current, previous) {
	if (!previous) return 0;
	return ((current - previous) / previous) * 100;
}

// Khoảng ngày liền trước, CÙNG độ dài với [startDate, endDate] — dùng để tính "so với kỳ trước".
export function previousPeriod(startDate, endDate) {
	if (!startDate || !endDate) return { startDate: '', endDate: '' };
	const start = new Date(`${startDate}T00:00:00Z`);
	const end = new Date(`${endDate}T00:00:00Z`);
	const lengthMs = end.getTime() - start.getTime();
	const prevEnd = new Date(start.getTime() - 86400000);
	const prevStart = new Date(prevEnd.getTime() - lengthMs);
	return { startDate: prevStart.toISOString().slice(0, 10), endDate: prevEnd.toISOString().slice(0, 10) };
}

const _pad2 = (n) => String(n).padStart(2, '0');
// Local Y-M-D string — tránh `toISOString()` (quy về UTC, có thể lệch ngày theo múi giờ local).
const _ymd = (d) => `${d.getFullYear()}-${_pad2(d.getMonth() + 1)}-${_pad2(d.getDate())}`;

// Filter mặc định khi dashboard mở lần đầu: trọn 1 tháng dương lịch LIỀN TRƯỚC tháng hiện tại.
// `new Date(y, m, 0)` = ngày cuối cùng của tháng (m-1) — mẹo chuẩn của JS Date.
export function lastMonthRange(today = new Date()) {
	const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
	const end = new Date(today.getFullYear(), today.getMonth(), 0);
	return { startDate: _ymd(start), endDate: _ymd(end) };
}

// Revenue & Profit theo tháng, sort tăng dần theo tháng.
export function aggregateMonthly(rows) {
	const map = new Map();
	for (const r of rows) {
		const month = r.date.slice(0, 7);
		if (!map.has(month)) map.set(month, { month, revenue: 0, profit: 0 });
		const m = map.get(month);
		m.revenue += r.revenue; m.profit += r.profit;
	}
	return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

// 'YYYY-MM' -> 'ThN' (vi) / 'MN' (en) cho trục biểu đồ.
export function monthLabel(monthKey, lang = 'vi') {
	const n = Number((monthKey || '').split('-')[1]) || 0;
	return lang === 'en' ? `M${n}` : `Th${n}`;
}

// Top N sản phẩm, mặc định sort theo SỐ LƯỢNG (không phải doanh thu).
export function getTopProducts(rows, limit = 10, metric = 'quantity') {
	const map = new Map();
	for (const r of rows) {
		if (!map.has(r.productName)) map.set(r.productName, { productName: r.productName, quantity: 0, revenue: 0, profit: 0 });
		const p = map.get(r.productName);
		p.quantity += r.quantity; p.revenue += r.revenue; p.profit += r.profit;
	}
	return [...map.values()].sort((a, b) => b[metric] - a[metric]).slice(0, limit);
}

// Toàn bộ sản phẩm, sort giảm dần theo revenue, kèm margin — dùng cho bar chart + bảng chi tiết
// (dòng "Tổng cộng" phải tính lại từ CHÍNH `rows` truyền vào, không phải slice Top 10).
export function aggregateByProduct(rows) {
	const map = new Map();
	for (const r of rows) {
		if (!map.has(r.productName)) map.set(r.productName, { productName: r.productName, quantity: 0, revenue: 0, cost: 0, profit: 0 });
		const p = map.get(r.productName);
		p.quantity += r.quantity; p.revenue += r.revenue; p.cost += r.cost; p.profit += r.profit;
	}
	return [...map.values()]
		.map((p) => ({ ...p, margin: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0 }))
		.sort((a, b) => b.revenue - a.revenue);
}

// Tuỳ chọn cho 2 dropdown filter — categories luôn tính từ TOÀN BỘ rows (không phụ thuộc filter
// hiện tại, tránh dropdown tự thu hẹp dần khi người dùng chọn); products lọc theo category đã chọn
// (nếu có) để danh sách sản phẩm không lẫn danh mục khác.
export function buildFilterOptions(allRows, category = 'all') {
	const categories = [...new Set(allRows.map((r) => r.category).filter(Boolean))].sort();
	const scoped = category && category !== 'all' ? allRows.filter((r) => r.category === category) : allRows;
	const products = [...new Set(scoped.map((r) => r.productName).filter(Boolean))].sort();
	return { categories, products };
}

// Filter "currency" — hệ thống LƯU mọi giá trị bằng VND — không có bảng tỷ giá real-time nào tích
// hợp, nên quy đổi hiển thị dùng 1 hằng số tỷ giá cố định. CHỈ dùng cho MỤC ĐÍCH HIỂN THỊ dashboard
// này — không dùng hằng số này cho bất kỳ tính toán/ghi sổ tài chính chính thức nào. `currency`:
// 'vi' = giữ nguyên VND, 'en' = quy đổi + hiển thị USD (locale en-US).
const VND_PER_USD = 25000;

// Quy đổi THUẦN (không format) — export riêng vì svc-graph's `dataset.source` cần NHẬN giá trị đã
// quy đổi (số thật, không phải chuỗi) để trục/tooltip/table nội bộ của <svc-graph> tự đúng theo
// currency đang chọn — format lại value đó (fmtCompactDisplay bên dưới) KHÔNG được convert thêm
// lần nữa. Làm tròn tới 2 chữ số thập phân NGAY tại đây (không phải lúc format).
export function convertCurrency(vndValue, currency) {
	const n = Number(vndValue) || 0;
	if (currency !== 'en') return n;
	return Math.round((n / VND_PER_USD) * 100) / 100;
}

// Format tiền đầy đủ (convert + format 1 bước), dùng cho KPI/bảng.
export function fmtMoney(vndValue, currency = 'vi') {
	const value = convertCurrency(vndValue, currency);
	return currency === 'en'
		? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
		: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}

// Format rút gọn cho nhãn trục/cột biểu đồ (vd "1.14B", "980M").
function fmtCompact(value) {
	const n = Number(value) || 0;
	const abs = Math.abs(n);
	if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
	if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
	if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
	return String(n);
}

// Format-ONLY, kèm ký hiệu tiền tệ — nhận `value` ĐÃ quy đổi sẵn (qua convertCurrency), dùng cho
// axisLabel/series-label/tooltip formatter của svc-graph.
export function fmtCompactDisplay(value, currency = 'vi') {
	const compact = fmtCompact(value);
	return currency === 'en' ? `$${compact}` : `${compact}đ`;
}
