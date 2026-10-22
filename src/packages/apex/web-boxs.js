import { LitElement, html } from "lit";
import { txtLingo } from "@/services/tools/lingo.js";
import { dataInit, injectStyles, watchHtmlAttr, productSlug, postSlug } from "@/services/tools/util.js";
import { loadKey } from "@/services/core/crud";
import { all as conductorAll, more as conductorMore, get as conductorGet, subscribe as conductorSubscribe } from "@/services/core/conductor";
import { bgTemplate } from "@/packages/adopted/svc-underlay.js";
import { resolveMount, filterRecords } from "./tool/recursive-render.js";
import "./web-box.js";
import "./web-boxs-search.js";
import boxStyles from "./css/web-box.css?inline";

// ============================================================================
// OVERVIEW — web-boxs: the data/search/filter/pagination shell of the
// web-board > web-boxs > web-box > web-cell stack (hook/DESIGN.rst + hook/ARCHITECT.rst).
//
// Owns the record list for ONE section (fetch/filter/search/paginate) and mounts ONE root
// `<web-box root>` bound to `config` + that list. Render-mode dispatch lives in web-box.
// The filtered list and the root node are memoized in willUpdate(): a re-render caused by
// something unrelated (scroll reveal, loader) hands the SAME objects down, so Lit's dirty
// checking skips the whole subtree instead of re-rendering every card.
// ============================================================================

const TXT_STD = {
  vi: { empty: 'Không có dữ liệu' },
  en: { empty: 'No data' }
};

// Card config của products/posts trỏ CTA/title qua `meta.url` = /product|post/{slug}-{id}/ (productSlug/postSlug,
// services/tools/util.js). Record tải thẳng qua `dataTable` không có sẵn field này — bù chung 1 chỗ ở đây.
const SLUG_ROUTES = { products: { prefix: '/product/', slug: productSlug }, posts: { prefix: '/post/', slug: postSlug } };
const _slugged = new WeakMap(); // record → bản có meta.url, giữ identity ổn định giữa các lần lọc
const EMPTY = Object.freeze({});

// Inputs that invalidate the memoized list / root node.
const ITEM_DEPS = ['resData', 'search', 'dataTable', 'filterState', '_filterActive', '_filterQuery', '_filterRange'];
const NODE_DEPS = ['config', 'presets', 'theme', 'masonry', 'list', 'stysWrap'];

export class WebBoxs extends LitElement {
  static properties = {
    // ── Data sources ──────────────────────────────────────────────────────────
    data:      { type: Array,  converter: { fromAttribute: (v) => dataInit(v, []) } },
    dataSrc:   { type: String }, // "url~nested"
    dataTable: { type: String }, // "table~nested" or "t1|t2~nested"
    loadLimit: { type: Number }, // 0 = load all; > 0 = N items/page + infinite scroll
    cache:     { type: Number }, // IndexedDB TTL (minutes) → conductor.all()/more(); 0 = bypass
    filters:   { type: Object, converter: { fromAttribute: (v) => dataInit(v, {}) } }, // server-side equality filters

    // ── Layout ────────────────────────────────────────────────────────────────
    config:     { type: Object,  converter: { fromAttribute: (v) => dataInit(v, {}) } }, // root recursive node — hook/DESIGN.rst
    presets:    { type: Object,  converter: { fromAttribute: (v) => dataInit(v, {}) } },
    col:        { type: Number },
    list:       { type: String },  // 'slider' | 'tabs' | 'steps' | 'expansion' — shortcut, see _effectiveConfig
    masonry:    { type: Boolean },
    responsive: { type: Boolean },
    stysWrap:   { type: Object,  converter: { fromAttribute: (v) => dataInit(v, {}) } },
    bg:         { type: Object,  converter: { fromAttribute: (v) => dataInit(v, {}) } },

    // ── Appearance ────────────────────────────────────────────────────────────
    ui:         { type: String }, // 'modern' | 'pastel'
    theme:      { type: String },
    mainColors: { type: String },
    textColor:  { type: String },
    animeQueue: { type: String },
    zoom:       { type: Boolean }, // → web-box → web-cell mode 'gallery'

    // ── Behaviour ─────────────────────────────────────────────────────────────
    search:     { type: String  }, // external programmatic text filter
    refresh:    { type: Boolean },
    loader:     { type: Number  }, // 0 idle · 1 loading · 2 loaded

    // ── Search UI (web-boxs-search) ───────────────────────────────────────────
    showSearch:  { type: Boolean },
    filterState: { type: Object  }, // { sectionId, tags, field, color, active, query, ranges, rangeField, rangeKey }

    // ── Internal state ────────────────────────────────────────────────────────
    resData:       { state: true },
    _filterActive: { state: true },
    _filterQuery:  { state: true },
    _filterRange:  { state: true },

    // ── i18n ──────────────────────────────────────────────────────────────────
    txt:  { type: Object },
    lang: { type: String },
  };

