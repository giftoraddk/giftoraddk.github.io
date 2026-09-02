import { LitElement, html, css, unsafeCSS } from 'lit';
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
        css`
            :host {
                display: block;
                margin: 1rem 0;
                border-radius: 12px;
                overflow: hidden;
                background: #282c34; /* Tomorrow Night background */
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.5rem 1rem;
                background: rgba(255, 255, 255, 0.05);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .title {
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 0.75rem;
                font-weight: 600;
                color: #cc99cc; /* Tomorrow purple */
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }

            .copy-btn {
                background: rgba(255, 255, 255, 0.1);
                border: none;
                border-radius: 4px;
                color: #f8f8f2;
                padding: 4px 8px;
                font-size: 0.7rem;
                cursor: pointer;
                transition: all 0.2s;
            }

            .copy-btn:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            .copy-btn.copied {
                background: #cc99cc;
                color: #282c34;
            }

            .content {
                position: relative;
                overflow: auto;
                display: flex;
            }

            .line-numbers {
                padding: 1rem 0.5rem 1rem 1rem;
                background: rgba(0, 0, 0, 0.15);
                border-right: 1px solid rgba(255, 255, 255, 0.05);
                color: rgba(255, 255, 255, 0.25);
                text-align: right;
                min-width: 1rem;
                user-select: none;
                font-family: 'Fira Code', 'Cascadia Code', Consolas, Monaco, monospace;
                font-size: 0.85rem;
                line-height: 1.5;
                flex-shrink: 0;
            }

            .line-numbers span {
                display: block;
            }

            pre {
                margin: 0 !important;
                padding: 1rem !important;
                background: transparent !important;
                font-size: 0.85rem !important;
                line-height: 1.5 !important;
            }

            code {
                font-family: 'Fira Code', 'Cascadia Code', Consolas, Monaco, monospace !important;
            }

            /* Custom scrollbar */
            .content::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }
            .content::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.1);
            }
            .content::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
            }
            .content::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.2);
            }
        `
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
