import { LitElement, html, unsafeCSS } from 'lit';
import '@/webs/apex/web-text.js';
import '@/webs/apex/web-textarea.js';
import '@/webs/apex/web-select.js';
import '@/webs/apex/web-button.js';
import '@/webs/apex/web-toast.js';
import '@/webs/media/svc-photor.js';
import css from './styles/svc-talent-edit.css?inline';
import { emit, toastEmit, txtLingo, watchHtmlAttr } from '@/services/helper.js';
import { createTalentProfile, updateTalentProfile, findTalentById, findTalentByUserId } from './tools/service.js';
import { topCategories, subCategoriesOf } from './tools/categories.js';

const TXT_STD = {
    vi: {
        title: 'Hồ sơ chuyên môn', save: 'Lưu hồ sơ', publish: 'Lưu & xuất bản', fillDemo: 'Điền dữ liệu mẫu',
        secBasic: 'Thông tin cơ bản', secSkills: 'Kỹ năng & chuyên môn', secWork: 'Tình trạng & rate',
        secPortfolio: 'Portfolio', secContact: 'Liên hệ (sẽ bị ẩn/mask cho đến khi Employer mở khoá)',
        fAvatar: 'Ảnh đại diện', fTitle: 'Chức danh', fDescription: 'Bio ngắn (hiện trên card)', fContent: 'Bio đầy đủ (hiện trên trang hồ sơ)',
        fTags: 'Kỹ năng (phân tách bởi dấu phẩy)', fLanguages: 'Ngôn ngữ (phân tách bởi dấu phẩy)',
        fCategory: 'Ngành nghề', fSubCategory: 'Chuyên môn',
        fExperience: 'Số năm kinh nghiệm', fAvailability: 'Trạng thái nhận việc',
        fHoursPerWeek: 'Số giờ/tuần', fWorkMode: 'Hình thức làm việc', fLocation: 'Địa điểm',
        fRateMin: 'Rate thấp nhất', fRateMax: 'Rate cao nhất', fUnit: 'Đơn vị',
        fPics: 'Ảnh portfolio', fWorkHistory: 'Kinh nghiệm làm việc',
        fWorkHistoryHint: 'Mỗi dòng: Chức danh~Công ty~Thời gian (vd: Backend Developer~Công ty ABC~2022–2024)',
        fPhone: 'Điện thoại', fEmail: 'Email', fZalo: 'Zalo', fWhatsapp: 'WhatsApp', fTelegram: 'Telegram',
        savedToast: 'Đã lưu hồ sơ', errToast: 'Lỗi lưu hồ sơ', loginRequired: 'Vui lòng đăng nhập trước khi lưu hồ sơ',
        available: 'Đang nhận việc', busy: 'Đang bận', unavailable: 'Tạm ngưng',
        remote: 'Remote', onsite: 'On-site', hybrid: 'Hybrid',
    },
    en: {
        title: 'Professional profile', save: 'Save profile', publish: 'Save & publish', fillDemo: 'Fill sample data',
        secBasic: 'Basic info', secSkills: 'Skills & specialization', secWork: 'Availability & rate',
        secPortfolio: 'Portfolio', secContact: 'Contact (hidden/masked until unlocked by an Employer)',
        fAvatar: 'Avatar', fTitle: 'Title', fDescription: 'Short bio (shown on card)', fContent: 'Full bio (shown on profile page)',
        fTags: 'Skills (comma-separated)', fLanguages: 'Languages (comma-separated)',
        fCategory: 'Category', fSubCategory: 'Specialization',
        fExperience: 'Years of experience', fAvailability: 'Availability',
        fHoursPerWeek: 'Hours / week', fWorkMode: 'Work mode', fLocation: 'Location',
        fRateMin: 'Min rate', fRateMax: 'Max rate', fUnit: 'Unit',
        fPics: 'Portfolio images', fWorkHistory: 'Work history',
        fWorkHistoryHint: 'One per line: Title~Company~Period (e.g. Backend Developer~ABC Co.~2022–2024)',
        fPhone: 'Phone', fEmail: 'Email', fZalo: 'Zalo', fWhatsapp: 'WhatsApp', fTelegram: 'Telegram',
        savedToast: 'Profile saved', errToast: 'Failed to save profile', loginRequired: 'Please log in before saving your profile',
        available: 'Available', busy: 'Busy', unavailable: 'Unavailable',
        remote: 'Remote', onsite: 'On-site', hybrid: 'Hybrid',
    },
};

