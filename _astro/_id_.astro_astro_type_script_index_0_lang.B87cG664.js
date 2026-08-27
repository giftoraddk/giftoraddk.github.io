const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["_astro/storager.IKaCAcTl.js","_astro/rolldown-runtime.Bpd4S2KM.js"])))=>i.map(i=>d[i]);
import{o as t,t as e,u as i}from"./lit.BV3SxJOV.js";import"./iconify-icon.CciI8O2w.js";import"./conductor.dYILiEAO.js";import{l as s,r as n}from"./crud.Ce6rXOh0.js";import"./svc-player.4czit1x4.js";import"./web-boxs.BVSKqrxp.js";var o="posts";function r(t){return"string"==typeof t.meta?JSON.parse(t.meta||"{}"):t.meta??{}}async function a(t,e,i){const s=n(o),a=await s.findById(t);if(!a)throw new Error(`[svc-engage] record not found: ${t}`);const c=r(a),l=Math.max(0,Number(c[e]||0)+i);return await s.update(t,{meta:{...c,[e]:l},updated_at:await s.now()}),l}var c="engage";async function l(){const{default:t}=await s(async()=>{const{default:t}=await import("./storager.IKaCAcTl.js").then(t=>t.n);return{default:t}},__vite__mapDeps([0,1]));return{Storager:t,state:await t.get(c)??{liked:{},viewed:{}}}}var h={facebook:t=>`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(t)}`,x:(t,e)=>`https://twitter.com/intent/tweet?url=${encodeURIComponent(t)}&text=${encodeURIComponent(e)}`,threads:(t,e)=>`https://www.threads.net/intent/post?text=${encodeURIComponent(`${e} ${t}`)}`};var d=[{key:"facebook",icon:"ri:facebook-fill"},{key:"x",icon:"ri:twitter-x-fill"},{key:"threads",icon:"simple-icons:threads"}],p=class extends e{static styles=i(":host{display:inline-flex}.svc-engage{align-items:center;gap:1rem;display:flex}.engage-views{opacity:.6;color:var(--color-base-content);align-items:center;gap:.25rem;font-size:.875rem;display:flex}.engage-views iconify-icon{font-size:1rem}");static properties={ui:{type:String},theme:{type:String},mainColors:{type:String},textColor:{type:String},lang:{type:String},postId:{type:String},initialViews:{type:Number},initialLikes:{type:Number},_views:{state:!0},_likes:{state:!0},_liked:{state:!0}};constructor(){super(),this.ui="modern",this.theme="",this.mainColors="",this.textColor="",this.lang="vi",this.postId="",this.initialViews=0,this.initialLikes=0,this._views=0,this._likes=0,this._liked=!1}connectedCallback(){super.connectedCallback(),this._dcInit()}async _dcInit(){if(!this.postId)return;this._views=Number(this.initialViews)||0,this._likes=Number(this.initialLikes)||0,this._liked=await async function(t){const{state:e}=await l();return!!e.liked[t]}(this.postId);const t=await async function(t){const e=await n(o).findById(t);if(!e)return null;const i=r(e);return{views:Number(i.views||0),likes:Number(i.likes||0)}}(this.postId);t&&(this._views=t.views,this._likes=t.likes),this._dcTrackView()}async _dcTrackView(){if(await async function(t){const{state:e}=await l(),i=e.viewed[t];return!i||Date.now()-i>=3e4}(this.postId)){this._views+=1;try{const t=await a(this.postId,"views",1);this._views=t,await async function(t){const{Storager:e,state:i}=await l();i.viewed[t]=Date.now(),await e.set(c,i,0)}(this.postId)}catch(t){this._views-=1,console.error("[svc-engage] track view failed",t)}}}async _dhLike(){if(!this._liked){this._liked=!0,this._likes+=1;try{const t=await a(this.postId,"likes",1);this._likes=t,await async function(t){const{Storager:e,state:i}=await l();i.liked[t]=!0,await e.set(c,i,0)}(this.postId)}catch(t){console.error("[svc-engage] like failed",t),this._liked=!1,this._likes-=1}}}render(){return t`
            <div class="svc-engage">
                ${this._rbLikeButton()}
                ${this._rbViews()}
            </div>
        `}_rbLikeButton(){return t`
            <web-button
                type=${"soft"}
                color="primary"
                rounded="9999px"
                height="28px"
                fontSize="0.875rem"
                ?disabled=${this._liked}
                ui=${this.ui}
                theme=${this.theme}
                @clicked=${this._dhLike}
            >
                <iconify-icon slot="prefix" width="18" icon=${this._liked?"ri:heart-fill":"ri:heart-line"}></iconify-icon>
                ${this._likes.toLocaleString("vi-VN")}
            </web-button>
        `}_rbViews(){return t`
            <span class="engage-views">
                <iconify-icon width="18" icon="ri:eye-line"></iconify-icon>
                ${this._views.toLocaleString("vi-VN")}
            </span>
        `}};customElements.get("svc-engage")||customElements.define("svc-engage",p);var u={facebook:"Facebook",x:"X (Twitter)",threads:"Threads"},w=class extends e{static styles=i(":host{display:inline-flex}.svc-share{align-items:center;gap:.375rem;display:flex}");static properties={ui:{type:String},theme:{type:String},mainColors:{type:String},textColor:{type:String},lang:{type:String},title:{type:String},url:{type:String}};constructor(){super(),this.ui="modern",this.theme="",this.mainColors="",this.textColor="",this.lang="vi",this.title="",this.url=""}_dhShare(t){const e=function(t,{url:e,title:i}){const s=h[t];return s?s(e,i):""}(t,{url:this._comUrl,title:this.title});e&&window.open(e,"_blank","noopener,noreferrer,width=600,height=600")}get _comUrl(){return this.url||("undefined"!=typeof window?window.location.href:"")}render(){return t`
            <div class="svc-share">
                ${this._rbButtons()}
            </div>
        `}_rbButtons(){return d.map(e=>t`
            <web-button
                type="ghost"
                square
                rounded="9999px"
                height="28px"
                ui=${this.ui}
                theme=${this.theme}
                title=${u[e.key]??e.key}
                @clicked=${()=>this._dhShare(e.key)}
            >
                <iconify-icon width="16" icon=${e.icon}></iconify-icon>
            </web-button>
        `)}};customElements.get("svc-share")||customElements.define("svc-share",w);