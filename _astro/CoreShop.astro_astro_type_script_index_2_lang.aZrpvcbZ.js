import{n as e,o as t,t as i,u as n}from"./lit.PcferLoS.js";import"./iconify-icon.CciI8O2w.js";import"./svc-pay.Bknh1spt.js";import"./conductor.C20pIf_j.js";import{$ as s,A as a,C as r,N as o,O as l,_ as c,a as d,b as h,ct as p,d as m,g as w,k as _,l as u,t as b,u as f,v as g,w as y,x}from"./web-toggle.Bs7HtiDd.js";import{c as v,l as $}from"./helper.C3oqqa-T.js";import"./web-textarea.UXJpX5BP.js";var C=class extends i{static styles=[n(":host{color:var(--color-base-content);display:inline-block}.warden-empty{opacity:.35;flex-direction:column;justify-content:center;align-items:center;gap:.5rem;padding:2.5rem 1rem;display:flex}.warden-empty iconify-icon{font-size:2.5rem}.warden-table-scroll{overflow-x:auto}.warden-table{flex-direction:column;gap:.5rem;min-width:750px;display:flex}.warden-thead{opacity:.7;text-transform:uppercase;letter-spacing:.05em;text-align:left;grid-template-columns:240px 1fr 1fr 1fr 210px 30px;gap:.75rem;padding:0 .9rem;font-size:.68rem;font-weight:700;display:grid}.warden-row{border:1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent);background:color-mix(in oklab, var(--color-base-200) 30%, transparent);cursor:pointer;text-align:left;border-radius:.875rem;grid-template-columns:240px 1fr 1fr 1fr 210px 30px;align-items:center;gap:.75rem;padding:.75rem .9rem;transition:border-color .2s;display:grid}.warden-row:hover{border-color:color-mix(in oklab, var(--color-primary) 40%, transparent)}.warden-col{flex-direction:column;gap:.25rem;font-size:.82rem;display:flex}.warden-col>*{white-space:nowrap;text-overflow:ellipsis;overflow:hidden}.warden-col-invoice{gap:.15rem}.warden-id{font-size:.85rem;font-weight:700}.warden-total{color:var(--color-primary);font-size:.78rem;font-weight:700}.warden-item-line{opacity:.65;font-size:.78rem}.warden-col-buyer{opacity:.85}.warden-buyer-phone{opacity:.7;font-size:.75rem}.warden-step{background:color-mix(in oklab, var(--color-info) 15%, transparent);color:var(--color-info);border-radius:99px;align-self:flex-start;padding:.15rem .55rem;font-size:.7rem;font-weight:700}.warden-cancel-note{color:var(--color-warning);background:color-mix(in oklab, var(--color-warning) 10%, transparent);border-radius:.5rem;align-items:center;gap:.3rem;padding:.3rem .5rem;font-size:.72rem;display:flex}.warden-col-actions{flex-direction:column;gap:.35rem;display:flex}.warden-col-link{justify-content:center;align-items:center;display:flex}.warden-reject-form{flex-direction:column;gap:.4rem;margin-top:.15rem;display:flex}.warden-reject-actions{gap:.4rem;display:flex}@media (width<=860px){.warden-table{min-width:0}.warden-thead{display:none}.warden-row{flex-direction:column;align-items:stretch;gap:.6rem;padding-right:2.5rem;display:flex;position:relative}.warden-col>*{white-space:normal;text-overflow:clip;overflow:visible}.warden-col-invoice{flex-direction:row;justify-content:space-between;align-items:baseline;gap:.5rem}.warden-col-step{flex-flow:wrap;align-items:center;gap:.5rem}.warden-col-actions{border-top:1px dashed color-mix(in oklab, var(--color-base-content) 15%, transparent);flex-flow:wrap;padding-top:.5rem}.warden-col-actions web-button{flex:auto}.warden-reject-form{flex-basis:100%}.warden-col-link{position:absolute;top:.5rem;right:.5rem}}")];static properties={ui:{type:String},theme:{type:String},mainColors:{type:String},textColor:{type:String},lang:{type:String},txt:{type:Object},position:{type:String},x:{type:String},y:{type:String},role:{type:String},sellerId:{type:String},buyerId:{type:String},bayId:{type:String},wallet:{type:Object},vietqr:{type:Object},_open:{state:!0},_invoices:{state:!0},_rejectingId:{state:!0},_rejectReason:{state:!0},_detailId:{state:!0}};constructor(){super(),this.ui="modern",this.theme="",this.mainColors="",this.textColor="",this.lang="vi",this.txt=null,this.position="static",this.x="99%",this.y="1rem",this.role="seller",this.sellerId="",this.buyerId="",this.bayId="",this.wallet={},this.vietqr={},this._open=!1,this._invoices=[],this._rejectingId="",this._rejectReason="",this._detailId="",this._unsub=null,this._pendingPaymentIds=null,this._cancelResponseStatus=null,this._lastInitKey=null}connectedCallback(){super.connectedCallback(),this._lastInitKey=`${this._comId}|${this.role}`,this._dcInit()}disconnectedCallback(){super.disconnectedCallback(),this._unsub?.()}updated(e){if(!(e.has("sellerId")||e.has("buyerId")||e.has("role")))return;const t=`${this._comId}|${this.role}`;this._comId&&t!==this._lastInitKey&&(this._lastInitKey=t,this._dcReinit())}_dcReinit(){this._unsub?.(),this._unsub=null,this._dcInit()}get _comId(){return"buyer"===this.role?this.buyerId:this.sellerId}async _dcInit(){const e=this._comId;e&&("buyer"===this.role?(this._invoices=await x(e).catch(()=>[]),this._cancelResponseStatus=this._comCancelResponses(this._invoices),this._unsub=g(e,e=>{this._dhWatchCancelResponses(e??[]),this._invoices=e??[]})):(this._invoices=await r(e).catch(()=>[]),this._pendingPaymentIds=new Set(this._comPendingPaymentIds(this._invoices)),this._unsub=h(e,e=>{this._dhWatchNewOrders(e??[]),this._invoices=e??[]})))}_comPendingPaymentIds(e){return e.filter(e=>c(e.meta??{})).map(e=>e.id)}_dhWatchNewOrders(e){const t=new Set(this._comPendingPaymentIds(e));if(this._pendingPaymentIds)for(const i of t)this._pendingPaymentIds.has(i)||window.webToast?.({message:this._txt.wardenNewOrderToast,type:"info"});this._pendingPaymentIds=t}_comCancelResponses(e){const t=new Map;for(const i of e){const e=(i.meta??{}).subStatus;"rejected"!==e&&"seller_cancelled"!==e&&"buyer_cancelled"!==e||t.set(i.id,e)}return t}_cancelResponseToast(e){return"rejected"===e?this._txt.wardenCancelRejectedToast:"buyer_cancelled"===e?this._txt.wardenCancelAcceptedToast:this._txt.wardenSellerCancelledToast}_dhWatchCancelResponses(e){const t=this._comCancelResponses(e);if(this._cancelResponseStatus)for(const[i,n]of t)this._cancelResponseStatus.get(i)!==n&&window.webToast?.({message:this._cancelResponseToast(n),type:"info"});this._cancelResponseStatus=t}_dhOpen(){this._open=!0}_dhClose(){this._open=!1}_dfConfirmPayment(e){f(e)}_dfConfirmReceived(e){u(e)}_dfAcceptCancel(e){b(e)}_dfConfirmRefund(e){m(e)}_dhOpenReject(e){this._rejectingId=e,this._rejectReason=""}_dhCancelReject(){this._rejectingId="",this._rejectReason=""}_dfRejectCancel(e){(this._rejectReason??"").trim()&&(o(e,this._rejectReason),this._dhCancelReject())}_dhOpenDetail(e){this._detailId=e}_dhCloseDetail(){this._detailId=""}_dhOpenInvoiceTab(e){const t=d(e,{role:this.role,sellerId:this.sellerId,bayId:this.bayId});t&&window.open(t,"_blank","noopener")}get _txt(){return s[this.lang]??s.vi}get _stepTxt(){return p[this.lang]??p.vi}get _comPendingCount(){return this._invoices.filter(e=>{const t=e.meta??{};return"buyer"===this.role?w(t):c(t)||"pending"===t.subStatus||y(t)}).length}_stepLabel(e){const t=e?.major,i=e?.sub;return t&&i?this._stepTxt[t]?.[i]??i:""}render(){const i=this._comPendingCount;return t`
            <web-fab icon="ri:file-list-3-line" badge=${i>0?v(i):""}
                position=${this.position} x=${this.x} y=${this.y} movable=${"fixed"===this.position}
                size="lg" ui=${"fixed"===this.position?"modern":this.ui} theme=${this.theme} title=${this._txt.wardenTitle}
                @clicked=${()=>this._dhOpen()}>
            </web-fab>

            <web-dialog ?open=${this._open} title=${this._txt.wardenTitle} lang=${this.lang} maxWidth="960px"
                ui=${this.ui} theme=${this.theme}
                @close=${()=>this._dhClose()}>
                ${this._rbList()}
            </web-dialog>

            ${this._detailId?this._rbDetailDialog():e}
        `}_rbList(){return 0===this._invoices.length?t`
            <div class="warden-empty">
                <iconify-icon icon="ri:file-list-3-line"></iconify-icon>
                <span>${this._txt.wardenEmpty}</span>
            </div>`:t`
            <div class="warden-table-scroll">
                <div class="warden-table">
                    <div class="warden-thead">
                        <span><iconify-icon icon="ri:receipt-line"></iconify-icon> ${this._txt.wardenColInvoice}</span>
                        <span>${this._txt.wardenColItems}</span>
                        <span>${"buyer"===this.role?this._txt.wardenColSeller:this._txt.wardenColBuyer}</span>
                        <span>${this._txt.wardenColStep}</span>
                        <span>${this._txt.wardenColActions}</span>
                        <span></span>
                    </div>
                    ${this._invoices.map(e=>this._rfRow(e))}
                </div>
            </div>`}_rfRow(i){const n=i.meta??{},s=_(i.items),r="buyer"===this.role,o=r?a(i.seller):l(i.buyer),d=Number((i.summary||"0~0~0").split("~")[2])||0,h=!r&&c(n),p=r&&w(n),m="pending"===n.subStatus,u=!r&&y(n);return t`
            <div class="warden-row" @click=${()=>this._dhOpenDetail(i.id)}>
                <div class="warden-col warden-col-invoice">
                    <span class="warden-id">${i.id}</span>
                    <span class="warden-total">${$(d,this.lang)}</span>
                </div>

                <div class="warden-col warden-col-items">
                    ${s.map(e=>t`<div class="warden-item-line">${e.qty}× ${e.name}</div>`)}
                </div>

                <div class="warden-col warden-col-buyer">
                    <span><iconify-icon icon="ri:user-line"></iconify-icon> ${o.name||"—"}</span>
                    ${o.phone?t`<span class="warden-buyer-phone">${o.phone}</span>`:e}
                </div>

                <div class="warden-col warden-col-step">
                    <span class="warden-step">${this._stepLabel(n)}</span>
                    ${m?t`
                        <div class="warden-cancel-note">
                            <iconify-icon icon="ri:error-warning-line"></iconify-icon> ${this._txt.wardenCancelPending}
                        </div>`:e}
                </div>

                <div class="warden-col warden-col-actions" @click=${e=>e.stopPropagation()}>
                    ${h?t`
                        <web-button type="fill" color="primary" height="24px"
                            @clicked=${()=>this._dfConfirmPayment(i.id)}>${this._txt.wardenConfirmPayment}</web-button>
                    `:e}
                    ${p?t`
                        <web-button type="fill" color="primary" height="24px"
                            @clicked=${()=>this._dfConfirmReceived(i.id)}>${this._txt.wardenConfirmReceived}</web-button>
                    `:e}
                    ${!r&&m?t`
                        <web-button type="fill" color="success" height="24px"
                            @clicked=${()=>this._dfAcceptCancel(i.id)}>${this._txt.wardenAcceptCancel}</web-button>
                        <web-button type="outline" color="error" height="24px"
                            @clicked=${()=>this._dhOpenReject(i.id)}>${this._txt.wardenRejectCancel}</web-button>
                    `:e}
                    ${u?t`
                        <web-button type="fill" color="primary" height="24px"
                            @clicked=${()=>this._dfConfirmRefund(i.id)}>${this._txt.wardenConfirmRefund}</web-button>
                    `:e}
                    <web-button type="outline" height="24px" @clicked=${()=>this._dhOpenDetail(i.id)}>${this._txt.wardenViewDetail}</web-button>

                    ${this._rejectingId===i.id?t`
                        <div class="warden-reject-form" @click=${e=>e.stopPropagation()}>
                            <web-textarea placeholder=${this._txt.wardenRejectReasonPh} .value=${this._rejectReason} rows="2"
                                ui=${this.ui} theme=${this.theme}
                                @input=${e=>{this._rejectReason=e.detail?.value??""}}></web-textarea>
                            <div class="warden-reject-actions">
                                <web-button type="fill" color="error" height="24px" ?disabled=${!(this._rejectReason??"").trim()}
                                    @clicked=${()=>this._dfRejectCancel(i.id)}>${this._txt.wardenRejectCancel}</web-button>
                                <web-button type="outline" height="24px" @clicked=${()=>this._dhCancelReject()}>×</web-button>
                            </div>
                        </div>`:e}
                </div>

                <div class="warden-col warden-col-link" @click=${e=>e.stopPropagation()}>
                    <web-button type="outline" square height="24px" width="24px" title=${this._txt.wardenOpenTab}
                        @clicked=${()=>this._dhOpenInvoiceTab(i.id)}>
                        <iconify-icon icon="ri:external-link-line" width="14px"></iconify-icon>
                    </web-button>
                </div>
            </div>`}_rbDetailDialog(){return t`
            <web-dialog type="mobile" ui=${this.ui} theme=${this.theme} maxWidth="860px"
                .open=${!!this._detailId} title=${this._txt.wardenViewDetail} @close=${()=>this._dhCloseDetail()}>
                <svc-pay role=${this.role} invoiceId=${this._detailId}
                    .wallet=${this.wallet} .vietqr=${this.vietqr}
                    ui=${this.ui} theme=${this.theme} mainColors=${this.mainColors} textColor=${this.textColor}
                    lang=${this.lang}>
                </svc-pay>
            </web-dialog>`}};customElements.get("svc-pay-warden")||customElements.define("svc-pay-warden",C);