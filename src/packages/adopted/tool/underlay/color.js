// src/webs/underlay/gl/color.js
// Pure color math — deliberately not imported from web-bg.js (domain isolation).

// `tint` may arrive as a CSS custom-property reference (vd 'var(--color-primary)') so
// section configs can theme blobs/particles off the live palette instead of a hardcoded
// hex (xem src/sections/benefits/modernCardCompare.js wrapBg tint). hexToHsl only ever
// understood #hex/rgb(), so an unresolved var() literal always fell through to its
// hardcoded default swatch — resolve it against `el`'s computed style first (custom
// properties inherit through Shadow DOM, so the host element sees the theme's value).
export function resolveTint(tint, el) {
    if (!tint || typeof tint !== 'string' || !tint.includes('var(')) return tint;
    const match = tint.match(/var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)/);
    if (!match) return tint;
    const [, varName, fallback] = match;
    const resolved = el ? getComputedStyle(el).getPropertyValue(varName).trim() : '';
    return resolved || fallback?.trim() || tint;
}

export function hexToHsl(hex) {
    if (!hex || typeof hex !== 'string') return { h: 230, s: 60, l: 65 };
    let r = 0, g = 0, b = 0;
    const c = hex.trim();
    if (c.startsWith('#')) {
        if (c.length === 4) {
            r = parseInt(c[1] + c[1], 16);
            g = parseInt(c[2] + c[2], 16);
            b = parseInt(c[3] + c[3], 16);
        } else {
            r = parseInt(c.substring(1, 3), 16);
            g = parseInt(c.substring(3, 5), 16);
            b = parseInt(c.substring(5, 7), 16);
        }
    } else if (c.startsWith('rgb')) {
        const m = c.match(/\d+/g);
        if (m) [r, g, b] = m.map(Number);
    } else {
        return { h: 230, s: 60, l: 65 };
    }
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            default: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb01(h, s, l) {
    h = (((h % 360) + 360) % 360) / 360;
    s = Math.min(1, Math.max(0, s / 100));
    l = Math.min(1, Math.max(0, l / 100));
    if (s === 0) return [l, l, l];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    return [hue2rgb(h + 1 / 3), hue2rgb(h), hue2rgb(h - 1 / 3)];
}

export const MAX_TOTAL = 7;

// Builds `total` (1-7) base swatches seeded from `tint` — the single source of color
// truth shared by both the WebGL particle palette and the CSS gradient-blob layer, so
// `total`/`colorful` always mean the same thing for either render path.
// total=1 always collapses to one swatch (mono) regardless of `colorful`.
// colorful=false (default): swatches stay on the seed hue, fanning out symmetrically
// above/below the seed lightness — a tonal range, ported from the old `mono: true`
// shading. The fan span itself grows with `total` (not just its step count), so
// total=7 is visibly a wider tonal ladder than total=3, not just finer-grained.
// colorful=true: swatches fan out to either side of the seed hue within an analogous
// arc (never the full hue wheel) — a blue tint leans into its teal/purple neighbors as
// `total` grows, staying "đồng điệu" (cohesive) instead of turning into a full rainbow.
// Arc half-width grows with swatch count, capped at ±100° at total=7.
const HUE_ARC_STEP = 16;  // degrees of extra half-arc per additional swatch
const HUE_ARC_CAP  = 100; // max half-arc width, degrees

const LIGHT_SPAN_STEP = 7;  // lightness points of extra half-span per additional swatch
const LIGHT_SPAN_CAP  = 38; // max half-span width, lightness points

// Tonal hue fan — grows with `total` like the light span above, but bidirectional and
// asymmetric: e.g. for a pure blue seed (#0000ff, hue 240°) the two extremes at total=7
// land at ~hue 272° (violet, "left") and ~hue 205° (sky, "right").
const TONAL_HUE_STEP      = 6;  // degrees of fan growth per additional swatch
const TONAL_HUE_LEFT_CAP  = 32; // max lean toward the violet-ward neighbor (positive offset)
const TONAL_HUE_RIGHT_CAP = 35; // max lean toward the sky-ward neighbor (negative offset)

// Saturation ceiling applied throughout this file — keeps swatches a notch softer than
// raw HSL max (100) so the palette reads as tinted rather than neon/oversaturated. Lowered
// slightly (was 82) alongside the lightness floors below — high saturation + low lightness is
// what reads as "đậm tối" (heavy/dark), so softening the ceiling helps the brighter floors
// below actually land as bright instead of just dark-but-less-saturated.
const SAT_CAP = 76;

export function generateColorSet(tint, total, colorful) {
    const t = Math.max(1, Math.min(MAX_TOTAL, total || 1));
    const base = hexToHsl(tint);
    // Base swatch floored AND capped (was ceiling-only, Math.min(base.l, 52)) — a floor of 40
    // keeps a naturally dark seed tint (e.g. a pure #0000ff at l=50 already sat right at the old
    // ceiling) from anchoring the whole tonal fan low; ceiling raised 52→58 so the base itself
    // leans brighter too, matching the "thiên về sáng" (lean bright) direction of the whole file.
    const swatches = [{ h: base.h, s: Math.min(SAT_CAP, Math.max(base.s, 18)), l: Math.min(base.l, 54) }];
    // const swatches = [{ h: base.h, s: Math.min(SAT_CAP, Math.max(base.s, 18)), l: Math.min(Math.max(base.l, 40), 58) }];
    for (let i = 1; i < t; i++) {
        let h, s, l;
        if (!colorful) {
            const n = t - 1; // additional swatches beyond the base tint
            const span = Math.min(LIGHT_SPAN_CAP, LIGHT_SPAN_STEP * n);
            // Same fan-out shape as the hue arc below, just applied to lightness —
            // span grows with `total` so more colors means a visibly wider tonal ladder.
            const lightOffset = (n === 1 ? span * 0.6 : -span + (2 * span * (i - 1)) / (n - 1))
                + (Math.random() * 10 - 5);
            // The tonal family isn't perfectly flat on one hue either — swatches fan
            // out bidirectionally around the seed hue (violet-ward on one side,
            // sky-ward on the other), growing with `total` but capped small so it
            // reads as "nghiêng nhẹ" (a slight lean), not a second hue family.
            const rawFrac = n === 1 ? -0.6 : -1 + (2 * (i - 1)) / (n - 1); // -1..1
            const leanCap = rawFrac >= 0 ? TONAL_HUE_LEFT_CAP : TONAL_HUE_RIGHT_CAP;
            const growth = Math.min(1, (TONAL_HUE_STEP * n) / Math.max(TONAL_HUE_LEFT_CAP, TONAL_HUE_RIGHT_CAP));
            const hueLean = rawFrac * leanCap * growth + (Math.random() * 4 - 2);
            h = (base.h + hueLean + 360) % 360;
            s = Math.min(SAT_CAP, base.s + (Math.random() * 16 - 8));
            // Floor raised 18→32 — the old floor let the darkest rung of the tonal ladder
            // (total=7 especially, widest span) go nearly as dark as the background itself,
            // reading as "đậm tối" (heavy/dark) blobs instead of a bright tinted field.
            l = Math.min(92, Math.max(32, base.l + lightOffset));
        } else {
            const n = t - 1; // additional swatches beyond the base tint
            const half = Math.min(HUE_ARC_CAP, HUE_ARC_STEP * n);
            // n=1 → single swatch leaning moderately to one side; n>1 → evenly fan
            // across [-half, +half] so the spread grows outward from the seed hue.
            const hueOffset = (n === 1 ? half * 0.6 : -half + (2 * half * (i - 1)) / (n - 1))
                + (Math.random() * 12 - 6);
            h = (base.h + hueOffset + 360) % 360;
            s = Math.min(SAT_CAP, Math.max(38, base.s + (Math.random() * 20 - 10)));
            l = Math.min(90, Math.max(52, base.l + (Math.random() * 20 - 10)));
        }
        swatches.push({ h, s, l });
    }
    return swatches;
}

// CSS gradient-blob tints — thin alias over generateColorSet (blob callers think in
// terms of "tints", one per rendered blob).
export function generateHslTints(tint, total, colorful) {
    return generateColorSet(tint, total, colorful);
}

// Returns a Float32Array of length count*3 — one RGB triple (0..1) per particle, baked
// once at buffer-build time (color never changes per-frame in the shader). Particles
// sample from the same `total`-swatch set the gradient-blob layer uses, each with a
// small extra per-particle jitter so the field reads as organic, not flat discrete dots.
export function generatePalette(tint, total, colorful, count) {
    const swatches = generateColorSet(tint, total, colorful);
    const out = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const sw = swatches[(Math.random() * swatches.length) | 0];
        const h = (sw.h + (Math.random() * 14 - 7) + 360) % 360;
        const s = Math.min(SAT_CAP, Math.max(32, sw.s + (Math.random() * 12 - 6)));
        // Floor raised 38→46 (same "lean bright" reasoning as generateColorSet's tonal
        // fan) — this is the LAST clamp before a color reaches the GPU, so it's what
        // actually decides how dark any single particle can render.
        const l = Math.min(92, Math.max(46, sw.l + (Math.random() * 14 - 7)));
        const [r, g, b] = hslToRgb01(h, s, l);
        out[i * 3] = r;
        out[i * 3 + 1] = g;
        out[i * 3 + 2] = b;
    }
    return out;
}
