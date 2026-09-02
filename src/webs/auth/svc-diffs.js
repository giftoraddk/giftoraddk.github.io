import { LitElement, html } from 'lit';
import 'iconify-icon';
import css from './styles/svc-diffs.css?inline';
import { auth } from '@/webs/auth/tools/service.js';
import { createService } from '@/services/crud.js';
import { buildNested, injectStyles, txtLingo } from '@/services/helper.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripHtml(raw) {
    if (!raw) return '';
    return raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function wordDiff(a, b) {
    const tokA = (a || '').match(/\S+|\s+/g) || [];
    const tokB = (b || '').match(/\S+|\s+/g) || [];
    if (tokA.length > 300 || tokB.length > 300) {
        return [...tokA.map(v => ({ v, t: 'del' })), ...tokB.map(v => ({ v, t: 'add' }))];
    }
    const m = tokA.length, n = tokB.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = tokA[i - 1] === tokB[j - 1]
                ? dp[i - 1][j - 1] + 1
                : Math.max(dp[i - 1][j], dp[i][j - 1]);
    const res = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && tokA[i - 1] === tokB[j - 1]) {
            res.unshift({ v: tokA[i - 1], t: 'eq' }); i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            res.unshift({ v: tokB[j - 1], t: 'add' }); j--;
        } else {
            res.unshift({ v: tokA[i - 1], t: 'del' }); i--;
        }
    }
    return res;
}

