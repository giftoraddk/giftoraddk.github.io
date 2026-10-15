// src/packages/auth/app/svc-diffs.js
//
// <svc-diffs> — lịch sử chỉnh sửa của 1 record, màn full: danh sách phiên bản | chi tiết thay đổi.
// Chủ nhân (svc-resources / svc-records) gọi thẳng API — không nghe `wt-save` nữa, vì event đó bắn TRƯỚC khi ghi DB
// (lưu lỗi vẫn ra revision, tạo mới có id null nên chưa bao giờ có bản "Tạo mới"):
//
//   el.capture(recordId, record, action?)  sau khi ghi DB thành công — record = bản ghi đầy đủ vừa lưu
//   el.open(recordId, title?) / el.close()
//   @diffs-restore { id, version, snapshot }  người dùng xác nhận khôi phục — chủ nhân ghi DB rồi capture 'restored'
//
//   <svc-diffs dataTable="revisions" relation="posts" .labels=${{ title: 'Tiêu đề' }} lang="vi"></svc-diffs>
//
// Revision doc (bảng `revisions`, doc store D1): { record_id, relation, parent_id, version, action, user_id,
// user_name, snapshot, changed: 'a|b', format, created_at }. format 2 = snapshot chứa MỌI field của record trừ cột
// hệ thống; bản cũ (không có format) chỉ có title/description/content/tags/status/pics/meta — so 2 bản khác format
// thì chỉ so field cả 2 cùng có, để bản đầu tiên sau nâng cấp không báo "đổi" mọi field mới được theo dõi.
//
// Mobile first, Shadow DOM: màn hẹp là 2 bước (danh sách → chi tiết, có nút quay lại), từ 760px chia 2 cột —
// container query trên chính màn full, viewport không nói lên gì (nó còn nằm trong panel svc-node).
// Khôi phục cần capability `manage_versions` trên bảng `relation` (REVIEW / MANAGE — hook/AUTH_V2.rst).

import { LitElement, html, nothing, unsafeCSS } from 'lit';
import 'iconify-icon';
import css from '../css/svc-diffs.css?inline';
import { auth } from '../service/service.js';
import { can } from '../tool/roles.js';
import { createService } from '@/services/core/crud.js';
import { txtLingo } from '@/services/tools/util.js';

// ── Config ────────────────────────────────────────────────────────────────────

