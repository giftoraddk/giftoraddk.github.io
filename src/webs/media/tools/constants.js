/** Foreground text colors for color picker */
export const COLORS = [
  '#ffffff', '#e5e7eb', '#9ca3af', '#6b7280', '#374151', '#1f2937', '#111827', '#000000',
  '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#fbbf24', '#f59e0b', '#d97706', '#b45309',
  '#6ee7b7', '#34d399', '#10b981', '#059669', '#67e8f9', '#22d3ee', '#00c7d4', '#0891b2',
  '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#f9a8d4', '#f472b6', '#ec4899', '#db2777',
]

/** Highlight / background colors for color picker */
export const BG_COLORS = [
  'transparent',
  'rgba(239,68,68,0.15)', 'rgba(245,158,11,0.15)', 'rgba(16,185,129,0.15)',
  'rgba(6,182,212,0.15)', 'rgba(99,102,241,0.15)', 'rgba(236,72,153,0.15)',
  'rgba(239,68,68,0.3)',  'rgba(245,158,11,0.3)',  'rgba(16,185,129,0.3)',
  'rgba(6,182,212,0.3)',  'rgba(99,102,241,0.3)',  'rgba(236,72,153,0.3)',
  'rgba(239,68,68,0.5)',  'rgba(245,158,11,0.5)',  'rgba(16,185,129,0.5)',
  'rgba(6,182,212,0.5)',  'rgba(99,102,241,0.5)',  'rgba(236,72,153,0.5)',
  '#1a1a2e', '#0f172a', '#1c1917', '#1a1a1a', '#0d1117',
  '#450a0a', '#451a03', '#064e3b', '#0c4a6e', '#1e1b4b', '#4a044e',
  '#7f1d1d', '#78350f', '#065f46', '#0e7490', '#312e81', '#701a75',
]

/**
 * Slash menu groups.
 * Items may carry a `feat` key — only rendered when that feature is enabled.
 * Groups with no visible items are hidden automatically.
 */
export const SLASH_GROUPS = [
  {
    label: 'AI',
    items: [
      { label: 'Continue Writing', ic: 'ri:sparkling-2-line', ai: 'continue', feat: 'ai' },
      { label: 'Ask AI',           ic: 'ri:sparkling-line',   ai: 'ask',      feat: 'ai' },
    ],
  },
  {
    label: 'Style',
    items: [
      { label: 'Text',          icon: 'T',   cmd: e => e.chain().focus().setParagraph().run() },
      { label: 'Heading 1',    icon: 'H₁',  cmd: e => e.chain().focus().toggleHeading({ level: 1 }).run() },
      { label: 'Heading 2',    icon: 'H₂',  cmd: e => e.chain().focus().toggleHeading({ level: 2 }).run() },
      { label: 'Heading 3',    icon: 'H₃',  cmd: e => e.chain().focus().toggleHeading({ level: 3 }).run() },
      { label: 'Bullet List',  ic: 'ri:list-unordered', cmd: e => e.chain().focus().toggleBulletList().run() },
      { label: 'Numbered List',ic: 'ri:list-ordered',   cmd: e => e.chain().focus().toggleOrderedList().run() },
      { label: 'Task List',    ic: 'ri:checkbox-line',  cmd: e => e.chain().focus().toggleTaskList().run(), feat: 'task' },
      { label: 'Quote',        icon: '"',   cmd: e => e.chain().focus().toggleBlockquote().run() },
      { label: 'Code Block',   ic: 'ri:code-line',      cmd: e => e.chain().focus().toggleCodeBlock().run() },
      { label: 'Divider',      icon: '—',   cmd: e => e.chain().focus().setHorizontalRule().run() },
    ],
  },
  {
    label: 'Media',
    items: [
      { label: 'Image',  ic: 'ri:image-line',       img:    true, feat: 'image' },
      { label: 'Video',  ic: 'ri:play-circle-line', player: true, feat: 'player' },
      { label: 'Table',  ic: 'ri:table-line',       table:  true, feat: 'table' },
    ],
  },
]

/** Options available in the "Turn Into" sub-menu (context menu) */
export const TURN_INTO = [
  { label: 'Text',          icon: '¶',  cmd: e => e.chain().focus().setParagraph().run() },
  { label: 'Heading 1',    icon: 'H1', cmd: e => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: 'Heading 2',    icon: 'H2', cmd: e => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'Heading 3',    icon: 'H3', cmd: e => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: 'Bullet List',  icon: '•',  cmd: e => e.chain().focus().toggleBulletList().run() },
  { label: 'Numbered List',icon: '1.', cmd: e => e.chain().focus().toggleOrderedList().run() },
  { label: 'Quote',        icon: '"',  cmd: e => e.chain().focus().toggleBlockquote().run() },
  { label: 'Code Block',   icon: '<>', cmd: e => e.chain().focus().toggleCodeBlock().run() },
]

/**
 * All feature keys — used to build the default (all-on) feature set when
 * the `features` prop is not provided.
 */
export const ALL_FEATURES = ['bubble', 'slash', 'image', 'player', 'table', 'ai', 'color', 'ctx', 'task']
