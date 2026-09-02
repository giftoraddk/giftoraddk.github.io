// Lit's default Boolean converter treats attribute *presence* as true (HTML boolean-attribute
// convention), so `table="false"` would resolve to `true`. This reads the explicit string value.
export const BOOL_ATTR = {
	fromAttribute: (value) => value !== null && value !== 'false' && value !== '0',
	toAttribute: (value) => (value ? 'true' : 'false'),
};

// ECharts' default CanvasRenderer bakes pixel colors at draw time and can't react to CSS custom
// properties afterward (unlike frappe-charts' SVG output) — colors must be resolved to concrete
// values up front and handed to `setOption` as plain strings.
export function readThemeColors(el) {
	const cs = getComputedStyle(el);
	const get = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
	return {
		text: get('--color-base-content', '#e5e7eb'),
		base200: get('--color-base-200', '#1f2937'),
		base300: get('--color-base-300', '#374151'),
	};
}

export function mainColorsArray(mainColors) {
	return (mainColors || '').split('|').map((c) => c.trim()).filter(Boolean);
}

// Same "must be a resolved concrete value, not a CSS var() reference" constraint as
// `readThemeColors` applies to the no-`mainColors` fallback palette too — a canvas `fillStyle`
// silently ignores `var(--color-primary)` (invalid value), it doesn't fall through to the
// variable's actual value like a DOM style property would.
const FALLBACK_COLOR_VARS = ['--color-primary', '--color-secondary', '--color-accent', '--color-info', '--color-warning'];
const FALLBACK_COLORS_HEX = ['#6c5ce7', '#00b894', '#fdcb6e', '#0984e3', '#e17055']; // last resort if the vars aren't defined at all

export function resolveFallbackColors(el) {
	const cs = getComputedStyle(el);
	const resolved = FALLBACK_COLOR_VARS.map((v) => cs.getPropertyValue(v).trim()).filter(Boolean);
	return resolved.length ? resolved : FALLBACK_COLORS_HEX;
}

// `option.dataset.source` (2D array: header row + data rows) doubles as the side table's data —
// this is the only data shape the `table` prop understands, by design (see svc-graph.js/svc-pie.js).
export function datasetTable(source) {
	if (!Array.isArray(source) || source.length < 2) return null;
	const [header, ...rows] = source;
	return { header, rows };
}

const AREA_OPACITY_STD = 0.45;
const BAR_OPACITY_STD = 0.75;

// In a mixed bar/area/line chart, ECharts stacks series by array order — a `line` with
// `areaStyle` placed after a `bar` paints its fill straight over the bar. Rather than requiring
// callers to order `series` just right, bars get a higher default `z` (drawn on top), a slightly
// translucent default fill (so they don't read as flat blocks), and any area fill gets a
// translucent default opacity too, so the two read as layered instead of competing.
// A series' own explicit `z`/`itemStyle.opacity`/`areaStyle.opacity` always wins over these defaults.
export function themedSeries(series) {
	if (!Array.isArray(series)) return series;
	return series.map((s) => ({
		...s,
		z: s.z ?? (s.type === 'bar' ? 3 : 2),
		...(s.type === 'bar' ? { itemStyle: { opacity: BAR_OPACITY_STD, ...s.itemStyle } } : {}),
		...(s.areaStyle ? { areaStyle: { opacity: AREA_OPACITY_STD, ...s.areaStyle } } : {}),
	}));
}

const SPLITLINE_OPACITY_STD = 0.2;
const SPLITLINE_COLOR_STD = '#888';

// ECharts' default splitLine (the horizontal/vertical grid lines) renders fully opaque, which
// reads as too heavy against a dark card. Applies a dim default — a caller's own `splitLine`
// (or its nested `lineStyle`) always wins over this. `axis` may be a single axis object, an array
// of axes (multi-axis charts), or undefined (chart types like pie that don't have one).
// Uses a fixed gray rather than a resolved theme color — computed `--color-base-300` values
// (e.g. oklch()/color-mix() strings) weren't reliably readable by ECharts' canvas renderer.
// `labelColor` (resolved `--color-base-content`) styles the axis tick labels, bolded by default
// so they stay legible against the dimmed grid lines.
export function themedAxis(axis, labelColor) {
	if (axis === undefined) return axis;
	const wasArray = Array.isArray(axis);
	const merged = (wasArray ? axis : [axis]).map((a) => ({
		...a,
		axisLabel: { color: labelColor, fontWeight: 500, ...a?.axisLabel },
		splitLine: {
			lineStyle: { color: SPLITLINE_COLOR_STD, opacity: SPLITLINE_OPACITY_STD, ...a?.splitLine?.lineStyle },
			...a?.splitLine,
		},
	}));
	return wasArray ? merged : merged[0];
}
