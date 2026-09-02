import { mergeAttributes } from '@tiptap/core'
import { Image as BaseImage } from '@tiptap/extension-image'
import { createMediaNodeView, captionInlineStyle, readMediaAttr } from './nodeview-helpers.js'

/**
 * TipTap Image extension with:
 * - `align`   — left / center / right, stored as data-align on the wrapping <figure>
 * - `width`   — always stored as px to avoid %-vs-containing-block bugs
 * - `caption` — editable figcaption toggled via toolbar button
 *
 * Always serializes as <figure data-media-wrap="image" data-align data-width><img>[<figcaption>]
 * — the exact same shape the live NodeView below builds — so prose-mirror.css's
 * figure[data-align]/[data-width] rules are the single source of truth for alignment/sizing in
 * both the editor and any read-only render (e.g. [id].astro's `set:html`), rather than the editor
 * and the serialized output each needing their own copy of that logic.
 *
 * The NodeView (toolbar, resize handles, caption) is built by the shared
 * createMediaNodeView() factory in nodeview-helpers.js — see there for the
 * DOM structure, which is identical to player-ext.js's video embed.
 */
export const PhotorNode = BaseImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      // el is normally the wrapping <figure> (current format, always wraps) — readMediaAttr's
      // fallback to the inner <img> only matters for content saved by an older format that put
      // data-align/data-width on the img instead. Tiptap always re-runs these per-attribute
      // callbacks against whichever element matched and lets the result win over the rule-level
      // getAttrs below, so an assumption that only holds for one shape silently corrupts others.
      align: {
        default: 'center',
        parseHTML: el => readMediaAttr(el, 'img', 'data-align') || 'center',
        renderHTML: () => ({}), // set directly on the <figure> in renderHTML() below
      },
      width: {
        default: null,
        // data-width on the figure is only ever a bare presence flag (CSS switch to
        // fit-content, see prose-mirror.css) — the actual px value lives in <img style>
        // (or, for content saved by an older format, a real value in <img data-width>).
        parseHTML: el => {
          const img = el.tagName === 'IMG' ? el : el.querySelector('img')
          return img?.style.width || img?.getAttribute('data-width') || null
        },
        renderHTML: () => ({}), // set directly on the <figure> in renderHTML() below (actual px size lives in <img style>)
      },
      caption: {
        default: null,
        // Only look for a figcaption when el IS the figure — a bare <img> (the legacy
        // fallback rule) never has a caption to begin with, so searching el.parentElement
        // here would find OTHER sibling figures' figcaptions in the shared parent instead.
        parseHTML: el => el.tagName === 'FIGURE' ? (el.querySelector('figcaption')?.textContent?.trim() || null) : null,
        renderHTML: () => ({}), // rendered as a real <figcaption> child in renderHTML() below
      },
    }
  },

  // Consume the whole <figure> as one atom — otherwise ProseMirror, finding no rule for the
  // unmatched <figure>/<figcaption> wrapper tags, would unwrap them and parse the caption text
  // as a stray paragraph right after the image. The plain `img[src]` rule stays as a fallback
  // for content saved before every image was figure-wrapped.
  //
  // getAttrs here only needs to supply src/alt/title: Tiptap's default parseHTML fallback for
  // attributes without one (fromString(el.getAttribute(name))) reads straight off `el`, which
  // is the <figure> here and has no src/alt/title of its own — so without this, those three
  // would silently resolve to null. align/width/caption are deliberately NOT set here; the
  // per-attribute parseHTML above always overrides whatever this returns for those anyway.
  parseHTML() {
    return [
      {
        tag: 'figure[data-media-wrap="image"]',
        getAttrs: el => {
          const img = el.querySelector('img')
          return {
            src:   img?.getAttribute('src')   || null,
            alt:   img?.getAttribute('alt')    || null,
            title: img?.getAttribute('title')  || null,
          }
        },
      },
      { tag: this.options.allowBase64 ? 'img[src]' : 'img[src]:not([src^="data:"])' },
    ]
  },

  // Always wrap in <figure data-align data-width>…<img>, plus a <figcaption> when a caption
  // is set. `data-width` is a bare presence flag (CSS switch to fit-content, see
  // prose-mirror.css); the actual pixel size still has to live on <img style> to size the
  // real element — the figure's own width is CSS-driven, not stored as a number.
  renderHTML({ node, HTMLAttributes }) {
    const { align, width, caption } = node.attrs
    const style = width ? `width:${width};max-width:100%;display:block` : null
    const img = ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, style ? { style } : {})]
    const figureAttrs = { 'data-media-wrap': 'image', 'data-align': align || 'center', ...(width ? { 'data-width': '' } : {}) }
    return caption
      ? ['figure', figureAttrs, img, ['figcaption', { style: captionInlineStyle }, caption]]
      : ['figure', figureAttrs, img]
  },

  addNodeView() {
    return createMediaNodeView('image', {
      replaceLabel: 'Replace image',
      promptKey: '_imgPrompt',
      createEl(node) {
        const img = document.createElement('img')
        img.src = node.attrs.src || ''
        img.alt = node.attrs.alt || ''
        return img
      },
      syncEl(img, attrs) {
        img.src = attrs.src || ''
        img.alt = attrs.alt || ''
      },
    })
  },
})
