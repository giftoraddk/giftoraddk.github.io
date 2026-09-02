import { getStyleOpts } from '@/services/helper';

export const hashtags = ['showcase', 'image', 'simple', 'slider'];

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`, xem svc-bay-sections.js)
// — data luôn `data[0]` duy nhất: `title` là field top-level của Tier 1 (heading "Flash Coffee"),
// còn danh sách ảnh slider (nhiều item) nằm NESTED trong `slider` (tên field khớp tên tier marker
// `slider` mà Tier 0 dùng, xem Tier 0's `dataKey: 'slider'` bên dưới). `image` đổi thành `pics` —
// khớp field chuẩn records.js (mọi domain khác dùng `pics` cho ảnh).
export const data = [
	{
		title: 'Flash Coffee',
		slider: [
			{ pics: 'https://i.ibb.co/XrgDTmSb/cafe-a.jpg' },
			{ pics: 'https://i.ibb.co/1pkwcpk/cafe-b.jpg' },
			{ pics: 'https://i.ibb.co/PvSkpWS9/cafe-c.jpg' },
			{ pics: 'https://i.ibb.co/Vc1dh9fn/cafe-d.jpg' },
			{ pics: 'https://i.ibb.co/4ZxQ4ryT/cafe-e.jpg' },
			{ pics: 'https://i.ibb.co/SLx8HwG/cafe-f.jpg' },
		],
	},
];

const baseConfig = {
	tiersCol: [[12], 12],
	tiers: [
		[{
			// items — đọc từ data[0].slider (dataKey), KHÔNG phải top-level data (chỉ có 1 record)
			dataKey: 'slider',
			groupCol: ['12', '12'],
			groupRow: ['auto', 'auto'],
			groupJustify: ['none', 'none'],
			groupStyle: [{}, { padding: '1.25rem 1.5rem 1.5rem' }],
			makes: [
				[{ bit: 'pics', opt: { mode: 'gallery', rounded: '1.75rem', stys: { width: '100%', aspectRatio: '21/9', objectFit: 'cover', display: 'block' } } }],
			],
			stys: { overflow: 'hidden' },
			bg: { ...getStyleOpts({ rounded: '1.75rem', gradient: false }) },
			slider: { autoplay: 5000, loop: true, slides: 1, spacing: 0, nav: false, dots: false },
		}],
		{
      // intro
      groupCol:     [12],
      groupRow:     ['auto'],
      groupJustify: ['center'],
      groupStyle: [
        { padding: '2.5rem 0' },
      ],
      makes: [
        [
          {
            bit: 'title',
            opt: {
              mode: 'h1',
							motion: true, word: false, effect: 'scatterIn',
              stys: {
                fontSize: 'clamp(2rem, 4vw, 3.5rem)', // custom fontSize
							}
            }
          },
        ],
      ],
    },
	]
};

export const config = { ...baseConfig };
