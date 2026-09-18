// src/webs/llm/tools/server.js
//
// Single point of truth for which backend adapter `divisions`/`talks`/`know`/`rel` live on in this
// domain — 'DB_LLMD1' is registered by default in src/services/crud.js's adapter registry (backed
// by src/services/firestore.worker.js's D1WorkerAdapter, worker/). Every file in webs/llm that
// reads/writes these 4 tables imports this constant instead of hardcoding the string, same pattern
// as division/tools/mind-sync.js's MIND_SERVER.
export const LLM_DB = 'DB_LLMD1'
