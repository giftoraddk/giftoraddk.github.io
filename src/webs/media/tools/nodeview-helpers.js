/**
 * media/tools/nodeview-helpers.js
 *
 * Shared TipTap NodeView builder for "media block" atom nodes — image and
 * player are the exact same chrome (align L/C/R, drag-resize, caption,
 * download, replace, delete) around a different sized element (<img> vs
 * <svc-player>), so both extensions call the single `createMediaNodeView()`
 * factory below instead of duplicating ~150 lines of DOM/drag logic each.
 */

/** Icon-button that won't steal editor focus on mousedown. Supports `ri:icon-name` strings. */
const mkBtn = (icon, title, cls = '') => {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'ibt-btn' + (cls ? ` ${cls}` : '')
  btn.title = title
  if (icon.includes(':')) {
    const ic = document.createElement('iconify-icon')
    ic.setAttribute('icon', icon)
    btn.appendChild(ic)
  } else {
    btn.textContent = icon
  }
  btn.addEventListener('mousedown', e => e.preventDefault())
  return btn
}

const mkSep = () => Object.assign(document.createElement('div'), { className: 'ibt-sep' })

/** Inline style baked onto the serialized <figcaption> so captions read correctly outside the editor too. */
export const captionInlineStyle = 'margin:.5rem 0 0;font-size:.875rem;text-align:center;opacity:.65'

/**
 * Reads a data-* attribute off `el` itself, falling back to `el`'s inner sized element
 * (matched by `innerSelector`, e.g. 'img' or 'svc-player') if `el` doesn't carry it directly.
 * image-ext.js/player-ext.js always serialize align/width onto the wrapping <figure> now, so
 * `el` normally already has the attribute — the inner-element fallback exists purely to still
 * parse content saved by an older format where these lived on the img/player tag instead.
 */
export const readMediaAttr = (el, innerSelector, name) =>
  el.getAttribute(name) || el.querySelector(innerSelector)?.getAttribute(name) || null

/**
 * Align L/C/R button trio. `onAlign(align)` fires on click.
 * Returns the three buttons plus `sync(align)` to reflect the current value's active state.
 */
const mkAlignButtons = onAlign => {
  const bAlL = mkBtn('ri:align-left',   'Align left',   'ibt-al')
  const bAlC = mkBtn('ri:align-center', 'Align center', 'ibt-al')
  const bAlR = mkBtn('ri:align-right',  'Align right',  'ibt-al')

  const sync = al => {
    bAlL.classList.toggle('active', al === 'left')
    bAlC.classList.toggle('active', al === 'center')
    bAlR.classList.toggle('active', al === 'right')
  }

  bAlL.addEventListener('click', () => onAlign('left'))
  bAlC.addEventListener('click', () => onAlign('center'))
  bAlR.addEventListener('click', () => onAlign('right'))

  return { bAlL, bAlC, bAlR, sync }
}

/**
 * Left/right `.img-rh` drag handles that resize `sizedEl` (the media element)
 * by setting its (and `inner`'s) pixel width live during drag. A light-DOM
 * viewport overlay captures mousemove/mouseup across Shadow DOM boundaries
 * and keeps ProseMirror from interfering.
 *
 * `onDragStart` (optional) fires once at mousedown, before the overlay is attached.
 * `onCommit(finalWidthPx)` fires at mouseup with the settled pixel width.
 */
const mkResizeHandles = (sizedEl, inner, wrap, onCommit, onDragStart) => {
  const lHandle = document.createElement('div')
  lHandle.className = 'img-rh img-rh-left'
  lHandle.innerHTML = '<div class="img-rh-bar"></div>'

  const rHandle = document.createElement('div')
  rHandle.className = 'img-rh img-rh-right'
  rHandle.innerHTML = '<div class="img-rh-bar"></div>'

  const addResizeDrag = (handle, isLeft) => {
    handle.addEventListener('mousedown', e => {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      onDragStart?.()

      const x0   = e.clientX
      const w0   = sizedEl.offsetWidth
      const maxW = wrap.parentElement?.offsetWidth || 800

      // Light-DOM overlay captures ALL mouse events during drag, bypassing
      // Shadow DOM and ProseMirror — the only reliable pattern for cross-shadow dragging.
      const overlay = document.createElement('div')
      overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;cursor:ew-resize'
      document.body.appendChild(overlay)

      overlay.addEventListener('mousemove', ev => {
        const d = ev.clientX - x0
        // left handle grows the element when dragging left; right handle when dragging right
        const w = Math.max(200, Math.min(maxW, isLeft ? w0 - d : w0 + d))
        sizedEl.style.width = `${w}px`
        inner.style.width   = `${w}px`
      })

      overlay.addEventListener('mouseup', () => {
        overlay.remove()
        // Save as px — storing as % would be computed against inner.style.width
        // (the containing block), not the editor, causing revert bugs on next resize.
        onCommit(sizedEl.offsetWidth)
      }, { once: true })
    })
  }
  addResizeDrag(lHandle, true)
  addResizeDrag(rHandle, false)

  // Keep inner.style.width equal to the sized element's actual pixel width.
  const syncInnerWidth = () => {
    if (sizedEl.offsetWidth) inner.style.width = `${sizedEl.offsetWidth}px`
  }

  return { lHandle, rHandle, syncInnerWidth }
}

