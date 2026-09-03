============
web-board
============

Hệ thống render phân cấp: **web-board → web-boxs → web-box → web-cell**.

- ``web-board`` nhận ``sections[]`` → fetch dữ liệu → render từng ``<web-boxs>``.
- ``web-boxs`` nhận ``data[] + config`` → chọn layout mode → render nhiều ``<web-box>``.
- ``web-box`` nhận 1 data item + ``makes[]`` → render nhiều ``<web-cell>``.
- ``web-cell`` nhận 1 group + ``makes[]`` → render component động (p, h2, icon, button…).

.. contents:: Mục lục
   :depth: 2
   :local:

----

web-board
=========

Container tổng thể của trang. Nhận mảng ``sections[]``, fetch dữ liệu từng section qua
``dataSrc`` + ``dataTable`` (REST) hoặc ``dataTable`` alone (Firestore)
(IndexedDB cache 5 phút, retry 3×), render ``<web-boxs>`` hoặc custom element cho mỗi section.
Layout drag-drop / resize cột được lưu vào IndexedDB theo pathname.

**Props**

================  ========================  =============================================
Prop              Type / values             Mô tả
================  ========================  =============================================
``sections``      Array (JSON string)       Mảng section config — xem schema bên dưới
``theme``         ``dark`` ``light``        Theme màu — tự sync sống theo ``data-theme`` của
                                             ``<html>`` qua ``MutationObserver`` (không cần
                                             set tay, chỉ dùng làm giá trị khởi tạo)
``variant``       Object                    ``{ theme, light: {...}, dark: {...} }`` (theo
                                             theme) hoặc object phẳng ``{ ui, mainColors,
                                             textColor(s) }`` (không phân biệt theme) — nguồn
                                             DUY NHẤT cho ``ui``/``mainColors``/``textColor``,
                                             tự resolve lại theo ``theme`` đang active mỗi khi
                                             ``data-theme`` đổi. Không còn prop ``ui``/
                                             ``mainColors``/``textColor`` rời ở cấp web-board.
``container``     String                    CSS class của wrapper ngoài cùng
``draggable``     Boolean                   Bật drag-drop sắp xếp lại section
``resizable``     Boolean                   Bật resize cột (1–12)
``responsive``    Boolean                   Container queries cho span cột (xem prop cùng tên của
                                             web-boxs) — áp lên chính lưới section của board và
                                             forward xuống mọi ``<web-boxs>`` con. Không set: span
                                             áp thẳng, chỉ 1 breakpoint viewport 1024px
``handles``       ``absolute`` (mặc định)   Cách đặt nhóm handle (drag/resize/config):
                  ``static``                ``absolute`` đè lên góc trên-phải item; ``static``
                                             nằm trong flow, luôn hiện, đẩy nội dung xuống
``unlock``        Boolean                   Hiện thanh control drag / resize
``owner``         Boolean                   Hiện ``wb-config-handle`` (⚙) + ``wb-remove-handle``
                                             (✕) trên mỗi section có ``configList?.length`` — gate
                                             owner tập trung ở đây, consumer không cần tự ẩn/hiện
                                             ``configList`` theo owner nữa (xem § Config + Remove)
================  ========================  =============================================

**Schema một phần tử trong ``sections[]``**

+---------------+------------------+------------------------------------------------------------------+
| Key           | Type             | Mô tả                                                            |
+===============+==================+==================================================================+
| ``id``        | String           | **Bắt buộc.** Định danh duy nhất, dùng làm cache key.           |
+---------------+------------------+------------------------------------------------------------------+
| ``dataSrc``   | String (URL)     | Base API URL — ``'https://host/api/'``. Kết hợp với ``dataTable`` → REST endpoint. |
+---------------+------------------+------------------------------------------------------------------------------------+
| ``dataTable`` | String           | Resource / collection — ``'products'``. REST khi có ``dataSrc``, Firestore nếu không. |
+---------------+------------------+------------------------------------------------------------------------------------+
| ``cache``     | Number (phút)    | TTL cache IndexedDB forward xuống ``conductor.all()``/``more()``. Không set → mặc |
|               |                  | định ``5``. ``0`` = tắt cache, luôn fetch mới mỗi lần load section.               |
+---------------+------------------+------------------------------------------------------------------------------------+
| ``filters``   | Object           | Firestore equality where-clause, vd ``{ status: 'active' }`` — chỉ áp dụng khi   |
|               |                  | section có ``loadLimit > 0`` (chế độ phân trang, xem ``_fetchPage`` trong          |
|               |                  | ``conductor.js``); không có tác dụng ở mode tải toàn bộ (``loadLimit: 0``).       |
+---------------+------------------+------------------------------------------------------------------------------------+
| ``data``      | Array            | Dữ liệu tĩnh inline (dùng khi không có ``dataSrc``/``dataTable``).                 |
+---------------+------------------+------------------------------------------------------------------+
| ``config``    | Object           | Config ``{dark:{…}, light:{…}}`` truyền vào ``<web-boxs>``.    |
+---------------+------------------+------------------------------------------------------------------+
| ``component`` | String           | Tên custom element thay thế ``web-boxs`` (vd: ``svc-editor``).  |
+---------------+------------------+------------------------------------------------------------------+
| ``col``       | Number (1–12)    | Số cột 12-col section chiếm (default: ``12``).                   |
+---------------+------------------+------------------------------------------------------------------+
| ``label``     | String           | Nhãn hiển thị trên thanh drag khi ``unlock`` bật.                |
+---------------+------------------+------------------------------------------------------------------+
| ``sort``      | Number           | Thứ tự sắp xếp mặc định — nhỏ hơn hiện trước.                   |
+---------------+------------------+------------------------------------------------------------------+
| ``bg``        | Object           | Config ``<svc-underlay>`` nền riêng cho section này.             |
+---------------+------------------+------------------------------------------------------------------+
| ``configKey`` | String           | Đánh dấu section thuộc "flow configurable" (kể cả rỗng) — thiếu  |
|               |                  | field này thì section render ``web-boxs`` bình thường, có field  |
|               |                  | này mà chưa có ``config`` thì render khung ``wb-empty`` thay vào.|
+---------------+------------------+------------------------------------------------------------------+
| ``configList``| Array            | ``[{ key, label, config }]`` — mẫu hiển thị khả dụng cho section |
|               |                  | này. Chỉ có tác dụng khi ``owner`` bật (xem § Config + Remove).  |
+---------------+------------------+------------------------------------------------------------------+

