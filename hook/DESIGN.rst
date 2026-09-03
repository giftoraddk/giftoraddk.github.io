===========
DESIGN
===========

Hướng dẫn thiết kế ``baseConfig`` từ mockup / mô tả đến code hoàn chỉnh.
Đọc file này trước khi viết bất kỳ section config nào — kể cả khi làm việc cùng Claude.

.. contents:: Mục lục
   :depth: 3
   :local:

----

Mục tiêu
=========

File này giúp **bạn và Claude** cùng dịch một thiết kế (hình ảnh, mô tả, wireframe)
thành ``baseConfig`` chuẩn cho ``web-boxs`` — không cần đoán mò, không cần thử sai nhiều lần.

Khi nhận yêu cầu *"làm hero section với ảnh trái, text phải, 4 feature card bên dưới"*,
file này cho bạn biết chính xác: bao nhiêu tier, dùng mode nào, animation gì, bg ra sao.

**Toàn bộ config nằm trong 1 ``baseConfig`` duy nhất — không tách đôi:**

.. code-block:: js

   const baseConfig = {
       // Layout chính (chọn 1 trong 2 hướng)
       tiers: [...], tiersCol: [...], tiersRow: [...],  // HOẶC
       groupKey: [...], groupCol: [...], groupRow: [...], groupJustify: [...], groupStyle: [...], makes: [...],

       // Visual
       bg:         { ...getStyleOpts({...}) },
       stys:       { padding: '3rem 0' },
       anime:      'fade-in-fwd',
       animeQueue: '100ms',
   };

   export const config = { ...baseConfig };

----

Bước 1 — Phân tích bố cục
==========================

Khi nhìn vào thiết kế, trả lời 3 câu hỏi theo thứ tự:

**Câu 1: Bố cục có nhiều vùng khác nhau không?**

- CÓ (text block + image + card grid) → dùng **tiers**
- KHÔNG (chỉ 1 loại item lặp lại) → chọn mode ở câu 3

**Câu 2: Có bao nhiêu cột và row?**

+--------------------+------------------------+----------------------------------------------+
| Layout trực quan   | ``tiersCol``           | Ghi chú                                      |
+====================+========================+==============================================+
| Full width         | ``['12']``             | 1 vùng chiếm toàn chiều ngang                |
+--------------------+------------------------+----------------------------------------------+
| 50 / 50            | ``['6', '6']``         | 2 vùng bằng nhau                             |
+--------------------+------------------------+----------------------------------------------+
| Text + ảnh (rộng)  | ``['7', '5']``         | Text chiếm 7/12, ảnh 5/12                    |
+--------------------+------------------------+----------------------------------------------+
| Ảnh + text (rộng)  | ``['5', '7']``         | Ảnh nhỏ hơn                                  |
+--------------------+------------------------+----------------------------------------------+
| 3 cột đều          | ``['4','4','4']``      | 3 features ngang nhau                        |
+--------------------+------------------------+----------------------------------------------+
| Banner + full grid | ``['12','12']``        | Intro phía trên, card grid phía dưới         |
+--------------------+------------------------+----------------------------------------------+
| Hỗn hợp            | ``['6','6','12']``     | 2 vùng trên + grid full bên dưới             |
+--------------------+------------------------+----------------------------------------------+

``tiersRow`` — kiểm soát chiều cao / row-span:

- ``'auto'`` — tự động theo nội dung (dùng cho hầu hết)
- ``'2'``, ``'3'`` — tier này span nhiều row, dùng khi ảnh lớn cần đứng song song 2 text row

.. code-block:: text

   Ví dụ: ảnh phải span 2 row text trái
   tiersCol: ['7', '5'],  tiersRow: ['auto', '2']

   ┌─────────────────────────────┬─────────────────┐
   │  Tier 0 (col-7, row-auto)   │  Tier 1 (col-5, │  row 0
   │  text intro                 │  row-span 2)    │
   ├─────────────────────────────┤                 │
   │  Tier 2 (col-7, row-auto)   │  big image      │  row 1
   │  feature cards              │                 │
   └─────────────────────────────┴─────────────────┘

**Câu 3: Dữ liệu của từng phần đến từ đâu?**

+----------------------------------+---------------+---------------------------------------------------------+
| Phần tử                          | Prop          | Ví dụ                                                   |
+==================================+===============+=========================================================+
| Label section ("Our Features")   | ``bitLocal``  | Text giống nhau cho mọi card → tĩnh                    |
+----------------------------------+---------------+---------------------------------------------------------+
| Heading chính ("Why Choose Us")  | ``bitLocal``  | Cố định trong code, không lấy từ data                  |
+----------------------------------+---------------+---------------------------------------------------------+
| Tiêu đề từng card                | ``bit``       | Khác nhau mỗi card → đọc từ ``data[].title``           |
+----------------------------------+---------------+---------------------------------------------------------+
| Ảnh từng card                    | ``bit``       | ``data[].pics``                                        |
+----------------------------------+---------------+---------------------------------------------------------+
| Icon từng feature                | ``bit``       | ``data[].meta.icon`` (dot-path)                        |
+----------------------------------+---------------+---------------------------------------------------------+
| CTA button cố định               | ``bitLocal``  | "Get Started" — không đổi                              |
+----------------------------------+---------------+---------------------------------------------------------+
| Giá tiền                         | ``bit``       | ``data[].pricing``                                     |
+----------------------------------+---------------+---------------------------------------------------------+

**Quy tắc nhanh:** Nếu tất cả card đều hiển thị cùng text đó → ``bitLocal``.
Nếu mỗi card có text khác nhau → ``bit: 'fieldName'``.

----

Thư viện Layout Mẫu — Cơ bản → Nâng cao
=========================================

Dùng thư viện pattern này để **suy diễn trực tiếp** ``tiersCol`` / ``tiersRow`` / render-mode
chỉ từ 1 ảnh mockup — đối chiếu hình dạng khối trong ảnh với pattern gần nhất bên dưới,
rồi build tiếp theo Bước 3 trở đi. Không cần đoán mò, không cần hỏi lại.

Quy trình đọc ảnh → pattern
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

1. Đếm số **vùng nội dung tách biệt** (khoảng cách/màu nền/border khác nhau rõ rệt) → số tier.
2. Với mỗi vùng, ước lượng **tỉ lệ chiều rộng** theo lưới 12 cột (vd. nửa trái chiếm ~58% → col-7) → ``tiersCol``.
3. Vùng nào **cao xuyên suốt nhiều vùng khác cộng lại** (ảnh lớn đứng cạnh 2-3 block text xếp chồng) →
   tier đó là "pinned" — set ``tiersRow`` của nó bằng số vùng nó xuyên qua (vd. ``'2'``, ``'3'``).
4. Trong từng tier, đếm **khối con xếp dọc/ngang** → ``groupCol``/``groupRow``, hướng xếp →
   ``groupJustify`` + ``groupStyle.flexDirection``.
5. Có **danh sách lặp** (nhiều card giống nhau) → tier ``Array``, chọn render-mode:
   đều hàng cố định → grid mặc định · chiều cao lệch nhau → ``masonry`` ·
   carousel/swipe → ``slider`` · timeline có bước → ``steps`` ·
   tab đổi nội dung → ``tabs`` · accordion đóng mở → ``expansion``.
