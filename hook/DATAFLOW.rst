====================
DATAFLOW
====================

The Complete Data Flow — từng bước chi tiết từ config đến pixel.

.. contents:: Mục lục
   :depth: 3
   :local:

----

Tổng sơ đồ
===========

.. code-block:: text

   src/services/modules/<page>-page.js
     └─ variant   { ui, theme, mainColors, textColor }
     └─ views[]
          └─ sections[i]  { id, dataSrc|dataTable|data, config, sort, col, responsive, ... }

   Astro Page (.astro)
     import { variant, views }
     currentView = views.find(v => v.href === '/...')
     → <web-board sections="[JSON]" ui theme mainColors textColor>

   web-board
     → _sortBySortField()
     → _dcLoadLayout()        IndexedDB: wb_layout_{pathname}
     → _dcLoadSections()      IndexedDB: section cache 5 min per id
     → render <web-boxs> × N

   web-boxs
     → _config = { ...config, mainColors: config[theme] }
     → _applyFilter(data)
     → IntersectionObserver   kích hoạt anime khi scroll
     → 7 render modes (tiers / masonry / slider / steps / tabs / expansion / grid)
     → <web-box> × M items

   web-box
     → groupKey[i] × groupCol[i]  → CSS grid
     → groupStyle split: host vs inner div
     → <web-cell makes[i]> × G groups

   web-cell
     → bit / bitLocal  → resolve value (dot-path)
     → DynamicComponent.render('web-{mode}', props)
     → dispatch 'cell-action' lên document

----

Bước 1 — Build Time: Config File
=================================

Mỗi page có một file config tại ``src/services/modules/<page>-page.js``.

.. code-block:: js

   // src/services/modules/landing/main.js
   export const variant = {
       ui:         'modern',       // 'modern' | 'spatial'
       theme:      'dark',         // 'dark' | 'light'
       mainColors: '#2ebd85|#f5465c|#a855f7|#00c7d4|#fbbf24',
       textColor:  '',
       lightBG:    '/images/common/bg-light.jpg',
       darkBG:     '/images/common/bg-dark.jpg',
   };

   export const views = [
       {
           text: 'Landing',
           href: '/landing/',
           iconMobile: 'ri:home-line',
           sections: [
               {
                   id:        'hero/modern/horiBase',      // key duy nhất = đường dẫn file section
                   data:      (await import('@/sections/hero/modern/horiBase.js')).data,
                   config:    (await import('@/sections/hero/modern/horiBase.js')).config,
                   sort:      0,
                   col:       '12',     // độ rộng trong board grid 12 cột
                   container: true,     // thêm max-width container
               },
               {
                   id:     'features/modern/showcase',
                   data:   (await import('@/sections/features/modern/cardIntro.js')).data,
                   config: (await import('@/sections/features/modern/cardIntro.js')).config,
                   sort:   0, col: '12', container: true,
                   stys:   { backgroundColor: 'var(--color-base-200)' },
               },
               // ... thêm sections
           ],
       },
   ];

**Section object — tất cả fields:**

.. code-block:: js

   {
       id:         'domain/variant/name',    // BẮT BUỘC — key duy nhất, mirror đường dẫn file
       sort:       0,                        // thứ tự render (nhỏ lên trước)
       col:        '12',                     // độ rộng section (1–12 cột board grid)

       dataSrc:    'https://localhost:5000/api/', // base API URL — kết hợp với dataTable
       dataTable:  'products',              // REST: dataSrc+dataTable → /api/products
                                            // Firestore: khi không có dataSrc
       data:       [...],                    // static data (thay cho dataSrc/dataTable)

       config:     section.config,           // { ...baseConfig, dark: '...', light: '...' }

       container:  true,                     // thêm max-width wrapper
       stys:       { backgroundColor: '...' }, // style override section wrapper

       showSearch: true,                     // hiện web-boxs-search
       emptyText:  'Không tìm thấy',
       tags: {
           filterField: 'tags',
           filterColor: 'primary',
           data:        [],                  // [] = auto từ data
       },

       component:  'svc-orders',             // render custom element thay web-boxs
   }

.. note::

   ``id`` = đường dẫn file: ``'hero/modern/horiBase'`` → ``src/sections/hero/modern/horiBase.js``

----

Bước 2 — Astro Page: Mount
===========================

