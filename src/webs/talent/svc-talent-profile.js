import { LitElement, html, unsafeCSS } from 'lit';
import '@/webs/apex/web-avatar.js';
import '@/webs/apex/web-rating.js';
import '@/webs/apex/web-button.js';
import '@/webs/apex/web-tabs.js';
import '@/webs/apex/web-text.js';
import '@/webs/apex/web-textarea.js';
import '@/webs/apex/web-toast.js';
import css from './styles/svc-talent-profile.css?inline';
import { emit, toastEmit, txtLingo, fmtPrice, watchHtmlAttr } from '@/services/helper.js';
import {
    findTalentById, loadTalentReviews, canReadContact, maskContact, unlockContact,
    spendXu, createProposal, getXuBalance,
} from './tools/service.js';
import { findCategory } from './tools/categories.js';

const TXT_STD = {
    vi: {
        tabOverview: 'Tổng quan', tabVerification: 'Xác thực', tabExperience: 'Kinh nghiệm',
        tabReviews: 'Đánh giá', tabHire: 'Thuê',
        skills: 'Kỹ năng', bio: 'Giới thiệu',
        professionalVerified: 'Professional Verified', transactionVerified: 'Transaction Verified',
        topRated: 'Top Rated', trustScore: 'Trust Score',
        completedJobs: 'Dự án hoàn thành', completionRate: 'Tỷ lệ hoàn thành', reviewRate: 'Tỷ lệ được đánh giá',
        repeatClients: 'Khách quay lại', totalProjects: 'Tổng dự án',
        noReviews: 'Chưa có đánh giá nào.', notFound: 'Không tìm thấy hồ sơ này.',
        contact: 'Thông tin liên hệ', unlockContact: 'Mở thông tin liên hệ',
        hireTitle: 'Gửi đề nghị thuê', rateLabel: 'Đề xuất rate', hoursLabel: 'Số giờ/tuần', weeksLabel: 'Số tuần',
        messageLabel: 'Lời nhắn', sendProposal: 'Gửi đề nghị',
        notEnoughXu: 'Không đủ Xu — hãy nạp thêm ở Ví Xu.', proposalSentToast: 'Đã gửi đề nghị thuê',
        errToast: 'Có lỗi xảy ra, thử lại sau', loginRequired: 'Vui lòng đăng nhập để tiếp tục',
        perUnit: (u) => `/${u === 'hour' ? 'giờ' : u}`,
    },
    en: {
        tabOverview: 'Overview', tabVerification: 'Verification', tabExperience: 'Experience',
        tabReviews: 'Reviews', tabHire: 'Hire',
        skills: 'Skills', bio: 'About',
        professionalVerified: 'Professional Verified', transactionVerified: 'Transaction Verified',
        topRated: 'Top Rated', trustScore: 'Trust Score',
        completedJobs: 'Completed jobs', completionRate: 'Completion rate', reviewRate: 'Review rate',
        repeatClients: 'Repeat clients', totalProjects: 'Total projects',
        noReviews: 'No reviews yet.', notFound: 'Profile not found.',
        contact: 'Contact', unlockContact: 'Unlock contact',
        hireTitle: 'Send a hire proposal', rateLabel: 'Proposed rate', hoursLabel: 'Hours / week', weeksLabel: 'Weeks',
        messageLabel: 'Message', sendProposal: 'Send proposal',
        notEnoughXu: 'Not enough Xu — top up in your wallet.', proposalSentToast: 'Proposal sent',
        errToast: 'Something went wrong, try again', loginRequired: 'Please log in to continue',
        perUnit: (u) => `/${u}`,
    },
};

/**
 * <svc-talent-profile> — Profile Detail (docs/new_feature.md §7/§23): hero + tabs (Overview/
 * Verification/Experience/Reviews/Hire) + hành động "Đề nghị thuê"/"Mở contact". KHÔNG qua
 * web-boxs (mask contact + badge theo điều kiện data cần logic thật, không phải config khai báo).
 */