**Drag-drop & Resize**

Khi ``unlock`` bật, mỗi section hiện thanh control:

- **Handle kéo** — drag section sang vị trí khác trong trang. Thứ tự mới lưu vào IndexedDB
  theo pathname, restore tự động khi tải lại trang.
- **Nút resize** — thu/phóng số cột từ 1 đến 12. Giá trị cột lưu IndexedDB cùng với thứ tự.

Khi ``component`` được khai báo, ``web-board`` render custom element thay vì ``web-boxs``,
truyền toàn bộ data, config, ui, theme xuống dưới dạng props.

**Config + Remove (owner)**

Khi ``owner`` bật, mỗi section có ``configList?.length > 0`` hiện 2 handle cạnh nhau:

- **⚙ (``wb-config-handle``)** — bấm bắn event ``section-configure`` (``{ sectionId, index }``,
  bubbles+composed). ``web-board`` không tự render dialog chọn mẫu (tránh phụ thuộc domain
  component như ``svc-admin``) — consumer tự nghe event này và mở dialog riêng.
- **✕ (``wb-remove-handle``)** — bấm mở 1 ``<web-dialog persistent>`` xác nhận **ngay trong
  ``web-board``** (không cần consumer tự làm dialog xác nhận riêng). Chỉ khi bấm "Xác nhận"
  mới bắn event ``section-remove`` (``{ sectionId, index }``, bubbles+composed) lên consumer —
  consumer nghe event này để xóa section khỏi ``sections`` (``web-board`` không tự mutate mảng
  ``sections`` của mình, giống ``section-configure``/``block-reorder``/``block-resize``).

``owner=false`` (mặc định) → không hiện gì, không mount ``<web-dialog>`` — không ảnh hưởng các
nơi khác đang dùng ``web-board`` mà chưa cần tính năng này.

**Ví dụ cơ bản**

.. code-block:: html

   <web-board
     sections='[
       {"id":"hero","dataSrc":"https://host/api/","dataTable":"hero","config":{...},"col":12,"sort":0},
       {"id":"features","data":[...],"config":{...},"col":6,"sort":1},
       {"id":"editor","component":"svc-editor","col":4,"sort":2}
     ]'
     ui="modern"
     theme="dark"
     draggable
     resizable
     unlock>
   </web-board>

.. code-block:: js

   // Astro page — truyền sections từ module
   import { views } from '@/services/modules/landing/main.js';
   const view = views.find(v => v.href === '/landing/');
   // JSON.stringify(view.sections) → attr <web-board sections="...">

----

web-boxs
========

Grid card renderer trung tâm. Nhận ``data[]`` và ``config``, chọn layout mode phù hợp,
render danh sách ``<web-box>``.

**Props**

================  =============================================  =======================================================
Prop              Type / values                                  Mô tả
================  =============================================  =======================================================
``data``          Array                                          Mảng dữ liệu truyền trực tiếp
``dataSrc``       String (URL)                                   Base API URL — kết hợp với ``dataTable`` → REST endpoint
``dataTable``     String                                         Resource/collection — REST khi có ``dataSrc``, Firestore nếu không
``config``        Object ``{dark:{…}, light:{…}}``              Config layout + style theo theme — xem chi tiết bên dưới
``col``           Number / String                                Override số cột (ghi đè ``config.colBoxs``)
``list``          ``slider`` ``tabs`` ``steps`` ``expansion``   Ép render dạng list
``masonry``       Boolean                                        Layout masonry (waterfall)
``responsive``    Boolean                                        Không set: span cột áp thẳng theo config, chỉ 1
                                                                 breakpoint viewport 1024px (dưới đó full-width). Set:
                                                                 container queries — span co giãn theo bề rộng của
                                                                 chính ``.gi-wrap`` bao quanh (1→2→3→4→6→config
                                                                 item/hàng), grid lồng trong scale theo hộp riêng.
