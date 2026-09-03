========
SECTIONS
========

Catalog tất cả section configs sẵn có trong ``src/sections/``.
Dùng file này để chọn nhanh layout phù hợp trước khi bắt tay viết ``baseConfig``.

Đọc kèm ``docs/DESIGN.rst`` (cú pháp chi tiết) và ``src/sections/index.js`` (import catalog).

.. contents:: Mục lục
   :depth: 2
   :local:

----

Ký hiệu dùng trong file này
=============================

- **col** → ``tiersCol`` — danh sách độ rộng cột (12-grid), ngăn cách bởi ``·``
- **rows** → ``tiersRow`` — row-span của từng tier (bỏ qua khi tất cả đều ``'auto'``)
- **T0 / T1 / T2 …** → tier theo thứ tự khai báo trong ``tiers[]``
- **pinned** → tier đó span ≥2 rows, neo cố định bên cạnh các tier còn lại
- **render-mode** → ``slider`` / ``masonry`` / ``steps`` / ``tabs`` / ``expansion`` (mặc định là grid)
- **apex** → dùng ``web-boxs`` apex components thay vì viết tay ``makes``
- **no-tiers** → config dùng ``groupCol`` / ``groupRow`` trực tiếp (shop cards)

Sơ đồ ký hiệu cột::

   ┌──────────────┬──────────────┐
   │ T0  col-7    │ T1  col-5    │  row 0  (T1 span-2)
   │  intro       │  image       │
   ├──────────────┤              │
   │ T2  col-7    │              │  row 1
   │  CTA         │              │
   └──────────────┴──────────────┘
   tiersCol ['7','5','7']  rows ['auto','2','auto']

----

HERO
====

heroModernHoriBase — ``hero/modernHoriBase.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['7','5','7']``  rows ``['auto','2','auto']``  image-pinned-right

::

   ┌──────────────────────┬────────────────┐
   │ T0  col-7  auto      │ T1  col-5      │  row 0
   │  badge · h1 · desc   │  image         │
   ├──────────────────────┤  span-2rows    │
   │ T2  col-7  auto      │                │  row 1
   │  CTA buttons         │                │
   └──────────────────────┴────────────────┘

- T0: static — badge (p uppercase) + h1 (motion focusIn) + description + ``data=[]``
- T1: static — image (gallery mode, objectFit contain)
- T2: static — primary button + outline button


heroSpatialHoriNeat — ``hero/spatialHoriNeat.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['6','6','6']``  rows ``['2','auto','auto']``  image-pinned-left

::

   ┌────────────────┬──────────────────────┐
   │ T0  col-6      │ T1  col-6  auto      │  row 0
   │  image         │  badge · h1 · desc   │
   │  span-2rows    ├──────────────────────┤
   │                │ T2  col-6  auto      │  row 1
   │                │  CTA buttons         │
   └────────────────┴──────────────────────┘

- T0: static — image, ``anime: 'tilt-in-tr'``
- T1: static — badge + h1 + description
- T2: static — fill button + outline button


heroSpatialHoriFeature — ``hero/spatialHoriFeature.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['6','6','12']``  rows ``['auto','auto','auto']``

::

   ┌──────────────────┬────────────────────┐
   │ T0  col-6  auto  │ T1  col-6  auto    │  row 0
   │  intro block     │  hero image        │
   ├──────────────────┴────────────────────┤
   │ T2  col-12  auto                      │  row 1
   │  feature list (icon cards)            │
   └───────────────────────────────────────┘

- T0: static — badge + h1 + description + CTA
- T1: static — image
- T2: array — feature icon cards (data-driven)


heroSpatialHoriGallery — ``hero/spatialHoriGallery.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['6','6','6','6']``  rows ``['3','auto','auto','auto']``  gallery-pinned-left

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

- T0: static — gallery image (multi-image or single)
- T1: static — badge + h2
- T2: static/array — checklist items
- T3: static — fill + outline buttons


heroSpatialNeatCenterApex — ``hero/spatialNeatCenterApex.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['12']``  rows ``['auto']``  single-tier  apex

::

   ┌─────────────────────────────────────────┐
   │ T0  col-12  auto  (centered)            │
   │  badge · h1 · desc · avatar-row · CTA  │
   └─────────────────────────────────────────┘

- T0: apex component — centered hero, avatar strip bên dưới heading


