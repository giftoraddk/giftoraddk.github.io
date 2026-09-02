import { LitElement, html, css } from 'lit'

export class WebFrame extends LitElement {
  static shadowRootOptions = { mode: 'open' }

  static styles = css`
    :host {
      --highlight: rgba(255, 255, 255, 0.75);
    }

    ::slotted(*) {
      width: 100%;
      height: 100%;
    }

    .box {
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: var(--text-color);
      border-radius: var(--rounded);
      padding: .5rem;
      backdrop-filter: blur(4px);
      background: linear-gradient(90deg, #17611bb3, #000000b5);
      box-shadow: inset 1.5px 0 1px var(--highlight), inset -1.5px 0 1px var(--highlight);
    }

    .head {
      z-index: 1;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: 100%;
    }

    .hcenter {
      display: flex;
      justify-content: center;
      border-radius: 1.5rem;
      padding: .25rem .75rem;
      margin: 0 0 .5rem;
      background: radial-gradient(30% 60% at top center, #ffffff66, transparent), #ffffff4d;
      border: 1px solid #ffffff4d;
      position: relative;
    }
    .hcenter > div {
      white-space: nobox;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    
    .body {
      flex: 1;
      width: 100%;
      overflow: hidden;
      position: relative;
      border-radius: 0 0 var(--rounded) var(--rounded);
    }

  `

  static properties = {
    ui: { type: String }, // choice style ui 
    theme: { type: String }, // light/dark/...
    mainColors: { type: String }, // Chuỗi 5 màu: primary|secondary|accent|info|warning
    textColor: { type: String }, // Màu chữ
    rounded: { type: String }, // default 1rem
    title: { type: String },
  }

  constructor() {
    super()
    this.ui = ''
    // Chuỗi màu mặc định: primary|secondary|accent|info|warning
    this.mainColors = '#2ebd85|#f5465c|#a855f7|#00c7d4|#fbbf24'
    this.textColor = '#f3f4f6'
    this.rounded = '1rem'
    this.title = ''
  }

  // Parse chuỗi mainColors thành object
  get colors() {
    const colorArray = this.mainColors.split('|').map((c) => c.trim())
    return {
      primary: colorArray[0] || '#2ebd85',
      secondary: colorArray[1] || '#f5465c',
      accent: colorArray[2] || '#a855f7',
      info: colorArray[3] || '#00c7d4',
      warning: colorArray[4] || '#fbbf24',
    }
  }

  render() {
    const { primary } = this.colors
    return html`
        <div class="box" style="
          --primary: ${primary};
          --text-color: ${this.textColor}ed;
          --rounded: ${this.rounded};
        ">
        <div class="head">
          <div class="hleft"></div>
          <div class="hcenter">
            ${this.title ? html`<div>${this.title}</div>` : ''}
          </div>
          <div class="hright"></div>
        </div>
        <div class="body">
          <slot></slot>
        </div>
      </div>
    `
  }
}

customElements.define('web-frame', WebFrame)