.. code-block:: astro

   ---
   import Core from '@/layouts/Core.astro';
   import { variant, views } from '@/services/modules/landing/main.js';

   const currentView = views.find(v => v.href === '/landing/') ?? views[0];
   const navItems    = views.map(({ text, href, iconMobile }) => ({ text, href, iconMobile }));
   ---

   <Core title="Landing" menu={{ type: 'top', menuItems: navItems }}>
       <script src='@/webs/apex/web-board.js'></script>
       <web-board
           ui={variant.ui}
           theme={variant.theme}
           mainColors={variant.mainColors}
           textColor={variant.textColor}
           draggable
       >
           <script type="application/json" is:inline
               set:html={JSON.stringify(currentView.sections)}>
           </script>
       </web-board>
   </Core>

Sections được nhúng vào ``web-board`` qua ``<script type="application/json">`` — cách này tránh escaping lỗi và giữ Astro không xử lý nội dung.

----

Bước 3 — web-board: Khởi tạo
=============================

Khi ``web-board`` kết nối DOM, nó thực hiện tuần tự:

.. code-block:: text

   connectedCallback()
     │
     ├─ parse sections từ <script type="application/json"> child
     │
     ├─ _sortBySortField()
     │    sort sections[] theo section.sort (ASC) — bỏ qua → xuống cuối
     │
     ├─ _dcLoadLayout()
     │    IndexedDB key: wb_layout_{location.pathname}
     │    Restore: thứ tự kéo thả + col resize của từng section
     │    TTL: vĩnh viễn (không hết hạn)
     │
     └─ _dcLoadSections()
          for each section:
            if section.dataSrc or section.dataTable:
              IndexedDB key: section_{id}
              hit?  → dùng cache, emit data ngay
              miss? → loadData({ dataSrc, dataTable })
                       dataSrc+dataTable → fetch(dataSrc/dataTable)
                       dataTable alone   → Firestore collection
                       → lưu cache (TTL 300s = 5 phút)
                       → emit data
            if section.data:
              dùng trực tiếp, không cache

**2 loại state được persist:**

+----------------------------------+-----------------------------------+--------------+
| IndexedDB key                    | Nội dung                          | TTL          |
+==================================+===================================+==============+
| ``board_section_{pathname}``     | ``{ui, mainColors, textColor}``   | vĩnh viễn   |
+----------------------------------+-----------------------------------+--------------+
| ``wb_layout_{pathname}``         | thứ tự + col của từng section     | vĩnh viễn   |
+----------------------------------+-----------------------------------+--------------+
| ``section_{id}``                 | data từ dataSrc                   | 300 giây     |
+----------------------------------+-----------------------------------+--------------+

**Render section:**

.. code-block:: js

   // sec.component có → render custom element
   if (sec.component) {
       return html`<${sec.component} ...props></${sec.component}>`
   }
   // không có → render web-boxs
   return html`
       <web-boxs
           .config     = ${sec.config || {}}
           .data       = ${(sec.dataSrc || sec.dataTable) ? this._live[sec.id] : sec.data}
           .col        = ${sec.col || 12}
           .filterState= ${{ sectionId, tags, field, color, active, query }}
           .mainColors = ${this.mainColors}
           ui          = ${this.ui}
           theme       = ${this.theme}
           animeQueue  = "150ms"
           ?showSearch = ${sec.showSearch}
       ></web-boxs>
   `

----

Bước 4 — web-boxs: Chọn config và lọc data
===========================================

.. code-block:: js

   // Luôn chọn theo theme hiện tại
   get _config() {
       return this.config[this.theme] || {}
   }

**Section config file chuẩn:**

.. code-block:: js

   // src/sections/hero/modern/horiBase.js
   export const data = [
       { title: 'Hero Title', content: 'Description...', pics: '/hero.jpg' }
   ];

   const baseConfig = {
       groupKey:     [['pics'], ['title', 'content', '']],
       makes:        [ [/* cells ảnh */], [/* cells text */] ],
       groupCol:     ['5', '7'],
       groupRow:     ['auto', 'auto'],
       groupJustify: ['overflow', 'left'],
       groupStyle:   [
           { borderRadius: '1rem', overflow: 'hidden' },
           { flexDirection: 'column', gap: '1rem', padding: '2rem' },
       ],
       stys:   {},
       anime:  'fade-in-fwd',
   };

   export const config = { ...baseConfig };

**Filter data:**

.. code-block:: text

   _applyFilter(data)
     → tags filter:  item.tags.includes(activeTag)
     → text search:  JSON.stringify(item).toLowerCase().includes(query)
     → kết hợp AND nếu cả hai active

