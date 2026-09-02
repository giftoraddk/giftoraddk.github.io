import { LitElement, html, unsafeCSS } from "lit";
import { isObject, dataInit, cssInline, injectStyles, normText } from "@/services/helper.js";
import { loadKey } from "@/services/crud.js";
import { all as conductorAll, more as conductorMore, get as conductorGet, subscribe as conductorSubscribe } from "@/services/conductor.js";
import { bgTemplate } from "@/webs/underlay/svc-underlay.js";
import "./web-box.js";
import "./web-boxs-search.js";
import "./web-slider.js";
import "./web-steps.js";
import "./web-tabs.js";
import "./web-expansion.js";
import boxStyles from "./styles/web-box.css?inline";

const TXT_STD = {
  vi: { empty: 'Không có dữ liệu' },
  en: { empty: 'No data' }
}

export class WebBoxs extends LitElement {
  static properties = {
    // ── Data sources ──────────────────────────────────────────────────────────
    data:    { type: Array,  converter: { fromAttribute: (v) => dataInit(v, []) } },
    dataSrc:   { type: String }, // "url~nested"
    dataTable: { type: String }, // "table~nested" or "t1|t2~nested"
    // 0 = load all data; > 0 = paginate N items/page + infinite scroll (grid/masonry only)
    loadLimit: { type: Number },
    // IndexedDB TTL (minutes) forwarded to conductor.all()/more() — undefined = conductor default (5), 0 = bypass cache
    cache:     { type: Number },
    // Server-side equality filters forwarded to conductor.all()/more() — e.g. { status: 'active' }
    filters:   { type: Object, converter: { fromAttribute: (v) => dataInit(v, {}) } },

    // ── Layout ────────────────────────────────────────────────────────────────
    config:     { type: Object,  converter: { fromAttribute: (v) => dataInit(v, {}) } },
    col:        { type: Number }, // grid column span 1–12
    // 'slider' | 'tabs' | 'steps' | 'expansion' — activates the matching wrapper mode
    list:       { type: String },
    masonry:    { type: Boolean },
    responsive: { type: Boolean },
    stysWrap:   { type: Object,  converter: { fromAttribute: (v) => dataInit(v, {}) } },
    bg:         { type: Object,  converter: { fromAttribute: (v) => dataInit(v, {}) } },

    // ── Appearance ────────────────────────────────────────────────────────────
    ui:         { type: String }, // 'modern' | 'spatial'
    theme:      { type: String },
    mainColors: { type: String },
    textColor:  { type: String },
    animeQueue: { type: String }, // stagger delay between box animations
    zoom:       { type: Boolean }, // forward xuống web-box → web-cell → mode 'gallery' — chỉ web-board bật cho section products

    // ── Behaviour ─────────────────────────────────────────────────────────────
    search:     { type: String  }, // external programmatic text filter
    refresh:    { type: Boolean },
    loader:     { type: Number  },

    // ── Search UI (web-boxs-search) ───────────────────────────────────────────
    showSearch:   { type: Boolean },
    // Synced as one object by web-board — { sectionId, tags, field, color, active, query }
    filterState:  { type: Object  },

    // ── Internal state ────────────────────────────────────────────────────────
    resData:          { state: true },
    _isVisible:       { state: true },
    _filterActive:    { state: true },
    _filterQuery:     { state: true },

    // ── i18n ──────────────────────────────────────────────────────────────────
    txt:  { type: Object },
    lang: { type: String },

  };

  // Light DOM so web-slider can inherit external CSS and slotted styles work correctly
  createRenderRoot() { return this; }

  static styles = [unsafeCSS(boxStyles)];

