/**
 * svc-editor — Rich text editor built on TipTap + Lit.
 *
 * Props:
 *   value       {String}  — HTML content (get/set via JS property)
 *   placeholder {String}  — Editor placeholder text
 *   readonly    {Boolean} — Disables editing
 *   ui          {String}  — 'modern' | 'spatial'
 *   theme       {String}  — data-theme value forwarded to host element
 *   features    {String}  — Comma-separated list of enabled features (default: all).
 *                           Keys: bubble, slash, image, player, table, ai, color, ctx, task
 *   ai          {String}  — Gemini API key (format: "KEY" or "KEY~extra")
 *
 * Events:
 *   change — { html, text } on every content update
 *
 * Usage:
 *   <svc-editor features="bubble,slash,image,color" ai="GEMINI_KEY"></svc-editor>
 */

import { LitElement, html, unsafeCSS, render as litRender } from 'lit'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Underline } from '@tiptap/extension-underline'
import { Link } from '@tiptap/extension-link'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'

import { PhotorNode } from './tools/photor-ext.js'
import { PlayerNode } from './tools/player-ext.js'
import { COLORS, BG_COLORS, SLASH_GROUPS, TURN_INTO, ALL_FEATURES } from './tools/constants.js'
import { createAIStream } from '@/services/tensor.js'
import { emit } from '@/services/helper.js'
import css from './styles/svc-editor.css?inline'
import pmCss from './styles/prose-mirror.css?inline'

import '@/webs/apex/web-photor-upload.js'
import '@/webs/media/svc-player-embed.js'

export class SvcEditor extends LitElement {
  static styles = [unsafeCSS(css), unsafeCSS(pmCss)]

  static properties = {
    value:       {},
    placeholder: { type: String },
    readonly:    { type: Boolean },
    ui:          { type: String },
    theme:       { type: String },
    features:    { type: String },
    ai:          { type: String },

    // Internal reactive state (prefixed _ to signal private)
    _bubble:    { state: true },
    _slash:     { state: true },
    _ctx:       { state: true },
    _sub:       { state: true },
    _cpicker:    { state: true },
    _handle:     { state: true },
    _aiPanel:    { state: true },
    _imgPrompt:  { state: true },
    _playerPrompt: { state: true },
  }

  // ── value accessor ────────────────────────────────────────────────────────

  get value() { return this._editor?.getHTML() ?? this._initValue ?? '' }
  set value(v) {
    this._initValue = v
    if (this._editor && v !== this._editor.getHTML()) this._editor.commands.setContent(v, false)
  }

  // ── Feature flag Set ──────────────────────────────────────────────────────
  // When `features` is empty all features are on; otherwise only listed keys are.

  get _feat() {
    if (!this.features) return new Set(ALL_FEATURES)
    return new Set(this.features.split(',').map(s => s.trim()).filter(Boolean))
  }

  // ── Constructor ───────────────────────────────────────────────────────────

  constructor() {
    super()
    this.ui          = 'modern'
    this.theme       = ''
    this.features    = ''
    this.placeholder = "Type '/' for commands…"
    this.readonly    = false
    this.ai          = ''
    this._initValue  = ''
    this._editor     = null

    this._aiPanel    = { open: false, mode: 'ask', prompt: '', loading: false, draft: '', x: 0, y: 0 }
    this._imgPrompt    = { open: false, url: '', replacing: false, x: 0, y: 0 }
    this._playerPrompt = { open: false, url: '', replacing: false, x: 0, y: 0 }
    this._bubble     = { open: false, x: 0, y: 0 }
    this._slash      = { open: false, x: 0, y: 0, query: '', idx: 0, fromEditor: false }
    this._ctx        = { open: false, x: 0, y: 0, domNode: null }
    this._sub        = { open: false, type: '' }
    this._cpicker    = { open: false, x: 0, y: 0, tab: 'text' }
    this._handle     = { show: false, x: 0, y: 0, domNode: null }
    this._slashStart = null

    this._onDocClick = this._onDocClick.bind(this)
    this._onDocKey   = this._onDocKey.bind(this)
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  connectedCallback() {
    super.connectedCallback()
    // Inherit data-theme from parent Shadow DOM host when no explicit theme prop is set.
    // CSS variables (--color-*) already cascade through shadow boundaries, but ApexUI
    // component selectors inside the shadow root need data-theme on the host element.
    if (!this.theme) {
      const parentHost = this.getRootNode()?.host
      const t = parentHost?.getAttribute('data-theme') || parentHost?.theme
      if (t) this.setAttribute('data-theme', t)
    }
    // Portal renders the block-handle outside Shadow DOM so position:fixed works correctly
    this._portal = document.createElement('div')
    this._portal.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:99999'
    document.body.appendChild(this._portal)
    document.addEventListener('click',   this._onDocClick)
    document.addEventListener('keydown', this._onDocKey)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this._editor?.destroy()
    this._portal?.remove()
    this._portal = null
    document.removeEventListener('click',   this._onDocClick)
    document.removeEventListener('keydown', this._onDocKey)
  }

  firstUpdated() { this._dcInit() }

  updated(changed) {
    if (changed.has('theme') && this.theme) this.setAttribute('data-theme', this.theme)
    if (changed.has('ui')    && this.ui)    this.setAttribute('data-ui', this.ui)
    if (changed.has('_handle') && this._portal) litRender(this._rbPortalHandle(), this._portal)
  }

  // ── _dc: TipTap init ──────────────────────────────────────────────────────

  _dcInit() {
    const el   = this.shadowRoot.querySelector('.editor-content')
    const feat = this._feat

    // Build extension array — conditionally include feature extensions
    const extensions = [
      StarterKit,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: this.placeholder }),
      Underline,
      Link.configure({ openOnClick: false }),
      ...(feat.has('task')   ? [TaskList, TaskItem.configure({ nested: true })] : []),
      ...(feat.has('image')  ? [PhotorNode.configure({ inline: false, allowBase64: true })] : []),
      ...(feat.has('player') ? [PlayerNode] : []),
      ...(feat.has('table')  ? [Table.configure({ resizable: false }), TableRow, TableHeader, TableCell] : []),
    ]

