import { LitElement, html, unsafeCSS } from 'lit';
import '@/webs/talent/svc-proposal-negotiate.js';
import '@/webs/talent/svc-proposal-deal.js';
import '@/webs/talent/svc-review.js';
import '@/webs/apex/web-toast.js';
import css from './styles/svc-proposal.css?inline';
import { emit, toastEmit, txtLingo, watchHtmlAttr } from '@/services/helper.js';
import {
    listenProposal, maybeAutoExpireProposal,
    counterOffer, acceptProposal, declineProposal, cancelProposal, openDispute,
    markInProgress, submitWork, confirmCompleted,
    issueEscrowInvoice, unlockContact, spendXu,
    findTalentByUserId, findUserById, canReadContact,
} from './tools/service.js';

const TXT_STD = {
    vi: {
        proposed: 'Đang chờ phản hồi', negotiating: 'Đang thương lượng', declined: 'Đã từ chối',
        cancelled: 'Đã huỷ', expired: 'Đã hết hạn', notFound: 'Không tìm thấy đề nghị này.',
        errToast: 'Có lỗi xảy ra, thử lại sau', updatedToast: 'Đã cập nhật',
        notEnoughXu: 'Không đủ Xu — hãy nạp thêm ở Ví Xu.', disputed: 'Đang tranh chấp',
    },
    en: {
        proposed: 'Waiting for response', negotiating: 'Negotiating', declined: 'Declined',
        cancelled: 'Cancelled', expired: 'Expired', notFound: 'Proposal not found.',
        errToast: 'Something went wrong, try again', updatedToast: 'Updated',
        notEnoughXu: 'Not enough Xu — top up in your wallet.', disputed: 'Under dispute',
    },
};

const TERMINAL_STAGES = ['declined'];

/**
 * <svc-proposal> — orchestrator cho 1 proposal/negotiation/deal (hook/new_feature.md §1.4/§2.2/§7).
 * Subscribe live qua listenProposal(), route panel theo `meta.stage`, panel con
 * (`svc-proposal-negotiate`/`svc-proposal-deal`) chỉ emit event — mọi gọi tools/service.js nằm ở
 * đây, đúng mẫu panel-splitting của `webs/pay` (hook/PAY.rst).
 */
export class SvcProposal extends LitElement {
    static styles = unsafeCSS(css);
    static properties = {
        ui: { type: String }, theme: { type: String },
        mainColors: { type: String }, textColor: { type: String },
        lang: { type: String },
        proposalId: { type: String }, currentUserId: { type: String },
        txt: { type: Object },
        _proposal: { state: true }, _talent: { state: true }, _busy: { state: true }, _showReview: { state: true },
    };

    constructor() {
        super();
        this.ui = 'modern'; this.theme = ''; this.mainColors = ''; this.textColor = '';
        this.lang = 'vi';
        this.proposalId = ''; this.currentUserId = '';
        this.txt = null;
        this._proposal = null; this._talent = null; this._busy = false; this._showReview = false;
        this._lastProposalId = null; // proposalId ĐÃ subscribe lần gần nhất — xem updated()
    }

    connectedCallback() {
        super.connectedCallback();
        this._unwatchLang = watchHtmlAttr('lang', (v) => { this.lang = v || 'vi'; });
        this._dcSubscribe();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._unwatchLang?.();
        this._unsub?.();
        clearInterval(this._expireTimer);
    }

    // `proposalId` được set SAU khi mount (bởi <script astro:page-load> đọc `?id=` ở
    // proposal.astro, khác talentId của svc-talent-profile.js vốn bake sẵn lúc build) — Lit báo
    // 'proposalId' "đổi" ngay ở lượt update đầu tiên dù connectedCallback() đã subscribe đúng giá
    // trị đó rồi (cùng race đã gặp ở svc-pay-warden.js's updated()), so khớp `_lastProposalId` để
    // chỉ resubscribe khi giá trị THẬT SỰ đổi.
    updated(changed) {
        if (!changed.has('proposalId') || this.proposalId === this._lastProposalId) return;
        this._dcSubscribe();
    }

