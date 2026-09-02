import { getStyleOpts } from '@/services/helper';

export const hashtags = ['services', 'cafe', 'cafe', 'staff', 'hr', 'management'];

export const data = [
  {
    id: 1, status: 'active', mode: 'staff',
    title: 'Nguyễn Minh Tuấn',
    score: '0~0', content: '', pics: '',
    tags: 'manager|full',
    meta: { phone: '0901234567', salary: 12000000, role: 'manager', shift: 'full', roleLabel: 'Quản lý', shiftLabel: 'Cả ngày (6–22h)', statusLabel: 'Đang làm', formattedSalary: '12.000.000đ' },
  },
];

const baseConfig = {
  groupCol: [12, 12, 12],
  groupRow: ['auto', 'auto', 'auto'],
  groupJustify: ['center', 'between', 'between'],
  groupStyle: [
    { paddingBottom: '1rem', borderBottom: '1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)' },
    { padding: '0.75rem 0', borderBottom: '1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)' },
    { paddingTop: '0.75rem' },
  ],
  makes: [
    [
      {
        bit: 'title',
        opt: {
          mode: 'h3', prefix: 'ri:user-3-line', iconSize: '1.1rem',
          stys: {
            fontSize: 'clamp(1rem, 1.5vw, 1.25rem)', // custom fontSize
            fontWeight: '700', // custom fontWeight
            textAlign: 'center',
          },
        },
      },
      {
        bit: 'meta.roleLabel',
        opt: {
          mode: 'span',
          stys: {
            fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
            fontWeight: '600', // custom fontWeight
            padding: '2px 10px', borderRadius: '999px', background: 'color-mix(in oklab, var(--color-primary) 15%, transparent)', color: 'var(--color-primary)',
          },
        },
      },
    ],
    [
      {
        bit: 'meta.shiftLabel',
        opt: {
          mode: 'span', prefix: 'ri:time-line', iconSize: '0.9rem',
          stys: { color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)' },
        },
      },
      {
        bit: 'meta.phone',
        opt: {
          mode: 'span', prefix: 'ri:phone-line', iconSize: '0.9rem',
          stys: { color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)' },
        },
      },
    ],
    [
      {
        bit: 'meta.formattedSalary',
        opt: {
          mode: 'span', prefix: 'ri:money-dollar-circle-line', iconSize: '1rem',
          stys: {
            fontWeight: '700', // custom fontWeight
            color: 'var(--color-primary)',
          },
        },
      },
      {
        bit: 'meta.statusLabel',
        opt: {
          mode: 'span',
          stys: {
            fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', // custom fontSize
            fontWeight: '600', // custom fontWeight
            padding: '2px 10px', borderRadius: '999px', background: 'color-mix(in oklab, #22c55e 15%, transparent)', color: '#22c55e',
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
