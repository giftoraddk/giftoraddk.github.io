import { getStyleOpts } from '@/services/helper';

export const hashtags = ['cafe', 'order', 'management'];

export const data = [
  {
    id: 1, time: '08:10', statusLabel: 'Hoàn thành', status: 'done',
    staffName: 'Trần Thị Lan', tableName: 'Bàn 1',
    itemCount: 3, formattedTotal: '119.000đ', paymentLabel: 'Tiền mặt',
  },
];

const statusColor = {
  done: '#22c55e', serving: '#f59e0b', pending: '#ef4444', cancelled: '#6b7280',
};

const baseConfig = {
  groupCol: [12, 12, 12],
  groupRow: ['auto', 'auto', 'auto'],
  groupJustify: ['between', 'between', 'between'],
  groupStyle: [
    { paddingBottom: '0.5rem', borderBottom: '1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)' },
    { padding: '0.5rem 0', borderBottom: '1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)' },
    { paddingTop: '0.5rem' },
  ],
  makes: [
    [
      {
        bit: 'id',
        opt: {
          mode: 'span', prefix: 'ri:receipt-line', iconSize: '1rem',
          stys: {
            fontWeight: '700', // custom fontWeight
            color: 'var(--color-base-content)',
          },
        },
      },
      {
        bit: 'time',
        opt: { mode: 'span', stys: { color: 'color-mix(in oklab, var(--color-base-content) 60%, transparent)' } },
      },
      {
        bit: 'statusLabel',
        opt: { mode: 'span', stys: {
          fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
          fontWeight: '600', // custom fontWeight
          padding: '2px 10px', borderRadius: '999px', background: 'color-mix(in oklab, var(--color-warning) 20%, transparent)', color: 'var(--color-warning)',
        } },
      },
    ],
    [
      {
        bit: 'staffName',
        opt: {
          mode: 'span', prefix: 'ri:user-line', iconSize: '0.9rem',
          stys: { color: 'color-mix(in oklab, var(--color-base-content) 75%, transparent)' },
        },
      },
      {
        bit: 'tableName',
        opt: {
          mode: 'span', prefix: 'ri:map-pin-line', iconSize: '0.9rem',
          stys: { color: 'color-mix(in oklab, var(--color-base-content) 75%, transparent)' },
        },
      },
    ],
    [
      {
        bit: 'itemCount',
        opt: {
          mode: 'span', suffix: ' món', iconSize: '0',
          stys: {
            fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
            color: 'color-mix(in oklab, var(--color-base-content) 60%, transparent)',
          },
        },
      },
      {
        bit: 'formattedTotal',
        opt: { mode: 'span', stys: {
          fontSize: 'clamp(1.25rem, 2vw, 1.625rem)', // custom fontSize
          fontWeight: '800', // custom fontWeight
          color: 'var(--color-primary)',
        } },
      },
      {
        bit: 'paymentLabel',
        opt: {
          mode: 'span', prefix: 'ri:bank-card-line', iconSize: '0.9rem',
          stys: {
            fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
            color: 'color-mix(in oklab, var(--color-base-content) 60%, transparent)',
          },
        },
      },
    ],
  ],
  stys: { padding: '1.25rem', borderRadius: '1rem' },
  bg: { ...getStyleOpts({ rounded: '1.5rem', tint: '#fff', total: 1 }) },
  anime: 'fade-in',
};

export const config = { ...baseConfig };