    _dcSubscribe() {
        this._unsub?.();
        clearInterval(this._expireTimer);
        this._lastProposalId = this.proposalId;
        if (!this.proposalId) { this._proposal = null; return; }
        this._unsub = listenProposal(this.proposalId, (row) => this._dcOnProposal(row));
        maybeAutoExpireProposal(this.proposalId);
        // Site tĩnh, không có cron — nếu tab ở lại negotiating quá 48h (PROPOSAL_EXPIRE_WINDOW_MS)
        // thì phải tự re-check định kỳ, không chỉ 1 lần lúc mount, nếu không proposal đứng hình
        // mãi cho tới lần load trang kế tiếp.
        this._expireTimer = setInterval(() => maybeAutoExpireProposal(this.proposalId), 5 * 60 * 1000);
    }

    // ── Data Core ──────────────────────────────────────────────────────────
    async _dcOnProposal(row) {
        this._proposal = row;
        if (row?.meta?.talentId && this._talent?.user_id !== row.meta.talentId) {
            this._talent = await findTalentByUserId(row.meta.talentId); // meta.talentId = users.id
        }
    }

    // ── Data Footer — mọi mutation của proposal đi qua đây ───────────────────
    // _patchMeta() (tools/service.js) trả `null` khi guard từ chối (stale UI, đã hết hạn, sai
    // actor, ...) mà KHÔNG throw — trước đây _dfRun coi mọi lần không throw là thành công, báo
    // "Đã cập nhật" dù thực chất chưa đổi gì. Giờ coi kết quả falsy như 1 lỗi mềm.
    async _dfRun(action) {
        if (this._busy) return;
        this._busy = true;
        try {
            const result = await action();
            if (result === null || result === undefined || result === false) {
                toastEmit(this._txt.errToast, 'error');
            } else {
                toastEmit(this._txt.updatedToast, 'success');
            }
        } catch (err) {
            console.error('[talent] proposal action error:', err);
            toastEmit(this._txt.errToast, 'error');
        } finally {
            this._busy = false;
        }
    }

    _dfCounter(e) { this._dfRun(() => counterOffer(this.proposalId, this.currentUserId, e.detail)); }
    _dfAccept() { this._dfRun(() => acceptProposal(this.proposalId, this.currentUserId)); }
    _dfDecline(e) { this._dfRun(() => declineProposal(this.proposalId, this.currentUserId, e.detail.reason)); }
    _dfCancel(e) { this._dfRun(() => cancelProposal(this.proposalId, this.currentUserId, e.detail.reason)); }
    _dfMarkInProgress() { this._dfRun(() => markInProgress(this.proposalId, this.currentUserId)); }
    _dfSubmitWork() { this._dfRun(() => submitWork(this.proposalId, this.currentUserId)); }
    _dfConfirmCompleted() { this._dfRun(() => confirmCompleted(this.proposalId, this.currentUserId)); }
    _dfOpenDispute(e) { this._dfRun(() => openDispute(this.proposalId, this.currentUserId, e.detail.reason)); }
    _dfWriteReview() { this._showReview = true; }
    _dfReviewSubmitted() { this._showReview = false; }

    async _dfIssueEscrow() {
        this._dfRun(async () => {
            const employer = await findUserById(this._meta.employerId);
            return issueEscrowInvoice(this.proposalId, this.currentUserId, {
                seller: { name: this._talent?.title ?? '', phone: this._talent?.meta?.contact?.phone ?? '', email: this._talent?.meta?.contact?.email ?? '', userId: this._talent?.user_id ?? '' },
                buyer: { name: employer?.display_name ?? '', phone: '', email: employer?.email ?? '', userId: this.currentUserId },
            });
        });
    }

