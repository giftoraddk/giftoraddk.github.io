// Tăng cường phía client cho components/Shop/Shop.astro — mọi sản phẩm đã có sẵn trong HTML (data-* trên <li>, xem
// Card.astro), file này chỉ: lọc / sắp xếp / tìm trên DOM, đếm lại số của từng lựa chọn lọc (bỏ qua chính nhóm đó —
// faceted count), đồng bộ trạng thái lên query string (link chia sẻ được, F5 giữ nguyên), "Xem thêm", bottom sheet
// bộ lọc ở mobile và nút giỏ hàng (`cell-action` add-to-cart — <svc-pay> của CoreShop đang nghe).

// Dịp / ngân sách là link sang trang riêng (Filter.astro) — chỉ các nhóm checkbox dưới đây lọc trên trang.
type Group = 'tag' | 'color';
const GROUPS: Group[] = ['tag', 'color'];
const DESKTOP = '(min-width: 1024px)';

interface Row {
	el: HTMLElement;
	price: number;
	tag: string[];
	color: string[];
	rating: number;
	stock: boolean;
	time: number;
	feat: number;
	search: string;
}

interface State {
	q: string;
	sets: Record<Group, Set<string>>;
	min: number | null;
	max: number | null;
	rating: number;
	stock: boolean;
	sort: string;
}

// Bỏ dấu giống slugify() (services/tools/util.js) — data-search dựng bằng đúng hàm đó lúc build.
const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim();
const words = (s?: string) => (s ? s.split(' ').filter(Boolean) : []);
const digits = (s: string) => (s.replace(/\D/g, '') ? Number(s.replace(/\D/g, '')) : null);
const fmt = (n: number) => n.toLocaleString('vi-VN');
const isEn = () => document.documentElement.lang === 'en';
const t = (vi: string, en: string) => (isEn() ? en : vi);

function readRows(grid: HTMLElement | null): Row[] {
	if (!grid) return [];
	return [...grid.children].map((node) => {
		const el = node as HTMLElement;
		const d = el.dataset;
		return {
			el,
			price: Number(d.price) || 0,
			tag: words(d.tag),
			color: words(d.color),
			rating: Number(d.rating) || 0,
			stock: d.stock !== '0',
			time: Number(d.time) || 0,
			feat: Number(d.feat) || 0,
			search: d.search || '',
		};
	});
}

const SORTS: Record<string, (a: Row, b: Row) => number> = {
	featured: (a, b) => b.feat - a.feat || b.time - a.time,
	// Chưa có giá ("Liên hệ") luôn xuống cuối khi xếp giá
	'price-asc': (a, b) => (a.price || Infinity) - (b.price || Infinity),
	'price-desc': (a, b) => b.price - a.price,
	newest: (a, b) => b.time - a.time,
};

/** Row có khớp state không — `skip` bỏ qua 1 nhóm (đếm số cho chính các lựa chọn của nhóm đó). */
function matches(r: Row, s: State, tokens: string[], skip?: Group | 'price') {
	if (tokens.length && !tokens.every((tk) => r.search.includes(tk))) return false;
	for (const g of GROUPS) {
		if (g === skip || !s.sets[g].size) continue;
		if (!r[g].some((v) => s.sets[g].has(v))) return false;
	}
	if (skip !== 'price' && (s.min != null || s.max != null)) {
		if (!r.price) return false;
		if (s.min != null && r.price < s.min) return false;
		if (s.max != null && r.price > s.max) return false;
	}
	if (s.rating && r.rating < s.rating) return false;
	if (s.stock && !r.stock) return false;
	return true;
}

/**
 * Hàng cuộn ngang (thanh cuộn ẩn): touch cuộn sẵn; chuột — con lăn dọc đổi thành cuộn ngang (chỉ khi hàng còn cuộn được
 * theo hướng đó, hết thì trả lại cho trang) và kéo-để-cuộn (kéo quá 5px thì chặn click của nút bên dưới).
 * Gắn data-more-start / data-more-end theo vị trí cuộn cho CSS làm mờ mép.
 */
