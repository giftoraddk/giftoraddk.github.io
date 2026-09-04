import { LitElement, html, unsafeCSS } from 'lit';
import '@/webs/apex/web-text.js';
import '@/webs/apex/web-textarea.js';
import '@/webs/apex/web-button.js';
import '@/webs/media/svc-photor.js';
import css from './styles/svc-pay-reason.css?inline';
import { emit } from '@/services/helper.js';
import { loadHandlerCache, saveHandlerCache } from './tools/service.js';

/**
 * <svc-pay-reason> — form dùng CHUNG "ai xử lý bước này, vì sao" cho MỌI action-panel của
 * <svc-pay> (preparing/packing/shipping/delivered/received/cancel/reject/refund/return...) — thay
 * hẳn _rbHandlerForm() cũ (đã xoá khỏi svc-pay.js). 1 cột dọc CỐ ĐỊNH thứ tự: tiêu đề -> tên -> sđt
 * -> ghi chú (dùng LUÔN làm "lý do" cho panel nào bắt buộc nhập — khỏi cần 1 textarea rời như
 * trước) -> ảnh minh chứng (tuỳ chọn, `showMedia`) -> nút action.
 *
 * Controlled component THUẦN — không tự giữ state nội bộ, `name/phone/note/media` luôn do parent
 * truyền vào; mỗi lần đổi field bắn `reason:input` ({key, value}), bấm nút bắn `reason:action` —
 * parent tự merge state + gọi service.js tương ứng.
 *
 * `showMedia` (mặc định false) bật thêm `<svc-photor>` — dùng CHUNG cho mọi form cần đính
 * ảnh minh chứng (return: ảnh hàng trả; delivery: ảnh xác nhận đã giao...) thay vì mỗi nơi gọi tự
 * render `<svc-photor>` + tự quản lý 1 state `media` rời như trước — nay chỉ cần truyền
 * `?showMedia mediaPh=... media=${h.media}`, đổi field `media` cũng đi qua CHUNG event
 * `reason:input` ({key:'media', value}) như name/phone/note.
 *
 * Đặt 2 instance cạnh nhau trong 1 container `.reason-columns` (CSS grid ở svc-pay.css) là cách
 * tạo layout "2 phần bằng nhau" (vd panel 'preparing': cột trái hoàn thành xử lý, cột phải huỷ đơn).
 * `actionLabel` rỗng ('') → ẩn hẳn nút action (dùng khi 1 form cần nhiều nút bên ngoài component,
 * vd nhánh accept/reject cùng chia sẻ 1 form nhưng 2 nút riêng, xem _rbCancelBlockSeller()).
 * `titleColor` (vd 'error') tô màu riêng cho `title` — dùng cho các form cancel/return (hành động
 * huỷ bỏ/rẽ nhánh tiêu cực), đi kèm `actionType="soft"` ở nơi gọi cho đồng bộ.
 *
 * 2 cơ chế đỡ gõ lại name/phone — VẪN đi qua đúng `reason:input` như user tự gõ, KHÔNG phá vỡ tính
 * "controlled thuần" (parent luôn là nguồn sự thật cuối, component không tự giữ state riêng):
 *   1. Cache IndexedDB theo TỪNG BƯỚC (`stepKey`, vd 'packing'/'shipping'/'delivered'/'refund'... —
 *      xem tools/service.js's loadHandlerCache/saveHandlerCache, lưu 1 map `{ [stepKey]: {name,
 *      phone} }`) — lúc mount, nếu `name`+`phone` đang RỖNG cả 2 (form mới, chưa ai seed gì) thì tự
 *      nạp lại giá trị lần gõ gần nhất CỦA ĐÚNG bước này; mỗi lần đổi name/phone (debounce 500ms) tự
 *      lưu. Cố ý tách riêng theo bước (không dùng 1 slot chung) — người đóng gói/người giao hàng/
 *      đơn vị vận chuyển thường KHÁC NHAU giữa các bước. `stepKey` rỗng = tắt hẳn cache cho form đó.
 *      Khác hẳn `quickName`/`quickPhone` bên dưới — cache này KHÔNG biết gì về invoice đang mở.
 *   2. Nút "gán nhanh" (`quickName`/`quickPhone`/`quickLabel`, ẩn nếu `quickLabel` rỗng hoặc cả 2
 *      quickName/quickPhone đều rỗng) — nơi gọi truyền ĐÚNG identity seller/buyer CỦA invoice đang
 *      mở (vd svc-pay.js's `_comSellerPrefill`/`_comBuyerPrefill`), bấm vào điền thẳng cả 2 field.
 */
export class SvcPayReason extends LitElement {
	static styles = unsafeCSS(css);
	static properties = {
		ui: { type: String },
		theme: { type: String },
		mainColors: { type: String },
		textColor: { type: String },

		title: { type: String },
		titleColor: { type: String }, // '' = màu chữ mặc định (currentColor); vd 'error' cho cancel/return
		name: { type: String },
		phone: { type: String },
		note: { type: String },
		media: { type: String }, // ảnh minh chứng (nhiều ảnh nối `|`) — chỉ hiển thị khi showMedia
		namePh: { type: String },
		phonePh: { type: String },
		notePh: { type: String },
		mediaPh: { type: String },
		showNote: { type: Boolean },
		showMedia: { type: Boolean },

		stepKey: { type: String }, // vd 'packing'/'shipping'/'delivered'/'refund'... — khoá cache riêng cho bước này, rỗng = tắt cache

		quickName: { type: String }, // identity seller/buyer CỦA invoice đang mở (vd svc-pay.js's _comSellerPrefill) — nguồn cho nút "gán nhanh"
		quickPhone: { type: String },
		quickLabel: { type: String }, // rỗng = ẩn hẳn nút "gán nhanh"

		actionLabel: { type: String },
		actionColor: { type: String },
		actionType: { type: String },
		actionDisabled: { type: Boolean },
	};