heroSpatialSplitGalleryApex — ``hero/spatialSplitGalleryApex.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['7','5','7','7']``  rows ``['auto','3','auto','auto']``  gallery-pinned  apex

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

----

FEATURES
========

featuresModernCardIntro — ``features/modernCardIntro.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['7','5','7']``  rows ``['auto','2','auto']``  image-pinned-right + card-grid

::

   ┌──────────────────────┬────────────────┐
   │ T0  col-7  auto      │ T1  col-5      │  row 0
   │  badge · h2 · desc   │  image         │
   ├──────────────────────┤  span-2rows    │
   │ T2  col-7  auto      │                │  row 1
   │  4× col-3 icon cards │                │
   └──────────────────────┴────────────────┘

- T2: array — 4 cards each col-3, icon circle + title + "Learn More"
- Dùng ``masonry: { col: 4 }`` hoặc để tự wrap


featuresModernHoriIntro — ``features/modernHoriIntro.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['5','7','5']``  rows ``['auto','2','auto']``  feature-list-pinned-right

::

   ┌──────────────┬─────────────────────────┐
   │ T0  col-5    │ T1  col-7               │  row 0
   │  intro       │  feature list           │
   ├──────────────┤  span-2rows             │
   │ T2  col-5    │                         │  row 1
   │  extra CTA   │                         │
   └──────────────┴─────────────────────────┘


featuresSpatialHoriIntro — ``features/spatialHoriIntro.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['7','5','5']``  rows ``['2','auto','auto']``  image-pinned-left

::

   ┌─────────────────────────┬──────────────┐
   │ T0  col-7               │ T1  col-5    │  row 0
   │  image / product mockup │  feature row │
   │  span-2rows             ├──────────────┤
   │                         │ T2  col-5    │  row 1
   │                         │  feature row │
   └─────────────────────────┴──────────────┘

- Mỗi feature row: icon (color per item) + title + description
- ``featuresSpatialHoriIntroApex`` — cùng layout, dùng apex components


featuresSpatialCardWebApex — ``features/spatialCardWebApex.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['12','12']``  rows ``['auto','auto']``  grid 3/row

::

   ┌─────────────────────────────────────────┐
   │ T0  col-12  (badge · h2 · description)  │
   ├─────────────────────────────────────────┤
   │ T1  col-12  9 cards — cards:{col:4}     │
   │  icon + title + description each        │
   └─────────────────────────────────────────┘

- T0: static — badge pill + h2 (motion floatIn) + description, centered
- T1: array — 9 component cards (``cards: { col: 4 }`` → 3 per row), icon + h4 title + p description

----

BENEFITS
========

benefitsModernCardList — ``benefits/modernCardList.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['12','12']``  grid

::

   ┌─────────────────────────────────────────┐
   │ T0  col-12  (heading)                   │
   ├─────────────────────────────────────────┤
   │ T1  col-12  (checklist rows)            │
   │  ✓ item · ✓ item · ✓ item …            │
   └─────────────────────────────────────────┘


benefitsModernCardCompare — ``benefits/modernCardCompare.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['12','5','2','5']``  rows ``['auto','auto','auto','auto']``  grid

::

   ┌─────────────────────────────────────────┐
   │ T0  col-12  (badge · h2 italic · desc)  │
   ├──────────────────┬────────┬─────────────┤
   │ T1  col-5        │T2 col-2│ T3  col-5   │
   │  "Apex" — 6      │  "VS"  │ "Other      │
   │  included checks │ circle │ Frameworks" │
   │                  │ badge  │ 6 not-incl. │
   └──────────────────┴────────┴─────────────┘

- T0: static — badge + h2 (motion scatterIn, italic) + description, centered
- T1: static — brand label + "FEATURES INCLUDED" + 6 checklist rows (✓ icon)
- T2: static — "VS" circular badge, centered
- T3: static — competitor label + "FEATURES NOT INCLUDED" + 6 checklist rows (✕ icon)


benefitsModernPicBenefits — ``benefits/modernPicBenefits.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['5','7','5']``  rows ``['auto','2','auto']``  image-pinned-right

::

   ┌──────────────┬─────────────────────────┐
   │ T0  col-5    │ T1  col-7               │  row 0
   │  checklist   │  image                  │
   ├──────────────┤  span-2rows             │
   │ T2  col-5    │                         │  row 1
   │  CTA / link  │                         │
   └──────────────┴─────────────────────────┘

