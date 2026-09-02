import { getStyleOpts } from '@/services/helper';

export const hashtags = ['products', 'cafe', 'cafe', 'inventory', 'ingredient', 'stock'];

const toUnit     = (pricing) => (pricing || '').split('~')[2] || '';
const toCostLabel = (pricing) => {
  const [, cost, unit] = (pricing || '').split('~');
  return cost && unit ? `${cost}đ/${unit}` : '';
};

export const data = [
  {
    id: 1, status: 'active', mode: 'ingredient',
    title: 'Cà phê Arabica',
    score: '0~0',
    content: '', pics: '',
    tags: 'coffee',
    pricing: '0~0.8~g',
    quantity: 5000,
    get meta() {
      return {
        unit: toUnit(this.pricing),
        stockStatus: this.quantity >= 500 ? 'Đủ hàng' : 'Sắp hết',
        formattedCost: toCostLabel(this.pricing),
      };
    },
  },
];

const baseConfig = {
  groupCol: [12, 12, 12],
  groupRow: ['auto', 'auto', 'auto'],
  groupJustify: ['between', 'between', 'left'],
  groupStyle: [
    { paddingBottom: '0.5rem', borderBottom: '1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)' },
    { padding: '0.5rem 0', borderBottom: '1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)' },
    { paddingTop: '0.5rem' },
  ],
  makes: [
    [
      {
        bit: 'title',
        opt: {
          mode: 'span', prefix: 'ri:box-3-line', iconSize: '1rem',
          stys: {
            fontWeight: '700', // custom fontWeight
            color: 'var(--color-base-content)',
          },
        },
      },
      {
        bit: 'tags',
        opt: { mode: 'tags' },
      },
    ],
    [
      {
        bit: 'quantity',
        opt: {
          mode: 'span', prefix: 'ri:stack-line', iconSize: '0.9rem',
          stys: {
            fontSize: 'clamp(1rem, 1.5vw, 1.25rem)', // custom fontSize
            fontWeight: '800', // custom fontWeight
            color: 'var(--color-base-content)',
          },
        },
      },
      {
        bit: 'meta.unit',
        opt: { mode: 'span', stys: {
          fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
          color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)', marginLeft: '2px',
        } },
      },
      {
        bit: 'meta.stockStatus',
        opt: {
          mode: 'span',
          stys: {
            fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
            fontWeight: '600', // custom fontWeight
            padding: '2px 8px', borderRadius: '999px', background: 'color-mix(in oklab, #22c55e 15%, transparent)', color: '#22c55e',
          },
        },
      },
    ],
    [
      {
        bit: 'meta.formattedCost',
        opt: {
          mode: 'span', prefix: 'ri:price-tag-3-line', iconSize: '0.85rem',
          stys: {
            fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
            color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
          },
        },
      },
    ],
  ],
  stys: { padding: '1rem', borderRadius: '0.75rem' },
  bg: { ...getStyleOpts({ rounded: '1.5rem', tint: '#fff', total: 1 }) },
  anime: 'fade-in',
};

export const config = { ...baseConfig };