const _EMPTY_FORM = {
    title: '', description: '', content: '', tags: '', languages: '',
    category: '', subCategory: '', experienceYears: 0,
    availability: 'available', hoursPerWeek: '', workMode: 'remote', location: '',
    rateMin: 0, rateMax: 0, unit: 'hour',
    avatarUrl: '', pics: '', workHistory: '',
    contact: { phone: '', email: '', zalo: '', whatsapp: '', telegram: '' },
};

// Dữ liệu mẫu — khớp mockup Talent Card ở bản gốc product plan (hook/new_feature.md §3), dùng cho
// nút "Điền dữ liệu mẫu" (test nhanh, không cần gõ tay toàn bộ form khi demo).
const _DEMO_FORM = {
    title: 'Nguyễn Minh An',
    description: 'Backend/API, SaaS, tích hợp hệ thống.',
    content: 'Backend Developer với 4 năm kinh nghiệm xây dựng API, hệ thống SaaS và tích hợp bên thứ ba. Từng làm việc với các đội ngũ remote, quen quy trình agile, ưu tiên code dễ bảo trì và test coverage tốt.',
    tags: 'Node.js, Python, PostgreSQL, AWS',
    languages: 'vi, en',
    category: 'technology', subCategory: 'backend-developer',
    experienceYears: 4,
    availability: 'available', hoursPerWeek: '15-20', workMode: 'remote', location: 'TP.HCM',
    rateMin: 300000, rateMax: 450000, unit: 'hour',
    avatarUrl: 'https://i.pravatar.cc/400?img=13',
    pics: 'https://picsum.photos/seed/portfolio1/600/400|https://picsum.photos/seed/portfolio2/600/400',
    workHistory: 'Backend Developer~Công ty ABC~2022–2024\nFullstack Developer~Startup XYZ~2020–2022',
    contact: { phone: '0909123456', email: 'minhan.dev@example.com', zalo: '0909123456', whatsapp: '+84909123456', telegram: '@minhan_dev' },
};

/**
 * <svc-talent-edit> — form tạo/sửa Talent Profile (chỉ chủ sở hữu / admin, xem hook/new_feature.md
 * §7). Tự load hồ sơ hiện có theo `talentId` (ưu tiên) hoặc `userId` (tìm theo user_id), tự quản lý
 * state nội bộ (KHÔNG phải controlled-thuần như svc-pay-reason.js — không có orchestrator cha nào
 * giữ state form này).
 */
export class SvcTalentEdit extends LitElement {
    static styles = unsafeCSS(css);
    static properties = {
        ui: { type: String }, theme: { type: String },
        mainColors: { type: String }, textColor: { type: String },
        lang: { type: String },
        userId: { type: String }, talentId: { type: String },
        txt: { type: Object },
        _form: { state: true }, _talentRow: { state: true }, _saving: { state: true },
    };

    constructor() {
        super();
        this.ui = 'modern'; this.theme = ''; this.mainColors = ''; this.textColor = '';
        this.lang = 'vi';
        this.userId = ''; this.talentId = '';
        this.txt = null;
        this._form = { ..._EMPTY_FORM, contact: { ..._EMPTY_FORM.contact } };
        this._talentRow = null;
        this._saving = false;
        this._lastLoadKey = null; // talentId+userId ĐÃ load lần gần nhất — xem updated()
    }

    connectedCallback() {
        super.connectedCallback();
        this._unwatchLang = watchHtmlAttr('lang', (v) => { this.lang = v || 'vi'; });
        this._dcLoad();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._unwatchLang?.();
    }

    // `userId` được set SAU khi mount (script astro:page-load ở edit.astro chờ auth.get() rồi mới
    // gán) — cùng race đã gặp ở svc-pay-warden.js's updated(): nếu không resubscribe khi userId
    // đổi từ rỗng sang giá trị thật, `_dcLoad()` luôn chạy với userId='' -> _talentRow luôn null
    // -> mọi lần "Lưu" của 1 talent ĐÃ có hồ sơ đều tạo nhầm 1 record mới thay vì update.
    updated(changed) {
        if (!(changed.has('talentId') || changed.has('userId'))) return;
        const key = `${this.talentId}|${this.userId}`;
        if (key === this._lastLoadKey) return;
        this._dcLoad();
    }

