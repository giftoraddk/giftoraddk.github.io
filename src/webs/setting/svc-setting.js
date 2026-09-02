import { LitElement, html, unsafeCSS, nothing } from 'lit';
import '@/webs/apex/web-setting.js';
import '@/webs/underlay/svc-underlay.js';
import css from './styles/svc-setting.css?inline';
import { setup, init, save, preview, cancel, onEvents, subscribe, canEdit, reapply, flatToBg } from './tools/service.js';
import { getStyleOpts, txtLingo } from '@/services/helper.js';

const TXT_STD = {
    vi: {
        title: 'Cấu hình hiển thị',
        uiModern: 'Modern', uiSpatial: 'Spatial',
        themeLight: '☀️ Light', themeDark: '🌙 Dark',
        variant: 'Variant — Giao diện', style: 'Phong cách', theme: 'Theme',
        mainColors: 'Màu chủ đạo', textColor: 'Màu chữ',
        bgTitle: 'Nền — Background',
        bgRounded: 'Bo góc', bgTint: 'Màu seed', bgTotal: 'Số màu',
        bgBlur: 'Blur (kính mờ)', bgGradient: 'Hiện blob màu',
        bgType: 'Kiểu bố cục', bgColorful: 'Dải màu (nhiều hue)', bgDeg: 'Góc khởi đầu',
        bgDistance: 'Bán kính lan (%)',
        yes: 'Có', no: 'Không',
        typeCircleOverlap: 'Circle Overlap', typeEllipse: 'Ellipse',
        sectionsTitle: 'Sections', sectionLabel: 'Section',
    },
    en: {
        title: 'Display configuration',
        uiModern: 'Modern', uiSpatial: 'Spatial',
        themeLight: '☀️ Light', themeDark: '🌙 Dark',
        variant: 'Variant — Appearance', style: 'Style', theme: 'Theme',
        mainColors: 'Main colors', textColor: 'Text color',
        bgTitle: 'Background',
        bgRounded: 'Border radius', bgTint: 'Seed color', bgTotal: 'Color count',
        bgBlur: 'Blur (glass)', bgGradient: 'Show color blobs',
        bgType: 'Layout type', bgColorful: 'Colorful (multi-hue)', bgDeg: 'Start angle',
        bgDistance: 'Spread radius (%)',
        yes: 'Yes', no: 'No',
        typeCircleOverlap: 'Circle Overlap', typeEllipse: 'Ellipse',
        sectionsTitle: 'Sections', sectionLabel: 'Section',
    },
}

export class SvcSetting extends LitElement {
    static styles = unsafeCSS(css);
    static properties = {
        ui:       { type: String },
        service:  { type: String },
        link:     { type: String },
        variant:  { type: Object },
        sections: { type: Array  },
        txt:      { type: Object },
        lang:     { type: String },
        _values:  { state: true  },
        _canEdit: { state: true  },
    };

    constructor() {
        super();
        this.ui        = 'spatial';
        this.service   = 'setting';
        this.link      = '';
        this.variant   = {};
        this.sections  = [];
        this.txt       = null;
        this.lang      = 'vi';
        this._values   = {};
        this._canEdit  = false;
        this._unsub    = null;
        this._unsubEv  = null;
        this._onPageLoad = null;
    }

    // ==========================================
    // LIFECYCLE
    // ==========================================

    connectedCallback() {
        super.connectedCallback();
        this._dcInit();
        this._onPageLoad = () => reapply(this.service);
        document.addEventListener('astro:page-load', this._onPageLoad);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._unsub?.();
        this._unsubEv?.();
        document.removeEventListener('astro:page-load', this._onPageLoad);
    }

    // ==========================================
    // DATA CORE
    // ==========================================

    async _dcInit() {
        setup(this.service, { link: this.link, variant: this.variant, sections: this.sections });

        this._unsub = subscribe(this.service, async s => {
            this._values = s.values ?? {};
            const { canEdit: ok } = await canEdit(this.service);
            this._canEdit = ok;
        });

        this._unsubEv = onEvents(this.service, {
            onSave:    d => this._emit('act:submit',  { e: 'act:submit',  data: d }),
            onPreview: d => this._emit('act:preview', { e: 'act:preview', data: d }),
            onCancel:  d => this._emit('act:preview', { e: 'act:preview', data: d }),
        });

        await init(this.service);
    }

    // ==========================================
    // DATA HEAD
    // ==========================================

    _dhSave(e)    { save(this.service, e.detail); }
    _dhPreview(e) { preview(this.service, e.detail); }
    _dhCancel()   { cancel(this.service); }

    // ==========================================
    // COMPUTED — option lists (localized)
    // ==========================================