**7 Render Modes — thứ tự ưu tiên:**

+----------+-----------------------------------+--------------------------------------+
| Ưu tiên  | Điều kiện                         | Mode                                 |
+==========+===================================+======================================+
| 1        | ``_config.tiers?.length``         | **tiers** — full declarative layout  |
+----------+-----------------------------------+--------------------------------------+
| 2        | ``masonry`` prop                  | **masonry** — CSS column layout      |
+----------+-----------------------------------+--------------------------------------+
| 3        | ``_config.slider`` hoặc           | **slider** — ``<web-slider>``        |
|          | ``list='slider'``                 |                                      |
+----------+-----------------------------------+--------------------------------------+
| 4        | ``_config.steps`` hoặc            | **steps** — ``<web-steps>``          |
|          | ``list='steps'``                  |                                      |
+----------+-----------------------------------+--------------------------------------+
| 5        | ``_config.tabs`` hoặc             | **tabs** — ``<web-tabs>``            |
|          | ``list='tabs'``                   |                                      |
+----------+-----------------------------------+--------------------------------------+
| 6        | ``_config.expansion`` hoặc        | **expansion** — ``<web-expansion>``  |
|          | ``list='expansion'``              |                                      |
+----------+-----------------------------------+--------------------------------------+
| 7        | _(mặc định)_                      | **grid** — CSS grid thông thường     |
+----------+-----------------------------------+--------------------------------------+

----

Bước 4b — web-boxs: Tiers Mode (chi tiết)
==========================================

Tiers mode là cách mạnh nhất — toàn bộ layout của 1 section nằm trong 1 ``gi-wrap``.

**Config tiers:**

.. code-block:: js

   const baseConfigWithTiers = {
       tiersCol: [12, 12],      // độ rộng cột cho từng tier
       tiersRow: ['auto', '2'], // row-span cho từng tier ('auto' = không class)
       tiers: [
           // Tier 0 — Object → render 1 LẦN với data rỗng (intro tĩnh)
           {
               groupCol:     [12],
               groupRow:     ['auto'],
               groupJustify: ['none'],
               groupKey:     [['']],
               groupStyle:   [{ flexDirection: 'column', gap: '0.5rem', padding: '2rem 0 1rem' }],
               makes: [[
                   { bitLocal: 'LABEL',   opt: { mode: 'p', stys: { fontSize: 'clamp(0.7rem, 1vw, 0.75rem)', textTransform: 'uppercase' } } },
                   { bitLocal: 'Heading', opt: { mode: 'h2', stys: { fontSize: 'clamp(2rem, 4vw, 3.5rem)' } } },
               ]],
           },
           // Tier 1 — Array → render TẤT CẢ data items
           [
               {
                   groupCol:     [12],
                   groupRow:     ['auto'],
                   groupJustify: ['none'],
                   groupKey:     [['title', 'content']],
                   groupStyle:   [{ flexDirection: 'column', gap: '0.5rem', padding: '1rem' }],
                   makes: [[
                       { bit: 'title',   opt: { mode: 'h3' } },
                       { bit: 'content', opt: { mode: 'p'  } },
                   ]],
               }
           ],
       ],
   };

**5 loại tier:**

+----------------------------------------+-------------------------------------------------------+
| Loại                                   | Hành vi                                               |
+========================================+=======================================================+
| ``Object`` (không phải array)          | Render 1 lần với ``{}`` — dùng ``bitLocal``           |
+----------------------------------------+-------------------------------------------------------+
| ``Array`` có ``tier[0].cards``         | Tất cả items trong 1 wrapper cell + nested ``gi-wrap``|
+----------------------------------------+-------------------------------------------------------+
| ``Array`` có ``tier[0].slider``        | Bọc tất cả items trong ``<web-slider>``               |
+----------------------------------------+-------------------------------------------------------+
| ``Array`` có ``tier[0].steps``         | Bọc items trong ``<web-steps>``                       |
+----------------------------------------+-------------------------------------------------------+
| ``Array`` có ``tier[0].tabs``          | Bọc items trong ``<web-tabs>``                        |
+----------------------------------------+-------------------------------------------------------+
| ``Array`` có ``tier[0].expansion``     | Bọc items trong ``<web-expansion>``                   |
+----------------------------------------+-------------------------------------------------------+
| ``Array`` (còn lại)                    | N_configs × N_items boxes                             |
+----------------------------------------+-------------------------------------------------------+

