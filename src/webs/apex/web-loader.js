import { LitElement, html, css } from 'lit'
import { cssInline } from '@/services/helper.js'

export class WebLoader extends LitElement {
    static properties = {
        width:  { type: String },
        height: { type: String },
        stys:   { type: Object },
    }

    static styles = css`
        :host { display: block; width: 100%; }
        .sk {
            border-radius: 4px;
            background: linear-gradient(90deg, #f1f1f1, #ccc, #eee);
            background-size: 200% 100%;
            animation: shim 2s infinite;
        }
        @keyframes shim {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
    `

    render() {
        return html`<div class="sk" style=${cssInline({
            width:  this.width  || '100%',
            height: this.height || '1rem',
            ...(this.stys || {}),
        })}></div>`
    }
}

if (!customElements.get('web-loader')) {
    customElements.define('web-loader', WebLoader)
}

export default WebLoader
