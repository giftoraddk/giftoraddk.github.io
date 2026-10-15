// src/packages/llm/app/svc-routing.js
//
// <svc-routing> — bảng phân công của Thư ký (bước Phân công, trong <svc-progress>): mỗi phòng 1 card — mức kích hoạt,
// sẽ chạy hay bỏ qua (kèm lý do), vì sao Thư ký giao. `editable` (job chưa duyệt): sếp Thêm phòng / Bỏ phòng / Đặt
// chủ trì → phát `routing-change` { activation, lead } (tool/tasks.js editRouting); service ghi 2 field đó lên Worker
// và đọc lại plan Worker tính — bảng chỉ hiển thị plan đó, không tự tính. Bấm 1 card → mở rộng lý do.
import { LitElement, html, unsafeCSS } from 'lit'
import 'iconify-icon'
import '@/packages/apex/web-avatar.js'
import '@/packages/apex/web-button.js'
import { editRouting, rationaleOf } from '../tool/tasks.js'
import { cardTxt, chip, LEVEL_TONE } from './card-parts.js'
import styles from '../css/svc-cards.css?inline'

const TXT = {
    vi: {
        willRun: (n) => `Sẽ chạy ${n} phòng`, integrate: 'cuối cùng Tích hợp rà soát chéo',
        run: 'Sẽ chạy', skipped: (why) => `Bỏ qua · ${why}`, missing: 'chưa có phòng này',
        add: 'Thêm', drop: 'Bỏ', makeLead: 'Đặt chủ trì',
    },
    en: {
        willRun: (n) => `${n} departments will run`, integrate: 'Integration cross-checks at the end',
        run: 'Will run', skipped: (why) => `Skipped · ${why}`, missing: 'not available yet',
        add: 'Add', drop: 'Drop', makeLead: 'Make lead',
    },
}

export class SvcRouting extends LitElement {
    static styles = unsafeCSS(styles)

    static properties = {
        routing: { type: Object },   // { routing, plan } — task view `preview` (chưa duyệt) hoặc routing + plan đang hiệu lực
        rationale: { type: String }, // field `rationale` của job Thư ký
        faces: { type: Object },     // { [fn]: { title, pics } }
        titles: { type: Object },    // view.titles — tên dự phòng
        editable: { type: Boolean },
        busy: { type: Boolean },
        lang: { type: String }, ui: { type: String }, theme: { type: String },
        _open: { state: true },      // fn đang mở rộng lý do
    }

    constructor() {
        super()
        this.routing = null; this.rationale = ''; this.faces = {}; this.titles = {}
        this.editable = false; this.busy = false
        this.lang = 'vi'; this.ui = 'pastel'; this.theme = ''
        this._open = ''
    }

    _name(fn) { return this.faces?.[fn]?.title || this.titles?.[fn]?.[this.lang] || this.titles?.[fn]?.vi || fn }

    _change(change) {
        if (this.busy) return
        this.dispatchEvent(new CustomEvent('routing-change', { detail: editRouting(this.routing.routing, change), bubbles: true, composed: true }))
    }

    render() {
        if (!this.routing?.routing || !this.routing?.plan) return html``
        const t = { ...cardTxt(this.lang), ...(TXT[this.lang] ?? TXT.vi) }
        const { routing, plan } = this.routing
        const why = rationaleOf(this.rationale)
        const run = new Set([...plan.run, ...plan.unavailable])
        // Phòng sẽ chạy trước (chủ trì đầu tiên — plan.run đã xếp vậy), rồi các phòng bỏ qua theo thứ tự chuẩn.
        const order = [...plan.run, ...plan.unavailable, ...Object.keys(routing.levels).filter((fn) => !run.has(fn))]
        return html`
            <div class="cd-section cd-board">
                <div class="cd-board-head">
                    <span>${t.willRun(plan.run.length)}${plan.integrate ? ` · ${t.integrate}` : ''}</span>
                </div>
                <div class="cd-grid">${order.map((fn) => this._tile(fn, { routing, plan, why, run, t }))}</div>
            </div>
        `
    }

    _tile(fn, { routing, plan, why, run, t }) {
        const lead = fn === routing.lead
        const level = lead ? 'lead' : routing.levels[fn]
        const runs = run.has(fn)
        const skip = plan.skipped.find((s) => s.fn === fn)
        const status = plan.unavailable.includes(fn) ? t.missing : runs ? t.run : t.skipped(t.reason[skip?.reason] ?? skip?.reason ?? '')
        const open = this._open === fn
        const toggle = () => { this._open = open ? '' : fn }
        // Nút icon gọn cho mobile — tên hành động nằm ở title/aria-label.
        const act = (label, icon, change, color = '') => html`
            <web-button type="soft" color=${color} height="28px" square rounded="50%" prefix=${icon}
                title=${label} aria-label=${label} ui=${this.ui} theme=${this.theme} ?disabled=${this.busy}
                @click=${(e) => { e.stopPropagation(); this._change(change) }}></web-button>
        `
        return html`
            <div class="cd-tile ${runs ? 'is-run' : ''} ${lead ? 'is-lead' : ''} ${open ? 'is-open' : ''}"
                role="button" tabindex="0" aria-expanded=${open ? 'true' : 'false'} @click=${toggle}
                @keydown=${(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle() } }}>
                <web-avatar src=${this.faces?.[fn]?.pics || ''} name=${this._name(fn)} size="28px" ui=${this.ui} theme=${this.theme}></web-avatar>
                <div class="cd-tile-main">
                    <span class="cd-row-name" title=${this._name(fn)}>${this._name(fn)}</span>
                    <div class="cd-chips">
                        ${chip(t.level[level] ?? level, LEVEL_TONE[level])}
                        <span class="cd-tile-status">${status}</span>
                    </div>
                    ${why[fn] ? html`<div class="cd-why">${why[fn]}</div>` : ''}
                </div>
                ${this.editable && !lead ? html`
                    <div class="cd-actions">
                        ${runs
                            ? html`${act(t.makeLead, 'ri:star-line', { lead: fn })}${act(t.drop, 'ri:close-line', { drop: fn }, 'error')}`
                            : act(t.add, 'ri:add-line', { add: fn }, 'primary')}
                    </div>
                ` : lead ? html`<iconify-icon class="cd-lead-icon" icon="ri:star-fill" aria-hidden="true"></iconify-icon>` : ''}
            </div>
        `
    }
}

if (!customElements.get('svc-routing')) customElements.define('svc-routing', SvcRouting)
export default SvcRouting