----

BLOG
====

blogModernSlideIntro / blogSpatialSlideNeat
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['12','12']``  slider(3/view loop)

::

   ┌─────────────────────────────────────────┐
   │ T0  col-12  (intro heading)             │
   ├─────────────────────────────────────────┤
   │ T1  col-12  slider                      │
   │  [card][card][card]  ← 3 visible        │
   └─────────────────────────────────────────┘

- Card: image + tag + title + date + author
- ``spatial`` variant: glass cards, ``modern``: minimal cards

----

CONTACT
=======

contactModernHoriMap / contactSpatialHoriMap
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['5','7','5']``  rows ``['auto','2','auto']``  map-pinned-right

::

   ┌──────────────┬─────────────────────────┐
   │ T0  col-5    │ T1  col-7               │  row 0
   │  address     │  map embed / link       │
   │  icon links  │  span-2rows             │
   ├──────────────┤                         │
   │ T2  col-5    │                         │  row 1
   │  social/CTA  │                         │
   └──────────────┴─────────────────────────┘

- ``spatial`` variant: glass treatment, backdrop-filter blur

contactModernHoriGoogleMap / contactSpatialHoriGoogleMap
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['12','12']`` (cả 2 variant)  rows ``['auto','auto']``  real map, no icons tier, stacked

::

   ┌─────────────────────────────────────────┐
   │ T0/T1  col-12  intro (subtitle/title/    │
   │                desc, bit: title/...)     │
   ├─────────────────────────────────────────┤
   │ T1/T0  col-12  web-google-map thật       │
   │                (bit: meta.address)       │
   └─────────────────────────────────────────┘

- Đơn giản hơn ``contactModernHoriMap``/``contactSpatialHoriMap`` — KHÔNG có tier contact-info
  (icon email/phone/address); map là ``<web-google-map>`` thật (xem ``docs/web-apex.rst``),
  không còn placeholder ảnh tĩnh. ``bit: meta.address`` — 1 field DUY NHẤT vừa cho địa chỉ
  hiển thị vừa cho toạ độ map (xem docs/web-apex.rst § web-google-map).
- ``modern``: intro (T0) → map (T1). ``spatial``: map (T0) → intro (T1) — đảo thứ tự.
- Trong channel room: seed lúc tạo section tự lấy ``meta.address``/``meta.lat``/``meta.lng``
  từ ``room.location`` nếu có (xem ``docs/CHANNEL.rst`` § Section — multi-section).

----

CTA
===

ctaModernNeat / ctaSpatialNeat
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['12','12']``  grid

::

   ┌─────────────────────────────────────────┐
   │ T0  col-12  (bg image tier)             │
   ├─────────────────────────────────────────┤
   │ T1  col-12  (centered content)          │
   │  h2  ·  description  ·  [CTA] [Outline]│
   └─────────────────────────────────────────┘

- ``neatApex``: cùng layout nhưng dùng apex components


----

FAQ
===

faqModernExpansionQuestion — ``faq/modernExpansionQuestion.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['5','7']``  expansion(openFirst:false)

::

   ┌──────────────┬─────────────────────────┐
   │ T0  col-5    │ T1  col-7               │
   │  badge       │  expansion accordion    │
   │  h2          │  Q/A items từ data[]    │
   │  description │  (web-expansion)        │
   └──────────────┴─────────────────────────┘

- ``data[]: { title, content }`` — title = câu hỏi, content = câu trả lời


faqSpatialExpansionApex — ``faq/spatialExpansionApex.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['12','12']``  rows ``['auto','auto']``  expansion(openFirst:false)  apex

::

   ┌─────────────────────────────────────────┐
   │ T0  col-12  (badge · h2 · description)  │
   │  centered                                │
   ├─────────────────────────────────────────┤
   │ T1  col-12  expansion accordion         │
   └─────────────────────────────────────────┘

----

PRICING
=======

pricingModernCardPlans — ``pricing/modernCardPlans.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['12','3','9']``  rows ``['auto','auto','auto']``  sidebar + cards

::

   ┌─────────────────────────────────────────┐
   │ T0  col-12  (heading + description)     │
   ├──────────┬──────────────────────────────┤
   │ T1  col-3│ T2  col-9                    │
   │ sidebar  │ 3 plan cards (col-3 each)    │
   │ (labels/ │ title · price · features     │
   │  faq)    │ CTA button per card          │
   └──────────┴──────────────────────────────┘


