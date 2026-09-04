const TXT = {
	vi: {
		status: 'Trạng thái', name: 'Tên sản phẩm', description: 'Mô tả', content: 'Nội dung', tags: 'Tags',
		score: 'Đánh giá',
		price: 'Giá bán', promo: 'Khuyến mãi', stock: 'Tồn kho', vat: 'VAT', sku: 'SKU (Mã hàng)',
		unit: 'Đơn vị', stockMeta: 'Stock meta', faq: 'FAQ', faqQuestion: 'Câu hỏi', faqAnswer: 'Trả lời',
		pics: 'Ảnh', order: 'Order',
		active: 'Kinh doanh', inactive: 'Ngừng KD', draft: 'Nháp', archived: 'Lưu trữ',
		segmentHints: 'Giá bán~Giá vốn~Đơn vị',
		promoHints: 'Giá trị giảm~Loại giảm (fixed hoặc percent)',
	},
	en: {
		status: 'Status', name: 'Product name', description: 'Description', content: 'Content', tags: 'Tags',
		score: 'Rating',
		price: 'Sale price', promo: 'Promotion', stock: 'Stock', vat: 'VAT', sku: 'SKU',
		unit: 'Unit', stockMeta: 'Stock meta', faq: 'FAQ', faqQuestion: 'Question', faqAnswer: 'Answer',
		pics: 'Images', order: 'Order',
		active: 'Active', inactive: 'Inactive', draft: 'Draft', archived: 'Archived',
		segmentHints: 'Price~Cost~Unit',
		promoHints: 'Discount value~Discount type (fixed or percent)',
	},
};

export default (lang = 'vi') => {
	const t = TXT[lang] ?? TXT.vi;
	return [
		{
			label: t.status,
			field: 'status',
			type: 'select',
			width: '160px',
			align: 'center',
			opts: [
				{ value: 'active',   label: t.active   },
				{ value: 'inactive', label: t.inactive  },
				{ value: 'draft',    label: t.draft     },
				{ value: 'archived', label: t.archived  },
			],
			serverExecutor: true,
			filterable: true,
		},
		{
			label: t.name,
			field: 'title',
			type: 'text',
			width: '180px',
			required: true,
			serverExecutor: true,
			searchable: true,
			sortable: true,
		},
		{
			label: t.description,
			field: 'description',
			type: 'textarea',
			width: '100px',
			align: 'center',
		},
		{
			label: t.content,
			field: 'content',
			type: 'editor',
			width: '100px',
			align: 'center',
		},
		{
			label: t.tags,
			field: 'tags',
			type: 'text',
			width: '160px',
			multi: true,
			render: (v) => v || '—',
		},
		{
			label: t.score,
			field: 'score',
			type: 'text',   // required for CSV import to accept this column — see `csvWrite` below
			width: '90px',
			write: false,   // read-only in grid/edit form — computed from customer reviews, not hand-typed
			csvWrite: true, // ...but CSV import may still seed/update it (see svc-admin.js _dfImportCsv)
			render: (v) => {
				const [avg, count] = String(v || '0~0').split('~').map(Number);
				return count ? `${avg.toFixed(1)} (${count})` : '—';
			},
		},
		{
			label: t.price,
			field: 'pricing',
			width: '140px',
			type: 'text',
			align: 'right',
			segments: 3,
			segmentHints: t.segmentHints,
			currency: true, // 2 phần đầu (giá bán/giá vốn) là tiền đồng VN — xem svc-assist.js _promptSchema

			render: (v) => {
				const p = String(v || '').split('~')[0];
				return p ? Number(p).toLocaleString('vi-VN') + ' đ' : '—';
			},
		},
		{
			label: t.promo,
			field: 'promo',
			width: '140px',
			type: 'text',
			align: 'right',
			segments: 2,
			segmentHints: t.promoHints,
			render: (v) => {
				const [discount, type] = String(v || '').split('~');
				if (!discount || Number(discount) <= 0) return '—';
				return type === 'percent' ? `${discount}%` : Number(discount).toLocaleString('vi-VN') + ' đ';
			},
		},
		{
			label: t.stock,
			field: 'quantity',
			type: 'number',
			width: '110px',
			align: 'right',
			suffix: '',
		},
		{
			label: t.vat,
			field: 'vat',
			type: 'text',
			width: '70px',
			align: 'center',
			render: (v) => (v && v !== '0' ? `${parseFloat(v) * 100}%` : '—'),
		},
		{
			label: t.sku,
			field: 'sku',
			key: 'meta.sku',
			type: 'text',
			width: '160px',
		},
		{
			label: t.unit,
			field: 'unit',
			key: 'meta.unit',
			type: 'text',
			width: '80px',
		},
		{
			label: t.stockMeta,
			field: 'stock',
			key: 'meta.stock',
			type: 'number',
			width: '90px',
		},
		{
			label: t.faq,
			field: 'faq',
			key: 'meta.faq',
			type: 'repeater',
			itemSchema: [
				{ field: 'q', label: t.faqQuestion, type: 'text' },
				{ field: 'a', label: t.faqAnswer, type: 'text' },
			],
		},
		{
			label: t.pics,
			field: 'pics',
			type: 'photor',
			multiple: true,
		},
		{
			label: t.order,
			field: 'index',
			type: 'number',
			width: '45px',
			align: 'center',
			render: (_v, row) => row.index ?? '—',
		},
	];
};
