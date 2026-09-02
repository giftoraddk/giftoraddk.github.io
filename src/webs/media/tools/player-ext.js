import { Node, mergeAttributes } from '@tiptap/core'
import { createMediaNodeView, captionInlineStyle, readMediaAttr } from './nodeview-helpers.js'
import { detectProvider } from './service.js'
import '../svc-player.js'

/**
 * TipTap Player extension — embeds `svc-player` (YouTube/Vimeo/TikTok/native
 * video) as an atom block node, the video-embed counterpart of image-ext.js.
 *
 * Same attributes, same always-figure-wrapped serialization shape, and the exact same
 * toolbar/resize/caption NodeView as PhotorNode — see image-ext.js's renderHTML() for why
 * that shape (rather than a bare <svc-player>) is the single source of truth shared with
 * the live editor's own DOM. Both extensions are built by the shared createMediaNodeView()
 * factory in nodeview-helpers.js, only swapping in `<svc-player>` for `<img>`.
 */
export const PlayerNode = Node.create({
  name: 'player',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      // el is normally the wrapping <figure> (current format, always wraps) — readMediaAttr's
      // fallback to the inner <svc-player> only matters for content saved by an older format
      // that put data-align/data-width on the player tag instead. Tiptap always re-runs these
      // per-attribute callbacks against whichever element matched and lets the result win over
      // the rule-level getAttrs below, so an assumption that only holds for one shape silently
      // corrupts others.
      align: {
        default: 'center',
        parseHTML: el => readMediaAttr(el, 'svc-player', 'data-align') || 'center',
        renderHTML: () => ({}), // set directly on the <figure> in renderHTML() below
      },
      width: {
        default: null,
        // data-width on the figure is only ever a bare presence flag (CSS switch to
        // fit-content, see prose-mirror.css) — the actual px value lives in <svc-player
        // style> (or, for content saved by an older format, a real value in its data-width).
        parseHTML: el => {
          const player = el.tagName === 'SVC-PLAYER' ? el : el.querySelector('svc-player')
          return player?.style.width || player?.getAttribute('data-width') || null
        },
        renderHTML: () => ({}), // set directly on the <figure> in renderHTML() below (actual px size lives in <svc-player style>)
      },
      caption: {
        default: null,
        // Only look for a figcaption when el IS the figure — a bare <svc-player>/legacy
        // <div data-player> never has a caption to begin with, so searching el.parentElement
        // here would find OTHER sibling figures' figcaptions in the shared parent instead.
        parseHTML: el => el.tagName === 'FIGURE' ? (el.querySelector('figcaption')?.textContent?.trim() || null) : null,
        renderHTML: () => ({}), // rendered as a real <figcaption> child in renderHTML() below
      },
    }
  },

  // The figure rule consumes the whole wrapper as one atom — otherwise ProseMirror would
  // unwrap the unmatched <figure>/<figcaption> tags and parse the caption text as a stray
  // paragraph right after the player (see image-ext.js). The bare `svc-player`/legacy
  // `div[data-player]` rules stay as fallbacks for content saved before every player was
  // figure-wrapped.
  //
  // getAttrs here only needs to supply src: Tiptap's default parseHTML fallback for attributes
  // without one (fromString(el.getAttribute(name))) reads straight off `el`, which is the
  // <figure> here and has no src of its own — so without this, src would silently resolve to
  // null. align/width/caption are deliberately NOT set here; the per-attribute parseHTML above
  // always overrides whatever this returns for those anyway.
  parseHTML() {
    return [
      {
        tag: 'figure[data-media-wrap="player"]',
        getAttrs: el => ({
          src: el.querySelector('svc-player')?.getAttribute('src') || null,
        }),
      },
      { tag: 'svc-player' },       // legacy — content saved before every player was figure-wrapped
      { tag: 'div[data-player]' }, // legacy — content saved before player nodes rendered as <svc-player> directly
    ]
  },

  // Always wrap in <figure data-align data-width>…<svc-player>, plus a <figcaption> when a
  // caption is set — see image-ext.js's renderHTML() for the full rationale (identical shape
  // to the live NodeView, figure is the single source of truth for alignment/sizing CSS).
  renderHTML({ node, HTMLAttributes }) {
    const { align, width, caption } = node.attrs
    const style = width ? `width:${width};max-width:100%;display:block` : null
    const player = ['svc-player', mergeAttributes(HTMLAttributes, { control: '' }, style ? { style } : {})]
    const figureAttrs = { 'data-media-wrap': 'player', 'data-align': align || 'center', ...(width ? { 'data-width': '' } : {}) }
    return caption
      ? ['figure', figureAttrs, player, ['figcaption', { style: captionInlineStyle }, caption]]
      : ['figure', figureAttrs, player]
  },

  addNodeView() {
    return createMediaNodeView('player', {
      replaceLabel: 'Replace video',
      promptKey: '_playerPrompt',
      // Embed URLs (YouTube/Vimeo/TikTok) aren't files a browser can download — only a
      // direct video file (mp4/webm/...) is, so hide the toolbar's download button otherwise.
      canDownload: attrs => detectProvider(attrs.src) === 'video',
      createEl(node) {
        const player = document.createElement('svc-player')
        player.src = node.attrs.src || ''
        player.control = true
        player.locked = true // inert while editing — see svc-player.js
        return player
      },
      syncEl(player, attrs) {
        player.src = attrs.src || ''
      },
    })
  },
})
