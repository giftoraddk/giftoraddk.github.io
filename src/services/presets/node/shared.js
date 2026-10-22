// src/services/presets/node/shared.js
//
// What every preset builds its nodes with. A node is plain config (service/models.js SvcNode); these only save typing.
// Any text a node shows may be { vi, en } — preset/mount.js says it in the page's language (services/tools/lingo.js).

// Who opens a panel — a node's `roles` (tool/access.js): signed-out visitors and plain 'user' accounts get a notice in
// the panel instead. 'admin' = Super Admin; a table name = any `{table}.*` role (svc-roles.js grants them); '*' = anyone
// signed in.
export const SIGNED_IN = ['*'];
export const ADMIN = ['admin'];

/**
 * A component panel. `load` imports the module that registers `tagName` — on the panel's first open, not with the
 * page (adopted/svc-overlay.js). The page adds `theme` / `lang` to `properties` (preset/index.js).
 */
export const component = (tagName, load, properties = {}, extra = {}) => ({ type: 'component', tagName, load, properties, ...extra });

/** A site framed in the panel — only for sites that allow it; the sandbox keeps it off this page's origin. */
export const site = (url, title) => ({
    type: 'iframe', url, title, sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox',
});

/** A panel that only says what to ask — for services whose site refuses to be framed. `title` / `example`: { vi, en }. */
export const askHere = (title, example) => ({
    type: 'content', title, content: {
        vi: `Hỏi thanh AI bên dưới, ví dụ “${example.vi}” — kết quả hiện ngay trong panel này.`,
        en: `Ask the AI bar below, e.g. “${example.en}” — the answer shows right in this panel.`,
    },
});

/** A public MCP server, reached through the llm Worker's relay (llm/worker/src/mcpRelay.ts) — their CORS won't let
 *  a browser call them directly. */
export const relay = (server) => `${import.meta.env.PUBLIC_LLM_URL}/v1/mcp/${server}`;

/** Places `nodes` in one group: the first one carries the tile's place / title / tints, the rest ride along. */
export const inGroup = (type, { x = 0, y = 0, title, tints } = {}, nodes) => nodes.map((n, i) => ({
    ...n,
    x: i ? 0 : x,
    y: i ? 0 : y,
    group: i ? { type } : { type, ...(title && { title }), ...(tints && { tints }) },
}));
