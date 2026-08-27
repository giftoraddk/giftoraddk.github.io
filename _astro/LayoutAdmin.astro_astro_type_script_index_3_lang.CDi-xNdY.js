import{n as e,o as s,t,u as r}from"./lit.BV3SxJOV.js";import"./iconify-icon.CciI8O2w.js";import{f as i,v as a}from"./helper.UbTsINR8.js";import{r as o}from"./crud.Ce6rXOh0.js";import{r as n,t as l}from"./service.wxGGDDfD.js";import{r as c,t as d}from"./roles-constant.BjKZyiad.js";import"./svc-player.4czit1x4.js";import"./web-table.BjDVQa30.js";var h=class extends t{static shadowRootOptions={mode:"open"};static styles=[r(':host{--checkbox-size:20px;--checkbox-radius:6px;--core-blur:var(--haze-blur,12px);--core-glass:var(--haze-glass,20%);--core-font:var(--font-sans,"system-ui");display:inline-block}.web-checkbox{font-family:var(--core-font);cursor:pointer;user-select:none;color:var(--color-base-content,#fff);align-items:center;gap:12px;font-size:14px;font-weight:500;transition:all .3s;display:inline-flex}.web-checkbox:focus-visible{outline:none}.web-checkbox:focus-visible .checkbox-box{border-color:var(--color-primary,#2ebd85);box-shadow:0 0 0 4px color-mix(in oklab, var(--color-primary,#2ebd85) 20%, transparent)}.web-checkbox.disabled{cursor:not-allowed;opacity:.5}.checkbox-box{width:var(--checkbox-size);height:var(--checkbox-size);background:var(--color-base-200,#232323);border:1px solid color-mix(in oklab, var(--color-base-content,#111) 20%, transparent);border-radius:var(--checkbox-radius);box-sizing:border-box;flex-shrink:0;justify-content:center;align-items:center;transition:all .25s cubic-bezier(.4,0,.2,1);display:flex;position:relative}.web-checkbox:hover:not(.disabled) .checkbox-box{box-shadow:0 0 2px 2px color-mix(in oklab, var(--color-primary,#2ebd85) 60%, transparent)}.web-checkbox.checked .checkbox-box{background:var(--color-primary,#2ebd85);border-color:var(--color-primary,#2ebd85);transform:scale(1.05)}.web-checkbox:active:not(.disabled) .checkbox-box{transform:scale(.9)}.checkmark{color:#fff;stroke:currentColor;stroke-width:4px;stroke-linecap:round;stroke-linejoin:round;fill:none;stroke-dasharray:24;stroke-dashoffset:24px;opacity:0;width:14px;height:14px;transition:stroke-dashoffset .35s cubic-bezier(.2,0,.1,1) 50ms,opacity .2s,transform .35s cubic-bezier(.34,1.56,.64,1);transform:scale(.5)translateY(1px)}.web-checkbox.checked .checkmark{stroke-dashoffset:0;opacity:1;transform:scale(1)translateY(0)}.checkbox-box:after{content:"";border-radius:inherit;border:2px solid var(--color-primary,#2ebd85);opacity:0;pointer-events:none;transition:all .5s cubic-bezier(.16,1,.3,1);position:absolute;inset:-2px;transform:scale(1)}.web-checkbox.checked .checkbox-box:after{opacity:0;animation:.5s cubic-bezier(.16,1,.3,1) ring-expand;transform:scale(1.4)}@keyframes ring-expand{0%{opacity:.8;transform:scale(1)}to{opacity:0;transform:scale(1.5)}}.spatial .checkbox-box{background:color-mix(in oklab, var(--color-base-300,#393939) var(--core-glass), transparent);backdrop-filter:blur(var(--core-blur));border-color:#ffffff4d}.spatial.checked .checkbox-box{background:color-mix(in oklab, var(--color-primary,#2ebd85) 60%, #ffffff1a);border-color:var(--color-primary,#2ebd85)}.spatial:hover:not(.disabled) .checkbox-box{background:#ffffff1a;border-color:#fff3}')];static properties={checked:{type:Boolean,reflect:!0},disabled:{type:Boolean},label:{type:String},theme:{type:String},ui:{type:String},rounded:{type:String}};static get uiConfigs(){return{modern:{wrap:"modern web-checkbox"},spatial:{wrap:"spatial web-checkbox"}}}constructor(){super(),this.checked=!1,this.disabled=!1,this.label="",this.theme="",this.ui="modern",this.rounded=""}updated(e){e.has("theme")&&this.theme?this.setAttribute("data-theme",this.theme):e.has("theme")&&!this.theme&&this.removeAttribute("data-theme")}_toggle(){this.disabled||(this.checked=!this.checked,this.dispatchEvent(new CustomEvent("change",{detail:{checked:this.checked},bubbles:!0,composed:!0})))}_handleKeydown(e){this.disabled||" "!==e.key&&"Enter"!==e.key||(e.preventDefault(),this._toggle())}render(){const e=this.constructor.uiConfigs[this.ui||"modern"];return s`
      <div 
        class="${e.wrap} ${this.checked?"checked":""} ${this.disabled?"disabled":""}" 
        @click=${this._toggle}
        @keydown=${this._handleKeydown}
        role="checkbox"
        aria-checked="${this.checked}"
        aria-disabled="${this.disabled}"
        tabindex="${this.disabled?"-1":"0"}"
      >
        <div class="checkbox-box" style="${this.rounded?`--checkbox-radius: ${this.rounded}`:""}">
          <svg class="checkmark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 12 9 17 20 6"></polyline>
          </svg>
        </div>
        ${this.label?s`<span class="label">${this.label}</span>`:""}
      </div>
    `}};customElements.get("web-checkbox")||customElements.define("web-checkbox",h);var b=["posts","products","orders","comments","reviews","events","faqs","users","invoice","talents","jobs","proposals"],p={vi:{title:"Phân quyền người dùng",tableLabel:"Bảng dữ liệu",colName:"Tên / Email",colUsername:"Tên đăng nhập",loading:"Đang tải…",empty:"Không có người dùng",errLoad:"Không thể tải danh sách",errSave:"Lỗi lưu quyền"},en:{title:"User Role Management",tableLabel:"Table",colName:"Name / Email",colUsername:"Username",loading:"Loading…",empty:"No users found",errLoad:"Failed to load users",errSave:"Failed to save roles"}};customElements.get("svc-roles")||customElements.define("svc-roles",class extends t{createRenderRoot(){return this}static properties={lang:{type:String},txt:{type:Object},ui:{type:String},theme:{type:String},dataTable:{type:String},server:{type:String},tables:{type:String},_open:{state:!0},_table:{state:!0},_users:{state:!0},_loading:{state:!0},_error:{state:!0},_saving:{state:!0},_isAdmin:{state:!0}};constructor(){super(),this.lang="vi",this.txt=null,this.ui="",this.theme="dark",this.dataTable="users",this.server="auth",this.tables="",this._open=!1,this._table="",this._users=[],this._loading=!1,this._error="",this._saving=new Set,this._isAdmin=!1}async connectedCallback(){super.connectedCallback(),i("svc-roles-styles",".sr-fab{z-index:900;cursor:pointer;background:var(--color-primary,#2ebd85);color:#fff;border:none;border-radius:50%;justify-content:center;align-items:center;width:48px;height:48px;font-size:20px;transition:transform .15s,box-shadow .15s;display:flex;position:fixed;bottom:1rem;right:1rem;box-shadow:0 4px 16px #00000059}.sr-fab:hover{transform:scale(1.08);box-shadow:0 6px 20px #00000073}.sr-screen{z-index:950;background:var(--color-base-100,#0d0d0d);color:var(--color-base-content,#fff);font-family:var(--font-sans,system-ui);flex-direction:column;animation:.18s sr-fade-in;display:flex;position:fixed;inset:0}@keyframes sr-fade-in{0%{opacity:0;transform:scale(.98)}to{opacity:1;transform:scale(1)}}.sr-screen.sr-spatial{background:color-mix(in oklab, var(--color-base-300,#393939) 4%, transparent);backdrop-filter:blur(18px)}.sr-header{border-bottom:1px solid var(--color-base-300,#393939);background:var(--color-base-200,#1a1a1a);flex-shrink:0;align-items:center;gap:12px;padding:14px 20px;display:flex}.sr-title{flex:1;font-size:1rem;font-weight:700}.sr-badge-admin{background:color-mix(in oklab, var(--color-primary,#2ebd85) 15%, transparent);color:var(--color-primary,#2ebd85);border:1px solid color-mix(in oklab, var(--color-primary,#2ebd85) 35%, transparent);letter-spacing:.04em;border-radius:20px;padding:2px 10px;font-size:.7rem;font-weight:700}.sr-btn-close{cursor:pointer;background:var(--color-base-300,#2a2a2a);width:34px;height:34px;color:var(--color-base-content,#fff);opacity:.7;border:none;border-radius:8px;justify-content:center;align-items:center;font-size:18px;transition:opacity .15s,background .15s;display:flex}.sr-btn-close:hover{opacity:1;background:oklab(63.6834% .187864 .0889285/.2)}.sr-body{flex-direction:column;flex:1;gap:16px;min-height:0;padding:20px;display:flex;overflow-y:auto}.sr-selector-row{flex-shrink:0;align-items:center;gap:12px;display:flex}.sr-selector-label{letter-spacing:.05em;text-transform:uppercase;opacity:.6;white-space:nowrap;font-size:.75rem;font-weight:700}.sr-table-wrap{border:1px solid var(--color-base-300,#393939);border-radius:10px;flex:1;min-height:0;overflow:hidden}.sr-table-wrap web-table{width:100%;display:block}.sr-user-name{flex-wrap:wrap;align-items:center;gap:6px;font-size:.875rem;font-weight:600;display:flex}.sr-user-email{opacity:.55;margin-top:2px;font-size:.75rem}.sr-badge-super{background:color-mix(in oklab, var(--color-primary,#2ebd85) 15%, transparent);color:var(--color-primary,#2ebd85);border:1px solid color-mix(in oklab, var(--color-primary,#2ebd85) 30%, transparent);border-radius:10px;padding:1px 7px;font-size:.65rem;font-weight:700}.sr-saving-dot{background:var(--color-primary,#2ebd85);border-radius:50%;width:6px;height:6px;animation:.8s infinite sr-pulse;display:inline-block}@keyframes sr-pulse{0%,to{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}.sr-loading,.sr-empty{text-align:center;opacity:.45;padding:3rem;font-size:.875rem}.sr-error{color:#ef4444;background:oklab(63.6834% .187864 .0889285/.1);border:1px solid oklab(63.6834% .187864 .0889285/.25);border-radius:8px;padding:1rem;font-size:.8rem}"),this._table||(this._table=this._tables[0]??b[0]),this._isAdmin=await l.isAdmin()}updated(e){e.has("tables")&&!this._tables.includes(this._table)&&(this._table=this._tables[0]??"")}async _dcLoad(){this._loading=!0,this._error="";try{const e=await this._svc.findAll();this._users=e.sort((e,s)=>(e.display_name||"").localeCompare(s.display_name||""))}catch(e){this._error=`${this._txt.errLoad}: ${e.message}`}finally{this._loading=!1}}_dhOpen(){this._open=!0,this._users.length||this._dcLoad()}_dhClose(){this._open=!1}_dhTableChange(e){this._table=e.detail?.value??this._table}async _dhTogglePreset(e,s,t){const r=this._users.find(s=>s.id===e);if(!r||this._comIsSuper(r))return;const i=new Set(this._comCheckedPresets(r.roles,this._table));t?i.add(s):i.delete(s);const a=this._comNewRoles(r.roles,this._table,i);this._users=this._users.map(s=>s.id===e?{...s,roles:a}:s),this._saving=new Set([...this._saving,e]);try{const s=await this._svc.now();await this._svc.update(e,{roles:a,updated_at:s})}catch(o){this._users=this._users.map(s=>s.id===e?{...s,roles:r.roles}:s),alert(`${this._txt.errSave}: ${o.message}`)}finally{const s=new Set(this._saving);s.delete(e),this._saving=s}}get _txt(){return a(this.txt,p,this.lang)}get _svc(){return o((this.dataTable||"users").split("~")[0],"",this.server)}get _tables(){const e=(this.tables||"").trim();if(!e)return b;if(e.startsWith("["))try{return JSON.parse(e)}catch{}return e.split(",").map(e=>e.trim()).filter(Boolean)}_comIsSuper(e){return n(e).isAdmin}_comCheckedPresets(e,s){const{roles:t}=n(e);return d.filter(e=>c(e,s).every(e=>t.includes(e)))}_comNewRoles(e,s,t){const{roles:r}=n(e),i=r.filter(e=>!e.startsWith(`${s}.`)),a=new Set;for(const o of t)for(const e of c(o,s))a.add(e);return[...i,...a].join("|")}_comSchema(){return[{field:"display_name",label:this._txt.colName,width:"220px",render:(t,r)=>s`
                    <div class="sr-user-name">
                        ${r.display_name||r.email||r.id}
                        ${this._comIsSuper(r)?s`<span class="sr-badge-super">Super Admin</span>`:e}
                        ${this._saving.has(r.id)?s`<span class="sr-saving-dot"></span>`:e}
                    </div>
                    ${r.email?s`<div class="sr-user-email">${r.email}</div>`:e}
                `},{field:"username",label:this._txt.colUsername,width:"160px",render:e=>e||"—"},...d.map(e=>({field:e,label:e[0].toUpperCase()+e.slice(1),width:"120px",align:"center",render:(t,r)=>s`
                    <web-checkbox
                        .checked=${this._comCheckedPresets(r.roles,this._table).includes(e)}
                        ?disabled=${this._comIsSuper(r)||this._saving.has(r.id)}
                        ui=${this.ui||"modern"}
                        @change=${s=>this._dhTogglePreset(r.id,e,s.detail.checked)}
                    ></web-checkbox>
                `}))]}render(){return this._isAdmin?s`
            <button class="sr-fab" title=${this._txt.title} @click=${this._dhOpen}>
                <iconify-icon icon="ri:shield-user-line"></iconify-icon>
            </button>
            ${this._open?this._rbScreen():e}
        `:e}_rbScreen(){return s`
            <div class="sr-screen${"spatial"===this.ui?" sr-spatial":""}">
                ${this._rbHeader()}
                <div class="sr-body">
                    ${this._rbSelector()}
                    ${this._rbContent()}
                </div>
            </div>
        `}_rbHeader(){return s`
            <div class="sr-header">
                <iconify-icon icon="ri:shield-keyhole-line" style="font-size:18px;opacity:.7"></iconify-icon>
                <span class="sr-title">${this._txt.title}</span>
                <span class="sr-badge-admin">Super Admin</span>
                <button class="sr-btn-close" @click=${this._dhClose}>
                    <iconify-icon icon="ri:close-line"></iconify-icon>
                </button>
            </div>
        `}_rbSelector(){const e=this._tables.map(e=>({value:e,label:e}));return s`
            <div class="sr-selector-row">
                <span class="sr-selector-label">${this._txt.tableLabel}</span>
                <web-select
                    style="max-width: 12rem"
                    .options=${e}
                    .value=${this._table}
                    ui=${this.ui||"modern"}
                    lang=${this.lang}
                    height="36px"
                    ?searchable=${!1}
                    @change=${this._dhTableChange}
                ></web-select>
            </div>
        `}_rbContent(){return this._loading?s`<div class="sr-loading">${this._txt.loading}</div>`:this._error?s`<div class="sr-error">${this._error}</div>`:this._users.length?s`
            <div class="sr-table-wrap">
                <web-table
                    .data=${this._users}
                    .schema=${this._comSchema()}
                    lang=${this.lang}
                    ui=${this.ui||"spatial"}
                    height="auto"
                ></web-table>
            </div>
        `:s`<div class="sr-empty">${this._txt.empty}</div>`}});