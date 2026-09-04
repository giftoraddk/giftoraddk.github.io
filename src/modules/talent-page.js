// src/modules/talent-page.js
//
// variant + views cho /talent/* — theo đúng convention src/modules/shop-page.js (1 file duy nhất).
// Khác shop-page.js ở chỗ `views`/sections được BUILD qua hàm (buildViews) thay vì mảng tĩnh, vì
// /talent/[category] cần bake filter category vào section lúc build (site tĩnh, mỗi category 1
// trang qua getStaticPaths — xem src/pages/talent/[category].astro).

import { findCategory } from '@/webs/talent/tools/categories.js';

export const variant = {
    ui: 'spatial',
    theme: 'dark',
    mainColors: '#2ebd85|#f5465c|#a855f7|#00c7d4|#fbbf24',
    textColor: '',
    bg: {
        rounded: '0', tint: '#2ebd85',blur: true, gradient: true,
        total: 2, blobType: 'circleOverlap', blobMove: 'swap', colorful: false, deg: 0, distance: 86,
    },
};

/**
 * 1 section: card grid Talent, filter theo category khi có (native Firestore `where`, chỉ áp dụng
 * khi `loadLimit > 0` — xem conductor.js's paginated path, hook/SERVICES.rst). `talents.meta`
 * chỉ lưu id CHA ở `category` và id CON ở `subCategory` (xem svc-talent-edit.js's `_dfSave`) —
 * `categoryId` truyền vào đây có thể là 1 trong 2 loại (getStaticPaths ở [category].astro sinh
 * trang cho CẢ CATEGORIES cha lẫn con), nên phải chọn đúng field để filter, nếu không mọi trang
 * category CON sẽ luôn rỗng (filter nhầm field cha bằng id con, không match record nào).
 */
export async function buildTalentDirectorySection(categoryId = '') {
    const cat = categoryId ? findCategory(categoryId) : null;
    const filterField = cat?.parentId ? 'meta.subCategory' : 'meta.category';
    return {
        id: 'talentDirectoryGrid',
        showSearch: true,
        emptyText: 'Không tìm thấy Talent phù hợp',
        tags: { filterField: 'tags', filterColor: 'primary', data: [] },
        config: (await import('@/sections/talent/directory/card.js')).config,
        dataTable: 'talents',
        loadLimit: 9,
        filters: { status: 'active', ...(categoryId ? { [filterField]: categoryId } : {}) },
        sort: 0,
        col: '12',
        responsive: true,
    };
}

export async function buildViews(categoryId = '') {
    return [
        {
            text: 'Talent', href: categoryId ? `/talent/${categoryId}` : '/talent/', iconMobile: 'ri:team-line',
            sections: [await buildTalentDirectorySection(categoryId)],
        },
    ];
}

export default { variant, buildViews };
