import{n as e,o as t,t as o,u as i}from"./lit.PcferLoS.js";import{a as r,s}from"./helper.S-6essfm.js";var a={vi:{ph:"Chọn...",searchPh:"Tìm kiếm...",noResults:"Không có kết quả"},en:{ph:"Select...",searchPh:"Search...",noResults:"No results found"}},n=class extends o{static shadowRootOptions={mode:"open"};static styles=[i(':host{--core-height:var(--height-selector,2.25rem);--core-radius:var(--radius-selector,.5rem);--core-blur:var(--haze-blur,12px);--core-glass:var(--haze-glass,20%);--core-font:var(--font-sans,"system-ui");width:100%;font-family:inherit;display:inline-block;position:relative}.web-select{user-select:none;width:100%;position:relative}.select-trigger{font-family:var(--core-font);box-sizing:border-box;height:var(--core-height);background:var(--color-base-100,#0d0d0d);border:1px solid var(--color-base-300,#393939);border-radius:var(--core-radius);cursor:pointer;color:var(--color-base-content,#fff);justify-content:space-between;align-items:center;padding:0 16px;font-size:14px;font-weight:500;transition:all .3s cubic-bezier(.4,0,.2,1);display:flex}.select-trigger:hover{border-color:var(--color-primary,#2ebd85);box-shadow:0 4px 15px #0000001a}.select-trigger.open{border-color:var(--color-primary,#2ebd85);box-shadow:0 0 0 3px color-mix(in oklab, var(--color-primary,#2ebd85) 15%, transparent)}.select-trigger.disabled{opacity:.5;cursor:not-allowed;pointer-events:none}.select-trigger.custom-trigger{width:auto;height:auto;box-shadow:none;background:0 0;border:none;border-radius:0;padding:0;display:inline-flex}.select-trigger.custom-trigger:hover,.select-trigger.custom-trigger.open{box-shadow:none;border:none}.selected-value{text-overflow:ellipsis;white-space:nowrap;flex:1;overflow:hidden}.placeholder{color:color-mix(in oklab, var(--color-base-content,#fff) 60%, transparent)}.chevron{opacity:.7;width:18px;height:18px;margin-left:10px;transition:transform .3s cubic-bezier(.4,0,.2,1)}.open .chevron{transform:rotate(180deg)}.dropdown-menu{font-family:var(--core-font);box-sizing:border-box;background:var(--color-base-100,#0d0d0d);border:1px solid var(--color-base-300,#393939);border-radius:var(--core-radius);z-index:99;opacity:0;visibility:hidden;pointer-events:none;will-change:transform, opacity;flex-direction:column;margin:0;padding:0;transition:opacity .4s cubic-bezier(.16,1,.3,1),transform .4s cubic-bezier(.175,.885,.32,1.275),visibility .4s;display:flex;position:fixed;inset:auto;overflow:hidden;transform:scale(.92)translateY(10px);box-shadow:0 15px 35px #0006,0 5px 15px #0003}.dropdown-menu.show{visibility:visible;pointer-events:auto;opacity:1;transform:scale(1)translateY(0)}@starting-style{.dropdown-menu.show{opacity:0;transform:scale(.92)translateY(10px)}}.search-container{border-bottom:1px solid color-mix(in oklab, var(--color-base-300,#393939) var(--core-glass), transparent);padding:10px}.search-input{box-sizing:border-box;background:color-mix(in oklab, var(--color-base-300,#393939) var(--core-glass), transparent);border:1px solid color-mix(in oklab, var(--color-base-300,#393939) var(--core-glass), transparent);width:100%;height:32px;color:var(--color-base-content,#fff);border-radius:8px;outline:none;padding:0 10px;font-size:13px;transition:all .2s}.search-input::placeholder{color:var(--color-base-content,#fff)}.search-input:focus{border-color:var(--color-primary,#2ebd85);box-shadow:0 0 0 2px color-mix(in oklab, var(--color-primary,#2ebd85) 10%, transparent)}.options-list{max-height:280px;padding:6px 0;overflow-y:auto}.option-item{cursor:pointer;color:var(--color-base-content,#fff);justify-content:space-between;align-items:center;padding:10px 16px;font-size:14px;font-weight:500;transition:all .2s;display:flex}.option-item:hover{color:var(--color-primary,#2ebd85);background:#ffffff0d}.option-item.selected{background:color-mix(in oklab, var(--color-primary,#2ebd85) 15%, transparent);color:var(--color-primary,#2ebd85);font-weight:600}.checkmark{width:18px;height:18px;color:var(--color-primary,#2ebd85);visibility:hidden}.option-item.selected .checkmark{visibility:visible}.no-results{text-align:center;color:color-mix(in oklab, var(--color-base-content,#fff) 60%, transparent);padding:16px;font-size:13px;font-style:italic}.options-list::-webkit-scrollbar{width:6px}.options-list::-webkit-scrollbar-track{background:0 0}.options-list::-webkit-scrollbar-thumb{background:#ffffff1a;border-radius:3px}.options-list::-webkit-scrollbar-thumb:hover{background:#fff3}.spatial .select-trigger{background:color-mix(in oklab, var(--color-base-300,#393939) var(--core-glass), transparent);backdrop-filter:blur(var(--core-blur));border:1px solid #ffffff4d}.spatial .select-trigger:hover{background:#ffffff0f;border-color:#fff3}.spatial .select-trigger.custom-trigger,.spatial .select-trigger.custom-trigger:hover{backdrop-filter:none;background:0 0;border:none}.spatial.dropdown-menu{background:color-mix(in oklab, var(--color-base-100,#0d0d0d) 90%, transparent);border:1px solid #ffffff4d}')];static properties={options:{type:Array},value:{type:Object},multiple:{type:Boolean},searchable:{type:Boolean},placeholder:{type:String},disabled:{type:Boolean},theme:{type:String},ui:{type:String},isOpen:{type:Boolean,state:!0},searchQuery:{type:String,state:!0},height:{type:String},placement:{type:String},placementGap:{type:Number},txt:{type:Object},lang:{type:String}};static get uiConfigs(){return{modern:{wrap:"modern web-select",trigger:"select-trigger",dropdown:"dropdown-menu"},spatial:{wrap:"spatial web-select",trigger:"spatial select-trigger",dropdown:"spatial dropdown-menu"}}}constructor(){super(),this.options=[],this.value=null,this.multiple=!1,this.searchable=!0,this.placeholder="",this.disabled=!1,this.theme="",this.ui="modern",this.isOpen=!1,this.searchQuery="",this.height="36px",this.placement="bottom-start",this.placementGap=4,this.txt=null,this.lang="vi",this._hideTimer=null,this._handleOutsideClick=this._handleOutsideClick.bind(this),this._updateDropdownPosition=this._updateDropdownPosition.bind(this)}connectedCallback(){super.connectedCallback(),window.addEventListener("mousedown",this._handleOutsideClick,{capture:!0}),window.addEventListener("scroll",this._updateDropdownPosition,!0),window.addEventListener("resize",this._updateDropdownPosition)}disconnectedCallback(){super.disconnectedCallback(),clearTimeout(this._hideTimer),window.removeEventListener("mousedown",this._handleOutsideClick,{capture:!0}),window.removeEventListener("scroll",this._updateDropdownPosition,!0),window.removeEventListener("resize",this._updateDropdownPosition)}updated(e){e.has("theme")&&this.theme&&this.setAttribute("data-theme",this.theme),e.has("theme")&&!this.theme&&this.removeAttribute("data-theme")}_handleOutsideClick(e){this.isOpen&&(e.composedPath().includes(this)||this._closeDropdown())}_closeDropdown(){this.isOpen=!1,this.searchQuery="",this._scheduleHidePopover()}_showPopover(){clearTimeout(this._hideTimer);const e=this.shadowRoot.querySelector(".dropdown-menu");if(e?.showPopover&&!e.matches(":popover-open"))try{e.showPopover()}catch{}}_hidePopover(){const e=this.shadowRoot.querySelector(".dropdown-menu");if(e?.hidePopover&&e.matches(":popover-open"))try{e.hidePopover()}catch{}}_scheduleHidePopover(){const e=this.shadowRoot.querySelector(".dropdown-menu");if(!e?.hidePopover||!e.matches(":popover-open"))return;clearTimeout(this._hideTimer);const t=()=>{e.removeEventListener("transitionend",o),clearTimeout(this._hideTimer),this.isOpen||this._hidePopover()},o=o=>{o.target===e&&t()};e.addEventListener("transitionend",o),this._hideTimer=setTimeout(t,450)}_toggleDropdown(e){e.stopPropagation(),this.disabled||(this.isOpen=!this.isOpen,this.isOpen?this.updateComplete.then(()=>{this._showPopover(),this._updateDropdownPosition(),this.searchable&&setTimeout(()=>{const e=this.shadowRoot.querySelector(".search-input");e&&e.focus()},0)}):this._closeDropdown())}_updateDropdownPosition(){if(!this.isOpen)return;const e=this.shadowRoot.querySelector(".select-trigger"),t=this.shadowRoot.querySelector(".dropdown-menu");if(!e||!t)return;const o=e.getBoundingClientRect(),i=Math.max(o.width,200),r=(t.scrollHeight||t.offsetHeight)+8,s=parseFloat(this.placementGap||4),a=window.innerWidth,n=window.innerHeight,[l,c]=(this.placement||"bottom-start").split("-");let d="top"===l?o.top-r-s:o.bottom+s,h="end"===c?o.right-i:o.left;const p=n-o.bottom-8,u=o.top-8;"bottom"===l&&d+r>n-8?(d=o.top-r-s,t.style.maxHeight=`${u}px`):"top"===l&&d<8?(d=o.bottom+s,t.style.maxHeight=`${p}px`):t.style.maxHeight="top"===l?`${u}px`:`${p}px`,d<8&&(d=8),h+i>a-8&&(h=a-i-8),h<8&&(h=8),t.style.width=`${i}px`,t.style.top=`${d}px`,t.style.left=`${h}px`,t.style.right="auto"}_handleSearch(e){this.searchQuery=e.target.value}_selectOption(e){const t=void 0!==e.value?e.value:e.id;if(this.multiple){const e=Array.isArray(this.value)?[...this.value]:[],o=e.indexOf(t);o>-1?e.splice(o,1):e.push(t),this.value=e}else this.value=t,this._closeDropdown();this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value},bubbles:!0,composed:!0}))}_isSelected(e){const t=void 0!==e.value?e.value:e.id;return this.multiple?Array.isArray(this.value)&&this.value.includes(t):this.value===t}_getDisplayValue(){if(this.multiple)return Array.isArray(this.value)&&0!==this.value.length?this.options.filter(e=>{const t=void 0!==e.value?e.value:e.id;return this.value.includes(t)}).map(e=>e.label||e.name).join(", "):null;{const e=this.options.find(e=>(void 0!==e.value?e.value:e.id)===this.value);return e?e.label||e.name:null}}get _txt(){const e=this.txt??a;return e[this.lang]??e.vi??{}}render(){const e=this.options.filter(e=>(e.label||e.name||"").toLowerCase().includes(this.searchQuery.toLowerCase())),o=this._getDisplayValue(),i=this.constructor.uiConfigs[this.ui||"modern"],r=!!this.querySelector('[slot="trigger"]');return this.style.width=r?"auto":"",t`
      <div class="${i.wrap}" style="--core-height: ${this.height}">

        <!-- slot="trigger" — caller có thể thay hẳn trigger mặc định (text + chevron) bằng
             nội dung riêng (vd <web-button slot="trigger"> icon), vẫn bấm mở/đóng dropdown
             bình thường vì click trên nội dung slot bubbles qua đúng div này. Không truyền gì
             thì fallback dùng trigger mặc định như cũ (không đổi behavior các nơi đang dùng). -->
        <div
          class="${i.trigger} ${r?"custom-trigger":""} ${this.isOpen?"open":""} ${this.disabled?"disabled":""}"
          @click=${this._toggleDropdown}
        >
          <slot name="trigger">
            <div class="selected-value ${o?"":"placeholder"}">
              ${o||this.placeholder||this._txt.ph}
            </div>
            <svg
              class="chevron"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </slot>
        </div>

        <div class="${i.dropdown} ${this.isOpen?"show":""}" popover="manual">
          ${this.searchable?t`
                <div class="search-container">
                  <input
                    type="text"
                    class="search-input"
                    placeholder="${this._txt.searchPh}"
                    .value=${this.searchQuery}
                    @input=${this._handleSearch}
                    @click=${e=>e.stopPropagation()}
                  />
                </div>
              `:""}
          <div class="options-list">
            ${e.length>0?e.map(e=>t`
                    <div
                      class="option-item ${this._isSelected(e)?"selected":""}"
                      @click=${()=>this._selectOption(e)}
                    >
                      <span>${e.label||e.name}</span>
                      <svg
                        class="checkmark"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  `):t`<div class="no-results">${this._txt.noResults}</div>`}
          </div>
        </div>
      </div>
    `}};customElements.get("web-select")||customElements.define("web-select",n);var l=/(?:youtube\.com|youtu\.be)/i,c=/vimeo\.com/i,d=/tiktok\.com/i,h=/\.(mp4|webm|ogg|mov)(?:[?#].*)?$/i,p=/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/,u=/vimeo\.com\/(?:video\/)?(\d+)/,m=/tiktok\.com\/.*\/video\/(\d+)/;function v(e){return e?l.test(e)?"youtube":c.test(e)?"vimeo":d.test(e)?"tiktok":h.test(e)?"video":null:null}async function b(e){try{const t=await fetch(e);return t.ok&&(await t.json()).thumbnail_url||""}catch{return""}}var g=Symbol("unset-src"),f=class extends o{static styles=[i(":host{width:100%;display:block;position:relative}:host([fill]){width:100%;height:100%;position:absolute;inset:0}.svc-player-box{width:100%;position:relative;overflow:hidden}:host([fill]) .svc-player-box{width:100%;height:100%;position:absolute;inset:0}.embed-media{object-fit:cover;border:0;width:100%;height:100%;display:block}:host([fill]) iframe.embed-media{aspect-ratio:16/9;width:100%;transform:translate(-50%, -50%) scale(var(--fill-scale,1.6));transform-origin:50%;pointer-events:none;position:absolute;top:50%;left:50%}.facade{cursor:pointer;background:var(--color-base-300,#000);border:none;width:100%;height:100%;padding:0;position:absolute;inset:0}.facade-poster{object-fit:cover;width:100%;height:100%;position:absolute;inset:0}.facade-scrim{background:#00000040;transition:background .2s;position:absolute;inset:0}.facade:hover .facade-scrim{background:#0006}.facade-play{background:var(--color-primary,#2ebd85);width:4rem;height:4rem;color:var(--color-base-content,#fff);cursor:pointer;border:none;border-radius:9999px;justify-content:center;align-items:center;transition:transform .2s;display:flex;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);box-shadow:0 4px 16px #0000004d}.facade:hover .facade-play{transform:translate(-50%,-50%)scale(1.08)}.facade-play svg{width:2rem;height:2rem}.facade.spatial .facade-play{background:color-mix(in oklab, var(--color-primary,#2ebd85), transparent 15%);backdrop-filter:blur(var(--core-blur,12px))}")];static properties={src:{type:String},poster:{type:String},control:{type:Boolean},autoPlay:{type:Boolean},mute:{type:Boolean},loops:{type:Boolean},ratio:{type:Number},fill:{type:Boolean,reflect:!0},ui:{type:String},theme:{type:String},mainColors:{type:String},textColor:{type:String},rounded:{type:String},locked:{type:Boolean},_active:{state:!0},_resolvedPoster:{state:!0}};constructor(){super(),this.src="",this.poster="",this.control=!1,this.autoPlay=!1,this.mute=!1,this.loops=!1,this.ratio=16/9,this.fill=!1,this.ui="modern",this.theme="",this.mainColors="",this.textColor="",this.rounded="8px",this.locked=!1,this._active=!1,this._resolvedPoster="",this._lastSrc=g}connectedCallback(){super.connectedCallback(),window.addEventListener("message",this._dhYtMessage)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("message",this._dhYtMessage)}willUpdate(){this.src!==this._lastSrc&&(this._lastSrc=this.src,this._active=!1,this._resolvedPoster="",this._dfResolvePoster(),this.autoPlay&&this._dhActivate())}updated(e){e.has("theme")&&this.theme?this.setAttribute("data-theme",this.theme):e.has("theme")&&!this.theme&&this.removeAttribute("data-theme")}async _dfResolvePoster(){if(this.poster)return;const e=this._comProvider;if(!e)return;const t=this.src,o=await async function(e,t,o){return"youtube"===e?t?`https://img.youtube.com/vi/${t}/hqdefault.jpg`:"":"vimeo"===e?b(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(o)}`):"tiktok"===e?b(`https://www.tiktok.com/oembed?url=${encodeURIComponent(o)}`):""}(e,this._comId,t);this.src===t&&(this._resolvedPoster=o)}_dhSeekPosterFrame(e){const t=e.target;if(!t.dataset.posterSeeked){t.dataset.posterSeeked="1";try{t.currentTime=Math.min(.1,t.duration||.1)}catch{}}}_dhActivate(){this._active||!this._comProvider||this.locked||(this._active=!0,s(this,"played",{provider:this._comProvider,src:this.src}))}_dhYtLoad=e=>{this.loops&&"youtube"===this._comProvider&&e.target.contentWindow.postMessage(JSON.stringify({event:"listening"}),"*")};_dhYtMessage=e=>{if(!this.loops||"youtube"!==this._comProvider)return;const t=this.renderRoot?.querySelector("iframe.embed-media");if(!t||e.source!==t.contentWindow)return;let o;try{o=JSON.parse(e.data)}catch{return}"infoDelivery"===o.event&&0===o.info?.playerState&&(t.contentWindow.postMessage(JSON.stringify({event:"command",func:"seekTo",args:[0,!0]}),"*"),t.contentWindow.postMessage(JSON.stringify({event:"command",func:"playVideo",args:[]}),"*"))};get _comProvider(){return v(this.src)}get _comId(){return function(e,t){if(!t)return"";if("youtube"===e){const e=t.match(p);return e?e[1]:""}if("vimeo"===e){const e=t.match(u);return e?e[1]:""}if("tiktok"===e){const e=t.match(m);return e?e[1]:""}return""}(this._comProvider,this.src)}get _comPoster(){return this.poster||this._resolvedPoster}get _comBoxStyle(){return r({aspectRatio:this.fill?"":this.ratio||16/9,borderRadius:this.rounded||"8px","--color-primary":this.mainColors?(this.mainColors.split("|")[0]||"").trim():"",color:this.textColor||""})}render(){const o=this._comProvider;return o?t`
            <div class="svc-player-box" style="${this._comBoxStyle}">
                ${this._active?this._rbActive(o):this._rbFacade()}
            </div>`:e}_rbFacade(){const o=this._comPoster,i=!o&&"video"===this._comProvider;return t`
            <button
                type="button"
                class="facade ${"spatial"===this.ui?"spatial":""}"
                aria-label="Play video"
                @click=${this._dhActivate}
            >
                ${o?t`<img class="facade-poster" src="${o}" alt="" />`:e}
                ${i?t`
                    <video
                        class="facade-poster"
                        src="${this.src}"
                        preload="metadata"
                        muted
                        playsinline
                        @loadedmetadata=${this._dhSeekPosterFrame}
                    ></video>`:e}
                <div class="facade-scrim"></div>
                ${this.locked?e:t`
                    <div class="facade-play">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    </div>`}
            </button>`}_rbActive(e){return"video"===e?this._rbVideo():this._rbIframe(e)}_rbVideo(){return t`
            <!-- Both attribute and property binding: browsers check the live 'muted' property (not just the attribute) when enforcing the autoplay-requires-muted policy. -->
            <video
                class="embed-media"
                src="${this.src}"
                ?controls=${this.control}
                autoplay
                ?muted=${this.mute}
                .muted=${this.mute}
                ?loop=${this.loops}
                playsinline
            ></video>`}_rbIframe(o){const i=function(e,t,{autoPlay:o=!1,mute:i=!1,loops:r=!0,control:s=!1}={}){const a=e=>e?"1":"0";return t?"youtube"===e?`https://www.youtube-nocookie.com/embed/${t}?${new URLSearchParams({autoplay:a(o),mute:a(i),loop:a(r),controls:a(s),enablejsapi:"1"}).toString()}`:"vimeo"===e?`https://player.vimeo.com/video/${t}?${new URLSearchParams({autoplay:a(o),muted:a(i),loop:a(r),controls:a(s)}).toString()}`:"tiktok"===e?`https://www.tiktok.com/embed/v2/${t}?${new URLSearchParams({autoplay:a(o)}).toString()}`:"":""}(o,this._comId,{autoPlay:!0,mute:this.mute,loops:this.loops,control:this.control});return i?t`
            <iframe
                class="embed-media"
                src="${i}"
                title="${o} video"
                allow="autoplay; fullscreen; picture-in-picture"
                allowfullscreen
                @load=${this._dhYtLoad}
            ></iframe>`:e}};customElements.get("svc-player")||customElements.define("svc-player",f);export{v as t};