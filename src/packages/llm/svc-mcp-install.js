// src/packages/llm/svc-mcp-install.js
//
// <svc-mcp-install> — cài MCP server kiến thức (llm POST /mcp, hook/MCP.rst) vào AI client của khách: dán token
// (hoặc đăng nhập rồi "Cấp token mới & điền sẵn") → nút 1 chạm cho Cursor / VS Code (deep link), lệnh Claude Code,
// cấu hình JSON cho Claude Desktop / Windsurf, và lệnh chạy script cài hết 1 lần (public/mcp/install.sh|ps1).
// Trang /system/docs dùng nó.
//
// Token KHÔNG rời trình duyệt: chỉ nằm trong bộ nhớ của component (không lưu localStorage), deep link là giao thức
// cục bộ (cursor:// vscode:) mở thẳng app trên máy, và "Kiểm tra kết nối" gọi đúng MCP server của chính nó. Khối
// lệnh hiển thị token đã che (mcp_ab12…ef90) — nút Sao chép mới chép bản đầy đủ. Lệnh script không chứa token (script
// tự hỏi, ẩn ký tự) để token không nằm trong lịch sử shell.
//
// Đăng nhập + có hub: điền sẵn MCP URL, owner, 4 ký tự cuối token (GET /v1/hubs/me). "Cấp token mới" = POST
// /v1/hubs/issue { rotate: true } — token cũ hết hiệu lực ngay (hỏi xác nhận trước), token mới về đúng 1 lần trong
// phản hồi + email, điền thẳng vào ô.
import { LitElement, html, unsafeCSS } from 'lit'
import 'iconify-icon'
import { auth } from '@/packages/auth/service/service.js'
import { hub } from './service/hub.js'
import styles from './css/svc-mcp-install.css?inline'

const TOKEN_RE = /^mcp_[0-9a-f]{64}$/
const DEFAULT_NAME = 'astro-knowledge'