    // ── Data Core ──────────────────────────────────────────────────────────
    async _dcLoad() {
        this._lastLoadKey = `${this.talentId}|${this.userId}`;
        if (!this.talentId && !this.userId) { this._talentRow = null; return; }
        const row = this.talentId ? await findTalentById(this.talentId) : await findTalentByUserId(this.userId);
        if (!row) { this._talentRow = null; return; }
        const [rateMin = 0, rateMax = 0, unit = 'hour'] = (row.pricing || '').split('~');
        this._talentRow = row;
        this._form = {
            title: row.title ?? '', description: row.description ?? '', content: row.content ?? '',
            tags: (row.tags ?? '').split('|').filter(Boolean).join(', '),
            languages: (row.meta?.languages ?? []).join(', '),
            category: row.meta?.category ?? '', subCategory: row.meta?.subCategory ?? '',
            experienceYears: row.meta?.experienceYears ?? 0,
            availability: row.meta?.availability ?? 'available',
            hoursPerWeek: row.meta?.hoursPerWeek ?? '', workMode: row.meta?.workMode ?? 'remote',
            location: row.meta?.location ?? '',
            rateMin: Number(rateMin) || 0, rateMax: Number(rateMax) || 0, unit: unit || 'hour',
            avatarUrl: row.meta?.avatarUrl ?? '', pics: row.pics ?? '',
            workHistory: (row.meta?.workHistory ?? []).map((w) => [w.title, w.org, w.period].join('~')).join('\n'),
            contact: { phone: '', email: '', zalo: '', whatsapp: '', telegram: '', ...(row.meta?.contact ?? {}) },
        };
    }

    // ── Data Head ──────────────────────────────────────────────────────────
    _dhField(key, value) { this._form = { ...this._form, [key]: value }; }
    _dhContact(key, value) { this._form = { ...this._form, contact: { ...this._form.contact, [key]: value } }; }
    _dhFillDemo() { this._form = { ..._DEMO_FORM, contact: { ..._DEMO_FORM.contact } }; }

