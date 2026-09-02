const TXT = {
	vi: {
		status: 'Trạng thái', name: 'Họ tên', description: 'Ghi chú',
		role: 'Vai trò', shift: 'Ca làm', phone: 'ĐT', salary: 'Lương (đ)', order: 'Order',
		active: 'Đang làm', inactive: 'Nghỉ',
		manager: 'Quản lý', barista: 'Pha chế', cashier: 'Thu ngân',
		morning: 'Ca sáng (6–14h)', afternoon: 'Ca chiều (14–22h)', full: 'Cả ngày (6–22h)',
		segmentHints: 'Lương~Phụ cấp~Đơn vị',
	},
	en: {
		status: 'Status', name: 'Full name', description: 'Notes',
		role: 'Role', shift: 'Shift', phone: 'Phone', salary: 'Salary', order: 'Order',
		active: 'Working', inactive: 'Off',
		manager: 'Manager', barista: 'Barista', cashier: 'Cashier',
		morning: 'Morning (6–14h)', afternoon: 'Afternoon (14–22h)', full: 'Full day (6–22h)',
		segmentHints: 'Salary~Allowance~Unit',
	},
};

export default (lang = 'vi') => {
	const t = TXT[lang] ?? TXT.vi;
	const ROLES  = { manager: t.manager, barista: t.barista, cashier: t.cashier };
	const SHIFTS = { morning: t.morning, afternoon: t.afternoon, full: t.full };
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
			label: t.role,
			field: 'tags',
			width: '160px',
			type: 'select',
			opts: [
				{ value: 'manager', label: t.manager },
				{ value: 'barista', label: t.barista  },
				{ value: 'cashier', label: t.cashier  },
			],
			render: (v) => ROLES[v] || v || '—',
		},
		{
			label: t.shift,
			field: 'shift',
			key: 'meta.shift',
			width: '180px',
			type: 'select',
			opts: [
				{ value: 'morning',   label: t.morning   },
				{ value: 'afternoon', label: t.afternoon  },
				{ value: 'full',      label: t.full       },
			],
			render: (v) => SHIFTS[v] || v || '—',
			filterable: true,
		},
		{
			label: t.phone,
			field: 'phone',
			key: 'meta.phone',
			type: 'text',
			width: '180px',
		},
		{
			label: t.salary,
			field: 'pricing',
			width: '160px',
			type: 'text',
			align: 'right',
			segments: 3,
			segmentHints: t.segmentHints,
			currency: true, // 2 phần đầu (lương/phụ cấp) là tiền đồng VN — xem svc-assist.js _promptSchema

			render: (v) => {
				const p = String(v || '').split('~')[0];
				return p ? Number(p).toLocaleString('vi-VN') + ' đ' : '—';
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
