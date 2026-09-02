import { LitElement, html, unsafeCSS } from 'lit';
import '@/webs/apex/web-rating.js';
import '@/webs/apex/web-textarea.js';
import '@/webs/apex/web-button.js';
import '@/webs/apex/web-toast.js';
import css from './styles/svc-review.css?inline';
import { emit, toastEmit, txtLingo } from '@/services/helper.js';
import { submitReview } from './tools/service.js';

const DIMENSIONS = ['quality', 'communication', 'deadline', 'professional'];

const TXT_STD = {
    vi: {
        title: 'Đánh giá Talent', overall: 'Đánh giá chung', quality: 'Chất lượng', communication: 'Giao tiếp',
        deadline: 'Đúng deadline', professional: 'Chuyên nghiệp', commentPh: 'Nhận xét của bạn...',
        submit: 'Gửi đánh giá', submittedToast: 'Cảm ơn bạn đã đánh giá!', errToast: 'Có lỗi xảy ra, thử lại sau',
    },
    en: {
        title: 'Review Talent', overall: 'Overall', quality: 'Quality', communication: 'Communication',
        deadline: 'Deadline', professional: 'Professional', commentPh: 'Your comment...',
        submit: 'Submit review', submittedToast: 'Thanks for your review!', errToast: 'Something went wrong, try again',
    },
};

/**
 * <svc-review> — form submit review (docs/new_feature.md §1.5), chỉ hiện khi cha (`<svc-proposal>`)
 * xác nhận `proposal.meta.stage === 'completed'` và người xem là đúng employer của deal đó — điều
 * kiện hợp lệ THẬT vẫn được `submitReview()` check lại ở tools/service.js.
 */
export class SvcReview extends LitElement {
    static styles = unsafeCSS(css);
    static properties = {
        ui: { type: String }, theme: { type: String }, lang: { type: String },
        proposalId: { type: String }, employerId: { type: String },
        txt: { type: Object },
        _overall: { state: true }, _breakdown: { state: true }, _comment: { state: true }, _sending: { state: true },
    };

    constructor() {
        super();
        this.ui = 'modern'; this.theme = ''; this.lang = 'vi';
        this.proposalId = ''; this.employerId = '';
        this.txt = null;
        this._overall = 5;
        this._breakdown = { quality: 5, communication: 5, deadline: 5, professional: 5 };
        this._comment = ''; this._sending = false;
    }

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }

    _dhDimension(dim, value) { this._breakdown = { ...this._breakdown, [dim]: value }; }

    async _dfSubmit() {
        if (this._sending) return;
        this._sending = true;
        try {
            await submitReview(this.employerId, this.proposalId, {
                rating: this._overall, comment: this._comment, breakdown: this._breakdown,
            });
            toastEmit(this._txt.submittedToast, 'success');
            emit(this, 'review:submitted', { proposalId: this.proposalId });
        } catch (err) {
            console.error('[talent] submitReview error:', err);
            toastEmit(this._txt.errToast, 'error');
        } finally {
            this._sending = false;
        }
    }

    render() {
        const t = this._txt;
        return html`
            <div class="review">
                <h3>${t.title}</h3>
                <div class="review-dimension">
                    <span>${t.overall}</span>
                    <web-rating value=${this._overall} max="5" mask="mask-star-2" color="primary"
                        @change=${(e) => { this._overall = e.detail.value; }}></web-rating>
                </div>
                ${DIMENSIONS.map((dim) => html`
                    <div class="review-dimension">
                        <span>${t[dim]}</span>
                        <web-rating value=${this._breakdown[dim]} max="5" size="sm" mask="mask-star-2" color="primary"
                            @change=${(e) => this._dhDimension(dim, e.detail.value)}></web-rating>
                    </div>
                `)}
                <web-textarea placeholder=${t.commentPh} rows="3" ui=${this.ui} theme=${this.theme} .value=${this._comment}
                    @input=${(e) => { this._comment = e.detail?.value ?? ''; }}></web-textarea>
                <web-button type="fill" color="primary" height="40px" ?loading=${this._sending} @clicked=${() => this._dfSubmit()}>${t.submit}</web-button>
            </div>
        `;
    }
}

if (!customElements.get('svc-review')) customElements.define('svc-review', SvcReview);
