import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import styles from '../css/overlay-component.css?inline';
import { OverlayLifecycleMixin } from '../tool/overlay-lifecycle-mixin.js';
import { isLightOverlay, overlaySlotName } from '../tool/overlay-slot.js';

// Never handlers, markup or the prototype chain — `properties` of a saved node come from the database.
const UNSAFE_KEYS = new Set(['innerHTML', 'outerHTML', 'innerText', 'outerText', 'textContent', 'srcdoc', '__proto__', 'constructor', 'prototype']);
const _safeProperties = (properties) => Object.entries(properties ?? {}).filter(([key]) => !/^on/i.test(key) && !UNSAFE_KEYS.has(key));

function assignProperties(el, properties) {
    for (const [key, value] of _safeProperties(properties)) {
        try {
            el[key] = value;
        } catch (err) {
            console.warn(`[node/overlay-component] <${el.localName}>.${key} not set:`, err.message); // a getter-only one
        }
    }
}

export class SvcOverlayComponent extends OverlayLifecycleMixin(LitElement) {
    static shadowRootOptions = { mode: 'open' };
    static styles = [unsafeCSS(styles)];

    static properties = {
        ...OverlayLifecycleMixin(LitElement).properties,
        overlay: { type: Object },
        node: { type: Object },
        lightHost: { attribute: false }, // <svc-node> — parent of `light` overlays (see tool/overlay-slot.js)
    };

    constructor() {
        super();
        this._el = null; // the live instance — survives suspend/resume
        this._containerRef = createRef();
    }

    get _light() {
        return isLightOverlay(this.overlay) && Boolean(this.lightHost && this.node);
    }

    _ensureElement() {
        if (this._el) return this._el;
        if (!this.overlay) return null;
        const { tagName, properties, attributes, load } = this.overlay;
        // A custom element only (a name with a dash) — never <script>, <iframe>, <object>…
        if (typeof tagName !== 'string' || !/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(tagName)) {
            console.error(`[node/overlay-component] "${tagName}" is not a custom element name`);
            return null;
        }
        if (load && !customElements.get(tagName)) this._define(tagName, load);
        const el = document.createElement(tagName);
        assignProperties(el, properties);
        for (const [key, value] of Object.entries(attributes ?? {})) {
            el.setAttribute(key, value);
        }
        this._el = el;
        return el;
    }

    // `overlay.load` — () => import('…') that registers `tagName`: fetched on the panel's first open, so a page ships
    // just its canvas. The element made meanwhile upgrades once it lands (Lit keeps the properties set before).
    _define(tagName, load) {
        Promise.resolve().then(load).catch((err) => {
            console.error(`[node/overlay-component] could not load <${tagName}>:`, err);
            this.markReady(); // never defined → no ready signal of its own; don't leave the panel loading forever
        });
    }

    _onActivate() {
        const el = this._ensureElement();
        if (!el) return;
        if (this._light) {
            // Light DOM of <svc-node>, projected into this panel through the forwarded slot.
            el.slot = overlaySlotName(this.node.id);
            if (el.parentNode !== this.lightHost) this.lightHost.append(el);
        } else {
            const container = this._containerRef.value;
            if (!container) return;
            if (!el.isConnected) container.replaceChildren(el);
        }
        this._signalReady(el);
    }

    // Once per mounted instance: defined + first render done. `overlay.ready: 'event'` hands the call
    // to the element itself — it dispatches a composed 'overlay-ready' once its own data is in.
    async _signalReady(el) {
        if (el._svcOverlayReady) return;
        el._svcOverlayReady = true;
        if (this.overlay.ready === 'event') return;
        if (el.localName.includes('-')) await customElements.whenDefined(el.localName);
        await el.updateComplete;
        if (this._el === el) this.markReady();
    }

    _onSuspend() {
        // Cooperating components can listen for this to pause internal timers/subscriptions.
        this._el?.dispatchEvent(new CustomEvent('overlay-suspend', { bubbles: true, composed: true }));
        this._el?.remove(); // detach from DOM, but this._el reference survives
    }

    _onDestroy() {
        this._el?.remove();
        this._el = null;
    }

    willUpdate() {
        this.toggleAttribute('light', this._light);
    }

    updated(changed) {
        // Properties are live — a host re-sending them (svc-node.setOverlayProps) updates the mounted element.
        if (changed.has('overlay') && changed.get('overlay') && this._el) {
            assignProperties(this._el, this.overlay?.properties);
        }
        // If activate() ran before the container div existed in the DOM yet (first render),
        // retry the mount once the ref resolves.
        if (this.lifecycleStatus === 'active' && !this._el?.isConnected) this._onActivate();
    }

    render() {
        return this._light ? nothing : html`<div class="overlay-container" ${ref(this._containerRef)}></div>`;
    }
}

if (!customElements.get('svc-overlay-component')) {
    customElements.define('svc-overlay-component', SvcOverlayComponent);
}

export default SvcOverlayComponent;
