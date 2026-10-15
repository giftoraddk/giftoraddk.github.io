/**
 * <svc-editor> — rich-text editor: TipTap 3 in a Lit shadow root.
 *
 * Props:
 *   value       {String}  — HTML content (get/set via JS property; setting it doesn't fire `change`)
 *   placeholder {String}  — shown in an empty block
 *   readonly    {Boolean} — disables editing (live)
 *   ui          {String}  — 'modern' | 'pastel'
 *   theme       {String}  — data-theme forwarded to the host (unset → the parent host's)
 *   features    {String}  — comma list of enabled features (default: all).
 *                           Keys: bubble, slash, image, player, table, ai, color, ctx, task
 *   ai          {String}  — AI chain / API key string forwarded as opts.chain to createAIStream
 *
 * Events:
 *   change — { html, text } on every edit
 *
 * Floating UI — all inside the shadow root:
 *   - block handle (+ / ⠿): absolute inside the field, just above the hovered block — or the caret's block
 *     while the editor is focused (keyboard / touch have no hover). "+" adds a block below via the slash menu.
 *   - bubble (selection), slash menu, block menu, color picker, media prompts, AI panel: position:fixed,
 *     placed through _toFixed().
 *
 * Ported from astro-micro's media/svc-editor.js. createAIStream (services/shared/tensor-api.js) resolves the
 * whole answer at once, so the AI panel fills in one shot instead of streaming token by token.
 *
 * Usage:
 *   <svc-editor features="bubble,slash,image,color" ai="GEMINI_KEY"></svc-editor>
 */

import { LitElement, html, nothing, unsafeCSS } from 'lit'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { Placeholder } from '@tiptap/extension-placeholder'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'

import { PhotorNode } from './tool/photor-ext.js'
import { PlayerNode } from './tool/player-ext.js'
import { COLORS, BG_COLORS, SLASH_GROUPS, TURN_INTO, ALL_FEATURES } from './tool/editor-constants.js'
import { createAIStream } from '@/services/shared/tensor-api.js'
import { emit } from '@/services/tools/util.js'
import css from './css/svc-editor.css?inline'
import pmCss from './css/prose-mirror.css?inline'

import '@/packages/adopted/svc-photor.js'
import '@/packages/adopted/svc-player-embed.js'
import pastelStyles from '@/packages/apex/css/pastel.css?inline'

// Block handle: two HANDLE_H buttons stacked in the field's left gutter (css .block-handle / .bh-btn)
const HANDLE_H     = 22
const HANDLE_STACK = HANDLE_H * 2 + 3 // + the gap between them
const BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'LI', 'BLOCKQUOTE', 'PRE', 'HR'])

// Closed by an outside click / Escape — the bubble follows the selection, the AI panel has its own ✕
const OVERLAYS = ['_ctx', '_sub', '_cpicker', '_slash', '_imgPrompt', '_playerPrompt']

// Keeps the AI prompt well under the Worker's per-request char budget on large documents
const AI_DOC_CHARS = 50_000
// The 'ask' request the user types — its own cap, so a pasted wall of text can't push the message past that budget
const AI_PROMPT_CHARS = 2_000

// Insert / replace prompt per media node (key = node name). The node views (tool/editor-helpers.js) open it
// in replace mode by writing host[prompt] themselves.
const MEDIA = {
  image:  { prompt: '_imgPrompt',    icon: 'ri:image-line',       title: ['Chèn ảnh', 'Thay ảnh'] },
  player: { prompt: '_playerPrompt', icon: 'ri:play-circle-line', title: ['Chèn video', 'Thay video'] },
}

// Bubble-menu buttons: [editor.isActive args, title, label, command on a focused chain]
const BUBBLE_MARKS = [
  [['bold'],      'Bold',          html`B`,          c => c.toggleBold()],
  [['italic'],    'Italic',        html`<em>I</em>`, c => c.toggleItalic()],
  [['underline'], 'Underline',     html`<u>U</u>`,   c => c.toggleUnderline()],
  [['strike'],    'Strikethrough', html`<s>S</s>`,   c => c.toggleStrike()],
  [['code'],      'Inline code',   '<>',             c => c.toggleCode()],
]
const BUBBLE_BLOCKS = [1, 2, 3].map(level => [['heading', { level }], `Heading ${level}`, `H${level}`, c => c.toggleHeading({ level })])
  .concat([[['blockquote'], 'Quote', '"', c => c.toggleBlockquote()]])
// Color buttons: [picker tab, title, textStyle/highlight attribute source, swatch fallback]
const BUBBLE_COLORS = [['text', 'Text color', 'textStyle', '#fff'], ['bg', 'Highlight', 'highlight', '#fbbf24']]

