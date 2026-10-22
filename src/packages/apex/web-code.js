import { LitElement, html, unsafeCSS } from 'lit';
import styles from './css/web-code.css?inline';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { json } from '@codemirror/lang-json';
import { javascript } from '@codemirror/lang-javascript';
import { css as langCss } from '@codemirror/lang-css';
import { html as langHtml } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';

const LANG_MAP = {
    json:       json,
    javascript: javascript,
    js:         javascript,
    typescript: javascript,
    ts:         javascript,
    css:        langCss,
    html:       langHtml,
    markup:     langHtml,
};

export class WebCode extends LitElement {
    static properties = {
        value:     { type: String },
        lang:      { type: String },
        title:     { type: String },
        readonly:  { type: Boolean },
        theme:     { type: String },
        maxHeight: { type: String },
    };

    static styles = [unsafeCSS(styles)];

    constructor() {
        super();
        this.value     = '';
        this.lang      = 'json';
        this.title     = '';
        this.readonly  = false;
        this.theme     = 'dark';
        this.maxHeight = 'none';
        this._view       = null;
        this._fromEditor = false;
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._view?.destroy();
        this._view = null;
    }

    firstUpdated() {
        this._mount();
    }

    updated(changed) {
        if (!this._view) return;

        // External value push → update editor doc without re-emitting
        if (changed.has('value') && !this._fromEditor) {
            const cur = this._view.state.doc.toString();
            if (cur !== (this.value ?? '')) {
                this._view.dispatch({
                    changes: { from: 0, to: cur.length, insert: this.value ?? '' },
                });
            }
        }

        // Structural change → recreate editor
        if (changed.has('lang') || changed.has('theme') || changed.has('readonly') || changed.has('maxHeight')) {
            const saved = this._view.state.doc.toString();
            this._view.destroy();
            this._view = null;
            this._mount(saved);
        }
    }

    _mount(initialValue) {
        const container = this.shadowRoot?.querySelector('#cm');
        if (!container || this._view) return;

        const doc    = initialValue ?? this.value ?? '';
        const langFn = LANG_MAP[this.lang] ?? LANG_MAP.json;

        const extensions = [
            basicSetup,
            langFn(),
            EditorView.updateListener.of(update => {
                if (!update.docChanged) return;
                const val = update.state.doc.toString();
                this._fromEditor = true;
                this.value = val;
                this.dispatchEvent(new CustomEvent('change', {
                    detail: { value: val },
                    bubbles: true,
                    composed: true,
                }));
                this._fromEditor = false;
            }),
        ];

        if (this.theme === 'dark') extensions.push(oneDark);
        if (this.readonly)         extensions.push(EditorState.readOnly.of(true));
        if (this.maxHeight !== 'none') {
            extensions.push(EditorView.theme({
                '&':            { maxHeight: this.maxHeight },
                '.cm-scroller': { overflow: 'auto' },
            }));
        }

        this._view = new EditorView({
            root:   this.shadowRoot,
            state:  EditorState.create({ doc, extensions }),
            parent: container,
        });
    }

    // ── Public API ───────────────────────────────────────────────

    getValue() {
        return this._view?.state.doc.toString() ?? this.value;
    }

    setValue(code) {
        this.value = code ?? '';
        if (!this._view) return;
        const cur = this._view.state.doc.toString();
        if (cur === (code ?? '')) return;
        this._view.dispatch({
            changes: { from: 0, to: cur.length, insert: code ?? '' },
        });
    }

    focus() {
        this._view?.focus();
    }

    render() {
        return html`
            <div class="header">
                <span class="label">${this.title || this.lang}</span>
            </div>
            <div class="editor-wrap">
                <div id="cm"></div>
            </div>
        `;
    }
}

if (!customElements.get('web-code')) {
    customElements.define('web-code', WebCode);
}
