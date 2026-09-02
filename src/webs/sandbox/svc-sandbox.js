import { LitElement, html } from 'lit';
import * as spatial from '@/sections/spatial.js';
import '@/webs/apex/web-board.js';
import '@/webs/apex/web-select.js';
import '@/webs/apex/web-code.js';
import '@/webs/apex/web-split.js';

const NAME_STD = 'cardPro';
const UNLOCK = import.meta.env.PUBLIC_EXP ?? '';
const PRESETS = Object.entries(spatial)
    .filter(([, mod]) => mod.data && mod.config)
    .map(([name, mod]) => ({ name, data: mod.data, config: mod.config }));

export class SvcSandbox extends LitElement {
    createRenderRoot() { return this; }

    static properties = {
        ui:        { type: String },
        theme:     { type: String },
        showIntro: { converter: { fromAttribute: v => v !== null && v !== 'false' } },
        _error:    { state: true },
    };

    constructor() {
        super();
        this.ui        = 'spatial';
        this.theme     = 'dark';
        this.showIntro = true;
        this._error    = '';
        this._debounce = null;
    }

    // ── Computed ──────────────────────────────────────────────────────────

    get _dataEditor()   { return this.querySelector('#svc-data-editor');   }
    get _configEditor() { return this.querySelector('#svc-config-editor'); }
    get _board()        { return this.querySelector('#svc-board');         }
    get _select()       { return this.querySelector('#svc-preset-select'); }

    // ── Lifecycle ─────────────────────────────────────────────────────────

    connectedCallback() {
        super.connectedCallback();
    }

    firstUpdated() {
        this._dcInit();
    }

    // ── Data Core ─────────────────────────────────────────────────────────

    _dcInit() {
        const name   = NAME_STD;
        const active = PRESETS.find(p => p.name === name) ?? PRESETS[0];
        if (!active) return;

        const select = this._select;
        if (select) {
            select.options = PRESETS.map(p => ({ value: p.name, label: p.name }));
            select.value   = name;
        }

        this._dataEditor?.setValue(JSON.stringify(active.data,   null, 2));
        this._configEditor?.setValue(JSON.stringify(active.config, null, 2));
        this._dfApplyBoard();

        this._select?.addEventListener('change',       this._dhPresetChange);
        this._dataEditor?.addEventListener('change',   this._dhEditorChange);
        this._configEditor?.addEventListener('change', this._dhEditorChange);
    }

    // ── Data Head ─────────────────────────────────────────────────────────

    _dhPresetChange = (e) => {
        const active = PRESETS.find(p => p.name === e.detail?.value);
        if (!active) return;
        this._dataEditor?.setValue(JSON.stringify(active.data,   null, 2));
        this._configEditor?.setValue(JSON.stringify(active.config, null, 2));
        this._dfApplyBoard();
    };

    _dhEditorChange = () => {
        clearTimeout(this._debounce);
        this._debounce = setTimeout(() => this._dfApplyBoard(), 700);
    };

    // ── Data Footer ───────────────────────────────────────────────────────

    _dfApplyBoard() {
        try {
            const data   = JSON.parse(this._dataEditor?.getValue()   || '[]');
            const config = JSON.parse(this._configEditor?.getValue() || '{}');
            this._board?.setAttribute('sections', JSON.stringify([{ id: 'sandbox', data, config }]));
            this._error = '';
        } catch (e) {
            this._error = '⚠  ' + e.message;
        }
    }

    // ── Render Blocks ─────────────────────────────────────────────────────

    _rbIntro() {
        return html`
            <div class="shrink-0 px-8 pt-12 pb-8 text-center">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-widest uppercase bg-base-200 text-base-content/50 mb-5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                    Component Library
                </span>
                <h2 class="text-4xl font-bold tracking-tight text-base-content leading-tight mb-3">
                    Explore the full<br/>component suite
                </h2>
                <p class="text-base text-base-content/50 max-w-md mx-auto">
                    Live editor — pick a preset, tweak the data and config, and see results instantly in the preview pane.
                </p>
            </div>`;
    }

    // ── Render ────────────────────────────────────────────────────────────

    render() {
        return html`
            ${this.showIntro ? this._rbIntro() : ''}
            <div class="h-full max-h-screen flex flex-col overflow-hidden">
                <div class="flex-1 overflow-hidden min-h-0">
                    <web-split direction="horizontal" size="0.4" style="height:100%; display:block;">

                        <div slot="primary" class="h-full flex flex-col overflow-hidden">
                            <div class="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-base-300/30 bg-base-200/40">
                                <span class="text-[11px] font-mono text-base-content/40 shrink-0">Section</span>
                                <web-select
                                    id="svc-preset-select"
                                    searchable
                                    height="28px"
                                    style="flex:1; min-width:0;"
                                ></web-select>
                            </div>

                            <web-split direction="vertical" size="0.3" style="flex:1; min-height:0; display:block;">
                                <web-code
                                    slot="primary"
                                    id="svc-data-editor"
                                    title="Data"
                                    lang="json"
                                    style="height:100%; margin:0; border-radius:0; border:none;"
                                ></web-code>
                                <web-code
                                    slot="secondary"
                                    id="svc-config-editor"
                                    title="Config"
                                    lang="json"
                                    style="height:100%; margin:0; border-radius:0; border:none;"
                                ></web-code>
                            </web-split>

                            <div
                                class="shrink-0 px-4 py-1.5 text-[11px] font-mono text-red-400 border-t border-red-800/40 truncate"
                                style="background:#2a0a0a;"
                                ?hidden=${!this._error}
                            >${this._error}</div>
                        </div>

                        <div slot="secondary" class="h-full flex flex-col overflow-hidden bg-base-100">
                            <div class="flex-1 overflow-auto p-4">
                                <web-board id="svc-board" unlock=${UNLOCK}></web-board>
                            </div>
                        </div>

                    </web-split>
                </div>
            </div>`;
    }
}

if (!customElements.get('svc-sandbox')) customElements.define('svc-sandbox', SvcSandbox);