6. Map từng phần tử nhìn thấy (nhãn nhỏ, tiêu đề lớn, mô tả, nút, icon, ảnh, badge, giá)
   sang **cell mode** ở bảng "Cell modes" (Bảng tham chiếu nhanh, cuối file).
7. Chọn ``anime``/``effect``/``bg`` theo cảm giác thiết kế (bảng ở Bước 6 / Bước 7).

Cấp độ Cơ bản — 1-2 vùng, không pinned, không apex
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**B1. Single full-width** — ``tiersCol: ['12']``

::

   ┌─────────────────────────────────────────┐
   │ T0  col-12  auto  (centered)            │
   │  badge · h1 · desc · CTA               │
   └─────────────────────────────────────────┘

Dùng cho: CTA section, hero đơn giản không ảnh. Tương tự ``ctaModernNeat``.

**B2. 50/50 hai cột, không pin** — ``tiersCol: ['6','6']``  rows đều ``'auto'``

::

   ┌────────────────┬────────────────┐
   │ T0  col-6  auto│ T1  col-6  auto│
   │  text block    │  image         │
   └────────────────┴────────────────┘

Dùng cho: intro + ảnh ngang hàng, ảnh không cần cao hơn text.

**B3. Banner trên + grid dưới** — ``tiersCol: ['12','12']``

::

   ┌─────────────────────────────────────────┐
   │ T0  col-12  (heading + description)     │
   ├─────────────────────────────────────────┤
   │ T1  col-12  (card grid / slider / masonry)│
   └─────────────────────────────────────────┘

Dùng cho: phần lớn section có card list — features, benefits, testimonials, blog.
Tương tự ``benefitsModernCardList``, ``testimonialsSpatialMasonryNeat``.

**B4. N cột đều nhau** — ``tiersCol: ['4','4','4']`` hoặc lồng trong tier Array ``[12, [3]]``

::

   ┌──────────┬──────────┬──────────┐
   │  col-4   │  col-4   │  col-4   │
   └──────────┴──────────┴──────────┘

Dùng cho: feature list ngang hàng, stats row. Tương tự ``statsModernCardRow``.

Cấp độ Trung bình — ảnh/khối pinned span nhiều row
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**M1. Text (7) + ảnh pin phải (5), span 2 rows** — ``tiersCol: ['7','5','7']``  ``tiersRow: ['auto','2','auto']``

::

   ┌──────────────────────┬────────────────┐
   │ T0  col-7  auto      │ T1  col-5      │  row 0
   │  badge · h1 · desc   │  image         │
   ├──────────────────────┤  span-2rows    │
   │ T2  col-7  auto      │                │  row 1
   │  CTA buttons         │                │
   └──────────────────────┴────────────────┘

Pattern **phổ biến nhất** cho hero/feature-intro. Tương tự ``heroModernHoriBase``, ``featuresModernCardIntro``.

**M2. Ảnh pin trái (span 2) + text phải** — ``tiersCol: ['6','6','6']``  ``tiersRow: ['2','auto','auto']``

::

   ┌────────────────┬──────────────────────┐
   │ T0  col-6      │ T1  col-6  auto      │  row 0
   │  image         │  badge · h1 · desc   │
   │  span-2rows    ├──────────────────────┤
   │                │ T2  col-6  auto      │  row 1
   │                │  CTA buttons         │
   └────────────────┴──────────────────────┘

Đảo chiều của M1 — dùng khi mockup đặt ảnh bên trái. Tương tự ``heroSpatialHoriNeat``.

**M3. Sidebar + nội dung chính** — ``tiersCol: ['12','3','9']``

::

   ┌─────────────────────────────────────────┐
   │ T0  col-12  (heading + description)     │
   ├──────────┬──────────────────────────────┤
   │ T1  col-3│ T2  col-9                    │
   │ sidebar  │ nội dung chính (cards/list)  │
   └──────────┴──────────────────────────────┘

Dùng cho: pricing với sidebar FAQ/label, dashboard-style section. Tương tự ``pricingModernCardPlans``.

**M4. 2 khối ngang, mỗi khối có 1 hàng phụ bên dưới** — ``tiersCol: ['5','7','5']``  ``tiersRow: ['auto','2','auto']``

::

   ┌──────────────┬─────────────────────────┐
   │ T0  col-5    │ T1  col-7               │  row 0
   │  intro       │  feature list / map     │
   ├──────────────┤  span-2rows             │
   │ T2  col-5    │                         │  row 1
   │  extra CTA   │                         │
   └──────────────┴─────────────────────────┘

Dùng cho: contact (địa chỉ + map), feature-list-pinned-right.
Tương tự ``contactModernHoriMap``, ``featuresModernHoriIntro``.

Cấp độ Nâng cao — nhiều tier pin, apex, render-mode kết hợp
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**A1. Gallery pin span-3 + 3 block phải xếp chồng** — ``tiersCol: ['6','6','6','6']``  ``tiersRow: ['3','auto','auto','auto']``

::

   ┌────────────────┬──────────────────────┐
   │ T0  col-6      │ T1  col-6  auto      │  row 0
   │  gallery       │  badge · h1          │
   │  span-3rows    ├──────────────────────┤
   │                │ T2  col-6  auto      │  row 1
   │                │  checklist           │
   │                ├──────────────────────┤
   │                │ T3  col-6  auto      │  row 2
   │                │  CTA buttons         │
   └────────────────┴──────────────────────┘

Dùng khi 1 ảnh/gallery cần đứng cạnh **3 block text tách biệt** xếp dọc (không gộp chung 1 tier).
Tương tự ``heroSpatialHoriGallery``.

**A2. Apex centered, single-tier** — ``tiersCol: ['12']``  +  ``apex``

::

   ┌─────────────────────────────────────────┐
   │ T0  col-12  auto  (centered)            │
   │  badge · h1 · desc · avatar-row · CTA  │
   └─────────────────────────────────────────┘

Dùng khi nội dung phức hợp (badge + heading + desc + avatar-strip + CTA) được đóng gói sẵn
trong 1 apex component thay vì viết tay ``makes``. Tương tự ``heroSpatialNeatCenterApex``.

**A3. Apex split-gallery, pin span-3 + 3 tier phụ** — ``tiersCol: ['7','5','7','7']``  ``tiersRow: ['auto','3','auto','auto']``

::

   ┌───────────────────┬───────────────┐
   │ T0  col-7  auto   │ T1  col-5     │  row 0
   │  intro            │  gallery      │
   ├───────────────────┤  span-3rows   │
   │ T2  col-7  auto   │               │  row 1
   │  checklist cards  │               │
   ├───────────────────┤               │
   │ T3  col-7  auto   │               │  row 2
   │  CTA buttons      │               │
   └───────────────────┴───────────────┘

Kết hợp M1 + A1: cột hẹp bên trái tách thành 3 tier riêng (intro/checklist/CTA),
ảnh bên phải pin xuyên suốt cả 3. Tương tự ``heroSpatialSplitGalleryApex``.

**A4. Tier Object tĩnh + Tier Array render-mode động**