const TXT = {
    vi: {
        token: 'MCP_TOKEN', tokenPh: 'Dán token mcp_… từ email mua gói', tokenBad: 'Token có dạng mcp_ + 64 ký tự hex',
        url: 'MCP endpoint', show: 'Hiện', hide: 'Ẩn',
        signedIn: 'Đã đăng nhập — hub', hint: 'token hiện tại kết thúc bằng', noHub: 'Tài khoản này chưa có hub — mua gói (hoặc mở Cài đặt trợ lý → Kích hoạt MCP) rồi quay lại.',
        inactive: 'Gói của hub đã hết hạn — gia hạn để MCP hoạt động lại.',
        rotate: 'Cấp token mới & điền sẵn', rotating: 'Đang cấp…',
        rotateAsk: 'Cấp token mới? Token cũ hết hiệu lực NGAY — mọi AI client đang dùng nó phải cài lại.',
        rotateDone: 'Đã cấp token mới, điền sẵn bên dưới (và gửi email).', rotateFail: 'Không cấp được token',
        test: 'Kiểm tra kết nối', testing: 'Đang kiểm tra…', testOk: 'Kết nối được', testFail: 'Không kết nối được',
        rows: 'dòng kiến thức', copy: 'Sao chép', copied: 'Đã chép',
        needToken: 'Nhập token để tạo lệnh cài đặt.',
        install: 'Cài 1 chạm', or: 'hoặc thêm thủ công',
        file: 'Tệp cấu hình',
        claudeCode: 'Chạy trong terminal (cần Claude Code):',
        cursorNote: 'Mở Cursor và hỏi xác nhận thêm server. Thủ công: thêm vào',
        vscodeNote: 'Mở VS Code và hỏi xác nhận. Hoặc chạy lệnh:',
        desktopNote: 'Claude Desktop nối server HTTP qua mcp-remote (cần Node.js). Thêm vào tệp cấu hình rồi khởi động lại app:',
        windsurfNote: 'Thêm vào tệp cấu hình rồi bấm Refresh trong danh sách MCP:',
        scriptNote: 'Cài vào mọi client tìm thấy trên máy (Claude Code, Cursor, VS Code, Claude Desktop, Windsurf). Script hỏi token (ẩn ký tự), sao lưu tệp cũ (.bak) trước khi ghi.',
        unix: 'macOS / Linux', windows: 'Windows (PowerShell)',
    },
    en: {
        token: 'MCP_TOKEN', tokenPh: 'Paste the mcp_… token from your purchase email', tokenBad: 'A token is mcp_ + 64 hex characters',
        url: 'MCP endpoint', show: 'Show', hide: 'Hide',
        signedIn: 'Signed in — hub', hint: 'current token ends in', noHub: 'This account has no hub yet — buy a plan (or open the assistant settings → Activate MCP), then come back.',
        inactive: 'This hub\'s plan has lapsed — renew it to bring MCP back.',
        rotate: 'Issue a new token & fill it in', rotating: 'Issuing…',
        rotateAsk: 'Issue a new token? The old one stops working AT ONCE — every AI client using it must be set up again.',
        rotateDone: 'New token issued and filled in below (also emailed).', rotateFail: 'Could not issue a token',
        test: 'Test connection', testing: 'Testing…', testOk: 'Connected', testFail: 'Could not connect',
        rows: 'knowledge rows', copy: 'Copy', copied: 'Copied',
        needToken: 'Enter your token to build the install commands.',
        install: 'One-click install', or: 'or add it by hand',
        file: 'Config file',
        claudeCode: 'Run in a terminal (needs Claude Code):',
        cursorNote: 'Opens Cursor and asks to add the server. By hand: add to',
        vscodeNote: 'Opens VS Code and asks to confirm. Or run:',
        desktopNote: 'Claude Desktop reaches HTTP servers through mcp-remote (needs Node.js). Add to the config file, then restart the app:',
        windsurfNote: 'Add to the config file, then press Refresh in the MCP list:',
        scriptNote: 'Installs into every client found on this machine (Claude Code, Cursor, VS Code, Claude Desktop, Windsurf). The script asks for the token (hidden) and backs up each file (.bak) before writing.',
        unix: 'macOS / Linux', windows: 'Windows (PowerShell)',
    },
}

const CLIENTS = [
    { id: 'claude-code', label: 'Claude Code', icon: 'ri:terminal-box-line' },
    { id: 'cursor', label: 'Cursor', icon: 'ri:cursor-line' },
    { id: 'vscode', label: 'VS Code', icon: 'ri:code-box-line' },
    { id: 'claude-desktop', label: 'Claude Desktop', icon: 'ri:computer-line' },
    { id: 'windsurf', label: 'Windsurf', icon: 'ri:windy-line' },
    { id: 'script', label: 'Script', icon: 'ri:install-line' },
]

const mask = (token) => (token.length > 12 ? `${token.slice(0, 8)}…${token.slice(-4)}` : token)
const json = (value) => JSON.stringify(value, null, 2)
// base64 of UTF-8 — Cursor's deep link carries the server config this way.
const b64 = (text) => btoa(String.fromCharCode(...new TextEncoder().encode(text)))

export class SvcMcpInstall extends LitElement {
    static styles = unsafeCSS(styles)

    static properties = {
        // Default: PUBLIC_LLM_URL + '/mcp'; a signed-in hub gets it from /v1/hubs/me.
        mcpUrl: { type: String, attribute: 'mcp-url' },
        // Where public/mcp/install.sh|ps1 are served — default: this page's origin.
        siteUrl: { type: String, attribute: 'site-url' },
        name: { type: String }, // server name in each client
        lang: { type: String }, // default: <html lang>, followed live — English unless it is 'vi'
        _token: { state: true },
        _reveal: { state: true },
        _client: { state: true },
        _me: { state: true }, // /v1/hubs/me data, null = signed out / not loaded
        _busy: { state: true }, // 'rotate' | 'test' | ''
        _note: { state: true }, // { ok, text } — the last action's outcome
        _copied: { state: true },
    }