``animeQueue``    Boolean                                        IntersectionObserver — animate khi scroll vào viewport
``search``        Boolean                                        Hiện ``<web-boxs-search>`` bộ lọc tag + text
``showSearch``    Boolean                                        Hiện ô tìm kiếm văn bản
``filterState``   Object                                         Trạng thái filter bên ngoài (controlled)
``refresh``       Boolean / Number (ms)                          Tự reload dữ liệu sau N ms
``loader``        Boolean                                        Skeleton loader khi đang tải
``mainColors``    String (``|`` sep 5)                           Override màu hệ thống
``textColor``     String                                         Màu chữ
``ui``            ``modern`` ``spatial``                         Kiểu giao diện
``theme``         ``dark`` ``light``                             Quyết định dùng ``config.dark`` hay ``config.light``
================  =============================================  =======================================================

**Cấu trúc ``config`` object**

``config`` có 2 key ``dark`` / ``light``, mỗi key là một ``baseConfig``:

.. code-block:: js

   export const config = {
     dark:  { ...baseConfig, mainColors: '#2ebd85|#f5465c|#a855f7|#00c7d4|#fbbf24' },
     light: { ...baseConfig, mainColors: '#16a34a|#dc2626|#9333ea|#0891b2|#d97706' },
   };

**Các key trong ``baseConfig``**

+------------------+-------------------+-------------------------------------------------------------------+
| Key              | Type              | Mô tả                                                             |
+==================+===================+===================================================================+
| ``tiers``        | Array             | Chế độ tiers — mảng tier Object tĩnh hoặc Array động.            |
+------------------+-------------------+-------------------------------------------------------------------+
| ``tiersCol``     | String[]          | Số cột 12-col mỗi tier chiếm (song song nhau).                    |
+------------------+-------------------+-------------------------------------------------------------------+
| ``tiersRow``     | String[]          | Chiều cao hàng mỗi tier (``'auto'`` hoặc px/fr).                 |
+------------------+-------------------+-------------------------------------------------------------------+
| ``masonry``      | Object            | ``{ col: N, gap: 'Xrem' }`` — số cột và khoảng cách masonry.    |
+------------------+-------------------+-------------------------------------------------------------------+
| ``slider``       | Object            | Config KeenSlider — xem bên dưới.                                 |
+------------------+-------------------+-------------------------------------------------------------------+
| ``steps``        | Object            | Config stepper: ``{ size, pack, idField, labelField }``.         |
+------------------+-------------------+-------------------------------------------------------------------+
| ``tabs``         | Object            | Config tabs: ``{ align, size, pack, idField, labelField }``.     |
+------------------+-------------------+-------------------------------------------------------------------+
| ``expansion``    | Object            | Config accordion: ``{ size, pack, idField, labelField }``.       |
+------------------+-------------------+-------------------------------------------------------------------+
| ``groupCol``     | String[]          | Col-span từng group (web-cell) trong 1 item.                      |
+------------------+-------------------+-------------------------------------------------------------------+
| ``groupRow``     | String[]          | Row-span từng group.                                              |
+------------------+-------------------+-------------------------------------------------------------------+
| ``groupJustify`` | String[]          | ``left`` ``right`` ``center`` ``space-between`` ``none``.         |
+------------------+-------------------+-------------------------------------------------------------------+
| ``groupStyle``   | Object[]          | Style override từng group — xem quy tắc split ở ``web-box``.    |
+------------------+-------------------+-------------------------------------------------------------------+
| ``makes``        | Array[][]         | 2D array: ngoài = group, trong = items cell.                      |
+------------------+-------------------+-------------------------------------------------------------------+
| ``colBoxs``      | Number / String   | Số cột cho toàn bộ grid items (mặc định tự tính theo data).      |
+------------------+-------------------+-------------------------------------------------------------------+
| ``childs``       | Object            | Config lồng nhau — render ``<web-boxs>`` con bên trong section.  |
+------------------+-------------------+-------------------------------------------------------------------+
| ``bg``           | Object            | Config ``<svc-underlay>`` nền — từ ``getStyleOpts()``.           |
+------------------+-------------------+-------------------------------------------------------------------+
| ``stys``         | Object            | Inline style áp lên wrapper ngoài (padding, gap…).                |
+------------------+-------------------+-------------------------------------------------------------------+
| ``anime``        | String            | Class animation scroll-trigger cho từng card.                     |
+------------------+-------------------+-------------------------------------------------------------------+
| ``animeQueue``   | String (ms)       | Stagger delay giữa các card (vd: ``'80ms'``).                    |
+------------------+-------------------+-------------------------------------------------------------------+
| ``mainColors``   | String            | 5 màu ``primary|secondary|accent|info|warning``.                  |
+------------------+-------------------+-------------------------------------------------------------------+
| ``textColor``    | String            | Màu chữ override.                                                 |
+------------------+-------------------+-------------------------------------------------------------------+

