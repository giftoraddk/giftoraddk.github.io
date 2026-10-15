// src/packages/llm/service/service.js
//
// Cửa bus của domain LLM — domain/trang khác điều khiển nhóm chat qua channel, không import svc-talk.
// <svc-talk> (cùng domain) gọi thẳng talkFor(sector) — không đi vòng qua bus để khỏi chạy trùng 2 lần.
import { registerHandler } from '@/services/core/bus.js'
import { LLM_CHANNELS } from './event.js'
import { talkFor } from './talk.js'

registerHandler(LLM_CHANNELS.SEND_MESSAGE, ({ text, sector }) => talkFor(sector).sendMessage(text))
registerHandler(LLM_CHANNELS.APPROVE_STEP, ({ jobId, sector }) => talkFor(sector).approve(jobId))
registerHandler(LLM_CHANNELS.RETRY_STEP, ({ jobId, sector }) => talkFor(sector).retry(jobId))