    this._editor = new Editor({
      element:  el,
      editable: !this.readonly,
      extensions,
      content:  this._initValue || '',

      onUpdate: ({ editor }) => {
        if (feat.has('slash')) this._checkSlash(editor)
        this._emit('change', { html: editor.getHTML(), text: editor.getText() })
      },
      onSelectionUpdate: ({ editor }) => {
        if (feat.has('bubble')) this._updateBubble(editor)
        // Close replace-image/replace-video prompt when user deselects the node
        if (feat.has('image') && !editor.isActive('image') && this._imgPrompt.open && this._imgPrompt.replacing) {
          this._imgPrompt = { ...this._imgPrompt, open: false }
        }
        if (feat.has('player') && !editor.isActive('player') && this._playerPrompt.open && this._playerPrompt.replacing) {
          this._playerPrompt = { ...this._playerPrompt, open: false }
        }
      },
      onTransaction: ({ editor }) => {
        if (feat.has('bubble')) this._updateBubble(editor)
      },
    })

    if (feat.has('ctx')) {
      el.addEventListener('mouseover',  e => this._onEditorHover(e))
      el.addEventListener('mouseleave', () => this._scheduleHandleHide())
    }
  }

  // ── _dh: Bubble menu ──────────────────────────────────────────────────────

  _updateBubble(editor) {
    const { from, to, empty } = editor.state.selection
    if (empty || editor.isActive('image') || editor.isActive('player')) { this._bubble = { ...this._bubble, open: false }; return }
    try {
      const c1 = editor.view.coordsAtPos(from)
      const c2 = editor.view.coordsAtPos(to)
      const { x, y } = this._toFixed((c1.left + c2.left) / 2, c1.top - 44)
      this._bubble  = { open: true, x, y }
      this._cpicker = { ...this._cpicker, open: false }
    } catch {}
  }

  // ── _dh: Slash menu ───────────────────────────────────────────────────────

  _checkSlash(editor) {
    const { $from } = editor.state.selection
    const text = $from.parent.textContent
    if (text.startsWith('/')) {
      const query = text.slice(1).toLowerCase()
      const start = $from.start()
      const pos   = editor.view.coordsAtPos(start)
      const { x, y } = this._toFixed(pos.left, pos.bottom + 4)
      this._slash = { open: true, x, y, query, idx: 0, fromEditor: true }
      this._slashStart = start
    } else if (this._slash.fromEditor) {
      this._slash = { ...this._slash, open: false }
      this._slashStart = null
    }
  }

  // Filter groups by query text AND by enabled feature flags
  _comSlashGroups() {
    const q    = this._slash.query.toLowerCase()
    const feat = this._feat
    return SLASH_GROUPS
      .map(g => ({
        ...g,
        items: g.items.filter(i => (!i.feat || feat.has(i.feat)) && (!q || i.label.toLowerCase().includes(q))),
      }))
      .filter(g => g.items.length > 0)
  }

  _dfSlashSelect(item) {
    const editor = this._editor
    if (!editor) return

    // Delete the "/" trigger text before running any command
    const clearTrigger = () => {
      if (this._slash.fromEditor) {
        const { from } = editor.state.selection
        editor.chain().focus().deleteRange({ from: this._slashStart ?? from, to: from }).run()
      }
      this._slash = { ...this._slash, open: false }
      this._slashStart = null
    }

    if (item.img)    { clearTrigger(); this._imgPrompt    = { open: true, url: '', replacing: false, x: this._slash.x, y: this._slash.y + 8 }; return }
    if (item.player) { clearTrigger(); this._playerPrompt = { open: true, url: '', replacing: false, x: this._slash.x, y: this._slash.y + 8 }; return }
    if (item.ai)    { clearTrigger(); this._openAiPanel(item.ai, this._slash.x, this._slash.y + 8); return }
    if (item.table) { clearTrigger(); editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); return }
    clearTrigger()
    item.cmd(editor)
  }

  // ── _dh: Node handle / context menu ──────────────────────────────────────

  _onEditorHover(e) {
    const tags = ['P', 'H1', 'H2', 'H3', 'LI', 'BLOCKQUOTE', 'PRE', 'HR']
    let node = e.target
    while (node && node !== e.currentTarget) {
      if (tags.includes(node.tagName)) break
      node = node.parentElement
    }
    if (!node || !tags.includes(node?.tagName)) return
    const r = node.getBoundingClientRect()
    this._handle = { show: true, x: r.left - 52, y: r.top + (r.height - 22) / 2, domNode: node }
  }

  _scheduleHandleHide() {
    clearTimeout(this._handleTimer)
    this._handleTimer = setTimeout(() => { this._handle = { ...this._handle, show: false } }, 160)
  }

  _cancelHandleHide() { clearTimeout(this._handleTimer) }

  _openCtx(e) {
    e.stopPropagation()
    e.preventDefault()
    const { x, y } = this._toFixed(e.clientX, e.clientY)
    this._ctx    = { open: true, x, y, domNode: this._handle.domNode }
    this._sub    = { open: false, type: '' }
    this._cpicker = { ...this._cpicker, open: false }
    this._bubble  = { ...this._bubble,  open: false }
  }

  _dfCtxAction(action) {
    const editor = this._editor
    switch (action) {
      case 'copy':
        navigator.clipboard.writeText(editor.state.doc.textContent)
        break
      case 'copylink':
        navigator.clipboard.writeText(window.location.href + '#' + (this._ctx.domNode?.id || 'block'))
        break
      case 'delete':
        editor.chain().focus().deleteNode(editor.state.selection.$from.parent.type).run()
        break
      case 'ai':
        this._openAiPanel('ask', this._ctx.x + 215, this._ctx.y)
        break
    }
    this._closeAllMenus()
  }

  // ── _df: Color picker ─────────────────────────────────────────────────────

  _openColorPicker(tab, x, y) {
    this._cpicker = { open: true, x, y, tab: tab || 'text' }
    this._sub = { open: false, type: '' }
  }

  _applyColor(color) {
    if (!this._editor) return
    this._cpicker.tab === 'text'
      ? this._editor.chain().focus().setColor(color).run()
      : this._editor.chain().focus().setHighlight({ color }).run()
  }

  // ── _df: Image prompt ─────────────────────────────────────────────────────

  _dfInsertImage() {
    const url = this._imgPrompt.url.trim()
    if (!url || !this._editor) return
    this._imgPrompt.replacing
      ? this._editor.chain().focus().updateAttributes('image', { src: url }).run()
      : this._editor.chain().focus().setImage({ src: url }).run()
    this._imgPrompt = { ...this._imgPrompt, open: false, url: '', replacing: false }
  }

  // ── _df: Player (video embed) prompt ──────────────────────────────────────

  _dfInsertPlayer() {
    const url = this._playerPrompt.url.trim()
    if (!url || !this._editor) return
    this._playerPrompt.replacing
      ? this._editor.chain().focus().updateAttributes('player', { src: url }).run()
      : this._editor.chain().focus().insertContent({ type: 'player', attrs: { src: url } }).run()
    this._playerPrompt = { ...this._playerPrompt, open: false, url: '', replacing: false }
  }

  // ── _df: AI panel ─────────────────────────────────────────────────────────

  // x, y are already _toFixed-adjusted (passed from slash/ctx menu state, which computed them via _toFixed)
  _openAiPanel(mode, x, y) {
    // Fall back to center of the editor element if no trigger position given
    if (x == null) {
      const r = this.getBoundingClientRect()
      const p = this._toFixed(r.left + r.width / 2, r.top + r.height / 2)
      x = p.x; y = p.y
    }
    this._aiPanel = { open: true, mode, prompt: '', loading: mode === 'continue', draft: '', x, y }
    this._closeAllMenus()
    if (mode === 'continue') this._dfRunAI()
  }

  /**
   * Flow chạy AI viết/gợi ý: _aiPanel (mode, prompt, docText) -> stream draft vào _aiPanel.draft
   */
  async _dfRunAI() {
    // [1] CHECK: Chưa cấu hình `ai` (API key) — báo lỗi ngay, không gọi stream
    if (!this.ai) {
      this._aiPanel = { ...this._aiPanel, loading: false, draft: '⚠ Chưa cấu hình AI. Truyền prop ai="KEY1~label|KEY2~label" vào svc-editor.' }
      return
    }

    // [2] PROCESS: Build user message theo mode (continue = viết tiếp, ask = trả lời theo prompt)
    const docText = this._editor?.getText() || ''
    const isCont  = this._aiPanel.mode === 'continue'
    const userMsg = isCont
      ? `Continue writing naturally from where this text ends. Output only the continuation:\n\n${docText}`
      : `Document context:\n${docText}\n\nUser request: ${this._aiPanel.prompt}`

    // [3] EXECUTE: Stream draft từ AI — cập nhật _aiPanel.draft từng chunk để UI hiện dần
    // Show spinner (also covers retry path where loading may already be false)
    this._aiPanel = { ...this._aiPanel, loading: true, draft: '' }
    try {
      let draft = ''
      for await (const chunk of createAIStream(
        this.ai,
        [{ role: 'user', content: userMsg }],
        { system: 'You are a helpful writing assistant. Respond in the same language as the user. Be concise and natural.', maxTokens: 1024, temperature: 0.7 },
      )) {
        draft += chunk
        // First chunk: flip loading off and start showing the draft
        this._aiPanel = { ...this._aiPanel, loading: false, draft }
      }
    } catch (err) {
      //   [3.a] HANDLE_ERR: Hiện lỗi ngay trong panel (prefix ⚠), không throw ra ngoài
      this._aiPanel = { ...this._aiPanel, loading: false, draft: `⚠ ${err.message}` }
    }
  }

  _dfInsertAIDraft() {
    if (!this._editor || !this._aiPanel.draft) return
    this._editor.chain().focus().insertContent(this._aiPanel.draft).run()
    this._aiPanel = { ...this._aiPanel, open: false, draft: '', prompt: '' }
  }

  // ── _dh: Global keyboard / click ──────────────────────────────────────────

  _onDocClick(e) {
    // composedPath() crosses shadow DOM — e.target alone is retargeted to the host
    if (e.composedPath().includes(this)) return
    this._closeAllMenus()
  }

  _onDocKey(e) {
    if (this._slash.open) {
      const flat = this._comSlashGroups().flatMap(g => g.items)
      if (e.key === 'ArrowDown') { e.preventDefault(); this._slash = { ...this._slash, idx: Math.min(this._slash.idx + 1, flat.length - 1) }; return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); this._slash = { ...this._slash, idx: Math.max(this._slash.idx - 1, 0) }; return }
      if (e.key === 'Enter' && flat[this._slash.idx]) { e.preventDefault(); this._dfSlashSelect(flat[this._slash.idx]); return }
      if (e.key === 'Escape') { this._slash = { ...this._slash, open: false }; return }
      // When slash was opened from the + button, capture typed chars as query filter
      if (!this._slash.fromEditor) {
        if (e.key === 'Backspace')                              { e.preventDefault(); this._slash = { ...this._slash, query: this._slash.query.slice(0, -1), idx: 0 }; return }
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { e.preventDefault(); this._slash = { ...this._slash, query: this._slash.query + e.key, idx: 0 }; return }
      }
    }
    if (e.key === 'Escape') this._closeAllMenus()
  }

  _closeAllMenus() {
    this._ctx          = { ...this._ctx,          open: false }
    this._sub          = { open: false, type: '' }
    this._cpicker      = { ...this._cpicker,      open: false }
    this._bubble       = { ...this._bubble,       open: false }
    this._slash        = { ...this._slash,        open: false }
    this._imgPrompt    = { ...this._imgPrompt,    open: false }
    this._playerPrompt = { ...this._playerPrompt, open: false }
  }

  // Closes overlays/popups but NOT the bubble — used on editor-area clicks so that
  // text selection still shows the bubble (bubble lifecycle is managed by _updateBubble).
  _closeOverlays() {
    this._ctx          = { ...this._ctx,          open: false }
    this._sub          = { open: false, type: '' }
    this._cpicker      = { ...this._cpicker,      open: false }
    this._slash        = { ...this._slash,        open: false }
    this._imgPrompt    = { ...this._imgPrompt,    open: false }
    this._playerPrompt = { ...this._playerPrompt, open: false }
  }

  /**
   * Translate raw viewport coordinates to the correct coordinate space.
   * When an ancestor uses backdrop-filter / transform / filter, position:fixed
   * elements are offset relative to that ancestor. Walk the composed tree to detect it.
   */
  _toFixed(vx, vy) {
    let node = this
    while (true) {
      const parent = node.parentElement ?? node.getRootNode()?.host
      if (!parent || parent === document.documentElement) break
      const s = getComputedStyle(parent)
      if (
        (s.backdropFilter && s.backdropFilter !== 'none') ||
        (s.webkitBackdropFilter && s.webkitBackdropFilter !== 'none') ||
        (s.transform && s.transform !== 'none') ||
        (s.filter   && s.filter   !== 'none')
      ) {
        const r = parent.getBoundingClientRect()
        return { x: vx - r.left, y: vy - r.top }
      }
      node = parent
    }
    return { x: vx, y: vy }
  }

  _emit(name, detail = {}) { emit(this, name, detail) }

  // ── Render ────────────────────────────────────────────────────────────────

  render() {
    const feat = this._feat
    return html`
      <div class="editor-wrap ${this.ui === 'spatial' ? 'spatial' : ''}" @click=${() => { if (!this._editor?.isActive('image')) this._closeOverlays() }}>
        <div class="editor-content"></div>
      </div>

      ${feat.has('bubble') ? this._rbBubbleMenu()  : ''}
      ${feat.has('slash')  ? this._rbSlashMenu()   : ''}
      ${feat.has('ctx')    ? this._rbCtxMenu()     : ''}
      ${feat.has('color')  ? this._rbColorPicker()  : ''}
      ${feat.has('image')  ? this._rbImgPrompt()    : ''}
      ${feat.has('player') ? this._rbPlayerPrompt() : ''}
      ${feat.has('ai')     ? this._rbAiPanel()      : ''}
    `
  }

  // ── _rb: Block handle (portal, rendered to document.body) ─────────────────

  _rbPortalHandle() {
    const { show, x, y } = this._handle
    if (!show) return html``
    const cs  = getComputedStyle(this)
    const bg  = cs.getPropertyValue('--color-base-200').trim() || '#1e2433'
    const bdr = cs.getPropertyValue('--color-base-300').trim() || '#374151'
    const fg  = cs.getPropertyValue('--color-base-content').trim() || '#9ca3af'
    const btnStyle = `width:22px;height:22px;display:flex;align-items:center;justify-content:center;` +
                     `border-radius:5px;cursor:pointer;font-size:13px;line-height:1;padding:0;` +
                     `background:${bg};border:1px solid ${bdr};color:${fg};opacity:0.6;transition:opacity .12s,background .12s`
    return html`
      <div style="position:fixed;top:${y}px;left:${x}px;display:flex;align-items:center;gap:3px;pointer-events:auto"
          @mouseenter=${() => this._cancelHandleHide()}
          @mouseleave=${() => this._scheduleHandleHide()}>
        <button style="${btnStyle}" title="Add block"
            @click=${e => {
              e.stopPropagation()
              const rect = this._handle.domNode?.getBoundingClientRect()
              const vx = rect ? rect.left : e.clientX
              const vy = rect ? rect.bottom + 6 : e.clientY + 20
              const { x: sx, y: sy } = this._toFixed(vx, vy)
              this._slash = { open: true, x: sx, y: sy, query: '', idx: 0, fromEditor: false }
              this._ctx   = { ...this._ctx, open: false }
            }}>+</button>
        <button style="${btnStyle}" title="Block options"
            @mouseenter=${() => this._cancelHandleHide()}
            @click=${e => this._openCtx(e)}>⠿</button>
      </div>
    `
  }

  // ── _rb: Bubble menu ──────────────────────────────────────────────────────

  _rbBubbleMenu() {
    if (!this._bubble.open || !this._editor) return ''
    const e     = this._editor
    const style = `left:${this._bubble.x}px;top:${this._bubble.y}px;transform:translateX(-50%)`
    const feat  = this._feat
    return html`
      <div class="bubble-menu" style="${style}" @click=${ev => ev.stopPropagation()}>
        <button class="bm-btn ${e.isActive('bold')      ? 'active':''}" title="Bold"          @click=${() => e.chain().focus().toggleBold().run()}>B</button>
        <button class="bm-btn ${e.isActive('italic')    ? 'active':''}" title="Italic"        @click=${() => e.chain().focus().toggleItalic().run()}><em>I</em></button>
        <button class="bm-btn ${e.isActive('underline') ? 'active':''}" title="Underline"     @click=${() => e.chain().focus().toggleUnderline().run()}><u>U</u></button>
        <button class="bm-btn ${e.isActive('strike')    ? 'active':''}" title="Strikethrough" @click=${() => e.chain().focus().toggleStrike().run()}><s>S</s></button>
        <button class="bm-btn ${e.isActive('code')      ? 'active':''}" title="Inline code"   @click=${() => e.chain().focus().toggleCode().run()}>&lt;&gt;</button>
        <div class="bm-sep"></div>
        <button class="bm-btn ${e.isActive('heading',{level:1}) ? 'active':''}" @click=${() => e.chain().focus().toggleHeading({level:1}).run()}>H1</button>
        <button class="bm-btn ${e.isActive('heading',{level:2}) ? 'active':''}" @click=${() => e.chain().focus().toggleHeading({level:2}).run()}>H2</button>
        <button class="bm-btn ${e.isActive('heading',{level:3}) ? 'active':''}" @click=${() => e.chain().focus().toggleHeading({level:3}).run()}>H3</button>
        <button class="bm-btn ${e.isActive('blockquote') ? 'active':''}" title="Quote" @click=${() => e.chain().focus().toggleBlockquote().run()}>"</button>
        ${feat.has('color') ? html`
          <div class="bm-sep"></div>
          <button class="bm-btn" title="Text color"
              @click=${ev => { ev.stopPropagation(); this._openColorPicker('text', this._bubble.x - 100, this._bubble.y + 44) }}>
            <span style="display:flex;flex-direction:column;align-items:center;gap:1px">
              <span>A</span>
              <span style="width:14px;height:3px;background:${e.getAttributes('textStyle').color||'#fff'};border-radius:2px"></span>
            </span>
          </button>
          <button class="bm-btn" title="Highlight"
              @click=${ev => { ev.stopPropagation(); this._openColorPicker('bg', this._bubble.x - 100, this._bubble.y + 44) }}>
            <span style="display:flex;flex-direction:column;align-items:center;gap:1px">
              <span>A</span>
              <span style="width:14px;height:3px;background:${e.getAttributes('highlight').color||'#fbbf24'};border-radius:2px"></span>
            </span>
          </button>
        ` : ''}
      </div>
    `
  }

  // ── _rb: Slash menu ───────────────────────────────────────────────────────

  _rbSlashMenu() {
    const groups = this._comSlashGroups()
    const flat   = groups.flatMap(g => g.items)
    if (!this._slash.open || !flat.length) return html`<div class="slash-menu hidden"></div>`
    let gi = -1
    return html`
      <div class="slash-menu" style="left:${this._slash.x}px;top:${this._slash.y}px" @click=${e => e.stopPropagation()}>
        <div class="slash-filter">
          <span class="slash-slash">/</span>
          ${this._slash.query
            ? html`<span class="slash-query">${this._slash.query}</span>`
            : html`<span class="slash-placeholder">Filter…</span>`}
        </div>
        ${groups.map((group, gi2) => html`
          ${gi2 > 0 ? html`<div class="slash-group-divider"></div>` : ''}
          <div class="slash-group-label">${group.label}</div>
          ${group.items.map(item => {
            const idx = ++gi
            return html`
              <button class="slash-item ${idx === this._slash.idx ? 'selected' : ''}"
                @mouseenter=${() => { this._slash = { ...this._slash, idx } }}
                @click=${() => this._dfSlashSelect(item)}>
                <span class="slash-icon">
                  ${item.ic
                    ? html`<iconify-icon icon="${item.ic}"></iconify-icon>`
                    : html`<span class="slash-text-icon">${item.icon}</span>`}
                </span>
                <span class="slash-label">${item.label}</span>
              </button>
            `
          })}
        `)}
      </div>
    `
  }

  // ── _rb: Context / block-options menu ────────────────────────────────────

  _rbCtxMenu() {
    if (!this._ctx.open) return ''
    const feat = this._feat
    return html`
      <div class="ctx-menu" style="left:${this._ctx.x}px;top:${this._ctx.y}px" @click=${e => e.stopPropagation()}>
        <div class="ctx-section">Block options</div>

        ${feat.has('color') ? html`
          <button class="ctx-item" @click=${ev => { ev.stopPropagation(); this._openColorPicker('text', this._ctx.x + 210, this._ctx.y) }}>
            <iconify-icon icon="ri:palette-line"></iconify-icon> Color
            <span class="ctx-arrow">›</span>
          </button>
        ` : ''}

        <button class="ctx-item" @click=${ev => { ev.stopPropagation(); this._sub = { open: !this._sub.open || this._sub.type !== 'turninto', type: 'turninto' } }}>
          <iconify-icon icon="ri:swap-line"></iconify-icon> Turn Into
          <span class="ctx-arrow">›</span>
        </button>

        <div class="ctx-divider"></div>

        <button class="ctx-item" @click=${() => this._dfCtxAction('copy')}>
          <iconify-icon icon="ri:clipboard-line"></iconify-icon> Copy to clipboard
          <span class="ctx-kbd">⌘C</span>
        </button>
        <button class="ctx-item" @click=${() => this._dfCtxAction('copylink')}>
          <iconify-icon icon="ri:links-line"></iconify-icon> Copy anchor link
          <span class="ctx-kbd">⌘^L</span>
        </button>

        ${feat.has('ai') ? html`
          <div class="ctx-divider"></div>
          <button class="ctx-item" @click=${() => this._dfCtxAction('ai')}>
            <iconify-icon icon="ri:sparkling-line"></iconify-icon> Ask AI
            <span class="ctx-kbd">⌘J</span>
          </button>
        ` : ''}

        <div class="ctx-divider"></div>
        <button class="ctx-item danger" @click=${() => this._dfCtxAction('delete')}>
          <iconify-icon icon="ri:delete-bin-line"></iconify-icon> Delete
          <span class="ctx-kbd">Del</span>
        </button>
      </div>

      ${this._sub.open && this._sub.type === 'turninto' ? html`
        <div class="ctx-sub" style="left:${this._ctx.x + 210}px;top:${this._ctx.y}px" @click=${e => e.stopPropagation()}>
          ${TURN_INTO.map(item => html`
            <button class="ctx-item" @click=${() => { item.cmd(this._editor); this._closeAllMenus() }}>
              <span style="width:22px;text-align:center;font-size:0.8rem;font-weight:700">${item.icon}</span>
              ${item.label}
            </button>
          `)}
        </div>
      ` : ''}
    `
  }

  // ── _rb: Image prompt modal ───────────────────────────────────────────────

  _rbImgPrompt() {
    if (!this._imgPrompt.open) return ''
    const { url, replacing, x, y } = this._imgPrompt
    const px = Math.max(8, x - 12) // offset so panel opens right of trigger
    const py = Math.max(8, y)
    return html`
      <div class="img-prompt" style="left:${px}px;top:${py}px" @click=${e => e.stopPropagation()}>
        <div class="img-prompt-header">
          <iconify-icon icon="ri:image-line"></iconify-icon>
          <span>${replacing ? 'Thay ảnh' : 'Chèn ảnh'}</span>
          <button class="ai-close" @click=${() => { this._imgPrompt = { ...this._imgPrompt, open: false } }}>✕</button>
        </div>
        <div class="img-prompt-body">
          <web-photor-upload
            lang="vi"
            .value=${url}
            @change=${e => { this._imgPrompt = { ...this._imgPrompt, url: e.detail?.value ?? '' } }}
          ></web-photor-upload>
        </div>
        ${url.trim() ? html`
          <div class="img-preview">
            <img src="${url}" alt="preview"
              @error=${e => { e.target.style.display = 'none' }}
              @load=${e => { e.target.style.display = 'block' }}
              style="display:none" />
          </div>
        ` : ''}
        <div class="img-prompt-actions">
          <button class="img-insert-btn" ?disabled=${!url.trim()} @click=${() => this._dfInsertImage()}>
            <iconify-icon icon="ri:check-line"></iconify-icon>
            ${replacing ? 'Thay thế' : 'Chèn vào'}
          </button>
        </div>
      </div>
    `
  }

  // ── _rb: Player (video embed) prompt modal ────────────────────────────────

  _rbPlayerPrompt() {
    if (!this._playerPrompt.open) return ''
    const { url, replacing, x, y } = this._playerPrompt
    const px = Math.max(8, x - 12) // offset so panel opens right of trigger
    const py = Math.max(8, y)
    return html`
      <div class="img-prompt" style="left:${px}px;top:${py}px" @click=${e => e.stopPropagation()}>
        <div class="img-prompt-header">
          <iconify-icon icon="ri:play-circle-line"></iconify-icon>
          <span>${replacing ? 'Thay video' : 'Chèn video'}</span>
          <button class="ai-close" @click=${() => { this._playerPrompt = { ...this._playerPrompt, open: false } }}>✕</button>
        </div>
        <div class="img-prompt-body">
          <svc-player-input
            lang="vi"
            .value=${url}
            @change=${e => { this._playerPrompt = { ...this._playerPrompt, url: e.detail?.value ?? '' } }}
          ></svc-player-input>
        </div>
        <div class="img-prompt-actions">
          <button class="img-insert-btn" ?disabled=${!url.trim()} @click=${() => this._dfInsertPlayer()}>
            <iconify-icon icon="ri:check-line"></iconify-icon>
            ${replacing ? 'Thay thế' : 'Chèn vào'}
          </button>
        </div>
      </div>
    `
  }

  // ── _rb: AI writing panel ─────────────────────────────────────────────────

  _rbAiPanel() {
    if (!this._aiPanel.open) return ''
    const { mode, prompt, loading, draft, x, y } = this._aiPanel
    const isError = draft.startsWith('⚠')
    const isDone  = !loading && draft && !isError
    // Center panel at trigger X; open downward from trigger Y.
    // x,y already in the correct fixed-positioning space (via _toFixed when stored).
    const px = Math.max(8, x - 4)
    const py = Math.max(8, y)
    return html`
      <div class="ai-panel" style="left:${px}px;top:${py}px" @click=${e => e.stopPropagation()}>
        <div class="ai-panel-header">
          <iconify-icon icon="ri:sparkling-2-line" class="${loading ? 'ai-spin' : ''}"></iconify-icon>
          <span>${mode === 'continue' ? 'Continue Writing' : 'Ask AI'}</span>
          <button class="ai-close" @click=${() => { this._aiPanel = { ...this._aiPanel, open: false } }}>✕</button>
        </div>

        <!-- Input form: visible only in ask mode, before submit, not while loading -->
        ${mode === 'ask' && !draft && !loading ? html`
          <div class="ai-input-wrap">
            <textarea class="ai-input" rows="2" placeholder="Yêu cầu của bạn…"
              .value=${prompt}
              @input=${e => { this._aiPanel = { ...this._aiPanel, prompt: e.target.value } }}
              @keydown=${e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._dfRunAI() } }}
            ></textarea>
            <button class="ai-submit" ?disabled=${!prompt.trim()} @click=${() => this._dfRunAI()}>→</button>
          </div>
        ` : ''}

        <!-- Full loading block: shown while waiting for first token (both modes) -->
        ${loading && !draft ? html`
          <div class="ai-loading">
            <div class="ai-loading-dots"><span></span><span></span><span></span></div>
            <span>${mode === 'continue' ? 'Đang viết tiếp…' : 'Đang xử lý…'}</span>
          </div>
        ` : ''}

        <!-- Draft output: streams in token by token -->
        ${draft ? html`
          <div class="ai-draft ${isError ? 'ai-draft-error' : ''}">${draft}</div>
          ${isDone ? html`
            <div class="ai-footer">
              <button class="ai-btn-insert" @click=${() => this._dfInsertAIDraft()}>
                <iconify-icon icon="ri:check-line"></iconify-icon> Chèn vào
              </button>
              <button class="ai-btn-retry" @click=${() => { this._aiPanel = { ...this._aiPanel, draft: '', loading: true }; this._dfRunAI() }}>
                <iconify-icon icon="ri:refresh-line"></iconify-icon> Thử lại
              </button>
              <button class="ai-btn-discard" @click=${() => { this._aiPanel = { ...this._aiPanel, draft: '', prompt: '' } }}>Huỷ</button>
            </div>
          ` : loading ? html`
            <div class="ai-stream-indicator">
              <div class="ai-loading-dots"><span></span><span></span><span></span></div>
            </div>
          ` : ''}
        ` : ''}
      </div>
    `
  }

  // ── _rb: Color picker ─────────────────────────────────────────────────────

  _rbColorPicker() {
    if (!this._cpicker.open) return ''
    const isText   = this._cpicker.tab === 'text'
    const swatches = isText ? COLORS : BG_COLORS
    return html`
      <div class="color-picker" style="left:${this._cpicker.x}px;top:${this._cpicker.y}px" @click=${e => e.stopPropagation()}>
        <div class="color-picker-tabs">
          <button class="cp-tab ${isText  ? 'active':''}" @click=${() => { this._cpicker = { ...this._cpicker, tab: 'text' } }}>Text</button>
          <button class="cp-tab ${!isText ? 'active':''}" @click=${() => { this._cpicker = { ...this._cpicker, tab: 'bg'   } }}>Background</button>
        </div>
        <div class="color-swatches">
          ${swatches.map(c => html`
            <div class="swatch" style="background:${c};${c === 'transparent' ? 'border:1px dashed #666' : ''}"
              title="${c}" @click=${() => this._applyColor(c)}></div>
          `)}
        </div>
      </div>
    `
  }
}

if (!customElements.get('svc-editor')) customElements.define('svc-editor', SvcEditor)
export default SvcEditor