	constructor() {
		super();
		this.ui = 'modern';
		this.theme = '';
		this.mainColors = '';
		this.textColor = '';

		this.title = '';
		this.titleColor = '';
		this.name = '';
		this.phone = '';
		this.note = '';
		this.media = '';
		this.namePh = '';
		this.phonePh = '';
		this.notePh = '';
		this.mediaPh = '';
		this.showNote = true;
		this.showMedia = false;

		this.stepKey = '';

		this.quickName = '';
		this.quickPhone = '';
		this.quickLabel = '';

		this.actionLabel = '';
		this.actionColor = 'primary';
		this.actionType = 'fill';
		this.actionDisabled = false;

		this._cacheSaveTimer = null;
	}

	// Nạp cache ĐÚNG 1 lần lúc mount, chỉ khi có stepKey VÀ cả name/phone đang rỗng — form đã có
	// giá trị (parent seed sẵn từ buyerPrefill/sellerPrefill, hoặc đang mở lại 1 form đã gõ dở) thì
	// tuyệt đối không đè. Recheck sau await (đọc IndexedDB) phòng parent kịp set prop trong lúc chờ.
	async connectedCallback() {
		super.connectedCallback();
		if (!this.stepKey || this.name || this.phone) return;
		const cached = await loadHandlerCache(this.stepKey);
		if (this.name || this.phone) return;
		if (cached.name) emit(this, 'reason:input', { key: 'name', value: cached.name });
		if (cached.phone) emit(this, 'reason:input', { key: 'phone', value: cached.phone });
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		clearTimeout(this._cacheSaveTimer);
	}

	_dhInput(key, value) {
		emit(this, 'reason:input', { key, value });
		if (!this.stepKey || (key !== 'name' && key !== 'phone')) return;
		// Debounce, đọc this.name/this.phone tại thời điểm timer bắn (KHÔNG phải ngay lúc gõ) —
		// parent lúc đó chắc chắn đã merge state + trả prop mới xuống qua round-trip controlled,
		// tránh lưu nhầm giá trị field còn lại theo bản CŨ (còn rỗng) do đọc sớm.
		clearTimeout(this._cacheSaveTimer);
		this._cacheSaveTimer = setTimeout(() => saveHandlerCache(this.stepKey, { name: this.name, phone: this.phone }), 500);
	}

	_dhQuickFill() {
		if (this.quickName) this._dhInput('name', this.quickName);
		if (this.quickPhone) this._dhInput('phone', this.quickPhone);
	}

	_dfAction() {
		if (!this.actionDisabled) emit(this, 'reason:action', {});
	}

	render() {
		return html`
			<div class="reason-form">
				<div class="reason-head">
					<div class="reason-title" style=${this.titleColor ? `color: var(--color-${this.titleColor})` : ''}>${this.title}</div>
					<div>
            ${this.quickLabel && (this.quickName || this.quickPhone)
						? html`
								<web-button
									class="reason-quickfill"
									type="soft"
									color="primary"
									height="28px"
									ui="modern"
									theme=${this.theme}
									@clicked=${() => this._dhQuickFill()}>
									${this.quickLabel}
								</web-button>
						  `
						: ''}
          </div>
				</div>
				<web-text class="reason-input" height="36px" placeholder=${this.namePh} ui=${this.ui} theme=${this.theme} .value=${this.name} @input=${(e) => this._dhInput('name', e.detail.value)}></web-text>
				<web-text class="reason-input" placeholder=${this.phonePh} ui=${this.ui} theme=${this.theme} height="36px" .value=${this.phone} @input=${(e) => this._dhInput('phone', e.detail.value)}></web-text>
				${this.showNote
					? html`
							<web-textarea
								class="reason-input"
								placeholder=${this.notePh}
								.value=${this.note}
								rows="3"
								ui=${this.ui}
								theme=${this.theme}
								@input=${(e) => this._dhInput('note', e.detail?.value ?? '')}></web-textarea>
					  `
					: ''}
				${this.showMedia
					? html`
							<svc-photor
								class="reason-input"
								multiple
								ui=${this.ui}
								placeholder=${this.mediaPh}
								.value=${this.media}
								@change=${(e) => this._dhInput('media', e.detail.value)}></svc-photor>
					  `
					: ''}
				${this.actionLabel
					? html`
							<web-button type=${this.actionType} color=${this.actionColor} height="40px" ?disabled=${this.actionDisabled} @clicked=${() => this._dfAction()}>
								${this.actionLabel}
							</web-button>
					  `
					: ''}
			</div>
		`;
	}
}

if (!customElements.get('svc-pay-reason')) customElements.define('svc-pay-reason', SvcPayReason);
