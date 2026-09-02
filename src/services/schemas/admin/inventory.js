const TXT = {
	vi: {
		status: 'Trạng thái', name: 'Tên hàng hóa', description: 'Mô tả', tags: 'Tags',
		stock: 'Tồn kho', price: 'Giá/đv', order: 'Order',
		active: 'Đang dùng', inactive: 'Ngừng dùng', draft: 'Nháp', archived: 'Lưu trữ',
		outOfStock: 'HẾT HÀNG', lowStock: 'Còn ít',
		segmentHints: 'Giá bán~Giá vốn~Đơn vị',
	},
	en: {
		status: 'Status', name: 'Item name', description: 'Description', tags: 'Tags',
		stock: 'Stock', price: 'Cost/unit', order: 'Order',
		active: 'Active', inactive: 'Inactive', draft: 'Draft', archived: 'Archived',
		outOfStock: 'OUT OF STOCK', lowStock: 'Low stock',
		segmentHints: 'Price~Cost~Unit',
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
			label: t.tags,
			field: 'tags',
			type: 'text',
			width: '160px',
			multi: true,
			render: (v) => v || '—',
			sortable: true,
		},
		{
			label: t.stock,
			field: 'quantity',
			type: 'number',
			width: '120px',
			align: 'right',
			render: (v) => {
				const n = Number(v);
				return n === 0 ? t.outOfStock : n === -1 ? '∞' : n <= 5 ? t.lowStock : String(n);
			},
		},
		{
			label: t.price,
			field: 'pricing',
			width: '120px',
			type: 'text',
			segments: 3,
			segmentHints: t.segmentHints,
			currency: true, // 2 phần đầu (giá bán/giá vốn) là tiền đồng VN — xem svc-assist.js _promptSchema

			render: (v) => {
				const [, c, u] = String(v || '').split('~');
				return c ? Number(c).toLocaleString('vi-VN') + ' đ' + (u ? `/${u}` : '') : '—';
			},
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