    // Mở contact ở giai đoạn Deal (sau khi completed) — vẫn phải trả Xu `unlock_contact` giống hệt
    // panel Hire ở svc-talent-profile.js (`_dfUnlockContact` ở đó), trước đây thiếu bước này nên
    // Employer mở contact miễn phí ở đây trong khi panel kia vẫn tính phí — cùng 1 hành động, phải
    // cùng 1 giá. Không qua _dfRun() (thông báo lỗi Xu riêng, không phải errToast chung chung).
    async _dfUnlockContact() {
        if (this._comCanReadContact || this._busy) return;
        this._busy = true;
        try {
            const spend = await spendXu(this.currentUserId, 'unlock_contact', this.proposalId);
            if (!spend.ok) { toastEmit(this._txt.notEnoughXu, 'error'); return; }
            this._talent = await unlockContact(this._meta.talentId, this._meta.employerId, this.proposalId);
            toastEmit(this._txt.updatedToast, 'success');
        } catch (err) {
            console.error('[talent] unlock contact error:', err);
            toastEmit(this._txt.errToast, 'error');
        } finally {
            this._busy = false;
        }
    }

    // ── Computed ───────────────────────────────────────────────────────────
    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }
    get _meta() { return this._proposal?.meta ?? {}; }
    get _isTalent() { return this.currentUserId && this.currentUserId === this._meta.talentId; }
    get _isEmployer() { return this.currentUserId && this.currentUserId === this._meta.employerId; }
    get _comCanReadContact() { return canReadContact(this.currentUserId, this._talent); }

    render() {
        if (!this._proposal) return html`<p>${this._txt.notFound}</p>`;
        const t = this._txt;
        const meta = this._meta;

        if (meta.subStatus && meta.subStatus !== 'disputed') {
            return html`<div class="proposal-terminal">${t[meta.subStatus] ?? meta.subStatus}</div>`;
        }
        if (TERMINAL_STAGES.includes(meta.stage)) {
            return html`<div class="proposal-terminal">${t[meta.stage] ?? meta.stage}</div>`;
        }

        return html`
            <div class="proposal">
                <h1 class="proposal-title">${this._proposal.title}</h1>
                ${meta.subStatus === 'disputed' ? html`<div class="proposal-banner">⚠️ ${t.disputed}</div>` : ''}

                ${['proposed', 'negotiating'].includes(meta.stage)
                    ? html`
                        <svc-proposal-negotiate .proposal=${this._proposal} .isTalent=${this._isTalent}
                            ui=${this.ui} theme=${this.theme} lang=${this.lang}
                            @negotiate:counter=${(e) => this._dfCounter(e)}
                            @negotiate:accept=${() => this._dfAccept()}
                            @negotiate:decline=${(e) => this._dfDecline(e)}
                            @negotiate:cancel=${(e) => this._dfCancel(e)}></svc-proposal-negotiate>
                    `
                    : html`
                        <svc-proposal-deal .proposal=${this._proposal} .isTalent=${this._isTalent} .isEmployer=${this._isEmployer}
                            .canReadContact=${this._comCanReadContact} ui=${this.ui} theme=${this.theme} lang=${this.lang}
                            @deal:mark-in-progress=${() => this._dfMarkInProgress()}
                            @deal:submit-work=${() => this._dfSubmitWork()}
                            @deal:confirm-completed=${() => this._dfConfirmCompleted()}
                            @deal:issue-escrow=${() => this._dfIssueEscrow()}
                            @deal:unlock-contact=${() => this._dfUnlockContact()}
                            @deal:open-dispute=${(e) => this._dfOpenDispute(e)}
                            @deal:write-review=${() => this._dfWriteReview()}></svc-proposal-deal>
                    `}

                ${this._showReview && meta.stage === 'completed' && this._isEmployer ? html`
                    <svc-review proposalId=${this.proposalId} employerId=${this.currentUserId}
                        ui=${this.ui} theme=${this.theme} lang=${this.lang}
                        @review:submitted=${() => this._dfReviewSubmitted()}></svc-review>
                ` : ''}
            </div>
        `;
    }
}

if (!customElements.get('svc-proposal')) customElements.define('svc-proposal', SvcProposal);
