// src/webs/pay/tools/render.js
//
// Template-fragment helpers dùng CHUNG giữa svc-pay.js và các svc-pay-order.js/-processing.js/
// -delivery.js con — tách khỏi tools/service.js (thuần business logic, KHÔNG Lit) để giữ ranh
// giới rõ: file này chỉ render, không gọi service.js/Firestore. Lit templates là hàm thuần, share
// được xuyên Shadow DOM boundary (chỉ CSS mới cần duplicate riêng mỗi file styles/*.css — xem
// docs/PAY.rst §3.1/§3.12).

import { html } from 'lit';
import { fmtPrice } from '@/services/helper.js';
import { parseHandler } from './service.js';

/** Flow fmtDateTime: ms -> "DD-MM-YYYY HH:mm:ss". */
export function fmtDateTime(ms) {
    if (!ms) return '';
    const d = new Date(ms);
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Flow fmtCountdown: ms -> "m:ss". */
export function fmtCountdown(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

// Hiện lại "ai đã xử lý" 1 field đã stamp (name/phone optional — không có thì fallback nhãn vai
// trò mặc định) — dùng bởi svc-pay.js (_rbPastMajorSummary) và svc-pay-processing.js/
// svc-pay-delivery.js. `field` chưa từng stamp (h.at === 0) -> không render gì.
export function handledByLine(metaFieldValue, fallbackLabel, handledByLabel) {
    const h = parseHandler(metaFieldValue);
    if (!h.at) return html``;
    const who = h.name ? [h.name, h.phone].filter(Boolean).join(' · ') : fallbackLabel;
    return html`
        <p class="handled-by">
            ${handledByLabel}: ${who}${h.note ? ` — ${h.note}` : ''} · ${fmtDateTime(h.at)}
        </p>`;
}

// Danh sách sản phẩm + tổng tiền — dùng bởi svc-pay.js (_rbOrderReadonlySummary, đọc invoice đã
// đóng băng) và svc-pay-order.js (panel 'placing' LIVE, đọc `_order` local). CSS `.order-items*`
// vẫn cần khai báo riêng ở mỗi styles/*.css (Shadow DOM không share CSS xuyên component).
export function orderItemsBlock(items, amount, txt, lang) {
    if (!items.length) return html`<p class="order-items-empty">${txt.orderItemsEmpty}</p>`;
    return html`
        <div class="order-items">
            ${items.map(it => html`
                <div class="order-item-row">
                    <span class="order-item-name">${it.qty}× ${it.name}</span>
                    <span class="order-item-price">${fmtPrice(Number(it.price ?? 0) * Number(it.qty ?? 1), lang)}</span>
                </div>`)}
            <div class="order-item-row order-item-total">
                <span>${txt.totalLabel}</span>
                <span>${fmtPrice(amount, lang)}</span>
            </div>
        </div>`;
}