    constructor() {
        super()
        this.mcpUrl = `${import.meta.env.PUBLIC_LLM_URL ?? ''}/mcp`
        this.siteUrl = ''
        this.name = DEFAULT_NAME
        this.lang = ''
        this._token = ''
        this._reveal = false
        this._client = CLIENTS[0].id
        this._me = null
        this._busy = ''
        this._note = null
        this._copied = ''
        this._langObs = null
    }

    connectedCallback() {
        super.connectedCallback()
        this._langObs = new MutationObserver(() => this.requestUpdate())
        this._langObs.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
        this._dcLoadHub()
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        this._langObs?.disconnect()
    }

    get _txt() {
        const lang = this.lang || document.documentElement.lang
        return TXT[lang === 'vi' ? 'vi' : 'en'] // tiếng Anh mặc định (site.defaultLang)
    }

    get _url() {
        return this._me?.mcpUrl || this.mcpUrl
    }

    get _site() {
        return (this.siteUrl || location.origin).replace(/\/$/, '')
    }

    get _valid() {
        return TOKEN_RE.test(this._token)
    }

    // ── Data Core ──────────────────────────────────────────────────────────────

    async _dcLoadHub() {
        const user = await auth.get().catch(() => null)
        if (!user?.id) return
        const res = await hub.me().catch(() => null)
        if (res?.ok) this._me = res.data
    }

    // ── Data Head ──────────────────────────────────────────────────────────────

    _dhToken(e) {
        this._token = e.target.value.trim()
        this._note = null
    }

    async _dhRotate() {
        const t = this._txt
        if (this._busy || !window.confirm(t.rotateAsk)) return
        this._busy = 'rotate'
        this._note = null
        try {
            const res = await hub.issue(true)
            if (!res.ok || !res.data?.token) throw new Error(res.message || t.rotateFail)
            this._token = res.data.token
            this._me = { ...this._me, hub: res.data.hub, active: res.data.active, mcpUrl: res.data.mcpUrl || this._me?.mcpUrl }
            this._note = { ok: true, text: t.rotateDone }
            window.dispatchEvent(new CustomEvent('hub-change', { detail: res.data }))
        } catch (err) {
            this._note = { ok: false, text: `${t.rotateFail}: ${err.message}` }
        } finally {
            this._busy = ''
        }
    }

    // One JSON-RPC call to the server itself — /mcp is CORS '*' and checks nothing but the bearer token.
    async _dhTest() {
        const t = this._txt
        if (this._busy || !this._valid) return
        this._busy = 'test'
        this._note = null
        try {
            const res = await fetch(this._url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${this._token}` },
                body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'hub_info', arguments: {} } }),
            })
            const body = await res.json().catch(() => null)
            if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`)
            if (body?.error || body?.result?.isError) throw new Error(body?.error?.message || body.result.content?.[0]?.text || 'error')
            const info = JSON.parse(body?.result?.content?.[0]?.text ?? '{}')
            const rows = Object.values(info.knowledge ?? {}).reduce((sum, n) => sum + (Number(n) || 0), 0)
            this._note = { ok: true, text: `${t.testOk} · ${info.plan || '—'} · ${rows} ${t.rows}` }
        } catch (err) {
            this._note = { ok: false, text: `${t.testFail}: ${err.message}` }
        } finally {
            this._busy = ''
        }
    }

    async _dhCopy(id, text) {
        try {
            await navigator.clipboard.writeText(text)
            this._copied = id
            setTimeout(() => { if (this._copied === id) this._copied = '' }, 1600)
        } catch {
            window.prompt(this._txt.copy, text) // clipboard blocked (http, iframe) — the user copies it themselves
        }
    }

