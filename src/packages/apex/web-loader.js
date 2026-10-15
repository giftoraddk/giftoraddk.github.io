import { LitElement, html, unsafeCSS } from 'lit'
import styles from './css/web-loader.css?inline'
import { cssInline } from '@/services/tools/util'

export class WebLoader extends LitElement {
    static properties = {
        width:  { type: String },
        height: { type: String },
        stys:   { type: Object },
    }

    static styles = [unsafeCSS(styles)]

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
