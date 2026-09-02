import { getStyleOpts } from '@/services/helper';

export const hashtags = ['features', 'spatial', 'components', 'grid', 'cards', 'apex'];

const iconBase = {
  width: '2.5rem', height: '2.5rem', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
  borderRadius: '0.625rem',
};

// Section này CHỈ có 1 record editable (svc-admin dùng mode `single`) — data luôn `data[0]`
// duy nhất: subtitle/description/meta.heading là field top-level của intro, còn danh sách
// component cards (nhiều item) nằm NESTED trong `cards` (tên field khớp tên tier marker
// `cards` mà web-board dùng, xem Tier 1's `dataKey: 'cards'` bên dưới).
export const data = [
  {
    subtitle: 'COMPONENT LIBRARY',
    description: '80+ production-ready elements, from layout engines to micro-service inputs — all built on native Web Components.',
    meta: {
      heading: 'Explore the full\ncomponent suite',
    },
    cards: [
      {
        title: 'web-board',
        content: 'Declarative layout engine — compose full pages from JSON config, no template code.',
        meta: {
          icon: 'ri:layout-masonry-line',
          iconStyle: { ...iconBase, background: 'color-mix(in oklab, var(--color-primary) 20%, transparent)' },
        },
      },
      {
        title: 'web-boxs',
        content: 'Card-grid renderer with masonry, tabs, slider, expansion, and infinite scroll.',
        meta: {
          icon: 'ri:gallery-view-2',
          iconStyle: { ...iconBase, background: 'color-mix(in oklab, var(--color-accent) 20%, transparent)' },
        },
      },
      {
        title: 'web-table',
        content: 'Sortable, filterable, paginated data table with virtual scrolling.',
        meta: {
          icon: 'ri:table-2',
          iconStyle: { ...iconBase, background: 'color-mix(in oklab, var(--color-secondary) 20%, transparent)' },
        },
      },
      {
        title: 'web-dialog',
        content: 'Accessible modal with animated backdrop, focus trap, and programmatic API.',
        meta: {
          icon: 'ri:window-line',
          iconStyle: { ...iconBase, background: 'color-mix(in oklab, var(--color-primary) 20%, transparent)' },
        },
      },
      {
        title: 'web-tabs',
        content: 'Tab panels with keyboard navigation, lazy content rendering, and smooth transitions.',
        meta: {
          icon: 'ri:file-list-3-line',
          iconStyle: { ...iconBase, background: 'color-mix(in oklab, var(--color-accent) 20%, transparent)' },
        },
      },
      {
        title: 'web-slider',
        content: 'Touch-friendly carousel with autoplay, dot indicators, and responsive breakpoints.',
        meta: {
          icon: 'ri:slideshow-line',
          iconStyle: { ...iconBase, background: 'color-mix(in oklab, var(--color-secondary) 20%, transparent)' },
        },
      },
      {
        title: 'web-toast',
        content: 'Stackable notifications with auto-dismiss, queuing, and configurable position.',
        meta: {
          icon: 'ri:notification-3-line',
          iconStyle: { ...iconBase, background: 'color-mix(in oklab, var(--color-primary) 20%, transparent)' },
        },
      },
      {
        title: 'web-select',
        content: 'Searchable dropdown with multi-select, option groups, and async data loading.',
        meta: {
          icon: 'ri:list-check-2',
          iconStyle: { ...iconBase, background: 'color-mix(in oklab, var(--color-accent) 20%, transparent)' },
        },
      },
      {
        title: 'web-gallery',
        content: 'Responsive image gallery with lightbox, zoom controls, and lazy loading.',
        meta: {
          icon: 'ri:image-2-line',
          iconStyle: { ...iconBase, background: 'color-mix(in oklab, var(--color-secondary) 20%, transparent)' },
        },
      },
    ],
  },
];

// Layout (12-col tiers):
//   Tier 0 │ badge + heading + subtitle  col-12  │  ← centered
//   Tier 1 │ 9 component cards           col-12  │  ← 3×3 grid (cards col-4)

const baseConfig = {
  tiersCol: ['12', '12'],
  tiersRow: ['auto', 'auto'],

  tiers: [
    // ── Tier 0: Badge pill + heading + subtitle (static, centered) ───────────
    {
      groupCol: ['12', '12'],
      groupRow: ['auto', 'auto'],
      groupJustify: ['center', 'center'],
      groupStyle: [
        // Group 0: badge pill
        {
          maxWidth: 'fit-content',
					margin: '3rem auto 0',
					padding: '0 0.5rem',
          borderRadius: '2rem',
          border: '1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)',
          background: 'color-mix(in oklab, var(--color-primary) 5%, transparent)',
          backdropFilter: 'blur(8px)',
        },
        // Group 1: heading + subtitle
        {
          flexDirection: 'column', alignItems: 'center',
          textAlign: 'center', gap: '0.5rem',
          padding: '1rem 0 2rem',
        },
      ],
      makes: [
        // Group 0: badge
        [
          {
            bit: 'subtitle',
            opt: {
              mode: 'span',
              prefix: 'ri:bard-fill', iconSize: '1.1rem',
              stys: {
                fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
                fontWeight: '500', // custom fontWeight
                color: 'color-mix(in oklab, var(--color-base-content) 80%, transparent)',
              },
            },
          },
        ],
        // Group 1: heading + subtitle
        [
          {
            bit: 'meta.heading',
            opt: {
              mode: 'h2',
              motion: true, word: false, effect: 'floatIn',
              stys: {
                margin: '0',
                whiteSpace: 'pre-line', // custom whiteSpace
                color: 'var(--color-base-content)',
              },
            },
          },
          {
            bit: 'description',
            opt: {
              mode: 'p',
              stys: {
                lineHeight: '1.65', // custom lineHeight
                color: 'color-mix(in oklab, var(--color-base-content) 60%, transparent)',
                margin: '0', maxWidth: '38rem',
              },
            },
          },
        ],
      ],
    },

    // ── Tier 1: Component cards (data-driven, 3×3 grid) ──────────────────────
    [
      {
        dataKey: 'cards', // items đọc từ data[0].cards, KHÔNG phải top-level data (chỉ có 1 record)
        masonry: { col: 3 },
        groupCol: ['12', '12', '12'],
        groupRow: ['auto', 'auto', 'auto'],
        groupJustify: ['left', 'left', 'left'],
        groupStyle: [
          { marginBottom: '0.75rem' },
          { marginBottom: '0.25rem' },
          {},
        ],
        makes: [
          [
            {
              bit: 'meta.icon',
              opt: { mode: 'icon', width: '1.25rem', color: 'var(--color-base-content)', stys: 'meta.iconStyle' },
            },
          ],
          [
            {
              bit: 'title',
              opt: {
                mode: 'h4',
                stys: {
                  fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', // custom fontSize
                  fontWeight: '700', // custom fontWeight
                  lineHeight: '1.3', // custom lineHeight
                  margin: '0',
                  color: 'var(--color-base-content)',
                },
              },
            },
          ],
          [
            {
              bit: 'content',
              opt: {
                mode: 'p',
                stys: {
                  fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
                  lineHeight: '1.55', // custom lineHeight
                  margin: '0',
                  color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
                },
              },
            },
          ],
        ],
        stys: { padding: '1.25rem', background: 'var(--color-base-200)', borderRadius: '0.875rem' },
        anime: 'slide-in-blurred-bottom',
      },
    ],
  ],

  bg: {
    ...getStyleOpts({ rounded: '0', gradient: false }),
  },

  stys: { padding: '0 0 4rem' },
};

export const config = { ...baseConfig };