**Thứ tự ưu tiên 7 render mode**

Hệ thống kiểm tra theo thứ tự sau — mode đầu tiên thỏa mãn được dùng:

+-------+---------------+--------------------------------------------------------------+
| Ưu tiên| Mode         | Điều kiện kích hoạt                                          |
+=======+===============+==============================================================+
| 1     | **tiers**     | ``config.tiers`` tồn tại                                    |
+-------+---------------+--------------------------------------------------------------+
| 2     | **masonry**   | ``config.masonry`` tồn tại hoặc prop ``masonry``            |
+-------+---------------+--------------------------------------------------------------+
| 3     | **slider**    | ``config.slider`` tồn tại hoặc prop ``list="slider"``       |
+-------+---------------+--------------------------------------------------------------+
| 4     | **steps**     | ``config.steps`` tồn tại hoặc prop ``list="steps"``         |
+-------+---------------+--------------------------------------------------------------+
| 5     | **tabs**      | ``config.tabs`` tồn tại hoặc prop ``list="tabs"``           |
+-------+---------------+--------------------------------------------------------------+
| 6     | **expansion** | ``config.expansion`` tồn tại hoặc prop ``list="expansion"`` |
+-------+---------------+--------------------------------------------------------------+
| 7     | **grid**      | Mặc định — không thỏa mãn bất kỳ điều kiện nào ở trên      |
+-------+---------------+--------------------------------------------------------------+

**Tiers mode — chi tiết**

``tiers`` là một mảng, mỗi phần tử là:

- **Object** ``{ groupCol, makes, … }`` → **Tier tĩnh** — render một lần với ``makes`` cố định.
  Dùng cho: heading, hero image, badge CTA.
- **Array** ``[{ groupCol, makes, … }]`` → **Tier động** — render cho từng item trong ``data[]``.
  Dùng cho: feature cards, product list, testimonials.

``tiersCol[i]`` xác định số cột 12-col tier ``i`` chiếm theo chiều ngang.
Ví dụ ``tiersCol: ['6', '6']`` → 2 tier đứng cạnh nhau, mỗi tier 6 cột (split 50/50).

Mỗi tier Object / Array element có thể chứa đầy đủ sub-key:
``groupCol``, ``groupRow``, ``groupJustify``, ``groupStyle``, ``makes``,
``anime``, ``animeQueue``, ``masonry``, ``bg``, ``stys``.

**Slider config**

.. code-block:: js

   slider: {
     autoplay: 3000,   // ms tự động chạy — 0 = tắt
     loop:     true,   // lặp vòng
     dots:     true,   // dot indicator
     nav:      true,   // nút prev / next
     slides:   1,      // số slide hiện đồng thời
     spacing:  16,     // gap giữa slide (px)
     fade:     false,  // fade thay vì slide
     origin:   'auto', // 'auto' | 'center'
   }

**Tabs / Steps / Expansion config**

Các key chung cho ``tabs``, ``steps``, ``expansion``:

+------------------+---------------------------+------------------------------------------------------------------+
| Key              | Type                      | Mô tả                                                            |
+==================+===========================+==================================================================+
| ``size``         | ``sm`` ``md`` ``lg`` ``xl``| Kích thước nav header (mặc định ``md``).                        |
+------------------+---------------------------+------------------------------------------------------------------+
| ``active``       | String                    | id tab / step / panel mặc định được chọn.                        |
+------------------+---------------------------+------------------------------------------------------------------+
| ``idField``      | String                    | Tên field trong data item dùng làm id nav. Mặc định ``item-{i}``.|
+------------------+---------------------------+------------------------------------------------------------------+
| ``labelField``   | String                    | Tên field trong data item dùng làm label. Mặc định ``Item {i}``.|
+------------------+---------------------------+------------------------------------------------------------------+
| ``iconField``    | String                    | Tên field trong data item dùng làm icon.                         |
+------------------+---------------------------+------------------------------------------------------------------+
| ``pack``         | Number                    | Số items gom vào một panel. Col tự tính ``12 / pack``.           |
+------------------+---------------------------+------------------------------------------------------------------+
| ``align``        | ``left`` ``center`` ``right``| Căn tab header (chỉ dùng cho ``tabs``).                       |
+------------------+---------------------------+------------------------------------------------------------------+
| ``multiple``     | Boolean                   | Mở nhiều panel cùng lúc (chỉ dùng cho ``expansion``).           |
+------------------+---------------------------+------------------------------------------------------------------+
| ``openFirst``    | Boolean                   | Tự mở panel đầu tiên (chỉ dùng cho ``expansion``).              |
+------------------+---------------------------+------------------------------------------------------------------+

**Pack mode — nhiều cards trong một panel**

``pack: N`` gom dữ liệu thành từng nhóm N items, mỗi nhóm = một panel:

