// src/packages/node/preset/sector.js
//
// AI-<Sector> — one group per sector (D3): its Consult (the guest chat, <svc-aide division=<sector>.consult>), its
// Secretary (the boss's group chat, <svc-talk sector>) and one node per department (<svc-fn division>). The group tile
// shows at once from llm/tool/sectors.js; the Secretary + departments follow once GET /v1/fn/sectors answers, since
// whether hubs may use the sector yet (`released`) and each department's face come from the Worker. No expertise is
// ever in the bundle — only ids, names and icons.
//   · Every node is an AI <svc-ask> talks to (`chat`): a question goes to Consult, a topic to one department, and a
//     command to do the whole job or make a plan to the Secretary — the LEAD (`chat.lead`), never straight to a
//     department. Each starts the work in its own panel.
//   · `layout: 'arc'` — no group tile: every node stands on its own and stays put, the departments on a U (the lower
//     half of a circle, its arms a little raised) with the Secretary at its centre and Consult above it — fitted to
//     what the canvas shows, a little below its middle (or centred on x / y when both are given). For a page given to
//     one sector (pages/system/[sector].astro). The Secretary's relay shows on the links: once it routes a task, each
//     department's job lights Secretary → department as it starts and back as its handoff comes in (sector-relay.js).
//     Default 'group': one AI-<Sector> tile.
//   · `trial: true` — trial mode (pages/system/[sector].astro): every node opens to anyone signed in, released or not,
//     and its panel gets `trial` (each request asks for X-Fn-Trial). The Worker decides and counts every use (llm
//     fn/trial.ts: one team task + one job per department per account and sector) — this only opens the door.
import { component, inGroup } from './shared.js';
import { fnApi } from '@/packages/llm/service/fn-api.js';
import { sectorFace, fnIcon, FN_ICONS, CONSULT_ICON, SECRETARY_ICON } from '@/packages/llm/tool/sectors.js';
import { watchRelay } from './sector-relay.js';

const aide = () => import('@/packages/llm/svc-aide.js');
const talk = () => import('@/packages/llm/svc-talk.js');
const fnPanel = () => import('@/packages/llm/svc-fn.js');

// Running departments: staff with a talks grant, or anyone signed in whose plan the tiers cover (preset/config.js).
// A sector not released yet is staff-only here too. Either way the Worker decides every call (active plan, released).
const WORKERS = ['talks', '*'];
const STAFF = ['talks'];
const SIGNED_IN = ['*']; // trial: any signed-in account (config-sector.js opens the tiers too)

export const sectorPresetId = (sector) => `ai-${sector}`;
export const secretaryNodeId = (sector) => `secretary-${sector}`; // was `coordinator-<sector>` (custom-nodes.js LEGACY_NODE_IDS)
export const consultNodeId = (sector) => `consult-${sector}`;
/** 'ecommerce.marketing' → 'fn-ecommerce-marketing' */
export const fnNodeId = (division) => `fn-${String(division).replace('.', '-')}`;

const ARC_RADIUS = { min: 170, max: 280 }; // Secretary → each department, in canvas px — as wide as the screen allows
const ARC_LIFT = Math.PI / 12; // each arm of the U rises 15° above the Secretary — a U, not a bowl
const ARC_LOW = 0.6; // the U's middle (arms → bottom) sits at 60% of the screen's height — a little below centre
const ARC_SIDE = 90; // room kept beside each arm for the node and its label
const CONSULT_RISE = 0.8; // Consult above the Secretary, this much of the radius
const HALF_NODE = 32; // svc-node NODE_SIZE / 2 — a spot here is a node's centre, its x / y its top-left corner

// Default tile places — ecommerce keeps the old AI-Powered spot, the others spread around it.
const PLACES = {
    ecommerce: { x: 720, y: 420 },
    education: { x: 420, y: 260 },
    fnb: { x: 1020, y: 240 },
    healthcare: { x: 420, y: 560 },
    realestate: { x: 760, y: 700 },
};

// A department's face: the name / picture an admin gave it (svc-division), else its base { vi, en } title — which the
// canvas re-says on a language switch — + the function icon.
const faceOf = (f) => {
    const title = f.name || f.title || f.id;
    return {
        title, tooltip: f.about || f.description || title,
        icon: fnIcon(f),
        iconFit: f.pics ? 'cover' : undefined,
    };
};

// Where a node sits: in the sector's tile, or (arc) centred on its own canvas spot, pinned there.
const placeOf = (sector, at) => (at
    ? { x: Math.round(at.x - HALF_NODE), y: Math.round(at.y - HALF_NODE), moving: false }
    : { group: { type: sectorPresetId(sector) } });

/** The U's centre + radius: fitted to what `flow` shows now (svc-node viewBox) — or centred on `fixed` { x, y }. */
function arcFrame(flow, fixed) {
    const box = flow.viewBox?.() ?? { x: 0, y: 0, width: 1200, height: 800 };
    const radius = Math.max(ARC_RADIUS.min, Math.min(ARC_RADIUS.max, box.width / 2 - ARC_SIDE, box.height * 0.42));
    if (fixed) return { ...fixed, radius };
    // The U spans its arms (≈ the centre's height) to its bottom (centre + radius) — that span's middle at ARC_LOW.
    return { x: box.x + box.width / 2, y: box.y + box.height * ARC_LOW - radius / 2, radius };
}

