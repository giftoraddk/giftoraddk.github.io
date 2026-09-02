// src/services/telegram.js
//
// Generic Telegram Bot API client — pure transport, no knowledge of any domain (orders/invoices/
// etc). Any domain that wants to push a Telegram message calls `sendTelegramMessage(text)`, same
// tier as storager.js/helper.js (see docs/PAY.rst §1 — domains may only depend on this kind of
// shared pure infra, never on each other).

const [BOT_TOKEN, CHAT_ID] = (import.meta.env.PUBLIC_TG ?? '~').split('~');

/** Flow sendTelegramMessage: text -> POST to Telegram Bot API sendMessage. Best-effort — no
 *  BOT_TOKEN/CHAT_ID configured, or the request itself failing, both silently no-op (caller flows
 *  must never break because a notification failed to send). */
export async function sendTelegramMessage(text) {
    if (!BOT_TOKEN || !CHAT_ID || !text) return false;
    try {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT_ID, text }),
        });
        if (!res.ok) {
            const body = await res.text().catch(() => '');
            console.error('[telegram] sendMessage failed:', res.status, body);
            return false;
        }
        return true;
    } catch (err) {
        console.error('[telegram] sendMessage error:', err);
        return false;
    }
}
