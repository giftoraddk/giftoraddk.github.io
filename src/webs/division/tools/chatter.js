// src/webs/division/tools/chatter.js
//
// Lớp "trò chuyện tự nhiên" phủ lên trên pipeline chuyên môn (tools/engine.js) — mỗi division
// không chỉ chạy pipeline khi được giao việc, mà còn tự nhiên trả lời mọi tin nhắn của sếp trong
// 1 nhóm chat chung (kiểu đồng nghiệp thật), TỰ QUYẾT ĐỊNH xem tin nhắn đó có phải là 1 yêu cầu
// công việc thật sự thuộc chuyên môn của mình hay không (isTask) và tự rút ra topic nếu có — xem
// svc-talk.js's _reactTurn().
import { generateJsonWithRetry } from './engine.js'

const LANG_NAMES = { vi: 'Vietnamese', en: 'English' }

function _buildChatterPrompt(division, recentMessages, message) {
    const fallbackLangName = LANG_NAMES[division.lang] || 'Vietnamese'
    const history = recentMessages.map(m => `${m.author}: ${m.content}`).join('\n') || '(chưa có gì trước đó)'
    const system = `You are the head of the "${division.title}" department at a company, chatting
casually with your boss inside a lighthearted internal group chat. Your department's specialty:
${division.description || division.title}.

Do THREE things:
1. Detect which language the boss's LATEST message is written in — "vi" (Vietnamese) or "en"
   (English). If the message is too short/ambiguous to tell (e.g. just an emoji or "ok"), fall
   back to ${fallbackLangName}.
2. Decide whether the boss's LATEST message is an actual WORK REQUEST that genuinely falls under
   your department's specialty (not small talk, greetings, or unrelated chit-chat). If it is,
   extract a short, concrete topic for it.
3. Write the reply in the language identified in step 1. Keep it to 1 short sentence: natural,
   warm, slightly playful, casual — like a real employee texting their boss, never a formal
   report. When replying in Vietnamese, always address the boss as "sếp", never "anh"/"chị"
   (gender unknown).
   - isTask true: reply with a confident, upbeat confirmation that you're starting the work right
     now. Never ask where/how/what to start with, never request more details — you already have a
     topic, so confirm and go, don't stall on a question.
   - isTask false: just reply naturally to the chit-chat, exactly as a real teammate would.

Do NOT show your reasoning, analysis, or thinking process — some models think out loud before
answering, but that habit must be suppressed here. The FIRST character of your entire response
must be "{". Output NOTHING before or after the JSON object.

Return EXACTLY 1 JSON OBJECT (no markdown, no code fence, no extra explanation):
{
  "lang": "vi" or "en",
  "reply": "short natural reply, written in the language named by \\"lang\\" above",
  "isTask": true or false,
  "topic": "short concrete topic if isTask is true, otherwise empty string"
}`
    const user = `Recent conversation:\n${history}\n\nBoss's latest message: ${message}`
    return { system, user }
}

/**
 * Gọi AI quyết định: câu trả lời tự nhiên (reply) + có phải việc thật thuộc chuyên môn không
 * (isTask) + topic rút ra được (nếu có). `recentMessages` — mảng {author, content} vài tin gần
 * nhất (cả sếp lẫn các phòng ban khác) để trả lời có ngữ cảnh, không lặp lại/lạc quẻ.
 *
 * maxTokens rộng rãi hơn mức "câu trả lời ngắn" thật sự cần (thường < 50 token) — 1 số model
 * free-tier là reasoning model, luôn in ra cả đoạn suy luận dài TRƯỚC khi tới JSON dù prompt đã
 * cấm; maxTokens quá nhỏ (vd 220) cắt cụt ngay giữa đoạn suy luận đó, JSON thật không kịp xuất
 * hiện -> JSON.parse luôn fail. 450 đủ chỗ cho cả đoạn suy luận ngắn lẫn JSON thật sự.
 */
export async function decideChatterReply(ai, division, recentMessages, message) {
    const { system, user } = _buildChatterPrompt(division, recentMessages, message)
    const obj = await generateJsonWithRetry(ai, {
        system, user, maxTokens: 450, temperature: 0.9,
        languageName: LANG_NAMES[division.lang] || 'Vietnamese',
        errMessage: 'invalid chatter response',
    })
    return {
        lang: typeof obj.lang === 'string' ? obj.lang.trim().toLowerCase() : '',
        reply: typeof obj.reply === 'string' ? obj.reply.trim() : '',
        isTask: !!obj.isTask,
        topic: typeof obj.topic === 'string' ? obj.topic.trim() : '',
    }
}
