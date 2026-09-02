// src/sections/products/index.js
// Gom mọi config trong thư mục này thành 1 registry — dùng bởi svc-channel-sections.js (Loại
// giao diện "Sản phẩm") và có thể tái dùng ở nơi khác cần liệt kê mẫu hiển thị của domain này.
import { omitBg } from '@/services/helper.js';
import { config as cardBase } from './cardBase.js';
import { config as cardMaverick } from './cardMaverick.js';
import { config as cardBold } from './cardBold.js';
import { config as cardGlow } from './cardGlow.js';
import { config as cardMinimal } from './cardMinimal.js';
import { config as cardTicket } from './cardTicket.js';
import { config as cardFrame } from './cardFrame.js';
import { config as cardNeu } from './cardNeu.js';
import { config as cardPolaroid } from './cardPolaroid.js';

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
