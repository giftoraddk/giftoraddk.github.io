import{n as s,o as e,t}from"./lit.BV3SxJOV.js";import{n as i,r as n,t as a}from"./service.wxGGDDfD.js";customElements.get("svc-logged-nav")||customElements.define("svc-logged-nav",class extends t{createRenderRoot(){return this}static properties={menus:{type:String},_items:{state:!0},_isAdmin:{state:!0},_ready:{state:!0}};constructor(){super(),this.menus="",this._items=[],this._isAdmin=!1,this._ready=!1}async connectedCallback(){super.connectedCallback();const s=this.menus?JSON.parse(this.menus):[],e=await a.get();if("active"===e?.status){const{roles:t,isAdmin:a}=n(e);this._isAdmin=a,this._items=a?s:s.filter(s=>i(t,s.require))}this._ready=!0,this.dispatchEvent(new CustomEvent("admin-nav-ready",{detail:{isAdmin:this._isAdmin},bubbles:!0,composed:!0}))}render(){if(!this._ready)return s;const t=location.pathname.replace(/\/$/,"")||"/admin";return e`
            <ul class="menu py-8 -mx-3">
                ${this._items.map(s=>{const i=s.href.replace(/\/$/,"")||"/admin",n=t===i;return e`
                        <li>
                            <a href=${s.href} class=${n?"menu-active":""}>
                                <span class="menu-char-icon">${s.textIcon}</span>
                                <span class="menu-text">${s.text}</span>
                            </a>
                        </li>
                    `})}
            </ul>
        `}});