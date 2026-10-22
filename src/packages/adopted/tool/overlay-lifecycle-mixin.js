/**
 * Mixin adding a uniform activate()/suspend()/destroy() lifecycle to a LitElement.
 * Subclasses override `_onActivate()`/`_onSuspend()`/`_onDestroy()` (all optional,
 * default no-ops) rather than the public methods, so the public API always dispatches
 * the matching lifecycle event regardless of what the subclass actually does.
 *
 * @param {typeof import('lit').LitElement} Base
 */
export const OverlayLifecycleMixin = (Base) => class extends Base {
    static properties = {
        ...Base.properties,
        lifecycleStatus: { type: String, state: true }, // 'inactive' | 'active' | 'suspended' | 'destroyed'
    };

    constructor() {
        super();
        this.lifecycleStatus = 'inactive';
    }

    activate() {
        if (this.lifecycleStatus === 'destroyed') return;
        this._onActivate?.();
        this.lifecycleStatus = 'active';
        this.dispatchEvent(new CustomEvent('overlay-activate', { bubbles: true, composed: true }));
    }

    suspend() {
        if (this.lifecycleStatus !== 'active') return;
        this._onSuspend?.();
        this.lifecycleStatus = 'suspended';
        this.dispatchEvent(new CustomEvent('overlay-suspend', { bubbles: true, composed: true }));
    }

    destroy() {
        if (this.lifecycleStatus === 'destroyed') return;
        this._onDestroy?.();
        this.lifecycleStatus = 'destroyed';
        this.dispatchEvent(new CustomEvent('overlay-destroy', { bubbles: true, composed: true }));
    }

    /** Tells <svc-popover> the content is usable — it drops the panel's loading state. */
    markReady() {
        this.dispatchEvent(new CustomEvent('overlay-ready', { bubbles: true, composed: true }));
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.destroy();
    }
};