- Nav header (tab / step / panel title) lấy từ **item đầu nhóm** qua ``idField`` / ``labelField``.
- Bên trong mỗi panel, N items render thành ``gi-wrap`` mini-grid với ``col = 12 / N``.
- ``pack: 2`` → col-6 (2 cards/row), ``pack: 3`` → col-4 (3 cards/row), ``pack: 4`` → col-3.
- Items phải được sắp xếp liên tiếp theo nhóm trong ``data[]``.

.. code-block:: js

   // Ví dụ: tabs Monthly / Annual mỗi tab chứa 3 plan cards
   // data = [Free_monthly, Pro_monthly, Team_monthly, Free_annual, Pro_annual, Team_annual]
   tabs: {
     pack:       3,           // 3 items / panel → col-4 mỗi card
     idField:    'tab',       // data[i].tab = 'monthly' | 'annual'
     labelField: 'tabLabel',  // data[i].tabLabel = 'Monthly' | 'Annual −25%'
     active:     'annual',    // tab mặc định
     size:       'md',
   }

**Animation — animeQueue**

Khi ``animeQueue=true``, mỗi ``<web-box>`` được bọc bởi ``IntersectionObserver``.
Khi element scroll vào viewport, class ``anime`` trong config được add vào với delay stagger
``animeQueue`` (ms) × index thứ tự card. Ví dụ ``animeQueue: '80ms'``, card thứ 3 = delay 240ms.

**Filter system**

Khi ``search=true``, web-boxs render ``<web-boxs-search>`` phía trên.
Người dùng chọn tag hoặc gõ text → ``_applyFilter()`` lọc ``data[]``:

- **Tags** — item có field ``tags`` chứa tag đang active.
- **Query** — tìm kiếm full-text trên tất cả string fields của item.

**Ví dụ — Tiers layout (trích từ file config)**

.. code-block:: js

   // src/sections/hero/spatial/horiFeature.js
   const baseConfig = {
     tiersCol: ['6', '6', '12'],
     tiersRow: ['auto', 'auto', 'auto'],

     tiers: [
       // Tier 0: tĩnh — badge + heading + description
       {
         groupCol: [12],
         groupStyle: [{ flexDirection: 'column', gap: '1.25rem' }],
         makes: [[
           { bitLocal: 'Workflow Integration',
             opt: { mode: 'badge', type: 'fill', color: 'primary' } },
           { bitLocal: 'Why you\nShould choose Sasup',
             opt: { mode: 'h2', motion: true, word: true, effect: 'focusIn',
                    stys: { fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: '700' } } },
           { bitLocal: 'So how does it work?',
             opt: { mode: 'p', stys: { fontSize: 'clamp(0.875rem, 1.2vw, 1rem)' } } },
         ]],
       },

       // Tier 1: tĩnh — hero image
       {
         groupCol: [12],
         makes: [[
           { bitLocal: '/images/hero.png',
             opt: { mode: 'gallery', stys: { width: '100%', maxHeight: '400px', objectFit: 'contain' } } },
         ]],
         anime: 'tilt-in-tl',
       },

       // Tier 2: động — feature cards per data item
       [
         {
           masonry: { col: 4, gap: '1rem' },
           groupCol: ['12', '12'],
           groupStyle: [
             { alignItems: 'center' },
             { padding: '0' },
           ],
           makes: [
             [
               { bit: 'meta.icon', opt: { mode: 'icon', width: '1.25rem',
                   color: 'var(--color-primary)',
                   stys: { width: '2.5rem', height: '2.5rem', borderRadius: '50%',
                           background: 'color-mix(in oklab, var(--color-primary) 15%, transparent)',
                           display: 'flex', alignItems: 'center', justifyContent: 'center' } } },
               { bit: 'title', opt: { mode: 'h4',
                   stys: { fontSize: 'clamp(0.875rem, 1.2vw, 1rem)', fontWeight: '700' } } },
             ],
             [
               { bitLocal: 'Learn More →', opt: { mode: 'span' } },
             ],
           ],
           stys: { padding: '1rem', borderRadius: '1.25rem',
                   border: '1px solid color-mix(in oklab, var(--color-base-content) 10%, transparent)' },
           anime: 'fade-in',
           animeQueue: '80ms',
         },
       ],
     ],

     bg: {
       ...getStyleOpts({ tint: '#fbbf24', total: 2, blobType: 'circleOverlap', deg: 90 }),
     },
     stys: { padding: '3rem 0' },
   };

   export const config = {
     dark:  { ...baseConfig, mainColors: '#2ebd85|#f5465c|#a855f7|#00c7d4|#fbbf24' },
     light: { ...baseConfig, mainColors: '#2ebd85|#f5465c|#a855f7|#00c7d4|#fbbf24' },
   };

----

web-box
=======

Container trung gian nhận 1 data item và ``makes`` config, render lưới ``<web-cell>`` theo nhóm.

**Props**