  // Light DOM so web-slider (mounted inside a nested web-box) can inherit external CSS
  createRenderRoot() { return this; }

  constructor() {
    super();
    this.resData    = [];
    this.refresh    = true;
    this.loadLimit  = 0;
    this.loader     = 0;
    this.animeQueue = "200ms";
    this.ui         = "modern";
    this.masonry    = false;
    this.zoom       = false;
    this.presets    = {};
    this.theme      = "light";
    this.txt        = null;
    this.lang       = 'vi';
    this._filterActive = [];
    this._filterQuery  = "";
    this._filterRange  = null;
    this._paging       = false;
    this._autoContinueCount = 0;
    this._items = [];
    this._node  = null;
    // Cùng id với web-board — web-box.css chỉ vào <head> đúng 1 lần dù bao nhiêu section.
    injectStyles("web-box-styles", boxStyles);
  }

  connectedCallback() {
    super.connectedCallback();
    // Đứng độc lập (không được truyền theme) → theo dõi <html data-theme>; có theme từ cha (web-board) thì tôn trọng.
    if (!this.hasAttribute("theme")) this._unwatchTheme = watchHtmlAttr("data-theme", (v) => { this.theme = v || "light"; });

    // Scroll reveal (node props.anime) is per box now — each <web-box> watches its own element (web-box.js _watchReveal).
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unwatchTheme?.();
    this._loadMoreObs?.disconnect();
    this._unsubConductor?.();
  }

  willUpdate(changed) {
    if (changed.has("data")) {
      this.resData = Array.isArray(this.data) ? this.data : (this.data ? [this.data] : []);
      this.refresh = false;
    } else if (changed.has("refresh") || changed.has("dataSrc") || changed.has("dataTable")) {
      if (changed.has("dataTable")) this.refresh = true;
      this._loadData();
    }
    if (changed.has("filterState")) {
      const fs = this.filterState || {};
      this._filterActive = fs.active || [];
      this._filterQuery  = fs.query  || "";
      this._filterRange  = (fs.ranges || []).find(r => r.key === (fs.rangeKey || "")) || null;
    }
    if (ITEM_DEPS.some(k => changed.has(k))) {
      const fs = this.filterState || {};
      this._items = this._withSlugUrl(filterRecords(this.resData, {
        search: this.search, query: this._filterQuery, active: this._filterActive,
        field: fs.field || "tags", range: this._filterRange, rangeField: fs.rangeField || "pricing",
      }));
    }
    if (!this._node || NODE_DEPS.some(k => changed.has(k)) || ITEM_DEPS.some(k => changed.has(k))) {
      const config = this._effectiveConfig;
      const { host, inner, render, props } = resolveMount(config, { record: this._items[0] || EMPTY, records: this._items, lang: this.lang }, this.presets);
      this._node = { ...config, preset: undefined, style: { ...host, ...inner, ...(this.stysWrap || {}) }, render, props };
    }
  }

  // Attach the infinite-scroll sentinel once it exists (observe() on an observed target is a no-op).
  updated() {
    if (!this.loadLimit) return;
    const sentinel = this.querySelector(':scope > [data-loadmore-sentinel]');
    if (!sentinel) return;
    this._loadMoreObs ??= new IntersectionObserver(([entry]) => {
      // Real scroll/visibility event — reset the auto-continue safety counter
      if (entry.isIntersecting) { this._autoContinueCount = 0; this._loadMore(); }
    }, { rootMargin: '200px' });
    this._loadMoreObs.observe(sentinel);
  }

  // ── Data loading (via conductor — shared RAM state + IndexedDB cache) ──────

  get _key() { return loadKey(this.dataSrc, this.dataTable); }
  get _query() { return { dataSrc: this.dataSrc, dataTable: this.dataTable, limit: this.loadLimit, cache: this.cache, filters: this.filters }; }

  async _loadData() {
    if (!this.refresh) return;
    this._unsubConductor?.();
    const id = this._key;
    if (!id) { this.refresh = false; return; }
    this.loader = 1;
    try {
      await conductorAll(id, this._query);
      this.resData = conductorGet(id)?.data ?? [];
      this._unsubConductor = conductorSubscribe(id, s => { this.resData = s?.data ?? []; });
      this.loader = 2;
    } catch {
      this.loader = 0;
    }
    this.refresh = false;
  }

  // ── Infinite scroll (loadLimit > 0) ─────────────────────────────────────────

  // True until the section reports otherwise, so the sentinel stays until the first fetch resolves.
  get _hasMore() {
    return !!this.loadLimit && conductorGet(this._key)?._hasMore !== false;
  }

