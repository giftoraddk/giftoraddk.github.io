// src/packages/node/svc-node-builder.js
//
// <svc-node-builder for="flow"> — Node Builder: your canvas, your way.
//   · On a canvas with presets (<svc-node presets>): every set of preset/config.js with all its nodes — on the canvas
//     or not. Turn a node, or a whole set, on or off for yourself; nodes your plan doesn't cover carry its badge and
//     can't be added (config `tiers`).
//   · Pick any node → its config is the start of a copy of your own: change any field it has (name, description, icon,
//     group, place, the panel's title / page / properties) and add it. Your copies come first: open one to change it
//     again, or remove it — or tap Edit on Your nodes and remove them straight from the grid (the toast can undo).
// All of it lives in your account — profiles.notes (service/custom-nodes.js) — so it comes back on every device you
// sign in on. Needs a signed-in user (preset/builder.js gives its node `roles: ['*']`).
//
// Events (bubbles, composed): custom-nodes-change { entries, show, hide } — after every save.
import { LitElement, html, nothing, unsafeCSS } from 'lit';
import 'iconify-icon';
import styles from './css/svc-node-builder.css?inline';
import { txtLingo } from '@/services/tools/util.js';
import { auth } from '@/packages/auth/service/service.js';
import { fetchProfile } from '@/packages/auth/service/profile.js';
import { generateInitials } from './tool/initials.js';
import { isIconName } from './tool/icon.js';
import { fold, titleOf } from './tool/text.js';
import {
    MAX_NODES, applyCustomNodes, customNodesOf, editableFields, groupsOf, isCustom, newCustomId, patchFrom, saveCustomNodes, viewOf,
} from './service/custom-nodes.js';

const TXT_STD = {
    vi: {
        search: 'Tìm node', mine: 'Node của bạn', other: 'Khác', firstHint: 'Chọn một node bên dưới để tạo bản riêng',
        none: 'Không tìm thấy', from: 'Từ {base}', back: 'Quay lại', add: 'Thêm', copy: 'Tạo bản riêng', save: 'Lưu', remove: 'Xoá', cancel: 'Huỷ',
        noGroup: 'Không nhóm', added: 'Đã thêm “{title}”', saved: 'Đã lưu', removed: 'Đã xoá', failed: 'Lỗi: {error}',
        missing: 'Mẫu không còn trên canvas', locked: 'Cần quyền: {roles}', full: 'Tối đa {max} node',
        onCanvas: 'Trên canvas', always: 'Luôn có trên canvas', shown: 'Đã thêm “{title}” vào canvas', hidden: 'Đã ẩn “{title}”',
        setToggle: 'Bật / tắt cả bộ {title}', needPlan: 'Cần gói {plan}', planText: 'Nâng cấp để thêm node này.', seePlans: 'Xem gói',
        yourCopy: 'Bản riêng', editMine: 'Sửa', done: 'Xong', removeOne: 'Xoá “{title}”', removedOne: 'Đã xoá “{title}”', undo: 'Hoàn tác', restored: 'Đã khôi phục',
        sections: { look: 'Hiển thị', place: 'Vị trí', panel: 'Panel' },
        labels: {
            title: 'Tên', tooltip: 'Tooltip', initials: 'Viết tắt', icon: 'Icon', description: 'Mô tả cho AI',
            group: 'Nhóm', x: 'X', y: 'Y', moving: 'Trôi nhẹ', 'overlay.title': 'Tiêu đề', 'overlay.url': 'Địa chỉ', 'overlay.content': 'Nội dung',
        },
        hints: { icon: 'ri:star-line · URL', position: '50% · 120', description: 'AI đọc để chọn node này' },
    },
    en: {
        search: 'Find a node', mine: 'Your nodes', other: 'Other', firstHint: 'Pick a node below to make a copy of your own',
        none: 'Nothing found', from: 'From {base}', back: 'Back', add: 'Add', copy: 'Make a copy', save: 'Save', remove: 'Remove', cancel: 'Cancel',
        noGroup: 'No group', added: 'Added “{title}”', saved: 'Saved', removed: 'Removed', failed: 'Error: {error}',
        missing: 'Its template is no longer on the canvas', locked: 'Needs: {roles}', full: 'Up to {max} nodes',
        onCanvas: 'On the canvas', always: 'Always on the canvas', shown: 'Added “{title}” to the canvas', hidden: 'Took “{title}” off',
        setToggle: 'Turn the whole {title} set on / off', needPlan: 'Needs {plan}', planText: 'Upgrade to add this node.', seePlans: 'See plans',
        yourCopy: 'Your copy', editMine: 'Edit', done: 'Done', removeOne: 'Remove “{title}”', removedOne: 'Removed “{title}”', undo: 'Undo', restored: 'Restored',
        sections: { look: 'Look', place: 'Place', panel: 'Panel' },
        labels: {
            title: 'Name', tooltip: 'Tooltip', initials: 'Initials', icon: 'Icon', description: 'Description for AI',
            group: 'Group', x: 'X', y: 'Y', moving: 'Drift', 'overlay.title': 'Title', 'overlay.url': 'Address', 'overlay.content': 'Content',
        },
        hints: { icon: 'ri:star-line · URL', position: '50% · 120', description: 'What AI reads to pick this node' },
    },
};