    // ── Data Footer ────────────────────────────────────────────────────────
    async _dfSave(publish = false) {
        if (this._saving) return;
        if (!this.userId) { toastEmit(this._txt.loginRequired, 'error'); return; } // chưa đăng nhập
        this._saving = true;
        const f = this._form;
        const payload = {
            title: f.title, description: f.description, content: f.content,
            tags: f.tags.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).join('|'),
            pricing: `${f.rateMin}~${f.rateMax}~${f.unit}`,
            pics: f.pics,
            meta: {
                category: f.category, subCategory: f.subCategory, experienceYears: Number(f.experienceYears) || 0,
                availability: f.availability, hoursPerWeek: f.hoursPerWeek, workMode: f.workMode, location: f.location,
                languages: f.languages.split(',').map((s) => s.trim()).filter(Boolean),
                avatarUrl: f.avatarUrl, contact: f.contact,
                workHistory: f.workHistory.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
                    const [title = '', org = '', period = ''] = line.split('~');
                    return { title, org, period, verified: false };
                }),
            },
        };
        try {
            let row;
            if (this._talentRow) {
                row = await updateTalentProfile(this._talentRow.id, this.userId, { ...payload, ...(publish ? { status: 'active' } : {}) });
            } else {
                // createTalentProfile() đọc field FLAT (category/languages/workHistory/... ở top-level
                // `form`, không phải `form.meta`) — khác contract của updateTalentProfile() ở nhánh
                // trên, nên KHÔNG dùng lại `payload` (có `meta` lồng) mà destructure phẳng ra.
                row = await createTalentProfile(this.userId, { ...payload, ...payload.meta, meta: undefined });
                if (publish) row = await updateTalentProfile(row.id, this.userId, { status: 'active' });
            }
            this._talentRow = row;
            toastEmit(this._txt.savedToast, 'success');
            emit(this, 'talent-edit:saved', { talent: row });
        } catch (err) {
            console.error('[talent] save profile error:', err);
            toastEmit(this._txt.errToast, 'error');
        } finally {
            this._saving = false;
        }
    }

    // ── Computed ───────────────────────────────────────────────────────────
    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }
    get _categoryOptions() { return topCategories().map((c) => ({ label: c.label, value: c.id })); }
    get _subCategoryOptions() { return subCategoriesOf(this._form.category).map((c) => ({ label: c.label, value: c.id })); }

    // Field nhỏ có label cố định (web-text/web-select không có prop `label` sẵn — chỉ
    // web-textarea mới có, xem hook/web-apex.rst) — wrap chung 1 kiểu cho nhất quán UI.
    _rfField(label, node) {
        return html`<div class="talent-edit-field"><label>${label}</label>${node}</div>`;
    }

    render() {
        const t = this._txt;
        const f = this._form;
        return html`
            <div class="talent-edit">
                <div class="talent-edit-head">
                    <h2 class="talent-edit-title">${t.title}</h2>
                    <web-button type="outline" color="base" height="34px" @clicked=${() => this._dhFillDemo()}>${t.fillDemo}</web-button>
                </div>

                <h3 class="talent-edit-section">${t.secBasic}</h3>
                ${this._rfField(t.fAvatar, html`
                    <svc-photor class="talent-edit-avatar" placeholder=${t.fAvatar} .value=${f.avatarUrl}
                        @change=${(e) => this._dhField('avatarUrl', e.detail.value)}></svc-photor>
                `)}
                ${this._rfField(t.fTitle, html`
                    <web-text placeholder=${t.fTitle} ui=${this.ui} theme=${this.theme} .value=${f.title}
                        @input=${(e) => this._dhField('title', e.detail.value)}></web-text>
                `)}
                <web-textarea label=${t.fDescription} placeholder=${t.fDescription} rows="2" ui=${this.ui} theme=${this.theme} .value=${f.description}
                    @input=${(e) => this._dhField('description', e.detail?.value ?? '')}></web-textarea>
                <web-textarea label=${t.fContent} placeholder=${t.fContent} rows="5" ui=${this.ui} theme=${this.theme} .value=${f.content}
                    @input=${(e) => this._dhField('content', e.detail?.value ?? '')}></web-textarea>

                <h3 class="talent-edit-section">${t.secSkills}</h3>
                ${this._rfField(t.fTags, html`
                    <web-text placeholder=${t.fTags} ui=${this.ui} theme=${this.theme} .value=${f.tags}
                        @input=${(e) => this._dhField('tags', e.detail.value)}></web-text>
                `)}
                ${this._rfField(t.fLanguages, html`
                    <web-text placeholder=${t.fLanguages} ui=${this.ui} theme=${this.theme} .value=${f.languages}
                        @input=${(e) => this._dhField('languages', e.detail.value)}></web-text>
                `)}
                <div class="talent-edit-row">
                    ${this._rfField(t.fCategory, html`
                        <web-select .options=${this._categoryOptions} .value=${f.category} placeholder=${t.fCategory}
                            @change=${(e) => this._dhField('category', e.detail.value)}></web-select>
                    `)}
                    ${this._rfField(t.fSubCategory, html`
                        <web-select .options=${this._subCategoryOptions} .value=${f.subCategory} placeholder=${t.fSubCategory}
                            @change=${(e) => this._dhField('subCategory', e.detail.value)}></web-select>
                    `)}
                </div>
                ${this._rfField(t.fWorkHistory, html`
                    <web-textarea placeholder=${t.fWorkHistoryHint} rows="3" ui=${this.ui} theme=${this.theme} .value=${f.workHistory}
                        @input=${(e) => this._dhField('workHistory', e.detail?.value ?? '')}></web-textarea>
                `)}

                <h3 class="talent-edit-section">${t.secWork}</h3>
                <div class="talent-edit-row">
                    ${this._rfField(t.fExperience, html`
                        <web-text type="number" placeholder=${t.fExperience} ui=${this.ui} theme=${this.theme} .value=${String(f.experienceYears)}
                            @input=${(e) => this._dhField('experienceYears', e.detail.value)}></web-text>
                    `)}
                    ${this._rfField(t.fAvailability, html`
                        <web-select .options=${[
                            { label: t.available, value: 'available' }, { label: t.busy, value: 'busy' }, { label: t.unavailable, value: 'unavailable' },
                        ]} .value=${f.availability} placeholder=${t.fAvailability}
                            @change=${(e) => this._dhField('availability', e.detail.value)}></web-select>
                    `)}
                </div>
                <div class="talent-edit-row">
                    ${this._rfField(t.fHoursPerWeek, html`
                        <web-text placeholder=${t.fHoursPerWeek} ui=${this.ui} theme=${this.theme} .value=${f.hoursPerWeek}
                            @input=${(e) => this._dhField('hoursPerWeek', e.detail.value)}></web-text>
                    `)}
                    ${this._rfField(t.fWorkMode, html`
                        <web-select .options=${[
                            { label: t.remote, value: 'remote' }, { label: t.onsite, value: 'onsite' }, { label: t.hybrid, value: 'hybrid' },
                        ]} .value=${f.workMode} placeholder=${t.fWorkMode}
                            @change=${(e) => this._dhField('workMode', e.detail.value)}></web-select>
                    `)}
                </div>
                ${this._rfField(t.fLocation, html`
                    <web-text placeholder=${t.fLocation} ui=${this.ui} theme=${this.theme} .value=${f.location}
                        @input=${(e) => this._dhField('location', e.detail.value)}></web-text>
                `)}
                <div class="talent-edit-row">
                    ${this._rfField(t.fRateMin, html`
                        <web-text type="number" placeholder=${t.fRateMin} ui=${this.ui} theme=${this.theme} .value=${String(f.rateMin)}
                            @input=${(e) => this._dhField('rateMin', e.detail.value)}></web-text>
                    `)}
                    ${this._rfField(t.fRateMax, html`
                        <web-text type="number" placeholder=${t.fRateMax} ui=${this.ui} theme=${this.theme} .value=${String(f.rateMax)}
                            @input=${(e) => this._dhField('rateMax', e.detail.value)}></web-text>
                    `)}
                    ${this._rfField(t.fUnit, html`
                        <web-text placeholder=${t.fUnit} ui=${this.ui} theme=${this.theme} .value=${f.unit}
                            @input=${(e) => this._dhField('unit', e.detail.value)}></web-text>
                    `)}
                </div>

                <h3 class="talent-edit-section">${t.secPortfolio}</h3>
                ${this._rfField(t.fPics, html`
                    <svc-photor placeholder=${t.fPics} multiple .value=${f.pics}
                        @change=${(e) => this._dhField('pics', e.detail.value)}></svc-photor>
                `)}

                <h3 class="talent-edit-section">${t.secContact}</h3>
                <div class="talent-edit-row">
                    ${this._rfField(t.fPhone, html`
                        <web-text placeholder=${t.fPhone} ui=${this.ui} theme=${this.theme} .value=${f.contact.phone}
                            @input=${(e) => this._dhContact('phone', e.detail.value)}></web-text>
                    `)}
                    ${this._rfField(t.fEmail, html`
                        <web-text placeholder=${t.fEmail} ui=${this.ui} theme=${this.theme} .value=${f.contact.email}
                            @input=${(e) => this._dhContact('email', e.detail.value)}></web-text>
                    `)}
                    ${this._rfField(t.fZalo, html`
                        <web-text placeholder=${t.fZalo} ui=${this.ui} theme=${this.theme} .value=${f.contact.zalo}
                            @input=${(e) => this._dhContact('zalo', e.detail.value)}></web-text>
                    `)}
                </div>
                <div class="talent-edit-row">
                    ${this._rfField(t.fWhatsapp, html`
                        <web-text placeholder=${t.fWhatsapp} ui=${this.ui} theme=${this.theme} .value=${f.contact.whatsapp}
                            @input=${(e) => this._dhContact('whatsapp', e.detail.value)}></web-text>
                    `)}
                    ${this._rfField(t.fTelegram, html`
                        <web-text placeholder=${t.fTelegram} ui=${this.ui} theme=${this.theme} .value=${f.contact.telegram}
                            @input=${(e) => this._dhContact('telegram', e.detail.value)}></web-text>
                    `)}
                </div>

                <div class="talent-edit-actions">
                    <web-button type="soft" color="primary" height="40px" ?loading=${this._saving} @clicked=${() => this._dfSave(false)}>${t.save}</web-button>
                    <web-button type="fill" color="primary" height="40px" ?loading=${this._saving} @clicked=${() => this._dfSave(true)}>${t.publish}</web-button>
                </div>
            </div>
        `;
    }
}

if (!customElements.get('svc-talent-edit')) customElements.define('svc-talent-edit', SvcTalentEdit);