const stop      = e => e.stopPropagation()
const copy      = text => navigator.clipboard?.writeText(text)?.catch(() => {})
const keepFocus = e => e.preventDefault() // mousedown on the handle must not blur the editor (it would hide it)

export class SvcEditor extends LitElement {
  static styles = [unsafeCSS(pastelStyles), unsafeCSS(css), unsafeCSS(pmCss)]

  static properties = {
    // ── standard svc-* baseline (CLAUDE.md) — not read here, kept so callers can drive it like any svc-* ──
    mainColors:  { type: String },
    bg:          { type: Object },
    textColor:   { type: String },
    actived:     {},
    service:     { type: String },
    _data:       { state: true },
    _actived:    { state: true },

    value:       {},
    placeholder: { type: String },
    readonly:    { type: Boolean },
    ui:          { type: String },
    theme:       { type: String },
    features:    { type: String },
    ai:          { type: String },

    _bubble:       { state: true },
    _slash:        { state: true },
    _ctx:          { state: true },
    _sub:          { state: true },
    _cpicker:      { state: true },
    _handle:       { state: true }, // { block, y } (px inside .editor-wrap) | null
    _aiPanel:      { state: true },
    _imgPrompt:    { state: true },
    _playerPrompt: { state: true },
  }

  // ── value accessor ────────────────────────────────────────────────────────

  get value() { return this._editor?.getHTML() ?? this._initValue ?? '' }
  set value(v) {
    this._initValue = v ?? ''
    if (this._editor && this._initValue !== this._editor.getHTML()) {
      this._editor.commands.setContent(this._initValue, { emitUpdate: false })
    }
  }

  // Enabled features — empty `features` = all. Cached per `features` string (read on every render / key).
  get _feat() {
    if (this._featKey !== this.features) {
      this._featKey = this.features
      this._featSet = new Set(this.features ? this.features.split(',').map(s => s.trim()).filter(Boolean) : ALL_FEATURES)
    }
    return this._featSet
  }