  constructor() {
    super();
    this.resData  = [];
    this.refresh  = true;
    this.loadLimit      = 0;
    this._paging        = false;
    this._autoContinueCount = 0;
    this.loader        = 0;
    this.animeQueue    = "200ms";
    this.ui            = "modern";
    this.masonry       = false;
    this.zoom          = false;
    this._isVisible       = false;
    this._filterActive    = [];
    this._filterQuery     = "";
    // Chỉ tự suy ra từ <html data-theme> khi KHÔNG được truyền theme từ ngoài (dùng
    // độc lập, không nằm trong web-board). Nếu có, connectedCallback() dưới đây sẽ
    // không override — tôn trọng giá trị parent đã truyền (vd svc-channel → web-board).
    this.theme         = document.documentElement.getAttribute("data-theme") || "light";
    this.txt  = null;
    this.lang = 'vi';
    this._injectStyles();
  }

  // box.css is imported inline so it works in both shadow and light DOM builds
  _injectStyles() {
    injectStyles("web-boxs-styles", boxStyles);
  }

  connectedCallback() {
    super.connectedCallback();
    // Đứng độc lập (không được truyền theme từ ngoài) → tự suy ra + theo dõi sống từ
    // <html data-theme>. Có theme attribute rồi (vd web-board truyền xuống) → tôn trọng
    // nguyên, không tự ý override bằng document.documentElement.
    if (!this.hasAttribute("theme")) {
      this.theme = document.documentElement.getAttribute("data-theme") || "light";

      this._themeObserver = new MutationObserver(() => {
        this.theme = document.documentElement.getAttribute("data-theme") || "light";
      });
      this._themeObserver.observe(document.documentElement, {
        attributes: true, attributeFilter: ["data-theme"],
      });
    }

    // Defer animation until the element scrolls into view
    this._io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        this._isVisible = true;
        this._io.disconnect();
      }
    }, { threshold: 0 });
    this._io.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._themeObserver?.disconnect();
    this._io?.disconnect();
    this._loadMoreObs?.disconnect();
    this._unsubConductor?.();
  }

  // Attach the infinite-scroll sentinel once it exists in the DOM (grid/masonry + loadLimit only).
  // observe() on an already-observed target is a no-op, so calling this every update is safe.
  updated() {
    if (!this.loadLimit) return;
    const sentinel = this.querySelector('[data-loadmore-sentinel]');
    if (!sentinel) return;
    this._loadMoreObs ??= new IntersectionObserver(([entry]) => {
      // Real scroll/visibility event — reset the auto-continue safety counter
      if (entry.isIntersecting) { this._autoContinueCount = 0; this._loadMore(); }
    }, { rootMargin: '200px' });
    this._loadMoreObs.observe(sentinel);
  }

  willUpdate(changed) {
    if (changed.has("data")) {
      this.resData = Array.isArray(this.data) ? this.data : (this.data ? [this.data] : []);
      this.refresh = false;
    } else if (changed.has("refresh") || changed.has("dataSrc") || changed.has("dataTable")) {
      if (changed.has("dataTable")) this.refresh = true;
      this._loadData();
    }
    // Sync internal filter state when web-board pushes a new filterState object
    if (changed.has("filterState")) {
      this._filterActive = this.filterState?.active || [];
      this._filterQuery  = this.filterState?.query  || "";
    }
  }

  // ── Data loading ─────────────────────────────────────────────────────────
  // Routed through conductor: shares in-memory state + IndexedDB cache with
  // every other component reading the same dataSrc/dataTable.

  async _loadData() {
    if (!this.refresh) return;
    this._unsubConductor?.();
    const id = loadKey(this.dataSrc, this.dataTable);
    if (!id) { this.refresh = false; return; }
    this.loader = 1;
    try {
      await conductorAll(id, { dataSrc: this.dataSrc, dataTable: this.dataTable, limit: this.loadLimit, cache: this.cache, filters: this.filters });
      this.resData = conductorGet(id)?.data ?? [];
      this._unsubConductor = conductorSubscribe(id, s => { this.resData = s?.data ?? []; });
      this.loader = 2;
    } catch {
      this.loader = 0;
    }
    this.refresh = false;
  }

  // ── Infinite scroll (loadLimit > 0) ─────────────────────────────────────────

  // Whether more pages remain — true by default until the section reports otherwise,
  // so the sentinel stays visible until the first fetch resolves.
  get _hasMore() {
    if (!this.loadLimit) return false;
    return conductorGet(loadKey(this.dataSrc, this.dataTable))?._hasMore !== false;
  }

  async _loadMore(auto = false) {
    if (this._paging || !this.loadLimit || !this._hasMore) return;
    // Safety valve — caps consecutive self-triggered continuations (see below) so a
    // fetch that keeps "succeeding" with an unmoving sentinel (or any other edge case)
    // can't spin forever; a real scroll resets this counter and lets it continue.
    if (auto && this._autoContinueCount >= 20) return;
    this._paging = true;
    try {
      await conductorMore(loadKey(this.dataSrc, this.dataTable), {
        dataSrc: this.dataSrc, dataTable: this.dataTable, limit: this.loadLimit, cache: this.cache, filters: this.filters,
      });
      await this.updateComplete;
    } finally {
      this._paging = false;
    }
    // IntersectionObserver only fires on boundary crossings — if the newly-loaded
    // content still doesn't push the sentinel out of view, it never re-fires on its
    // own. Keep loading proactively until the sentinel actually leaves the viewport
    // (or there's nothing left), so short datasets don't get stuck after page 1.
    if (this._hasMore && this._sentinelInView()) {
      this._autoContinueCount++;
      this._loadMore(true);
    }
  }

  _sentinelInView() {
    const el = this.querySelector('[data-loadmore-sentinel]');
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight + 200 && r.bottom > -200;
  }

  // Rendered at the end of grid/masonry output only — tiers/slider/tabs/steps/expansion
  // are structured layouts, not a fit for progressive reveal.
  _sentinelEl() {
    return this.loadLimit ? html`<div data-loadmore-sentinel style="height:1px"></div>` : '';
  }

  // ── Filter ────────────────────────────────────────────────────────────────

  _onFilter(e) {
    const { active, query, field } = e.detail;
    this._filterActive = active || [];
    this._filterQuery  = query  || "";
    // Bubble up with sectionId so web-board can persist the filter to the store
    this.dispatchEvent(new CustomEvent("filter", {
      detail: { sectionId: this.filterState?.sectionId, active, query, field },
      bubbles: true, composed: true,
    }));
  }

  // item[field] can be a string[] or a "|"-joined string — same convention as web-boxs-search.
  _tagsOf(item, field) {
    const val = item[field];
    return Array.isArray(val) ? val : typeof val === "string" ? val.split("|").filter(Boolean) : [];
  }

  _applyFilter(data) {
    let items = Array.isArray(data) ? [...data] : [];
    if (this.search) {
      const q = normText(this.search);
      items = items.filter(item => normText(JSON.stringify(item)).includes(q));
    }
    if (this._filterActive.length > 0 || this._filterQuery) {
      const field = this.filterState?.field || "tags";
      if (this._filterActive.length > 0) {
        items = items.filter(item => this._filterActive.some(a => this._tagsOf(item, field).includes(a)));
      }
      if (this._filterQuery) {
        const q = normText(this._filterQuery);
        items = items.filter(item => normText(JSON.stringify(item)).includes(q));
      }
    }
    return items;
  }

  // ── Shared micro-helpers ──────────────────────────────────────────────────

  get _config() {
    const c = this.config || {};
    return { ...c, mainColors: c[this.theme] };
  }

  // 'responsive' class string — used in every render wrapper
  get _respCls() { return this.responsive ? "responsive" : ""; }

  // Fallback col when `this.col` is unset — 1 in responsive mode, else the given default.
  _colDef(fallback) { return this.responsive ? 1 : fallback; }

  // Normalize optional sub-config value → always an object (never true / null / undefined)
  _toObj(v) { return isObject(v) ? v : {}; }

  // Row-span class from a tiersRow / groupRow entry, cycling if array.
  // Same parseInt() rule as groupRow — non-numeric ('auto', '') → no class added.
  _rowCls(def, i = 0) {
    const arr = Array.isArray(def) ? def : [def];
    const n   = parseInt(arr[i % arr.length]);
    return isNaN(n) ? "" : `gi-row-${n}`;
  }

  // Shared stysWrap div for tabs / steps / expansion (no extra grid classes needed)
  _renderWrapped(inner) {
    return html`<div style="${cssInline(this.stysWrap)}">${inner}</div>`;
  }
  
  // ── Render helpers ────────────────────────────────────────────────────────

  _searchEl() {
    if (!this.showSearch) return "";
    const fs    = this.filterState || {};
    const items = this._applyFilter(this.resData);
    return html`
      <div class="mb-4 text-center">
        <web-boxs-search
          .items=${this.resData}
          .tags=${fs.tags  || []}
          .field=${fs.field || "tags"}
          .color=${fs.color || "primary"}
          .ui=${this.ui}
          .lang=${this.lang}
          .active=${this._filterActive}
          .query=${this._filterQuery}
          @filter=${this._onFilter}
          class="mb-4"
        ></web-boxs-search>
        ${items.length === 0 ? this.filterState?.emptyText || this._txt.empty || "No data" : ""}
      <div>
    `;
  }

  // Dùng chung bgTemplate() (svc-underlay.js) với web-board.js — xem comment ở đó.
  _bgEl(bg) { return bgTemplate(bg); }

  _boxEl(item, index, config, design) {
    const delay = index * (parseInt(this.animeQueue) || 200) + "ms";
    return html`
      <web-box
        .data=${item}
        .makes=${config.makes}
        .groupCol=${config.groupCol}
        .groupRow=${config.groupRow}
        .groupJustify=${config.groupJustify}
        .groupStyle=${config.groupStyle}
        .mainColors=${config.mainColors || this._config.mainColors || this.mainColors}
        .textColor=${this.textColor  || config.textColor}
        .stys=${{ ...(config.stys || {}), animationDelay: delay, opacity: this._isVisible ? "" : "0" }}
        .bg=${config.bg}
        .anime=${this._isVisible ? config.anime || "fade-in-fwd" : ""}
        .responsive=${this.responsive}
        .theme=${this.theme}
        .lang=${this.lang}
        .ui=${design}
        .zoom=${this.zoom}
      ></web-box>
    `;
  }

  // ── Render modes ──────────────────────────────────────────────────────────

  // Whether a tier sub-config uses a list-mode key (cards/masonry/slider/steps/tabs/expansion)
  // vs. being a plain static block (rendered once via _boxEl). Shared predicate for the
  // mixed-tier / single-tier dispatch in _renderTiers().
  _isListBlock(t) { return !!(t.masonry || t.cards || t.slider || t.steps || t.tabs || t.expansion); }

  // Renders 1 sub-config's list-mode content — shared by the mixed-tier stacking path and the
  // single-purpose tier path in _renderTiers() so both stay in sync. Returns null when `t`
  // carries no list-mode key (caller falls back to a static block or the default multi-repeat path).
  _renderTierBlock(t, tItems, bgElParam, design) {
    if (t.masonry)   return this._comMasonryEl(t.masonry, t, tItems, '', design);
    if (t.cards)     return this._comCardsEl(t.cards, t, tItems, '', design);
    if (t.slider)    return this._comSliderEl(t.slider, t, tItems, '', design);
    if (t.steps)     return this._comStepsEl(this._toObj(t.steps), t, tItems, bgElParam, design);
    if (t.tabs)      return this._comTabsEl(this._toObj(t.tabs), t, tItems, bgElParam, design);
    if (t.expansion) return this._comExpansionEl(this._toObj(t.expansion), t, tItems, bgElParam, design);
    return null;
  }

  // Structured tiers: object tier = static block, array tier = cycling data items.
  // tiersCol[i] controls column span; tiersRow[i] controls row span (same rules as groupRow).
  _renderTiers(config, items, bgEl, design) {
    const tiersCol  = config.tiersCol  || [];
    const tiersRow  = config.tiersRow  || [];
    const tiersStys = config.tiersStys || [];
    return config.tiers.flatMap((tier, ti) => {
      const colDef   = tiersCol[ti] ?? 12;
      const col      = Array.isArray(colDef) ? colDef[0] : colDef;
      const rowCls   = this._rowCls(tiersRow[ti]);
      const cellStys = cssInline(tiersStys[ti] || {});
      const cellCls  = (c, r) => ['gi', `gi-col-${c}`, r].filter(Boolean).join(' ');

      if (Array.isArray(tier)) {
        const firstCfg = tier[0] || {};
        // All special modes share: one cell wrapper + inner element from a _com*El builder
        const cell = (inner) => html`<div class="${cellCls(col, rowCls)}" style="${cellStys}">${inner}</div>`;

        // Mixed tier (>1 sub-config, at least one is a list block) — stacks a static block
        // (rendered once from items[0], eg. a header) together with a list block (cards/
        // masonry/slider/steps/tabs/expansion) inside ONE cell, sharing ONE wrapBg so the
        // whole group reads as 1 card instead of being split across separate tiers.
        if (tier.length > 1 && tier.some(t => this._isListBlock(t))) {
          const wrapBgCfg = tier.find(t => t.wrapBg)?.wrapBg;
          const wrapBgEl  = wrapBgCfg ? this._bgEl(wrapBgCfg) : '';
          const blocks = tier.map(t => {
            const tItems = t.dataKey ? (items[0]?.[t.dataKey] ?? []) : items;
            // wrapBg đã hoist ra ngoài (wrapBgEl phía trên) — strip khỏi sub-config để
            // _renderTierBlock (qua _comCardsEl) không tự render lại thêm lần nữa.
            return this._isListBlock(t)
              ? this._renderTierBlock({ ...t, wrapBg: null }, tItems, '', design)
              : this._boxEl(items[0] ?? {}, 0, t, design);
          });
          return cell(html`${wrapBgEl}${blocks}`);
        }

        // `dataKey` (opt-in, tier-level) — nguồn item của tier này KHÔNG phải top-level `items`
        // (danh sách record thật của section) mà là 1 field mảng NẰM TRONG record đầu tiên, vd
        // `dataKey: 'cards'` đọc `items[0].cards` — dùng khi section chỉ có ĐÚNG 1 record editable
        // (single mode ở svc-admin.js) nhưng tier vẫn cần hiển thị nhiều item cùng lúc (checklist/
        // cards/slider…), xem docs/SCHEMA.rst — nested list nằm trong `meta.<key>` của record đó.
        // Không set thì giữ nguyên hành vi cũ: `items` = top-level (mỗi item = 1 record riêng,
        // dùng cho section thật sự nhiều record như team/testimonials khi KHÔNG ở single mode).
        const tierItems = firstCfg.dataKey ? (items[0]?.[firstCfg.dataKey] ?? []) : items;

        // In tiers context each tier owns its own bg; section bgEl chỉ truyền cho steps/tabs/
        // expansion (masonry/cards/slider tự lo bg riêng qua itemCfg.bg/wrapBg — xem _renderTierBlock).
        const single = this._renderTierBlock(firstCfg, tierItems, bgEl, design);
        if (single) return cell(single);

        // Default: each sub-config renders all items as separate grid cells
        const colArr = Array.isArray(colDef) ? colDef : [colDef];
        return tier.flatMap((tierCfg, ci) => {
          const itemCol  = colArr[ci % colArr.length];
          const cfgBgEl  = tierCfg.bg ? this._bgEl(tierCfg.bg) : '';
          return tierItems.map((item, ii) => html`
            <div class="${cellCls(itemCol, this._rowCls(tiersRow[ti], ci))}" style="${cellStys}">${cfgBgEl}${this._boxEl(item, ii, tierCfg, design)}</div>
          `);
        });
      }

      // Static object tier — renders once using data[0] (falls back to {} when there's no
      // record yet, e.g. a brand-new section) so `bit`/`bit: 'meta.x'` bindings on a static
      // tier resolve real content instead of always rendering blank.
      const tierBgEl = tier.bg ? this._bgEl(tier.bg) : '';
      return html`
        <div class="${cellCls(col, rowCls)}" style="${cellStys}">${tierBgEl}${this._boxEl(items[0] ?? {}, 0, tier, design)}</div>
      `;
    });
  }

  // Masonry grid — items flow into a CSS column layout
  _renderMasonry(config, items, bgEl, design) {
    const gap   = this.stysWrap?.gap ?? this.stysWrap?.columnGap ?? null;
    const style = gap ? `--masonry-gap:${gap}` : "";
    return html`
      <div class="gi-masonry gi-masonry-${this._colDef(this.col || 3)} ${this._respCls}" style="${style}">
        ${items.map((item, i) => html`<div class="gi">${bgEl}${this._boxEl(item, i, config, design)}</div>`)}
      </div>
      ${this._sentinelEl()}
    `;
  }

  // Slider — wraps _comSliderEl in gi-wrap; itemCol from this.col prop
  _renderSlider(config, items, bgEl, design) {
    return html`
      <div class="gi-wrap ${this._respCls}" style="${cssInline(this.stysWrap)}">
        ${this._comSliderEl(config.slider || {}, config, items, bgEl, design, this._colDef(this.col || 12))}
      </div>
    `;
  }

  _renderSteps(config, items, bgEl, design) {
    return this._renderWrapped(this._comStepsEl(this._toObj(config.steps), config, items, bgEl, design));
  }

  _renderTabs(config, items, bgEl, design) {
    return this._renderWrapped(this._comTabsEl(this._toObj(config.tabs), config, items, bgEl, design));
  }

  _renderExpansion(config, items, bgEl, design) {
    return this._renderWrapped(this._comExpansionEl(this._toObj(config.expansion), config, items, bgEl, design));
  }

  // Default grid — items laid out in a CSS grid
  _renderGrid(config, items, bgEl, design) {
    const wrapCol = `gi gi-col-${this._colDef(this.col || 12)}`;
    return html`
      <div class="gi-wrap ${this._respCls}" style="${cssInline(this.stysWrap)};position:relative">
        ${items.map((item, i) => html`
          <div class="${wrapCol}">${bgEl}${this._boxEl(item, i, config, design)}</div>
        `)}
      </div>
      ${this._sentinelEl()}
    `;
  }

  // ── Inner element builders ────────────────────────────────────────────────
  // Each returns the raw inner element (no outer wrapper).
  // Used by both _renderTiers (wrapped in a tier cell div) and standalone _render* (wrapped in stysWrap div).

  // Nested masonry: all items in one gi-masonry container using CSS column layout.
  // masonryCfg: { col: 3, gap: '1rem' } | true (defaults col=3)
  _comMasonryEl(masonryCfg, itemCfg, items, _bgEl, design) {
    const col      = typeof masonryCfg === 'object' ? (masonryCfg.col || 3) : 3;
    const gap      = typeof masonryCfg === 'object' ? (masonryCfg.gap || null) : null;
    const style    = gap ? `--masonry-gap:${gap}` : "";
    const cardBgEl = itemCfg.bg ? this._bgEl(itemCfg.bg) : '';
    return html`
      <div class="gi-masonry gi-masonry-${col}" style="${style}">
        ${items.map((item, i) => html`<div class="gi">${cardBgEl}${this._boxEl(item, i, itemCfg, design)}</div>`)}
      </div>
    `;
  }

  // Nested mini-grid: all items in one gi-wrap, each item spanning cardsCfg.col columns.
  // itemCfg.bg (nếu có) lặp lại cho MỖI item — dùng khi mỗi item là 1 card riêng (vd
  // features/spatialCardWebApex.js). itemCfg.wrapBg (opt-in, khác hẳn) render ĐÚNG 1 LẦN bao
  // ngoài cả .gi-wrap — dùng khi cả danh sách cần chung 1 nền/card duy nhất (vd
  // benefits/modernCardCompare.js — checklist nhiều dòng, 1 card bao trọn). .gi-wrap đã sẵn
  // position:relative (web-box.css) nên <svc-underlay absolute> tự fill đúng khung này.
  _comCardsEl(cardsCfg, itemCfg, items, _bgEl, design) {
    const cardCol  = cardsCfg.col || 12;
    const gapStyle = cardsCfg.gap !== undefined ? `gap:${cardsCfg.gap};` : '';
    const padStyle = cardsCfg.padding !== undefined ? `padding:${cardsCfg.padding};` : '';
    const cardBgEl = itemCfg.bg ? this._bgEl(itemCfg.bg) : '';
    const wrapBgEl = itemCfg.wrapBg ? this._bgEl(itemCfg.wrapBg) : '';
    return html`
      <div class="gi-wrap" style="${gapStyle}${padStyle}">
        ${wrapBgEl}
        ${items.map((item, i) => html`
          <div class="gi gi-col-${cardCol}">${cardBgEl}${this._boxEl(item, i, itemCfg, design)}</div>
        `)}
      </div>
    `;
  }

  // Slider track. itemCol controls per-slide column span (standalone uses this.col; tiers use 12).
  _comSliderEl(s, itemCfg, items, bgEl, design, itemCol = 12) {
    const cardBgEl = itemCfg.bg ? this._bgEl(itemCfg.bg) : bgEl;
    return html`
      <web-slider class="gi-col-12" style="display:none"
        .autoplay=${s.autoplay} .marquee=${!!s.marquee} .reverse=${!!s.reverse} .loop=${s.loop}
        .mode=${s.mode} .vertical=${s.vertical} .slides=${s.slides || 12 / itemCol}
        .spacing=${s.spacing || 0} .nav=${s.nav} .dots=${s.dots} .origin=${s.origin}
        .effect=${s.effect || ''} ?blur=${!!s.blur} .maxHeight=${s.maxHeight || ''}
      >${items.map((item, i) => html`
        <div class="gi gi-col-${itemCol}">${cardBgEl}${this._boxEl(item, i, itemCfg, design)}</div>
      `)}</web-slider>
    `;
  }

  // Tab strip + named-slot panels. tabsCfg = the inner config object (config.tabs / firstCfg.tabs).
  _comTabsEl(tabsCfg, itemCfg, items, bgEl, design) {
    const tabs = this._comNavItems(items, tabsCfg);
    return html`
      <web-tabs
        .tabs=${tabs}
        .active=${tabsCfg.active || tabs[0]?.id || ""}
        .ui=${design}
        .theme=${this.theme}
        .mainColors=${this.mainColors}
        .align=${tabsCfg.align || "left"}
        .size=${tabsCfg.size || 'md'}
      >${this._comNavSlots(tabs, items, itemCfg, bgEl, design, tabsCfg.pack)}</web-tabs>
    `;
  }

  // Step indicator + named-slot panels. stepsCfg = the inner config object (config.steps / firstCfg.steps).
  _comStepsEl(stepsCfg, itemCfg, items, bgEl, design) {
    const steps = this._comNavItems(items, stepsCfg);
    return html`
      <web-steps
        .steps=${steps}
        .active=${stepsCfg.active || steps[0]?.id || ""}
        .ui=${design}
        .theme=${this.theme}
        .mainColors=${this.mainColors}
        .size=${stepsCfg.size || 'md'}
      >${this._comNavSlots(steps, items, itemCfg, bgEl, design, stepsCfg.pack)}</web-steps>
    `;
  }

  // Accordion + named-slot panels. expCfg.openFirst seeds the first panel open; expCfg.multiple allows multi-open.
  _comExpansionEl(expCfg, itemCfg, items, bgEl, design) {
    const panels = this._comNavItems(items, expCfg);
    return html`
      <web-expansion
        .panels=${panels}
        .active=${expCfg.active || (expCfg.openFirst ? panels[0]?.id || "" : "")}
        ?multiple=${!!expCfg.multiple}
        .ui=${design}
        .theme=${this.theme}
        .mainColors=${this.mainColors}
        .size=${expCfg.size || 'md'}
      >${this._comNavSlots(panels, items, itemCfg, bgEl, design, expCfg.pack)}</web-expansion>
    `;
  }

  // ── Nav helpers ───────────────────────────────────────────────────────────

  // Builds tab/step/panel descriptor array. Uses optional field-name mappings in cfg:
  //   cfg.idField / labelField / iconField / statusField → data field names
  //   cfg.pack > 1 → chunk items into groups; nav descriptor taken from first item of each chunk.
  _comNavItems(items, cfg = {}) {
    const pack = cfg.pack || 1;
    if (pack > 1) {
      const nav = [];
      for (let i = 0; i < items.length; i += pack) {
        const first = items[i];
        nav.push({
          id:     first[cfg.idField]    ?? `item-${nav.length}`,
          label:  first[cfg.labelField] ?? `Item ${nav.length + 1}`,
          icon:   first[cfg.iconField],
          status: first[cfg.statusField],
        });
      }
      return nav;
    }
    return items.map((item, i) => ({
      id:     item[cfg.idField]     ?? `item-${i}`,
      label:  item[cfg.labelField]  ?? `Item ${i + 1}`,
      icon:   item[cfg.iconField],
      status: item[cfg.statusField],
    }));
  }

  // Shared slot mapping for tabs/steps/expansion.
  //   pack = 1 (default): one slot per item — navItems[i].id → _boxEl(items[i]).
  //   pack > 1: one slot per chunk of `pack` items — renders a gi-wrap mini-grid (col = 12/pack).
  _comNavSlots(navItems, items, cfg, bgEl, design, pack = 1) {
    if (pack > 1) {
      const col       = Math.round(12 / pack);
      const chunks    = [];
      for (let i = 0; i < items.length; i += pack) chunks.push(items.slice(i, i + pack));
      const cardBgEl  = cfg.bg ? this._bgEl(cfg.bg) : bgEl;
      return navItems.map((nav, i) => html`
        <div slot="${nav.id}">
          <div class="gi-wrap">
            ${(chunks[i] || []).map((item, ii) => html`
              <div class="gi gi-col-${col}">${cardBgEl}${this._boxEl(item, i * pack + ii, cfg, design)}</div>
            `)}
          </div>
        </div>
      `);
    }
    return navItems.map((nav, i) => html`
      <div slot="${nav.id}">${bgEl}${this._boxEl(items[i], i, cfg, design)}</div>
    `);
  }

  get _txt() { const d = this.txt ?? TXT_STD; return d[this.lang] ?? d.vi ?? {} }

  // ── Render ────────────────────────────────────────────────────────────────

  render() {
    const config = this._config;
    const design = config?.ui || this.ui;
    const items  = this._applyFilter(this.resData);
    const bg     = (this.bg && Object.keys(this.bg).length) ? this.bg : config.bg;
    const bgEl   = bg ? this._bgEl(bg) : '';

    // Priority: tiers → masonry → slider → tabs → steps → expansion → grid
    let body;
    if      (config.tiers?.length)                            body = html`<div class="gi-wrap ${this._respCls}" style="${cssInline({ ...(config.stys || {}), ...this.stysWrap })}">${this._renderTiers(config, items, bgEl, design)}</div>`;
    else if (this.masonry)                                    body = this._renderMasonry(config, items, bgEl, design);
    else if (config.slider    || this.list === "slider")      body = this._renderSlider(config, items, bgEl, design);
    else if (config.steps     || this.list === "steps")       body = this._renderSteps(config, items, bgEl, design);
    else if (config.tabs      || this.list === "tabs")        body = this._renderTabs(config, items, bgEl, design);
    else if (config.expansion || this.list === "expansion")   body = this._renderExpansion(config, items, bgEl, design);
    else                                                      body = this._renderGrid(config, items, bgEl, design);

    return html`${this._searchEl()}${body}`;
  }
}

if (!customElements.get("web-boxs")) customElements.define("web-boxs", WebBoxs);
