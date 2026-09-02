// src/webs/underlay/fps-badge.js
// One shared badge element for the whole page, reference-counted across every
// <svc-underlay debug> instance so N debug instances still mount only one DOM node.

let badgeEl = null;
let refCount = 0;

function mountBadge() {
    badgeEl = document.createElement('div');
    badgeEl.style.cssText = [
        'position:fixed', 'top:8px', 'left:50%', 'transform:translateX(-50%)',
        'z-index:2147483647', 'padding:2px 8px', 'border-radius:999px',
        'font:600 11px/1.6 monospace', 'color:#0f0', 'background:rgba(0,0,0,0.65)',
        'pointer-events:none', 'letter-spacing:.02em',
    ].join(';');
    badgeEl.textContent = 'FPS: --';
    document.body.appendChild(badgeEl);
}

function unmountBadge() {
    badgeEl?.remove();
    badgeEl = null;
}

// Call when an instance turns debug on. Returns an unregister function —
// call it when that instance turns debug off or disconnects.
export function registerDebug() {
    refCount++;
    if (refCount === 1) mountBadge();
    let active = true;
    return () => {
        if (!active) return;
        active = false;
        refCount = Math.max(0, refCount - 1);
        if (refCount === 0) unmountBadge();
    };
}

export function updateFpsBadge(fps) {
    if (badgeEl) badgeEl.textContent = `FPS: ${Math.round(fps)}`;
}
