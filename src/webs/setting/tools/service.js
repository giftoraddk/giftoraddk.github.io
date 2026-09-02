import { make, get, patch, subscribe as conductorSubscribe } from '@/services/conductor.js';
import { createService } from '@/services/crud.js';
import { auth } from '@/webs/auth/tools/service.js';
import { ClientCookies, COOKIE_CONFIG } from '@/services/storeCookie.js';

// Guard: mỗi service name chỉ init (fetch hub) 1 lần
const _inited = new Set();

// Event callbacks: name → { onSave, onPreview, onCancel }
const _handlers = new Map();

// hueCustom bị loại khỏi flow này có chủ đích — getStyleOpts() coi hueCustom (0 hoặc 1) như một
// "kill switch": hễ có giá trị là ép blur/gradient về false (chế độ flat-card, không blob).
// Nền toàn trang cần blob động nên không được set hueCustom (để nó ở trạng thái undefined thật sự).
const BG_KEYS  = ['rounded', 'tint', 'total', 'blur', 'gradient', 'blobType', 'colorful', 'deg', 'distance'];
const BOOL_KEYS = new Set(['blur', 'gradient', 'colorful']);
const NUM_KEYS  = new Set(['total', 'deg', 'distance']);

// ── Internal helpers — bg <-> flat bg_* root keys (cùng kiểu flatten như nav_i_* trước đây) ─

function _bgToFlat(bg = {}) {
    const flat = {};
    for (const k of BG_KEYS) flat[`bg_${k}`] = bg?.[k] ?? '';
    return flat;
}

/**
 * flat bg_* root keys (từ values/draft của web-setting) → bg object input cho getStyleOpts.
 * Public — dùng bởi svc-setting.js để bind trực tiếp <svc-underlay> theo _values hiện tại.
 * @param {Record<string, any>} draft
 */
export function flatToBg(draft = {}) {
    const bg = {};
    for (const k of BG_KEYS) {
        const raw = draft[`bg_${k}`];
        // '' / null / undefined → để undefined cho getStyleOpts tự áp default riêng của nó
        // (vd blur/gradient mặc định true) — KHÔNG được ép về false, sẽ tắt effect oan.
        if (BOOL_KEYS.has(k))     bg[k] = raw === '' || raw == null ? undefined : (raw === true || raw === 'true');
        else if (NUM_KEYS.has(k)) bg[k] = raw === '' || raw == null ? undefined : Number(raw);
        else                      bg[k] = raw ?? '';
    }
    return bg;
}

// Section descriptor thô (từ view.sections, đã strip config/data) → shape editable —
// chỉ configKey là user-editable; component/configList là metadata tĩnh (xem _mergeSectionEdits).
function _sectionsFromPages(pages = []) {
    return pages.map(p => ({
        id:         p.id,
        component:  p.component  ?? '',   // read-only passthrough — quyết định field nào hiển thị trong form
        configList: p.configList ?? [],   // options cho web-select 'configKey' — { key, config, label }
        configKey:  p.configKey  ?? '',
    }));
}

// configKey → config object thật, tra trong configList (đồng bộ, configList luôn re-seed fresh
// từ shop-page.js mỗi setup() nên không cần round-trip DB). KHÔNG bao giờ persist config object
// trực tiếp — layout config kiểu makes: [[...]] là array-lồng-array, Firestore addDoc/setDoc/
// updateDoc từ chối thẳng ("Nested arrays are not supported").
function _resolveConfig(sec) {
    if (!sec.configKey) return undefined;
    return (sec.configList ?? []).find(c => c.key === sec.configKey)?.config;
}

// Shape gọn để persist vào hub.meta.sections — bỏ configList (metadata tĩnh, re-seed từ
// shop-page.js) và configKey thay vì config JSON đã resolve (xem _resolveConfig).
function _forPersist(sections = []) {
    return sections.map(({ id, component, configKey }) => ({ id, component, configKey }));
}

// Merge sections từ draft (web-setting chỉ track field có form: configKey) với metadata
// tĩnh gốc (component, configList) — đảm bảo 2 field này không bị rơi mất qua mỗi lần save/preview.
function _mergeSectionEdits(draftSections = [], baseSections = []) {
    const baseById = new Map(baseSections.map(s => [s.id, s]));
    return draftSections.map(s => {
        const base = baseById.get(s.id);
        if (!base) return s;
        return { ...base, configKey: s.configKey ?? base.configKey };
    });
}

// ── Setup / Init ──────────────────────────────────────────────────────────────