function hScroll(el: HTMLElement, signal: AbortSignal) {
	const on = { signal };
	const edges = () => {
		const max = el.scrollWidth - el.clientWidth;
		el.toggleAttribute('data-more-start', el.scrollLeft > 1);
		el.toggleAttribute('data-more-end', el.scrollLeft < max - 1);
	};
	el.addEventListener('scroll', edges, { passive: true, signal });
	const ro = new ResizeObserver(edges);
	ro.observe(el);
	signal.addEventListener('abort', () => ro.disconnect());
	edges();

	el.addEventListener('wheel', (e) => {
		if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // trackpad cuộn ngang sẵn
		const max = el.scrollWidth - el.clientWidth;
		if (max <= 0) return;
		const next = Math.min(max, Math.max(0, el.scrollLeft + e.deltaY));
		if (next === el.scrollLeft) return; // đã tới mép — để trang cuộn tiếp
		e.preventDefault();
		el.scrollLeft = next;
	}, { passive: false, signal });

	let startX = 0;
	let startLeft = 0;
	let pointer: number | null = null;
	let dragged = false;
	el.addEventListener('pointerdown', (e) => {
		if (e.pointerType !== 'mouse' || e.button !== 0 || el.scrollWidth <= el.clientWidth) return;
		pointer = e.pointerId;
		startX = e.clientX;
		startLeft = el.scrollLeft;
		dragged = false;
	}, on);
	el.addEventListener('pointermove', (e) => {
		if (e.pointerId !== pointer) return;
		const dx = e.clientX - startX;
		if (!dragged && Math.abs(dx) < 5) return;
		if (!dragged) { dragged = true; el.setAttribute('data-dragging', ''); el.setPointerCapture(e.pointerId); }
		el.scrollLeft = startLeft - dx;
	}, on);
	const end = () => { pointer = null; el.removeAttribute('data-dragging'); };
	el.addEventListener('pointerup', end, on);
	el.addEventListener('pointercancel', end, on);
	// Vừa kéo xong thì click (nhả chuột trên 1 nút) không phải là bấm nút
	el.addEventListener('click', (e) => { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, { capture: true, signal });
}

type Glide = HTMLElement & { images?: string[]; effect?: string; autoplay?: number };

/**
 * Card nhiều ảnh (.gs-media[data-glide]) → slideshow flipX (apex/web-glide.js) — cùng cách components/Catalog/Media.astro:
 * chỉ dựng khi card vào màn hình (card ẩn bởi lọc / "Xem thêm" không tải ảnh phụ), ra khỏi màn hình hoặc rê chuột vào card
 * thì tạm dừng; nhịp lệch ngẫu nhiên để các card không lật cùng lúc; prefers-reduced-motion → giữ ảnh tĩnh.
 */
async function mountGlides(root: HTMLElement, signal: AbortSignal) {
	const boxes = [...root.querySelectorAll<HTMLElement>('.gs-media[data-glide]')];
	if (!boxes.length || matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
	await import('@/packages/apex/web-glide.js');
	if (signal.aborted) return;

	const seen = new WeakSet<HTMLElement>(); // đang trong màn hình
	const hover = new WeakSet<HTMLElement>(); // đang rê chuột trên card
	const glideOf = (box: HTMLElement) => box.querySelector<Glide>('web-glide');
	const sync = (box: HTMLElement) => {
		const g = glideOf(box);
		if (g) g.autoplay = seen.has(box) && !hover.has(box) ? Number(box.dataset.ms) || 3600 : 0;
	};
	const mount = (box: HTMLElement) => {
		let images: string[] = [];
		try { images = JSON.parse(box.dataset.glide || '[]'); } catch { return; }
		const g = document.createElement('web-glide') as Glide;
		g.images = images;
		g.effect = 'flipX';
		g.autoplay = 0;
		g.setAttribute('aria-hidden', 'true'); // ảnh SSR (alt) + nút phóng to đã mô tả ảnh
		box.dataset.ms = String(3600 + Math.round(Math.random() * 900));
		box.insertBefore(g, box.querySelector('.gs-zoom'));
		box.dataset.ready = '';
	};

	const io = new IntersectionObserver((entries) => {
		for (const { target, isIntersecting } of entries) {
			const box = target as HTMLElement;
			if (isIntersecting) seen.add(box); else seen.delete(box);
			if (isIntersecting && !('ready' in box.dataset)) mount(box);
			sync(box);
		}
	}, { rootMargin: '160px' });
	for (const box of boxes) {
		io.observe(box);
		const card = box.closest<HTMLElement>('.gs-card');
		card?.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hover.add(box); sync(box); } }, { signal });
		card?.addEventListener('pointerleave', () => { hover.delete(box); sync(box); }, { signal });
	}
	signal.addEventListener('abort', () => io.disconnect());
}