**Ví dụ thực tế — Hero (text trái + ảnh phải):**

.. code-block:: js

   tiersCol: ['7', '5'],
   tiersRow: ['auto', '2'],
   tiers: [
       // tier 0: text intro — col-7
       {
           groupKey: [['', ''], ['title', 'content'], ['', '']],
           groupCol: [12, 12, 12],
           // ...
       },
       // tier 1: ảnh — col-5, row-span 2
       {
           groupKey: [['pics']],
           groupCol: [12],
           makes: [[{ bit: 'pics', opt: { mode: 'gallery', stys: { width: '100%', height: '100%', objectFit: 'cover' } } }]],
       },
   ]

----

Bước 5 — web-boxs → web-box: Tạo item
======================================

Với mỗi data item, ``web-boxs`` tạo 1 ``web-box``:

.. code-block:: js

   html`
   <web-box
       .data         = ${item}
       .groupKey     = ${config.groupKey}
       .makes        = ${config.makes}
       .groupCol     = ${config.groupCol}
       .groupRow     = ${config.groupRow}
       .groupJustify = ${config.groupJustify}
       .groupStyle   = ${config.groupStyle}
       .stys         = ${{ ...config.stys, animationDelay: i * queueMs + 'ms' }}
       .anime        = ${isVisible ? config.anime || 'fade-in-fwd' : ''}
       .bg           = ${config.bg}
       .mainColors   = ${this.mainColors || config.mainColors}
       .theme        = ${this.theme}
       .ui           = ${config.ui || this.ui}
   ></web-box>
   `

.. note::

   ``config.ui`` có thể override ``ui`` của ``web-boxs``. Ví dụ: 1 section dùng ``ui:'spatial'``
   trong trang ``modern``.

**Animation — IntersectionObserver:**

``animeQueue="150ms"`` → stagger delay: item 0 = 0ms, item 1 = 150ms, item 2 = 300ms, …

Anime chỉ kích hoạt khi ``web-box`` vào viewport. Trước đó: class anime = ``''`` → không animate.

Animation classes:

+-------------+----------------------------------------------------------+
| Nhóm        | Classes                                                  |
+=============+==========================================================+
| Fade        | ``fade-in``, ``fade-in-fwd``, ``fade-in-bck``            |
+-------------+----------------------------------------------------------+
| Slide       | ``slide-in-blurred-left/right/top/bottom``               |
+-------------+----------------------------------------------------------+
| Bounce      | ``bounce-in-left/right/top/bottom``                      |
+-------------+----------------------------------------------------------+
| Rotate      | ``rotate-in-ccw``, ``rotate-in-cw``                      |
+-------------+----------------------------------------------------------+
| Swirl       | ``swirl-in-fwd``, ``swirl-in-bck``                       |
+-------------+----------------------------------------------------------+
| Tilt        | ``tilt-in-tl/tr/bl/br``                                  |
+-------------+----------------------------------------------------------+
| Flip        | ``flip-in-diag-tl/tr/bl/br``                             |
+-------------+----------------------------------------------------------+

----

Bước 6 — web-box: CSS Grid Layout
===================================

``web-box`` render lưới từ ``groupKey``. Mỗi ``groupKey[i]`` → 1 ``<web-cell>``.

.. code-block:: js

   groupKey.map((keys, i) => {
       const col = parseInt(groupCol[i])   // → class 'gi-col-{col}'
       const row = parseInt(groupRow[i])   // → class 'gi-row-{row}'

       // groupStyle[i] SPLIT thành 2 phần:
       const posKeys = ['overflow','position','top','right','bottom','left','inset','zIndex']
       const hostStys  = entries thuộc posKeys    // → style="" trên <web-cell> host
       const innerStys = entries còn lại          // → .stys prop (inner div .jf)

       return html`
           <web-cell
               class="gi gi-col-${col} gi-row-${row}"
               style=${hostStys}
               .stys=${innerStys}
               ...
           ></web-cell>
       `
   })

**groupCol + groupRow:**

``parseInt()`` — chỉ khi là số nguyên hợp lệ mới thêm class:

.. code-block:: js

   groupCol: ['12', '7', '', 'auto']
   // → gi-col-12  gi-col-7  (không class)  (không class)

**Side-by-side (2 cột trong 1 row):**

.. code-block:: js

   groupCol: ['7', '5']
   // group 0 (col-7) + group 1 (col-5) = 12 → cùng row
   // group tiếp theo col > remaining → wrap xuống row mới

