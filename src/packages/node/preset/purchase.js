// src/packages/node/preset/purchase.js
//
// Purchase — pick a plan in 'plans' → a progress link runs to 'checkout' → its panel opens on that plan. An idle or
// cancelled checkout points back at the plans.
//   · <svc-ask> may operate the plans panel (`agent`): "buy me the $9 plan" → AI picks the plan and its billing period
//     there, and the checkout opens on it — paying stays yours (PayPal), and so does signing in.
//   · A sign-in that reloads the page (Google, the sign-up email link) drops the open checkout: <svc-purchase> keeps the
//     plan it waited on (purchase/tool/pending-checkout.js) and this preset opens the checkout on it again on the next
//     load — its sign-in form then completes the session and the checkout carries on.
// Group Purchase System: 'checkout' (<svc-purchase>, everyone) + 'manager' (<svc-purchase-manager mode="manage">, anyone
// signed in: a buyer's own plan — or, for Super Admin / a `billing.*` role, every plan sold). The plans node stays on its
// own; its link and the checkout panel anchor to the checkout's cell in the tile. `grouped: false` — no tile: plans,
// checkout and manager are three small nodes, each at its own place (`manager` = where; pages/system/[sector].astro).
import { SIGNED_IN, component, inGroup } from './shared.js';
import { takePendingCheckout } from '@/packages/purchase/tool/pending-checkout.js';

const HOP_MS = 1200; // the checkout panel opens as the packet reaches it

/** @returns {import('./index.js').NodePreset} */
export function purchasePreset({ plans = { x: 900, y: 40 }, checkout = { x: 1150, y: 250 }, manager = { x: 1150, y: 420 }, grouped = true } = {}) {
    // The plan hops to the checkout, whose panel opens on it as the packet arrives.
    const toCheckout = (flow, intent) => {
        flow.link('plans', 'checkout', { duration: HOP_MS + 600 });
        setTimeout(() => flow.openPopover('checkout', { intent }), HOP_MS);
    };
    const checkoutNode = {
        id: 'checkout', initials: 'PY', input: true,
        title: { vi: 'Thanh toán', en: 'Checkout' },
        tooltip: { vi: 'Thanh toán gói đã chọn', en: 'Pay for the chosen plan' },
        // `light`: mounted in <svc-node>'s light DOM and slotted into the panel — PayPal can't render in a
        // shadow root. `intent` starts empty (idle view); 'plan-select' below hands it the plan.
        overlay: component('svc-purchase', () => import('@/packages/purchase/svc-purchase.js'),
            { ui: 'pastel', intent: null }, { light: true, title: { vi: 'Thanh toán', en: 'Checkout' } }),
    };
    const managerNode = {
        id: 'manager', initials: 'PM',
        title: { vi: 'Quản lý gói', en: 'Plan manager' },
        tooltip: { vi: 'Gói của bạn — hoặc mọi gói đã bán (quản trị)', en: 'Your plan — or every plan sold (staff)' },
        // Anyone signed in: a buyer sees their own plan; Super Admin / a `billing.*` role, every plan sold —
        // the panel decides, and the worker checks the `billing` capability on every staff call.
        roles: SIGNED_IN,
        overlay: component('svc-purchase-manager', () => import('@/packages/purchase/svc-purchase-manager.js'),
            { ui: 'pastel', mode: 'manage' }, { title: { vi: 'Quản lý gói', en: 'Plan manager' } }),
    };
    return {
        id: 'purchase',
        title: { vi: 'Mua gói', en: 'Plans' },
        icon: 'ri:shopping-cart-2-line',
        nodes: () => [
            {
                id: 'plans', ...plans, initials: 'PL', output: true,
                title: { vi: 'Gói dịch vụ', en: 'Plans' },
                tooltip: { vi: 'Chọn gói', en: 'Choose a plan' },
                description: {
                    vi: 'Bảng giá các gói (Starter, Pro), trả theo tháng hoặc theo năm — chọn gói để mua hoặc đổi gói',
                    en: 'The plans and their prices (Starter, Pro), billed monthly or yearly — pick one to buy or change plan',
                },
                // "Buy the $9 plan": AI picks the Yearly tab and the plan's card — the checkout does the rest. Nothing
                // here pays (a card's button only opens the checkout), so AI never stops to ask: `confirm: false` — its
                // labels say "Thanh toán theo năm", which the default sensitive words would catch.
                agent: { maxSteps: 8, confirm: false },
                overlay: component('svc-purchase-plans', () => import('@/packages/purchase/svc-purchase-plans.js'), { ui: 'pastel' },
                    { title: { vi: 'Gói dịch vụ', en: 'Plans' } }),
            },
            ...(grouped
                ? inGroup('purchase', { ...checkout, title: { vi: 'Hệ thống mua gói', en: 'Purchase System' }, tints: ['accent', 'warning'] }, [checkoutNode, managerNode])
                : [{ ...checkoutNode, ...checkout }, { ...managerNode, ...manager }]),
        ],
        // Edges only style a hop (progress / icon / label) — none is drawn unless `persistent: true`.
        edges: () => [
            { id: 'plans-checkout', source: 'plans', target: 'checkout', label: { icon: 'mdi:cart-outline' }, progress: 'package', progressIcon: 'ri:paypal-line' },
            { id: 'checkout-plans', source: 'checkout', target: 'plans', progress: 'dashed' },
        ],
        events: ({ flow }) => ({
            // <svc-purchase-plans> would hand the intent to a page-level <svc-purchase> — route it to the node instead.
            'plans:plan-select': ({ event, detail }) => {
                event.preventDefault();
                toCheckout(flow, detail.intent);
            },
            // Free card: on a sector page (/system/<sector>) the workspace trial is this very canvas — just close the plans
            // panel; on the /system/app canvas let it open the workspace.
            'plans:plan-free': ({ event }) => {
                if (window.location.pathname.replace(/\/+$/, '') === '/system/app') return;
                event.preventDefault();
                flow.closePopover('plans');
            },
            'plans:plan-manage': ({ event }) => {
                event.preventDefault();
                flow.openPopover('checkout', { intent: 'manage' });
            },
            'checkout:purchase-pick': () => {
                flow.link('checkout', 'plans', { duration: 1500 });
                flow.openPopover('plans');
            },
            // "Gói của tôi" → See plans / Change plan
            'manager:purchase-pick': () => {
                flow.link('manager', 'plans', { duration: 1500 });
                flow.openPopover('plans');
            },
        }),
        // Back from a sign-in that reloaded the page: the checkout it was waiting on opens again, on the same plan.
        setup: ({ flow }) => {
            const intent = takePendingCheckout();
            if (intent) flow.updateComplete.then(() => toCheckout(flow, intent));
        },
    };
}
