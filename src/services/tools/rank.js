// src/services/tools/rank.js
//
// Thứ tự thủ công kiểu Fractional Indexing — field `rank` (chuỗi base62: 'a0' < 'a1' < … < 'az' < 'b00' …).
// Chèn giữa 2 hàng chỉ sinh 1 khoá mới nằm giữa 2 khoá cũ → kéo-thả ghi đúng 1 row, không đánh số lại cả bảng.
//
//   rank != ''  hàng ƯU TIÊN — đứng đầu, theo rank tăng dần (so sánh chuỗi thô, KHÔNG localeCompare)
//   rank == ''  hàng TỰ ĐỘNG — sau nhóm ưu tiên, theo updated_at mới nhất trước (hàng vừa tạo/sửa lên đầu nhóm này)
//
// Thuật toán khoá: rocicorp/fractional-indexing (MIT, David Greenspan) — phần nguyên có độ dài theo ký tự đầu
// ('a' = 1 chữ số, 'b' = 2, … ; 'Z'/'Y'… cho khoá âm), phần thập phân không bao giờ kết thúc bằng '0'.

export const RANK_FIELD = 'rank';

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const ZERO = DIGITS[0];
const SMALLEST_INT = 'A' + ZERO.repeat(26);

function midpoint(a, b) {
    if (b != null && a >= b) throw new Error(`${a} >= ${b}`);
    if (a.slice(-1) === ZERO || (b && b.slice(-1) === ZERO)) throw new Error('trailing zero');
    if (b) {
        // bỏ tiền tố chung (a đệm '0' khi ngắn hơn)
        let n = 0;
        while ((a[n] || ZERO) === b[n]) n++;
        if (n > 0) return b.slice(0, n) + midpoint(a.slice(n), b.slice(n));
    }
    const da = a ? DIGITS.indexOf(a[0]) : 0;
    const db = b != null ? DIGITS.indexOf(b[0]) : DIGITS.length;
    if (db - da > 1) return DIGITS[Math.round(0.5 * (da + db))];
    if (b && b.length > 1) return b.slice(0, 1);
    return DIGITS[da] + midpoint(a.slice(1), null);
}

function intLength(head) {
    if (head >= 'a' && head <= 'z') return head.charCodeAt(0) - 97 + 2;
    if (head >= 'A' && head <= 'Z') return 90 - head.charCodeAt(0) + 2;
    throw new Error(`invalid rank head: ${head}`);
}

function intPart(key) {
    const len = intLength(key[0]);
    if (len > key.length) throw new Error(`invalid rank: ${key}`);
    return key.slice(0, len);
}

function validate(key) {
    if (key === SMALLEST_INT) throw new Error(`invalid rank: ${key}`);
    const i = intPart(key);
    if (key.slice(i.length).slice(-1) === ZERO) throw new Error(`invalid rank: ${key}`);
}

function incrementInt(x) {
    const [head, ...digs] = x.split('');
    let carry = true;
    for (let i = digs.length - 1; carry && i >= 0; i--) {
        const d = DIGITS.indexOf(digs[i]) + 1;
        if (d === DIGITS.length) digs[i] = ZERO;
        else { digs[i] = DIGITS[d]; carry = false; }
    }
    if (!carry) return head + digs.join('');
    if (head === 'Z') return 'a' + ZERO;
    if (head === 'z') return null;
    const h = String.fromCharCode(head.charCodeAt(0) + 1);
    if (h > 'a') digs.push(ZERO); else digs.pop();
    return h + digs.join('');
}

function decrementInt(x) {
    const [head, ...digs] = x.split('');
    let borrow = true;
    for (let i = digs.length - 1; borrow && i >= 0; i--) {
        const d = DIGITS.indexOf(digs[i]) - 1;
        if (d === -1) digs[i] = DIGITS.slice(-1);
        else { digs[i] = DIGITS[d]; borrow = false; }
    }
    if (!borrow) return head + digs.join('');
    if (head === 'a') return 'Z' + DIGITS.slice(-1);
    if (head === 'A') return null;
    const h = String.fromCharCode(head.charCodeAt(0) - 1);
    if (h < 'Z') digs.push(DIGITS.slice(-1)); else digs.pop();
    return h + digs.join('');
}