    get _uiOpts() {
        const txt = this._txt;
        return [
            { value: 'modern',  label: txt.uiModern },
            { value: 'spatial', label: txt.uiSpatial },
        ];
    }

    get _themeOpts() {
        const txt = this._txt;
        return [
            { value: 'light', label: txt.themeLight },
            { value: 'dark',  label: txt.themeDark },
        ];
    }

    get _boolOpts() {
        const txt = this._txt;
        return [
            { value: 'true',  label: txt.yes },
            { value: 'false', label: txt.no  },
        ];
    }

    get _bgTypeOpts() {
        const txt = this._txt;
        return [
            { value: 'circleOverlap', label: txt.typeCircleOverlap },
            { value: 'ellipse',       label: txt.typeEllipse },
        ];
    }

    // ==========================================
    // COMPUTED — form schema
    // ==========================================

    _comVariantForm() {
        return {
            title: this._txt.variant,
            fields: [
                { label: this._txt.style,      type: 'select', opts: this._uiOpts,    root: 'ui' },
                { label: this._txt.theme,      type: 'select', opts: this._themeOpts, root: 'theme' },
                { label: this._txt.mainColors, type: 'colors', full: true,  root: 'mainColors' },
                { label: this._txt.textColor,  type: 'colors', single: true, root: 'textColor' },
            ],
        };
    }

    _comBgForm() {
        return {
            title: this._txt.bgTitle,
            open:  false,
            fields: [
                { label: this._txt.bgTint,     type: 'colors', single: true, root: 'bg_tint' },
                { label: this._txt.bgRounded,  type: 'text',   hint: '1.75rem', root: 'bg_rounded' },
                { label: this._txt.bgTotal,    type: 'text',   hint: '1-7',     root: 'bg_total' },
                { label: this._txt.bgType,     type: 'select', opts: this._bgTypeOpts, root: 'bg_blobType' },
                { label: this._txt.bgBlur,     type: 'select', opts: this._boolOpts,   root: 'bg_blur' },
                { label: this._txt.bgGradient, type: 'select', opts: this._boolOpts,   root: 'bg_gradient' },
                { label: this._txt.bgColorful, type: 'select', opts: this._boolOpts,   root: 'bg_colorful' },
                { label: this._txt.bgDeg,      type: 'text',   hint: '0',   root: 'bg_deg' },
                { label: this._txt.bgDistance, type: 'text',   hint: '86',  root: 'bg_distance' },
            ],
        };
    }

    // Sections của view đang active — nhóm chung 1 group, mỗi section 1 sub-panel
    _comSectionsForm() {
        const secs = this._values.sections ?? [];
        if (!secs.length) return null;
        return {
            title: this._txt.sectionsTitle,
            open:  false,
            sections: secs.map(sec => {
                // web-select cần { value, label } — configList lưu { key, config, label }, tách
                // value=key ra vì config object (chứa layout kiểu makes: [[...]]) không thể là
                // value của field (Firestore từ chối nested array khi persist).
                const cfgOpts = (sec.configList ?? []).map(c => ({ value: c.key, label: c.label }));
                return {
                    title: `${this._txt.sectionLabel} — ${sec.id}`,
                    open:  false,
                    fields: [
                        cfgOpts.length > 1 && { label: this._txt.layout, type: 'select', opts: cfgOpts, sec: { id: sec.id, key: 'configKey' } },
                    ].filter(Boolean),
                };
            }),
        };
    }

    get _comForm() {
        return [this._comVariantForm(), this._comBgForm(), this._comSectionsForm()].filter(Boolean);
    }

    // getStyleOpts() output — bind trực tiếp lên <svc-underlay>, reactive theo _values hiện tại
    get _comBg() {
        return getStyleOpts(flatToBg(this._values));
    }

    // ==========================================
    // HELPER
    // ==========================================

    _emit(name, detail = {}) {
        this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }

    // ==========================================
    // RENDER
    // ==========================================

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }

    render() {
        const bg = this._comBg;
        return html`
            <svc-underlay id="main-bg"
                .rounded=${bg.rounded} .tint=${bg.tint}
                ?blur=${bg.blur} ?gradient=${bg.gradient} ?colorful=${bg.colorful}
                .blobType=${bg.blobType} .distance=${bg.distance} .deg=${bg.deg}
                .total=${bg.total}
            ></svc-underlay>

            ${this._canEdit ? html`
                <web-setting
                    .ui=${this.ui}
                    .schema=${this._comForm}
                    .values=${this._values}
                    title="${this._txt.title}"
                    @setting-save=${e => this._dhSave(e)}
                    @setting-preview=${e => this._dhPreview(e)}
                    @setting-cancel=${() => this._dhCancel()}
                ></web-setting>` : nothing}`;
    }
}

if (!customElements.get('svc-setting')) customElements.define('svc-setting', SvcSetting);