**groupStyle splitting — QUAN TRỌNG:**

8 property lên **host** ``<web-cell>``:
``overflow``, ``position``, ``top``, ``right``, ``bottom``, ``left``, ``inset``, ``zIndex``

Tất cả property còn lại vào **inner div** ``.jf`` bên trong Shadow DOM:
``flexDirection``, ``gap``, ``padding``, ``alignItems``, ``background``, ``borderRadius``, …

.. code-block:: js

   groupStyle: [{ position: 'relative', overflow: 'hidden', flexDirection: 'column', padding: '1rem' }]
   // → position, overflow  → host  <web-cell style="position:relative;overflow:hidden">
   // → flexDirection, padding → inner .jf div

**Wrapper ``gi-wrap``** nhận ``stys`` + CSS variables từ ``mainColors``.

----

Bước 7 — web-cell: Resolve Value
==================================

``web-cell`` nhận ``makes[i]`` (array cell specs) và render chúng trong container ``.jf``.

**Resolve giá trị:**

.. code-block:: js

   makes.map((make, j) => {
       const val = make.bitLocal !== undefined
           ? make.bitLocal                            // giá trị tĩnh (không đọc data)
           : _nestedValue(info, make.bit || keys[j]) // dot-path từ data item
       return { ...make, bit: val }
   })

Hỗ trợ dot-path: ``'meta.author'``, ``'pricing.price'``, ``'user.avatar.url'``.

**groupJustify — Layout của inner div ``.jf``:**

+---------------+------------------------------------------------------+
| Giá trị       | CSS trên ``.jf``                                     |
+===============+======================================================+
| ``'none'``    | ``display: block`` — stack dọc tự nhiên              |
+---------------+------------------------------------------------------+
| ``'left'``    | ``display: flex; justify-content: flex-start``       |
+---------------+------------------------------------------------------+
| ``'center'``  | ``display: flex; justify-content: center``           |
+---------------+------------------------------------------------------+
| ``'right'``   | ``display: flex; justify-content: flex-end``         |
+---------------+------------------------------------------------------+
| ``'between'`` | ``display: flex; justify-content: space-between``   |
+---------------+------------------------------------------------------+
| ``'overflow'``| ``display: flex; overflow: hidden`` — crop content  |
+---------------+------------------------------------------------------+

Mọi giá trị **ngoại trừ** ``'none'`` đã có ``display: flex`` → không cần viết ``display: 'flex'`` trong ``groupStyle``.

----

Bước 8 — DynamicComponent: Cell Modes
=======================================

``DynamicComponent.render('web-{mode}', props)`` — mỗi mode map tới 1 component.

**Text modes:**

+--------+------------------------------+-----------------------------------------------+
| Mode   | Element                      | Props đặc biệt                                |
+========+==============================+===============================================+
| ``p``  | ``<web-letters tag="p">``    | ``prefix``, ``suffix``, ``iconSize``          |
+--------+------------------------------+-----------------------------------------------+
| ``span``| ``<web-letters tag="span">`` | như p, ``display:inline-block``              |
+--------+------------------------------+-----------------------------------------------+
| ``h1`` | ``<web-letters tag="h1">``   | default fontSize 2.25rem                      |
+--------+------------------------------+-----------------------------------------------+
| ``h2`` – ``h6`` | tương tự         | fontSize giảm dần                             |
+--------+------------------------------+-----------------------------------------------+

Animation text (qua ``opt``):

.. code-block:: js

   opt: { motion: true, effect: 'zoomIn', word: false, loop: true, duration: 950, delay: 70 }
   // motion: false (default) → render thường, không letter animation

**Các mode đặc biệt:**

