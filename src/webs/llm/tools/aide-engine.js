// src/webs/llm/tools/aide-engine.js
//
// Single-turn "brain" for <svc-aide> — analogous to division/tools/sale-engine.js's
// decideSaleReply, but for a generic multi-domain knowledge assistant (law/product/medical/
// technical/finance/faq) rather than a sales bot: no lead-capture/phone-extraction/hotline logic
// (see svc-aide.js's header for why that's intentionally out of scope here). Reuses
// generateJsonWithRetry from THIS domain's own tools/engine.js (not division's).
import { generateJsonWithRetry } from './engine.js'

const LANG_NAMES = { vi: 'Vietnamese', en: 'English' }

const DEFAULT_ROLE = 'a knowledgeable, honest knowledge Q&A assistant'
const DEFAULT_PRINCIPLES = [
    'Answer only from the KNOWLEDGE below — never invent facts not present in it.',
    "If the knowledge doesn't cover the question, say so plainly and suggest what to ask instead — never guess.",
    'For law/medical/finance topics, note that this is general information, not professional advice.',
]

function _buildPersona(division) {
    const role = division?.meta?.role || DEFAULT_ROLE
    const principles = (division?.meta?.principles?.length ? division.meta.principles : DEFAULT_PRINCIPLES)
        .map((p, i) => `${i + 1}. ${p}`).join('\n')
    return `You are ${role}.\n\nPrinciples:\n${principles}`
}

function _buildAidePrompt(division, evidence, recentMessages, message, langName) {
    const persona = _buildPersona(division)
    const knowledge = evidence.length
        ? evidence.map(e => `TITLE: ${e.title}\nTYPE: ${e.type}${e.viaRelation ? ` (via ${e.viaRelation})` : ''}\nDESCRIPTION: ${e.description}`).join('\n---\n')
        : '(no matching knowledge found — say so honestly instead of guessing)'
    const history = recentMessages.map(m => `${m.author}: ${m.content}`).join('\n') || '(no prior messages)'
    const system = `${persona}

Detect which language the visitor's LATEST message is written in — "vi" (Vietnamese) or "en"
(English); if too short/ambiguous to tell, fall back to ${langName}. Answer in that language.

KNOWLEDGE (the ONLY source of truth for this reply):
${knowledge}

Do NOT show your reasoning, analysis, or thinking process — some models think out loud before
answering, but that habit must be suppressed here. The FIRST character of your entire response
must be "{". Output NOTHING before or after the JSON object.

Return EXACTLY 1 JSON OBJECT (no markdown, no code fence, no extra explanation):
{
  "lang": "vi" or "en",
  "reply": "the answer, written in the language named by \\"lang\\" above"
}`
    const user = `Recent conversation:\n${history}\n\nVisitor's latest message: ${message}`
    return { system, user }
}

/**
 * `evidence` — worker's `POST /v1/search` response (see svc-aide.js's `_dfPostGuest`), already
 * shortlisted for this message via Vectorize semantic search + `rel` expansion server-side.
 * `onStage(stage, attempt?)` — same 'retrieving'/'answering'/'retrying' UX contract as
 * division/tools/sale-engine.js's decideSaleReply, consumed by svc-aide.js for the "đang gõ..."
 * filler-text rotation.
 * Returns `{ lang, reply }` — deliberately no `sources` field asked of the AI (avoids trusting the
 * model to self-report citations accurately); svc-aide.js derives displayed sources directly from
 * `evidence` instead, which is strictly more reliable.
 */
export async function decideAideReply(ai, division, evidence, recentMessages, message, fallbackLang = 'vi', onStage) {
    onStage?.('retrieving')
    const langName = LANG_NAMES[fallbackLang] || 'Vietnamese'
    const { system, user } = _buildAidePrompt(division, evidence, recentMessages, message, langName)
    const obj = await generateJsonWithRetry(ai, {
        system, user, maxTokens: 700, temperature: 0.6,
        languageName: langName, errMessage: 'invalid aide response',
        onAttempt: attempt => onStage?.(attempt > 1 ? 'retrying' : 'answering', attempt),
    })
    return {
        lang: typeof obj.lang === 'string' ? obj.lang.trim().toLowerCase() : '',
        reply: typeof obj.reply === 'string' ? obj.reply.trim() : '',
    }
}
