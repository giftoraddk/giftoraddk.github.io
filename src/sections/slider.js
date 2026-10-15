// src/sections/slider.js
//
// Demo registry cho pages/ui/slider.astro — biến 1 card config (each '$records', không render)
// thành slider: root node nhận render 'slider' + props web-slider (xem web-box _eachSlider).
// Mỗi entry là { title, hashtags, data, config } như các section khác.

import * as productCard from './another/products/base.js';

// Nhân bản record để slider đủ slide; id mới để không trùng giữa các bản sao.
const repeat = (data, times) =>
	Array.from({ length: times }, (_, n) => data.map((r, i) => ({ ...r, id: n * data.length + i + 1 }))).flat();

const toSlider = (mod, title, slider, times = 6) => ({
	title,
	hashtags: [...new Set([...(mod.hashtags ?? []), 'slider'])],
	data: repeat(mod.data, times),
	config: {
		...mod.config,
		render: 'slider',
		props: { ...mod.config.props, ...slider },
	},
});

export const productSimple = toSlider(productCard, 'Slider Simple Product Card (4 slides, autoplay 5s, loop, nav, dots)', {
	autoplay: 5000, loop: true, slides: 4, spacing: 20, nav: true, dots: true,
});

export const productCenter = toSlider(productCard, 'Slider Center Product Card (2.5 slides, autoplay 6s, loop, nav, dots)', {
	autoplay: 6000, loop: true, slides: 2.5, origin: 'center', spacing: 20, nav: true, dots: true,
});

export const productNavOnly = toSlider(productCard, 'Slider Nav Only Product Card (2 slides, loop, nav)', {
	loop: true, slides: 2, spacing: 20, nav: true, dots: false,
});

export const productDotsOnly = toSlider(productCard, 'Slider Dots Only Product Card (2 slides, loop, dots)', {
	loop: true, slides: 2, spacing: 20, nav: false, dots: true,
});
