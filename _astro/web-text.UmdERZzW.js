import{o as e,t,u as r}from"./lit.PcferLoS.js";var i=class extends t{static shadowRootOptions={mode:"open"};static styles=[r(':host{--core-height:var(--height-selector,2.25rem);--core-radius:var(--radius-selector,.5rem);--core-blur:var(--haze-blur,12px);--core-glass:var(--haze-glass,20%);--core-font:var(--font-sans,"system-ui");width:100%;display:block}.web-text{font-family:var(--core-font);box-sizing:border-box;max-width:100%;height:var(--core-height);background-color:var(--color-base-100,#0d0d0d);border:1px solid var(--color-base-300,#393939);border-radius:var(--core-radius);align-items:center;transition:all .3s cubic-bezier(.4,0,.2,1);display:flex;position:relative;overflow:hidden}.web-text:hover{border-color:var(--color-primary,#2ebd85);box-shadow:0 4px 12px #0000001a}.web-text:focus-within{border-color:var(--color-primary,#2ebd85);box-shadow:0 0 0 3px color-mix(in oklab, var(--color-primary,#2ebd85) 15%, transparent)}.text-input{width:100%;height:100%;color:var(--color-base-content,#fff);background:0 0;border:none;outline:none;padding:0 16px;font-size:14px;font-weight:500}.text-input:disabled{cursor:not-allowed}.text-input::placeholder{color:color-mix(in oklab, var(--color-base-content,#fff) 60%, transparent)}.prefix-text,.suffix-text{pointer-events:none;user-select:none;color:color-mix(in oklab, var(--color-base-content,#fff) 50%, transparent);justify-content:center;align-items:center;font-size:12px;font-weight:700;display:flex}.prefix-text{padding-left:16px}.suffix-text{padding-right:16px}.clear-btn{cursor:pointer;width:32px;height:32px;color:var(--color-base-content,#fff);opacity:.5;background:0 0;border:none;border-radius:50%;outline:none;justify-content:center;align-items:center;margin-right:4px;transition:all .2s;display:flex}.clear-btn:hover{opacity:1;background:#ffffff1a;transform:scale(1.1)}.clear-btn svg{width:14px;height:14px}.spatial.web-text{background:color-mix(in oklab, var(--color-base-300,#393939) var(--core-glass), transparent);backdrop-filter:blur(var(--core-blur));border:1px solid #ffffff4d}.spatial.web-text:hover{background:#ffffff0f;border-color:#fff3}.spatial.web-text:focus-within{border-color:var(--color-primary,#2ebd85);background:#ffffff14}')];static properties={theme:{type:String},ui:{type:String},value:{type:String,reflect:!0},placeholder:{type:String},disabled:{type:Boolean},readonly:{type:Boolean},type:{type:String},prefix:{type:String},suffix:{type:String},clearable:{type:Boolean},height:{type:String}};static get uiConfigs(){return{modern:{wrap:"modern web-text"},spatial:{wrap:"spatial web-text glass px-3 py-1"}}}constructor(){super(),this.value="",this.placeholder="",this.disabled=!1,this.readonly=!1,this.type="text",this.prefix="",this.suffix="",this.clearable=!1,this.height="36px",this.ui="modern"}updated(e){e.has("theme")&&this.theme?this.setAttribute("data-theme",this.theme):e.has("theme")&&!this.theme&&this.removeAttribute("data-theme")}_handleInput(e){e.stopPropagation(),this.value=e.target.value,this._emitEvent("input")}_handleChange(e){e.stopPropagation(),this.value=e.target.value,this._emitEvent("change")}_handleClear(){if(this.disabled||this.readonly)return;this.value="";const e=this.shadowRoot.querySelector("input");e&&(e.value=""),this._emitEvent("input"),this._emitEvent("change"),this._emitEvent("clear")}_emitEvent(e){this.dispatchEvent(new CustomEvent(e,{detail:{value:this.value},bubbles:!0,composed:!0}))}render(){const t=this.clearable&&this.value&&!this.disabled&&!this.readonly,r=this.constructor.uiConfigs[this.ui||"modern"];return e`
      <div 
        class="${r.wrap} ${this.disabled?"opacity-50 pointer-events-none":""}"
        style="--core-height: ${this.height}"
      >
        ${this.prefix?e`<span class="prefix-text">${this.prefix}</span>`:""}
        <input
          .type=${this.type}
          class="text-input"
          .value=${this.value}
          placeholder=${this.placeholder}
          ?disabled=${this.disabled}
          ?readonly=${this.readonly}
          @input=${this._handleInput}
          @change=${this._handleChange}
        />
        ${t?e`
          <button class="clear-btn" @click=${this._handleClear} tabindex="-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        `:""}
        ${this.suffix?e`<span class="suffix-text">${this.suffix}</span>`:""}
      </div>
    `}};customElements.get("web-text")||customElements.define("web-text",i);