function timeAgo(val, lang = 'vi') {
    let d;
    if (!val) return '—';
    if (val instanceof Date) d = val;
    else if (val?.toDate) d = val.toDate();
    else if (val?.seconds) d = new Date(val.seconds * 1000);
    else d = new Date(val);
    const s = Math.round((Date.now() - d.getTime()) / 1000);
    if (s < 60)    return lang === 'vi' ? 'vừa xong' : 'just now';
    if (s < 3600)  return lang === 'vi' ? `${Math.floor(s / 60)} phút trước`   : `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return lang === 'vi' ? `${Math.floor(s / 3600)} giờ trước`  : `${Math.floor(s / 3600)}h ago`;
    return lang === 'vi' ? `${Math.floor(s / 86400)} ngày trước` : `${Math.floor(s / 86400)}d ago`;
}

function toDate(val) {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (val?.toDate) return val.toDate();
    if (val?.seconds) return new Date(val.seconds * 1000);
    return new Date(val);
}

function initial(name) {
    return (name || '?').trim().charAt(0).toUpperCase();
}

// ── Config ────────────────────────────────────────────────────────────────────

const TRACKED = ['title', 'description', 'content', 'tags', 'status', 'pics'];

const FL = {
    vi: { title: 'Tiêu đề', description: 'Mô tả', content: 'Nội dung', tags: 'Tags', status: 'Trạng thái', pics: 'Ảnh', meta: 'Meta' },
    en: { title: 'Title', description: 'Description', content: 'Content', tags: 'Tags', status: 'Status', pics: 'Images', meta: 'Meta' },
};

const ACTION = {
    created:     { color: 'var(--color-primary,#2ebd85)',   bg: 'color-mix(in oklab,var(--color-primary,#2ebd85) 14%,transparent)',   label: { vi: 'Tạo mới',    en: 'Created'     } },
    updated:     { color: 'var(--color-info,#3b82f6)',      bg: 'color-mix(in oklab,var(--color-info,#3b82f6) 14%,transparent)',      label: { vi: 'Chỉnh sửa', en: 'Updated'     } },
    published:   { color: 'var(--color-success,#22c55e)',   bg: 'color-mix(in oklab,var(--color-success,#22c55e) 14%,transparent)',   label: { vi: 'Đã đăng',   en: 'Published'   } },
    unpublished: { color: 'var(--color-warning,#f59e0b)',   bg: 'color-mix(in oklab,var(--color-warning,#f59e0b) 14%,transparent)',   label: { vi: 'Ẩn bài',    en: 'Unpublished' } },
    archived:    { color: 'var(--color-neutral,#6b7280)',   bg: 'color-mix(in oklab,var(--color-neutral,#6b7280) 14%,transparent)',   label: { vi: 'Lưu trữ',   en: 'Archived'    } },
    restored:    { color: 'var(--color-secondary,#a78bfa)', bg: 'color-mix(in oklab,var(--color-secondary,#a78bfa) 14%,transparent)', label: { vi: 'Khôi phục', en: 'Restored'    } },
};

const TXT_STD = {
    vi: {
        history: 'Lịch sử chỉnh sửa', loading: 'Đang tải…', noHistory: 'Chưa có lịch sử',
        details: 'Chi tiết', unknown: 'Không rõ', noChanges: 'Không có thay đổi',
        openHistory: 'Lịch sử', changes: 'Thay đổi', selectHint: 'Chọn một phiên bản để xem chi tiết',
        firstRev: 'Phiên bản đầu tiên — chưa có dữ liệu trước đó', by: 'bởi',
    },
    en: {
        history: 'Edit History', loading: 'Loading…', noHistory: 'No history yet',
        details: 'Details', unknown: 'Unknown', noChanges: 'No changes',
        openHistory: 'History', changes: 'Changes', selectHint: 'Select a revision to view diff',
        firstRev: 'First revision — no previous data', by: 'by',
    },
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * <svc-diffs>
 *
 * Fullscreen revision history viewer — 2-column layout (list | diff).
 * Attaches to a svc-admin via `for` to auto-capture revisions on each save.
 * Reads current user from db_auth (IndexDB via auth service).
 *
 * Usage:
 *   <svc-diffs for="admin-posts" dataTable="revisions" lang="vi"></svc-diffs>
 *
 * Public API:
 *   el.open(recordId)   open panel for a record
 *   el.close()          close panel
 */
export class SvcDiffs extends LitElement {
    createRenderRoot() { return this; }

    static properties = {
        recordId:      { type: String, attribute: 'record-id' },
        for:           { type: String },
        dataTable:     { type: String },
        relation:      { type: String },
        ui:            { type: String },
        theme:         { type: String },
        lang:          { type: String },
        txt:           { type: Object }, // override i18n cho TXT_STD — xem txtLingo() trong helper.js
        _revisions:    { state: true },
        _loading:      { state: true },
        _error:        { state: true },
        _open:         { state: true },
        _selected:     { state: true },  // index into _revisions (desc), null = none
        _activeId:     { state: true },
        _currentUser:  { state: true },
    };

    constructor() {
        super();
        this.recordId     = '';
        this.for          = '';
        this.dataTable    = 'revisions';
        this.relation     = '';
        this.ui           = 'spatial';
        this.theme        = '';
        this.lang         = 'vi';
        this.txt          = null;
        this._revisions   = [];
        this._loading     = false;
        this._error       = '';
        this._open        = false;
        this._selected    = null;
        this._activeId    = '';
        this._currentUser = null;
        this._onSave      = this._onSave.bind(this);
    }

    connectedCallback() {
        super.connectedCallback();
        injectStyles('svc-diffs-styles', css);
        auth.get().then(u => { this._currentUser = u; });
        document.addEventListener('wt-save', this._onSave);
        if (this.recordId) { this._activeId = this.recordId; this._dcLoad(this.recordId); }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('wt-save', this._onSave);
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    open(recordId) {
        if (recordId) this._activeId = recordId;
        this._open     = true;
        this._selected = null;
        if (this._activeId) this._dcLoad(this._activeId);
    }

    close() { this._open = false; }

    // ── Data Core ──────────────────────────────────────────────────────────────

    async _dcLoad(recordId) {
        if (!recordId) return;
        this._loading  = true;
        this._error    = '';
        this._selected = null;
        try {
            const rows = await this._svc.findAll({ filters: { record_id: recordId } });
            this._revisions = rows.sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
            if (this._revisions.length) this._selected = 0;
        } catch (err) {
            this._error = err.message;
        }
        this._loading = false;
    }

    // ── Intercept wt-save → capture revision ──────────────────────────────────

    async _onSave(e) {
        const adminEl = this.for ? document.getElementById(this.for) : null;
        if (adminEl && !e.composedPath().includes(adminEl)) return;
        const { id, data } = e.detail ?? {};
        if (!id || !data) return;
        this._activeId = id;
        await this._dfCapture(id, data);
    }

    /**
     * Flow capture revision: (recordId, flatData vừa save) -> ghi 1 revision doc mới
     */
    async _dfCapture(recordId, flatData) {
        try {
            // [1] CHECK: Đọc revision gần nhất của record này để làm parent (không có = lần đầu)
            const existing = await this._svc.findAll({ filters: { record_id: recordId } });
            const sorted   = existing
                .map(d => ({ _docId: d.id, ...d }))
                .sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
            const last       = sorted[0] ?? null;
            const parentSnap = last?.snapshot ?? {};
            const parentId   = last?._docId ?? null;
            const version    = (last?.version ?? 0) + 1;

            // [2] PROCESS: Build snapshot mới + tính field đã đổi + diff chi tiết so với parent
            const snap    = this._buildSnapshot(flatData);
            const changed = TRACKED.filter(f => snap[f] !== parentSnap[f]);
            if (JSON.stringify(snap.meta) !== JSON.stringify(parentSnap.meta)) changed.push('meta');
            const diff = {};
            for (const f of ['title', 'tags', 'status', 'pics']) {
                if (parentId && snap[f] !== parentSnap[f])
                    diff[f] = { from: parentSnap[f] ?? '', to: snap[f] ?? '' };
            }
            const user      = this._currentUser || await auth.get();
            const user_name = user?.display_name || user?.username || user?.email || '';
            const user_id   = user?.id || '';

            // [3] EXECUTE: Ghi revision doc mới, tải lại danh sách nếu panel đang mở đúng record này
            await this._svc.create({
                record_id:  recordId,
                relation:   this.relation || '',
                parent_id:  parentId,
                version,
                action:     this._detectAction(parentSnap.status, snap.status, parentId),
                summary:    '',
                user_id,
                user_name,
                snapshot:   snap,
                changed:    changed.join('|'),
                diff,
                created_at: await this._svc.now(),
            });
            if (this._open && this._activeId === recordId) this._dcLoad(recordId);
        } catch (err) {
            // [4] RETURN: Capture revision là best-effort — lỗi không được chặn luồng save chính
            console.error('[svc-diffs] capture failed:', err.message);
        }
    }

    _buildSnapshot(flat) {
        const n = buildNested(flat);
        return {
            title:       n.title       ?? '',
            description: n.description ?? '',
            content:     n.content     ?? '',
            tags:        n.tags        ?? '',
            status:      n.status      ?? '',
            pics:        n.pics        ?? '',
            meta:    typeof n.meta === 'string'
                ? (() => { try { return JSON.parse(n.meta); } catch { return {}; } })()
                : (n.meta ?? {}),
        };
    }

    _detectAction(oldStatus, newStatus, parentId) {
        if (!parentId)             return 'created';
        if (oldStatus === newStatus) return 'updated';
        if (newStatus === 'active')   return 'published';
        if (newStatus === 'archived') return 'archived';
        return 'unpublished';
    }

    // ── Computed ───────────────────────────────────────────────────────────────

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }
    get _svc() { return createService((this.dataTable || 'revisions').split('~')[0]); }
    get _fl()  { return FL[this.lang]  ?? FL.vi; }
    get _revB() { return this._selected !== null ? this._revisions[this._selected]     ?? null : null; }
    get _revA() { return this._selected !== null ? this._revisions[this._selected + 1] ?? null : null; }

    // ── Render ─────────────────────────────────────────────────────────────────

    render() {
        if (!this._open) return html``;
        return html`
            <div class="sdiff-screen${this.ui === 'spatial' ? ' sdiff-spatial' : ''}">
                ${this._rbHeader()}
                <div class="sdiff-body-row">
                    <div class="sdiff-left">${this._rbLeft()}</div>
                    <div class="sdiff-right">${this._rbRight()}</div>
                </div>
            </div>
        `;
    }

    _rbHeader() {
        return html`
            <div class="sdiff-header">
                <iconify-icon icon="ri:history-line" style="opacity:.6"></iconify-icon>
                <span class="sdiff-title">${this._txt.history}</span>
                ${this._revisions.length ? html`
                    <span class="sdiff-count">${this._revisions.length}</span>
                ` : ''}
                <span style="flex:1"></span>
                <button class="sdiff-close-btn" @click=${() => { this._open = false; }}>
                    <iconify-icon icon="ri:close-line"></iconify-icon>
                </button>
            </div>
        `;
    }

    // ── Left panel ─────────────────────────────────────────────────────────────

    _rbLeft() {
        const t = this._txt;
        if (this._loading) return html`<div class="sdiff-state">${t.loading}</div>`;
        if (this._error)   return html`<div class="sdiff-state sdiff-err">${this._error}</div>`;
        if (!this._revisions.length) return html`<div class="sdiff-state">${t.noHistory}</div>`;

        return html`
            <div class="sdiff-left-hdr">
                <iconify-icon icon="ri:git-commit-line"></iconify-icon>
                ${t.changes}
                <span class="sdiff-left-count">${this._revisions.length}</span>
            </div>
            <div class="sdiff-items">
                ${this._revisions.map((rev, i) => this._rfLeftItem(rev, i))}
            </div>
        `;
    }

    _rfLeftItem(rev, i) {
        const isActive = this._selected === i;
        const info     = ACTION[rev.action] ?? ACTION.updated;
        const fields   = (rev.changed || '').split('|').filter(Boolean);
        const name     = rev.user_name || rev.user_id?.slice(0, 12) || this._txt.unknown;
        const ts       = toDate(rev.created_at);

        return html`
            <div
                class="sdiff-item${isActive ? ' sdiff-item-active' : ''}"
                style="${isActive ? `border-left-color:${info.color}` : ''}"
                @click=${() => { this._selected = i; }}
            >
                <div class="sdiff-avatar" style="background:${info.bg};color:${info.color}">
                    ${initial(name)}
                </div>
                <div class="sdiff-item-info">
                    <div class="sdiff-item-top">
                        <span class="sdiff-item-name">${name}</span>
                    </div>
                    <div class="sdiff-item-time">${timeAgo(ts, this.lang)}</div>
                    <div class="sdiff-item-meta">
                        <span class="sdiff-badge" style="background:${info.bg};color:${info.color};border-color:${info.color}">
                            ${info.label[this.lang] ?? info.label.vi}
                        </span>
                        <span class="sdiff-ver">v${rev.version}</span>
                    </div>
                    ${fields.length ? html`
                        <div class="sdiff-item-fields">
                            ${fields.slice(0, 4).map(f => html`
                                <span class="sdiff-ftag">${this._fl[f] ?? f}</span>
                            `)}
                            ${fields.length > 4 ? html`<span class="sdiff-ftag">+${fields.length - 4}</span>` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // ── Right panel ────────────────────────────────────────────────────────────

    _rbRight() {
        const t = this._txt;
        const revB = this._revB;
        const revA = this._revA;

        if (!revB) return html`
            <div class="sdiff-right-empty">
                <iconify-icon icon="ri:git-diff-line"></iconify-icon>
                <p>${t.selectHint}</p>
            </div>
        `;

        const info    = ACTION[revB.action] ?? ACTION.updated;
        const snapA   = revA?.snapshot ?? {};
        const snapB   = revB.snapshot  ?? {};
        const changed = (revB.changed || '').split('|').filter(Boolean);
        const tsB     = toDate(revB.created_at);
        const nameB   = revB.user_name || revB.user_id?.slice(0, 12) || t.unknown;

        return html`
            <div class="sdiff-diff-header">
                ${revA ? html`
                    <span class="sdiff-diff-range">v${revA.version} → v${revB.version}</span>
                ` : html`
                    <span class="sdiff-diff-range">v${revB.version}</span>
                `}
                <span class="sdiff-badge" style="background:${info.bg};color:${info.color};border-color:${info.color}">
                    ${info.label[this.lang] ?? info.label.vi}
                </span>
                <span class="sdiff-diff-meta">
                    ${t.by} <strong>${nameB}</strong>
                </span>
                ${tsB ? html`
                    <span class="sdiff-diff-time">${tsB.toLocaleString(this.lang === 'vi' ? 'vi-VN' : 'en-US')}</span>
                ` : ''}
            </div>

            ${!revA ? html`
                <div class="sdiff-state" style="text-align:left;padding:1rem 1.5rem">
                    ${t.firstRev}
                </div>
            ` : ''}

            ${revA && !changed.length ? html`
                <div class="sdiff-state">${t.noChanges}</div>
            ` : ''}

            ${revA && changed.length ? html`
                <div class="sdiff-diff-pane-headers">
                    <div class="sdiff-ph sdiff-ph-old">
                        <iconify-icon icon="ri:arrow-left-line"></iconify-icon>
                        v${revA.version}
                        <span class="sdiff-ph-meta">${timeAgo(revA.created_at, this.lang)}</span>
                    </div>
                    <div class="sdiff-ph sdiff-ph-new">
                        <iconify-icon icon="ri:arrow-right-line"></iconify-icon>
                        v${revB.version}
                        <span class="sdiff-ph-meta">${timeAgo(revB.created_at, this.lang)}</span>
                    </div>
                </div>
                <div class="sdiff-diff-body">
                    ${changed.map(f => this._rfFieldDiff(f, snapA, snapB))}
                </div>
            ` : ''}
        `;
    }

    _rfFieldDiff(field, snapA, snapB) {
        const label = this._fl[field] ?? field;
        const valA  = field === 'meta' ? snapA.meta : (snapA[field] ?? '');
        const valB  = field === 'meta' ? snapB.meta : (snapB[field] ?? '');

        if (field === 'content' || field === 'description') {
            const tokens = wordDiff(stripHtml(valA), stripHtml(valB));
            return html`
                <div class="sdiff-field-block">
                    <div class="sdiff-fl">${label}</div>
                    <div class="sdiff-2col">
                        <div class="sdiff-col sdiff-col-old">
                            ${tokens.map(tok =>
                                tok.t === 'del' ? html`<mark class="sdiff-del">${tok.v}</mark>` :
                                tok.t === 'eq'  ? html`<span>${tok.v}</span>` : ''
                            )}
                        </div>
                        <div class="sdiff-col sdiff-col-new">
                            ${tokens.map(tok =>
                                tok.t === 'add' ? html`<mark class="sdiff-add">${tok.v}</mark>` :
                                tok.t === 'eq'  ? html`<span>${tok.v}</span>` : ''
                            )}
                        </div>
                    </div>
                </div>
            `;
        }

        const dispA = field === 'meta' ? JSON.stringify(valA, null, 2) : String(valA || '—');
        const dispB = field === 'meta' ? JSON.stringify(valB, null, 2) : String(valB || '—');

        return html`
            <div class="sdiff-field-block">
                <div class="sdiff-fl">${label}</div>
                <div class="sdiff-2col">
                    <div class="sdiff-col sdiff-col-old">
                        <span class="sdiff-scalar-old">${dispA}</span>
                    </div>
                    <div class="sdiff-col sdiff-col-new">
                        <span class="sdiff-scalar-new">${dispB}</span>
                    </div>
                </div>
            </div>
        `;
    }
}

if (!customElements.get('svc-diffs')) customElements.define('svc-diffs', SvcDiffs);
export default SvcDiffs;
