// src/sections/product.js
//
// Demo registry cho pages/ui/product-style.astro + slider.astro — gom các section không thuộc
// spatial (xem ./spatial.js). Mỗi entry là module { hashtags, data, config }.
// `productCard` giữ tên cũ vì slider.astro đọc boxs.productCard.

// another — cards / products / slides
export * as productCard             from './another/products/base.js';
export * as productBold             from './another/products/bold.js';
export * as productGlow             from './another/products/glow.js';
export * as productMinimal          from './another/products/minimal.js';
export * as productMaverick         from './another/products/maverick.js';
export * as productTicket           from './another/products/ticket.js';
export * as productFrame            from './another/products/frame.js';
export * as productNeu              from './another/products/neu.js';
export * as productPolaroid         from './another/products/polaroid.js';