================  ========================  =====================================================
Prop              Type / values             Mô tả
================  ========================  =====================================================
``data``          Object / Array            Data item (1 object hoặc mảng)
``dataSrc``       String (URL)              Base API URL — kết hợp với ``dataTable`` → REST
``dataTable``     String                    Resource/collection name
``makes``         Array[][] (JSON)          2D array groups × items — config render cell
``groupCol``      String[]                  Col-span từng group trong 12-col grid
``groupRow``      String[]                  Row-span từng group
``groupJustify``  String[]                  justify-content từng group
``groupStyle``    Object[]                  Style object từng group — xem quy tắc split bên dưới
``mainColors``    String (``|`` sep 5)      Override 5 màu hệ thống
``textColor``     String                    Màu chữ
``ui``            ``modern`` ``spatial``    Kiểu giao diện
``theme``         String                    Theme override
``refresh``       Boolean / Number (ms)     Tự reload data sau N ms
``loader``        Boolean                   Skeleton loader khi đang tải
``anime``         String                    Class animation áp lên host element
================  ========================  =====================================================

**``groupJustify`` — các giá trị**

====================  =========================================================
Giá trị               Mô tả
====================  =========================================================
``left``              flex-start — nội dung bắt đầu từ trái
``right``             flex-end — nội dung kéo sang phải
``center``            căn giữa
``space-between``     trải đều, khoảng cách đều nhau
``space-around``      khoảng cách đều kể cả hai đầu (nhỏ hơn giữa)
``space-evenly``      khoảng cách đều kể cả hai đầu (bằng nhau)
``none``              không áp justify — nội dung theo flow tự nhiên
====================  =========================================================

**``makes`` — cấu trúc 2D**

``makes`` là mảng 2 chiều: phần tử ngoài = **group** (render thành 1 ``<web-cell>``),
phần tử trong = **item** (element con trong cell đó).

.. code-block:: js

   makes: [
     // Group 0 — web-cell thứ nhất
     [
       { bit: 'title',    opt: { mode: 'h3' } },
       { bit: 'subtitle', opt: { mode: 'p'  } },
     ],
     // Group 1 — web-cell thứ hai
     [
       { bitLocal: '150.000 ₫',
         opt: { mode: 'span', stys: { color: 'var(--color-primary)', fontWeight: '700' } } },
       { bitLocal: 'Mua ngay',
         opt: { mode: 'button', type: 'fill', color: 'primary' } },
     ],
   ]

**``groupStyle`` — quy tắc split host / inner**

``groupStyle[i]`` được chia làm 2 phần khi áp vào ``<web-cell>``:

- **→ host** ``<web-cell>`` element: ``position``, ``top``, ``right``, ``bottom``, ``left``,
  ``gridColumn``, ``gridRow``, ``zIndex``.
- **→ inner** ``div.jf`` bên trong: tất cả key còn lại
  (``padding``, ``gap``, ``flexDirection``, ``alignItems``, ``overflow``…).

.. code-block:: js

   groupStyle: [
     {
       flexDirection: 'column',  // → inner div.jf
       gap: '0.75rem',           // → inner div.jf
       padding: '1.5rem',        // → inner div.jf
       gridColumn: 'span 2',     // → host <web-cell>
       position: 'relative',     // → host <web-cell>
       zIndex: '1',              // → host <web-cell>
     }
   ]

**Ví dụ cơ bản**

.. code-block:: html

   <web-box
     data='{"name":"Sản phẩm A","price":150000,"img":"/a.jpg"}'
     makes='[
       [{"bit":"img","opt":{"mode":"gallery","stys":{"width":"100%","height":"200px","objectFit":"cover"}}}],
       [{"bit":"name","opt":{"mode":"h3"}},{"bit":"price","opt":{"mode":"span"}}]
     ]'
     group-col='["12","12"]'
     group-justify='["none","left"]'>
   </web-box>

----

web-cell
========

Renderer đa năng cho một nhóm cell. Nhận ``makes[]`` và ``info`` data, dispatch từng item
đến component tương ứng theo ``opt.mode``. Sử dụng Shadow DOM.

**Props**

================  ========================  ====================================================
Prop              Type / values             Mô tả
================  ========================  ====================================================
``info``          Object                    Data object của item — source cho ``bit`` dot-path
``makes``         Array (JSON)              Mảng item config — xem schema bên dưới
``justify``       String                    justify-content của container
``stys``          String / Object           Inline style áp vào container
``loading``       Boolean                   Hiện skeleton loader thay nội dung
``mainColors``    String (``|`` sep 5)      Override 5 màu hệ thống
``textColor``     String                    Màu chữ
``ui``            ``modern`` ``spatial``    Kiểu giao diện
``theme``         String                    Theme override
================  ========================  ====================================================

**Schema một item trong ``makes[]``**

+-------------+------------------+-------------------------------------------------------------------------+
| Key         | Type             | Mô tả                                                                   |
+=============+==================+=========================================================================+
| ``bit``     | String           | Dot-path đến field trong ``info``. VD: ``'author.name'``, ``'meta.icon'``|
+-------------+------------------+-------------------------------------------------------------------------+
| ``bitLocal``| String           | Giá trị tĩnh — bỏ qua ``info``, dùng string này trực tiếp.             |
+-------------+------------------+-------------------------------------------------------------------------+
| ``opt``     | Object           | Config render — ``mode`` bắt buộc, các key còn lại theo mode.          |
+-------------+------------------+-------------------------------------------------------------------------+
| ``ext``     | Object           | Data phụ: ``org`` (href/link), ``tip`` (tooltip), ``cap`` (caption).   |
+-------------+------------------+-------------------------------------------------------------------------+

