// src/webs/bay/tools/ratelimit.js
// Token-bucket thuần, dùng chung cho mọi tầng rate-limit của bay (Firestore self-throttle +
// DataChannel per-peer). Không phụ thuộc gì domain — thuật toán generic.

/** @param {{capacity:number, refillPerSec:number}} opts */
export function createTokenBucket({ capacity, refillPerSec }) {
    const buckets = new Map() // key -> { tokens, last }

    return {
        /** true = còn token, đã trừ 1; false = vượt ngưỡng, KHÔNG trừ (caller tự quyết định
         *  drop/throw — bucket không tự làm gì khác ngoài đếm). */
        allow(key) {
            const now = Date.now()
            const b = buckets.get(key) ?? { tokens: capacity, last: now }
            const elapsed = Math.max(0, (now - b.last) / 1000) // clock có thể lùi (NTP/DST/resume) — không cho refill âm
            b.tokens = Math.min(capacity, b.tokens + elapsed * refillPerSec)
            b.last = now
            if (b.tokens < 1) { buckets.set(key, b); return false }
            b.tokens -= 1
            buckets.set(key, b)
            return true
        },
    }
}