// Which section a field sits in, and the ones that take half a row.
const LOOK = new Set(['title', 'tooltip', 'initials', 'icon', 'description']);
const PLACE = new Set(['group', 'x', 'y', 'moving']);
const HALF = new Set(['initials', 'icon', 'x', 'y']);
const NOTICE_MS = 2400;
const UNDO_MS = 6000; // a removal's toast stays longer — it carries the undo
const SKELETON = Array.from({ length: 8 });

const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

export class SvcNodeBuilder extends LitElement {
    static shadowRootOptions = { mode: 'open' };
    static styles = [unsafeCSS(styles)];

    static properties = {
        for: { type: String }, // id of the <svc-node>
        lang: { type: String },
        theme: { type: String },
        txt: { type: Object },
        _ctl: { state: true }, // the canvas's preset controller (preset/mount.js) — null on a canvas without presets
        _user: { state: true },
        _entries: { state: true },
        _view: { state: true }, // { show, hide } — what the user turned on / off
        _ready: { state: true },
        _query: { state: true },
        _pick: { state: true }, // { base, entry?, item? } — the form: a copy of `base`, `entry` again; `item` = its catalogue row
        _values: { state: true },
        _busy: { state: true },
        _notice: { state: true }, // { text, tone: 'ok' | 'error', undo? } — undo = the node list to put back
        _editing: { state: true }, // Your nodes shows a remove button on every tile
        _badIcons: { state: true }, // image icons that failed to load — their tiles fall back to initials
    };

    constructor() {
        super();
        this.for = '';
        this.lang = 'vi';
        this.theme = '';
        this.txt = null;
        this._ctl = null;
        this._user = null;
        this._entries = [];
        this._view = { show: [], hide: [] };
        this._ready = false;
        this._query = '';
        this._pick = null;
        this._values = {};
        this._busy = false;
        this._notice = null;
        this._editing = false;
        this._badIcons = new Set();
        this._noticeTimer = 0;
        this._seq = 0; // bumps on every load and save — a load that finishes after a save must not undo it
    }

    connectedCallback() {
        super.connectedCallback();
        this._load();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        clearTimeout(this._noticeTimer);
    }

