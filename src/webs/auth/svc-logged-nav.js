import { LitElement, html, nothing } from 'lit';
import { auth, parseRoles, hasAccess } from '@/webs/auth/tools/service.js';

export class SvcLoggedNav extends LitElement {
    createRenderRoot() { return this; }

    static properties = {
        menus:    { type: String },
        _items:   { state: true },
        _isAdmin: { state: true },
        _ready:   { state: true },
    };

    constructor() {
        super();
        this.menus    = '';
        this._items   = [];
        this._isAdmin = false;
        this._ready   = false;
    }

    async connectedCallback() {
        super.connectedCallback();
        const allItems = this.menus ? JSON.parse(this.menus) : [];
        const user = await auth.get();

        if (user?.status === 'active') {
            const { roles, isAdmin } = parseRoles(user);
            this._isAdmin = isAdmin;
            this._items   = isAdmin
                ? allItems
                : allItems.filter(item => hasAccess(roles, item.require));
        }

        this._ready = true;

        // Notify siblings (e.g. svc-roles) about admin status
        this.dispatchEvent(new CustomEvent('admin-nav-ready', {
            detail: { isAdmin: this._isAdmin },
            bubbles: true, composed: true,
        }));
    }

    render() {
        if (!this._ready) return nothing;

        const pathname = location.pathname.replace(/\/$/, '') || '/admin';

        return html`
            <ul class="menu py-8 -mx-3">
                ${this._items.map(item => {
                    const href   = item.href.replace(/\/$/, '') || '/admin';
                    const active = pathname === href;
                    return html`
                        <li>
                            <a href=${item.href} class=${active ? 'menu-active' : ''}>
                                <span class="menu-char-icon">${item.textIcon}</span>
                                <span class="menu-text">${item.text}</span>
                            </a>
                        </li>
                    `;
                })}
            </ul>
        `;
    }
}

if (!customElements.get('svc-logged-nav')) customElements.define('svc-logged-nav', SvcLoggedNav);