``bitLocal`` luôn ưu tiên hơn ``bit``. Dấu ``\n`` trong ``bitLocal`` tạo ngắt dòng
(ví dụ: heading 2 dòng ``'Line one\nLine two'``).

**``opt`` — key chung cho mọi mode**

+----------+----------+-------------------------------------------------------+
| Key      | Type     | Mô tả                                                 |
+==========+==========+=======================================================+
| ``mode`` | String   | **Bắt buộc.** Loại component render — bảng bên dưới. |
+----------+----------+-------------------------------------------------------+
| ``stys`` | Object   | Inline style áp lên component — override toàn bộ.    |
+----------+----------+-------------------------------------------------------+

**Bảng ``mode`` — tất cả giá trị**

+---------------------+-----------------------------------------------------------------------+
| ``mode``            | Mô tả                                                                 |
+=====================+=======================================================================+
| ``p``               | Đoạn văn ``<p>``. Hỗ trợ prefix/suffix icon.                         |
+---------------------+-----------------------------------------------------------------------+
| ``span``            | Inline text ``<span>``. Không margin, nhẹ hơn ``p``.                 |
+---------------------+-----------------------------------------------------------------------+
| ``h1`` … ``h6``     | Heading. Hỗ trợ animation chữ qua ``web-letters`` khi ``motion=true``.|
+---------------------+-----------------------------------------------------------------------+
| ``a``               | Liên kết ``<a>``. ``ext.org`` làm ``href``, ``ext.tip`` làm title.   |
+---------------------+-----------------------------------------------------------------------+
| ``gallery``         | Ảnh đơn hoặc nhiều ảnh (pipe ``|`` sep). Popup slider toàn màn hình. |
+---------------------+-----------------------------------------------------------------------+
| ``icon``            | Icon Iconify. Tên icon qua ``bit``/``bitLocal``, size + color qua opt.|
+---------------------+-----------------------------------------------------------------------+
| ``button``          | Nút ``<web-button>``. Dispatch ``cell-action`` khi click.             |
+---------------------+-----------------------------------------------------------------------+
| ``badge``           | Badge nhãn nhỏ ``<web-button mode="badge">``.                         |
+---------------------+-----------------------------------------------------------------------+
| ``tags``            | Danh sách tag chip từ string pipe-separated.                          |
+---------------------+-----------------------------------------------------------------------+
| ``rating``          | Đánh giá sao ``<web-rating>``.                                        |
+---------------------+-----------------------------------------------------------------------+
| ``dropdown``        | Menu dropdown ``<web-dropdown>``.                                     |
+---------------------+-----------------------------------------------------------------------+
| ``popover``         | Floating popover ``<web-popover>``.                                   |
+---------------------+-----------------------------------------------------------------------+
| ``photor-upload``   | Upload ảnh inline ``<web-photor-upload>``.                            |
+---------------------+-----------------------------------------------------------------------+
| ``letters``         | Animation chữ ``<web-letter>`` raw — không wrap heading.             |
+---------------------+-----------------------------------------------------------------------+

**``opt`` keys theo từng ``mode``**

*Heading* ``h1``–``h6`` *(animation qua web-letters):*

+------------+--------------------------------------------------+-------------------------------+
| Key        | Type / values                                    | Mô tả                         |
+============+==================================================+===============================+
| ``motion`` | Boolean                                          | Bật animation chữ             |
+------------+--------------------------------------------------+-------------------------------+
| ``word``   | Boolean                                          | Animate theo từ (thay char)   |
+------------+--------------------------------------------------+-------------------------------+
| ``effect`` | ``zoomIn`` ``zoomOut`` ``fadeIn`` ``blurIn``     | Kiểu hiệu ứng animation chữ  |
|            | ``typeIn`` ``slideUp`` ``slideDown`` ``floatIn`` |                               |
|            | ``riseUp`` ``fallDown`` ``driftIn`` ``spinIn``   |                               |
|            | ``flipIn`` ``flipX`` ``swingIn`` ``waveIn``      |                               |
|            | ``pulseIn`` ``focusIn`` ``pinIn``                |                               |
|            | ``glitchIn`` ``scatterIn``                       |                               |
+------------+--------------------------------------------------+-------------------------------+
| ``stys``   | Object                                           | Style trên heading element    |
+------------+--------------------------------------------------+-------------------------------+

*Icon* ``icon``:

==========  ===================  ======================================================
Key         Type / values        Mô tả
==========  ===================  ======================================================
``size``    String (CSS value)   Kích thước icon (``'1.25rem'``, ``'2rem'``…)
``color``   String (CSS color)   Màu icon — dùng CSS variable
``stys``    Object               Style trên wrapper bao ngoài icon
==========  ===================  ======================================================

*Button* ``button``:

