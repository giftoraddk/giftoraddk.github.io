import { LitElement, html, unsafeCSS } from 'lit';
import { isObject, dataInit, cssInline } from '@/services/helper.js';
import { loadKey } from '@/services/crud.js';
import { all as conductorAll, get as conductorGet } from '@/services/conductor.js';

// CSS Imports
import boxStyles from './styles/web-box.css?inline';
import animeStyles from './styles/anime.css?inline';
import './web-cell.js';

/**
 * [1] WebBox (Main Box)
 * Nội dung: Điểm bắt đầu, xử lý data từ API/Store và render danh sách các Cell.
 */
export class WebBox extends LitElement {
	static properties = {
		dataSrc:   { type: String }, // "url~nested"
		dataTable: { type: String }, // "collection~nested" (Firestore) or resource name
		data: { type: Object, converter: { fromAttribute: (v) => dataInit(v, {}) } }, // direct data input
		theme: { type: String }, // light/dark/...
		mainColors: { type: String }, // Chuỗi 5 màu: primary|secondary|accent|info|warning
		textColor: { type: String }, // Màu chữ
		lang: { type: String }, // 'vi' | 'en' — forward xuống web-cell cho _resolveLocale()
		makes: { type: Array, converter: { fromAttribute: (v) => dataInit(v, []) } }, // { bit, ext, opt }, ex: [{}, {}, {}, ...]
		groupJustify: { type: Array, converter: { fromAttribute: (v) => dataInit(v, []) } }, // 'left', 'right', 'center', 'none', ex: ["", "", "", ...]
		groupStyle: { type: Array, converter: { fromAttribute: (v) => dataInit(v, []) } }, // [{ margin: '1rem' }, ... ]
		groupCol: { type: Array, converter: { fromAttribute: (v) => dataInit(v, []) } }, // 1 -> 12, ex: ["", "", "", ...]
		groupRow: { type: Array, converter: { fromAttribute: (v) => dataInit(v, []) } }, // 1 -> 12, ex: ["", "", "", ...]
		stys: { type: Object }, // style custom nếu có
		loader: { type: Number },
		refresh: { type: Boolean },
		anime: { type: String }, // animation class name from anime.css
		ui: { type: String }, // modern, spatial, etc.
		zoom: { type: Boolean }, // forward xuống web-cell → mode 'gallery' — chỉ web-board bật cho section products
	};

	static styles = [unsafeCSS(boxStyles), unsafeCSS(animeStyles)];

	constructor() {
		super();
		this.resData = {};
		this.theme = 'light';
		this.lang = 'vi';
		this.stys = {};
		this.anime = 'fade-in-fwd';
		this.ui = 'modern';
	}

	connectedCallback() {
		super.connectedCallback();
		if (this.refresh === undefined) this.refresh = true;
	}

	willUpdate(changed) {
		// Khi data prop thay đổi trực tiếp (vd: từ web-boxs filter),
		// cập nhật resData và loader ngay lập tức, không qua boxIO()
		if (changed.has('data') && isObject(this.data) && Object.keys(this.data).length > 0) {
			this.resData  = this.data;
			this.loader   = 2;      // đánh dấu đã load xong, ẩn loading state
			this.refresh  = false;  // ngăn boxIO() chạy lại
		} else if (changed.has('refresh') || changed.has('dataSrc') || changed.has('dataTable')) {
			this.boxIO();
		}
		if (changed.has('theme') || changed.has('mainColors') || changed.has('textColor')) {
			this.updateCSS();
		}
	}

	get colors() {
		const colors = (this.mainColors || '').split('|').map((c) => c.trim());
		return {
			primary: colors[0] || '#2ebd85',
			secondary: colors[1] || '#f5465c',
			accent: colors[2] || '#a855f7',
			info: colors[3] || '#00c7d4',
			warning: colors[4] || '#fbbf24',
		};
	}

	get allStyles() {
		const c = this.colors;
		return {
			...this.stys,
			'--color-primary': c.primary,
			'--color-secondary': c.secondary,
			'--color-accent': c.accent,
			'--color-info': c.info,
			'--color-warning': c.warning,
			'--color-base-content': this.textColor || 'inherit',
		};
	}

	updateCSS() {
		this.setAttribute('data-theme', this.theme || 'light');
		const s = this.allStyles;
		Object.entries(s).forEach(([k, v]) => {
			if (k.startsWith('--')) this.style.setProperty(k, v);
		});
	}

	async boxIO() {
		if (!this.refresh) return;
		this.loader = 1;
		const res = await this.boxData();
		if (isObject(res)) {
			this.resData = res;
			this.refresh = false;
		}
	}

	async boxData() {
		try {
			let res = {};
			if (this.dataSrc || this.dataTable) {
				const id = loadKey(this.dataSrc, this.dataTable);
				await conductorAll(id, { dataSrc: this.dataSrc, dataTable: this.dataTable });
				res = conductorGet(id)?.data?.[0] ?? {};
			} else if (isObject(this.data)) {
				res = this.data;
			}
			this.loader = 2;
			return res;
		} catch {
			this.loader = 0;
			return {};
		}
	}

	render() {
		const makes      = this.makes      || [];
		const groupJustify = this.groupJustify || [];
		const groupCol   = this.groupCol   || [];
		const groupRow   = this.groupRow   || [];
		const groupStyle = this.groupStyle || [];

		const inlineStyle = cssInline(this.allStyles);
		const posKeys = new Set(['overflow', 'position', 'top', 'right', 'bottom', 'left', 'inset', 'zIndex']);

		return html`
			<div data-theme=${this.theme} class="gi-wrap ${this.ui || ''} ${this.anime || ''}" style="${inlineStyle}">
				${makes.map((_, i) => {
			const col = parseInt(groupCol[i]);
			const row = parseInt(groupRow[i]);
			const gridCls = ['gi', !isNaN(col) ? `gi-col-${col}` : '', !isNaN(row) ? `gi-row-${row}` : ''].filter(Boolean).join(' ');

			const gsObj = groupStyle[i] || {};
			const hostStys = Object.fromEntries(Object.entries(gsObj).filter(([k]) => posKeys.has(k)));
			const innerStys = Object.fromEntries(Object.entries(gsObj).filter(([k]) => !posKeys.has(k)));

			return html`
						<web-cell
							class=${gridCls}
							style=${cssInline(hostStys)}
							.mainColors=${this.mainColors}
							.textColor=${this.textColor}
							.info=${this.resData}
							.makes=${makes[i]}
							.justify=${groupJustify[i] || 'none'}
							.stys=${innerStys}
							.loading=${this.loader !== 2}
							.theme=${this.theme}
							.lang=${this.lang}
							.ui=${this.ui}
							.zoom=${this.zoom}></web-cell>
					`;
		})}
			</div>
		`;
	}
}
customElements.define('web-box', WebBox);