export class SvcTalentProfile extends LitElement {
    static styles = unsafeCSS(css);
    static properties = {
        ui: { type: String }, theme: { type: String },
        mainColors: { type: String }, textColor: { type: String },
        lang: { type: String },
        talentId: { type: String }, currentUserId: { type: String },
        txt: { type: Object },
        _talent: { state: true }, _loaded: { state: true }, _reviews: { state: true }, _activeTab: { state: true },
        _hireForm: { state: true }, _sending: { state: true },
    };

    constructor() {
        super();
        this.ui = 'modern'; this.theme = ''; this.mainColors = ''; this.textColor = '';
        this.lang = 'vi';
        this.talentId = ''; this.currentUserId = '';
        this.txt = null;
        this._talent = null; this._loaded = false; this._reviews = []; this._activeTab = 'overview';
        this._hireForm = { rate: 0, hoursPerWeek: 20, weeks: 4, message: '' };
        this._sending = false;
    }

    async connectedCallback() {
        super.connectedCallback();
        this._unwatchLang = watchHtmlAttr('lang', (v) => { this.lang = v || 'vi'; });
        await this._dcLoad();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._unwatchLang?.();
    }

    // ── Data Core ──────────────────────────────────────────────────────────
    async _dcLoad() {
        this._talent = await findTalentById(this.talentId);
        // loadTalentReviews lọc theo meta.talentId = users.id (KHÁC this.talentId — id document
        // `talents` từ URL), xem ghi chú 2 định danh trong tools/service.js.
        this._reviews = this._talent ? await loadTalentReviews(this._talent.user_id) : [];
        if (this._talent) this._hireForm = { ...this._hireForm, rate: this._comRateMin };
        this._loaded = true;
    }

    // ── Data Head ──────────────────────────────────────────────────────────
    // web-tabs dispatches `change` với detail:{active,activeTab} (không phải id trần).
    _dhTab(detail) { this._activeTab = detail?.active ?? detail?.activeTab ?? this._activeTab; }
    _dhHireField(key, value) { this._hireForm = { ...this._hireForm, [key]: value }; }

    // ── Data Footer ────────────────────────────────────────────────────────
    async _dfUnlockContact() {
        if (!this.currentUserId) return toastEmit(this._txt.loginRequired, 'error');
        this._sending = true;
        try {
            const spend = await spendXu(this.currentUserId, 'unlock_contact', this.talentId);
            if (!spend.ok) return toastEmit(this._txt.notEnoughXu, 'error');
            this._talent = await unlockContact(this._talent.user_id, this.currentUserId, '');
            emit(this, 'talent-profile:contact-unlocked', { talentId: this.talentId });
        } catch (err) {
            console.error('[talent] unlock contact error:', err);
            toastEmit(this._txt.errToast, 'error');
        } finally {
            this._sending = false;
        }
    }

    async _dfSendProposal() {
        if (!this.currentUserId) return toastEmit(this._txt.loginRequired, 'error');
        this._sending = true;
        try {
            const spend = await spendXu(this.currentUserId, 'send_proposal', this.talentId);
            if (!spend.ok) return toastEmit(this._txt.notEnoughXu, 'error');
            const proposal = await createProposal(this.currentUserId, this._talent.user_id, {
                title: `Đề nghị thuê ${this._talent.title}`,
                rate: Number(this._hireForm.rate) || 0,
                hoursPerWeek: Number(this._hireForm.hoursPerWeek) || 0,
                weeks: Number(this._hireForm.weeks) || 0,
                message: this._hireForm.message,
                unit: this._comUnit,
            });
            toastEmit(this._txt.proposalSentToast, 'success');
            emit(this, 'talent-profile:proposal-sent', { proposal });
            window.location.href = `/talent/proposal?id=${proposal.id}`;
        } catch (err) {
            console.error('[talent] send proposal error:', err);
            toastEmit(this._txt.errToast, 'error');
        } finally {
            this._sending = false;
        }
    }

