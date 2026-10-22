import { accessRows } from '@/packages/auth/tool/roles.js';

// `password` field removed — user identity now lives in Supabase Auth (see
// hook/cloudflare-worker.md, svc-auth.js), which owns credential storage itself. There's no
// longer a password value on the `profiles` row for this admin table to edit, and a `profiles`
// row can't be pre-created for someone who doesn't have a Supabase Auth account yet anyway (its
// `id` is a foreign key to `auth.users`, see src/packages/auth/worker/supabase/schema.sql). New staff accounts:
// have them sign in once via the normal login page (self-registers their `profiles` row), then
// grant roles here / via svc-roles.js as before.

const TXT = {
	vi: {
		status: 'Trạng thái', email: 'Email', username: 'Username',
		displayName: 'Tên hiển thị', bio: 'Bio',
		avatar: 'Avatar', roles: 'Roles', connections: 'Connections', order: 'Order', notes: 'Notes (node riêng)',
		pending: 'Chờ duyệt', active: 'Hoạt động', banned: 'Bị khóa', suspended: 'Tạm khóa',
		connSuffix: 'kết nối', customRole: 'tuỳ chỉnh', noRole: '—',
	},
	en: {
		status: 'Status', email: 'Email', username: 'Username',
		displayName: 'Display name', bio: 'Bio',
		avatar: 'Avatar', roles: 'Roles', connections: 'Connections', order: 'Order', notes: 'Notes (own nodes)',
		pending: 'Pending', active: 'Active', banned: 'Banned', suspended: 'Suspended',
		connSuffix: 'connections', customRole: 'custom', noRole: '—',
	},
};

// ── Coarse role display for the read-only `roles` column ────────────────────
/**
 * One accessRows() row as "posts:EDIT+REVIEW~own" (hook/AUTH_V2.rst) — legacy capability tokens are
 * folded into levels, bundle tables with the same access into their main table; leftovers read as "custom".
 */
function accessLabel({ table, levels, scope, custom }, t) {
	const base = levels.length ? `${levels.join('+')}${scope === 'all' ? '' : `~${scope}`}` : '';
	return `${table}:${custom.length ? (base ? `${base}+${t.customRole}` : t.customRole) : base}`;
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
			type: 'photor',
		},
		{
			// JSON { nodes: [...] } the user builds on /system/app (svc-node-builder.js) — form only, not a list column
			label: t.notes,
			field: 'notes',
			type: 'textarea',
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

				// Plain string (not a lit TemplateResult) — grid cells default to
				// `white-space:nowrap`, and this also needs to stay CSV-export-safe
				// (svc-resources.js _dfExportCsv stringifies render() output for read-only cols).
				return accessRows(v).map(row => accessLabel(row, t)).join(', ') || t.noRole;
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
			field: 'rank', // tools/rank.js — chỉ hiển thị (không type → không vào form), đổi bằng kéo-thả
			width: '45px',
			align: 'center',
			render: (_v, row) => row.rank || '—',
		},
	];
};