.. code-block:: js

   // Gallery / Image
   { bit: 'pics', opt: { mode: 'gallery', stys: { width: '100%', aspectRatio: '4/3', objectFit: 'cover' } } }
   // bit = URL đơn hoặc pipe-sep 'url1|url2|url3'

   // Icon (Iconify name)
   { bit: 'meta.icon', opt: { mode: 'icon', size: '2rem', color: 'var(--color-primary)' } }

   // Button
   {
       bitLocal: 'Đặt món',
       opt: { mode: 'button', type: 'fill', color: 'warning',
              action: 'add-to-cart',   // → cell-action event
              prefix: 'ri:shopping-cart-line', height: '45px' }
   }

   // Badge
   { bit: 'meta.badge', opt: { mode: 'badge', type: 'fill', color: 'error' } }

   // Tags (pipe-separated)
   { bit: 'tags', opt: { mode: 'tags', color: 'primary', type: 'soft', gap: '0.5rem' } }

   // Rating (from score field 'avg~count')
   { bit: 'score', opt: { mode: 'rating', size: 'xs', disabled: true, color: 'warning', mask: 'mask-star-2' } }

   // Link
   { bit: 'meta.linkText', opt: { mode: 'a', target: '_blank' }, ext: { org: 'https://...' } }

   // Dropdown
   { bit: 'meta.icon', opt: { mode: 'dropdown', label: 'Chọn', items: [...], placement: 'bottom' } }

   // Popover
   { bit: 'content', opt: { mode: 'popover', placement: 'top' } }

   // Upload
   { bit: 'pics', opt: { mode: 'photor-upload', multiple: false, placeholder: 'Upload ảnh...' } }

----

Bước 9 — Events: Từ Cell lên Service
======================================

.. code-block:: text

   User click button trong web-cell
     ↓
   web-button dispatch 'clicked' { detail: buttonText }
     ↓
   web-cell capture 'clicked' trên host
     ↓
   web-cell re-dispatch 'cell-action' lên document {
       action: make.opt.action || 'click',
       value:  detail value,
       info:   this.info  (toàn bộ data item)
   }
     ↓
   service.js lắng nghe 'cell-action'
     ↓
   đọc get(sectionId)?.data, tính lại array (thêm/sửa/xóa item)
     ↓
   make(sectionId, { data: updatedArray })   ← hoặc gọi lại all(sectionId, opts) để re-fetch
     ↓
   subscribe(sectionId, fn)  trigger Lit re-render

**Lý do ``bubbles: true, composed: true``:**
Tất cả event phải dùng ``composed: true`` để vượt qua Shadow DOM boundary (``web-board`` → ``web-boxs`` → ``web-box`` → ``web-cell`` đều là Shadow DOM riêng biệt).

**Ví dụ lắng nghe trong service.js:**

.. code-block:: js

   // PHẢI đăng ký ĐỒNG BỘ — trước bất kỳ await nào
   document.addEventListener('cell-action', (e) => {
       const { action, value, info } = e.detail;
       if (action === 'add-to-cart') addItem(info);
       if (action === 'delete')      deleteItem(info.id);
   });

   // Sau đó mới await
   await conductor.all(sectionId, { dataSrc: '/api/products.json' });

----

Conductor API
=============

.. code-block:: js

   import { state, setup, all, more, make, patch, get, subscribe, sift } from '@/services/conductor.js'

   // Khởi tạo root state 1 lần lúc load trang — không phải per-section
   await setup(initialState, { storageKey: 'conductor_config' })

   // Đọc
   get(sectionId)                    // snapshot hiện tại — null nếu chưa có
   subscribe(sectionId, fn)          // reactive — fn(section) gọi mỗi khi section thực sự đổi

   // Ghi
   make(sectionId, fields)           // upsert section — tạo mới hoặc merge nếu đã có
   patch(partial)                    // merge vào ROOT-level state (apiUrl, ui, theme…) — không đụng sections

   // Fetch từ API/Firestore — cache IndexedDB (phút, mặc định 5, 0 = tắt), retry 3× (REST only)
   await all(sectionId, { dataSrc, dataTable, cache })

   // Phân trang: all() lần đầu, more() cho các trang kế tiếp
   await all(sectionId, { dataSrc, dataTable, limit: 20 })
   await more(sectionId, { dataSrc, dataTable, limit: 20 })

   // Filter client-side, không re-fetch
   sift(sectionId, { field: value }, 'absolute')

**``all()`` response shape (khi không dùng ``limit``):**

``dataSrc``/``dataTable`` trả về array trực tiếp hoặc 1 object (được bọc thành mảng 1 phần tử) — xem ``crud.js loadData()`` trong ``docs/CRUD.rst``. Không có tham số ``transform`` — xử lý dữ liệu sau khi đọc qua ``get(sectionId)?.data``.

----

Ví dụ hoàn chỉnh: Card sản phẩm
==================================