  async _loadMore(auto = false) {
    if (this._paging || !this._hasMore) return;
    // Safety valve: caps self-triggered continuations; a real scroll resets the counter.
    if (auto && this._autoContinueCount >= 20) return;
    this._paging = true;
    try {
      await conductorMore(this._key, this._query);
      await this.updateComplete;
    } finally {
      this._paging = false;
    }
    // IntersectionObserver only fires on boundary crossings — keep loading while the sentinel stays in view.
    if (this._hasMore && this._sentinelInView()) {
      this._autoContinueCount++;
      this._loadMore(true);
    }
  }

  _sentinelInView() {
    const r = this.querySelector(':scope > [data-loadmore-sentinel]')?.getBoundingClientRect();
    return !!r && r.top < window.innerHeight + 200 && r.bottom > -200;
  }

  // ── Filter ────────────────────────────────────────────────────────────────

  _onFilter(e) {
    const { active, query, field, range } = e.detail;
    this._filterActive = active || [];
    this._filterQuery  = query  || "";
    this._filterRange  = range || null;
    // Bubble up with sectionId so web-board can persist the filter to the store
    this.dispatchEvent(new CustomEvent("filter", {
      detail: { sectionId: this.filterState?.sectionId, active, query, field, range },
      bubbles: true, composed: true,
    }));
  }

  // Chỉ khi bảng CHÍNH đúng 'products'/'posts' — bỏ qua multi-table "t1|t2~nested".
  get _comSlugRoute() {
    const table = (this.dataTable || '').split('~')[0];
    return table.includes('|') ? null : SLUG_ROUTES[table] || null;
  }

  // Bù `meta.url` cho record chưa có — không mutate resData/conductor cache, record đã có url giữ nguyên.
  _withSlugUrl(items) {
    const route = this._comSlugRoute;
    if (!route) return items;
    return items.map(it => {
      if (!it || it.meta?.url) return it;
      let out = _slugged.get(it);
      if (!out) { out = { ...it, meta: { ...(it.meta || {}), url: `${route.prefix}${route.slug(it)}/` } }; _slugged.set(it, out); }
      return out;
    });
  }

  // ── Config ───────────────────────────────────────────────────────────────

  // config[theme] doubles as a per-theme mainColors override when `mainColors` isn't bound directly.
  // `masonry`/`list` seed the ROOT node's render-mode for sections that don't hand-author `each`.
  get _effectiveConfig() {
    const c = this.config || {};
    const config = { ...c, mainColors: c[this.theme] };
    if (!this.masonry && !this.list) return config;
    const bareGrid = config.each === '$records' && !config.render; // card config vẫn nhận masonry/list
    if (config.each !== undefined && !bareGrid) return config;
    return { ...config, each: '$records', render: this.masonry ? 'masonry' : this.list };
  }

  // ── Render ────────────────────────────────────────────────────────────────

  _searchEl() {
    if (!this.showSearch) return "";
    const fs = this.filterState || {};
    return html`
      <div class="mb-4 text-center">
        <web-boxs-search class="mb-4"
          .items=${this.resData} .tags=${fs.tags || []} .field=${fs.field || "tags"} .color=${fs.color || "primary"}
          .ranges=${fs.ranges || []} .range=${this._filterRange?.key || ""} .ui=${this.ui} .lang=${this.lang}
          .active=${this._filterActive} .query=${this._filterQuery}
          @filter=${this._onFilter}
        ></web-boxs-search>
        ${this._items.length === 0 ? fs.emptyText || txtLingo(this.txt, TXT_STD, this.lang).empty : ""}
      </div>
    `;
  }

  render() {
    const node = this._node;
    // Chỉ bg truyền qua prop — config.bg do web-board (full-section) hoặc web-box (từng item) render
    const bgEl = (this.bg && Object.keys(this.bg).length) ? bgTemplate(this.bg) : '';
    return html`
      ${this._searchEl()}
      <div class="gi-wrap ${this.responsive ? 'responsive' : ''}" style="position:relative">
        ${bgEl}
        <web-box root class="gi gi-col-12"
          .node=${node} .record=${this._items[0] || EMPTY} .records=${this._items}
          .presets=${this.presets} .mainColors=${node.mainColors || this.mainColors} .textColor=${this.textColor}
          .theme=${this.theme} .lang=${this.lang} .ui=${node.ui || this.ui} .zoom=${this.zoom}
          .loading=${this.loader === 1} .index=${0}
        ></web-box>
      </div>
      ${this.loadLimit ? html`<div data-loadmore-sentinel style="height:1px"></div>` : ''}
    `;
  }
}

if (!customElements.get("web-boxs")) customElements.define("web-boxs", WebBoxs);