export function initShop(root: HTMLElement) {
	const ac = new AbortController();
	const on = { signal: ac.signal };
	document.addEventListener('astro:before-swap', () => ac.abort(), { once: true });

	const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel);
	const $$ = <T extends Element = HTMLElement>(sel: string) => [...root.querySelectorAll<T>(sel)];

	const pageSize = Number(root.dataset.pageSize) || 24;
	const grid = $('[data-grid]');
	const rows = readRows(grid);
	const filter = $('[data-filter]');
	const main = $('[data-gs-main]');
	const backdrop = $('[data-filter-backdrop]');
	const opener = $<HTMLButtonElement>('[data-filter-open]');
	const qInput = $<HTMLInputElement>('[data-q]');
	const checks = $$<HTMLInputElement>('input[data-group]');
	const trends = $$<HTMLButtonElement>('[data-trend]');
	const sortBtns = $$<HTMLButtonElement>('[data-sort]');
	const ratingInputs = $$<HTMLInputElement>('input[name="gs-rating"]');
	const stockInput = $<HTMLInputElement>('[data-stock]');
	const range = $('[data-range]');
	const minInput = $<HTMLInputElement>('[data-price-min]');
	const maxInput = $<HTMLInputElement>('[data-price-max]');
	const minSlider = $<HTMLInputElement>('[data-range-min]');
	const maxSlider = $<HTMLInputElement>('[data-range-max]');
	const fill = $('[data-range-fill]');
	const lo = Number(range?.dataset.lo) || 0;
	const hi = Number(range?.dataset.hi) || 0;
	const more = $<HTMLButtonElement>('[data-more]');
	const empty = $('[data-empty]');
	const active = $('[data-active]');
	const activeList = $('[data-active-list]');
	const activeCount = $('[data-active-count]');

	// ── State ⇄ URL ──
	const params = new URLSearchParams(location.search);
	const list = (k: string) => new Set(words((params.get(k) || '').replace(/,/g, ' ')));
	const state: State = {
		q: params.get('q') || '',
		sets: { tag: list('tag'), color: list('color') },
		min: digits(params.get('min') || ''),
		max: digits(params.get('max') || ''),
		rating: Number(params.get('rating')) || 0,
		stock: params.get('stock') === '1',
		sort: SORTS[params.get('sort') || ''] ? params.get('sort')! : 'featured',
	};
	let shown = pageSize;

	function writeUrl() {
		const url = new URL(location.href);
		const set = (k: string, v: string | null) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
		set('q', state.q);
		for (const g of GROUPS) set(g, [...state.sets[g]].join(','));
		set('min', state.min != null ? String(state.min) : null);
		set('max', state.max != null ? String(state.max) : null);
		set('rating', state.rating ? String(state.rating) : null);
		set('stock', state.stock ? '1' : null);
		set('sort', state.sort !== 'featured' ? state.sort : null);
		history.replaceState(history.state, '', url);
	}

	const activeTotal = () =>
		GROUPS.reduce((n, g) => n + state.sets[g].size, 0) + (state.min != null || state.max != null ? 1 : 0) + (state.rating ? 1 : 0) + (state.stock ? 1 : 0) + (state.q ? 1 : 0);

	// ── Controls ← state ──
	function syncControls() {
		// So bản đã trim (state.q luôn trim) — so nguyên văn thì đang gõ "quà " sẽ bị ghi đè thành "quà", nuốt mất dấu cách.
		if (qInput && qInput.value.trim() !== state.q) qInput.value = state.q;
		for (const c of checks) c.checked = state.sets[c.dataset.group as Group].has(c.value);
		for (const b of trends) b.setAttribute('aria-pressed', String(state.sets.tag.has(b.dataset.trend!)));
		for (const b of sortBtns) b.setAttribute('aria-pressed', String(b.dataset.sort === state.sort));
		for (const r of ratingInputs) r.checked = Number(r.value) === state.rating;
		if (stockInput) stockInput.checked = state.stock;
		syncPrice();
	}

	function syncPrice() {
		if (!range) return;
		if (document.activeElement !== minInput && minInput) minInput.value = state.min != null ? fmt(state.min) : '';
		if (document.activeElement !== maxInput && maxInput) maxInput.value = state.max != null ? fmt(state.max) : '';
		const a = Math.min(Math.max(state.min ?? lo, lo), hi);
		const b = Math.max(Math.min(state.max ?? hi, hi), lo);
		if (minSlider) minSlider.value = String(a);
		if (maxSlider) maxSlider.value = String(b);
		if (fill && hi > lo) {
			fill.style.setProperty('--from', `${((a - lo) / (hi - lo)) * 100}%`);
			fill.style.setProperty('--to', `${((b - lo) / (hi - lo)) * 100}%`);
		}
	}

	// ── Active chips (textContent — không chèn HTML từ input người dùng) ──
	function chip(text: string, clear: () => void) {
		const b = document.createElement('button');
		b.type = 'button';
		b.className = 'gs-pill';
		b.textContent = text;
		b.setAttribute('aria-label', `${t('Bỏ lọc', 'Remove filter')}: ${text}`);
		b.addEventListener('click', () => { clear(); update(); });
		return b;
	}

	function renderActive() {
		if (!activeList || !active) return;
		const chips: HTMLButtonElement[] = [];
		if (state.q) chips.push(chip(`“${state.q}”`, () => { state.q = ''; }));
		for (const g of GROUPS) {
			for (const v of state.sets[g]) {
				const input = checks.find((c) => c.dataset.group === g && c.value === v);
				const label = (isEn() && input?.dataset.labelEn) || input?.dataset.label || v;
				chips.push(chip(label, () => state.sets[g].delete(v)));
			}
		}
		if (state.min != null || state.max != null) {
			const text = `${state.min != null ? fmt(state.min) : '0'}đ – ${state.max != null ? `${fmt(state.max)}đ` : '∞'}`;
			chips.push(chip(text, () => { state.min = null; state.max = null; }));
		}
		if (state.rating) chips.push(chip(t(`Từ ${state.rating} sao`, `${state.rating}+ stars`), () => { state.rating = 0; }));
		if (state.stock) chips.push(chip(t('Hàng có sẵn', 'In stock'), () => { state.stock = false; }));
		activeList.replaceChildren(...chips);
		active.hidden = chips.length === 0;
		const n = activeTotal();
		if (activeCount) { activeCount.hidden = n === 0; activeCount.textContent = String(n); }
		for (const b of $$('[data-clear-auto]')) b.hidden = n === 0;
	}

	// ── Áp bộ lọc lên DOM ──
	function apply() {
		const tokens = norm(state.q).split(' ').filter(Boolean);
		const order = [...rows].sort(SORTS[state.sort]);
		let visible = 0;
		for (const r of order) {
			grid?.appendChild(r.el); // đổi thứ tự DOM — giữ đúng thứ tự đọc / tab
			const hit = matches(r, state, tokens);
			r.el.toggleAttribute('data-miss', !hit);
			r.el.toggleAttribute('data-later', hit && visible >= shown);
			if (hit) visible++;
		}
		for (const el of $$('[data-count]')) el.textContent = String(visible);
		if (more) more.hidden = visible <= shown;
		if (empty) empty.hidden = visible > 0;

		// Faceted count: số sản phẩm nếu chọn thêm lựa chọn này (bỏ qua chính nhóm của nó)
		for (const c of checks) {
			const g = c.dataset.group as Group;
			const n = rows.filter((r) => r[g].includes(c.value) && matches(r, state, tokens, g)).length;
			const label = c.closest('label');
			const count = label?.querySelector('[data-facet-count]');
			if (count) count.textContent = String(n);
			label?.toggleAttribute('data-zero', n === 0 && !c.checked);
		}
	}

	function update(opts: { url?: boolean } = {}) {
		shown = pageSize;
		apply();
		syncControls();
		renderActive();
		if (opts.url !== false) writeUrl();
	}

	// ── Events ──
	for (const c of checks) {
		c.addEventListener('change', () => {
			const set = state.sets[c.dataset.group as Group];
			if (c.checked) set.add(c.value); else set.delete(c.value);
			update();
		}, on);
	}
	for (const b of trends) {
		b.addEventListener('click', () => {
			const v = b.dataset.trend!;
			if (state.sets.tag.has(v)) state.sets.tag.delete(v); else state.sets.tag.add(v);
			update();
		}, on);
	}
	for (const b of sortBtns) b.addEventListener('click', () => { state.sort = b.dataset.sort!; update(); }, on);
	for (const r of ratingInputs) r.addEventListener('change', () => { state.rating = Number(r.value) || 0; update(); }, on);
	stockInput?.addEventListener('change', () => { state.stock = stockInput.checked; update(); }, on);

	let qTimer = 0;
	qInput?.addEventListener('input', () => {
		clearTimeout(qTimer);
		qTimer = window.setTimeout(() => { state.q = qInput.value.trim(); update(); }, 200);
	}, on);

	// Giá: ô nhập (gõ xong / Enter) và thanh trượt (kéo — cập nhật liên tục, min không vượt max)
	let priceTimer = 0;
	const fromInputs = () => {
		const a = digits(minInput?.value || '');
		const b = digits(maxInput?.value || '');
		state.min = a != null && b != null && a > b ? b : a;
		state.max = a != null && b != null && a > b ? a : b;
		update();
	};
	for (const input of [minInput, maxInput]) {
		input?.addEventListener('input', () => {
			const n = digits(input.value);
			input.value = n != null ? fmt(n) : '';
			clearTimeout(priceTimer);
			priceTimer = window.setTimeout(fromInputs, 500);
		}, on);
		input?.addEventListener('change', () => { clearTimeout(priceTimer); fromInputs(); }, on);
	}
	const fromSliders = (edge: 'min' | 'max') => {
		let a = Number(minSlider!.value);
		let b = Number(maxSlider!.value);
		if (a > b) { if (edge === 'min') a = b; else b = a; }
		state.min = a <= lo ? null : a;
		state.max = b >= hi ? null : b;
		update();
	};
	minSlider?.addEventListener('input', () => fromSliders('min'), on);
	maxSlider?.addEventListener('input', () => fromSliders('max'), on);

	const clearAll = () => {
		state.q = '';
		for (const g of GROUPS) state.sets[g].clear();
		state.min = state.max = null;
		state.rating = 0;
		state.stock = false;
		update();
	};
	for (const b of $$('[data-clear]')) b.addEventListener('click', clearAll, on);

	more?.addEventListener('click', () => { shown += pageSize; apply(); }, on);

	mountGlides(root, ac.signal);

	// ── Ảnh lớn: 1 <web-lightbox> chung cho mọi card, tải component ở lần bấm đầu ──
	let lightbox: (HTMLElement & { show: (images: string, index?: number, alt?: string) => void }) | null = null;
	grid?.addEventListener('click', async (e) => {
		const zoom = (e.target as Element).closest<HTMLElement>('[data-zoom]');
		if (!zoom?.dataset.zoom) return;
		e.preventDefault();
		await import('@/packages/apex/web-lightbox.js');
		if (!lightbox) {
			lightbox = document.createElement('web-lightbox') as typeof lightbox;
			root.appendChild(lightbox!);
		}
		lightbox!.show(zoom.dataset.zoom, 0, zoom.dataset.alt || '');
	}, on);

	// ── Giỏ hàng ──
	grid?.addEventListener('click', (e) => {
		const btn = (e.target as Element).closest<HTMLButtonElement>('[data-cart]');
		if (!btn) return;
		let info: Record<string, unknown>;
		try { info = JSON.parse(btn.dataset.cart || '{}'); } catch { return; }
		document.dispatchEvent(new CustomEvent('cell-action', { detail: { action: 'add-to-cart', info } }));
		btn.classList.add('is-added');
		const label = btn.querySelector('[data-cart-text]');
		const prev = label?.innerHTML;
		if (label) label.textContent = t('Đã thêm', 'Added');
		window.setTimeout(() => { btn.classList.remove('is-added'); if (label && prev != null) label.innerHTML = prev; }, 1600);
	}, on);

	for (const row of $$('[data-hscroll]')) hScroll(row, ac.signal);

	// ── Bottom sheet bộ lọc (mobile) ──
	const wrap = document.getElementById('main-wrap');
	const desktop = matchMedia(DESKTOP);
	function setOpen(open: boolean) {
		if (!filter) return;
		if (open && desktop.matches) return;
		filter.toggleAttribute('data-open', open);
		filter.setAttribute('role', open ? 'dialog' : 'complementary');
		if (open) filter.setAttribute('aria-modal', 'true'); else filter.removeAttribute('aria-modal');
		if (backdrop) backdrop.hidden = !open;
		if (main) main.inert = open;
		opener?.setAttribute('aria-expanded', String(open));
		if (wrap) wrap.style.overflow = open ? 'hidden' : '';
		if (open) filter.querySelector<HTMLElement>('[data-filter-close]')?.focus();
		else opener?.focus({ preventScroll: true });
	}
	opener?.addEventListener('click', () => setOpen(true), on);
	backdrop?.addEventListener('click', () => setOpen(false), on);
	for (const b of $$('[data-filter-close]')) b.addEventListener('click', () => setOpen(false), on);
	document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && filter?.hasAttribute('data-open')) setOpen(false); }, on);
	desktop.addEventListener('change', () => { if (desktop.matches && filter?.hasAttribute('data-open')) setOpen(false); }, on);

	// Đổi ngôn ngữ (BtnLang đổi <html lang>) → dựng lại chip theo ngôn ngữ mới
	const langObserver = new MutationObserver(renderActive);
	langObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
	ac.signal.addEventListener('abort', () => langObserver.disconnect());

	update({ url: false });
}