.. code-block:: js

   // src/sections/products/modern/cardGrid.js

   export const data = [
       {
           id: '1', title: 'Cà phê phin', pics: '/img/coffee.jpg',
           tags: 'hot|bestseller', score: '4.5~128',
           pricing: '45000~30000~đ', meta: { badge: 'HOT' }
       },
   ];

   const baseConfig = {
       groupKey:     [['pics', 'meta.badge'], ['title', 'score'], ['pricing', '']],
       groupCol:     ['12', '12', '12'],
       groupJustify: ['overflow', 'left', 'between'],
       groupStyle: [
           { position: 'relative', borderRadius: '0.75rem 0.75rem 0 0' },
           { flexDirection: 'column', gap: '0.25rem', padding: '0.75rem 1rem 0.25rem' },
           { alignItems: 'center', padding: '0.25rem 1rem 1rem' },
       ],
       makes: [
           [
               { bit: 'pics', opt: { mode: 'gallery', stys: { width: '100%', aspectRatio: '4/3', objectFit: 'cover' } } },
               { bit: 'meta.badge', opt: { mode: 'badge', type: 'fill', color: 'error',
                   stys: { position: 'absolute', bottom: '0.5rem', right: '0.5rem' } } },
           ],
           [
               { bit: 'title', opt: { mode: 'h4', stys: { fontWeight: '700' } } },
               { bit: 'score', opt: { mode: 'rating', size: 'xs', disabled: true, color: 'warning', mask: 'mask-star-2' } },
           ],
           [
               { bit: 'pricing', ext: { currency: 'đ' }, opt: { mode: 'span', stys: { fontSize: 'clamp(1.25rem, 2vw, 1.625rem)', fontWeight: '900', color: 'var(--color-primary)' } } },
               { bitLocal: 'Đặt ngay', opt: { mode: 'button', type: 'fill', color: 'warning', action: 'add-to-cart', height: '36px' } },
           ],
       ],
       anime: 'fade-in-fwd',
       stys: { background: 'var(--color-base-200)', borderRadius: '0.75rem', overflow: 'hidden' },
   };

   export const config = { ...baseConfig, dark: '', light: '' };

.. code-block:: js

   // src/services/modules/cafe-page.js
   import * as cardGrid from '@/sections/products/modern/cardGrid.js';

   export const views = [{
       href: '/cafe/',
       sections: [{
           id:      'products/modern/cardGrid',
           dataSrc:   'https://localhost:5000/api/', // base API path
           dataTable: 'products',                 // → fetch /api/products at runtime
           config:  cardGrid.config,
           sort: 1, col: '12',
           showSearch: true,
       }],
   }];

----

Records Field Reference
========================

Tất cả ``data[]`` dùng field names từ bảng ``records``:

+-------------+--------------------+----------------------------------------+
| Field       | Format             | Visual role                            |
+=============+====================+========================================+
| ``id``      | ULID               | key duy nhất                           |
+-------------+--------------------+----------------------------------------+
| ``title``   | text               | heading, tên chính                     |
+-------------+--------------------+----------------------------------------+
| ``content`` | text               | body text, mô tả, quote                |
+-------------+--------------------+----------------------------------------+
| ``pics``    | ``url1|url2``      | ảnh chính, avatar, gallery             |
+-------------+--------------------+----------------------------------------+
| ``tags``    | ``tagA|tagB``      | chip filter, category badge            |
+-------------+--------------------+----------------------------------------+
| ``score``   | ``avg~count``      | sao đánh giá                           |
+-------------+--------------------+----------------------------------------+
| ``pricing`` | ``price~cost~unit``| hiển thị giá                           |
+-------------+--------------------+----------------------------------------+
| ``promo``   | ``discount~type``  | badge khuyến mãi                       |
+-------------+--------------------+----------------------------------------+
| ``quantity``| integer            | số lượng tồn kho                       |
+-------------+--------------------+----------------------------------------+
| ``status``  | text               | ``active/draft/inactive/archived``     |
+-------------+--------------------+----------------------------------------+
| ``meta.xxx``| JSONB              | field phụ đặc thù                      |
+-------------+--------------------+----------------------------------------+

**Quy tắc:** dùng cột ``records`` khi có thể. Chỉ dùng ``meta.xxx`` cho dữ liệu không có cột riêng.

----

Background Helper
==================

``bg`` render qua ``<svc-underlay>`` (WebGL particle background + gradient-blob layer) —
xem ``docs/web-board.rst`` § ``bg`` và component tại ``src/webs/underlay/svc-underlay.js``.
``web-bg.js`` (cũ) không còn được dùng cho ``bg``, chỉ còn tồn tại như file tham khảo.

