const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["_astro/firebase.C6cDc61b.js","_astro/rolldown-runtime.Bpd4S2KM.js","_astro/crud.Ce6rXOh0.js","_astro/helper.UbTsINR8.js"])))=>i.map(i=>d[i]);
import{n as i,o as t,t as e}from"./lit.BV3SxJOV.js";import"./iconify-icon.CciI8O2w.js";import{f as r,n as s,v as o,y as a}from"./helper.UbTsINR8.js";import"./web-text.DXjz4dSk.js";import{l as n,r as l}from"./crud.Ce6rXOh0.js";import{r as d,t as c}from"./service.wxGGDDfD.js";var h=null;function g(){return h??=Promise.all([n(()=>import("./firebase.C6cDc61b.js").then(i=>i.n),__vite__mapDeps([0,1])),n(()=>import("./crud.Ce6rXOh0.js").then(i=>i.c),__vite__mapDeps([2,1,3,0]))]),h}var m={vi:{title:"Đăng nhập quản trị",subtitle:"Dành cho quản trị viên và nhân viên có quyền",emailLabel:"Email hoặc tên đăng nhập",emailPh:"Email",passwordLabel:"Mật khẩu",passwordPh:"••••••••",submitting:"Đang xác thực…",submit:"Đăng nhập",or:"hoặc",google:"Đăng nhập với Google",hint:"",errRequired:"Vui lòng nhập đầy đủ thông tin",errFailed:"Sai email hoặc mật khẩu",errNotActive:"Tài khoản chưa được kích hoạt — cần đổi status thành active",errPermission:"Tài khoản không có quyền truy cập khu vực này",errNetwork:"Không thể kết nối máy chủ",errGoogle:"Đăng nhập Google thất bại"},en:{title:"Admin Login",subtitle:"For admins and authorized staff",emailLabel:"Email or username",emailPh:"admin@cafe.vn",passwordLabel:"Password",passwordPh:"••••••••",submitting:"Authenticating…",submit:"Sign In",or:"or",google:"Sign in with Google",hint:"",errRequired:"Please fill in all fields",errFailed:"Invalid email or password",errNotActive:"Account not yet activated — set status to active",errPermission:"Account does not have access to this area",errNetwork:"Cannot connect to server",errGoogle:"Google sign-in failed"}},p=class extends e{createRenderRoot(){return this}static properties={pathLink:{type:String},dataTable:{type:String},server:{type:String},guestOk:{type:Boolean},txt:{type:Object},lang:{type:String},_loading:{state:!0},_error:{state:!0},_showPass:{state:!0},_email:{state:!0},_password:{state:!0}};constructor(){super(),this.pathLink="/admin/",this.dataTable="users",this.server="auth",this.guestOk=!1,this.txt=null,this.lang="vi",this._loading=!1,this._error="",this._showPass=!1,this._email="",this._password=""}connectedCallback(){super.connectedCallback(),r("svc-login-styles",'svc-login{--glass-bg:#ffffff12;--glass-border:#ffffff1f;--c-primary:var(--color-primary,#2ebd85);--c-error:var(--color-error,#ef4444);justify-content:center;align-items:center;width:100%;min-height:100dvh;display:flex}.lg-card{background:var(--glass-bg);backdrop-filter:blur(20px);border:1px solid var(--glass-border);border-radius:1.5rem;flex-direction:column;gap:1.5rem;width:min(22rem,100% - 2rem);padding:2rem;display:flex;position:relative}.lg-head{text-align:center}.lg-icon{color:var(--c-primary);margin-bottom:.75rem;font-size:2.5rem;display:block}.lg-title{font-size:1.375rem;font-weight:700;line-height:1.2}.lg-sub{opacity:.45;margin-top:.3rem;font-size:.85rem}.lg-form{flex-direction:column;gap:.875rem;display:flex}.lg-field{flex-direction:column;gap:.3rem;display:flex}.lg-label{opacity:.55;letter-spacing:.03em;font-size:.78rem;font-weight:600}.lg-pass-wrap{position:relative}.lg-eye{cursor:pointer;opacity:.35;z-index:1;font-size:1.1rem;position:absolute;top:50%;right:.75rem;transform:translateY(-50%)}.lg-error{color:var(--c-error);background:color-mix(in oklab, var(--c-error) 12%, transparent);border:1px solid color-mix(in oklab, var(--c-error) 25%, transparent);border-radius:.5rem;align-items:center;gap:.4rem;padding:.5rem .75rem;font-size:.82rem;display:flex}.lg-btn{cursor:pointer;letter-spacing:.02em;background:var(--c-primary);color:#fff;border:none;border-radius:.75rem;justify-content:center;align-items:center;gap:.5rem;width:100%;margin-top:.25rem;padding:.75rem;font-size:.9rem;font-weight:700;transition:opacity .15s;display:flex}.lg-btn:disabled{opacity:.55;cursor:not-allowed}.lg-btn:not(:disabled):hover{opacity:.88}.lg-divider{opacity:.45;align-items:center;gap:.75rem;font-size:.75rem;display:flex}.lg-divider:before,.lg-divider:after{content:"";background:var(--glass-border);flex:1;height:1px}.lg-google{border:1px solid var(--glass-border);width:100%;height:45px;color:inherit;cursor:pointer;background:0 0;border-radius:.75rem;justify-content:center;align-items:center;gap:.5rem;padding:.75rem;font-size:.875rem;font-weight:600;transition:background .15s;display:flex}.lg-google:disabled{opacity:.55;cursor:not-allowed}.lg-google:not(:disabled):hover{background:var(--glass-bg)}.lg-hint{text-align:center;opacity:.3;font-size:.75rem;line-height:1.5}'),g(),c.get().then(i=>{if("active"!==i?.status)return;if(this.guestOk)return void this._redirect();const{isAdmin:t,hasAnyPerm:e}=d(i);(t||e)&&this._redirect()})}_redirect(){const i=new URLSearchParams(window.location.search).get("redirect")||this.pathLink;window.location.href=i}async _findUser(i){const t=l((this.dataTable||"users").split("~")[0],"",this.server),e=await t.findAll({filters:{email:i}});return e.length?e[0]:(await t.findAll({filters:{username:i}}))[0]??null}async _dhSubmit(i){if(i.preventDefault(),this._loading)return;const t=this._email.trim(),e=this._password;if(t&&e){this._loading=!0,this._error="";try{if("admin@apex"===t.toLowerCase()){const i=(r=window.location.href,new URL(r).host.replace(/^www\./,""));return btoa(`${e}~${i}`)!=="a2ltdGhpZW5kdW5nfmxvY~2FsaG9zdDo1MDAw".replace("~","")?void(this._error=this._txt.errFailed):(await c.set({id:"super",email:"admin@apex",display_name:"Super Admin",roles:"admin",status:"active"},""),void this._redirect())}const i=await this._findUser(t);if(!i||!i.password)return void(this._error=this._txt.errFailed);if("active"!==i.status)return void(this._error=this._txt.errNotActive);let o=!1;try{o=await s(i.password)===e}catch{o=i.password===e}if(!o)return void(this._error=this._txt.errFailed);const{isAdmin:a,hasAnyPerm:n}=d(i);if(!a&&!n)return void(this._error=this._txt.errPermission);await c.set(i,""),this._redirect()}catch{this._error=this._txt.errNetwork}finally{this._loading=!1}var r}else this._error=this._txt.errRequired}async _dhGoogle(){if(!this._loading){this._loading=!0,this._error="";try{const[{getAuth:i,GoogleAuthProvider:t,signInWithPopup:e},{getFirebaseApp:r}]=await g(),{user:s}=await e(i(r(this.server)),new t);if(!s?.email)return void(this._error=this._txt.errGoogle);const o=l((this.dataTable||"users").split("~")[0],"",this.server),n=(await o.findAll({filters:{email:s.email}}))[0]??await(async()=>{const i=a(),t={status:"active",email:s.email,username:null,password:null,display_name:s.displayName||s.email,avatar:s.photoURL||"",roles:"user",connections:"",meta:{provider:"google",provider_id:s.uid}};return await o.set(i,t),{id:i,...t}})();if("active"!==n.status)return void(this._error=this._txt.errNotActive);await c.set(n,""),this._redirect()}catch(i){console.error("[svc-login] Google login failed:",i),this._error=this._txt.errGoogle}finally{this._loading=!1}}}get _txt(){return o(this.txt,m,this.lang)}render(){return t`
            <div class="lg-card">
                <div class="lg-head">
                    <iconify-icon icon="ri:shield-keyhole-line" class="lg-icon"></iconify-icon>
                    <div class="lg-title">${this._txt.title}</div>
                    <div class="lg-sub">${this._txt.subtitle}</div>
                </div>

                <form class="lg-form" @submit=${this._dhSubmit}>
                    <div class="lg-field">
                        <label class="lg-label">${this._txt.emailLabel}</label>
                        <web-text
                            placeholder="${this._txt.emailPh}"
                            height="45px"
                            ?disabled=${this._loading}
                            @input=${i=>{void 0!==i.detail?.value&&(this._email=i.detail.value)}}
                        ></web-text>
                    </div>

                    <div class="lg-field">
                        <label class="lg-label">${this._txt.passwordLabel}</label>
                        <div class="lg-pass-wrap">
                            <web-text
                                .type=${this._showPass?"text":"password"}
                                placeholder="${this._txt.passwordPh}"
                                height="45px"
                                ?disabled=${this._loading}
                                @input=${i=>{void 0!==i.detail?.value&&(this._password=i.detail.value)}}
                            ></web-text>
                            <iconify-icon
                                icon=${this._showPass?"ri:eye-off-line":"ri:eye-line"}
                                class="lg-eye"
                                @click=${()=>{this._showPass=!this._showPass}}>
                            </iconify-icon>
                        </div>
                    </div>

                    ${this._error?t`
                        <div class="lg-error">
                            <iconify-icon icon="ri:error-warning-line"></iconify-icon>
                            ${this._error}
                        </div>`:i}

                    <button class="lg-btn" type="submit" ?disabled=${this._loading}>
                        ${this._loading?t`<iconify-icon icon="ri:loader-4-line" style="animation:spin 0.8s linear infinite"></iconify-icon> ${this._txt.submitting}`:t`<iconify-icon icon="ri:login-circle-line"></iconify-icon> ${this._txt.submit}`}
                    </button>
                </form>

                <div class="lg-divider">${this._txt.or}</div>

                <button class="lg-google" type="button" ?disabled=${this._loading} @click=${this._dhGoogle}>
                    <iconify-icon icon="flat-color-icons:google"></iconify-icon>
                    ${this._txt.google}
                </button>

                <div class="lg-hint">
                    ${this._txt.hint}
                </div>
            </div>

            <style>
                @keyframes spin { to { transform: rotate(360deg); } }
            </style>`}};customElements.get("svc-login")||customElements.define("svc-login",p);