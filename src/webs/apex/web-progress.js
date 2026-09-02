import { LitElement, html, unsafeCSS } from 'lit'
import styles from './styles/web-progress.css?inline'

export class WebProgress extends LitElement {
    static shadowRootOptions = { mode: 'open' }
    static styles = [unsafeCSS(styles)]

    static properties = {
        value: { type: Number }, // 0 to 100
        type: { type: String }, // 'primary', 'info', 'warning', 'error'
        striped: { type: Boolean },
        animate: { type: Boolean },
        theme: { type: String },
        ui: { type: String } // modern, spatial
    }

    static get uiConfigs() {
        return {
            modern: {
                wrap: 'modern web-progress',
                bar: 'progress-bar',
            },
            spatial: {
                wrap: 'spatial web-progress glass',
                bar: 'progress-bar glass-bar',
            }
        }
    }

    constructor() {
        super()
        this.value = 0
        this.type = 'primary'
        this.striped = false
        this.animate = false
        this.theme = ''
        this.ui = 'modern'
    }

    updated(changedProperties) {
        if (changedProperties.has('theme') && this.theme) {
            this.setAttribute('data-theme', this.theme)
        } else if (changedProperties.has('theme') && !this.theme) {
            this.removeAttribute('data-theme')
        }
    }

    render() {
        const uiConfig = this.constructor.uiConfigs[this.ui || 'modern']
        return html`
      <div class="${uiConfig.wrap} ${this.type} ${this.striped ? 'striped' : ''} ${this.animate ? 'animate' : ''}">
        <div class="${uiConfig.bar}" style="width: ${this.value}%"></div>
      </div>
    `
    }
}

if (!customElements.get('web-progress')) {
    customElements.define('web-progress', WebProgress)
}

export default WebProgress