    updated(changed) {
        if (changed.has('theme')) {
            if (this.theme && this.theme !== 'system') this.setAttribute('data-theme', this.theme);
            else this.removeAttribute('data-theme');
        }
    }

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }
    get _flow() { return this.for ? document.getElementById(this.for) : null; }

    // The canvas's presets, the cached profile, then the Worker's own row (another device may have saved since).
    async _load() {
        const seq = ++this._seq;
        const [ctl, cached] = await Promise.all([this._flow?.presetsReady ?? null, auth.get().catch(() => null)]);
        if (seq !== this._seq) return;
        this._ctl = ctl ?? null;
        this._setUser(cached);
        this._ready = true;
        if (!cached) return;
        const user = await fetchProfile(cached).catch(() => cached);
        if (seq !== this._seq) return;
        this._setUser(user);
    }

    _setUser(user) {
        this._user = user;
        this._entries = customNodesOf(user);
        this._view = viewOf(user);
    }

    _say(text, tone = 'ok', undo = null) {
        clearTimeout(this._noticeTimer);
        this._notice = { text, tone, undo };
        if (tone === 'ok') this._noticeTimer = setTimeout(() => { this._notice = null; }, undo ? UNDO_MS : NOTICE_MS);
    }

    // ── What is offered ──────────────────────────────────────────────────────

    // A node's config: the preset's own (on the canvas or not), else the canvas's.
    _nodeOf(id) {
        const flow = this._flow;
        return this._ctl?.nodeOf(id) ?? flow?.configOf?.(id) ?? flow?.nodes.find((n) => n.id === id) ?? null;
    }

    /** [{ id, title, icon, pinned, nodes: [{ node, on, locked, plan }] }] — the presets, or the canvas by its groups. */
    _sections() {
        if (this._ctl) return this._ctl.catalogue(this.lang).filter((s) => s.id !== 'builder');
        const nodes = (this._flow?.nodes ?? []).filter((n) => !isCustom(n) && n.overlay?.tagName !== this.localName);
        const groups = groupsOf(nodes);
        const by = new Map();
        for (const n of nodes) {
            const key = n.group?.type ?? '';
            if (!by.has(key)) by.set(key, []);
            by.get(key).push({ node: n, on: true, locked: false, plan: null });
        }
        return [...by].sort(([a], [b]) => (a === '') - (b === ''))
            .map(([key, list]) => ({ id: key, title: key ? groups.get(key) ?? key : this._txt.other, icon: '', pinned: true, nodes: list }));
    }

    _groups() {
        const catalogue = this._ctl ? this._ctl.catalogue(this.lang).flatMap((s) => s.nodes.map((i) => i.node)) : [];
        return groupsOf([...catalogue, ...(this._flow?.nodes ?? [])]);
    }

    _planName(plan) {
        return this._ctl?.planLabel(plan, this.lang) ?? plan ?? '';
    }

    // ── Picking ──────────────────────────────────────────────────────────────

    _start(base, entry = null, item = null) {
        const config = this._nodeOf(base.id) ?? base;
        const copy = entry ? this._flow?.configOf?.(entry.id) : null; // the copy as it is on the canvas
        const fields = editableFields(copy ?? config, this._groups());
        this._pick = { base: config, entry, item };
        this._values = Object.fromEntries(fields.map((f) => [f.key, f.value]));
        this._notice = null;
        this.updateComplete.then(() => this.renderRoot.querySelector('.nb-form fieldset input')?.focus());
    }

    _edit(entry) {
        const base = this._nodeOf(entry.base);
        if (!base) return this._say(this._txt.missing, 'error');
        this._start(base, entry);
    }

    _back() {
        this._pick = null;
        this._values = {};
    }

    _seePlans() {
        // preset/mount.js opens the plans (or the account) for a 'plan' reason.
        this.dispatchEvent(new CustomEvent('node-access', { detail: { reason: 'plan' }, bubbles: true, composed: true }));
    }

    // ── Saving ───────────────────────────────────────────────────────────────

    /** `mine` = { nodes, show?, hide? } → notes, then the canvas. `undo` = the node list the toast can put back. */
    async _commit(mine, message, undo = null) {
        const flow = this._flow;
        if (!this._user) return false; // the node's roles keep a signed-out visitor out — belt and braces
        this._seq++;
        this._busy = true;
        try {
            this._user = await saveCustomNodes(this._user, mine);
            this._entries = mine.nodes;
            if (mine.show) this._view = { show: mine.show, hide: mine.hide ?? [] };
            if (this._ctl) this._ctl.apply(mine);
            else if (flow) applyCustomNodes(flow, mine.nodes);
            this.dispatchEvent(new CustomEvent('custom-nodes-change', {
                detail: { entries: mine.nodes, ...this._view }, bubbles: true, composed: true,
            }));
            this._say(message, 'ok', undo);
            return true;
        } catch (err) {
            console.error('[node/svc-node-builder] save failed:', err);
            this._say(fill(this._txt.failed, { error: err.message }), 'error');
            return false;
        } finally {
            this._busy = false;
        }
    }

    async _save(e) {
        e.preventDefault();
        const { base, entry } = this._pick ?? {};
        if (!base || this._busy) return;
        const t = this._txt;
        if (!entry && this._ctl && !this._ctl.canUse(base.id)) return this._say(fill(t.needPlan, { plan: this._planName(base.plans?.[0]) }), 'error');
        if (!entry && this._entries.length >= MAX_NODES) return this._say(fill(t.full, { max: MAX_NODES }), 'error');
        const patch = patchFrom(base, this._values, this._groups());
        const nodes = entry
            ? this._entries.map((x) => (x.id === entry.id ? { ...x, patch } : x))
            : [...this._entries, { id: newCustomId(), base: base.id, patch }];
        const message = entry ? t.saved : fill(t.added, { title: patch.title ?? titleOf(base) });
        if (await this._commit({ nodes }, message)) this._back();
    }

    async _remove(entry) {
        if (this._busy) return;
        if (await this._commit({ nodes: this._entries.filter((x) => x.id !== entry.id) }, this._txt.removed)) this._back();
    }

    // Straight from the Your nodes grid (edit mode) — no confirm: the toast can undo it.
    async _drop(entry, title) {
        if (this._busy) return;
        const before = this._entries;
        const nodes = before.filter((x) => x.id !== entry.id);
        if (await this._commit({ nodes }, fill(this._txt.removedOne, { title }), before) && !nodes.length) this._editing = false;
    }

    async _undo(nodes) {
        if (this._busy) return;
        clearTimeout(this._noticeTimer);
        this._notice = null;
        await this._commit({ nodes }, this._txt.restored);
    }

    // A preset node, or a whole set, on / off for this user.
    async _toggle(id, on, title) {
        if (this._busy || !this._ctl) return;
        const view = this._ctl.toggled(id, on);
        if (!view) return;
        const t = this._txt;
        const done = await this._commit({ nodes: this._entries, ...view }, fill(on ? t.shown : t.hidden, { title }));
        if (done && this._pick?.item) this._pick = { ...this._pick, item: { ...this._pick.item, on } };
    }

    _set(key, value) {
        this._values = { ...this._values, [key]: value };
    }

    // ── Render ───────────────────────────────────────────────────────────────

    _rfGlyph(n, size = '') {
        const icon = this._badIcons.has(n?.icon) ? undefined : n?.icon;
        // no-referrer: Google avatars (lh3.googleusercontent.com) refuse a request that carries a referrer
        const inner = isIconName(icon) ? html`<iconify-icon icon=${icon}></iconify-icon>`
            : icon ? html`<img src=${icon} alt="" referrerpolicy="no-referrer" @error=${() => { this._badIcons = new Set([...this._badIcons, icon]); }} />`
            : (n?.initials || generateInitials(titleOf(n)));
        return html`<span class="nb-glyph ${size} ${icon && !isIconName(icon) ? 'is-img' : ''}" aria-hidden="true">${inner}</span>`;
    }

    _rfTile(n, onClick, { mine = false, missing = false, off = false, plan = null, onRemove = null } = {}) {
        const t = this._txt;
        const name = titleOf(n);
        const removeLabel = fill(t.removeOne, { title: name });
        const roles = (n?.roles ?? []).filter((r) => r !== '*');
        const locked = roles.length ? fill(t.locked, { roles: roles.join(', ') }) : '';
        const needs = plan ? fill(t.needPlan, { plan: this._planName(plan) }) : '';
        const tip = [n?.tooltip && n.tooltip !== name ? n.tooltip : '', needs, locked].filter(Boolean).join(' · ');
        return html`
            <li>
                <button type="button" class="nb-tile ${mine ? 'is-mine' : ''} ${missing ? 'is-missing' : ''} ${off ? 'is-off' : ''}"
                    @click=${onClick} title=${tip || name}>
                    ${this._rfGlyph(n)}
                    <span class="nb-tile-name">${name}</span>
                    ${plan ? html`<span class="nb-plan" aria-label=${needs}>${this._planName(plan)}</span>`
                        : locked ? html`<iconify-icon class="nb-badge" icon="ri:lock-2-fill" aria-label=${locked}></iconify-icon>` : nothing}
                    ${missing ? html`<iconify-icon class="nb-badge is-warn" icon="ri:error-warning-fill" aria-label=${t.missing}></iconify-icon>` : nothing}
                </button>
                ${onRemove ? html`
                    <button type="button" class="nb-remove" title=${removeLabel} aria-label=${removeLabel} ?disabled=${this._busy}
                        @click=${onRemove}><iconify-icon icon="ri:close-line"></iconify-icon></button>` : nothing}
            </li>`;
    }

    // A switch — the checkbox stays in the page for keyboard and screen readers, the track draws it.
    _rfSwitch(checked, label, onChange, { small = false, text = '' } = {}) {
        return html`
            <label class="nb-switch ${small ? 'is-sm' : ''}" title=${label}>
                <input type="checkbox" role="switch" aria-label=${label} .checked=${checked} ?disabled=${this._busy}
                    @change=${(e) => onChange(e.target.checked)} />
                <span class="nb-track" aria-hidden="true"></span>${text ? html`<span>${text}</span>` : nothing}
            </label>`;
    }

    _rbList(t) {
        const flow = this._flow;
        const q = fold(this._query.trim());
        const hit = (n) => !q || fold(`${titleOf(n)} ${n.tooltip ?? ''} ${n.description ?? ''} ${n.id}`).includes(q);
        const mine = this._entries
            .map((entry) => ({ entry, node: flow?.nodes.find((n) => n.id === entry.id) ?? null, base: this._nodeOf(entry.base) }))
            .filter(({ node, base }) => hit(node ?? base ?? { id: '' }));
        const sections = this._sections()
            .map((s) => ({ ...s, shown: s.nodes.filter((i) => hit(i.node)) }))
            .filter((s) => s.shown.length);
        const nothingFound = q && !mine.length && !sections.length;
        const lockedCopy = (entry, base) => (base && this._ctl && !this._ctl.canUse(entry.base) ? base.plans?.[0] ?? '' : null);
        return html`
            <div class="nb-bar">
                <label class="nb-search">
                    <iconify-icon icon="ri:search-line"></iconify-icon>
                    <input type="search" .value=${this._query} placeholder=${t.search} aria-label=${t.search}
                        @input=${(e) => { this._query = e.target.value; }} />
                </label>
            </div>
            <div class="nb-scroll">
                ${nothingFound ? html`<p class="nb-empty"><iconify-icon icon="ri:search-eye-line"></iconify-icon>${t.none}</p>` : nothing}
                ${q && !mine.length ? nothing : html`
                    <section class="nb-section">
                        <h3 class="nb-h">${t.mine}${mine.length ? html`<span class="nb-count">${mine.length}</span>
                            <button type="button" class="nb-link" aria-pressed=${this._editing ? 'true' : 'false'}
                                @click=${() => { this._editing = !this._editing; }}>${this._editing ? t.done : t.editMine}</button>` : nothing}</h3>
                        ${mine.length ? html`
                            <ul class="nb-grid ${this._editing ? 'is-editing' : ''}">
                                ${mine.map(({ entry, node, base }) => {
                                    const shown = node ?? this._missingNode(entry, base);
                                    return this._rfTile(shown, () => this._edit(entry), {
                                        mine: true, missing: !base, plan: lockedCopy(entry, base),
                                        onRemove: this._editing ? () => this._drop(entry, titleOf(shown)) : null,
                                    });
                                })}
                            </ul>` : html`<p class="nb-first"><iconify-icon icon="ri:sparkling-2-line"></iconify-icon>${t.firstHint}</p>`}
                    </section>`}
                ${sections.map((s) => this._rbSection(s, t))}
            </div>`;
    }

    _rbSection(s, t) {
        const usable = s.nodes.filter((i) => !i.locked);
        const on = usable.filter((i) => i.on).length;
        return html`
            <section class="nb-section">
                <div class="nb-group">
                    ${s.icon ? html`<iconify-icon icon=${s.icon}></iconify-icon>` : nothing}
                    <span class="nb-group-name">${s.title}</span>
                    <span class="nb-count">${this._ctl ? `${on}/${s.nodes.length}` : s.nodes.length}</span>
                    ${this._ctl && !s.pinned && usable.length ? this._rfSwitch(on === usable.length, fill(t.setToggle, { title: s.title }),
                        (checked) => this._toggle(s.id, checked, s.title), { small: true }) : nothing}
                </div>
                <ul class="nb-grid">
                    ${s.shown.map((i) => this._rfTile(i.node, () => this._start(i.node, null, this._ctl ? { ...i, pinned: s.pinned } : null), {
                        off: !i.on, plan: i.locked ? i.plan ?? '' : null,
                    }))}
                </ul>
            </section>`;
    }

    // A node of yours not on the canvas (its template is gone): its saved name only — the row itself is not trusted.
    _missingNode(entry, base) {
        const title = typeof entry.patch.title === 'string' ? entry.patch.title.slice(0, 80) : '';
        return { id: entry.id, title: title || titleOf(base) || entry.base };
    }

    _rfField(f, t, groups) {
        const label = t.labels[f.key] ?? f.key.replace(/^props\./, '');
        const value = this._values[f.key];
        const id = `nb-${f.key.replace(/\W/g, '-')}`;
        const cls = `nb-field ${HALF.has(f.key) ? 'is-half' : ''} ${f.key.startsWith('props.') ? 'is-prop' : ''}`;
        const set = (e) => this._set(f.key, e.target.value);
        switch (f.type) {
            case 'boolean':
                return this._rfSwitch(Boolean(value), label, (checked) => this._set(f.key, checked), { text: label });
            case 'select':
                return html`
                    <label class=${cls} for=${id}><span>${label}</span>
                        <select id=${id} @change=${set}>
                            ${f.options.map((o) => html`<option value=${o} ?selected=${o === value}>${o ? groups.get(o) ?? o : t.noGroup}</option>`)}
                        </select>
                    </label>`;
            case 'textarea':
                return html`
                    <label class=${cls} for=${id}><span>${label}</span>
                        <textarea id=${id} rows="3" .value=${value ?? ''} placeholder=${f.key === 'description' ? t.hints.description : nothing} @input=${set}></textarea>
                    </label>`;
            default: {
                const hint = f.type === 'position' ? t.hints.position : f.type === 'icon' ? t.hints.icon : f.type === 'url' ? 'https://…' : nothing;
                return html`
                    <label class=${cls} for=${id}><span>${label}</span>
                        <input id=${id} type=${f.type === 'number' ? 'number' : f.type === 'url' ? 'url' : 'text'}
                            .value=${String(value ?? '')} maxlength=${f.max ?? nothing} placeholder=${hint}
                            autocomplete="off" spellcheck=${f.type === 'text' ? 'true' : 'false'} @input=${set} />
                    </label>`;
            }
        }
    }

    // The preset node itself: on the canvas or not — or the plan it needs. (A copy of yours you remove instead.)
    _rbPresence(item, t) {
        if (item.locked) {
            return html`
                <div class="nb-card is-row is-plan">
                    <iconify-icon icon="ri:vip-crown-2-line"></iconify-icon>
                    <span class="nb-row-text"><b>${fill(t.needPlan, { plan: this._planName(item.plan) })}</b><small>${t.planText}</small></span>
                    <button type="button" class="nb-btn is-primary is-sm" @click=${this._seePlans}>${t.seePlans}</button>
                </div>`;
        }
        return html`
            <div class="nb-card is-row">
                <iconify-icon icon=${item.on ? 'ri:checkbox-circle-line' : 'ri:add-circle-line'}></iconify-icon>
                <span class="nb-row-text"><b>${t.onCanvas}</b>${item.pinned ? html`<small>${t.always}</small>` : nothing}</span>
                ${item.pinned ? nothing : this._rfSwitch(item.on, t.onCanvas, (on) => this._toggle(item.node.id, on, titleOf(item.node)))}
            </div>`;
    }

    _rbForm(t) {
        const { base, entry, item } = this._pick;
        const groups = this._groups();
        const fields = editableFields(base, groups);
        const v = this._values;
        const blocked = !entry && Boolean(item?.locked); // a plan they don't have: nothing to copy either
        const sections = [
            ['look', fields.filter((f) => LOOK.has(f.key))],
            ['place', fields.filter((f) => PLACE.has(f.key))],
            ['panel', fields.filter((f) => !LOOK.has(f.key) && !PLACE.has(f.key))],
        ].filter(([, list]) => list.length);
        const preview = { ...base, icon: v.icon, initials: v.initials, title: v.title };
        return html`
            <form class="nb-form" @submit=${this._save}>
                <header class="nb-head">
                    <button type="button" class="nb-icon" title=${t.back} aria-label=${t.back} @click=${this._back}>
                        <iconify-icon icon="ri:arrow-left-s-line"></iconify-icon>
                    </button>
                    ${this._rfGlyph(preview, 'is-lg')}
                    <span class="nb-head-text">
                        <b>${v.title || titleOf(base)}</b>
                        <small>${v.tooltip || fill(t.from, { base: titleOf(base) })}</small>
                    </span>
                    ${entry ? html`
                        <button type="button" class="nb-icon is-danger" title=${t.remove} aria-label=${t.remove} ?disabled=${this._busy}
                            @click=${() => this._remove(entry)}><iconify-icon icon="ri:delete-bin-6-line"></iconify-icon></button>` : nothing}
                </header>
                <div class="nb-scroll">
                    ${item ? this._rbPresence(item, t) : nothing}
                    ${blocked ? nothing : html`
                        ${item ? html`<h3 class="nb-h is-top">${t.yourCopy}</h3>` : nothing}
                        ${sections.map(([key, list]) => html`
                            <fieldset class="nb-card">
                                <legend>${t.sections[key]}</legend>
                                ${list.map((f) => this._rfField(f, t, groups))}
                            </fieldset>`)}`}
                </div>
                ${blocked ? nothing : html`
                    <footer class="nb-foot">
                        <button type="button" class="nb-btn" @click=${this._back}>${t.cancel}</button>
                        <button type="submit" class="nb-btn is-primary" ?disabled=${this._busy}>
                            ${this._busy ? html`<span class="nb-spin" aria-hidden="true"></span>` : html`<iconify-icon icon=${entry ? 'ri:check-line' : 'ri:add-line'}></iconify-icon>`}
                            ${entry ? t.save : this._ctl ? t.copy : t.add}
                        </button>
                    </footer>`}
            </form>`;
    }

    render() {
        const t = this._txt;
        return html`
            <div class="nb">
                ${!this._ready ? html`
                    <div class="nb-scroll" aria-busy="true"><ul class="nb-grid is-skeleton">${SKELETON.map(() => html`<li><span class="nb-tile"></span></li>`)}</ul></div>`
                    : this._pick ? this._rbForm(t) : this._rbList(t)}
                ${this._notice ? html`
                    <p class="nb-toast is-${this._notice.tone}" role=${this._notice.tone === 'error' ? 'alert' : 'status'}>
                        <iconify-icon icon=${this._notice.tone === 'error' ? 'ri:error-warning-line' : 'ri:checkbox-circle-line'}></iconify-icon>
                        <span>${this._notice.text}</span>
                        ${this._notice.undo ? html`
                            <button type="button" class="nb-toast-btn" ?disabled=${this._busy} @click=${() => this._undo(this._notice.undo)}>${t.undo}</button>` : nothing}
                        ${this._notice.tone === 'error' ? html`
                            <button type="button" class="nb-icon is-sm" aria-label=${t.cancel} @click=${() => { this._notice = null; }}>
                                <iconify-icon icon="ri:close-line"></iconify-icon></button>` : nothing}
                    </p>` : nothing}
            </div>`;
    }
}

if (!customElements.get('svc-node-builder')) customElements.define('svc-node-builder', SvcNodeBuilder);

export default SvcNodeBuilder;