.. code-block:: js

   import { getStyleOpts } from '@/services/helper';

   // Glassmorphism card (blur)
   bg: { ...getStyleOpts({ rounded: '1.75rem', tint: '#2ebd85', total: 2, blur: true }) }

   // Flat card với nền nhạt (modern)
   bg: { ...getStyleOpts({ rounded: '1.75rem', hueCustom: 1 }) }

   // Dark card tuyệt đối
   stys: { background: '#0c0c0c', borderRadius: '1.75rem', overflow: 'hidden' }

   // Card với border
   stys: {
       borderRadius: '1.75rem',
       border: '1px solid color-mix(in oklab, var(--color-base-content) 8%, transparent)',
       background: 'var(--color-base-200)'
   }

**``getStyleOpts`` params:**

.. code-block:: js

   getStyleOpts({
       rounded:   '1.75rem',   // border-radius
       tint:      '#2ebd85',   // hex / rgb — màu seed blob
       total:  2,          // số màu (1–7) — dùng chung cho blob gradient LẪN palette hạt concept
       blur:      true,        // glassmorphism + backdrop-filter blur
       gradient:  true,        // bật render blob
       hueCustom:  1,          // 0 = transparent, 1 = base-300 nhạt
       blobType:  'circleOverlap', // 'circleOverlap' | 'ellipse'
       colorful:  false,       // false = tonal (đơn hue) | true = dải màu nhiều hue
       deg:       0,           // góc khởi đầu / góc gradient
       distance:   86,         // % lan toả blob quanh tâm (chỉ blobType 'circleOverlap')
   })

.. note::
   ``blobMove`` (``'' | 'swap' | 'pulse'`` — chuyển động cho blob layer) là prop riêng của
   ``<svc-underlay>``, không phải param của ``getStyleOpts`` — set trực tiếp trên component
   nếu cần (``bg: { ...getStyleOpts({...}), blobMove: 'swap' }``).

----

Font Size Chuẩn
================

+------------------------------+--------------------------------------+
| Vị trí                       | fontSize                             |
+==============================+======================================+
| Section label (uppercase)    | ``clamp(0.7rem, 1vw, 0.75rem)``      |
+------------------------------+--------------------------------------+
| Section heading hero (h1)    | ``clamp(2.5rem, 5vw, 4.5rem)``       |
+------------------------------+--------------------------------------+
| Section heading (h2)         | ``clamp(2rem, 4vw, 3.5rem)``         |
+------------------------------+--------------------------------------+
| Card heading (h3)            | ``clamp(1.75rem, 3vw, 2.5rem)``      |
+------------------------------+--------------------------------------+
| Card subheading (h4)         | ``clamp(1.5rem, 2.5vw, 2rem)``       |
+------------------------------+--------------------------------------+
| Card label (h5)              | ``clamp(1.25rem, 2vw, 1.5rem)``      |
+------------------------------+--------------------------------------+
| Card detail (h6)             | ``clamp(1rem, 1.5vw, 1.25rem)``      |
+------------------------------+--------------------------------------+
| Body text                    | ``clamp(0.875rem, 1.2vw, 1rem)``     |
+------------------------------+--------------------------------------+
| Caption / meta               | ``clamp(0.7rem, 0.9vw, 0.8rem)``     |
+------------------------------+--------------------------------------+
| Giá lớn                      | ``clamp(1.25rem, 2vw, 1.625rem)``    |
+------------------------------+--------------------------------------+

----

Tài liệu liên quan
==================

+-------------------------------+----------------------------------------------+
| File                          | Nội dung                                     |
+===============================+==============================================+
| ``docs/ARCHITECT.rst``        | Tổng quan kiến trúc + layer diagram          |
+-------------------------------+----------------------------------------------+
| ``docs/DESIGN.rst``           | Cú pháp baseConfig — tiers, makes, bg, anime |
+-------------------------------+----------------------------------------------+
| ``docs/SECTIONS.rst``         | Catalog section configs — layout diagrams    |
+-------------------------------+----------------------------------------------+
| ``docs/web-board.rst``        | web-board → web-boxs → web-box → web-cell    |
+-------------------------------+----------------------------------------------+
| ``docs/web-apex.rst``         | API reference tất cả component apex/        |
+-------------------------------+----------------------------------------------+
| ``docs/SERVICES.rst``         | Conductor ``all()`` opts, retry, cache       |
+-------------------------------+----------------------------------------------+
| ``docs/SCHEMA.rst``           | Database DDL — CREATE TABLE, Field Reference |
+-------------------------------+----------------------------------------------+
