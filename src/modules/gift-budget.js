// 4 mức ngân sách cho menu "Theo ngân sách" + route tĩnh src/pages/gift/[budget].astro.
// Bucket rule: min <= price < max (tier cuối max = Infinity, không giới hạn trên).
// price lấy từ field `pricing` dạng "price~cost~unit" (xem src/sections/products/cardBold.js).
export const budgetTiers = [
	{ key: 'under-200k', label: { vi: 'Dưới 200k', en: 'Under 200k' }, min: 0, max: 200000 },
	{ key: '200-500k', label: { vi: '200 – 500k', en: '200k – 500k' }, min: 200000, max: 500000 },
	{ key: '500k-1m', label: { vi: '500k – 1 triệu', en: '500k – 1 million' }, min: 500000, max: 1000000 },
	{ key: 'premium', label: { vi: 'Cao cấp', en: 'Premium' }, min: 1000000, max: Infinity },
];