    // ── Computed ───────────────────────────────────────────────────────────
    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }
    get _meta() { return this._talent?.meta ?? {}; }
    get _comRateRange() { const [min, max] = (this._talent?.pricing || '').split('~'); return [Number(min) || 0, Number(max) || 0]; }
    get _comRateMin() { return this._comRateRange[0]; }
    get _comUnit() { return (this._talent?.pricing || '').split('~')[2] || 'hour'; }
    get _comCanReadContact() { return canReadContact(this.currentUserId, this._talent); }
    get _comContact() { return maskContact(this._meta.contact ?? {}, this._comCanReadContact); }
    get _comCategoryLabel() { return findCategory(this._meta.subCategory || this._meta.category)?.label ?? ''; }
    get _comAvgRating() {
        const r = this._meta.ratings;
        if (!r) return 0;
        const vals = Object.values(r).filter((v) => typeof v === 'number');
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }

    _rbBadges() {
        const v = this._meta.verification ?? {};
        const t = this._txt;
        return html`
            <div class="talent-profile-badges">
                ${v.professional ? html`<web-button mode="badge" color="primary" type="soft" ui=${this.ui}>🏢 ${t.professionalVerified}</web-button>` : ''}
                ${v.transaction ? html`<web-button mode="badge" color="info" type="soft" ui=${this.ui}>👤 ${t.transactionVerified} (${v.transactionCount})</web-button>` : ''}
                ${v.topRated ? html`<web-button mode="badge" color="warning" type="soft" ui=${this.ui}>🏆 ${t.topRated}</web-button>` : ''}
            </div>
        `;
    }

    _rbHero() {
        const talent = this._talent;
        const t = this._txt;
        return html`
            <div class="talent-profile-hero">
                <web-avatar src=${this._meta.avatarUrl || ''} name=${talent.title} size="lg" shape="circle"
                    status=${this._meta.availability === 'available' ? 'online' : ''}></web-avatar>
                <div class="talent-profile-hero-info">
                    <h1 class="talent-profile-name">${talent.title}</h1>
                    <p class="talent-profile-category">${this._comCategoryLabel}${talent.meta?.experienceYears ? ` · ${talent.meta.experienceYears} năm` : ''}</p>
                    <div class="talent-profile-rating">
                        <web-rating value=${this._comAvgRating} max="5" disabled mask="mask-star-2" size="sm" color="primary"></web-rating>
                        <span>${this._comAvgRating.toFixed(1)}/5 · ${this._reviews.length} đánh giá</span>
                    </div>
                    ${this._rbBadges()}
                    <div class="talent-profile-meta-row">
                        <span>⏱️ ${this._meta.hoursPerWeek || '—'}h/tuần · 🌐 ${this._meta.workMode}</span>
                        <span class="talent-profile-rate">${fmtPrice(this._comRateRange[0], this.lang)}–${fmtPrice(this._comRateRange[1], this.lang)}${t.perUnit(this._comUnit)}</span>
                    </div>
                    <div class="talent-profile-score">${t.trustScore}: ${this._meta.trustScore ?? 0}/100</div>
                </div>
            </div>
        `;
    }

    _rfOverview() {
        const t = this._txt;
        return html`
            <div class="talent-profile-panel">
                <h3>${t.bio}</h3>
                <p class="talent-profile-bio">${this._talent.content || this._talent.description || ''}</p>
                <h3>${t.skills}</h3>
                <div class="talent-profile-tags">
                    ${(this._talent.tags || '').split('|').filter(Boolean).map((tag) => html`<web-button mode="badge" color="base" type="soft" ui=${this.ui}>${tag}</web-button>`)}
                </div>
            </div>
        `;
    }

    _rfVerification() {
        const t = this._txt;
        const v = this._meta.verification ?? {};
        return html`
            <div class="talent-profile-panel">
                ${this._rbBadges()}
                <p>${t.trustScore}: <strong>${this._meta.trustScore ?? 0}/100</strong></p>
                ${v.verifiedByOrg ? html`<p>${v.verifiedByOrg}</p>` : ''}
            </div>
        `;
    }

    _rfExperience() {
        const t = this._txt;
        const s = this._meta.stats ?? {};
        return html`
            <div class="talent-profile-panel talent-profile-stats">
                <div><span>${t.totalProjects}</span><strong>${s.totalProjects ?? 0}</strong></div>
                <div><span>${t.completedJobs}</span><strong>${s.completedJobs ?? 0}</strong></div>
                <div><span>${t.completionRate}</span><strong>${Math.round((s.completionRate ?? 0) * 100)}%</strong></div>
                <div><span>${t.reviewRate}</span><strong>${Math.round((s.reviewRate ?? 0) * 100)}%</strong></div>
                <div><span>${t.repeatClients}</span><strong>${s.repeatClients ?? 0}</strong></div>
            </div>
        `;
    }

    _rfReviews() {
        const t = this._txt;
        if (!this._reviews.length) return html`<div class="talent-profile-panel">${t.noReviews}</div>`;
        return html`
            <div class="talent-profile-panel talent-profile-reviews">
                ${this._reviews.map((r) => {
                    const [rating] = (r.score || '0~1').split('~');
                    return html`
                        <div class="talent-profile-review">
                            <web-rating value=${Number(rating)} max="5" disabled size="xs" mask="mask-star-2" color="primary"></web-rating>
                            <p>${r.content}</p>
                        </div>
                    `;
                })}
            </div>
        `;
    }

    _rfHire() {
        const t = this._txt;
        const contact = this._comContact;
        const f = this._hireForm;
        return html`
            <div class="talent-profile-panel talent-profile-hire">
                <h3>${t.contact}</h3>
                <div class="talent-profile-contact">
                    <span>📞 ${contact.phone || '—'}</span>
                    <span>✉️ ${contact.email || '—'}</span>
                    ${!this._comCanReadContact ? html`
                        <web-button type="soft" color="primary" height="36px" ?loading=${this._sending} @clicked=${() => this._dfUnlockContact()}>${t.unlockContact}</web-button>
                    ` : ''}
                </div>

                <h3>${t.hireTitle}</h3>
                <div class="talent-profile-hire-form">
                    <web-text type="number" placeholder=${t.rateLabel} ui=${this.ui} theme=${this.theme} .value=${String(f.rate)}
                        @input=${(e) => this._dhHireField('rate', e.detail.value)}></web-text>
                    <web-text type="number" placeholder=${t.hoursLabel} ui=${this.ui} theme=${this.theme} .value=${String(f.hoursPerWeek)}
                        @input=${(e) => this._dhHireField('hoursPerWeek', e.detail.value)}></web-text>
                    <web-text type="number" placeholder=${t.weeksLabel} ui=${this.ui} theme=${this.theme} .value=${String(f.weeks)}
                        @input=${(e) => this._dhHireField('weeks', e.detail.value)}></web-text>
                    <web-textarea placeholder=${t.messageLabel} rows="3" ui=${this.ui} theme=${this.theme} .value=${f.message}
                        @input=${(e) => this._dhHireField('message', e.detail?.value ?? '')}></web-textarea>
                    <web-button type="fill" color="primary" height="40px" ?loading=${this._sending} @clicked=${() => this._dfSendProposal()}>${t.sendProposal}</web-button>
                </div>
            </div>
        `;
    }

    render() {
        if (!this._talent) return this._loaded ? html`<p class="talent-profile-notfound">${this._txt.notFound}</p>` : html``;
        const t = this._txt;
        const tabs = [
            { id: 'overview', label: t.tabOverview }, { id: 'verification', label: t.tabVerification },
            { id: 'experience', label: t.tabExperience }, { id: 'reviews', label: t.tabReviews },
            { id: 'hire', label: t.tabHire },
        ];
        return html`
            <div class="talent-profile">
                ${this._rbHero()}
                <web-tabs .tabs=${tabs} active=${this._activeTab} ui=${this.ui} theme=${this.theme}
                    @change=${(e) => this._dhTab(e.detail)}>
                    <div slot="overview">${this._rfOverview()}</div>
                    <div slot="verification">${this._rfVerification()}</div>
                    <div slot="experience">${this._rfExperience()}</div>
                    <div slot="reviews">${this._rfReviews()}</div>
                    <div slot="hire">${this._rfHire()}</div>
                </web-tabs>
            </div>
        `;
    }
}

if (!customElements.get('svc-talent-profile')) customElements.define('svc-talent-profile', SvcTalentProfile);