const FORMAT      = 2;
const SYSTEM      = new Set(['id', 'created_at', 'updated_at', 'deleted_at', 'actors', 'index']);
const LIST_FIELDS = new Set(['tags', 'pics']);
const TEXT_FIELDS = new Set(['content', 'description']);
const LCS_MAX     = 1_000_000; // ô dp tối đa (m·n token ở giữa, sau khi cắt phần đầu/cuối giống nhau)
const EQ_KEEP     = 24;        // token giữ lại mỗi phía của 1 đoạn không đổi bị thu gọn (~12 từ)
const IMG_RE      = /\.(png|jpe?g|webp|gif|avif|svg)(\?|#|$)/i;

const _tone = (v) => ({ color: `var(${v})`, bg: `color-mix(in oklab, var(${v}) 14%, transparent)` });

const ACTION = {
    created:     { ..._tone('--color-primary'),   icon: 'ri:add-line',            label: { vi: 'Tạo mới',     en: 'Created'     } },
    updated:     { ..._tone('--color-info'),      icon: 'ri:edit-line',           label: { vi: 'Chỉnh sửa',   en: 'Updated'     } },
    submitted:   { ..._tone('--color-info'),      icon: 'ri:send-plane-line',     label: { vi: 'Gửi duyệt',   en: 'Submitted'   } },
    approved:    { ..._tone('--color-success'),   icon: 'ri:check-double-line',   label: { vi: 'Đã duyệt',    en: 'Approved'    } },
    rejected:    { ..._tone('--color-warning'),   icon: 'ri:arrow-go-back-line',  label: { vi: 'Trả về',      en: 'Rejected'    } },
    published:   { ..._tone('--color-success'),   icon: 'ri:eye-line',            label: { vi: 'Đã đăng',     en: 'Published'   } },
    unpublished: { ..._tone('--color-warning'),   icon: 'ri:eye-off-line',        label: { vi: 'Ẩn bài',      en: 'Unpublished' } },
    archived:    { ..._tone('--color-neutral'),   icon: 'ri:archive-line',        label: { vi: 'Lưu trữ',     en: 'Archived'    } },
    deleted:     { ..._tone('--color-error'),     icon: 'ri:delete-bin-line',     label: { vi: 'Đã xoá',      en: 'Deleted'     } },
    restored:    { ..._tone('--color-secondary'), icon: 'ri:history-line',        label: { vi: 'Khôi phục',   en: 'Restored'    } },
};

// Nhãn mặc định khi chủ nhân không truyền `labels` (lấy từ schema của bảng)
const FL = {
    vi: { title: 'Tiêu đề', description: 'Mô tả', content: 'Nội dung', tags: 'Tags', status: 'Trạng thái', pics: 'Ảnh', meta: 'Meta' },
    en: { title: 'Title', description: 'Description', content: 'Content', tags: 'Tags', status: 'Status', pics: 'Images', meta: 'Meta' },
};

const TXT_STD = {
    vi: {
        history: 'Lịch sử chỉnh sửa', versions: 'phiên bản', loading: 'Đang tải…', noHistory: 'Chưa có lịch sử',
        retry: 'Thử lại', close: 'Đóng', back: 'Danh sách', unknown: 'Không rõ', by: 'bởi',
        noChanges: 'Không có thay đổi', firstRev: 'Phiên bản đầu tiên — chưa có bản trước để so sánh',
        isCurrent: 'Đây là phiên bản hiện tại', selectHint: 'Chọn một phiên bản để xem thay đổi',
        vsPrev: 'So với bản trước', vsCurrent: 'So với hiện tại', current: 'hiện tại',
        today: 'Hôm nay', yesterday: 'Hôm qua', unchanged: 'không đổi', words: 'từ không đổi',
        restore: 'Khôi phục phiên bản này', restoreAsk: 'Khôi phục v{v}? Nội dung hiện tại được giữ lại trong lịch sử.',
        confirm: 'Khôi phục', cancel: 'Huỷ', noRestore: 'Cần quyền Duyệt hoặc Quản trị để khôi phục',
    },
    en: {
        history: 'Edit history', versions: 'versions', loading: 'Loading…', noHistory: 'No history yet',
        retry: 'Retry', close: 'Close', back: 'Versions', unknown: 'Unknown', by: 'by',
        noChanges: 'No changes', firstRev: 'First version — nothing earlier to compare with',
        isCurrent: 'This is the current version', selectHint: 'Pick a version to see what changed',
        vsPrev: 'vs. previous', vsCurrent: 'vs. current', current: 'current',
        today: 'Today', yesterday: 'Yesterday', unchanged: 'unchanged', words: 'unchanged words',
        restore: 'Restore this version', restoreAsk: 'Restore v{v}? The current content stays in the history.',
        confirm: 'Restore', cancel: 'Cancel', noRestore: 'Needs Review or Manage access to restore',
    },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const same  = (a, b) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '');
const empty = (v) => v === undefined || v === null || v === '';
const fmt   = (v) => empty(v) ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v);

function parseJson(s) {
    try { return JSON.parse(s); } catch { return {}; }
}