/** Khoá nằm giữa a và b (null = không có cận) — rankBetween(null, null) = 'a0'. Ném lỗi nếu a >= b / khoá hỏng. */
export function rankBetween(a, b) {
    if (a != null) validate(a);
    if (b != null) validate(b);
    if (a != null && b != null && a >= b) throw new Error(`${a} >= ${b}`);
    if (a == null) {
        if (b == null) return 'a' + ZERO;
        const ib = intPart(b), fb = b.slice(ib.length);
        if (ib === SMALLEST_INT) return ib + midpoint('', fb);
        if (ib < b) return ib;
        const res = decrementInt(ib);
        if (res == null) throw new Error('cannot decrement rank');
        return res;
    }
    if (b == null) {
        const ia = intPart(a), fa = a.slice(ia.length);
        const i = incrementInt(ia);
        return i == null ? ia + midpoint(fa, null) : i;
    }
    const ia = intPart(a), fa = a.slice(ia.length);
    const ib = intPart(b), fb = b.slice(ib.length);
    if (ia === ib) return ia + midpoint(fa, fb);
    const i = incrementInt(ia);
    if (i == null) throw new Error('cannot increment rank');
    return i < b ? i : ia + midpoint(fa, null);
}

/** n khoá tăng dần nằm giữa a và b. */
export function ranksBetween(a, b, n) {
    if (n <= 0) return [];
    if (n === 1) return [rankBetween(a, b)];
    if (b == null) {
        const out = [];
        for (let c = a; out.length < n;) out.push(c = rankBetween(c, null));
        return out;
    }
    if (a == null) {
        const out = [];
        for (let c = b; out.length < n;) out.unshift(c = rankBetween(null, c));
        return out;
    }
    const mid = Math.floor(n / 2);
    const c = rankBetween(a, b);
    return [...ranksBetween(a, c, mid), c, ...ranksBetween(c, b, n - mid - 1)];
}

const _time = (v) => (typeof v === 'number' ? v : Date.parse(v ?? '') || 0);

/** Comparator cho Array.sort — nhóm ưu tiên theo rank, rồi nhóm tự động theo updated_at (mới trước). */
export function compareRank(a, b) {
    const ra = a?.[RANK_FIELD] || '', rb = b?.[RANK_FIELD] || '';
    if (ra !== rb) {
        if (!ra) return 1;
        if (!rb) return -1;
        return ra < rb ? -1 : 1;
    }
    return _time(b?.updated_at) - _time(a?.updated_at) || _time(b?.created_at) - _time(a?.created_at);
}

/**
 * Đặt row `id` vào vị trí `at` của `rest` (danh sách ĐÃ sắp theo compareRank, không chứa row đó) → các patch
 * [{ id, rank }] cần ghi. Thả trong/ngay sau nhóm ưu tiên = 1 patch; thả xuống giữa nhóm tự động thì các hàng tự động
 * phía trên nó cũng được ghim (nếu không, sắp theo ngày sẽ đẩy nó về chỗ cũ). Khoá trùng/hỏng (2 máy ghi cùng lúc,
 * dữ liệu cũ) → đánh lại khoá cho cả đoạn ưu tiên.
 */
export function rankPlace(rest, id, at) {
    at = Math.max(0, Math.min(at, rest.length));
    let pinned = rest.findIndex(r => !r?.[RANK_FIELD]);
    if (pinned < 0) pinned = rest.length;
    const keyOf = (i) => rest[i]?.[RANK_FIELD] || null;
    try {
        if (at <= pinned) return [{ id, rank: rankBetween(keyOf(at - 1), at < pinned ? keyOf(at) : null) }];
        const keys = ranksBetween(keyOf(pinned - 1), null, at - pinned + 1);
        return [...rest.slice(pinned, at).map((r, i) => ({ id: r.id, rank: keys[i] })), { id, rank: keys.at(-1) }];
    } catch {
        const order = [...rest.slice(0, Math.max(pinned, at)).map(r => r.id)];
        order.splice(at, 0, id);
        const keys = ranksBetween(null, null, order.length);
        return order.map((rid, i) => ({ id: rid, rank: keys[i] }));
    }
}
