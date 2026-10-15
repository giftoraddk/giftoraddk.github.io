// src/packages/node/tool/text.js
//
// Small helpers the package shares — one copy each. No imports, so `node --test` loads it as it is.

/** Accents off, lower case: "Xóa", "Xoá", a decomposed "Lưu" and "Đ" read alike ('xoa', 'luu', 'd'). */
export const fold = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').toLowerCase();

/** One line, at most `n` characters ('…' where it was cut). */
export const clip = (value, n) => {
    const s = String(value ?? '').replace(/\s+/g, ' ').trim();
    return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};

/** A node's name as shown: its title, else its tooltip, else its id. */
export const titleOf = (n) => n?.title || n?.tooltip || n?.id || '';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const reducedMotion = () => Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