/**
 * Floating toolbar: align L/C/R, caption toggle, download, replace, delete.
 * The caption toggle button (`bCap`) is returned rather than wired here — it
 * lives in the toolbar but must show/hide+focus the <figcaption> element,
 * which doesn't exist yet at this point (see mkCaption below).
 *
 * `canDownload(attrs)` decides whether the download button is shown at all —
 * e.g. player-ext.js hides it for embed URLs (YouTube/Vimeo/TikTok), which
 * aren't files a browser can actually download, only for direct video files.
 * Returns `syncDownload(attrs)` so the caller can re-check this after a
 * replace-src update, not just at creation.
 */
const mkToolbar = ({ nodeName, editor, updateAttrs, replaceLabel, promptKey, canDownload }) => {
  const bar = document.createElement('div')
  bar.className = 'img-inline-bar'
  bar.setAttribute('contenteditable', 'false')

  const { bAlL, bAlC, bAlR, sync: syncAlign } = mkAlignButtons(align => {
    editor.commands.focus()
    updateAttrs({ align })
  })

  const bCap = mkBtn('ri:text',            'Caption')
  const bDl  = mkBtn('ri:download-line',   'Download')
  const bRpl = mkBtn('ri:refresh-line',    replaceLabel)
  const bDel = mkBtn('ri:delete-bin-line', 'Delete', 'ibt-danger')

  bDl.addEventListener('click', () => {
    const src = editor.getAttributes(nodeName).src
    if (!src) return
    Object.assign(document.createElement('a'), {
      href: src, download: src.split('/').pop() || nodeName, target: '_blank',
    }).click()
  })

  // Signal the host Lit element to open the insert prompt in replace mode
  bRpl.addEventListener('click', () => {
    const host = editor.view.dom.getRootNode()?.host
    if (!host) return
    const rect = bRpl.getBoundingClientRect()
    // Use host._toFixed to convert viewport coords into the correct fixed-positioning space
    const pos  = host._toFixed?.(rect.left + rect.width / 2, rect.bottom + 8) ?? { x: rect.left, y: rect.bottom + 8 }
    host[promptKey] = { open: true, url: editor.getAttributes(nodeName).src || '', replacing: true, x: pos.x, y: pos.y }
  })

  bDel.addEventListener('click', () => editor.chain().focus().deleteSelection().run())

  bar.append(bAlL, bAlC, bAlR, mkSep(), bCap, mkSep(), bDl, bRpl, bDel)

  const syncDownload = attrs => { bDl.hidden = !canDownload(attrs) }

  return { bar, syncAlign, syncDownload, bCap }
}

/**
 * Contenteditable <figcaption>, toggled via the toolbar's `bCap` button (built
 * by mkToolbar above but wired here, once this element actually exists).
 * Returns `syncCaption(newCaption)` to re-apply an external attrs update.
 */
const mkCaption = (node, bCap, updateAttrs) => {
  const cap = document.createElement('figcaption')
  cap.className = 'img-caption'
  cap.contentEditable = 'true'
  cap.dataset.placeholder = 'Add a caption…'
  cap.textContent = node.attrs.caption || ''
  cap.style.display = node.attrs.caption ? 'block' : 'none'
  bCap.classList.toggle('active', Boolean(node.attrs.caption))

  cap.addEventListener('keydown', e => {
    e.stopPropagation() // prevent ProseMirror from handling Enter/Escape inside caption
    if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); cap.blur() }
  })
  cap.addEventListener('blur', () => {
    const text = cap.textContent.trim()
    updateAttrs({ caption: text || null })
    bCap.classList.toggle('active', !!text || cap.style.display !== 'none')
  })
  bCap.addEventListener('click', () => {
    const visible = cap.style.display !== 'none'
    cap.style.display = visible ? 'none' : 'block'
    bCap.classList.toggle('active', !visible)
    if (!visible) {
      requestAnimationFrame(() => {
        cap.focus()
        const r = document.createRange()
        r.selectNodeContents(cap); r.collapse(false)
        const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(r)
      })
    } else if (!cap.textContent.trim()) {
      updateAttrs({ caption: null })
    }
  })

  const syncCaption = newCap => {
    if (cap.textContent !== newCap) cap.textContent = newCap
    if (newCap) cap.style.display = 'block'
    bCap.classList.toggle('active', !!newCap || cap.style.display !== 'none')
  }

  return { cap, syncCaption }
}