/**
 * Khởi tạo setting section — seed giá trị mặc định từ variant/sections prop (trước khi hub load xong).
 * Gọi sync từ component connectedCallback trước subscribe.
 * @param {string} name
 * @param {{ link?: string, variant?: object, sections?: any[] }} config
 */
export function setup(name, { link = '', variant = {}, sections = [] } = {}) {
    const currentSections = _sectionsFromPages(sections);
    const values = {
        ui:         variant.ui         ?? '',
        theme:      variant.theme      ?? '',
        mainColors: variant.mainColors ?? '',
        textColor:  variant.textColor  ?? '',
        ..._bgToFlat(variant.bg),
        sections: currentSections,
    };

    make(name, {
        link,
        hub:        null,
        sectionIds: currentSections.map(s => s.id),
        values,
    });

    _applyToDom(values);
}

/**
 * Async hydrate: query hub theo link, overlay meta lên values đã seed.
 * Guard đảm bảo chỉ chạy 1 lần dù component reconnect.
 * @param {string} name
 */
export async function init(name) {
    if (_inited.has(name)) return;
    _inited.add(name);

    const state = get(name);
    if (!state) return;

    const svc  = createService('hubs');
    const rows = await svc.findAll({ filters: { link: state.link } });
    const hub  = rows[0] ?? null;

    make(name, { hub });
    if (!hub) return;

    const meta       = hub.meta ?? {};
    const ownIds     = new Set(state.sectionIds ?? []);
    const overrides  = new Map((meta.sections ?? []).filter(s => ownIds.has(s.id)).map(s => [s.id, s]));
    const draftLike  = (state.values?.sections ?? []).map(s => overrides.get(s.id) ?? s);
    const sections   = _mergeSectionEdits(draftLike, state.values?.sections ?? []);

    const values = {
        ui:         meta.ui         ?? state.values.ui,
        theme:      meta.theme      ?? state.values.theme,
        mainColors: meta.mainColors ?? state.values.mainColors,
        textColor:  meta.textColor  ?? state.values.textColor,
        ..._bgToFlat({ ...flatToBg(state.values), ...meta.bg }),
        sections,
    };

    make(name, { values });
    for (const s of sections) make(s.id, { config: _resolveConfig(s) });
    _applyToDom(values);
}

// ── Actions ───────────────────────────────────────────────────────────────────

/**
 * Lưu cấu hình: merge sections vào hub, create (lần đầu) hoặc update, apply DOM + notify.
 * @param {string}              name
 * @param {Record<string, any>} draft  Dữ liệu từ web-setting setting-save event
 */
export async function save(name, draft) {
    const state = get(name);
    if (!state) return;

    const sections = _mergeSectionEdits(draft.sections ?? [], state.values?.sections ?? []);
    const resolved = { ...draft, sections };

    _applyToDom(resolved);

    // Push section field overrides vào conductor state (config — config đã resolve
    // full object cho live render, KHÔNG phải thứ sẽ persist bên dưới).
    for (const s of sections) make(s.id, { config: _resolveConfig(s) });

    // Merge sections của view đang active vào mảng sections đầy đủ của hub — giữ nguyên
    // override của các view khác (matching theo id). _forPersist() bỏ configList/config JSON
    // (nested arrays, Firestore từ chối) — chỉ lưu configKey, resolve lại lúc init().
    const draftIds         = new Set(sections.map(s => s.id));
    const existingSections = state.hub?.meta?.sections ?? [];
    const mergedSections   = [...existingSections.filter(s => !draftIds.has(s.id)), ..._forPersist(sections)];

    const meta = {
        ui:         resolved.ui,
        theme:      resolved.theme,
        mainColors: resolved.mainColors,
        textColor:  resolved.textColor,
        bg:         flatToBg(resolved),
        sections:   mergedSections,
    };

    const svc = createService('hubs');
    let hub   = state.hub;

    if (hub?.id) {
        await svc.update(hub.id, { meta });
        hub = { ...hub, meta };
    } else {
        const now    = await svc.now();
        const userId = await _resolveOwnerId(await auth.get());
        hub = await svc.create({ link: state.link, user_id: userId, meta, created_at: now, updated_at: now });
    }

    make(name, { hub, values: resolved });
    _handlers.get(name)?.onSave?.(resolved);
}

/**
 * Preview: apply DOM ngay (chưa persist) + notify với draft data.
 * @param {string}              name
 * @param {Record<string, any>} draft
 */
