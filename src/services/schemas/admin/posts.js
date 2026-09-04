const TXT = {
	vi: {
		status: 'Trạng thái', title: 'Tiêu đề', description: 'Mô tả',
		content: 'Nội dung', tags: 'Tags', score: 'Điểm',
		views: 'Lượt xem', likes: 'Lượt thích', location: 'Địa điểm',
		url: 'URL', slug: 'Slug', readingTime: 'Đọc (phút)', pics: 'Ảnh', order: 'Order',
		published: 'Đã đăng', draft: 'Nháp', hidden: 'Tạm ẩn', archived: 'Lưu trữ',
	},
	en: {
		status: 'Status', title: 'Title', description: 'Description',
		content: 'Content', tags: 'Tags', score: 'Score',
		views: 'Views', likes: 'Likes', location: 'Location',
		url: 'URL', slug: 'Slug', readingTime: 'Read (min)', pics: 'Images', order: 'Order',
		published: 'Published', draft: 'Draft', hidden: 'Hidden', archived: 'Archived',
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
				{ value: 'active',   label: t.published },
				{ value: 'draft',    label: t.draft     },
				{ value: 'inactive', label: t.hidden    },
				{ value: 'archived', label: t.archived  },
			],
			serverExecutor: true,
			filterable: true,
		},
		{
			label: t.title,
			field: 'title',
			type: 'text',
			width: '200px',
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
			width: '150px',
			multi: true,
			render: (v) => v || '—',
		},
		{
			label: t.score,
			field: 'score',
			width: '90px',
			write: false,
			render: (v) => {
				const [avg, count] = String(v || '0~0').split('~').map(Number);
				return count ? `${avg.toFixed(1)} (${count})` : '—';
			},
		},
		{
			label: t.views,
			field: 'views',
			key: 'meta.views',
			type: 'text',
			width: '160px',
			align: 'right',
			write: false,
		},
		{
			label: t.likes,
			field: 'likes',
			key: 'meta.likes',
			type: 'text',
			width: '160px',
			align: 'right',
			write: false,
		},
		{
			label: t.location,
			field: 'location',
			key: 'meta.location',
			type: 'text',
			width: '160px',
		},
		{
			label: t.url,
			field: 'url',
			key: 'meta.url',
			type: 'text',
			width: '130px',
		},
		{
			label: t.slug,
			field: 'slug',
			key: 'meta.slug',
			type: 'text',
			width: '180px',
		},
		{
			label: t.readingTime,
			field: 'reading_time',
			key: 'meta.reading_time',
			type: 'number',
			width: '110px',
			align: 'center',
		},
		{
			label: t.pics,
			field: 'pics',
			type: 'photor',
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
