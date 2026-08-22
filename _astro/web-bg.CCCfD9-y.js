import{l as t,o as e,t as s}from"./lit.PcferLoS.js";var r=new Set(["brick","cross","diagonal","minus","plus","wave"]),i=new Set(["circle","crescent","diamond","dot","flower","heart","square","star","sun"]),n=class extends s{static properties={theme:{type:String},rounded:{type:String},tint:{type:String},fixed:{type:Boolean,reflect:!0},spatial:{type:Boolean,reflect:!0},gradient:{type:Boolean},mono:{type:Boolean},type:{type:String},distance:{type:Number},deg:{type:Number},total:{type:Number},radius:{type:Number},pattern:{type:String},border:{type:Object},move:{type:String},pics:{type:String}};static styles=t`
        :host {
            display: block;
            position: absolute;
            inset: 0;
            pointer-events: none;
            overflow: hidden;
            /* Default Dark Theme Variables */
            --bg-blob-opacity: 0.5;
            --bg-blob-blend: screen;
            --bg-blob-blur: 120px;
            --bg-spatial-border: #ffffff1a;
            --bg-spatial-bg: #ffffff0d;
        }

        :host([data-theme="light"]) {
            --bg-blob-opacity: 0.35;
            --bg-blob-blend: multiply;
        }

        :host([fixed]) {
            position: fixed;
        }

        :host([spatial]) .bg-wrapper {
            box-sizing: border-box;
            background: var(--bg-spatial-bg) !important;
            backdrop-filter: blur(.75rem);
        }

        .bg-wrapper {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }

        /* High-end grain overlay to prevent color banding and add depth */
        .noise-overlay {
            position: absolute;
            inset: -200%;
            width: 400%;
            height: 400%;
            background-image: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#noiseFilter)"/></svg>');
            opacity: 0.035;
            pointer-events: none;
            z-index: 5;
            mix-blend-mode: overlay;
        }

        /* Large, blurred radial blobs */
        .blob {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            filter: blur(var(--bg-blob-blur));
            opacity: var(--bg-blob-opacity);
            mix-blend-mode: var(--bg-blob-blend);
            transition: transform 1.5s cubic-bezier(0.1, 0.5, 0.1, 1);
            will-change: transform;

            /* Parallax offset storage */
            --tx: 0px;
            --ty: 0px;
            /* Maintain -50% center alignment while applying parallax */
            transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty)));
        }

        :host([fixed]) .blob {
            width: 85vmax;
            height: 85vmax;
        }

        /* Pattern grid layer */
        .pattern-layer {
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 4;
        }

        /* Background image layer — driven by pics 'linkLight|linkDark' */
        .pic-layer {
            position: absolute;
            inset: 0;
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            pointer-events: none;
            z-index: 0;
        }
    `;constructor(){super(),this.rounded="0px",this.tint="",this.fixed=!1,this.spatial=!1,this.gradient=!1,this.mono=!1,this.type="circle",this.distance=86,this.total=3,this.deg=0,this.radius=30,this._tints=[],this._handleMouseMove=this._handleMouseMove.bind(this),this.theme="",this._observer=null,this.pattern="",this._patternType="",this._patternSize=64,this.border={},this.move="",this.pics="",this._picLight="",this._picDark=""}connectedCallback(){super.connectedCallback(),this.gradient&&this._generateColors(),window.addEventListener("mousemove",this._handleMouseMove),this._syncTheme(),this._observer=new MutationObserver(()=>this._syncTheme()),this._observer.observe(document.documentElement,{attributes:!0,attributeFilter:["data-theme"]})}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("mousemove",this._handleMouseMove),this._observer&&this._observer.disconnect()}updated(t){t.has("theme")&&(this.theme?this.setAttribute("data-theme",this.theme):this.removeAttribute("data-theme"))}willUpdate(t){t.has("total")&&this.total>4&&(this.total=4),this.gradient&&(t.has("tint")||t.has("total")||t.has("mono"))&&this._generateColors(),t.has("pattern")&&this._parsePattern(),t.has("pics")&&this._parsePics()}_syncTheme(){const t=document.documentElement.getAttribute("data-theme")||"";this.hasAttribute("theme")||(this.theme=t)}_generateColors(){const t=this._hexToHsl(this.tint);if(t){this._tints=[{h:t.h,s:Math.max(t.s,18),l:Math.min(t.l,50)}];for(let e=1;e<this.total;e++){let s,r,i;if(this.mono){s=t.h;const n=40/Math.max(1,this.total-1)*(e-1);r=55+20*Math.random(),i=40+n+12*Math.random()}else{const n=e*(360/this.total)+(30*Math.random()-15);s=(t.h+n)%360,r=62+14*Math.random(),i=68+10*Math.random()}this._tints.push({h:s,s:r,l:i})}}}_hexToHsl(t){if(!t||"string"!=typeof t)return{h:240,s:60,l:85};let e=0,s=0,r=0;const i=t.replace(/\s/g,"");if(i.startsWith("#"))4===i.length?(e=parseInt(i[1]+i[1],16),s=parseInt(i[2]+i[2],16),r=parseInt(i[3]+i[3],16)):(e=parseInt(i.substring(1,3),16),s=parseInt(i.substring(3,5),16),r=parseInt(i.substring(5,7),16));else{if(!i.startsWith("rgb"))return{h:240,s:60,l:85};{const t=i.match(/\d+/g);t&&([e,s,r]=t.map(Number))}}e/=255,s/=255,r/=255;const n=Math.max(e,s,r),a=Math.min(e,s,r);let o,h,l=(n+a)/2;if(n===a)o=h=0;else{const t=n-a;switch(h=l>.5?t/(2-n-a):t/(n+a),n){case e:o=(s-r)/t+(s<r?6:0);break;case s:o=(r-e)/t+2;break;case r:o=(e-s)/t+4}o/=6}return{h:360*o,s:100*h,l:100*l}}_handleMouseMove(t){const{clientX:e,clientY:s}=t,r=e/window.innerWidth-.5,i=s/window.innerHeight-.5;if("ellipse"===this.type){const t=this.shadowRoot.querySelector(".ellipse-bg");t&&(t.style.setProperty("--tx",60*r+"px"),t.style.setProperty("--ty",60*i+"px"))}else this.shadowRoot.querySelectorAll(".blob").forEach((t,e)=>{const s=80+40*e;t.style.setProperty("--tx",r*s+"px"),t.style.setProperty("--ty",i*s+"px")})}_comBlobPositions(){return this._tints.length?this._tints.map((t,e)=>{if("circleEdge"===this.type){const t=(this.deg+e*(360/this.total)-90)*Math.PI/180;return{x:50+Math.cos(t)*this.distance,y:50+Math.sin(t)*this.distance}}if("circleOverlap"===this.type){const t=22,s=-(this.total-1)*t/2,r=(this.deg+s+e*t-90)*Math.PI/180;return{x:50+Math.cos(r)*this.distance,y:50+Math.sin(r)*this.distance}}const s=(e*(360/this.total)+this.deg-90)*Math.PI/180;return{x:50+Math.cos(s)*this.radius,y:50+Math.sin(s)*this.radius}}):[]}get _moveMode(){return this.move&&"false"!==this.move?!0===this.move||"true"===this.move?"swap":this.move:""}_comMoveStyles(t){const e=this._moveMode;if(!e)return"";const s="ellipse"===this.type;if("swap"===e){if(s)return"@keyframes _bg_sw_e{0%,100%{transform:translate(var(--tx,0px),var(--ty,0px))}50%{transform:translate(calc(var(--tx,0px) + 5%),calc(var(--ty,0px) + 3%))}}";const e=t.length;return t.map((s,r)=>{const i=t[(r+1)%e];return`@keyframes _bg_sw_${r}{0%,100%{transform:translate(calc(-50% + var(--tx)),calc(-50% + var(--ty)))}50%{transform:translate(calc(-50% + var(--tx) + ${(i.x-s.x).toFixed(2)}%),calc(-50% + var(--ty) + ${(i.y-s.y).toFixed(2)}%))}}`}).join("")}return"pulse"===e?s?"@keyframes _bg_pu_e{0%,100%{opacity:1}50%{opacity:0.05}}":"@keyframes _bg_pu{0%,100%{opacity:var(--bg-blob-opacity,0.5)}50%{opacity:0.02}}":""}_comAnimStyle(t,e){const s=this._moveMode;if(!s)return"";const r="ellipse"===this.type;if("swap"===s)return r?"animation:_bg_sw_e 6s ease-in-out infinite;":`animation:_bg_sw_${t} 5s ease-in-out infinite;`;if("pulse"===s){const s=4;return r?`animation:_bg_pu_e ${s}s ease-in-out infinite;`:`animation:_bg_pu ${s}s ease-in-out infinite;animation-delay:${(s=>`${(t*s/Math.max(e,1)).toFixed(2)}s`)(s)};`}return""}_parsePattern(){const t=(this.pattern||"").split("~").map(t=>t.trim()),e=r.has(t[0])||i.has(t[0])?t[0]:"";this._patternType=e,this._patternSize=e&&parseInt(t[1])>0?parseInt(t[1]):64}_parsePics(){const[t="",e=t]=(this.pics||"").split("|").map(t=>t.trim());this._picLight=t,this._picDark=e}_comPicUrl(){return"light"===this.theme?this._picLight:this._picDark}_getPatternSvg(t,e,s){const r=e/2,i=e/4,n=Math.round(.12*e);switch(t){case"brick":return[`<line x1="0" y1="0" x2="${e}" y2="0" stroke="${s}" stroke-width="0.8"/>`,`<line x1="0" y1="${r}" x2="${e}" y2="${r}" stroke="${s}" stroke-width="0.8"/>`,`<line x1="0" y1="0" x2="0" y2="${r}" stroke="${s}" stroke-width="0.8"/>`,`<line x1="${r}" y1="${r}" x2="${r}" y2="${e}" stroke="${s}" stroke-width="0.8"/>`].join("");case"cross":default:return`<line x1="0" y1="0" x2="${e}" y2="${e}" stroke="${s}" stroke-width="0.6"/><line x1="${e}" y1="0" x2="0" y2="${e}" stroke="${s}" stroke-width="0.6"/>`;case"diagonal":return`<line x1="0" y1="0" x2="${e}" y2="${e}" stroke="${s}" stroke-width="0.6"/>`;case"minus":return`<line x1="0" y1="${r}" x2="${e}" y2="${r}" stroke="${s}" stroke-width="0.4"/>`;case"plus":return`<line x1="${r}" y1="0" x2="${r}" y2="${e}" stroke="${s}" stroke-width="0.4"/><line x1="0" y1="${r}" x2="${e}" y2="${r}" stroke="${s}" stroke-width="0.4"/>`;case"wave":{const t=Math.round(.45*r);return`<path d="M 0,${r} C ${Math.round(.2*e)},${r-t} ${Math.round(.2*e)},${r-t} ${r},${r} C ${Math.round(.8*e)},${r+t} ${Math.round(.8*e)},${r+t} ${e},${r}" stroke="${s}" stroke-width="0.6" fill="none"/>`}case"circle":return`<circle cx="${r}" cy="${r}" r="${Math.round(r-n)}" stroke="${s}" stroke-width="0.8" fill="none"/>`;case"crescent":{const t=r-n,e=Math.round(.84*t),i=Math.round(.3*t),a=Math.round(r+(t*t-e*e+i*i)/(2*i)),o=Math.round(Math.sqrt(Math.max(0,t*t-(a-r)*(a-r))));return`<g transform="rotate(-35,${r},${r})"><path d="M ${a},${r-o} A ${t},${t} 0 1,0 ${a},${r+o} A ${e},${e} 0 0,1 ${a},${r-o} Z" stroke="${s}" stroke-width="0.8" fill="none"/></g>`}case"diamond":return`<polygon points="${r},${n} ${e-n},${r} ${r},${e-n} ${n},${r}" stroke="${s}" stroke-width="0.8" fill="none"/>`;case"dot":return`<circle cx="${r}" cy="${r}" r="${Math.min(2,Math.max(1,Math.round(e/64)))}" fill="${s}"/>`;case"flower":{const t=Math.round(.35*r),e=Math.round(.32*r);return[...Array.from({length:6},(i,n)=>`<ellipse cx="${r}" cy="${r-e}" rx="${Math.round(.45*t)}" ry="${t}" transform="rotate(${60*n},${r},${r})" stroke="${s}" stroke-width="0.6" fill="none"/>`),`<circle cx="${r}" cy="${r}" r="${Math.round(.14*r)}" stroke="${s}" stroke-width="0.8" fill="none"/>`].join("")}case"heart":{const t=t=>Math.round(e*t);return`<path d="M ${t(.5)},${t(.321)} C ${t(.417)},${t(.125)} ${t(.125)},${t(.146)} ${t(.125)},${t(.396)} S ${t(.5)},${t(.854)} ${t(.5)},${t(.854)} S ${t(.875)},${t(.646)} ${t(.875)},${t(.396)} S ${t(.583)},${t(.125)} ${t(.5)},${t(.321)} Z" stroke="${s}" stroke-width="0.8" fill="none"/>`}case"square":return`<rect x="${i}" y="${i}" width="${r}" height="${r}" stroke="${s}" stroke-width="0.8" fill="none"/>`;case"star":{const t=r-n,e=Math.round(.4*t);return`<polygon points="${Array.from({length:10},(s,i)=>{const n=i*Math.PI/5-Math.PI/2,a=i%2?e:t;return`${Math.round(r+a*Math.cos(n))},${Math.round(r+a*Math.sin(n))}`}).join(" ")}" stroke="${s}" stroke-width="0.8" fill="none"/>`}case"sun":{const t=Math.round(.5*r),e=Math.round(.72*r),i=Math.round(.84*r);return`<circle cx="${r}" cy="${r}" r="${t}" stroke="${s}" stroke-width="0.8" fill="none"/>`+Array.from({length:8},(t,n)=>{const a=n*Math.PI/4;return`<line x1="${Math.round(r+e*Math.cos(a))}" y1="${Math.round(r+e*Math.sin(a))}" x2="${Math.round(r+i*Math.cos(a))}" y2="${Math.round(r+i*Math.sin(a))}" stroke="${s}" stroke-width="0.8"/>`}).join("")}}}_rbPattern(){if(!this._patternType)return"";const t=this._patternSize,s="light"===this.theme?"rgba(0,0,0,0.14)":"rgba(255,255,255,0.12)",r=`<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${t}"${i.has(this._patternType)?` viewBox="${.125*-t} ${.125*-t} ${1.25*t} ${1.25*t}"`:""}>${this._getPatternSvg(this._patternType,t,s)}</svg>`;return e`<div class="pattern-layer" style="background-image:${`url("data:image/svg+xml,${encodeURIComponent(r)}")`};background-size:${t}px ${t}px;"></div>`}render(){let t="",s="";if(this.gradient&&this._tints.length>0)if("ellipse"===this.type){const r=[],i=this._tints.length;if(1===i){const t=this._tints[0];r.push(`hsla(${Math.round(t.h)}, ${Math.round(t.s)}%, ${Math.round(t.l)}%, 0) 25%`),r.push(`hsla(${Math.round(t.h)}, ${Math.round(t.s)}%, ${Math.round(t.l)}%, 0.26) 50%`),r.push(`hsla(${Math.round(t.h)}, ${Math.round(t.s)}%, ${Math.round(t.l)}%, 0) 75%`)}else{const t=this._tints[0],e=this._tints[i-1];r.push(`hsla(${Math.round(t.h)}, ${Math.round(t.s)}%, ${Math.round(t.l)}%, 0) 5%`);const s=60/(i-1);this._tints.forEach((t,e)=>{r.push(`hsla(${Math.round(t.h)}, ${Math.round(t.s)}%, ${Math.round(t.l)}%, 0.26) ${(20+e*s).toFixed(2)}%`)}),r.push(`hsla(${Math.round(e.h)}, ${Math.round(e.s)}%, ${Math.round(e.l)}%, 0) 95%`)}const n=this._moveMode;n&&(s=this._comMoveStyles([]));const a=this._comAnimStyle(0,1),o="pulse"===n?`transform:translate(var(--tx,0px),var(--ty,0px));${a}`:n?a:"transform:translate(var(--tx,0px),var(--ty,0px));",h=n&&"pulse"!==n?"none":"transform 1.5s cubic-bezier(0.1,0.5,0.1,1)";t=e`
                    <div class="ellipse-bg" style="
                        position: absolute;
                        inset: -20%;
                        background: linear-gradient(${this.deg}deg, ${r.join(", ")});
                        transition: ${h};
                        will-change: transform;
                        ${o}
                    "></div>
                `}else{const r=this._comBlobPositions();this._moveMode&&(s=this._comMoveStyles(r)),t=this._tints.map((t,s)=>{const{x:i,y:n}=r[s],a=this._comAnimStyle(s,this._tints.length);return e`<div class="blob" style="background:hsl(${Math.round(t.h)},${Math.round(t.s)}%,${Math.round(t.l)}%);left:${i}%;top:${n}%;${a}"></div>`})}const r=!this.gradient&&this.tint,i=this._comPicUrl();if(!(r||t||this._patternType||i))return e``;const n=r?`background: ${this.tint};`:"",a=this.border||{},o=a.width?`border: ${a.width} ${a.style||"solid"} ${a.color||"var(--bg-spatial-border)"};`:"";return e`
            ${s?e`<style>${s}</style>`:""}
            <div class="bg-wrapper" style="${n}${o}border-radius: ${this.rounded};">
                ${i?e`<div class="pic-layer" style="background-image:url('${i}');"></div>`:""}
                ${this._rbPattern()}
                ${t?e`<div class="noise-overlay"></div>`:""}
                ${t}
            </div>
        `}};function a(t){return t&&Object.keys(t).length?e`
      <web-bg
        .tint=${t.tint}
        .border=${t.border||{}}
        .pattern=${t.pattern}
        .type=${t.type||"circle"}
        .rounded=${t.rounded||"0px"}
        .total=${t.total||3}
        .deg=${t.deg||0}
        .move=${t.move||""}
        .distance=${t.distance||86}
        .pics=${t.pics||""}
        ?spatial=${t.spatial}
        ?gradient=${t.gradient}
        ?fixed=${t.fixed}
        ?mono=${t.mono}
      ></web-bg>
    `:""}customElements.get("web-bg")||customElements.define("web-bg",n);export{a as t};