Mọi pattern ở trên đều có thể kết hợp thêm 1 tier cuối là **Array** với render-mode riêng::

   tiersCol: ['12', '12']
   Tier 0 (Object, tĩnh)  → heading + description
   Tier 1 (Array, động)   → data[].map(...) + { masonry | slider | steps | tabs | expansion }

Đây là pattern nâng cao nhất — phối Tier ``Object`` + Tier ``Array`` (Bước 3) trong cùng 1
``baseConfig``. Tương tự ``blogSpatialSlideNeat`` (slider), ``testimonialsSpatialMasonryNeat``
(masonry), ``processModernStepTimeline`` (steps), ``faqModernExpansionQuestion`` (expansion).

.. tip::
   Khi nhận 1 ảnh mockup mới: chạy **Quy trình đọc ảnh → pattern** ở trên, khớp với pattern
   B/M/A gần nhất, copy ``tiersCol``/``tiersRow``/render-mode làm khung sườn, rồi điền
   ``makes`` theo Bước 5. Không khớp pattern nào 100% thì phối 2 pattern lại — layout thực
   tế luôn là biến thể của các khối cơ bản này.

----

Bước 2 — Chọn Render Mode
==========================

.. code-block:: text

   Thiết kế có nhiều vùng khác nhau (layout phức tạp)?
   ├─ CÓ ──────────────────────────────────────→ TIERS
   │                                              ├─ Vùng tĩnh (heading, intro, image cố định)
   │                                              │    → tier Object {}
   │                                              └─ Vùng động (cards lặp theo data[])
   │                                                   → tier Array []
   │                                                        ├─ masonry { col, gap }
   │                                                        ├─ slider  { perView, autoplay... }
   │                                                        ├─ steps   { labelField... }
   │                                                        ├─ tabs    { labelField... }
   │                                                        ├─ expansion { openFirst... }
   │                                                        └─ (mặc định) N×M boxes
   │
   └─ KHÔNG (1 loại item đồng nhất lặp lại)
           ├─ Chiều cao items khác nhau → MASONRY (config.masonry prop)
           ├─ Carousel / swipe           → SLIDER  (config.slider prop)
           ├─ Wizard / timeline          → STEPS   (config.steps prop)
           ├─ Tab chuyển nội dung        → TABS    (config.tabs prop)
           ├─ Accordion đóng mở          → EXPANSION
           └─ Grid đều nhau              → GRID (mặc định, không cần thêm gì)

**Thứ tự ưu tiên xử lý:** tiers → masonry → slider → steps → tabs → expansion → grid

----

Bước 3 — Cấu trúc Tiers chi tiết
==================================

Tier ``Object`` — vùng tĩnh
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Render **1 lần** với data rỗng ``{}``. Dùng ``bitLocal`` cho tất cả nội dung.

.. code-block:: js

   // Tier Object: label + heading + description + CTA button
   {
       groupCol:     [12],
       groupRow:     ['auto'],
       groupJustify: ['center'],
       groupStyle:   [{ flexDirection: 'column', gap: '1rem', padding: '2rem 0 1.5rem' }],
       makes: [[
           // Label nhỏ phía trên heading
           { bitLocal: 'OUR FEATURES', opt: { mode: 'p', stys: {
               fontSize: 'clamp(0.7rem, 1vw, 0.75rem)', textTransform: 'uppercase', letterSpacing: '0.12em',
               color: 'var(--color-primary)', fontWeight: '600', margin: '0',
           }}},
           // Heading chính — dùng motion cho ấn tượng
           { bitLocal: 'Why Choose Us', opt: { mode: 'h2', motion: true, word: true, effect: 'focusIn', stys: {
               fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: '700',
               lineHeight: '1.15', letterSpacing: '-0.02em', margin: '0',
           }}},
           // Mô tả ngắn
           { bitLocal: 'Supporting text explaining the value proposition.', opt: { mode: 'p', stys: {
               fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', margin: '0', maxWidth: '40rem',
               color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
           }}},
           // CTA (tùy chọn)
           { bitLocal: 'Get Started', opt: { mode: 'button', type: 'fill', color: 'primary',
               height: '48px', prefix: 'ri:arrow-right-line',
               stys: { alignSelf: 'flex-start' },
           }},
       ]],
   }

Tier ``Array`` — vùng động
~~~~~~~~~~~~~~~~~~~~~~~~~~~

Render **cho từng item trong data[]**. Dùng ``bit`` để đọc data.

.. code-block:: js

   // Tier Array: card template (lặp theo data[])
   [
       {
           groupCol:     ['12'],
           groupRow:     ['auto'],
           groupJustify: ['left'],
           groupStyle:   [{ flexDirection: 'column', gap: '0.5rem', padding: '1.25rem' }],
           makes: [[
               { bit: 'title',   opt: { mode: 'h4', stys: { fontWeight: '700' } } },
               { bit: 'content', opt: { mode: 'p',  stys: { fontSize: 'clamp(0.875rem, 1.2vw, 1rem)' } } },
           ]],
           bg:   { ...getStyleOpts({ rounded: '1.25rem', tint: '#2ebd85', total: 1, gradient: true, blobType: 'circleOverlap' }) },
           stys: { padding: '1.25rem', borderRadius: '1.25rem',
                   border: '1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)' },
           anime: 'fade-in',
           animeQueue: '80ms',
       },
   ]

``masonry`` trong tier Array
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Items xếp theo chiều cao tự nhiên (Pinterest layout). Luôn đặt trong tier Array ``[]``.

.. code-block:: js

   [{ masonry: { col: 3, gap: '1.25rem' }, groupCol: [...], ... }]
   // col: số cột masonry (2 | 3 | 4)
   // gap: khoảng cách giữa items

``slider`` trong tier Array
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: js

   [
       {
           slider: {
               perView:  2.5,      // số slide hiển thị (số thập phân cho peek)
               spacing:  20,       // khoảng cách giữa slide (px)
               autoplay: 4000,     // 0 = tắt autoplay, N = delay ms
               loop:     true,     // lặp vòng
               nav:      false,    // hiện nút prev/next
               dots:     true,     // hiện dot indicator
               origin:   'auto',   // 'auto' | 'center'
               vertical: false,    // vuốt dọc
               mode:     'snap',   // 'snap' | 'free' | 'free-snap'
               fade:     false,    // chuyển slide fade thay slide
           },
           // ... groups
       },
   ]

``steps`` / ``tabs`` / ``expansion`` trong tier Array
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: js

   // Steps (wizard / timeline)
   [{ steps: { labelField: 'title', idField: 'id', iconField: 'meta.icon',
                statusField: 'status', active: '' }, ... }]

   // Tabs
   [{ tabs: { labelField: 'title', idField: 'id', align: 'left', active: '' }, ... }]

   // Expansion (accordion)
   [{ expansion: { labelField: 'title', idField: 'id', openFirst: true, multiple: false }, ... }]

----

Bước 4 — Groups (web-box layout)
==================================

Trong mỗi tier (hoặc baseConfig gốc nếu không dùng tiers), ``groupCol[i]`` định nghĩa 1 cell.

groupCol + groupRow
~~~~~~~~~~~~~~~~~~~