/**
 * Builds a TipTap NodeView for a resizable, alignable, captioned media block.
 * Shared by image-ext.js (`<img>`) and player-ext.js (`<svc-player>`) — the
 * two only differ in how the sized element itself is created/kept in sync
 * (and player additionally gates its download button); everything else
 * (toolbar, resize, caption, selection) is identical.
 *
 * Expects the node type to declare `src`, `align` (default 'center'),
 * `width` (default null) and `caption` (default null) attributes with the
 * same parse/render shape as image-ext.js's PhotorNode.
 *
 * @param {string} nodeName - TipTap node type name (also used as the figure's
 *                             `data-media-wrap` value, see prose-mirror.css)
 * @param {object} opts
 * @param {(node) => HTMLElement}      opts.createEl      - builds the sized element from node.attrs
 * @param {(el, attrs) => void}        opts.syncEl        - re-applies node.attrs onto the element (on update)
 * @param {string}                     opts.promptKey     - host Lit property to open in "replace" mode (e.g. '_imgPrompt')
 * @param {string}                     opts.replaceLabel  - toolbar button title, e.g. 'Replace image'
 * @param {(attrs) => boolean}         [opts.canDownload] - whether to show the download button for these attrs (default: always)
 */
export const createMediaNodeView = (nodeName, { createEl, syncEl, promptKey, replaceLabel, canDownload = () => true }) => ({ node, editor, getPos }) => {

  // Reliable, selection-independent attribute update. `editor.chain().updateAttributes()`
  // only touches nodes inside the *current selection* — but the resize handles are
  // reachable via :hover alone (no NodeSelection required first), so that command can
  // silently no-op if this node isn't actually selected when a drag commits, leaving the
  // doc's width unchanged (looks resized live — that's just the DOM style hack during
  // drag — but reverts on reload since it was never actually persisted). Target the node
  // directly by its own tracked position instead, same as @tiptap/core's own
  // NodeView.updateAttributes() does internally.
  const updateAttrs = attrs => {
    if (typeof getPos !== 'function') return
    const pos = getPos()
    const current = editor.state.doc.nodeAt(pos)
    if (!current) return
    editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, ...attrs }))
  }

  // ── figure: position:relative so toolbar + handles anchor correctly ────
  const wrap = document.createElement('figure')
  wrap.setAttribute('data-media-wrap', nodeName)
  wrap.setAttribute('data-align', node.attrs.align || 'center')
  if (node.attrs.width) wrap.setAttribute('data-width', '')

  // ── Floating toolbar (absolute, above figure, visible only when selected) ─
  const { bar, syncAlign, syncDownload, bCap } = mkToolbar({ nodeName, editor, updateAttrs, replaceLabel, promptKey, canDownload })
  syncAlign(node.attrs.align || 'center')
  syncDownload(node.attrs)

  // ── Media element ────────────────────────────────────────────────────────
  const el = createEl(node)
  if (node.attrs.width) el.style.width = node.attrs.width

  // ── Inner wrapper: JS-controlled px width so handles track the element's edges ─
  // position:relative is required so absolutely-positioned handles sit correctly.
  // min-width:200px prevents a zero-width flash before syncInnerWidth fires.
  const inner = document.createElement('div')
  inner.className = 'img-inner'
  if (node.attrs.width) inner.style.width = node.attrs.width

  // ── Resize handles (absolute inside inner, at ±12 px from left/right edges) ─
  const { lHandle, rHandle, syncInnerWidth } = mkResizeHandles(
    el, inner, wrap,
    finalW => updateAttrs({ width: `${finalW}px` }),
    () => wrap.setAttribute('data-width', ''), // switch a fluid (e.g. player) figure to fit-content on first drag
  )
  // 'load' only fires for <img> (async decode); harmless no-op listener on custom elements.
  el.addEventListener('load', syncInnerWidth)
  requestAnimationFrame(syncInnerWidth) // handles already-cached / already-sized elements

  // ── Caption: contenteditable figcaption, toggled via the toolbar's bCap button ──
  const { cap, syncCaption } = mkCaption(node, bCap, updateAttrs)

  // ── Assembly ──────────────────────────────────────────────────────────
  inner.append(lHandle, el, rHandle)
  wrap.append(bar, inner, cap)

  return {
    dom: wrap,

    update(updated) {
      if (updated.type.name !== nodeName) return false
      syncEl(el, updated.attrs)
      el.style.width    = updated.attrs.width || ''
      inner.style.width = updated.attrs.width || ''
      wrap.toggleAttribute('data-width', !!updated.attrs.width)
      wrap.setAttribute('data-align', updated.attrs.align || 'center')
      syncAlign(updated.attrs.align || 'center')
      syncDownload(updated.attrs) // src may have changed via replace — re-check downloadability
      requestAnimationFrame(syncInnerWidth)
      syncCaption(updated.attrs.caption || '')
      return true
    },

    selectNode()   { wrap.classList.add('is-selected') },
    deselectNode() { wrap.classList.remove('is-selected') },

    // ProseMirror must not intercept events from toolbar, handles, or caption
    stopEvent: ev =>
      bar.contains(ev.target)     ||
      lHandle.contains(ev.target) ||
      rHandle.contains(ev.target) ||
      cap.contains(ev.target),

    // Ignore width mutations on el/inner during drag and caption text edits
    ignoreMutation: m =>
      bar.contains(m.target)   ||
      inner.contains(m.target) ||
      cap.contains(m.target),
  }
}
