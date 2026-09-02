// src/webs/talent/tools/categories.js
//
// Registry tĩnh danh mục ngành nghề (MVP, xem docs/new_feature.md §1.10) — data-driven ở tầng UI
// (không hard-code chuỗi rải rác), chưa cần CRUD admin. Migrate sang `records mode: 'category'`
// ở Phase 2 nếu cần đổi danh mục qua UI mà không deploy lại.

export const CATEGORIES = [
    { id: 'technology', parentId: null, label: 'Technology' },
    { id: 'frontend-developer', parentId: 'technology', label: 'Frontend Developer' },
    { id: 'backend-developer', parentId: 'technology', label: 'Backend Developer' },
    { id: 'mobile-developer', parentId: 'technology', label: 'Mobile Developer' },
    { id: 'qa-tester', parentId: 'technology', label: 'QA Tester' },
    { id: 'devops', parentId: 'technology', label: 'DevOps' },
    { id: 'data-analyst', parentId: 'technology', label: 'Data Analyst' },
    { id: 'ai-ml', parentId: 'technology', label: 'AI/ML' },

    { id: 'design', parentId: null, label: 'Design' },
    { id: 'graphic-designer', parentId: 'design', label: 'Graphic Designer' },
    { id: 'ui-ux-designer', parentId: 'design', label: 'UI/UX Designer' },
    { id: 'illustrator', parentId: 'design', label: 'Illustrator' },
    { id: '3d-designer', parentId: 'design', label: '3D Designer' },
    { id: 'video-editor', parentId: 'design', label: 'Video Editor' },

    { id: 'marketing', parentId: null, label: 'Marketing' },
    { id: 'digital-marketing', parentId: 'marketing', label: 'Digital Marketing' },
    { id: 'seo', parentId: 'marketing', label: 'SEO' },
    { id: 'content-creator', parentId: 'marketing', label: 'Content Creator' },
    { id: 'social-media', parentId: 'marketing', label: 'Social Media' },
    { id: 'ads-specialist', parentId: 'marketing', label: 'Ads Specialist' },

    { id: 'business', parentId: null, label: 'Business' },
    { id: 'accountant', parentId: 'business', label: 'Accountant' },
    { id: 'business-consultant', parentId: 'business', label: 'Business Consultant' },
    { id: 'sales', parentId: 'business', label: 'Sales' },
    { id: 'customer-support', parentId: 'business', label: 'Customer Support' },
    { id: 'virtual-assistant', parentId: 'business', label: 'Virtual Assistant' },

    { id: 'education', parentId: null, label: 'Education' },
    { id: 'english-tutor', parentId: 'education', label: 'English Tutor' },
    { id: 'math-tutor', parentId: 'education', label: 'Math Tutor' },
    { id: 'programming-tutor', parentId: 'education', label: 'Programming Tutor' },
    { id: 'music-teacher', parentId: 'education', label: 'Music Teacher' },

    { id: 'creative', parentId: null, label: 'Creative' },
    { id: 'photographer', parentId: 'creative', label: 'Photographer' },
    { id: 'videographer', parentId: 'creative', label: 'Videographer' },
    { id: 'writer', parentId: 'creative', label: 'Writer' },
    { id: 'voice-actor', parentId: 'creative', label: 'Voice Actor' },
    { id: 'mc', parentId: 'creative', label: 'MC' },

    { id: 'local-services', parentId: null, label: 'Local Services' },
    { id: 'electrician', parentId: 'local-services', label: 'Electrician' },
    { id: 'plumber', parentId: 'local-services', label: 'Plumber' },
    { id: 'repair-technician', parentId: 'local-services', label: 'Repair Technician' },
    { id: 'cleaner', parentId: 'local-services', label: 'Cleaner' },
    { id: 'event-staff', parentId: 'local-services', label: 'Event Staff' },
];

export const topCategories = () => CATEGORIES.filter(c => !c.parentId);
export const subCategoriesOf = (parentId) => CATEGORIES.filter(c => c.parentId === parentId);
export const findCategory = (id) => CATEGORIES.find(c => c.id === id) ?? null;