.. code-block:: js

   // 1 cell full width
   groupCol: ['12'],  groupRow: ['auto']

   // 2 cells xếp chồng (full width mỗi cái)
   groupCol: ['12', '12'],  groupRow: ['auto', 'auto']

   // 2 cells ngang (title 8 + action 4)
   groupCol: ['8', '4'],  groupRow: ['auto', 'auto']

   // Nhảy xuống row mới khi tổng > 12
   groupCol: ['7', '5', '12']
   // → row 0: col-7 + col-5  |  row 1: col-12

groupJustify
~~~~~~~~~~~~

Điều khiển layout bên trong ``<web-cell>`` (inner div). **Mọi giá trị trừ ``'none'`` đều có ``display:flex``.**

+---------------+------------------------------------------------------+-------------------------------------------+
| Giá trị       | CSS                                                  | Khi nào dùng                              |
+===============+======================================================+===========================================+
| ``'none'``    | ``display: block``                                   | Stack tự nhiên, không cần flex            |
+---------------+------------------------------------------------------+-------------------------------------------+
| ``'left'``    | ``display:flex; justify-content:flex-start``         | Nội dung căn trái (dùng nhiều nhất)       |
+---------------+------------------------------------------------------+-------------------------------------------+
| ``'center'``  | ``display:flex; justify-content:center``             | Icon, số liệu, badge căn giữa             |
+---------------+------------------------------------------------------+-------------------------------------------+
| ``'right'``   | ``display:flex; justify-content:flex-end``           | Action, link ở phải                       |
+---------------+------------------------------------------------------+-------------------------------------------+
| ``'between'`` | ``display:flex; justify-content:space-between``      | Title bên trái + button bên phải          |
+---------------+------------------------------------------------------+-------------------------------------------+
| ``'overflow'``| ``display:flex; overflow:hidden``                    | Ảnh cần crop, gallery với overflow        |
+---------------+------------------------------------------------------+-------------------------------------------+

.. note::
   Muốn xếp **dọc**: thêm ``groupStyle: [{ flexDirection: 'column' }]``.
   Muốn xếp **ngang**: để nguyên (flex row mặc định).
   Muốn **căn giữa dọc**: thêm ``alignItems: 'center'`` vào ``groupStyle``.

groupStyle — QUAN TRỌNG
~~~~~~~~~~~~~~~~~~~~~~~

``groupStyle[i]`` bị **tách làm 2** khi render:

- 8 property lên **host** ``<web-cell>`` (ảnh hưởng vị trí trong grid):
  ``overflow``, ``position``, ``top``, ``right``, ``bottom``, ``left``, ``inset``, ``zIndex``
- **Tất cả còn lại** vào inner div ``.jf`` bên trong Shadow DOM:
  ``flexDirection``, ``gap``, ``padding``, ``alignItems``, ``background``, ``borderRadius``, …

