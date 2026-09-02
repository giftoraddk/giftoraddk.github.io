import { LitElement, html, unsafeCSS } from 'lit';
import '@/webs/apex/web-button.js';
import '@/webs/apex/web-steps.js';
import css from './styles/svc-proposal-deal.css?inline';
import { emit, txtLingo, fmtPrice } from '@/services/helper.js';

const STEP_IDS = ['accepted', 'in_progress', 'submitted', 'completed', 'reviewed'];

const TXT_STD = {
    vi: {
        dealTitle: 'Deal đã chốt', rate: 'Rate', hoursPerWeek: 'Giờ/tuần', weeks: 'Số tuần',
        startDate: 'Bắt đầu', estimatedTotal: 'Tổng dự kiến', scope: 'Phạm vi công việc',
        escrowLabel: 'Thanh toán', escrowNone: 'Chưa thanh toán', escrowHeld: 'Đã giữ tiền (escrow)', escrowReleased: 'Đã giải ngân',
        issueEscrow: 'Xác nhận thanh toán', markInProgress: 'Bắt đầu công việc', submitWork: 'Nộp bàn giao',
        confirmCompleted: 'Xác nhận hoàn thành', openDispute: 'Báo cáo tranh chấp',
        unlockContact: 'Mở thông tin liên hệ', waitingOther: 'Đang chờ bên còn lại xử lý.',
        writeReview: 'Viết đánh giá',
    },
    en: {
        dealTitle: 'Deal', rate: 'Rate', hoursPerWeek: 'Hours/week', weeks: 'Weeks',
        startDate: 'Start', estimatedTotal: 'Estimated total', scope: 'Scope',
        escrowLabel: 'Payment', escrowNone: 'Not paid', escrowHeld: 'Escrow held', escrowReleased: 'Released',
        issueEscrow: 'Confirm payment', markInProgress: 'Start work', submitWork: 'Submit work',
        confirmCompleted: 'Confirm completed', openDispute: 'Open dispute',
        unlockContact: 'Unlock contact', waitingOther: 'Waiting on the other side.',
        writeReview: 'Write a review',
    },
};

/**
 * <svc-proposal-deal> — panel thuần render cho stage 'accepted'..'reviewed' (docs/new_feature.md
 * §2.2/§2.3). Chỉ emit `deal:*`, cha (`<svc-proposal>`) gọi tools/service.js tương ứng.
 */
export class SvcProposalDeal extends LitElement {
    static styles = unsafeCSS(css);
    static properties = {
        ui: { type: String }, theme: { type: String }, lang: { type: String },
        proposal: { type: Object }, isTalent: { type: Boolean }, isEmployer: { type: Boolean },
        canReadContact: { type: Boolean },
        txt: { type: Object },
    };

    constructor() {
        super();
        this.ui = 'modern'; this.theme = ''; this.lang = 'vi';
        this.proposal = null; this.isTalent = false; this.isEmployer = false;
        this.canReadContact = false;
        this.txt = null;
    }

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }
    get _meta() { return this.proposal?.meta ?? {}; }
    get _deal() { return this._meta.deal ?? {}; }
    get _stage() { return this._meta.stage; }

    _rbSteps() {
        const t = this._txt;
        const steps = STEP_IDS.map((id) => ({ id, label: t[id] ?? id }));
        return html`<web-steps .steps=${steps} active=${this._stage} ui=${this.ui} theme=${this.theme} linear></web-steps>`;
    }

    _rbActions() {
        const t = this._txt;
        const meta = this._meta;
        const stage = this._stage;
        const actions = [];

        if (stage === 'accepted' && !meta.escrow && this.isEmployer) {
            actions.push(html`<web-button type="fill" color="primary" height="40px" @clicked=${() => emit(this, 'deal:issue-escrow', {})}>${t.issueEscrow}</web-button>`);
        }
        if (stage === 'accepted' && meta.escrow === 'held' && this.isTalent) {
            actions.push(html`<web-button type="fill" color="primary" height="40px" @clicked=${() => emit(this, 'deal:mark-in-progress', {})}>${t.markInProgress}</web-button>`);
        }
        if (stage === 'in_progress' && this.isTalent) {
            actions.push(html`<web-button type="fill" color="primary" height="40px" @clicked=${() => emit(this, 'deal:submit-work', {})}>${t.submitWork}</web-button>`);
        }
        if (stage === 'submitted' && this.isEmployer) {
            actions.push(html`<web-button type="fill" color="primary" height="40px" @clicked=${() => emit(this, 'deal:confirm-completed', {})}>${t.confirmCompleted}</web-button>`);
        }
        if (['completed', 'reviewed'].includes(stage) && !this.canReadContact) {
            actions.push(html`<web-button type="soft" color="primary" height="40px" @clicked=${() => emit(this, 'deal:unlock-contact', {})}>${t.unlockContact}</web-button>`);
        }
        if (stage === 'completed' && this.isEmployer) {
            actions.push(html`<web-button type="soft" color="success" height="40px" @clicked=${() => emit(this, 'deal:write-review', {})}>${t.writeReview}</web-button>`);
        }
        if (stage !== 'declined' && !meta.subStatus) {
            actions.push(html`<web-button type="soft" color="error" height="40px" @clicked=${() => emit(this, 'deal:open-dispute', { reason: '' })}>${t.openDispute}</web-button>`);
        }
        return actions;
    }

    render() {
        const t = this._txt;
        const d = this._deal;
        return html`
            <div class="deal">
                <h3>${t.dealTitle}</h3>
                ${this._rbSteps()}
                <div class="deal-terms">
                    <div><span>${t.rate}</span><strong>${fmtPrice(d.rate, this.lang)}</strong></div>
                    <div><span>${t.hoursPerWeek}</span><strong>${d.hoursPerWeek ?? 0}</strong></div>
                    <div><span>${t.weeks}</span><strong>${d.weeks ?? 0}</strong></div>
                    <div><span>${t.startDate}</span><strong>${d.startDate ?? '—'}</strong></div>
                    <div><span>${t.estimatedTotal}</span><strong>${fmtPrice(d.estimatedTotal, this.lang)}</strong></div>
                </div>
                ${d.scope ? html`<p class="deal-scope">${t.scope}: ${d.scope}</p>` : ''}

                <div class="deal-escrow">
                    ${t.escrowLabel}:
                    <strong>${this._meta.escrow === 'released' ? t.escrowReleased : this._meta.escrow === 'held' ? t.escrowHeld : t.escrowNone}</strong>
                </div>

                <div class="deal-actions">${this._rbActions()}</div>
                ${!this._rbActions().length ? html`<p class="deal-waiting">${t.waitingOther}</p>` : ''}
            </div>
        `;
    }
}

if (!customElements.get('svc-proposal-deal')) customElements.define('svc-proposal-deal', SvcProposalDeal);
