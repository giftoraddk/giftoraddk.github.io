import{i as t,n as e,o as i,t as o,u as r}from"./lit.BV3SxJOV.js";import{n as s,r as a,t as n}from"./directive.DQozs3xI.js";var l=class extends s{constructor(t){if(super(t),this.it=e,t.type!==a.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(i){if(i===e||null==i)return this._t=void 0,this.it=i;if(i===t)return i;if("string"!=typeof i)throw Error(this.constructor.directiveName+"() called with a non-string value");if(i===this.it)return this._t;this.it=i;const o=[i];return o.raw=o,this._t={_$litType$:this.constructor.resultType,strings:o,values:[]}}};l.directiveName="unsafeHTML",l.resultType=1;var d=n(l),h=[{key:"free",label:"Free",ar:0},{key:"original",label:"Original",ar:-1},{key:"1:1",label:"Square",ar:1},{key:"9:16",label:"9:16",ar:9/16},{key:"16:9",label:"16:9",ar:16/9},{key:"4:5",label:"4:5",ar:.8},{key:"5:4",label:"5:4",ar:5/4},{key:"3:4",label:"3:4",ar:3/4},{key:"4:3",label:"4:3",ar:4/3}],c={free:'<rect x="3" y="5" width="18" height="14" rx="1.5" stroke-dasharray="3 2"/>',original:'<rect x="3" y="5" width="18" height="14" rx="1.5"/><line x1="12" y1="5" x2="12" y2="19" stroke-width="1" opacity=".4"/><line x1="3" y1="12" x2="21" y2="12" stroke-width="1" opacity=".4"/>',"1:1":'<rect x="4" y="4" width="16" height="16" rx="1.5"/>',"9:16":'<rect x="8" y="2" width="8" height="20" rx="1.5"/>',"16:9":'<rect x="2" y="8" width="20" height="8" rx="1.5"/>',"4:5":'<rect x="6" y="2" width="12" height="20" rx="1.5"/>',"5:4":'<rect x="2" y="6" width="20" height="12" rx="1.5"/>',"3:4":'<rect x="6.5" y="2" width="11" height="20" rx="1.5"/>',"4:3":'<rect x="2" y="6.5" width="20" height="11" rx="1.5"/>'},p=["nw","n","ne","e","se","s","sw","w"],f=class extends o{static styles=[r(':host{-webkit-user-select:none;user-select:none;color:#fff;--core-font:var(--font-sans,"system-ui");background:#141414;border-radius:12px;font-family:inherit;display:block;overflow:hidden}.wrap{font-family:var(--core-font);flex-direction:column;display:flex}.canvas{background:#000;width:100%;line-height:0;position:relative;overflow:hidden}.img{pointer-events:none;-webkit-user-drag:none;width:100%;height:auto;display:block}.ov{pointer-events:none;background:#0000008c;position:absolute}.box{box-sizing:border-box;cursor:move;touch-action:none;position:absolute}.box-border{pointer-events:none;box-sizing:border-box;border:1.5px dashed #ffffffd9;position:absolute;inset:0}.gl{pointer-events:none;background:#ffffff24;position:absolute}.gl.h{height:1px;left:0;right:0}.gl.v{width:1px;top:0;bottom:0}.hl{box-sizing:border-box;background:#fff;border:1px solid #00000040;border-radius:1px;width:10px;height:10px;position:absolute}.hl.nw{cursor:nw-resize;top:-5px;left:-5px}.hl.n{cursor:n-resize;top:-5px;left:calc(50% - 5px)}.hl.ne{cursor:ne-resize;top:-5px;right:-5px}.hl.e{cursor:e-resize;top:calc(50% - 5px);right:-5px}.hl.se{cursor:se-resize;bottom:-5px;right:-5px}.hl.s{cursor:s-resize;bottom:-5px;left:calc(50% - 5px)}.hl.sw{cursor:sw-resize;bottom:-5px;left:-5px}.hl.w{cursor:w-resize;top:calc(50% - 5px);left:-5px}.bar{scrollbar-width:none;background:#1c1c1c;flex-shrink:0;align-items:stretch;gap:1px;padding:2px 6px;display:flex;overflow-x:auto}.bar::-webkit-scrollbar{display:none}.rbtn{cursor:pointer;color:#ffffff6b;white-space:nowrap;background:0 0;border:none;border-radius:6px;flex-direction:column;justify-content:center;align-items:center;gap:5px;min-width:50px;padding:8px;font-family:inherit;font-size:11px;transition:color .15s,background .15s;display:flex}.rbtn:hover{color:#fffc;background:#ffffff0f}.rbtn.active{color:#fff;background:#ffffff12}.rbtn svg{flex-shrink:0;width:22px;height:22px}')];static properties={src:{type:String},_crop:{state:!0},_ratio:{state:!0},_nat:{state:!0},_loaded:{state:!0}};constructor(){super(),this.src="",this._ratio="free",this._crop={x:0,y:0,w:0,h:0},this._nat={w:0,h:0},this._loaded=!1,this._drag=null}updated(t){t.has("src")&&this.src&&(this._loaded=!1)}_onLoad(t){const e=t.target;this._nat={w:e.naturalWidth,h:e.naturalHeight},this._loaded=!0,this._initCrop()}_initCrop(){const t=this.shadowRoot?.querySelector(".canvas");if(!t)return;const e=t.clientWidth,i=t.clientHeight,o=.1;this._crop={x:Math.round(e*o),y:Math.round(i*o),w:Math.round(.8*e),h:Math.round(.8*i)},this._emitChange()}_clampCrop({x:t,y:e,w:i,h:o},r,s){const a=20;return i=Math.max(a,i),o=Math.max(a,o),(t=Math.max(0,Math.min(t,r-a)))+i>r&&(i=r-t),(e=Math.max(0,Math.min(e,s-a)))+o>s&&(o=s-e),{x:t,y:e,w:i=Math.max(a,i),h:o=Math.max(a,o)}}_resolveAr(){const t=h.find(t=>t.key===this._ratio);if(!t||0===t.ar)return 0;if(-1===t.ar){const t=this._nat.w/this._nat.h;return isFinite(t)&&t>0?t:0}return t.ar}_applyArToHandle(t,e,i,o,r){const s=this._resolveAr();if(!s)return this._clampCrop(t,o,r);let{x:a,y:n,w:l,h:d}=t;const h=["n","s"].includes(e),c=["e","w"].includes(e);if(h)l=Math.round(d*s),a=Math.round(i.x+(i.w-l)/2);else if(c)d=Math.round(l/s),n=Math.round(i.y+(i.h-d)/2);else{const t=Math.round(d*s),o=Math.round(l/s);Math.abs(l-i.w)>=Math.abs(d-i.h)?(d=o,"nw"!==e&&"ne"!==e||(n=i.y+i.h-d)):(l=t,"nw"!==e&&"sw"!==e||(a=i.x+i.w-l))}return this._clampCrop({x:a,y:n,w:l,h:d},o,r)}_startDrag(t,e,i=null){t.preventDefault();const o=t.touches?.[0]??t,r=this.shadowRoot.querySelector(".canvas").getBoundingClientRect();this._drag={type:e,handle:i,startX:o.clientX,startY:o.clientY,startCrop:{...this._crop},cw:r.width,ch:r.height};const s=t=>this._onMove(t),a=()=>{this._drag=null,window.removeEventListener("mousemove",s),window.removeEventListener("mouseup",a),window.removeEventListener("touchmove",s),window.removeEventListener("touchend",a)};window.addEventListener("mousemove",s,{passive:!1}),window.addEventListener("mouseup",a),window.addEventListener("touchmove",s,{passive:!1}),window.addEventListener("touchend",a)}_onMove(t){if(t.preventDefault(),!this._drag)return;const e=t.touches?.[0]??t,{type:i,handle:o,startX:r,startY:s,startCrop:a,cw:n,ch:l}=this._drag,d=e.clientX-r,h=e.clientY-s;if("move"===i)return this._crop=this._clampCrop({x:a.x+d,y:a.y+h,w:a.w,h:a.h},n,l),void this._emitChange();let{x:c,y:p,w:f,h:u}={...a};switch(o){case"nw":c+=d,f-=d,p+=h,u-=h;break;case"n":p+=h,u-=h;break;case"ne":f+=d,p+=h,u-=h;break;case"e":f+=d;break;case"se":f+=d,u+=h;break;case"s":u+=h;break;case"sw":c+=d,f-=d,u+=h;break;case"w":c+=d,f-=d}this._crop=this._applyArToHandle({x:c,y:p,w:f,h:u},o,a,n,l),this._emitChange()}_setRatio(t){if(this._ratio=t,"free"===t)return void this._emitChange();const e=this.shadowRoot?.querySelector(".canvas");if(!e)return;const i=e.clientWidth,o=e.clientHeight,r=h.find(e=>e.key===t),s=-1===r.ar?this._nat.w/this._nat.h:r.ar;if(!isFinite(s)||s<=0)return;let a,n;i/o>s?(n=Math.round(.8*o),a=Math.round(n*s)):(a=Math.round(.8*i),n=Math.round(a/s)),this._crop=this._clampCrop({x:Math.round((i-a)/2),y:Math.round((o-n)/2),w:a,h:n},i,o),this._emitChange()}_emitChange(){this.dispatchEvent(new CustomEvent("crop-change",{detail:this.getCropData(),bubbles:!0,composed:!0}))}getCropData(){const t=this.shadowRoot?.querySelector(".canvas");if(!t||!this._nat.w||!this._loaded)return null;const e=t.clientWidth,i=t.clientHeight;if(!e||!i)return null;const o=this._nat.w/e,r=this._nat.h/i;return{x:Math.round(this._crop.x*o),y:Math.round(this._crop.y*r),width:Math.round(this._crop.w*o),height:Math.round(this._crop.h*r),ratio:this._ratio}}getCroppedCanvas(){const t=this.shadowRoot?.querySelector(".img"),e=this.getCropData();if(!t||!e)return null;const i=document.createElement("canvas");return i.width=e.width,i.height=e.height,i.getContext("2d").drawImage(t,e.x,e.y,e.width,e.height,0,0,e.width,e.height),i}render(){const{x:t,y:e,w:o,h:r}=this._crop;return i`
      <div class="wrap">
        <div class="canvas">
          ${this.src?i`
            <img class="img" src=${this.src} alt="" crossorigin="anonymous" @load=${this._onLoad} />
          `:""}

          ${this._loaded?i`
            <!-- 4 darkened overlays -->
            <div class="ov" style="top:0;left:0;right:0;height:${e}px"></div>
            <div class="ov" style="top:${e+r}px;left:0;right:0;bottom:0"></div>
            <div class="ov" style="top:${e}px;left:0;width:${t}px;height:${r}px"></div>
            <div class="ov" style="top:${e}px;left:${t+o}px;right:0;height:${r}px"></div>

            <!-- Crop box -->
            <div
              class="box"
              style="left:${t}px;top:${e}px;width:${o}px;height:${r}px"
              @mousedown=${t=>this._startDrag(t,"move")}
              @touchstart=${t=>this._startDrag(t,"move")}
            >
              <div class="box-border"></div>

              <!-- Rule-of-thirds grid -->
              <div class="gl h" style="top:${Math.round(r/3)}px"></div>
              <div class="gl h" style="top:${Math.round(2*r/3)}px"></div>
              <div class="gl v" style="left:${Math.round(o/3)}px"></div>
              <div class="gl v" style="left:${Math.round(2*o/3)}px"></div>

              <!-- Resize handles -->
              ${p.map(t=>i`
                <div
                  class="hl ${t}"
                  @mousedown=${e=>{e.stopPropagation(),this._startDrag(e,"resize",t)}}
                  @touchstart=${e=>{e.stopPropagation(),this._startDrag(e,"resize",t)}}
                ></div>
              `)}
            </div>
          `:""}
        </div>

        <!-- Aspect ratio bar -->
        <div class="bar">
          ${h.map(t=>{return i`
            <button
              class="rbtn ${this._ratio===t.key?"active":""}"
              @click=${()=>this._setRatio(t.key)}
            >
              ${e=t.key,d(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">${c[e]}</svg>`)}
              ${t.label}
            </button>
          `;var e})}
        </div>
      </div>
    `}};customElements.get("web-cropper")||customElements.define("web-cropper",f);var[u,x]="10948405f0bb24311182a3a916a14721~https://api.imgbb.com/1/upload".split("~"),b={vi:{ph:"Upload ảnh để lấy URL...",delete:"Xóa",pick:"Chọn ảnh để upload",cropTitle:"Chỉnh ảnh trước khi upload",cancel:"Hủy",submit:"Upload"},en:{ph:"Upload image to get URL...",delete:"Delete",pick:"Pick image to upload",cropTitle:"Edit image before uploading",cancel:"Cancel",submit:"Upload"}},g=class extends o{static styles=[r(':host{--core-height:var(--height-selector,2.25rem);--core-radius:var(--radius-selector,.5rem);--core-blur:var(--haze-blur,12px);--core-glass:var(--haze-glass,20%);--core-font:var(--font-sans,"system-ui");width:100%;display:block}.web-photor-upload{font-family:var(--core-font);max-width:100%;height:var(--core-height);background-color:var(--color-base-100,#0d0d0d);border:1px solid var(--color-base-300,#393939);border-radius:var(--core-radius);box-sizing:border-box;align-items:center;transition:all .3s cubic-bezier(.4,0,.2,1);display:flex;position:relative;overflow:hidden}.web-photor-upload:hover{border-color:var(--color-primary,#2ebd85);box-shadow:0 4px 12px #0000001a}.web-photor-upload:focus-within{border-color:var(--color-primary,#2ebd85);box-shadow:0 0 0 3px color-mix(in oklab, var(--color-primary,#2ebd85) 15%, transparent)}.web-photor-upload.disabled{opacity:.5;pointer-events:none}.text-input{min-width:0;height:100%;color:var(--color-base-content,#fff);background:0 0;border:none;outline:none;flex:1;padding:0 12px;font-size:13px;font-weight:500}.text-input::placeholder{color:color-mix(in oklab, var(--color-base-content,#fff) 45%, transparent)}.clear-btn{cursor:pointer;width:28px;height:28px;color:var(--color-base-content,#fff);opacity:.4;background:0 0;border:none;border-radius:50%;flex-shrink:0;justify-content:center;align-items:center;padding:0;transition:all .2s;display:flex}.clear-btn:hover{opacity:1;background:#ffffff14}.clear-btn svg{stroke-width:2.5px;width:13px;height:13px}.preview-btn{cursor:pointer;width:28px;height:28px;color:var(--color-base-content,#fff);opacity:.5;background:0 0;border:none;border-radius:50%;flex-shrink:0;justify-content:center;align-items:center;padding:0;transition:opacity .2s;display:flex}.preview-btn:hover{opacity:1}.preview-btn svg{width:15px;height:15px}.preview-modal{border-radius:12px;max-width:min(900px,94vw);max-height:90vh;position:relative;overflow:hidden}.preview-modal-close{z-index:1;position:absolute;top:8px;right:8px;background:#0000008c!important;border-radius:50%!important}.preview-modal-img{object-fit:contain;max-width:100%;max-height:90vh;display:block}.upload-btn{width:calc(var(--core-height) - 2px);height:calc(var(--core-height) - 2px);background:var(--color-primary,#2ebd85);border-radius:calc(var(--core-radius) - 1px);cursor:pointer;color:#fff;border:none;flex-shrink:0;justify-content:center;align-items:center;padding:0;transition:all .2s;display:flex}.upload-btn:hover:not(:disabled){filter:brightness(1.12)}.upload-btn:disabled{opacity:.6;cursor:not-allowed}.upload-btn svg{width:17px;height:17px}.spinner{border:2px solid #ffffff4d;border-top-color:#fff;border-radius:50%;width:16px;height:16px;animation:.7s linear infinite spin}@keyframes spin{to{transform:rotate(360deg)}}.err-msg{color:var(--color-error,#f5465c);margin:4px 2px 0;font-size:11px}.modal-backdrop{backdrop-filter:blur(3px);z-index:99;background:#000000b8;justify-content:center;align-items:center;width:100%;height:100%;margin:0;animation:.18s backdrop-in;display:flex;position:fixed;inset:0}@keyframes backdrop-in{0%{opacity:0}to{opacity:1}}.modal-card{background:#141414;border:1px solid #ffffff12;border-radius:16px;flex-direction:column;width:min(520px,96vw);max-height:92vh;animation:.2s cubic-bezier(.34,1.56,.64,1) card-in;display:flex;overflow:hidden;box-shadow:0 24px 64px #0009}@keyframes card-in{0%{opacity:0;transform:scale(.93)translateY(10px)}to{opacity:1;transform:scale(1)translateY(0)}}.modal-card.is-persistent-fx,.preview-modal.is-persistent-fx{animation:.15s cubic-bezier(.25,.8,.25,1) persistent-fx!important}@keyframes persistent-fx{0%{transform:scale(1)}50%{transform:scale(1.03)}to{transform:scale(1)}}.modal-header{color:#ffffffe6;border-bottom:1px solid #ffffff12;flex-shrink:0;justify-content:space-between;align-items:center;padding:14px 16px;font-size:14px;font-weight:600;display:flex}.modal-close{color:#ffffff80;cursor:pointer;background:0 0;border:none;border-radius:6px;justify-content:center;align-items:center;width:28px;height:28px;padding:0;transition:all .15s;display:flex}.modal-close:hover{color:#fff;background:#ffffff14}.modal-close svg{width:16px;height:16px}.modal-body{flex:1;min-height:0;overflow:hidden}web-cropper{max-height:62vh;display:block}.modal-footer{border-top:1px solid #ffffff12;flex-shrink:0;justify-content:flex-end;align-items:center;gap:8px;padding:12px 16px;display:flex}.upload-status{color:#ffffff73;flex:1;align-items:center;gap:6px;font-size:12px;display:flex}.btn{cursor:pointer;border:none;border-radius:8px;align-items:center;gap:6px;height:36px;padding:0 18px;font-family:inherit;font-size:13px;font-weight:500;transition:all .15s;display:flex}.btn:disabled{opacity:.5;cursor:not-allowed}.btn-cancel{color:#ffffffb3;background:#ffffff12;border:1px solid #ffffff1a}.btn-cancel:hover:not(:disabled){color:#fff;background:#ffffff1f}.btn-upload{background:var(--color-primary,#2ebd85);color:#fff}.btn-upload:hover:not(:disabled){filter:brightness(1.1);transform:translateY(-1px);box-shadow:0 4px 12px #2ebd8559}.modal-spinner{border:2px solid #ffffff4d;border-top-color:#fff;border-radius:50%;flex-shrink:0;width:15px;height:15px;animation:.7s linear infinite spin}.spatial.web-photor-upload{background:color-mix(in oklab, var(--color-base-300,#393939) var(--core-glass), transparent);backdrop-filter:blur(var(--core-blur));border:1px solid #ffffff4d}.spatial.web-photor-upload:hover{background:#ffffff0f;border-color:#fff3}.spatial.web-photor-upload:focus-within{border-color:var(--color-primary,#2ebd85);background:#ffffff14}')];static properties={value:{type:String,reflect:!0},placeholder:{type:String},multiple:{type:Boolean},limit:{type:Number},persistent:{type:Boolean},disabled:{type:Boolean},hideUpload:{type:Boolean},height:{type:String},ui:{type:String},mime:{type:String},saveLocal:{},_pendingSrc:{state:!0},_uploading:{state:!0},_error:{state:!0},_previewOpen:{state:!0},txt:{type:Object},lang:{type:String}};constructor(){super(),this.value="",this.placeholder="",this.multiple=!1,this.limit=0,this.persistent=!0,this.disabled=!1,this.hideUpload=!1,this.height="36px",this.ui="modern",this.mime="image/png",this.saveLocal=null,this._pendingSrc=null,this._uploading=!1,this._error="",this._previewOpen=!1,this.txt=null,this.lang="vi"}get _comCount(){return this.value?this.value.split("|").filter(Boolean).length:0}get _comAtLimit(){return this.multiple&&this.limit>0&&this._comCount>=this.limit}updated(t){if(t.has("_pendingSrc")&&this._pendingSrc||t.has("_previewOpen")&&this._previewOpen){const t=this.shadowRoot.querySelector(".modal-backdrop");if(t?.showPopover&&!t.matches(":popover-open"))try{t.showPopover()}catch{}}}_fxModal(){const t=this.shadowRoot.querySelector(".modal-card, .preview-modal");t&&(t.classList.remove("is-persistent-fx"),t.offsetWidth,t.classList.add("is-persistent-fx"),t.addEventListener("animationend",()=>t.classList.remove("is-persistent-fx"),{once:!0}))}_openPicker(){this.disabled||this._uploading||this._comAtLimit||this.shadowRoot.querySelector('input[type="file"]').click()}_onFileChange(t){const e=t.target.files[0];if(t.target.value="",!e)return;const i=new FileReader;i.onload=t=>{this._pendingSrc=t.target.result},i.readAsDataURL(e)}_cancelCrop(){this._pendingSrc=null}async _applyCrop(){const t=this.shadowRoot.querySelector("web-cropper");if(!t)return;const e=t.getCroppedCanvas(),i=this.mime||"image/png",o="image/png"===i?void 0:.92,r=e?e.toDataURL(i,o):this._pendingSrc;this._pendingSrc=null,this._uploading=!0,this._error="";try{let t;if(this.saveLocal){const e=await(await fetch(r)).blob();t=await this.saveLocal(e)}else{const e=r.split(",")[1],i=new FormData;i.append("key",u),i.append("image",e);const o=await(await fetch(x,{method:"POST",body:i})).json();if(!o.success)throw new Error(o.error?.message??"Upload thất bại");t=o.data.url}this.value=this.multiple&&this.value?`${this.value}|${t}`:t,this._emit()}catch(s){this._error=s.message}finally{this._uploading=!1}}_handleInput(t){this.value=t.target.value,this._emit()}_clear(){this.value="",this._error="",this._emit()}_emit(){this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value},bubbles:!0,composed:!0}))}get _txt(){const t=this.txt??b;return t[this.lang]??t.vi??{}}render(){const t="spatial"===this.ui?"spatial web-photor-upload":"web-photor-upload";return i`
      <input type="file" accept="image/*" style="display:none" @change=${this._onFileChange} />

      <div class="${t} ${this.disabled?"disabled":""}"
           style="--core-height:${this.height}">

        <input
          class="text-input"
          .value=${this.value}
          placeholder=${this.placeholder||this._txt.ph}
          ?disabled=${this.disabled}
          @input=${this._handleInput}
        />

        ${this.value?i`
          <button class="clear-btn" @click=${this._clear} tabindex="-1" title="${this._txt.delete}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        `:""}

        ${this.value&&!this.saveLocal?i`
          <button class="preview-btn" tabindex="-1" @click=${()=>{this._previewOpen=!0}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        `:""}

        ${this.hideUpload?"":i`
          <button
            class="upload-btn"
            @click=${this._openPicker}
            ?disabled=${this.disabled||this._uploading||this._comAtLimit}
            title="${this._txt.pick}"
            tabindex="-1"
          >
            ${this._uploading?i`<span class="spinner"></span>`:i`
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>`}
          </button>
        `}
      </div>

      ${this._error?i`<p class="err-msg">${this._error}</p>`:""}

      ${this._pendingSrc?i`
        <div class="modal-backdrop" popover="manual"
             @click=${t=>t.target===t.currentTarget&&(this.persistent?this._fxModal():this._cancelCrop())}>
          <div class="modal-card">
            <div class="modal-header">
              <span>${this._txt.cropTitle}</span>
              <button class="modal-close" @click=${this._cancelCrop}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div class="modal-body">
              <web-cropper src=${this._pendingSrc}></web-cropper>
            </div>

            <div class="modal-footer">
              <button class="btn btn-cancel" @click=${this._cancelCrop}>${this._txt.cancel}</button>
              <button class="btn btn-upload" @click=${this._applyCrop}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                ${this._txt.submit}
              </button>
            </div>
          </div>
        </div>
      `:""}

      ${this._previewOpen?i`
        <div class="modal-backdrop" popover="manual" @click=${t=>t.target===t.currentTarget&&(this.persistent?this._fxModal():this._previewOpen=!1)}>
          <div class="preview-modal">
            <button class="modal-close preview-modal-close" @click=${()=>{this._previewOpen=!1}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <img class="preview-modal-img"
                 src="${this.value.split("|").filter(Boolean).at(-1)}"
                 alt="" />
          </div>
        </div>
      `:""}
    `}};customElements.get("web-photor-upload")||customElements.define("web-photor-upload",g);export{d as t};