export function preview(name, draft) {
    const state    = get(name);
    const sections = _mergeSectionEdits(draft.sections ?? [], state?.values?.sections ?? []);
    const resolved = { ...draft, sections };

    _applyToDom(resolved);
    for (const s of sections) make(s.id, { config: _resolveConfig(s) });
    _handlers.get(name)?.onPreview?.(resolved);
}

/**
 * Cancel: khôi phục DOM + notify với values hiện tại.
 * @param {string} name
 */
export function cancel(name) {
    const values = get(name)?.values ?? {};
    _applyToDom(values);
    _handlers.get(name)?.onCancel?.(values);
}

// ── Access control ────────────────────────────────────────────────────────────

/**
 * Kiểm tra quyền sửa hub hiện tại: admin (role 'admin') hoặc owner (user_id trùng hub.user_id).
 * @param {string} name
 * @returns {Promise<{ canEdit: boolean, user: object|null }>}
 */
export async function canEdit(name) {
    const user = await auth.get();
    if (!user || user.status !== 'active') return { canEdit: false, user: null };

    const roles   = (user.roles || '').split('|').filter(Boolean);
    const isAdmin = roles.includes('admin');
    if (isAdmin) return { canEdit: true, user };

    const hub     = get(name)?.hub;
    const isOwner = hub?.user_id != null && String(hub.user_id) === String(user.id);
    return { canEdit: isOwner, user };
}

/**
 * Re-apply values hiện tại lên DOM — dùng sau Astro view-transition (DOM trang bị thay thế
 * nhưng element svc-setting vẫn sống nhờ transition:persist).
 * @param {string} name
 */
export function reapply(name) {
    _applyToDom(get(name)?.values);
}

// ── Event callbacks ───────────────────────────────────────────────────────────

/**
 * Đăng ký callbacks cho các action của service.
 * @param {string} name
 * @param {{ onSave?: Function, onPreview?: Function, onCancel?: Function }} handlers
 * @returns {Function} unsubscribe
 */
export function onEvents(name, handlers) {
    _handlers.set(name, handlers);
    return () => _handlers.delete(name);
}

// ── Subscribe / Query ─────────────────────────────────────────────────────────

/**
 * Subscribe vào setting section — chỉ fire khi section thay đổi.
 * @param {string}   name
 * @param {Function} listener
 * @returns {Function} unsubscribe
 */
export function subscribe(name, listener) {
    const cur = get(name);
    if (cur) listener(cur);
    return conductorSubscribe(name, section => {
        if (section) listener(section);
    });
}

// getState - Đọc state hiện tại của setting section
export function getState(name) {
    return get(name);
}

// ── Internal ──────────────────────────────────────────────────────────────────

// Apply variant + bg fields lên DOM sống (theme attr, CSS vars, web-boxs ui, svc-underlay props)
function _applyToDom(cfg) {
    if (!cfg) return;
    patch({ ui: cfg.ui, theme: cfg.theme, mainColors: cfg.mainColors, textColor: cfg.textColor });

    const r = document.documentElement;
    if (cfg.theme) {
        r.setAttribute('data-theme', cfg.theme);
        ClientCookies.set(COOKIE_CONFIG.THEME, cfg.theme); // giữ đồng bộ với cookie đọc bởi Core.astro (anti-flash) + BtnTheme.astro
    }
    if (cfg.textColor) r.style.setProperty('--text-custom', cfg.textColor);

    if (cfg.mainColors) {
        const [primary = '', secondary = '', accent = '', info = '', warning = ''] =
            cfg.mainColors.split('|').map(c => c.trim());
        if (primary)   r.style.setProperty('--color-primary',   primary);
        if (secondary) r.style.setProperty('--color-secondary', secondary);
        if (accent)    r.style.setProperty('--color-accent',    accent);
        if (info)      r.style.setProperty('--color-info',      info);
        if (warning)   r.style.setProperty('--color-warning',   warning);
    }

    if (cfg.ui) document.querySelectorAll('web-boxs').forEach(el => el.setAttribute('ui', cfg.ui));

    // bg không mutate DOM ở đây — svc-setting.js render <svc-underlay> trực tiếp, reactive theo _values
}

// Resolve user_id chủ sở hữu lúc tạo hub lần đầu — ưu tiên id thật, super admin không có id thật → query theo email → 0
async function _resolveOwnerId(user) {
    if (!user) return 0;
    if (user.id && user.id !== 'super') return user.id;
    try {
        const found = (await createService('users', '', 'auth').findAll({ filters: { email: user.email } }))[0];
        if (found?.id) return found.id;
    } catch {}
    return 0;
}