  constructor() {
    super()
    this.mainColors = ''
    this.bg         = null
    this.textColor  = ''
    this.actived    = null
    this.service    = ''
    this._data      = null
    this._actived   = null

    this.ui          = 'modern'
    this.theme       = ''
    this.features    = ''
    this.placeholder = "Type '/' for commands…"
    this.readonly    = false
    this.ai          = ''
    this._initValue  = ''
    this._editor     = null

    this._aiPanel      = { open: false, mode: 'ask', prompt: '', loading: false, draft: '', x: 0, y: 0 }
    this._imgPrompt    = { open: false, url: '', replacing: false, x: 0, y: 0 }
    this._playerPrompt = { open: false, url: '', replacing: false, x: 0, y: 0 }
    this._bubble       = { open: false, x: 0, y: 0 }
    this._slash        = { open: false, x: 0, y: 0, query: '', idx: 0 }
    this._ctx          = { open: false, x: 0, y: 0, block: null }
    this._sub          = { open: false, type: '' }
    this._cpicker      = { open: false, x: 0, y: 0, tab: 'text', block: null }
    this._handle       = null
    this._hover        = null // block under the pointer (plain field — the handle follows it via _syncHandle)
    this._slashStart   = null
    this._resizeObs    = null

    this._onDocClick = this._onDocClick.bind(this)
    this._onDocKey   = this._onDocKey.bind(this)
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  connectedCallback() {
    super.connectedCallback()
    // ApexUI selectors in this shadow root need data-theme on the host — inherit the parent host's when unset
    if (!this.theme) {
      const parent = this.getRootNode()?.host
      const t = parent?.getAttribute('data-theme') || parent?.theme
      if (t) this.setAttribute('data-theme', t)
    }
    document.addEventListener('click',   this._onDocClick)
    document.addEventListener('keydown', this._onDocKey)
    if (this.hasUpdated && !this._editor) this._dcInit() // moved in the DOM → a fresh editor, same content
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    document.removeEventListener('click',   this._onDocClick)
    document.removeEventListener('keydown', this._onDocKey)
    this._resizeObs?.disconnect()
    if (this._editor) {
      this._initValue = this._editor.getHTML()
      this._editor.destroy()
      this._editor = null
    }
    this._hover  = null
    this._handle = null
  }

  firstUpdated() { this._dcInit() }

  updated(changed) {
    if (changed.has('theme') && this.theme) this.setAttribute('data-theme', this.theme)
    if (changed.has('ui')    && this.ui)    this.setAttribute('data-ui', this.ui)
    if (changed.has('readonly') && this._editor && this._editor.isEditable === this.readonly) {
      this._editor.setEditable(!this.readonly, false)
      this._syncHandle()
    }
  }

  // ── _dc: TipTap init ──────────────────────────────────────────────────────

  _dcInit() {
    const el   = this.renderRoot.querySelector('.editor-content')
    const feat = this._feat
    el.replaceChildren() // a re-attach mounts into the same element

    this._editor = new Editor({
      element:  el,
      editable: !this.readonly,
      content:  this._initValue || '',
      extensions: [
        StarterKit.configure({ link: { openOnClick: false } }), // v3's kit already has Link + Underline
        TextStyle,
        Color,
        Highlight.configure({ multicolor: true }),
        Placeholder.configure({ placeholder: () => this.placeholder }),
        ...(feat.has('task')   ? [TaskList, TaskItem.configure({ nested: true })] : []),
        ...(feat.has('image')  ? [PhotorNode.configure({ inline: false, allowBase64: true })] : []),
        ...(feat.has('player') ? [PlayerNode] : []),
        ...(feat.has('table')  ? [Table.configure({ resizable: false }), TableRow, TableHeader, TableCell] : []),
      ],
      // Slash-menu keys run before ProseMirror's own keymap (Enter would split the block first)
      editorProps: { handleKeyDown: (_view, e) => this._onSlashKey(e) },

      onUpdate: ({ editor }) => {
        if (feat.has('slash')) this._checkSlash(editor)
        emit(this, 'change', { html: editor.getHTML(), text: editor.getText() })
      },
      onSelectionUpdate: ({ editor }) => this._closeStaleMediaPrompts(editor),
      // Every change of doc / selection / focus (TipTap dispatches focus + blur as transactions too)
      onTransaction: ({ editor }) => {
        if (feat.has('bubble')) this._updateBubble(editor)
        this._syncHandle()
      },
    })

    // The field reflows (panel resize, fullscreen) → the handle's block moves
    this._resizeObs ??= new ResizeObserver(() => this._syncHandle())
    this._resizeObs.observe(el)
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Merge `patch` into the state object at `key` — reassigns (→ re-render) only when a value changes. */
  _patch(key, patch) {
    const cur = this[key]
    for (const k in patch) if (cur[k] !== patch[k]) { this[key] = { ...cur, ...patch }; return }
  }

  /**
   * Viewport → position:fixed coordinates for the menus. An ancestor with transform / filter / backdrop-filter /
   * contain / will-change (a glass panel…) becomes their containing block instead of the viewport; the 0×0
   * fixed probe at left/top 0 (.fixed-origin) sits exactly at that origin, whatever caused it.
   * Also used by the media node views (tool/editor-helpers.js).
   */
  _toFixed(vx, vy) {
    const o = this.renderRoot?.querySelector('.fixed-origin')?.getBoundingClientRect()
    return o ? { x: vx - o.left, y: vy - o.top } : { x: vx, y: vy }
  }

  _closeOverlays() { for (const k of OVERLAYS) this._patch(k, { open: false }) }

  _closeAllMenus() {
    this._closeOverlays()
    this._patch('_bubble', { open: false })
  }

  // ── _dh: Bubble menu ──────────────────────────────────────────────────────

  _updateBubble(editor) {
    const { from, to, empty } = editor.state.selection
    if (empty || !editor.isEditable || editor.isActive('image') || editor.isActive('player')) {
      return this._patch('_bubble', { open: false })
    }
    try {
      const a = editor.view.coordsAtPos(from), b = editor.view.coordsAtPos(to)
      this._patch('_bubble', { open: true, ...this._toFixed((a.left + b.left) / 2, a.top - 44) })
      this._patch('_cpicker', { open: false })
      this.requestUpdate() // its buttons show the marks at the selection, which this transaction may have changed
    } catch {}
  }

  // ── _dh: Slash menu ───────────────────────────────────────────────────────

  _checkSlash(editor) {
    const { $from } = editor.state.selection
    const text = $from.parent.textContent
    if (text.startsWith('/')) {
      const start = $from.start()
      const pos   = editor.view.coordsAtPos(start)
      this._slash = { open: true, ...this._toFixed(pos.left, pos.bottom + 4), query: text.slice(1).toLowerCase(), idx: 0 }
      this._slashStart = start
    } else if (this._slashStart != null) {
      this._patch('_slash', { open: false })
      this._slashStart = null
    }
  }

  // Groups filtered by the query AND the enabled features
  _comSlashGroups() {
    const { query } = this._slash, feat = this._feat
    return SLASH_GROUPS
      .map(g => ({ ...g, items: g.items.filter(i => (!i.feat || feat.has(i.feat)) && (!query || i.label.toLowerCase().includes(query))) }))
      .filter(g => g.items.length)
  }

  /** true = handled (ProseMirror skips the key). */
  _onSlashKey(e) {
    const flat = this._slash.open ? this._comSlashGroups().flatMap(g => g.items) : []
    if (!flat.length) return false
    const { idx } = this._slash
    switch (e.key) {
      case 'ArrowDown': this._patch('_slash', { idx: Math.min(idx + 1, flat.length - 1) }); return true
      case 'ArrowUp':   this._patch('_slash', { idx: Math.max(idx - 1, 0) }); return true
      case 'Enter':     this._dfSlashSelect(flat[Math.min(idx, flat.length - 1)]); return true
      case 'Escape':    this._patch('_slash', { open: false }); return true
    }
    return false
  }

  _dfSlashSelect(item) {
    const editor = this._editor
    if (!editor) return
    const { x, y } = this._slash
    const { from } = editor.state.selection
    editor.chain().focus().deleteRange({ from: this._slashStart ?? from, to: from }).run() // drop the "/query"
    this._patch('_slash', { open: false })
    this._slashStart = null
    if (item.media)   this[MEDIA[item.media].prompt] = { open: true, url: '', replacing: false, x, y: y + 8 }
    else if (item.ai) this._openAiPanel(item.ai, x, y + 8)
    else              item.cmd(editor)
  }

  // ── _dh: Block handle ─────────────────────────────────────────────────────
  // Points at the hovered block while the pointer is over the field, else at the caret's block while the editor
  // is focused, else nowhere. Hidden while text is selected (the bubble takes over) and when readonly.

  /** Nearest block element (BLOCK_TAGS) of a node inside the editor. */
  _blockAt(node) {
    const root = this._editor?.view.dom
    if (!root || !node || !root.contains(node)) return null
    for (let n = node.nodeType === 1 ? node : node.parentElement; n && n !== root; n = n.parentElement) {
      if (BLOCK_TAGS.has(n.tagName)) return n
    }
    return null
  }

  _caretBlock() {
    const ed = this._editor
    if (!ed?.isFocused) return null
    try {
      const { node, offset } = ed.view.domAtPos(ed.state.selection.from)
      return this._blockAt(node === ed.view.dom ? (node.childNodes[offset] ?? node.lastChild) : node)
    } catch { return null }
  }

  _syncHandle() {
    this._placeHandle(this._hover?.isConnected ? this._hover : this._caretBlock())
  }

  _placeHandle(block) {
    const wrap = block && !this.readonly && this._feat.has('ctx') && this.renderRoot.querySelector('.editor-wrap')
    if (!wrap) {
      if (this._handle) this._handle = null
      return
    }
    // In the field's own left gutter (.has-handle widens its padding — nothing spills out of narrow fields /
    // panels): the top button centred on the block's first line, the stack kept inside the field
    const box = wrap.getBoundingClientRect(), r = block.getBoundingClientRect()
    const cs  = getComputedStyle(block)
    const line = Math.min(parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2 || r.height, r.height)
    const top = r.top - box.top - wrap.clientTop + (line - HANDLE_H) / 2
    const y   = Math.round(Math.max(3, Math.min(top, wrap.clientHeight - HANDLE_STACK - 3)))
    const h = this._handle
    if (h?.block !== block || h.y !== y) this._handle = { block, y }
  }

  _dhHover(e) {
    const block = this._blockAt(e.target)
    if (!block) return // the handle itself / the field's padding keep the last block
    this._hover = block
    this._placeHandle(block)
  }

  _dhLeave() {
    this._hover = null
    this._syncHandle()
  }

  /** Doc position at the start of a block element's content (before it, for a leaf like HR). */
  _posOf(block) { return this._editor.view.posAtDOM(block, 0) }

  // Selection → the block, so Turn Into / Delete (which act on the selection) hit the block the handle is on
  _selectBlock(block) {
    try {
      const pos = this._posOf(block), chain = this._editor.chain().focus()
      ;(block.tagName === 'HR' ? chain.setNodeSelection(pos) : chain.setTextSelection(pos)).run()
    } catch {}
  }

  /** The block's text as a range (null when it has none, e.g. HR). */
  _blockRange(block) {
    try {
      const from = this._posOf(block), $from = this._editor.state.doc.resolve(from)
      return $from.parent.isTextblock ? { from, to: from + $from.parent.content.size } : null
    } catch { return null }
  }

  // "+" → a new paragraph after the block, starting with "/" — the slash menu opens on it as if typed there
  _dhAddBlock() {
    const ed = this._editor, block = this._handle?.block
    if (!ed || !block) return
    try {
      const pos = this._posOf(block), $pos = ed.state.doc.resolve(pos)
      const at  = $pos.parent.isTextblock ? $pos.after() : pos + (ed.state.doc.nodeAt(pos)?.nodeSize ?? 0)
      const text = this._feat.has('slash') ? [{ type: 'text', text: '/' }] : undefined
      ed.chain().focus().insertContentAt(at, { type: 'paragraph', content: text }).run()
    } catch {}
  }

  _dhOpenCtx(e) {
    const block = this._handle?.block
    if (!block) return
    this._selectBlock(block)
    const r = e.currentTarget.getBoundingClientRect()
    this._ctx = { open: true, ...this._toFixed(r.left, r.bottom + 4), block }
    this._patch('_sub', { open: false })
    this._patch('_cpicker', { open: false })
    this._patch('_bubble', { open: false })
  }

  _dfCtxAction(action) {
    const editor = this._editor, { block } = this._ctx
    if (!editor) return
    switch (action) {
      case 'copy':
        copy(block?.innerText ?? '')
        break
      case 'copylink':
        copy(`${location.href.split('#')[0]}#${block?.id || 'block'}`)
        break
      case 'delete': {
        const { selection } = editor.state, chain = editor.chain().focus()
        ;(selection.node ? chain.deleteSelection() : chain.deleteNode(selection.$from.parent.type.name)).run()
        break
      }
      case 'ai':
        return this._openAiPanel('ask', this._ctx.x + 215, this._ctx.y) // closes the menus itself
    }
    this._closeAllMenus()
  }

  // ── _df: Color picker ─────────────────────────────────────────────────────

  // `block` = opened from the block menu → the color goes on that whole block, else on the selection
  _openColorPicker(tab, x, y, block = null) {
    this._cpicker = { open: true, x, y, tab, block }
    this._patch('_sub', { open: false })
  }

  _applyColor(color) {
    if (!this._editor) return
    const { tab, block } = this._cpicker
    const chain = this._editor.chain().focus()
    const range = block?.isConnected && this._blockRange(block)
    if (range) chain.setTextSelection(range)
    ;(tab === 'text' ? chain.setColor(color) : chain.setHighlight({ color })).run()
    if (range) this._closeAllMenus() // block menu done — the selection shows what got colored
  }

  // ── _df: Media (image / video) prompt ─────────────────────────────────────

  _dfInsertMedia(name) {
    const key = MEDIA[name].prompt, { url, replacing } = this[key], src = url.trim()
    if (!src || !this._editor) return
    const chain = this._editor.chain().focus()
    ;(replacing ? chain.updateAttributes(name, { src }) : chain.insertContent({ type: name, attrs: { src } })).run()
    this[key] = { ...this[key], open: false, url: '', replacing: false }
  }

  // A replace prompt belongs to the selected media node — close it once that node is deselected
  _closeStaleMediaPrompts(editor) {
    for (const [name, { prompt }] of Object.entries(MEDIA)) {
      if (this[prompt].open && this[prompt].replacing && !editor.isActive(name)) this._patch(prompt, { open: false })
    }
  }

  // ── _df: AI panel ─────────────────────────────────────────────────────────

  // x, y already in fixed space (_toFixed); none → the middle of the editor
  _openAiPanel(mode, x, y) {
    if (x == null) {
      const r = this.getBoundingClientRect()
      ;({ x, y } = this._toFixed(r.left + r.width / 2, r.top + r.height / 2))
    }
    this._aiPanel = { open: true, mode, prompt: '', loading: false, draft: '', x, y }
    this._closeAllMenus()
    if (mode === 'continue') this._dfRunAI()
  }

  /**
   * Flow chạy AI viết/gợi ý: _aiPanel (mode, prompt) + nội dung editor → _aiPanel.draft.
   * createAIStream(messages, opts) trả nguyên câu trả lời một lần (chain qua opts.chain) — xem đầu file.
   */
  async _dfRunAI() {
    // [1] CHECK: Chưa cấu hình `ai` (API key) — báo lỗi ngay, không gọi AI
    if (!this.ai) {
      this._patch('_aiPanel', { loading: false, draft: '⚠ Chưa cấu hình AI. Truyền prop ai="KEY1~label|KEY2~label" vào svc-editor.' })
      return
    }

    // [2] PROCESS: Build user message theo mode (continue = viết tiếp, ask = trả lời theo prompt)
    const fullText = this._editor?.getText() || ''
    const isCont  = this._aiPanel.mode === 'continue'
    // Viết tiếp trên tài liệu trống: không có gì để tiếp — báo tại chỗ, khỏi tốn 1 lượt gọi AI
    if (isCont && !fullText.trim()) {
      this._patch('_aiPanel', { loading: false, draft: '⚠ Chưa có nội dung để viết tiếp — hãy gõ vài dòng trước.' })
      return
    }
    // Continue cares about where the text ends; ask cares about where it starts — trim to fit the Worker's char budget
    const docText = isCont ? fullText.slice(-AI_DOC_CHARS) : fullText.slice(0, AI_DOC_CHARS)
    const userMsg = isCont
      ? `Continue writing naturally from where this text ends. Output only the continuation:\n\n${docText}`
      : `Document context:\n${docText}\n\nUser request: ${String(this._aiPanel.prompt ?? '').slice(0, AI_PROMPT_CHARS)}`

    // [3] EXECUTE: Gọi AI, đổ kết quả vào draft khi xong (spinner cả khi thử lại)
    this._patch('_aiPanel', { loading: true, draft: '' })
    try {
      const draft = await createAIStream([{ role: 'user', content: userMsg }], {
        chain: this.ai,
        system: 'You are a helpful writing assistant. Respond in the same language as the user. Be concise and natural.',
        maxTokens: 1024,
        temperature: 0.7,
      })
      this._patch('_aiPanel', { loading: false, draft })
    } catch (err) {
      //   [3.a] HANDLE_ERR: Hiện lỗi ngay trong panel (prefix ⚠), không throw ra ngoài
      this._patch('_aiPanel', { loading: false, draft: `⚠ ${err.message}` })
    }
  }

  _dfInsertAIDraft() {
    if (!this._editor || !this._aiPanel.draft) return
    this._editor.chain().focus().insertContent(this._aiPanel.draft).run()
    this._patch('_aiPanel', { open: false, draft: '', prompt: '' })
  }

  // ── _dh: Global click / keyboard ──────────────────────────────────────────

  // composedPath() crosses shadow roots — e.target alone is retargeted to the host
  _onDocClick(e) { if (!e.composedPath().includes(this)) this._closeAllMenus() }

  _onDocKey(e) { if (e.key === 'Escape') this._closeAllMenus() }

  // ── Render ────────────────────────────────────────────────────────────────

  render() {
    const feat = this._feat
    return html`
      <i class="fixed-origin" aria-hidden="true"></i>
      <div class="editor-wrap ${this.ui === 'pastel' ? 'pastel' : ''} ${feat.has('ctx') && !this.readonly ? 'has-handle' : ''}"
          @click=${() => { if (!this._editor?.isActive('image')) this._closeOverlays() }}
          @mouseover=${this._dhHover} @mouseleave=${this._dhLeave}>
        <div class="editor-content"></div>
        ${this._rbHandle()}
      </div>

      ${feat.has('bubble') ? this._rbBubbleMenu()          : nothing}
      ${feat.has('slash')  ? this._rbSlashMenu()           : nothing}
      ${feat.has('ctx')    ? this._rbCtxMenu()             : nothing}
      ${feat.has('color')  ? this._rbColorPicker()         : nothing}
      ${feat.has('image')  ? this._rbMediaPrompt('image')  : nothing}
      ${feat.has('player') ? this._rbMediaPrompt('player') : nothing}
      ${feat.has('ai')     ? this._rbAiPanel()             : nothing}
    `
  }

  // ── _rb: Block handle ─────────────────────────────────────────────────────

  _rbHandle() {
    const h = this._handle
    if (!h || this._bubble.open) return nothing
    return html`
      <div class="block-handle" style="top:${h.y}px" @mousedown=${keepFocus} @click=${stop}>
        <button type="button" class="bh-btn" title="Add block" @click=${this._dhAddBlock}>+</button>
        <button type="button" class="bh-btn" title="Block options" @click=${this._dhOpenCtx}>⠿</button>
      </div>
    `
  }

  // ── _rb: Bubble menu ──────────────────────────────────────────────────────

  _rbBubbleMenu() {
    const e = this._editor
    if (!this._bubble.open || !e) return nothing
    const { x, y } = this._bubble
    const btn = ([active, title, label, cmd]) => html`
      <button class="bm-btn ${e.isActive(...active) ? 'active' : ''}" title=${title}
          @click=${() => cmd(e.chain().focus()).run()}>${label}</button>`
    return html`
      <div class="bubble-menu" style="left:${x}px;top:${y}px;transform:translateX(-50%)" @click=${stop}>
        ${BUBBLE_MARKS.map(btn)}
        <div class="bm-sep"></div>
        ${BUBBLE_BLOCKS.map(btn)}
        ${this._feat.has('color') ? html`
          <div class="bm-sep"></div>
          ${BUBBLE_COLORS.map(([tab, title, attr, fallback]) => html`
            <button class="bm-btn" title=${title}
                @click=${ev => { ev.stopPropagation(); this._openColorPicker(tab, x - 100, y + 44) }}>
              <span style="display:flex;flex-direction:column;align-items:center;gap:1px">
                <span>A</span>
                <span style="width:14px;height:3px;border-radius:2px;background:${e.getAttributes(attr).color || fallback}"></span>
              </span>
            </button>`)}
        ` : nothing}
      </div>
    `
  }

  // ── _rb: Slash menu ───────────────────────────────────────────────────────

  _rbSlashMenu() {
    if (!this._slash.open) return nothing
    const groups = this._comSlashGroups()
    if (!groups.length) return nothing
    const { x, y, query, idx: selected } = this._slash
    let idx = -1
    return html`
      <div class="slash-menu" style="left:${x}px;top:${y}px" @click=${stop}>
        <div class="slash-filter">
          <span class="slash-slash">/</span>
          ${query ? html`<span class="slash-query">${query}</span>` : html`<span class="slash-placeholder">Filter…</span>`}
        </div>
        ${groups.map((group, gi) => html`
          ${gi ? html`<div class="slash-group-divider"></div>` : nothing}
          <div class="slash-group-label">${group.label}</div>
          ${group.items.map(item => {
            const i = ++idx
            return html`
              <button class="slash-item ${i === selected ? 'selected' : ''}"
                  @mouseenter=${() => this._patch('_slash', { idx: i })}
                  @click=${() => this._dfSlashSelect(item)}>
                <span class="slash-icon">
                  ${item.ic ? html`<iconify-icon icon=${item.ic}></iconify-icon>` : html`<span class="slash-text-icon">${item.icon}</span>`}
                </span>
                <span class="slash-label">${item.label}</span>
              </button>
            `
          })}
        `)}
      </div>
    `
  }

  // ── _rb: Block menu (⠿) ───────────────────────────────────────────────────

  _rbCtxMenu() {
    if (!this._ctx.open) return nothing
    const { x, y, block } = this._ctx, feat = this._feat
    const turnInto = this._sub.open && this._sub.type === 'turninto'
    const item = (action, icon, label, kbd, cls = '') => html`
      <button class="ctx-item ${cls}" @click=${() => this._dfCtxAction(action)}>
        <iconify-icon icon=${icon}></iconify-icon> ${label}
        <span class="ctx-kbd">${kbd}</span>
      </button>`
    return html`
      <div class="ctx-menu" style="left:${x}px;top:${y}px" @click=${stop}>
        <div class="ctx-section">Block options</div>

        ${feat.has('color') ? html`
          <button class="ctx-item" @click=${ev => { ev.stopPropagation(); this._openColorPicker('text', x + 210, y, block) }}>
            <iconify-icon icon="ri:palette-line"></iconify-icon> Color
            <span class="ctx-arrow">›</span>
          </button>
        ` : nothing}

        <button class="ctx-item" @click=${ev => { ev.stopPropagation(); this._sub = { open: !turnInto, type: 'turninto' } }}>
          <iconify-icon icon="ri:swap-line"></iconify-icon> Turn Into
          <span class="ctx-arrow">›</span>
        </button>

        <div class="ctx-divider"></div>
        ${item('copy', 'ri:clipboard-line', 'Copy to clipboard', '⌘C')}
        ${item('copylink', 'ri:links-line', 'Copy anchor link', '⌘^L')}

        ${feat.has('ai') ? html`
          <div class="ctx-divider"></div>
          ${item('ai', 'ri:sparkling-line', 'Ask AI', '⌘J')}
        ` : nothing}

        <div class="ctx-divider"></div>
        ${item('delete', 'ri:delete-bin-line', 'Delete', 'Del', 'danger')}
      </div>

      ${turnInto ? html`
        <div class="ctx-sub" style="left:${x + 210}px;top:${y}px" @click=${stop}>
          ${TURN_INTO.map(t => html`
            <button class="ctx-item" @click=${() => { t.cmd(this._editor); this._closeAllMenus() }}>
              <span style="width:22px;text-align:center;font-size:0.8rem;font-weight:700">${t.icon}</span>
              ${t.label}
            </button>
          `)}
        </div>
      ` : nothing}
    `
  }

  // ── _rb: Media (image / video) prompt ─────────────────────────────────────

  _rbMediaPrompt(name) {
    const { prompt, icon, title } = MEDIA[name]
    const { open, url, replacing, x, y } = this[prompt]
    if (!open) return nothing
    const onChange = e => this._patch(prompt, { url: e.detail?.value ?? '' })
    const hasUrl   = !!url.trim()
    return html`
      <div class="img-prompt" style="left:${Math.max(8, x - 12)}px;top:${Math.max(8, y)}px" @click=${stop}>
        <div class="img-prompt-header">
          <iconify-icon icon=${icon}></iconify-icon>
          <span>${title[replacing ? 1 : 0]}</span>
          <button class="ai-close" @click=${() => this._patch(prompt, { open: false })}>✕</button>
        </div>
        <div class="img-prompt-body">
          ${name === 'image'
            ? html`<svc-photor lang="vi" .value=${url} @change=${onChange}></svc-photor>`
            : html`<svc-player-input lang="vi" .value=${url} @change=${onChange}></svc-player-input>`}
        </div>
        ${name === 'image' && hasUrl ? html`
          <div class="img-preview">
            <img src=${url} alt="preview" style="display:none"
              @error=${e => { e.target.style.display = 'none' }}
              @load=${e => { e.target.style.display = 'block' }} />
          </div>
        ` : nothing}
        <div class="img-prompt-actions">
          <button class="img-insert-btn" ?disabled=${!hasUrl} @click=${() => this._dfInsertMedia(name)}>
            <iconify-icon icon="ri:check-line"></iconify-icon>
            ${replacing ? 'Thay thế' : 'Chèn vào'}
          </button>
        </div>
      </div>
    `
  }

  // ── _rb: AI writing panel ─────────────────────────────────────────────────

  _rbAiPanel() {
    if (!this._aiPanel.open) return nothing
    const { mode, prompt, loading, draft, x, y } = this._aiPanel
    const isError = draft.startsWith('⚠')
    const isDone  = !loading && draft && !isError
    return html`
      <div class="ai-panel" style="left:${Math.max(8, x - 4)}px;top:${Math.max(8, y)}px" @click=${stop}>
        <div class="ai-panel-header">
          <iconify-icon icon="ri:sparkling-2-line" class=${loading ? 'ai-spin' : ''}></iconify-icon>
          <span>${mode === 'continue' ? 'Continue Writing' : 'Ask AI'}</span>
          <button class="ai-close" @click=${() => this._patch('_aiPanel', { open: false })}>✕</button>
        </div>

        <!-- Input: ask mode only, before submit, not while loading -->
        ${mode === 'ask' && !draft && !loading ? html`
          <div class="ai-input-wrap">
            <textarea class="ai-input" rows="2" placeholder="Yêu cầu của bạn…"
              .value=${prompt}
              @input=${e => this._patch('_aiPanel', { prompt: e.target.value })}
              @keydown=${e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._dfRunAI() } }}
            ></textarea>
            <button class="ai-submit" ?disabled=${!prompt.trim()} @click=${() => this._dfRunAI()}>→</button>
          </div>
        ` : nothing}

        ${loading ? html`
          <div class="ai-loading">
            <div class="ai-loading-dots"><span></span><span></span><span></span></div>
            <span>${mode === 'continue' ? 'Đang viết tiếp…' : 'Đang xử lý…'}</span>
          </div>
        ` : nothing}

        ${draft ? html`
          <div class="ai-draft ${isError ? 'ai-draft-error' : ''}">${draft}</div>
          ${isDone ? html`
            <div class="ai-footer">
              <button class="ai-btn-insert" @click=${() => this._dfInsertAIDraft()}>
                <iconify-icon icon="ri:check-line"></iconify-icon> Chèn vào
              </button>
              <button class="ai-btn-retry" @click=${() => this._dfRunAI()}>
                <iconify-icon icon="ri:refresh-line"></iconify-icon> Thử lại
              </button>
              <button class="ai-btn-discard" @click=${() => this._patch('_aiPanel', { draft: '', prompt: '' })}>Huỷ</button>
            </div>
          ` : nothing}
        ` : nothing}
      </div>
    `
  }

  // ── _rb: Color picker ─────────────────────────────────────────────────────

  _rbColorPicker() {
    if (!this._cpicker.open) return nothing
    const { x, y, tab } = this._cpicker
    const isText = tab === 'text'
    return html`
      <div class="color-picker" style="left:${x}px;top:${y}px" @click=${stop}>
        <div class="color-picker-tabs">
          <button class="cp-tab ${isText ? 'active' : ''}"  @click=${() => this._patch('_cpicker', { tab: 'text' })}>Text</button>
          <button class="cp-tab ${!isText ? 'active' : ''}" @click=${() => this._patch('_cpicker', { tab: 'bg' })}>Background</button>
        </div>
        <div class="color-swatches">
          ${(isText ? COLORS : BG_COLORS).map(c => html`
            <div class="swatch" style="background:${c};${c === 'transparent' ? 'border:1px dashed #666' : ''}"
              title=${c} @click=${() => this._applyColor(c)}></div>
          `)}
        </div>
      </div>
    `
  }
}

if (!customElements.get('svc-editor')) customElements.define('svc-editor', SvcEditor)
export default SvcEditor
