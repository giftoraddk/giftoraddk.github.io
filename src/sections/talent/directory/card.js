import { getStyleOpts } from '@/services/helper';

// Card config cho talentDirectoryGrid (hook/new_feature.md §8) — theo đúng khuôn
// src/sections/products/cardBase.js (card đơn, không tiers — dùng trực tiếp với `dataTable`,
// KHÔNG phải section 'single' kiểu team/spatialCardGridNeat).
//
// `meta.avatarUrl` là bản snapshot của `users.avatar` tại thời điểm tạo/sửa hồ sơ (denormalize) —
// web-boxs/web-cell render thẳng từ 1 collection, không join sang `users` được, xem
// createTalentProfile()/updateTalentProfile() trong tools/service.js.
export const hashtags = ['talent', 'marketplace', 'card', 'directory'];

export const data = [
    {
        id: 'demo-1', status: 'active', mode: 'talent',
        title: 'Nguyễn Minh An',
        tags: 'nodejs|python|postgresql|aws',
        pricing: '300000~450000~hour',
        score: '4.9~28',
        meta: { avatarUrl: 'https://i.pravatar.cc/400?img=13', availability: 'available', category: 'technology', subCategory: 'backend-developer' },
    },
];

const baseConfig = {
    groupCol: [12, 12, 12, 12, 12],
    groupRow: ['auto', 'auto', 'auto', 'auto', 'auto'],
    groupJustify: ['none', 'none', 'left', 'between', 'between'],
    groupStyle: [
        { justifyContent: 'center' },
        {},
        { gap: '0.375rem' },
        { alignItems: 'center' },
        { alignItems: 'center' },
    ],
    makes: [
        // Avatar
        [
            {
                bit: 'meta.avatarUrl',
                opt: { mode: 'gallery', stys: { width: '5rem', height: '5rem', borderRadius: '50%', objectFit: 'cover', margin: '0 auto' } },
            },
        ],
        // Availability badge
        [
            {
                bit: 'meta.availability',
                opt: { mode: 'badge', color: 'success', type: 'soft', stys: { margin: '0 auto', display: 'block', width: 'fit-content' } },
            },
        ],
        // Skills tags
        [
            { bit: 'tags', opt: { mode: 'tags' } },
        ],
        // Title & Rating
        [
            {
                bit: 'title',
                opt: { mode: 'h2', stys: { fontSize: 'clamp(1.1rem, 1.8vw, 1.35rem)', fontWeight: '700', color: 'var(--color-base-content)', margin: '0' } },
            },
            {
                bit: 'score',
                opt: { mode: 'rating', size: 'xs', disabled: true, color: 'primary', mask: 'mask-star-2' },
            },
        ],
        // Rate & CTA — `cell-action` 'view-profile' bắt bởi bindDirectoryNav() (tools/service.js)
        [
            {
                bit: 'pricing',
                ext: { currency: 'đ' },
                opt: { mode: 'span', stys: { fontSize: '1rem', fontWeight: '700', color: 'var(--color-primary)' } },
            },
            {
                bitLocal: 'Xem hồ sơ',
                opt: { mode: 'button', ui: 'modern', type: 'soft', color: 'primary', height: '36px', rounded: '10px', action: 'view-profile' },
            },
        ],
    ],
    stys: { padding: '1.5rem', height: '100%', textAlign: 'center' },
    bg: { ...getStyleOpts({ rounded: '1.75rem', tint: 'var(--color-primary)', total: 1 }) },
    anime: 'bounce-in-left',
};

export const config = { ...baseConfig };