pricingSpatialCardPlans — ``pricing/spatialCardPlans.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['12','12']``  grid  glass

::

   ┌─────────────────────────────────────────┐
   │ T0  col-12  (heading + toggle/label)    │
   ├─────────────────────────────────────────┤
   │ T1  col-12  (3 glass pricing cards)     │
   │  [Basic]  [Pro ★]  [Enterprise]        │
   └─────────────────────────────────────────┘


pricingSpatialTabPlans — ``pricing/spatialTabPlans.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['12','12']``  rows ``['auto','auto']``  tabs(pack:3 monthly/annual)

::

   ┌─────────────────────────────────────────┐
   │ T0  col-12  (h2 · description)          │
   ├─────────────────────────────────────────┤
   │ T1  col-12  tabs                        │
   │  [Monthly]  [Annual −25%]               │
   │  ────────────────────────               │
   │  [card] [card] [card]  (3 per tab)     │
   └─────────────────────────────────────────┘

- ``data[6]``: 3 monthly items (``tab: 'monthly'``) + 3 annual items (``tab: 'annual'``)
- ``tabs: { pack: 3, idField: 'tab', labelField: 'tabLabel', active: 'annual' }``
- Card: title + badge, description, price ($ + số lớn), billing note, divider, 4 feature rows, CTA
- ``pricingSpatialTabPlansApex``: cùng layout, dùng apex components

----

PROCESS
=======

processModernStepTimeline — ``process/modernStepTimeline.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``[12, [12]]``  steps(idField labelField iconField)

::

   ┌─────────────────────────────────────────┐
   │ T0  col-12  (intro heading)             │
   ├─────────────────────────────────────────┤
   │ T1  col-12  web-steps                   │
   │  ① Plan  ② Build  ③ Test  ④ Ship      │
   │  (click step → show slot content)      │
   └─────────────────────────────────────────┘

- ``data[]: { id, title, icon, content }``
- ``steps: { labelField: 'title', idField: 'id', iconField: 'meta.icon' }``

----

SHOWCASE
========

showcaseModernHoriCase — ``showcase/modernHoriCase.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['5','7']``  slider(2/view loop) right-column

::

   ┌──────────────────┬──────────────────────┐
   │ T0  col-5        │ T1  col-7  slider    │
   │  badge · h2      │  [case][case]        │
   │  description     │  2 cards visible     │
   │  view-all link   │  loop, no-nav        │
   └──────────────────┴──────────────────────┘

- Card: image + category + title + description


showcaseModernSlideNeat — ``showcase/modernSlideNeat.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``[[12], 12]``  slider(1/view autoplay:5s)

::

   ┌─────────────────────────────────────────┐
   │ T0  col-12  slider  1 fullwidth slide   │
   │  autoplay 5s · image fullbleed          │
   ├─────────────────────────────────────────┤
   │ T1  col-12  (label / heading below)     │
   └─────────────────────────────────────────┘


showcaseModernSlidePortfolio — ``showcase/modernSlidePortfolio.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['12','12']``  slider(3/view loop nav)

::

   ┌─────────────────────────────────────────┐
   │ T0  col-12  (heading + view-all)        │
   ├─────────────────────────────────────────┤
   │ T1  col-12  slider                      │
   │  [img-overlay][img-overlay][img-overlay]│
   │  3 visible · nav arrows · hover → name │
   └─────────────────────────────────────────┘

----

STATS
=====

statsModernCardRow / statsSpatialCardRow / statsSpatialCardRowApex
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``[12, [3]]``  grid(4/row)

::

   ┌─────────────────────────────────────────┐
   │ T0  col-12  (section label)             │
   ├──────────┬──────────┬──────────┬────────┤
   │ col-3    │ col-3    │ col-3    │ col-3  │
   │  10K+    │  99%     │  4.9★    │  50+   │
   │  Teams   │  Uptime  │  Rating  │  Integ │
   └──────────┴──────────┴──────────┴────────┘

- ``data[]: { value, label }``
- ``spatial`` variant: glass card background
- ``Apex`` variant: apex components

----

TEAM
====

teamSpatialCardGridNeat — ``team/spatialCardGridNeat.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['12','12']``  rows ``['auto','auto']``  grid 3/row

