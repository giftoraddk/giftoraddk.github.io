// src/packages/apex/tool/legacy-migrate.js
//
// OVERVIEW — one-time migration tool for porting astro-micro's old parallel-array
// section configs (tiers/tiersCol/tiersRow/groupCol/groupRow/groupJustify/groupStyle/
// makes) into the new recursive node schema (source/value/each/when/render/preset/
// props/layout/style/bg/children — see hook/DESIGN.rst). Real section ports
// (src/sections/<domain>/…) import it from here.
//
// NOT a runtime adapter: this never runs inside web-board/web-boxs/web-box/web-cell —
// astro-mega has no old-schema config left to support once a section is ported.

/** Bỏ field undefined/object rỗng — không đổi giá trị còn lại. */
export function compact(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v === undefined) continue;
        if (typeof v === 'object' && !Array.isArray(v) && v !== null && Object.keys(v).length === 0) continue;
        out[k] = v;
    }
    return out;
}

export function detectRenderMode(tierCfg) {
    return ['masonry', 'slider', 'steps', 'tabs', 'expansion', 'cards'].find(k => tierCfg[k]) ?? 'grid';
}

/** makes[i] (1 make = 1 leaf) → node lá schema mới. prefix = '$item.' bên trong each, '' khi tĩnh. */
export function normalizeMakes(makes, prefix) {
    return makes.map(m => {
        const { mode, stys, ...restOpt } = m.opt || {};
        const props = compact({ ...restOpt, ...m.ext });
        // org dạng field path (không phải URL/template) cũng phải đọc item khi nằm trong each
        if (prefix && typeof props.org === 'string' && /^[\w.]+$/.test(props.org)) props.org = prefix + props.org;
        return compact({
            source: m.bit ? prefix + m.bit : undefined,
            value: m.bitLocal,
            render: mode,
            style: stys,
            props,
        });
    });
}

/** Zip groupCol/groupRow/groupJustify/groupStyle/makes theo index → 1 container node mỗi group.
 * Số group THẬT = cfg.makes.length — khớp runtime cũ (web-box.js lặp theo makes.map, không phải
 * groupCol.map): vài file thật có groupCol/groupRow/groupStyle dư so với makes (leftover từ lúc
 * xóa bớt group, xem stats/modernStatsIntro.js Tier 0 groupCol có 3 phần tử nhưng makes chỉ có 1)
 * — lặp theo groupCol sẽ vừa sai vừa crash khi makes[i] thiếu. */
export function normalizeGroups(cfg, prefix) {
    return cfg.makes.map((makes, i) => compact({
        layout: compact({ col: cfg.groupCol[i], row: cfg.groupRow[i], justify: cfg.groupJustify[i] }),
        style: cfg.groupStyle[i],
        children: normalizeMakes(makes, prefix),
    }));
}

/** 1 sub-config dùng render-mode key (masonry/cards/slider/steps/tabs/expansion) → each-node,
 * dùng chung bởi nhánh array 1-phần-tử VÀ nhánh mixed-tier bên dưới. */
function convertListBlock(tierCfg) {
    const mode = detectRenderMode(tierCfg);
    return compact({
        each: tierCfg.dataKey || '$records',
        render: mode === 'grid' ? undefined : mode,
        style: tierCfg.stys,
        bg: tierCfg.bg,
        props: compact({ ...(mode === 'grid' ? {} : tierCfg[mode]), anime: tierCfg.anime, animeQueue: tierCfg.animeQueue }),
        children: normalizeGroups(tierCfg, '$item.'),
    });
}

export function isListBlock(t) { return !!(t.masonry || t.cards || t.slider || t.steps || t.tabs || t.expansion); }

/** 1 tier (Object tĩnh, Array 1 phần tử động, hoặc Array nhiều phần tử "mixed") → 1 node.
 * `tierCfg.stys`/`tierCfg.bg` (nhánh list) → `style`/`bg` của each-node — chạy qua per-item
 * (web-box.js's `_renderEach` lặp lại cho mỗi item), khớp `_boxEl(item,i,tierCfg,design)` cũ vốn
 * đọc `config.stys`/`config.bg` làm style/nền RIÊNG CỦA TỪNG ITEM (KHÔNG phải wrap 1 lần).
 * Mixed tier (>1 sub-config, ít nhất 1 cái là list block, vd benefits/modernCardCompare.js) —
 * mỗi sub-config vẫn tự convert (list → each-node, static → container render 1 lần), gộp lại
 * làm `children` của 1 container chung; `wrapBg` (đặt ở BẤT KỲ sub-config nào) trở thành `bg`
 * của container đó — render đúng 1 lần bao trọn, khớp `tier.find(t=>t.wrapBg)?.wrapBg` cũ. */
export function convertTier(tier, col, row) {
    if (Array.isArray(tier)) {
        if (tier.length > 1 && tier.some(isListBlock)) {
            const wrapBg = tier.find(t => t.wrapBg)?.wrapBg;
            const children = tier.map(t => isListBlock(t)
                ? convertListBlock(t)
                : compact({ style: t.stys, bg: t.bg, props: compact({ anime: t.anime, animeQueue: t.animeQueue }), children: normalizeGroups(t, '') }));
            return compact({ layout: compact({ col, row }), bg: wrapBg, children });
        }
        return compact({ ...convertListBlock(tier[0]), layout: compact({ col, row }) });
    }
    return compact({
        layout: compact({ col, row }),
        style: tier.stys,
        bg: tier.bg,
        props: compact({ anime: tier.anime, animeQueue: tier.animeQueue }),
        children: normalizeGroups(tier, ''),
    });
}

// tiersCol/tiersRow: có thể thiếu hẳn (mặc định col=12, không row class — xem web-boxs.js cũ's
// `tiersCol[ti] ?? 12` / `_rowCls`), và tiersCol[i] có thể tự là 1 array (vd `[12]`) — chỉ có ý
// nghĩa cho nhánh "nhiều sub-config cycle theo cột riêng", còn col của CHÍNH cell tier vẫn luôn
// là phần tử đầu (`Array.isArray(colDef) ? colDef[0] : colDef`), unwrap y hệt ở đây.
function unwrapTierDim(v) { return Array.isArray(v) ? v[0] : v; }

export function convertLegacyConfig(oldConfig) {
    const tiersCol  = oldConfig.tiersCol  || [];
    const tiersRow  = oldConfig.tiersRow  || [];
    const tiersStys = oldConfig.tiersStys || [];
    const children = oldConfig.tiers.map((tier, i) => {
        const node = convertTier(tier, unwrapTierDim(tiersCol[i]) ?? 12, unwrapTierDim(tiersRow[i]));
        const cellStys = tiersStys[i];
        if (!cellStys || !Object.keys(cellStys).length) return node;
        // tiersStys[i] style hóa CHÍNH cái cell div bọc ngoài — 1 tầng khác hẳn style/per-item
        // style của node bên trong (xem web-boxs.js cũ `cellStys` vs `_renderTierBlock`/`_boxEl`),
        // nên bọc thêm 1 container thay vì merge chung — giữ 2 tầng style tách bạch.
        const { layout, ...rest } = node;
        return compact({ layout, style: cellStys, children: [compact(rest)] });
    });
    return compact({ style: oldConfig.stys, bg: oldConfig.bg, children });
}
