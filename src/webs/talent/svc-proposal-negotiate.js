import { LitElement, html, unsafeCSS } from 'lit';
import '@/webs/apex/web-text.js';
import '@/webs/apex/web-textarea.js';
import '@/webs/apex/web-button.js';
import css from './styles/svc-proposal-negotiate.css?inline';
import { emit, txtLingo } from '@/services/helper.js';

const _fmtDateTime = (iso) => { try { return new Date(iso).toLocaleString(); } catch { return iso ?? ''; } };

const TXT_STD = {
    vi: {
        historyTitle: 'Lịch sử thương lượng', rateLabel: 'Rate', hoursLabel: 'Giờ/tuần', weeksLabel: 'Số tuần',
        messageLabel: 'Lời nhắn', counter: 'Đề xuất lại', accept: 'Chấp nhận', decline: 'Từ chối',
        proposed: 'đề xuất', countered: 'đề xuất lại', accepted: 'chấp nhận', declined: 'từ chối',
        declineReasonPh: 'Lý do từ chối (tuỳ chọn)...', cancel: 'Huỷ đề nghị',
    },
    en: {
        historyTitle: 'Negotiation history', rateLabel: 'Rate', hoursLabel: 'Hours/week', weeksLabel: 'Weeks',
        messageLabel: 'Message', counter: 'Counter offer', accept: 'Accept', decline: 'Decline',
        proposed: 'proposed', countered: 'countered', accepted: 'accepted', declined: 'declined',
        declineReasonPh: 'Reason for declining (optional)...', cancel: 'Cancel proposal',
    },
};

/**
 * <svc-proposal-negotiate> — panel thuần render cho stage 'proposed'/'negotiating' (docs/new_feature.md
 * §2.2). Chỉ emit `negotiate:*`, KHÔNG tự gọi tools/service.js — cha (`<svc-proposal>`) mới gọi.
 */
export class SvcProposalNegotiate extends LitElement {
    static styles = unsafeCSS(css);
    static properties = {
        ui: { type: String }, theme: { type: String }, lang: { type: String },
        proposal: { type: Object }, isTalent: { type: Boolean },
        txt: { type: Object },
        _form: { state: true },
    };

    constructor() {
        super();
        this.ui = 'modern'; this.theme = ''; this.lang = 'vi';
        this.proposal = null; this.isTalent = false;
        this.txt = null;
        this._form = { rate: 0, hoursPerWeek: 0, weeks: 0, message: '' };
        this._formInit = false;
    }

    willUpdate(changed) {
        if (changed.has('proposal') && this.proposal && !this._formInit) {
            const last = this._comLastEntry;
            this._form = { rate: last?.rate ?? 0, hoursPerWeek: last?.hoursPerWeek ?? 0, weeks: last?.weeks ?? 0, message: '' };
            this._formInit = true;
        }
    }

    _dhField(key, value) { this._form = { ...this._form, [key]: value }; }

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }
    get _comHistory() { return this.proposal?.meta?.history ?? []; }
    get _comLastEntry() { return this._comHistory[this._comHistory.length - 1]; }

    _rfHistoryEntry(entry) {
        const t = this._txt;
        return html`
            <div class="negotiate-entry">
                <div class="negotiate-entry-head">
                    <strong>${t[entry.action] ?? entry.action}</strong>
                    <span>${_fmtDateTime(entry.ts)}</span>
                </div>
                ${entry.rate ? html`<div class="negotiate-entry-terms">${entry.rate}/h · ${entry.hoursPerWeek}h/tuần · ${entry.weeks} tuần</div>` : ''}
                ${entry.message ? html`<p>${entry.message}</p>` : ''}
            </div>
        `;
    }

    render() {
        const t = this._txt;
        const f = this._form;
        return html`
            <div class="negotiate">
                <h3>${t.historyTitle}</h3>
                <div class="negotiate-history">${this._comHistory.map((e) => this._rfHistoryEntry(e))}</div>

                <div class="negotiate-form">
                    <web-text type="number" placeholder=${t.rateLabel} ui=${this.ui} theme=${this.theme} .value=${String(f.rate)}
                        @input=${(e) => this._dhField('rate', e.detail.value)}></web-text>
                    <web-text type="number" placeholder=${t.hoursLabel} ui=${this.ui} theme=${this.theme} .value=${String(f.hoursPerWeek)}
                        @input=${(e) => this._dhField('hoursPerWeek', e.detail.value)}></web-text>
                    <web-text type="number" placeholder=${t.weeksLabel} ui=${this.ui} theme=${this.theme} .value=${String(f.weeks)}
                        @input=${(e) => this._dhField('weeks', e.detail.value)}></web-text>
                    <web-textarea placeholder=${t.messageLabel} rows="2" ui=${this.ui} theme=${this.theme} .value=${f.message}
                        @input=${(e) => this._dhField('message', e.detail?.value ?? '')}></web-textarea>
                </div>

                <div class="negotiate-actions">
                    <web-button type="soft" color="primary" height="40px"
                        @clicked=${() => emit(this, 'negotiate:counter', { ...f })}>${t.counter}</web-button>
                    <web-button type="fill" color="primary" height="40px"
                        @clicked=${() => emit(this, 'negotiate:accept', {})}>${t.accept}</web-button>
                    <web-button type="soft" color="error" height="40px"
                        @clicked=${() => emit(this, 'negotiate:decline', { reason: '' })}>${t.decline}</web-button>
                    <web-button type="outline" color="base" height="40px"
                        @clicked=${() => emit(this, 'negotiate:cancel', { reason: '' })}>${t.cancel}</web-button>
                </div>
            </div>
        `;
    }
}

if (!customElements.get('svc-proposal-negotiate')) customElements.define('svc-proposal-negotiate', SvcProposalNegotiate);