// Department i of n on the U: left arm → bottom → right arm (screen y grows downward, so sin > 0 is below the centre).
const arcSpot = ({ x, y, radius }, i, n) => {
    const span = Math.PI + 2 * ARC_LIFT;
    const a = n > 1 ? Math.PI + ARC_LIFT - (i * span) / (n - 1) : Math.PI / 2;
    return { x: x + radius * Math.cos(a), y: y + radius * Math.sin(a) };
};

const fnNode = (sector, f, roles, at, trial) => ({
    id: fnNodeId(f.id),
    ...faceOf(f),
    ...placeOf(sector, at),
    roles,
    chat: true, // <svc-ask>'s topic → a job here (svc-fn `command`)
    overlay: component('svc-fn', fnPanel, { embedded: true, division: f.id, ui: 'pastel', trial }, { title: f.name || f.title }),
});

const secretaryNode = (sector, roles, at, trial) => ({
    id: secretaryNodeId(sector), initials: 'AI', icon: SECRETARY_ICON,
    title: { vi: 'Thư ký', en: 'Secretary' },
    tooltip: { vi: 'Trợ lý AI toàn doanh nghiệp', en: 'Enterprise AI Assistant' },
    description: {
        vi: 'Giao việc cho cả công ty: Thư ký dựng bối cảnh, phân công phòng ban và theo dõi bàn giao',
        en: 'Hand work to the whole company: the Secretary frames it, routes it to the departments and tracks their handoffs',
    },
    ...placeOf(sector, at),
    roles,
    // <svc-ask>'s job → a message from the boss (svc-talk `command`). `lead`: it coordinates the departments — a command
    // for the whole job or a plan comes here, and the Secretary routes it on.
    chat: { lead: true },
    overlay: component('svc-talk', talk, { embedded: true, sector, ui: 'pastel', trial }),
});

/** @returns {import('./index.js').NodePreset} */
export function sectorPreset({ sector, x, y, layout = 'group', trial = false } = {}) {
    const face = sectorFace(sector);
    if (!face) throw new Error(`[node/preset/sector] unknown sector "${sector}" — add it to llm/tool/sectors.js`);
    const place = { ...PLACES[sector], ...(x != null && { x }), ...(y != null && { y }) };
    const type = sectorPresetId(sector);
    const arc = layout === 'arc';
    let frame = null; // the U — measured once, when the nodes are first laid out, so Consult and the rest agree
    // The Consult node anchors the tile — open to everyone once the sector is released (like the old Knowledge
    // assistant); before that its Worker answers staff only (or, in trial, anyone signed in), so the panel says so up front.
    const consult = {
        id: consultNodeId(sector), moving: false, icon: CONSULT_ICON,
        ...(!face.released && { roles: trial ? SIGNED_IN : STAFF }),
        title: { vi: 'Tư vấn', en: 'Consult' },
        tooltip: { vi: 'Trợ lý Tri thức Doanh nghiệp', en: 'Corporate Knowledge Assistant' },
        description: {
            vi: 'Trò chuyện với trợ lý AI trả lời từ kho tri thức của ngành: sản phẩm, dịch vụ, chính sách',
            en: 'Chat with the AI assistant that answers from this sector\'s knowledge base: products, services, policies',
        },
        chat: true, // <svc-ask>'s question → asked here (svc-aide `command`)
        // `embedded` — just the chat panel, sized to fill the popover (no FAB / popover of its own).
        overlay: component('svc-aide', aide, { embedded: true, division: `${sector}.consult`, ui: 'pastel', trial }),
    };
    return {
        id: type,
        title: face.title,
        icon: face.icon,
        nodes: ({ flow }) => {
            if (!arc) return inGroup(type, { ...place, title: face.title, tints: face.tints }, [consult]);
            frame = arcFrame(flow, x != null && y != null ? { x, y } : null);
            return [{ ...consult, ...placeOf(sector, { x: frame.x, y: frame.y - frame.radius * CONSULT_RISE }) }];
        },
        // The relay's hops (arc): a job out to each department, its handoff back — styles only, drawn while lit.
        edges: () => (arc ? Object.keys(FN_ICONS).flatMap((fn) => {
            const hub = secretaryNodeId(sector);
            const node = fnNodeId(`${sector}.${fn}`);
            return [
                { id: `${hub}-${node}`, source: hub, target: node, progress: 'package', progressIcon: 'ri:task-line' },
                { id: `${node}-${hub}`, source: node, target: hub, progress: 'dashed' },
            ];
        }) : []),
        setup: (ctx) => {
            if (arc) watchRelay({ flow: ctx.flow, sector, hub: secretaryNodeId(sector), nodeOf: fnNodeId });
            fnApi.sectors()
                .then((res) => {
                    if (!res.ok) throw new Error(res.message);
                    const s = res.data.find((x) => x.id === sector);
                    if (!s) return;
                    const roles = trial ? SIGNED_IN : s.released ? WORKERS : STAFF;
                    const fns = (s.functions ?? []).filter((f) => f.kind === 'pipeline' && f.status !== 'inactive');
                    ctx.addNodes([
                        secretaryNode(sector, roles, arc && frame, trial),
                        ...fns.map((f, i) => fnNode(sector, f, roles, arc && arcSpot(frame, i, fns.length), trial)),
                    ]);
                })
                .catch((err) => console.error(`[node/preset/sector] ${sector}:`, err));
        },
        events: ({ flow }) => ({
            // Renamed / new picture in a department's manager panel → its node follows.
            '*:division-change': ({ detail }) => {
                const d = detail.division;
                if (d?.id?.startsWith(`${sector}.`) && d.kind === 'pipeline') flow.updateNode(fnNodeId(d.id), faceOf({ ...d, fn: d.id.split('.')[1] }));
            },
        }),
    };
}
