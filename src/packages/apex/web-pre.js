import { LitElement, html, unsafeCSS } from 'lit';
import styles from './css/web-pre.css?inline';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import Prism from 'prismjs';

// Import essential languages
import 'prismjs/components/prism-json.js';
import 'prismjs/components/prism-javascript.js';
import 'prismjs/components/prism-css.js';
import 'prismjs/components/prism-markup.js'; // HTML

// Import Tomorrow theme
import tomorrowTheme from 'prismjs/themes/prism-tomorrow.css?inline';

const TXT_STD = {
    vi: { copy: 'COPY', copied: 'COPIED!' },
    en: { copy: 'COPY', copied: 'COPIED!' },
}

/**
 * WebPre - A Prism-based syntax highlighter component
 * @property {string|object} data - The code or object to display
 * @property {string} lang - Language for highlighting (default: json)
 * @property {string} title - Optional title for the code block
 */
export class WebPre extends LitElement {
    static properties = {
        data:            { type: Object },
        lang:            { type: String },
        title:           { type: String },
        maxHeight:       { type: String },
        showLineNumbers: { type: Boolean },
        txt:             { type: Object },
    };

    static styles = [
        unsafeCSS(tomorrowTheme),
        unsafeCSS(styles)
    ];

    constructor() {
        super();
        this.data            = '';
        this.lang            = 'json';
        this.title           = '';
        this.maxHeight       = 'none';
        this.showLineNumbers = true;
        this.txt             = null;
        this._copied         = false;
    }

    async _copyToClipboard() {
        const codeString = typeof this.data === 'object' 
            ? JSON.stringify(this.data, null, 2) 
            : String(this.data);
            
        try {
            await navigator.clipboard.writeText(codeString);
            this._copied = true;
            this.requestUpdate();
            setTimeout(() => {
                this._copied = false;
                this.requestUpdate();
            }, 2000);
        } catch (err) {
            console.error('Failed to copy!', err);
        }
    }

    get _txt() { const d = this.txt ?? TXT_STD; return d.vi ?? d.en ?? {} }

    render() {
        const lang = this.lang || 'json';
        const codeString = typeof this.data === 'object' 
            ? JSON.stringify(this.data, null, 2) 
            : String(this.data);

        const grammar = Prism.languages[lang] || Prism.languages.javascript;
        const highlighted = Prism.highlight(codeString, grammar, lang);

        const lines = codeString.trimEnd().split('\n');
        const lineCount = lines.length;

        return html`
            <div class="header">
                <div class="title">${this.title || lang}</div>
                <button class="copy-btn ${this._copied ? 'copied' : ''}" @click=${this._copyToClipboard}>
                    ${this._copied ? this._txt.copied : this._txt.copy}
                </button>
            </div>
            <div class="content" style="max-height: ${this.maxHeight}">
                ${this.showLineNumbers ? html`
                    <div class="line-numbers">
                        ${Array.from({ length: lineCount }, (_, i) => html`<span>${i + 1}</span>`)}
                    </div>
                ` : ''}
                <pre class="language-${lang}"><code>${unsafeHTML(highlighted)}</code></pre>
            </div>
        `;
    }
}

if (!customElements.get('web-pre')) {
    customElements.define('web-pre', WebPre);
}