::

   ┌─────────────────────────────────────────┐
   │ T0  col-12  (2-line h2 heading + desc)  │
   ├─────────────────────────────────────────┤
   │ T1  col-12  cards:{col:4, gap:'1px'}    │
   │  [photo+overlay] [member] [member]     │
   │  3 per row × 2 rows = 6 members         │
   └─────────────────────────────────────────┘

- ``data[]: { title (name), pics (portrait), meta.role }``
- Card: grayscale portrait (aspectRatio 3/4) + bottom overlay (name full-width, role + 3 social icons)

----

TESTIMONIALS
============

testimonialsModernHori — ``testimonials/modernHori.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['5','7','5']``  rows ``['auto','2','auto']``  slider(1/view nav) + image-pinned

::

   ┌──────────────┬─────────────────────────┐
   │ T0  col-5    │ T1  col-7               │  row 0
   │  abstract bg │  decorative image       │
   │  (static)    │  span-2rows             │
   ├──────────────┤                         │
   │ T2  col-5    │                         │  row 1
   │  quote slider│                         │
   │  1/view, nav │                         │
   └──────────────┴─────────────────────────┘

- ``data[]: { title (name), content (quote), pics (avatar) }``


testimonialsSpatialMasonryNeat — ``testimonials/spatialMasonryNeat.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``['12','12']``  masonry(col:3 gap:1.5rem)

::

   ┌─────────────────────────────────────────┐
   │ T0  col-12  (heading + description)     │
   ├─────────────────────────────────────────┤
   │ T1  col-12  masonry  3 columns          │
   │  [quote card] [card] [card]             │
   │  [card]       [card]                    │
   │  variable height, glass bg             │
   └─────────────────────────────────────────┘

- ``testimonialsSpatialMasonryNeatApex``: same, apex components

----

TRUSTED
=======

trustedModernSlideLogos — ``trusted/modernSlideLogos.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``[12, 12]``  slider(auto-scroll infinite)

::

   ┌─────────────────────────────────────────┐
   │ T0  col-12  ("Trusted by …" label)      │
   ├─────────────────────────────────────────┤
   │ T1  col-12  slider  auto-scroll         │
   │  [logo][logo][logo][logo]… ∞            │
   └─────────────────────────────────────────┘

- ``data[]: { name, logo }``


trustedSpatialSlideLogos — ``trusted/spatialSlideLogos.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

col ``[12]``  slider(auto-scroll)  single-tier  glass

::

   ┌─────────────────────────────────────────┐
   │ T0  col-12  slider  auto-scroll         │
   │  single-tier, no intro row             │
   │  glass card per logo                   │
   └─────────────────────────────────────────┘

----

PRODUCTS / SHOP
===============

Các config shop dùng ``groupCol`` / ``groupRow`` trực tiếp (không có ``tiers``).
Chúng là **card config** — được truyền vào ``web-boxs`` qua ``config.card``.

productsShopCardBase — ``products/cardBase.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

groupCol ``[12·12·12·12]``  no-tiers  add-to-cart

::

   ┌───────────────────────┐
   │ row 0 — image         │  (overflow hidden, relative)
   ├───────────────────────┤
   │ row 1 — name + meta   │  (h4 + badge/tags)
   ├───────────────────────┤
   │ row 2 — description   │  (p, clamp 2 lines)
   ├───────────────────────┤
   │ row 3 — price + btn   │  (justify between)
   └───────────────────────┘

- ``productsShopCardCircle``: compact image (landscape ratio)


productsShopBaseInventory — ``products/baseInventory.js``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

groupCol ``[12·12·12]``  no-tiers  stock-management

::

   ┌───────────────────────┐
   │ row 0 — header row    │  (ingredient name + unit)
   ├───────────────────────┤
   │ row 1 — quantity row  │  (current stock + input)
   ├───────────────────────┤
   │ row 2 — action row    │  (save / delete buttons)
   └───────────────────────┘


productsShopBaseOrder / productsShopBaseStaff
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

groupCol ``[12·12·12]``  no-tiers

- **baseOrder**: header (order id + status) + order items list + total summary
- **baseStaff**: header (name + role) + detail row + HR action buttons

----

Bảng tóm tắt nhanh
===================

