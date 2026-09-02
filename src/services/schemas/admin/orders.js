const TXT = {
	vi: {
		date: 'Ngày', title: 'Tiêu đề', status: 'Trạng thái', orderId: 'Mã đơn',
		description: 'Mô tả', total: 'Tổng tiền', payment: 'Thanh toán',
		quantity: 'Số món', time: 'Giờ', staffName: 'NV xử lý',
		paid: 'Đã thanh toán', processing: 'Đang xử lý', delivering: 'Đang giao',
		completed: 'Hoàn thành', cancelled: 'Đã hủy',
		segmentHints: 'Tổng~Giảm~Đơn vị',
	},
	en: {
		date: 'Date', title: 'Title', status: 'Status', orderId: 'Order ID',
		description: 'Description', total: 'Total', payment: 'Payment',
		quantity: 'Items', time: 'Time', staffName: 'Processed by',
		paid: 'Paid', processing: 'Processing', delivering: 'Delivering',
		completed: 'Completed', cancelled: 'Cancelled',
		segmentHints: 'Total~Discount~Unit',
	},
};

export default (lang = 'vi') => {
	const t = TXT[lang] ?? TXT.vi;
	return [
		{
			label: t.date,
			field: 'meta',
			width: '160px',
			write: false,
			render: (v) => {
				try {
					const m = typeof v === 'string' ? JSON.parse(v || '{}') : (v ?? {});
					return m.date || '';
				} catch { return ''; }
			},
			serverExecutor: true,
			searchable: true,
			sortable: true,
		},
		{
			label: t.title,
			field: 'title',
			type: 'text',
			width: '160px',
			serverExecutor: true,
			searchable: true,
			sortable: true,
		},
		{
			label: t.status,
			field: 'status',
			type: 'select',
			width: '160px',
			align: 'center',
			opts: [
				{ value: 'paid',        label: t.paid        },
				{ value: 'processing',  label: t.processing  },
				{ value: 'delivering',  label: t.delivering  },
				{ value: 'completed',   label: t.completed   },
				{ value: 'cancelled',   label: t.cancelled   },
			],
			serverExecutor: true,
			filterable: true,
		},
		{
			label: t.orderId,
			field: 'id',
			width: '180px',
			write: false,
		},
		{
			label: t.description,
			field: 'description',
			type: 'textarea',
			width: '100px',
			align: 'center',
		},
		{
			label: t.total,
			field: 'pricing',
			width: '160px',
			type: 'text',
			align: 'right',
			segments: 3,
			segmentHints: t.segmentHints,
			currency: true, // 2 phần đầu (tổng/giảm) là tiền đồng VN — xem svc-assist.js _promptSchema

			render: (v) => {
				const p = String(v || '').split('~')[0];
				return p ? Number(p).toLocaleString('vi-VN') + ' đ' : '—';
			},
		},
		{
			label: t.payment,
			field: 'tags',
			type: 'text',
			width: '120px',
		},
		{
			label: t.quantity,
			field: 'quantity',
			type: 'number',
			width: '100px',
			align: 'right',
		},
		{
			label: t.time,
			field: 'meta',
			width: '70px',
			write: false,
			render: (v) => {
				try {
					const m = typeof v === 'string' ? JSON.parse(v || '{}') : (v ?? {});
					return m.time || '';
				} catch { return ''; }
			},
		},
		{
			label: t.staffName,
			field: 'meta',
			width: '110px',
			write: false,
			render: (v) => {
				try {
					const m = typeof v === 'string' ? JSON.parse(v || '{}') : (v ?? {});
					return m.staffName || '';
				} catch { return ''; }
			},
		},
	];
};
