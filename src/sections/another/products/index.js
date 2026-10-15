// src/sections/another/products/index.js
//
// Ported from astro-micro's src/sections/products/index.js — registry mọi card config sản phẩm
// (loại giao diện "Sản phẩm"). `key` giữ nguyên tên cũ (cardBase…) vì có thể đã lưu trong layout.
import { config as cardBase } from './base.js';
import { config as cardMaverick } from './maverick.js';
import { config as cardBold } from './bold.js';
import { config as cardGlow } from './glow.js';
import { config as cardMinimal } from './minimal.js';
import { config as cardTicket } from './ticket.js';
import { config as cardFrame } from './frame.js';
import { config as cardNeu } from './neu.js';
import { config as cardPolaroid } from './polaroid.js';

export const templates = [
    { key: 'cardBase', label: { vi: 'Thẻ sản phẩm', en: 'Product Card' }, config: cardBase },
    { key: 'cardMaverick', label: { vi: 'Thẻ sản phẩm (Phá cách)', en: 'Product Card (Maverick)' }, config: cardMaverick },
    { key: 'cardBold', label: { vi: 'Thẻ sản phẩm (Nổi bật)', en: 'Product Card (Bold)' }, config: cardBold },
    { key: 'cardGlow', label: { vi: 'Thẻ sản phẩm (Phát sáng)', en: 'Product Card (Glow)' }, config: cardGlow },
    { key: 'cardMinimal', label: { vi: 'Thẻ sản phẩm (Tối giản)', en: 'Product Card (Minimal)' }, config: cardMinimal },
    { key: 'cardTicket', label: { vi: 'Thẻ sản phẩm (Vé)', en: 'Product Card (Ticket)' }, config: cardTicket },
    { key: 'cardFrame', label: { vi: 'Thẻ sản phẩm (Khung kỹ thuật)', en: 'Product Card (Frame)' }, config: cardFrame },
    { key: 'cardNeu', label: { vi: 'Thẻ sản phẩm (Neumorphism)', en: 'Product Card (Neumorphism)' }, config: cardNeu },
    { key: 'cardPolaroid', label: { vi: 'Thẻ sản phẩm (Phân cực)', en: 'Product Card (Polaroid)' }, config: cardPolaroid },
];