.. list-table::
   :header-rows: 1
   :widths: 30 15 15 15 25

   * - Section key
     - col
     - rows
     - Mode
     - Đặc điểm nổi bật
   * - heroModernHoriBase
     - 7·5·7
     - auto·2·auto
     - grid
     - image pinned right (span-2)
   * - heroSpatialHoriNeat
     - 6·6·6
     - 2·auto·auto
     - grid
     - image pinned left (span-2)
   * - heroSpatialHoriFeature
     - 6·6·12
     - auto
     - grid
     - features full-width below
   * - heroSpatialHoriGallery
     - 6·6·6·6
     - 3·auto·auto·auto
     - grid
     - gallery pinned left (span-3)
   * - heroSpatialNeatCenterApex
     - 12
     - auto
     - apex
     - single centered tier
   * - heroSpatialSplitGalleryApex
     - 7·5·7·7
     - auto·3·auto·auto
     - apex
     - gallery pinned (span-3)
   * - featuresModernCardIntro
     - 7·5·7
     - auto·2·auto
     - grid
     - image right + 4×col-3 cards
   * - featuresModernHoriIntro
     - 5·7·5
     - auto·2·auto
     - grid
     - feature list pinned right
   * - featuresSpatialHoriIntro
     - 7·5·5
     - 2·auto·auto
     - grid
     - image pinned left
   * - featuresSpatialCardWebApex
     - 12·12
     - auto
     - grid 3/row
     - icon-colored component cards
   * - benefitsModernCardList
     - 12·12
     - auto
     - grid
     - checklist rows
   * - benefitsModernCardCompare
     - 12·5·2·5
     - auto
     - grid
     - "VS" 3-col compare table
   * - benefitsModernPicBenefits
     - 5·7·5
     - auto·2·auto
     - grid
     - image pinned right
   * - blogModernSlideIntro
     - 12·12
     - auto
     - slider 3/view
     - post cards
   * - contactModernHoriMap
     - 5·7·5
     - auto·2·auto
     - grid
     - map pinned right
   * - contactModernHoriGoogleMap
     - 12·12
     - auto·auto
     - grid
     - intro + real map, stacked, no icons tier
   * - ctaModernNeat
     - 12·12
     - auto
     - grid
     - centered heading + 2 buttons
   * - faqModernExpansionQuestion
     - 5·7
     - auto
     - expansion
     - intro left + accordion right
   * - pricingModernCardPlans
     - 12·3·9
     - auto
     - grid
     - sidebar + 3 plan cards
   * - pricingSpatialTabPlans
     - 12·12
     - auto
     - tabs pack:3
     - monthly/annual toggle
   * - processModernStepTimeline
     - 12·[12]
     - auto
     - steps
     - web-steps timeline wizard
   * - showcaseModernHoriCase
     - 5·7
     - auto
     - slider 2/view
     - intro left + slider right
   * - showcaseModernSlidePortfolio
     - 12·12
     - auto
     - slider 3/view
     - image overlay + hover
   * - statsModernCardRow
     - 12·[3]
     - auto
     - grid 4/row
     - value + label metric cards
   * - teamSpatialCardGridNeat
     - 12·12
     - auto
     - grid 3/row
     - member cards
   * - testimonialsModernHori
     - 5·7·5
     - auto·2·auto
     - slider 1/view
     - image pinned right
   * - testimonialsSpatialMasonryNeat
     - 12·12
     - auto
     - masonry col:3
     - glass quote cards
   * - trustedModernSlideLogos
     - 12·12
     - auto
     - slider auto-scroll
     - logo strip
   * - trustedSpatialSlideLogos
     - 12
     - auto
     - slider auto-scroll
     - single-tier logo strip

----

Tài liệu liên quan
==================

+-----------------------------------+----------------------------------------------+
| File                              | Nội dung                                     |
+===================================+==============================================+
| ``docs/DESIGN.rst``               | Cú pháp đầy đủ — tiers, makes, bg, anime    |
+-----------------------------------+----------------------------------------------+
| ``docs/web-board.rst``            | web-board → web-boxs → web-box → web-cell   |
+-----------------------------------+----------------------------------------------+
| ``docs/web-apex.rst``             | API apex components                          |
+-----------------------------------+----------------------------------------------+
| ``src/sections/index.js``         | Import catalog tất cả sections              |
+-----------------------------------+----------------------------------------------+
| ``docs/ARCHITECT.rst``            | Tổng quan kiến trúc, layer diagram           |
+-----------------------------------+----------------------------------------------+
