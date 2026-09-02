import { apexEncode } from '@/services/helper.js';
import { ORDER_PRESETS, ROLE_PRESETS } from '@/services/schemas/roles-constant.js';

const TXT = {
	vi: {
		status: 'Trạng thái', email: 'Email', username: 'Username',
		password: 'Mật khẩu', displayName: 'Tên hiển thị', bio: 'Bio',
		avatar: 'Avatar', roles: 'Roles', connections: 'Connections', order: 'Order',
		pending: 'Chờ duyệt', active: 'Hoạt động', banned: 'Bị khóa', suspended: 'Tạm khóa',
		connSuffix: 'kết nối', customRole: 'tuỳ chỉnh', noRole: '—',
	},
	en: {
		status: 'Status', email: 'Email', username: 'Username',
		password: 'Password', displayName: 'Display name', bio: 'Bio',
		avatar: 'Avatar', roles: 'Roles', connections: 'Connections', order: 'Order',
		pending: 'Pending', active: 'Active', banned: 'Banned', suspended: 'Suspended',
		connSuffix: 'connections', customRole: 'custom', noRole: '—',
	},
};

// ── Coarse role display for the read-only `roles` column ────────────────────
/**
 * Display labels for EVERY preset whose full capability set is present in `caps` (a
 * table's bare capability list) — svc-roles.js's checkboxes are independent (checking
 * Editor doesn't uncheck Moderator/Admin), so a table with full admin-equivalent caps
 * has editor's AND moderator's AND admin's requirements all satisfied at once; showing
 * only the "highest" match would silently hide that the other two are effectively granted too.
 */
function matchedPresetLabels(caps) {
	const set     = new Set(caps);
	const matches = ORDER_PRESETS.filter(p => ROLE_PRESETS[p].every(c => set.has(c)));
	return matches.length ? matches.join('|') : null;
}

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
				{ value: 'pending',   label: t.pending   },
				{ value: 'active',    label: t.active    },
				{ value: 'banned',    label: t.banned    },
				{ value: 'suspended', label: t.suspended },
			],
			serverExecutor: true,
			filterable: true,
		},
		{
			label: t.email,
			field: 'email',
			type: 'text',
			width: '200px',
			required: true,
			serverExecutor: true,
			searchable: true,
			sortable: true,
		},
		{
			label: t.username,
			field: 'username',
			type: 'text',
			width: '130px',
			render: (v) => v || '—',
			serverExecutor: true,
			searchable: true,
			sortable: true,
		},
		{
			label: t.password,
			field: 'password',
			width: '120px',
			type: 'password',
			render: (v) => (v ? '●●●●●●' : '—'),
			transform: apexEncode,
		},
		{
			label: t.displayName,
			field: 'display_name',
			type: 'text',
			width: '150px',
			render: (v) => v || '—',
		},
		{
			label: t.bio,
			field: 'caption',
			type: 'textarea',
			render: (v) => v || '—',
		},
		{
			label: t.avatar,
			field: 'avatar',
			type: 'photor-upload',
		},
		{
			label: t.roles,
			field: 'roles',
			write: false, // read-only — edit via svc-roles UI, which understands the underlying granular capability tokens
			width: '200px',
			render: (v) => {
				const tokens = (v || '').split('|').filter(Boolean);
				if (!tokens.length) return t.noRole;
				if (tokens.includes('admin')) return 'Super Admin';

				const byTable = tokens.reduce((acc, tok) => {
					const dot = tok.indexOf('.');
					if (dot === -1) return acc;
					const table = tok.slice(0, dot);
					(acc[table] ??= []).push(tok.slice(dot + 1));
					return acc;
				}, {});

				// Plain string (not a lit TemplateResult) — grid cells default to
				// `white-space:nowrap`, and this also needs to stay CSV-export-safe
				// (svc-admin.js _dfExportCsv stringifies render() output for read-only cols).
				return Object.entries(byTable)
					.map(([table, caps]) => `${table}:${matchedPresetLabels(caps) ?? t.customRole}`)
					.join(', ');
			},
		},
		{
			label: t.connections,
			field: 'connections',
			write: false,
			width: '160px',
			render: (v) => {
				if (!v) return '—';
				const n = String(v).split('|').filter(Boolean).length;
				return `${n} ${t.connSuffix}`;
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