===========  ==============================================  ============================
Key          Type / values                                   Mô tả
===========  ==============================================  ============================
``type``     ``fill`` ``outline`` ``ghost`` ``dash`` ``soft``  Kiểu nút
``color``    CSS variable token (``primary`` ``error``…)    Màu nút
``rounded``  Boolean                                         Bo tròn hoàn toàn
``stys``     Object
===========  ==============================================  ============================

*Badge* ``badge``:

=========  ================================  =============================
Key        Type / values                     Mô tả
=========  ================================  =============================
``type``   ``fill`` ``outline`` ``soft``     Kiểu badge
``color``  CSS variable token                Màu badge
``stys``   Object
=========  ================================  =============================

*Gallery / Image* ``gallery``:

Giá trị URL từ ``bit``/``bitLocal`` — nhiều ảnh dùng pipe ``|`` phân cách.

===============================  ==============================================
``stys`` key                     Mô tả
===============================  ==============================================
``width``                        Chiều rộng ảnh
``height`` / ``maxHeight``       Chiều cao / chiều cao tối đa
``objectFit``                    ``cover`` ``contain`` ``fill``
``borderRadius``                 Bo góc ảnh
``display``                      Display của ảnh (``block`` ``flex``…)
===============================  ==============================================

*Rating* ``rating``:

=========  ==========================  ================================
Key        Type / values               Mô tả
=========  ==========================  ================================
``max``    Number                      Số sao tối đa (default 5)
``half``   Boolean                     Cho phép nửa sao
``color``  CSS color token             Màu sao
``mask``   ApexUI mask class          Hình icon (``mask-star-2``…)
``size``   ``xs`` ``sm`` ``md`` ``lg`` Kích thước
=========  ==========================  ================================

**Dot-path data access**

``bit`` hỗ trợ nested field qua dấu ``.``:

.. code-block:: js

   // info object
   const info = {
     author:  { name: 'Dung', avatar: '/img.jpg' },
     meta:    { icon: 'ri:star-fill', score: 4.5 },
     tags:    'design|frontend|web',
   };

   { bit: 'author.name',   opt: { mode: 'span'    } }  // → 'Dung'
   { bit: 'author.avatar', opt: { mode: 'gallery' } }  // → '/img.jpg'
   { bit: 'meta.icon',     opt: { mode: 'icon'    } }  // → 'ri:star-fill'
   { bit: 'meta.score',    opt: { mode: 'rating'  } }  // → 4.5
   { bit: 'tags',          opt: { mode: 'tags'    } }  // → chip list từ 'design|frontend|web'

**``cell-action`` event**

Khi người dùng click phần tử tương tác (button, badge, dropdown, link, rating…),
``<web-cell>`` dispatch event lên ``document``:

.. code-block:: js

   // Event detail
   { action: 'clicked', value: '<nội dung hoặc value item>' }

   // Lắng nghe trong service.js hoặc svc-*.js
   document.addEventListener('cell-action', ({ detail }) => {
     const { action, value } = detail;
     if (action === 'clicked') { /* xử lý */ }
   });

   // Dispatch thủ công từ bên ngoài nếu cần
   document.dispatchEvent(new CustomEvent('cell-action', {
     bubbles: true, composed: true,
     detail: { action: 'add-to-cart', value: itemId },
   }));

**Ví dụ cơ bản — product card**

.. code-block:: html

   <web-cell
     info='{
       "title": "Sản phẩm A",
       "img":   "/a.jpg",
       "price": "150000",
       "meta":  { "icon": "ri:box-3-line" },
       "tags":  "sale|new"
     }'
     makes='[
       {"bit":"img",
        "opt":{"mode":"gallery","stys":{"width":"100%","height":"200px","objectFit":"cover","borderRadius":"0.75rem"}}},
       {"bit":"meta.icon",
        "opt":{"mode":"icon","size":"1.25rem","color":"var(--color-primary)",
               "stys":{"width":"2.5rem","height":"2.5rem","borderRadius":"50%",
                       "background":"color-mix(in oklab,var(--color-primary) 15%,transparent)",
                       "display":"flex","alignItems":"center","justifyContent":"center"}}},
       {"bit":"title",
        "opt":{"mode":"h3","motion":true,"effect":"fadeIn",
               "stys":{"fontSize":"clamp(1.75rem,3vw,2.5rem)","fontWeight":"700"}}},
       {"bit":"tags",
        "opt":{"mode":"tags","color":"primary"}},
       {"bitLocal":"Mua ngay",
        "opt":{"mode":"button","type":"fill","color":"primary"}}
     ]'
     theme="dark">
   </web-cell>

----

.. note::

   **Quy tắc màu bắt buộc** trong toàn bộ ``makes``, ``stys``, ``groupStyle``:
   chỉ dùng CSS variable hệ thống — ``var(--color-primary)``, ``var(--color-secondary)``,
   ``var(--color-accent)``, ``var(--color-base-100/200/300)``, ``var(--color-base-content)``.
   Không hardcode hex / rgb.

   Tất cả event đều dispatch với ``bubbles: true, composed: true`` để vượt Shadow DOM boundary.
