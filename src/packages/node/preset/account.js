// src/packages/node/preset/account.js
//
// 'account' — the User Portal, pinned to a corner: <svc-account> signs you in, then swaps to your profile in place.
// Signed in, the node wears your avatar (or initials) and your name as its tooltip. A gated panel's "Sign in" button
// ('node-access') opens it (preset/mount.js). `pinned`: a user can't take it off their canvas.
import { component } from './shared.js';
import { lingo } from '../tool/lingo.js';

const load = () => import('@/packages/auth/svc-account.js');
const TITLE = { vi: 'Tài khoản', en: 'User Portal' };
const TOOLTIP = { vi: 'Đăng nhập, hồ sơ và cài đặt', en: 'Sign in, profile and settings' };
// Signed out: no picture, initials from the title (said in the page's language — this goes onto the live node).
const guest = (lang) => ({ icon: undefined, iconFit: undefined, initials: undefined, tooltip: lingo(TOOLTIP, lang) });

const initialsOf = (user) => (user.display_name || user.email || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/** @returns {import('./index.js').NodePreset} */
export function accountPreset({ x = '99%', y = '1%' } = {}) {
    return {
        id: 'account',
        title: { vi: 'Tài khoản', en: 'Account' },
        icon: 'ri:user-3-line',
        pinned: true,
        nodes: () => [{
            id: 'account', moving: false, arrange: false, x, y, input: true, output: true,
            title: TITLE, tooltip: TOOLTIP,
            description: {
                vi: 'Đăng nhập / đăng ký, hồ sơ cá nhân, đổi giao diện sáng / tối và ngôn ngữ',
                en: 'Sign in / sign up, your profile, light / dark theme and language',
            },
            // A login / profile card — its :host sizes to content, so it drops into the panel chrome as it is.
            overlay: component('svc-account', load, { ui: 'pastel', embedded: true }, { title: TITLE }),
        }],
        onUser: (user, { flow, lang }) => flow.updateNode('account', user ? {
            icon: user.avatar || undefined,
            iconFit: 'cover',
            initials: initialsOf(user),
            tooltip: user.display_name || user.email,
        } : guest(lang)),
    };
}