.. code-block:: js

   // Badge absolute trên ảnh → position/overflow lên host
   groupStyle: [
       { position: 'relative', overflow: 'hidden' },            // group 0 (ảnh)
       { position: 'absolute', bottom: '0.5rem', right: '0.5rem' },  // group 1 (badge)
   ]

   // Text block dọc
   groupStyle: [{ flexDirection: 'column', gap: '0.75rem', padding: '1.25rem 1.5rem' }]

   // Icon + title ngang, căn giữa dọc
   groupStyle: [{ alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem' }]

   // 2 cell ngang, giữa dọc, giữa ngang (thống kê)
   groupStyle: [{ flexDirection: 'column', alignItems: 'center', padding: '1.5rem' }]

----

Bước 5 — Makes (cell content)
==============================

``makes[i]`` là mảng các cell spec cho group ``i``. Mỗi spec có ``bit`` / ``bitLocal`` + ``opt``.

Cú pháp cơ bản
~~~~~~~~~~~~~~~

.. code-block:: js

   // Giá trị tĩnh
   { bitLocal: 'Tìm hiểu thêm →', opt: { mode: 'span', stys: { cursor: 'pointer', fontWeight: '600' } } }

   // Giá trị từ data (top-level field)
   { bit: 'title', opt: { mode: 'h4' } }

   // Dot-path
   { bit: 'meta.icon',   opt: { mode: 'icon' } }
   { bit: 'author.name', opt: { mode: 'p' } }

   // Không có bit/bitLocal → fallback về keys[j] từ groupKey[i]

Patterns phổ biến
~~~~~~~~~~~~~~~~~

**Hero text block (tĩnh)**

.. code-block:: js

   // groupJustify: ['center'], groupStyle: [{ flexDirection: 'column', gap: '1rem' }]
   makes: [[
       { bitLocal: 'LABEL', opt: { mode: 'p', stys: {
           fontSize: 'clamp(0.7rem, 1vw, 0.75rem)', textTransform: 'uppercase', letterSpacing: '0.1em',
           color: 'var(--color-primary)', fontWeight: '600', margin: '0',
       }}},
       { bitLocal: 'Main Heading', opt: { mode: 'h2', motion: true, word: true, effect: 'focusIn', stys: {
           fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: '700',
           lineHeight: '1.15', letterSpacing: '-0.02em', margin: '0',
       }}},
       { bitLocal: 'Supporting description.', opt: { mode: 'p', stys: {
           fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', margin: '0', maxWidth: '38rem',
           color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
       }}},
       { bitLocal: 'Get Started', opt: { mode: 'button', type: 'fill', color: 'primary',
           height: '48px', prefix: 'ri:arrow-right-line', stys: { alignSelf: 'flex-start' } }},
   ]]

**Feature card: icon circle + title ngang → learn more link**

.. code-block:: js

   // groupCol: ['12', '12'], groupJustify: ['left', 'right']
   // groupStyle: [{ alignItems: 'center' }, { padding: '0' }]
   makes: [
       [   // Row 0: icon + title
           { bit: 'meta.icon', opt: { mode: 'icon', width: '1.25rem', color: 'var(--color-primary)',
               stys: { width: '2.5rem', height: '2.5rem', borderRadius: '50%', flexShrink: '0',
                       background: 'color-mix(in oklab, var(--color-primary) 15%, transparent)',
                       display: 'flex', alignItems: 'center', justifyContent: 'center' } }},
           { bit: 'title', opt: { mode: 'h4', stys: { fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', fontWeight: '700', marginLeft: '0.5rem' } }},
       ],
       [   // Row 1: link phải
           { bitLocal: 'Learn More →', opt: { mode: 'span', stys: {
               fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', fontWeight: '600', cursor: 'pointer',
               color: 'var(--color-base-content)',
           }}},
       ],
   ]

**Image + badge overlay**

.. code-block:: js

   // groupJustify: ['overflow']
   // groupStyle: [{ position: 'relative', overflow: 'hidden', borderRadius: '1rem 1rem 0 0' }]
   makes: [[
       { bit: 'pics', opt: { mode: 'gallery', stys: { width: '100%', aspectRatio: '4/3', objectFit: 'cover' } }},
       { bit: 'meta.badge', opt: { mode: 'badge', type: 'fill', color: 'error',
           stys: { position: 'absolute', bottom: '0.5rem', right: '0.5rem' } }},
   ]]

**Giá + nút đặt hàng**

.. code-block:: js

   // groupJustify: ['between']
   // groupStyle: [{ alignItems: 'center', padding: '0.5rem 1rem 1rem' }]
   makes: [[
       { bit: 'pricing', opt: { mode: 'span', stys: {
           fontSize: 'clamp(1.25rem, 2vw, 1.625rem)', fontWeight: '900', color: 'var(--color-primary)',
       }}},
       { bitLocal: 'Đặt ngay', opt: { mode: 'button', type: 'fill', color: 'primary',
           action: 'add-to-cart', height: '36px' }},
   ]]

**Stats / số liệu lớn**

.. code-block:: js

   // groupJustify: ['center']
   // groupStyle: [{ flexDirection: 'column', alignItems: 'center', gap: '0.25rem', padding: '1.5rem 1rem' }]
   makes: [[
       { bit: 'value', opt: { mode: 'h2', stys: {
           fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: '900', color: 'var(--color-primary)', margin: '0',
       }}},
       { bit: 'label', opt: { mode: 'p', stys: {
           fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', margin: '0',
           color: 'color-mix(in oklab, var(--color-base-content) 60%, transparent)',
       }}},
   ]]

**Testimonial / quote**

.. code-block:: js

   // groupJustify: ['none']
   // groupStyle: [{ flexDirection: 'column', gap: '1rem', padding: '1.5rem' }]
   makes: [[
       { bitLocal: '"', opt: { mode: 'p', stys: { fontSize: '2.5rem', color: 'var(--color-primary)', lineHeight: '1', margin: '0' } }},
       { bit: 'content', opt: { mode: 'p', stys: { fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', fontStyle: 'italic', margin: '0' } }},
       { bit: 'title',   opt: { mode: 'p', stys: { fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', fontWeight: '700', marginTop: '0.5rem' } }},
   ]]

----

Bước 6 — Animation
===================

Animation cho ``web-box`` (``anime``)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Áp dụng cho toàn bộ card khi scroll vào viewport.
``animeQueue`` = delay stagger giữa các card liên tiếp (``'80ms'``, ``'120ms'``, ``'150ms'``).

.. code-block:: js

   // Trong tier Array hoặc baseConfig
   anime: 'fade-in',
   animeQueue: '100ms',

Chọn ``anime`` theo vị trí / cảm giác:

+----------------------------------+------------------------------+----------------------------------------+
| Vị trí / cảm giác                | ``anime``                    | Ghi chú                                |
+==================================+==============================+========================================+
| Card grid phổ thông              | ``fade-in``                  | Nhẹ, không phô — dùng mặc định        |
+----------------------------------+------------------------------+----------------------------------------+
| Hero / section đầu tiên          | ``fade-in-fwd``              | Tiến ra phía trước                     |
+----------------------------------+------------------------------+----------------------------------------+
| Content từ bên phải vào          | ``slide-in-blurred-right``   | Split layout trái / phải               |
+----------------------------------+------------------------------+----------------------------------------+
| Content từ bên trái vào          | ``slide-in-blurred-left``    |                                        |
+----------------------------------+------------------------------+----------------------------------------+
| Feature card từ dưới lên         | ``bounce-in-bottom``         | Năng động, trẻ trung                   |
+----------------------------------+------------------------------+----------------------------------------+
| Testimonial / quote              | ``swirl-in-fwd``             | Tinh tế, nhẹ nhàng                     |
+----------------------------------+------------------------------+----------------------------------------+
| Tile góc trên trái               | ``tilt-in-tl``               | Dùng cho ảnh, image block              |
+----------------------------------+------------------------------+----------------------------------------+
| Card xoay vào                    | ``rotate-in-ccw``            | Đặc biệt, dùng tiết kiệm              |
+----------------------------------+------------------------------+----------------------------------------+
| Flip card 3D                     | ``flip-in-diag-tl``          | Rất đặc biệt, dùng cho 1 section       |
+----------------------------------+------------------------------+----------------------------------------+

**Tất cả classes:**

.. code-block:: text

   Fade:   fade-in | fade-in-fwd | fade-in-bck
   Slide:  slide-in-blurred-left | right | top | bottom
   Bounce: bounce-in-left | right | top | bottom
   Rotate: rotate-in-ccw | rotate-in-cw
   Swirl:  swirl-in-fwd | swirl-in-bck
   Tilt:   tilt-in-tl | tilt-in-tr | tilt-in-bl | tilt-in-br
   Flip:   flip-in-diag-tl | flip-in-diag-tr | flip-in-diag-bl | flip-in-diag-br

Animation cho **text** (``motion`` + ``effect``)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Dùng trong ``opt`` của ``h1``–``h6``, ``p``, ``span``. Bắt buộc ``motion: true``.

.. code-block:: js

   { bitLocal: 'Why Choose Us', opt: {
       mode:     'h2',
       motion:   true,       // PHẢI là true
       word:     true,       // true = hiệu ứng theo từ | false = theo ký tự
       effect:   'focusIn',  // tên hiệu ứng
       loop:     false,      // lặp vô hạn (tránh dùng)
       duration: 800,        // ms mỗi đơn vị
       delay:    60,         // ms delay giữa các đơn vị
   }}

Chọn ``effect`` theo cảm giác:

+-----------------------------+--------------------------------------+------------------------------------------+
| Cảm giác muốn               | ``effect``                           | Ghi chú                                  |
+=============================+======================================+==========================================+
| Sắc nét, rõ — dùng nhiều   | ``focusIn``                          | Blur → clear, chuẩn cho heading          |
+-----------------------------+--------------------------------------+------------------------------------------+
| Nhẹ nhàng, tinh tế          | ``fadeIn``, ``riseUp``, ``floatIn``  | Không làm người xem mệt                  |
+-----------------------------+--------------------------------------+------------------------------------------+
| Năng động, nổi bật          | ``zoomIn``, ``slideUp``              | Hero heading muốn gây ấn tượng           |
+-----------------------------+--------------------------------------+------------------------------------------+
| Kỹ thuật số / tech          | ``glitchIn``, ``typeIn``             | Startup / SaaS vibe                      |
+-----------------------------+--------------------------------------+------------------------------------------+
| Bay / trôi vào              | ``driftIn``, ``floatIn``             | Landing page nhẹ nhàng                   |
+-----------------------------+--------------------------------------+------------------------------------------+
| Xoay / lắc vào              | ``spinIn``, ``swingIn``              | Icon / ký tự đặc biệt                    |
+-----------------------------+--------------------------------------+------------------------------------------+
| 3D flip                     | ``flipIn``, ``flipX``                | Rất đặc biệt — dùng tiết kiệm            |
+-----------------------------+--------------------------------------+------------------------------------------+
| Sóng / nhịp / pulse         | ``waveIn``, ``pulseIn``              | Tagline, slogan ngắn                     |
+-----------------------------+--------------------------------------+------------------------------------------+
| Tan ra / scatter            | ``scatterIn``, ``pinIn``             | Dùng cho 1 heading duy nhất              |
+-----------------------------+--------------------------------------+------------------------------------------+

**Gợi ý kết hợp chuẩn:**

.. code-block:: js

   // Heading chính h1/h2 — bao giờ cũng word:true
   { mode: 'h2', motion: true, word: true, effect: 'focusIn', delay: 60, duration: 800 }

   // Subheading h3/h4
   { mode: 'h3', motion: true, word: true, effect: 'riseUp', delay: 50, duration: 700 }

   // Tagline / slogan ngắn — char animation (word: false)
   { mode: 'p', motion: true, word: false, effect: 'waveIn', delay: 40, duration: 600 }

   // Tech brand name
   { mode: 'h1', motion: true, word: false, effect: 'glitchIn', delay: 30, duration: 500 }

.. note::
   Tránh dùng ``loop: true`` trừ khi element đó là focal point duy nhất của trang.
   Dùng ``motion: true`` tối đa 1–2 heading chính mỗi section — quá nhiều gây rối mắt.

----

Bước 7 — Background (``bg`` + ``getStyleOpts``)
================================================

**Quy tắc:** Mọi ``bg`` đều dùng helper ``getStyleOpts``. Không viết tay object ``bg`` hay hardcode màu.

``bg`` render qua ``<svc-underlay>`` (WebGL particle background + gradient-blob layer, xem
``src/webs/underlay/svc-underlay.js``) — thay cho ``<web-bg>`` cũ. ``svc-underlay`` chỉ hỗ trợ
``blobType`` ``'circleOverlap' | 'ellipse'`` (không còn ``'circle'``/``'circleEdge'``) và không
có ``pattern``/``pics``/``effectFx`` (pattern tile, ảnh nền, ripple/push-tile fx) — những tính
năng đó thuộc riêng ``web-bg.js`` cũ, không migrate sang.

Signature đầy đủ
~~~~~~~~~~~~~~~~~

.. code-block:: js

   import { getStyleOpts } from '@/services/helper';

   bg: {
       ...getStyleOpts({
           rounded:    '1.25rem',   // border-radius ('0' = vuông, '' = không set)
           tint:       '#2ebd85',   // hex/rgb — màu seed blob (thường = primary color)
           total:   2,          // số màu (1-7) — dùng chung cho blob gradient LẪN palette hạt concept
           gradient:   true,        // PHẢI true để blob hiển thị
           blur:       true,        // glassmorphism + backdrop-filter: blur
           hueCustom:   0,          // 0 = transparent bg, 1 = base-300 15% nhạt
           blobType:   'circleOverlap', // 'circleOverlap' | 'ellipse'
           colorful:   false,       // false = tonal (đơn hue, chỉ khác độ sáng) | true = dải màu spread nhiều hue
           deg:        135,         // góc khởi đầu blob / góc gradient ellipse
           distance:    86,         // % lan toả blob quanh tâm (chỉ blobType 'circleOverlap')
       }),
       // blobMove không phải param của getStyleOpts — set tay thêm nếu muốn blob chuyển động:
       blobMove: '',  // '' (tắt) | 'swap' | 'pulse'
   }

9 công thức ``bg`` mẫu — dùng trực tiếp hoặc biến tấu
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**1. Glassmorphism card (blur tiêu chuẩn)**

.. code-block:: js

   bg:   { ...getStyleOpts({ rounded: '1.5rem', tint: '#2ebd85', total: 2, gradient: true, blur: true }) }
   stys: { padding: '1.5rem', borderRadius: '1.5rem' }

**2. Dark card với viền mờ (modern minimal)**

.. code-block:: js

   bg:   { ...getStyleOpts({ rounded: '1.25rem', hueCustom: 1 }) }
   stys: { padding: '1.25rem', borderRadius: '1.25rem',
           border: '1px solid color-mix(in oklab, var(--color-base-content) 8%, transparent)' }

**3. Gradient blob 3 màu nổi bật**

.. code-block:: js

   bg:   { ...getStyleOpts({ rounded: '1.75rem', tint: '#a855f7', total: 3, colorful: true, gradient: true, blobType: 'circleOverlap', deg: 45 }) }
   stys: { padding: '1.5rem', borderRadius: '1.75rem' }

**4. Ellipse band nền section (sweeping gradient)**

.. code-block:: js

   bg:   { ...getStyleOpts({ rounded: '0', tint: '#00c7d4', total: 2, gradient: true, blobType: 'ellipse', deg: 0 }) }
   stys: { padding: '4rem 0' }

**5. Pulsing blob — CTA section nổi bật**

.. code-block:: js

   bg:   { ...getStyleOpts({ rounded: '0', tint: '#f5465c', total: 2, gradient: true, blobType: 'circleOverlap', deg: 90 }), blobMove: 'pulse' }
   stys: { padding: '4rem 0' }

**6. Swap blobs — hero animated**

.. code-block:: js

   bg:   { ...getStyleOpts({ rounded: '0', tint: '#fbbf24', total: 2, gradient: true, blobType: 'circleOverlap', deg: 90 }), blobMove: 'swap' }
   stys: { padding: '3rem 0' }

**7. Ellipse band nhẹ (spread rộng, không blob cụm)**

.. code-block:: js

   bg:   { ...getStyleOpts({ rounded: '1.5rem', tint: '#2ebd85', total: 1, gradient: true, blobType: 'ellipse', deg: 45 }) }
   stys: { padding: '1.5rem', borderRadius: '1.5rem' }

**8. 4 blob cụm rộng (distance lớn, tạo vầng bao quanh)**

.. code-block:: js

   bg:   { ...getStyleOpts({ rounded: '1.5rem', tint: '#a855f7', total: 4, gradient: true, blobType: 'circleOverlap', deg: 0, distance: 90 }) }
   stys: { padding: '1.5rem', borderRadius: '1.5rem' }

**9. Mono dark — premium/dark section**

.. code-block:: js

   bg:   { ...getStyleOpts({ rounded: '0', tint: '#2ebd85', total: 2, gradient: true, blobType: 'circleOverlap', deg: 180 }) }
   stys: { padding: '3rem 0', background: 'var(--color-base-200)' }

.. tip::
   Mỗi section trong trang nên dùng **tổ hợp khác nhau** của ``blobType``, ``deg``, ``tint``,
   ``total`` để tránh các section trông giống nhau. Chọn ``tint`` theo ``mainColors`` của
   page (``#2ebd85`` / ``#f5465c`` / ``#a855f7`` / ``#00c7d4`` / ``#fbbf24``).

----

Bước 8 — Stys và cấu trúc cuối
================================

``stys`` của baseConfig
~~~~~~~~~~~~~~~~~~~~~~~~

Style trên **wrapper ngoài cùng** của section:

.. code-block:: js

   stys: { padding: '3rem 0' }              // padding chuẩn
   stys: { padding: '4rem 0 2rem' }         // hero section
   stys: { padding: '2rem 0' }              // compact
   stys: { padding: '5rem 0' }              // section quan trọng, cần không gian

.. note::
   Không set ``backgroundColor`` trong ``stys`` của config.
   Màu nền section được set từ ``landing-page.js`` qua ``section.stys``:
   ``{ stys: { backgroundColor: 'var(--color-base-200)' } }``

``stys`` của tier Array item (card-level)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: js

   // Card đơn giản với bo góc
   stys: { padding: '1.25rem', borderRadius: '1.25rem', overflow: 'hidden' }

   // Card có viền
   stys: { padding: '1.25rem', borderRadius: '1.25rem',
           border: '1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)' }

   // Card không padding (ảnh full-bleed)
   stys: { borderRadius: '1rem', overflow: 'hidden' }

----

Quy tắc bắt buộc
=================

**1. Một ``baseConfig`` duy nhất.**
Không tạo ``baseConfigDark`` + ``baseConfigLight``. Sự khác biệt dark/light chỉ ở ``mainColors``:

.. code-block:: js

   export const config = { ...baseConfig };

**2. Không hardcode màu hex / rgb / named color** trong ``makes``, ``stys``, ``groupStyle``.
Chỉ dùng:

.. code-block:: js

   var(--color-primary)
   var(--color-base-100)  / var(--color-base-200)  / var(--color-base-300)
   var(--color-base-content)
   color-mix(in oklab, var(--color-xxx) Y%, transparent)
   color-mix(in oklab,  var(--color-xxx) Y%, transparent)

**3. ``getStyleOpts`` cho mọi ``bg``** — không viết tay object bg.

**4. ``bitLocal`` cho text cố định** — không đưa text tĩnh vào ``data[]``.

**5. ``position`` / ``overflow`` trong ``groupStyle`` luôn lên host** —
sai sẽ vỡ layout hoặc badge không absolute đúng chỗ.

**6. ``motion: true`` tối đa 1–2 heading mỗi section** — nhiều hơn gây rối mắt.

----

Bảng tham chiếu nhanh
======================

Cell modes
~~~~~~~~~~

+----------------------+-------------------------------------------------------------------+
| Mode                 | Dùng cho                                                          |
+======================+===================================================================+
| ``h1``–``h6``        | Heading (hỗ trợ ``motion`` + ``effect`` + ``word``)               |
+----------------------+-------------------------------------------------------------------+
| ``p``                | Đoạn văn, mô tả, label nhỏ                                        |
+----------------------+-------------------------------------------------------------------+
| ``span``             | Text inline, link text, số liệu                                   |
+----------------------+-------------------------------------------------------------------+
| ``gallery``          | Ảnh đơn hoặc pipe-sep ``url1|url2`` (popup slider tự động)        |
+----------------------+-------------------------------------------------------------------+
| ``icon``             | Iconify icon (``ri:name-line``) + style container tùy chỉnh       |
+----------------------+-------------------------------------------------------------------+
| ``button``           | CTA với ``action`` → dispatch ``cell-action`` event               |
+----------------------+-------------------------------------------------------------------+
| ``badge``            | Chip nhỏ (``type``: fill/outline/soft, ``color``: primary/error…) |
+----------------------+-------------------------------------------------------------------+
| ``tags``             | Pipe-separated tags (``tagA|tagB``)                               |
+----------------------+-------------------------------------------------------------------+
| ``rating``           | Sao từ ``score`` field (``'4.5~128'``) + mask ApexUI             |
+----------------------+-------------------------------------------------------------------+
| ``a``                | Liên kết với ``target``, ``ext.org`` cho URL                      |
+----------------------+-------------------------------------------------------------------+
| ``dropdown``         | Menu thả xuống gắn vào nút                                        |
+----------------------+-------------------------------------------------------------------+
| ``popover``          | Floating content khi hover/click                                  |
+----------------------+-------------------------------------------------------------------+
| ``photor-upload``    | Upload ảnh tới imgbb                                              |
+----------------------+-------------------------------------------------------------------+
| ``iframe``           | Nhúng iframe ngoài (YouTube/Vimeo/map…). ``bit``/``bitLocal`` là  |
|                       | embed URL. Mặc định full-bleed cover 16:9 (dùng cho video nền     |
|                       | trong group ``position:absolute``) — override qua ``opt.stys``.  |
+----------------------+-------------------------------------------------------------------+

Data fields chuẩn
~~~~~~~~~~~~~~~~~

+---------------+--------------------+-------------------------------------------+
| Field         | Format             | Mode phù hợp                              |
+===============+====================+===========================================+
| ``title``     | text               | ``h3`` / ``h4``                           |
+---------------+--------------------+-------------------------------------------+
| ``content``   | text               | ``p``                                     |
+---------------+--------------------+-------------------------------------------+
| ``pics``      | ``url1|url2``      | ``gallery``                               |
+---------------+--------------------+-------------------------------------------+
| ``tags``      | ``tagA|tagB``      | ``tags``                                  |
+---------------+--------------------+-------------------------------------------+
| ``score``     | ``avg~count``      | ``rating``                                |
+---------------+--------------------+-------------------------------------------+
| ``pricing``   | ``price~cost~unit``| ``span`` (giá) + ``button`` (action)      |
+---------------+--------------------+-------------------------------------------+
| ``meta.icon`` | icon name          | ``icon``                                  |
+---------------+--------------------+-------------------------------------------+
| ``meta.badge``| text               | ``badge``                                 |
+---------------+--------------------+-------------------------------------------+
| ``meta.link`` | URL                | ``a``                                     |
+---------------+--------------------+-------------------------------------------+

Font size chuẩn
~~~~~~~~~~~~~~~

+--------------------------------+--------------------------------------+
| Vị trí                         | ``fontSize``                         |
+================================+======================================+
| Section label (uppercase)      | ``'clamp(0.7rem, 1vw, 0.75rem)'``    |
+--------------------------------+--------------------------------------+
| Hero heading (h1)              | ``'clamp(2.5rem, 5vw, 4.5rem)'``     |
+--------------------------------+--------------------------------------+
| Section heading (h2)           | ``'clamp(2rem, 4vw, 3.5rem)'``       |
+--------------------------------+--------------------------------------+
| Card heading (h3)              | ``'clamp(1.75rem, 3vw, 2.5rem)'``    |
+--------------------------------+--------------------------------------+
| Card subheading (h4)           | ``'clamp(1.5rem, 2.5vw, 2rem)'``     |
+--------------------------------+--------------------------------------+
| Card label (h5)                | ``'clamp(1.25rem, 2vw, 1.5rem)'``    |
+--------------------------------+--------------------------------------+
| Card detail (h6)               | ``'clamp(1rem, 1.5vw, 1.25rem)'``    |
+--------------------------------+--------------------------------------+
| Body text                      | ``'clamp(0.875rem, 1.2vw, 1rem)'``   |
+--------------------------------+--------------------------------------+
| Caption / meta                 | ``'clamp(0.7rem, 0.9vw, 0.8rem)'``   |
+--------------------------------+--------------------------------------+
| Giá lớn                        | ``'clamp(1.25rem, 2vw, 1.625rem)'``  |
+--------------------------------+--------------------------------------+

.. note::
   Kể từ khi ``web-letters.js`` (dùng cho mode ``h1``–``h6``, ``p``, ``span``) đã có
   sẵn default ``font-size``/``font-weight``/``line-height``/``letter-spacing``/
   ``white-space`` chuẩn theo bảng trên, **không cần khai báo lại các props này
   trong** ``stys`` **của section config nữa**.

   Chỉ khai báo khi thực sự muốn custom khác giá trị chuẩn (vd. hero heading cần
   ``fontSize`` to hơn mức mặc định) — và **bắt buộc phải có comment** ngay trên
   dòng khai báo, nêu rõ prop nào bị custom, ví dụ:

   .. code-block:: js

      stys: {
          fontSize: 'clamp(3rem, 6vw, 5.5rem)', // custom fontSize
          fontWeight: '800', // custom fontWeight
      }

   Quy ước này chỉ áp dụng cho ``opt.stys`` của mode ``h1``–``h6``, ``p``, ``span``
   (đi qua ``web-letters``). Các mode khác (``button``, ``badge``, ``icon``, …)
   không bị ảnh hưởng và vẫn khai báo ``fontSize``/``fontWeight`` bình thường.

----

Ví dụ hoàn chỉnh: phân tích từ mockup
======================================

**Yêu cầu:** Section "Features" — text trái, ảnh phải, 4 feature card bên dưới.

**Phân tích:**

.. code-block:: text

   ┌───────────────────────────┬──────────────────┐
   │  Badge (static)           │                  │
   │  H2 heading (static)      │   Hero Image     │  ← Tier 0 (col-6) + Tier 1 (col-6)
   │  Description (static)     │   (static URL)   │
   └───────────────────────────┴──────────────────┘
   ┌───────────┬───────────┬───────────┬───────────┐
   │  Card 1   │  Card 2   │  Card 3   │  Card 4   │  ← Tier 2 (col-12), masonry 4 col
   │  icon+title │ icon+title │ icon+title │ icon+title│  (dynamic, từ data[])
   └───────────┴───────────┴───────────┴───────────┘

- 3 vùng khác nhau → ``tiers``
- ``tiersCol: ['6', '6', '12']``, ``tiersRow: ['auto', 'auto', 'auto']``
- Tier 0: Object (tĩnh) — text intro bên trái
- Tier 1: Object (tĩnh) — ảnh bên phải
- Tier 2: Array (động) — 4 cards từ ``data[]``, masonry 4 cột

.. code-block:: js

   import { getStyleOpts } from '@/services/helper';

   export const data = [
       { title: 'Daily Auto Update',   meta: { icon: 'ri:refresh-line' } },
       { title: 'Why Choose Sasup',    meta: { icon: 'ri:focus-3-line' } },
       { title: 'Accelerated Process', meta: { icon: 'ri:flashlight-fill' } },
       { title: 'Google Analytics',    meta: { icon: 'ri:bar-chart-2-fill' } },
   ];

   const baseConfig = {
       tiersCol: ['6', '6', '12'],
       tiersRow: ['auto', 'auto', 'auto'],
       tiers: [

           // ── Tier 0: text intro (tĩnh) ───────────────────────────────────────
           {
               groupCol:     [12],
               groupRow:     ['auto'],
               groupJustify: ['center'],
               groupStyle:   [{ flexDirection: 'column', gap: '1.25rem', paddingRight: '1.5rem', paddingBottom: '2rem' }],
               makes: [[
                   { bitLocal: 'Workflow Integration', opt: {
                       mode: 'badge', type: 'fill', color: 'primary',
                       stys: { alignSelf: 'flex-start', fontWeight: '600', fontSize: '0.875rem' },
                   }},
                   { bitLocal: 'Why you\nShould choose Sasup', opt: {
                       mode: 'h2', motion: true, word: true, effect: 'focusIn',
                       stys: { fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: '700',
                               lineHeight: '1.15', letterSpacing: '-0.02em', margin: '0' },
                   }},
                   { bitLocal: "Let's check our Getting Started tutorial.", opt: {
                       mode: 'p',
                       stys: { fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', margin: '0', maxWidth: '38rem',
                               color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)' },
                   }},
               ]],
           },

           // ── Tier 1: hero image (tĩnh) ────────────────────────────────────────
           {
               groupCol:     [12],
               groupRow:     ['auto'],
               groupJustify: ['none'],
               groupStyle:   [{ overflow: 'hidden' }],
               makes: [[
                   { bitLocal: '/images/transparent/landscape-2.png', opt: {
                       mode: 'gallery',
                       stys: { width: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' },
                   }},
               ]],
               anime: 'tilt-in-tl',
           },

           // ── Tier 2: 4 feature cards (động, masonry 4 cột) ───────────────────
           [
               {
                   masonry:      { col: 4, gap: '1rem' },
                   groupCol:     ['12', '12'],
                   groupRow:     ['auto', 'auto'],
                   groupJustify: ['left', 'right'],
                   groupStyle:   [
                       { padding: '0', alignItems: 'center' },
                       { padding: '0' },
                   ],
                   makes: [
                       [
                           { bit: 'meta.icon', opt: {
                               mode: 'icon', width: '1.25rem', color: 'var(--color-primary)',
                               stys: { width: '2.5rem', height: '2.5rem', borderRadius: '50%',
                                       background: 'color-mix(in oklab, var(--color-primary) 15%, transparent)',
                                       display: 'flex', alignItems: 'center', justifyContent: 'center',
                                       flexShrink: '0' },
                           }},
                           { bit: 'title', opt: { mode: 'h4', stys: {
                               fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', fontWeight: '700', marginLeft: '0.5rem',
                           }}},
                       ],
                       [
                           { bitLocal: 'Learn More →', opt: { mode: 'span', stys: {
                               fontSize: 'clamp(0.7rem, 0.9vw, 0.8rem)', fontWeight: '600', cursor: 'pointer',
                               color: 'var(--color-base-content)',
                           }}},
                       ],
                   ],
                   bg:   { ...getStyleOpts({ rounded: '1.25rem', tint: '#fbbf24', total: 1, gradient: true, blobType: 'circleOverlap' }) },
                   stys: { padding: '1rem', borderRadius: '1.25rem',
                           border: '1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)' },
                   anime: 'fade-in',
                   animeQueue: '80ms',
               },
           ],
       ],

       bg:   { ...getStyleOpts({ rounded: '0', tint: '#fbbf24', total: 2, gradient: true, blobType: 'circleOverlap', deg: 0 }), blobMove: 'pulse' },
       stys: { padding: '3rem 0' },
   };

   export const config = { ...baseConfig };

----

Tài liệu liên quan
==================

+-------------------------------+----------------------------------------------+
| File                          | Nội dung                                     |
+===============================+==============================================+
| ``docs/DATAFLOW.rst``         | Luồng dữ liệu chi tiết từng bước            |
+-------------------------------+----------------------------------------------+
| ``docs/ARCHITECT.rst``        | Tổng quan kiến trúc + layer diagram          |
+-------------------------------+----------------------------------------------+
| ``docs/web-apex.rst``         | API reference tất cả component apex/        |
+-------------------------------+----------------------------------------------+
| ``guide/webboxs-overview``    | Full props, cell modes, slider config        |
+-------------------------------+----------------------------------------------+
| ``guide/webboxs-usage``       | 3 data sources, event handling               |
+-------------------------------+----------------------------------------------+
| ``guide/micro-service-overview``| Skeleton component, conductor API          |
+-------------------------------+----------------------------------------------+