function stripHtml(raw) {
    return String(raw ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function toDate(val) {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (val?.toDate) return val.toDate();
    if (val?.seconds) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? null : d;
}

function timeAgo(val, lang) {
    const d = toDate(val);
    if (!d) return '—';
    const s = Math.round((d.getTime() - Date.now()) / 1000);
    const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
    for (const [unit, sec] of [['day', 86400], ['hour', 3600], ['minute', 60]]) {
        if (Math.abs(s) >= sec) return rtf.format(Math.round(s / sec), unit);
    }
    return rtf.format(0, 'minute');
}

/** Mọi field của record trừ cột hệ thống — `meta` dạng chuỗi JSON (bảng cũ) được parse. */
function snapshotOf(record) {
    const snap = {};
    for (const [k, v] of Object.entries(record ?? {})) {
        if (SYSTEM.has(k) || v === undefined) continue;
        snap[k] = k === 'meta' && typeof v === 'string' ? parseJson(v) : v;
    }
    return snap;
}

/** Field khác nhau giữa 2 snapshot — khác format thì chỉ xét field cả 2 cùng có (xem đầu file). */
function changedKeys(a, b, sameFormat) {
    const keys = sameFormat
        ? new Set([...Object.keys(a), ...Object.keys(b)])
        : Object.keys(a).filter(k => k in b);
    return [...keys].filter(k => !same(a[k], b[k]));
}

function flatten(v, prefix, out = {}) {
    if (isObj(v) && Object.keys(v).length) {
        for (const [k, x] of Object.entries(v)) flatten(x, `${prefix}.${k}`, out);
    } else {
        out[prefix] = v;
    }
    return out;
}

function kindOf(key, a, b) {
    if (isObj(a) || isObj(b)) return 'object';
    const s = `${a ?? ''}${b ?? ''}`;
    if (LIST_FIELDS.has(key) || (s.includes('|') && !/\s/.test(s))) return 'list';
    if (TEXT_FIELDS.has(key) || s.length > 80 || /\n|<[a-z][^>]*>/i.test(s)) return 'text';
    return 'scalar';
}

const tokens = (s) => s.match(/\S+|\s+/g) || [];

/**
 * Diff theo từ → [{ t: 'eq'|'del'|'add', v }] đã gộp đoạn liền nhau. Cắt phần đầu/cuối giống nhau trước (sửa 1 câu
 * trong bài dài chỉ còn LCS trên đoạn giữa), quá LCS_MAX ô thì phần giữa hiện "xoá hết + thêm hết".
 */
function wordDiff(a, b) {
    const A = tokens(a), B = tokens(b);
    let s = 0;
    while (s < A.length && s < B.length && A[s] === B[s]) s++;
    let e = 0;
    while (e < A.length - s && e < B.length - s && A[A.length - 1 - e] === B[B.length - 1 - e]) e++;
    const mA = A.slice(s, A.length - e), mB = B.slice(s, B.length - e);
    const m = mA.length, n = mB.length;
    const out = A.slice(0, s).map(v => ['eq', v]);

    if (m * n > LCS_MAX) {
        mA.forEach(v => out.push(['del', v]));
        mB.forEach(v => out.push(['add', v]));
    } else {
        const w = n + 1, dp = new Uint32Array((m + 1) * w); // dp[i][j] = LCS(mA[i..], mB[j..])
        for (let i = m - 1; i >= 0; i--) {
            for (let j = n - 1; j >= 0; j--) {
                dp[i * w + j] = mA[i] === mB[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
            }
        }
        let i = 0, j = 0;
        while (i < m && j < n) {
            if (mA[i] === mB[j]) { out.push(['eq', mA[i]]); i++; j++; }
            else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) out.push(['del', mA[i++]]);
            else out.push(['add', mB[j++]]);
        }
        while (i < m) out.push(['del', mA[i++]]);
        while (j < n) out.push(['add', mB[j++]]);
    }
    A.slice(A.length - e).forEach(v => out.push(['eq', v]));

    const segs = [];
    for (const [t, v] of out) {
        const last = segs[segs.length - 1];
        if (last?.t === t) last.v += v;
        else segs.push({ t, v });
    }
    return segs;
}

function actionOf(oldStatus, newStatus, hasParent) {
    if (!hasParent) return 'created';
    if (oldStatus === newStatus) return 'updated';
    if (newStatus === 'active')   return 'published';
    if (newStatus === 'pending')  return 'submitted';
    if (newStatus === 'approved') return 'approved';
    if (newStatus === 'archived') return 'archived';
    if (oldStatus === 'pending' && newStatus === 'draft') return 'rejected';
    if (oldStatus === 'active')   return 'unpublished';
    return 'updated';
}

// ── Component ─────────────────────────────────────────────────────────────────

export class SvcDiffs extends LitElement {
    static styles = unsafeCSS(css);

    static properties = {
        dataTable:  { type: String },
        relation:   { type: String },   // bảng của record — kiểm quyền khôi phục + ghi vào revision
        labels:     { attribute: false }, // { field | 'meta.x': label } — thường từ schema của bảng
        ui:         { type: String },
        theme:      { type: String },
        lang:       { type: String },
        txt:        { type: Object },
        _open:      { state: true },
        _title:     { state: true },
        _revisions: { state: true },
        _loading:   { state: true },
        _error:     { state: true },
        _selected:  { state: true }, // index trong _revisions (mới → cũ), null = chưa chọn
        _view:      { state: true }, // 'list' | 'detail' — chỉ có nghĩa ở màn hẹp
        _compare:   { state: true }, // 'prev' | 'current'
        _expanded:  { state: true }, // Set<field> đã mở các đoạn không đổi
        _confirm:   { state: true }, // đang hỏi xác nhận khôi phục
        _user:      { state: true },
    };

    constructor() {
        super();
        this.dataTable  = 'revisions';
        this.relation   = '';
        this.labels     = null;
        this.ui         = 'pastel';
        this.theme      = '';
        this.lang       = 'vi';
        this.txt        = null;
        this._open      = false;
        this._title     = '';
        this._revisions = [];
        this._loading   = false;
        this._error     = '';
        this._selected  = null;
        this._view      = 'list';
        this._compare   = 'prev';
        this._expanded  = new Set();
        this._confirm   = false;
        this._user      = null;
        this._activeId  = '';
        this._queue     = Promise.resolve(); // capture tuần tự — 2 lần lưu sát nhau không trùng version
        this._onKey     = this._onKey.bind(this);
    }

    // ==========================================
    // LIFECYCLE
    // ==========================================

    connectedCallback() {
        super.connectedCallback();
        auth.get().then(u => { this._user = u; });
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('keydown', this._onKey);
    }

    // ==========================================
    // PUBLIC API
    // ==========================================

    open(recordId, title = '') {
        if (!recordId) return;
        this._activeId = recordId;
        this._title    = title;
        this._open     = true;
        this._view     = 'list';
        this._compare  = 'prev';
        document.addEventListener('keydown', this._onKey);
        this._dcLoad();
    }

    close() {
        this._open = false;
        document.removeEventListener('keydown', this._onKey);
    }

    /** Ghi 1 revision cho `record` vừa lưu thành công. Best-effort: lỗi chỉ log, không chặn luồng lưu. */
    capture(recordId, record, action = '') {
        if (!recordId || !record) return this._queue;
        this._queue = this._queue.then(() => this._dfCapture(recordId, record, action));
        return this._queue;
    }

    // ==========================================
    // DATA CORE FUNCTIONS
    // ==========================================

    async _dcFetch(recordId) {
        const rows = await this._svc.findAll({ filters: { record_id: recordId } });
        return rows.sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
    }

    async _dcLoad() {
        const id = this._activeId;
        this._loading = true;
        this._error   = '';
        try {
            const revs = await this._dcFetch(id);
            if (id !== this._activeId) return; // đã mở record khác trong lúc tải
            this._revisions = revs;
            this._dhSelect(revs.length ? 0 : null, false);
        } catch (err) {
            this._error = err.message;
        } finally {
            this._loading = false;
        }
    }

    // ==========================================
    // DATA HEAD FUNCTIONS
    // ==========================================

    _onKey(e) {
        if (e.key !== 'Escape' || !this._open) return;
        if (this._confirm) this._confirm = false;
        else this.close();
    }

    _dhSelect(i, toDetail = true) {
        this._selected = i;
        this._expanded = new Set();
        this._confirm  = false;
        if (toDetail) this._view = 'detail';
    }

    _dhExpand(field) { this._expanded = new Set([...this._expanded, field]); }

    _dhRestore() {
        const rev = this._revisions[this._selected];
        if (!rev?.snapshot) return;
        this._confirm = false;
        this.dispatchEvent(new CustomEvent('diffs-restore', {
            detail: { id: this._activeId, version: rev.version, snapshot: rev.snapshot },
            bubbles: true, composed: true,
        }));
    }

    // ==========================================
    // DATA FOOTER FUNCTIONS
    // ==========================================

    /**
     * Flow capture revision: (recordId, bản ghi vừa lưu, action?) -> 1 revision doc mới (bỏ qua nếu không đổi gì)
     */
    async _dfCapture(recordId, record, action) {
        try {
            // [1] CHECK: Revision gần nhất làm parent (không có = lần đầu)
            const last = (await this._dcFetch(recordId))[0] ?? null;
            const parentSnap = last?.snapshot ?? {};

            // [2] PROCESS: Snapshot mới + field đã đổi so với parent — lưu lại y hệt thì không ghi
            const snap    = snapshotOf(record);
            const changed = last ? changedKeys(parentSnap, snap, last.format === FORMAT) : Object.keys(snap);
            const act     = action || actionOf(parentSnap.status, snap.status, !!last);
            if (last && !changed.length && act === 'updated') return;
            const user = this._user || await auth.get();

            // [3] EXECUTE: Ghi revision, tải lại nếu panel đang mở đúng record này
            await this._svc.create({
                record_id:  recordId,
                relation:   this.relation || '',
                parent_id:  last?.id ?? null,
                version:    (last?.version ?? 0) + 1,
                action:     act,
                user_id:    user?.id || '',
                user_name:  user?.display_name || user?.username || user?.email || '',
                snapshot:   snap,
                changed:    changed.join('|'),
                format:     FORMAT,
                created_at: await this._svc.now(),
            });
            if (this._open && this._activeId === recordId) await this._dcLoad();
        } catch (err) {
            // [4] RETURN: best-effort — lỗi không được chặn luồng lưu chính
            console.error('[svc-diffs] capture failed:', err.message);
        }
    }

    // ==========================================
    // COMPUTED FUNCTIONS
    // ==========================================

    get _txt() { return txtLingo(this.txt, TXT_STD, this.lang); }
    get _svc() { return createService((this.dataTable || 'revisions').split('~')[0]); }
    get _canRestore() { return !!this._user && can(this._user, this.relation, 'manage_versions'); }

    _comLabel(key) {
        const own = this.labels?.[key];
        if (own) return own;
        const fl = FL[this.lang] ?? FL.vi;
        if (fl[key]) return fl[key];
        const dot = key.indexOf('.');
        return dot > 0 ? key.slice(dot + 1) : key;
    }

    _comAction(rev) { return ACTION[rev?.action] ?? ACTION.updated; }
    _comName(rev)   { return rev.user_name || rev.user_id?.slice(0, 12) || this._txt.unknown; }

    /** Cặp đang so: 'prev' = bản trước → bản chọn, 'current' = bản chọn → bản mới nhất. */
    _comPair() {
        const i = this._selected;
        if (i === null) return null;
        const sel = this._revisions[i];
        if (this._compare === 'current') return i === 0 ? { a: null, b: sel, current: true } : { a: sel, b: this._revisions[0] };
        return { a: this._revisions[i + 1] ?? null, b: sel };
    }

    _comDayLabel(val) {
        const d = toDate(val);
        if (!d) return '—';
        const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
        const diff = Math.round((day(new Date()) - day(d)) / 86400000);
        if (diff === 0) return this._txt.today;
        if (diff === 1) return this._txt.yesterday;
        return d.toLocaleDateString(this.lang === 'vi' ? 'vi-VN' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    // ==========================================
    // RENDER FUNCTIONS
    // ==========================================

    render() {
        if (!this._open) return nothing;
        return html`
            <div class="dx-screen" data-view=${this._view} role="dialog" aria-modal="true" aria-label=${this._txt.history}>
                ${this._rbHead()}
                <div class="dx-body">
                    <nav class="dx-list" aria-label=${this._txt.history}>${this._rbList()}</nav>
                    <section class="dx-detail">${this._rbDetail()}</section>
                </div>
            </div>
        `;
    }

    _rbHead() {
        const t = this._txt, n = this._revisions.length;
        return html`
            <header class="dx-head">
                <span class="dx-head-icon"><iconify-icon icon="ri:history-line"></iconify-icon></span>
                <div class="dx-head-title">
                    <span class="dx-h1">${this._title || t.history}</span>
                    <span class="dx-muted">${this._title ? `${t.history} · ` : ''}${this._loading
                        ? html`<iconify-icon class="dx-spin" icon="ri:loader-4-line"></iconify-icon>`
                        : `${n} ${t.versions}`}</span>
                </div>
                <button type="button" class="dx-icon-btn" title=${t.close} aria-label=${t.close} @click=${() => this.close()}>
                    <iconify-icon icon="ri:close-line"></iconify-icon>
                </button>
            </header>
        `;
    }

    _rbState(icon, text, spin = false) {
        return html`
            <div class="dx-state">
                <iconify-icon class=${spin ? 'dx-spin' : ''} icon=${icon}></iconify-icon>
                <span>${text}</span>
            </div>
        `;
    }

    _rbList() {
        const t = this._txt;
        if (this._loading && !this._revisions.length) return this._rbState('ri:loader-4-line', t.loading, true);
        if (this._error) return html`
            <div class="dx-state is-error">
                <iconify-icon icon="ri:error-warning-line"></iconify-icon>
                <span>${this._error}</span>
                <button type="button" class="dx-pill" @click=${() => this._dcLoad()}>${t.retry}</button>
            </div>`;
        if (!this._revisions.length) return this._rbState('ri:git-commit-line', t.noHistory);

        let day = '';
        return html`
            <ol class="dx-items">
                ${this._revisions.map((rev, i) => {
                    const label = this._comDayLabel(rev.created_at);
                    const head  = label !== day ? (day = label) : '';
                    return html`
                        ${head ? html`<li class="dx-day">${head}</li>` : nothing}
                        <li>${this._rbItem(rev, i)}</li>`;
                })}
            </ol>
        `;
    }

    _rbItem(rev, i) {
        const info   = this._comAction(rev);
        const fields = (rev.changed || '').split('|').filter(Boolean);
        const shown  = fields.slice(0, 3).map(f => this._comLabel(f)).join(' · ');
        return html`
            <button type="button" class="dx-item" aria-current=${this._selected === i ? 'true' : 'false'}
                style="--tone:${info.color};--tone-bg:${info.bg}" @click=${() => this._dhSelect(i)}>
                <span class="dx-dot"><iconify-icon icon=${info.icon}></iconify-icon></span>
                <span class="dx-item-main">
                    <span class="dx-item-top">
                        <b>v${rev.version}</b>
                        <span class="dx-badge">${info.label[this.lang] ?? info.label.vi}</span>
                        ${i === 0 ? html`<span class="dx-current">${this._txt.current}</span>` : nothing}
                        <time class="dx-time">${timeAgo(rev.created_at, this.lang)}</time>
                    </span>
                    <span class="dx-item-by">${this._comName(rev)}</span>
                    ${shown ? html`<span class="dx-item-fields">${shown}${fields.length > 3 ? ` +${fields.length - 3}` : ''}</span>` : nothing}
                </span>
            </button>
        `;
    }

    _rbDetail() {
        const t = this._txt;
        const pair = this._comPair();
        if (!pair) return this._revisions.length ? this._rbState('ri:git-diff-line', t.selectHint) : nothing;

        const sel  = this._revisions[this._selected];
        const info = this._comAction(sel);
        const ts   = toDate(sel.created_at);
        const { a, b } = pair;
        const range = this._compare === 'current'
            ? (a ? `v${a.version} → ${t.current}` : `v${b.version}`)
            : (a ? `v${a.version} → v${b.version}` : `v${b.version}`);

        return html`
            <div class="dx-detail-head">
                <button type="button" class="dx-back" @click=${() => { this._view = 'list'; }}>
                    <iconify-icon icon="ri:arrow-left-s-line"></iconify-icon>${t.back}
                </button>
                <div class="dx-detail-title">
                    <span class="dx-range">${range}</span>
                    <span class="dx-badge" style="--tone:${info.color};--tone-bg:${info.bg}">${info.label[this.lang] ?? info.label.vi}</span>
                </div>
                <div class="dx-muted">${t.by} <strong>${this._comName(sel)}</strong>${ts
                    ? ` · ${ts.toLocaleString(this.lang === 'vi' ? 'vi-VN' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}</div>
                ${this._revisions.length > 1 ? html`
                    <div class="dx-seg" role="radiogroup">
                        ${[['prev', t.vsPrev], ['current', t.vsCurrent]].map(([k, label]) => html`
                            <button type="button" role="radio" class="dx-seg-btn" aria-checked=${this._compare === k ? 'true' : 'false'}
                                @click=${() => { this._compare = k; this._expanded = new Set(); }}>${label}</button>`)}
                    </div>` : nothing}
            </div>
            ${this._rbChanges(pair)}
            ${this._rbRestore()}
        `;
    }

    _rbChanges({ a, b, current }) {
        const t = this._txt;
        if (current) return html`<p class="dx-note">${t.isCurrent}</p>`;
        if (!a) return html`<p class="dx-note">${t.firstRev}</p>`;
        const snapA = a.snapshot ?? {}, snapB = b.snapshot ?? {};
        const keys = changedKeys(snapA, snapB, a.format === b.format);
        if (!keys.length) return html`<p class="dx-note">${t.noChanges}</p>`;
        return html`<div class="dx-fields">${keys.map(k => this._rbField(k, snapA[k], snapB[k]))}</div>`;
    }

    _rbField(key, a, b) {
        const kind = kindOf(key, a, b);
        return html`
            <section class="dx-field">
                <h4 class="dx-fl">${this._comLabel(key)}</h4>
                ${kind === 'text'   ? this._rbText(key, a, b)
                : kind === 'list'   ? this._rbListDiff(key, a, b)
                : kind === 'object' ? this._rbObject(key, a, b)
                : this._rbScalar(a, b)}
            </section>
        `;
    }

    _rbScalar(a, b) {
        return html`
            <div class="dx-scalar">
                <span class="dx-old">${fmt(a)}</span>
                <iconify-icon class="dx-arrow" icon="ri:arrow-right-line"></iconify-icon>
                <span class="dx-new">${fmt(b)}</span>
            </div>
        `;
    }

    // Inline (unified) — đọc được cả ở màn hẹp; đoạn dài không đổi thu gọn, bấm để mở
    _rbText(key, a, b) {
        const segs = wordDiff(stripHtml(a), stripHtml(b));
        const open = this._expanded.has(key);
        return html`
            <div class="dx-text">
                ${segs.map(s => {
                    if (s.t === 'del') return html`<del>${s.v}</del>`;
                    if (s.t === 'add') return html`<ins>${s.v}</ins>`;
                    const toks = tokens(s.v);
                    if (open || toks.length <= EQ_KEEP * 2 + 8) return s.v;
                    const hidden = toks.slice(EQ_KEEP, -EQ_KEEP).filter(x => x.trim()).length;
                    return html`${toks.slice(0, EQ_KEEP).join('')}<button type="button" class="dx-more"
                        @click=${() => this._dhExpand(key)}>… ${hidden} ${this._txt.words} …</button>${toks.slice(-EQ_KEEP).join('')}`;
                })}
            </div>
        `;
    }

    _rbListDiff(key, a, b) {
        const A = String(a ?? '').split('|').filter(Boolean), B = String(b ?? '').split('|').filter(Boolean);
        const setA = new Set(A), setB = new Set(B);
        const removed = A.filter(x => !setB.has(x)), added = B.filter(x => !setA.has(x));
        const kept = B.length - added.length;
        const img = key === 'pics' || [...A, ...B].every(x => IMG_RE.test(x));
        const item = (x, cls) => img
            ? html`<span class="dx-thumb ${cls}"><img src=${x} alt="" loading="lazy"></span>`
            : html`<span class="dx-chip ${cls}">${x}</span>`;
        const moved = !removed.length && !added.length; // cùng phần tử, chỉ đổi thứ tự
        return html`
            <div class="dx-chips">
                ${removed.map(x => item(x, 'is-del'))}
                ${added.map(x => item(x, 'is-add'))}
                ${kept ? html`<span class="dx-muted">${moved ? '↕ ' : '+'}${kept} ${this._txt.unchanged}</span>` : nothing}
            </div>
        `;
    }

    // Chỉ các khoá con thực sự đổi, theo đường dẫn — `meta.seo_title` hiện nhãn schema nếu có
    _rbObject(key, a, b) {
        const fa = flatten(isObj(a) ? a : {}, key), fb = flatten(isObj(b) ? b : {}, key);
        const paths = [...new Set([...Object.keys(fa), ...Object.keys(fb)])].filter(p => !same(fa[p], fb[p]));
        return html`
            <div class="dx-rows">
                ${paths.map(p => html`
                    <div class="dx-row">
                        <span class="dx-path">${this._comLabel(p)}</span>
                        ${this._rbScalar(fa[p], fb[p])}
                    </div>`)}
            </div>
        `;
    }

    _rbRestore() {
        const t = this._txt;
        if (this._selected === null || this._selected === 0) return nothing;
        const rev = this._revisions[this._selected];
        if (!this._canRestore) return html`<p class="dx-note dx-lock"><iconify-icon icon="ri:lock-line"></iconify-icon>${t.noRestore}</p>`;
        if (this._confirm) return html`
            <div class="dx-confirm" role="alertdialog">
                <span>${t.restoreAsk.replace('{v}', rev.version)}</span>
                <div class="dx-confirm-actions">
                    <button type="button" class="dx-pill" @click=${() => { this._confirm = false; }}>${t.cancel}</button>
                    <button type="button" class="dx-pill is-primary" @click=${this._dhRestore}>${t.confirm}</button>
                </div>
            </div>`;
        return html`
            <button type="button" class="dx-restore" @click=${() => { this._confirm = true; }}>
                <iconify-icon icon="ri:history-line"></iconify-icon>${t.restore}
            </button>
        `;
    }
}

if (!customElements.get('svc-diffs')) customElements.define('svc-diffs', SvcDiffs);
export default SvcDiffs;