    // ── Config builders (token = full or masked) ───────────────────────────────

    _configs(token) {
        const url = this._url, name = this.name || DEFAULT_NAME
        const auth = `Bearer ${token}`
        return {
            claudeCode: `claude mcp add --scope user --transport http ${name} ${url} --header "Authorization: ${auth}"`,
            cursor: json({ mcpServers: { [name]: { url, headers: { Authorization: auth } } } }),
            vscode: json({ servers: { [name]: { type: 'http', url, headers: { Authorization: auth } } } }),
            vscodeCli: `code --add-mcp '${JSON.stringify({ name, type: 'http', url, headers: { Authorization: auth } })}'`,
            desktop: json({ mcpServers: { [name]: { command: 'npx', args: ['-y', 'mcp-remote', url, '--header', 'Authorization:${AUTH_HEADER}'], env: { AUTH_HEADER: auth } } } }),
            windsurf: json({ mcpServers: { [name]: { serverUrl: url, headers: { Authorization: auth } } } }),
        }
    }

    _deepLinks() {
        const url = this._url, name = this.name || DEFAULT_NAME
        const headers = { Authorization: `Bearer ${this._token}` }
        return {
            cursor: `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(name)}&config=${encodeURIComponent(b64(JSON.stringify({ url, headers })))}`,
            vscode: `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name, type: 'http', url, headers }))}`,
            vscodeInsiders: `vscode-insiders:mcp/install?${encodeURIComponent(JSON.stringify({ name, type: 'http', url, headers }))}`,
        }
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    _rbCode(id, shown, full = shown) {
        const t = this._txt
        return html`
            <div class="mi-code">
                <pre><code>${shown}</code></pre>
                <button type="button" class="mi-copy" @click=${() => this._dhCopy(id, full)}>
                    <iconify-icon icon=${this._copied === id ? 'ri:check-line' : 'ri:file-copy-line'}></iconify-icon>
                    ${this._copied === id ? t.copied : t.copy}
                </button>
            </div>`
    }

    _rbHub() {
        const t = this._txt, me = this._me
        if (!me) return ''
        if (!me.hub) return html`<p class="mi-hint">${t.noHub}</p>`
        return html`
            <div class="mi-hub">
                <span class="mi-pill"><iconify-icon icon="ri:user-3-line"></iconify-icon>${t.signedIn} <b>${me.hub.id}</b></span>
                ${me.hub.token_hint ? html`<span class="mi-pill">${t.hint} <b>…${me.hub.token_hint}</b></span>` : ''}
                ${me.active ? '' : html`<span class="mi-pill mi-warn">${t.inactive}</span>`}
                <button type="button" class="mi-btn" ?disabled=${this._busy === 'rotate'} @click=${this._dhRotate}>
                    <iconify-icon icon="ri:key-2-line"></iconify-icon>${this._busy === 'rotate' ? t.rotating : t.rotate}
                </button>
            </div>`
    }

    _rbClient() {
        const t = this._txt
        if (!this._valid) return html`<p class="mi-empty"><iconify-icon icon="ri:sparkling-2-line"></iconify-icon>${t.needToken}</p>`
        const full = this._configs(this._token)
        const shown = this._configs(this._reveal ? this._token : mask(this._token))
        const links = this._deepLinks()
        const site = this._site
        switch (this._client) {
            case 'claude-code':
                return html`<p class="mi-note">${t.claudeCode}</p>${this._rbCode('cc', shown.claudeCode, full.claudeCode)}`
            case 'cursor':
                return html`
                    <a class="mi-install" href=${links.cursor}><iconify-icon icon="ri:download-2-line"></iconify-icon>${t.install} — Cursor</a>
                    <p class="mi-note">${t.cursorNote} <code>~/.cursor/mcp.json</code></p>
                    ${this._rbCode('cursor', shown.cursor, full.cursor)}`
            case 'vscode':
                return html`
                    <div class="mi-row">
                        <a class="mi-install" href=${links.vscode}><iconify-icon icon="ri:download-2-line"></iconify-icon>${t.install} — VS Code</a>
                        <a class="mi-install mi-ghost" href=${links.vscodeInsiders}>Insiders</a>
                    </div>
                    <p class="mi-note">${t.vscodeNote}</p>
                    ${this._rbCode('vscode-cli', shown.vscodeCli, full.vscodeCli)}
                    <p class="mi-note">${t.or} — <code>mcp.json</code></p>
                    ${this._rbCode('vscode', shown.vscode, full.vscode)}`
            case 'claude-desktop':
                return html`
                    <p class="mi-note">${t.desktopNote}</p>
                    <ul class="mi-paths">
                        <li>macOS: <code>~/Library/Application Support/Claude/claude_desktop_config.json</code></li>
                        <li>Windows: <code>%APPDATA%\\Claude\\claude_desktop_config.json</code></li>
                    </ul>
                    ${this._rbCode('desktop', shown.desktop, full.desktop)}`
            case 'windsurf':
                return html`
                    <p class="mi-note">${t.windsurfNote} <code>~/.codeium/windsurf/mcp_config.json</code></p>
                    ${this._rbCode('windsurf', shown.windsurf, full.windsurf)}`
            default: {
                const unix = `curl -fsSL ${site}/mcp/install.sh | MCP_URL='${this._url}' sh`
                const win = `$env:MCP_URL='${this._url}'; irm ${site}/mcp/install.ps1 | iex`
                return html`
                    <p class="mi-note">${t.scriptNote}</p>
                    <p class="mi-label">${t.unix}</p>${this._rbCode('sh', unix)}
                    <p class="mi-label">${t.windows}</p>${this._rbCode('ps', win)}`
            }
        }
    }

    render() {
        const t = this._txt
        return html`
            <div class="mi-panel">
                ${this._rbHub()}
                <label class="mi-field">
                    <span class="mi-label">${t.url}</span>
                    <input class="mi-input" .value=${this._url} readonly />
                </label>
                <label class="mi-field">
                    <span class="mi-label">${t.token}</span>
                    <span class="mi-token">
                        <input class="mi-input" type=${this._reveal ? 'text' : 'password'} autocomplete="off" spellcheck="false"
                            placeholder=${t.tokenPh} .value=${this._token} @input=${this._dhToken} />
                        <button type="button" class="mi-btn mi-ghost" @click=${() => (this._reveal = !this._reveal)}>
                            <iconify-icon icon=${this._reveal ? 'ri:eye-off-line' : 'ri:eye-line'}></iconify-icon>${this._reveal ? t.hide : t.show}
                        </button>
                        <button type="button" class="mi-btn" ?disabled=${!this._valid || this._busy === 'test'} @click=${this._dhTest}>
                            <iconify-icon icon="ri:pulse-line"></iconify-icon>${this._busy === 'test' ? t.testing : t.test}
                        </button>
                    </span>
                    ${this._token && !this._valid ? html`<span class="mi-bad">${t.tokenBad}</span>` : ''}
                </label>
                ${this._note ? html`<p class="mi-status ${this._note.ok ? 'is-ok' : 'is-bad'}">${this._note.text}</p>` : ''}
                <div class="mi-tabs" role="tablist">
                    ${CLIENTS.map((c) => html`
                        <button type="button" role="tab" class="mi-tab" aria-selected=${String(this._client === c.id)}
                            @click=${() => (this._client = c.id)}>
                            <iconify-icon icon=${c.icon}></iconify-icon>${c.label}
                        </button>`)}
                </div>
                <div class="mi-body" role="tabpanel">${this._rbClient()}</div>
            </div>
        `
    }
}

if (!customElements.get('svc-mcp-install')) customElements.define('svc-mcp-install', SvcMcpInstall)

export default SvcMcpInstall
