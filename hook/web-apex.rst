===========
web-apex
===========

Thư viện Lit Web Components dùng chung trong ``src/webs/apex/``.
Tất cả component hỗ trợ prop ``ui`` (``modern`` | ``spatial``) và ``theme`` để đổi màu.

.. contents:: Danh mục component
   :depth: 2
   :local:

----

Quy ước chung
=============

``ui``
  ``modern`` — giao diện mặc định.
  ``spatial`` — glassmorphism với ``backdrop-filter: blur()``.

``theme``
  Giá trị truyền vào ``data-theme`` attribute (``dark`` | ``light`` hoặc slug ApexUI tùy chỉnh).

Màu CSS variable hệ thống
  ``--color-primary``, ``--color-base-100/200/300``, ``--color-base-content``.
  Không hardcode màu hex/rgb trong config.

----

Display
=======

web-alert
---------

Hiển thị hộp thông báo với icon và nút đóng tùy chọn.

**Props**

============  ==========================  =================================
Prop          Type / values               Mô tả
============  ==========================  =================================
``type``      ``primary`` ``info``        Màu sắc & icon của alert
              ``warning`` ``error``
``title``     String                      Tiêu đề hiển thị
``closable``  Boolean                     Hiện nút × để đóng
``visible``   Boolean                     Ẩn / hiện (default ``true``)
``ui``        ``modern`` ``spatial``      Kiểu giao diện
``theme``     String                      data-theme override
============  ==========================  =================================

**Events:** ``close`` khi người dùng bấm ×.

**Ví dụ cơ bản**

.. code-block:: html

   <web-alert type="info" title="Thông báo" closable>
     Nội dung chi tiết ở đây.
   </web-alert>

----

web-avatar
----------

Hiển thị ảnh đại diện hoặc initials chữ cái, kèm dot trạng thái.

**Props**

===========  ==============================  ====================================
Prop         Type / values                   Mô tả
===========  ==============================  ====================================
``src``      String (URL)                    Ảnh avatar
``name``     String                          Tên — tạo initials khi không có src
``size``     ``xs`` ``sm`` ``md`` ``lg``     Kích thước
``shape``    ``circle`` ``square``           Hình dạng khung
``status``   ``online`` ``away`` ``busy``    Dot trạng thái góc phải dưới
``ui``       ``modern`` ``spatial``
``theme``    String
===========  ==============================  ====================================

**Ví dụ cơ bản**

.. code-block:: html

   <web-avatar src="/img/user.jpg" name="Dung Pham" size="md" shape="circle" status="online"></web-avatar>

----

web-bg
------

Nền trang có hiệu ứng parallax theo chuột, pattern, noise overlay.

**Props**

==============  =====================================================  ================================
Prop            Type / values                                          Mô tả
==============  =====================================================  ================================
``tint``        String (hex / rgb / CSS color)                         ``gradient=true`` → màu seed sinh blob | ``gradient=false`` → sơn trực tiếp làm nền đặc (bỏ nếu rỗng)
``type``        ``circle`` ``circleEdge`` ``circleOverlap``           Hình dạng vị trí blob
                ``ellipse``
``total``       Number (1–4)                                           Số blob (tối đa 4)
``radius``      Number                                                 Khoảng cách từ tâm (%)
``deg``         Number                                                 Góc khởi đầu / góc gradient
``gradient``    Boolean                                                ``true`` render blob từ ``tint`` | ``false`` dùng ``tint`` làm nền đặc
``mono``        Boolean                                                Đơn sắc (hue giữ nguyên)
``move``        ``''`` ``'swap'`` ``'pulse'``                         Loop animation blob
``pattern``     ``brick~N`` ``cross~N`` ``diagonal~N``                Pattern lặp (``type~sizepx``)
                ``minus~N`` ``plus~N`` ``wave~N``
                ``circle~N`` ``crescent~N`` ``diamond~N``
                ``dot~N`` ``flower~N`` ``heart~N``
                ``square~N`` ``star~N`` ``sun~N``
``rounded``     String (CSS value)                                     Border-radius wrapper
``spatial``     Boolean                                                Glassmorphism + blur
``border``      Object ``{width, style?, color?}``                    Viền wrapper
``fixed``       Boolean                                                ``position:fixed`` toàn trang
``pics``        ``'linkLight|linkDark'``                               background-image theo theme — 1 link (không ``|``) dùng chung cho cả 2 theme; ``''`` = không có ảnh
==============  =====================================================  ================================

**``move`` animation modes:**

- ``''`` (mặc định) — không animation
- ``'swap'`` — blob di chuyển sang vị trí nhau theo vòng lặp (5–6 s, ease-in-out)
- ``'pulse'`` — blob mờ dần rồi hiện lại, các blob lệch pha nhau (4 s, stagger)

Parallax chuột vẫn hoạt động ở tất cả mode — ``--tx``/``--ty`` được baked vào keyframe.

**Ví dụ cơ bản**

.. code-block:: html

   <web-bg type="circle" gradient tint="#2ebd85" total="2" move="pulse" pattern="dot~32"></web-bg>

----

web-breadcrumb
--------------

Thanh điều hướng breadcrumb.

**Props**

=========  ==========================  ===================================
Prop       Type / values               Mô tả
=========  ==========================  ===================================
``items``  Array ``[{label, href}]``   Các mục breadcrumb
``ui``     ``modern`` ``spatial``
``theme``  String
=========  ==========================  ===================================

**Events:** ``navigate`` — detail là item được click.

**Ví dụ cơ bản**

.. code-block:: html

   <web-breadcrumb
     items='[{"label":"Trang chủ","href":"/"},{"label":"Sản phẩm","href":"/products"}]'>
   </web-breadcrumb>

----

web-button
----------

Nút bấm đa năng, hỗ trợ loading, icon prefix/suffix.

**Props**

============  ========================================  ====================================
Prop          Type / values                             Mô tả
============  ========================================  ====================================
``type``      ``fill`` ``outline`` ``ghost``            Kiểu viền/nền nút
              ``dash`` ``soft``
``color``     CSS variable token                        Màu nút (``primary`` ``error`` …)
``mode``      ``button`` ``badge``                      Render dạng nút hay badge
``rounded``   Boolean                                   Bo tròn hoàn toàn
``square``    Boolean                                   Hình vuông (icon-only)
``height``    String                                    Chiều cao tùy chỉnh
``loading``   Boolean                                   Spinner loading state
``disabled``  Boolean
``prefix``    String (icon name)                        Icon trái
``suffix``    String (icon name)                        Icon phải
``fontSize``  String                                    Cỡ chữ
``stys``      String / Object                           Style override inline
``ui``        ``modern`` ``spatial``
============  ========================================  ====================================

**Events:** ``clicked`` — detail là text của nút.

**Ví dụ cơ bản**

.. code-block:: html

   <web-button type="fill" color="primary" prefix="save">Lưu lại</web-button>

----

web-gallery
-----------

Hiển thị 1 ảnh (như ``web-image``) hoặc nhiều ảnh dạng stack với popup slider toàn màn hình.

**Props**

===========  ==========================  ============================================
Prop         Type / values               Mô tả
===========  ==========================  ============================================
``src``      String (pipe ``|`` sep)     Một hoặc nhiều URL ảnh
``alt``      String                      Alt text
``loading``  ``lazy`` ``eager``          Chiến lược tải ảnh
``rounded``  Boolean                     Bo góc
``float``    ``left`` ``right``          Float layout
``cls``      String                      Extra CSS class
``stys``     String / Object             Inline style override
``ui``       ``modern`` ``spatial``
===========  ==========================  ============================================

**Ví dụ cơ bản — 1 ảnh**

.. code-block:: html

   <web-gallery src="/img/photo.jpg" rounded loading="lazy"></web-gallery>

**Ví dụ — nhiều ảnh**

.. code-block:: html

   <web-gallery src="/img/a.jpg|/img/b.jpg|/img/c.jpg"></web-gallery>

----

web-google-map
--------------

Nhúng Google Maps qua iframe embed cổ điển (``output=embed``) — không cần API key, không
dùng Maps JS SDK. Ưu tiên ``lat``/``lng`` nếu cả 2 đều có, ngược lại fallback sang ``address``
(Google tự geocode). Không có address lẫn lat/lng hợp lệ → không render gì (giống quy ước
``web-gallery`` khi thiếu ``src``).

**Props**

===========  ==========================  ============================================
Prop         Type / values               Mô tả
===========  ==========================  ============================================
``address``  String                      Địa chỉ dạng text — dùng khi không có lat/lng
``lat``      String                      Vĩ độ — ưu tiên hơn address nếu cả 2 đều có
``lng``      String                      Kinh độ
``zoom``     Number                      Mức zoom. Mặc định ``15``
``rounded``  String                      Border-radius. Mặc định ``'12px'``
``height``   String                      Chiều cao. Mặc định ``'320px'``
``stys``     Object                      Inline style bổ sung
``cls``      String                      Extra CSS class
===========  ==========================  ============================================

**Ví dụ — theo toạ độ**

.. code-block:: html

   <web-google-map lat="10.7554" lng="106.7011" zoom="16" height="360px"></web-google-map>

**Ví dụ — theo địa chỉ (fallback khi không có toạ độ)**

.. code-block:: html

   <web-google-map address="1 Đ. Nguyễn Tất Thành, Xóm Chiếu, Hồ Chí Minh, Việt Nam"></web-google-map>

Trong config ``bit``/``opt`` (xem ``src/sections/contact/modernHoriGoogleMap.js``): dùng
``mode: 'google-map'`` với ``bit`` trỏ 1 field location DUY NHẤT (vd ``meta.address``, format
``street~ward~region~country~lat~lng`` — cùng chuẩn ``rooms.location``, xem docs/CHANNEL.rst §
rooms Schema) — ``web-cell.js`` tự tách địa chỉ người-đọc-được + toạ độ từ field này
(``humanizeLocation``/``locationLatLng`` trong ``@/services/helper.js``). Field không có ``~``
(text thường) vẫn hoạt động, chỉ dùng được nhánh address. ``opt`` còn lại (``zoom``/
``rounded``/``height``/``stys``) truyền thẳng xuống component.

----

web-loader
----------

Shimmer skeleton placeholder khi đang tải dữ liệu.

**Props**

=========  ===========  ====================
Prop       Type         Mô tả
=========  ===========  ====================
``width``  String       Chiều rộng
``height`` String       Chiều cao
``stys``   String       Inline style
=========  ===========  ====================

**Ví dụ cơ bản**

.. code-block:: html

   <web-loader width="100%" height="120px"></web-loader>

----

web-progress
------------

Thanh tiến trình.

**Props**

===========  =====================================  ==============================
Prop         Type / values                          Mô tả
===========  =====================================  ==============================
``value``    Number (0–100)                         Phần trăm tiến trình
``type``     ``primary`` ``info`` ``warning``       Màu thanh
             ``error``
``striped``  Boolean                                Thanh kẻ sọc
``animate``  Boolean                                Chạy animation sọc
``ui``       ``modern`` ``spatial``
``theme``    String
===========  =====================================  ==============================

**Ví dụ cơ bản**

.. code-block:: html

   <web-progress value="70" type="primary" striped animate></web-progress>

----

web-toast
---------

Toast notification toàn cục, lắng nghe event ``web-toast-show``.

**Props**

============  =====================================  ==============================
Prop          Type / values                          Mô tả
============  =====================================  ==============================
``timeout``   Number (ms)                            Thời gian tự đóng (default 5000)
``placement``  6 vị trí top/bottom x left/center/right Default ``bottom-center``
``ui``        ``modern`` ``spatial``
============  =====================================  ==============================

**Kích hoạt từ bất kỳ đâu**

.. code-block:: js

   window.dispatchEvent(new CustomEvent('web-toast-show', {
     detail: { type: 'success', message: 'Lưu thành công!' }
   }));
   // type: success | info | warning | error

**Ví dụ mount**

.. code-block:: html

   <web-toast timeout="4000" ui="spatial"></web-toast>

----

web-tooltip
-----------

Tooltip floating gắn vào element trigger qua slot.

**Props**

=============  ============================================  ===========================
Prop           Type / values                                 Mô tả
=============  ============================================  ===========================
``placement``  ``top`` ``bottom`` ``left`` ``right``         Vị trí tooltip
``show``       Boolean                                       Hiển thị cố định
``maxWidth``   String                                        Chiều rộng tối đa
``ui``         ``modern`` ``spatial``
=============  ============================================  ===========================

**Ví dụ cơ bản**

.. code-block:: html

   <web-tooltip placement="top">
     <button slot="trigger">Hover tôi</button>
     <span>Nội dung tooltip</span>
   </web-tooltip>

----

Text & Input
============

web-text
--------

Ô nhập văn bản đơn dòng.

**Props**

=============  =============================  ==============================
Prop           Type / values                  Mô tả
=============  =============================  ==============================
``value``      String                         Giá trị hiện tại
``placeholder``  String
``type``       ``text`` ``password`` ``email`` …  Input type HTML
``prefix``     String (icon / text)           Hiển thị trước input
``suffix``     String (icon / text)           Hiển thị sau input
``clearable``  Boolean                        Nút × xóa nhanh
``height``     String                         Chiều cao input
``disabled``   Boolean
``readonly``   Boolean
``ui``         ``modern`` ``spatial``
``theme``      String
=============  =============================  ==============================

**Events:** ``input``, ``change``, ``clear``.

**Ví dụ cơ bản**

.. code-block:: html

   <web-text placeholder="Nhập tên..." clearable prefix="search"></web-text>

----

web-textarea
------------

Ô nhập văn bản đa dòng.

**Props**

===============  ====================  ==============================
Prop             Type / values         Mô tả
===============  ====================  ==============================
``value``        String
``placeholder``  String
``label``        String                Label hiển thị trên textarea
``rows``         Number                Số dòng mặc định
``disabled``     Boolean
``ui``           ``modern`` ``spatial``
``theme``        String
===============  ====================  ==============================

**Events:** ``input``, ``change``.

**Ví dụ cơ bản**

.. code-block:: html

   <web-textarea label="Mô tả" placeholder="Nhập nội dung..." rows="4"></web-textarea>

----

web-texts
---------

Wrapper nhiều ``web-text`` với nút thêm / xóa, giá trị pipe-separated.

**Props**

===============  ====================  ========================================
Prop             Type / values         Mô tả
===============  ====================  ========================================
``value``        String (``a|b|c``)   Danh sách giá trị
``placeholder``  String
``single``       Boolean               Chỉ cho phép 1 giá trị
``height``       String
``disabled``     Boolean
===============  ====================  ========================================

**Ví dụ cơ bản**

.. code-block:: html

   <web-texts value="Tag1|Tag2" placeholder="Thêm tag..."></web-texts>

----

web-letter
----------

Văn bản với animation chữ theo từng ký tự / từ (Zoning Motion).

**Props**

===========  ======================================================  ==========================
Prop         Type / values                                           Mô tả
===========  ======================================================  ==========================
``content``  String                                                  Nội dung văn bản
``tag``      ``h1`` … ``h6`` ``p`` ``span``                         HTML tag bao ngoài
``motion``   ``char`` ``word``                                       Đơn vị chuyển động
``effect``   ``zoomIn`` ``zoomOut`` ``fadeIn`` ``blurIn``           Kiểu hiệu ứng
             ``typeIn`` ``slideUp`` ``slideDown`` ``floatIn``
             ``riseUp`` ``fallDown`` ``driftIn`` ``spinIn``
             ``flipIn`` ``flipX`` ``swingIn`` ``waveIn``
             ``pulseIn`` ``focusIn`` ``pinIn``
             ``glitchIn`` ``scatterIn``
``loop``     Boolean                                                 Lặp vô hạn
``word``     Boolean                                                 Hiệu ứng theo từ
``duration`` Number (ms)                                             Thời gian 1 đơn vị
``delay``    Number (ms)                                             Delay giữa các đơn vị
``hold``     Number (ms)                                             Dừng trước khi lặp
===========  ======================================================  ==========================

**Ví dụ cơ bản**

.. code-block:: html

   <web-letter tag="h1" content="Xin chào!" effect="blurIn" motion="char" delay="50"></web-letter>

----

web-pre
-------

Code block với syntax highlight (Prism) và nút copy.

**Props**

==================  ===================================  =============================
Prop                Type / values                        Mô tả
==================  ===================================  =============================
``data``            String                               Code cần hiển thị
``lang``            ``json`` ``javascript`` ``css``      Ngôn ngữ highlight
                    ``markup``
``title``           String                               Tiêu đề block
``maxHeight``       String                               Chiều cao tối đa (scroll)
``showLineNumbers`` Boolean                              Hiện số dòng
==================  ===================================  =============================

**Ví dụ cơ bản**

.. code-block:: html

   <web-pre lang="json" title="Response" data='{"ok":true}'></web-pre>

----

Form Controls
=============

web-checkbox
------------

Checkbox đơn với label.

**Props**

===========  ====================  ==============================
Prop         Type / values         Mô tả
===========  ====================  ==============================
``checked``  Boolean               Trạng thái check
``label``    String
``disabled`` Boolean
``ui``       ``modern`` ``spatial``
``theme``    String
===========  ====================  ==============================

**Events:** ``change`` — detail ``{ checked: Boolean }``.

**Ví dụ cơ bản**

.. code-block:: html

   <web-checkbox label="Đồng ý điều khoản" checked></web-checkbox>

----

web-radio
---------

Nhóm radio button.

**Props**

==============  ========================================  =============================
Prop            Type / values                             Mô tả
==============  ========================================  =============================
``options``     Array ``[{label, value, disabled?}]``    Danh sách lựa chọn
``value``       String                                    Giá trị đang chọn
``name``        String                                    HTML name attribute
``horizontal``  Boolean                                   Xếp ngang
``disabled``    Boolean                                   Vô hiệu tất cả
``ui``          ``modern`` ``spatial``
``theme``       String
==============  ========================================  =============================

**Events:** ``change`` — detail là value được chọn.

**Ví dụ cơ bản**

.. code-block:: html

   <web-radio
     options='[{"label":"Nam","value":"male"},{"label":"Nữ","value":"female"}]'
     value="male"
     horizontal>
   </web-radio>

----

web-toggle
----------

Switch on/off.

**Props**

===========  ====================  ==============================
Prop         Type / values         Mô tả
===========  ====================  ==============================
``active``   Boolean               Trạng thái bật/tắt
``label``    String
``disabled`` Boolean
``ui``       ``modern`` ``spatial``
``theme``    String
===========  ====================  ==============================

**Events:** ``change`` — detail ``{ active: Boolean }``.

**Ví dụ cơ bản**

.. code-block:: html

   <web-toggle label="Nhận thông báo" active></web-toggle>

----

web-select
----------

Dropdown chọn giá trị, hỗ trợ tìm kiếm và chọn nhiều.

**Props**

================  ===============================  =======================================
Prop              Type / values                    Mô tả
================  ===============================  =======================================
``options``       Array ``[{label, value}]``       Danh sách lựa chọn
``value``         String / Array                   Giá trị đang chọn
``multiple``      Boolean                          Chọn nhiều
``searchable``    Boolean                          Ô tìm kiếm nội bộ
``placeholder``   String
``disabled``      Boolean
``height``        String                           Chiều cao trigger
``placement``     ``bottom`` ``top``               Hướng mở dropdown
``placementGap``  Number                           Khoảng cách với trigger
``ui``            ``modern`` ``spatial``
``theme``         String
================  ===============================  =======================================

**Events:** ``change`` — detail là value hoặc mảng value.

**Ví dụ cơ bản**

.. code-block:: html

   <web-select
     options='[{"label":"Hà Nội","value":"HN"},{"label":"HCM","value":"HCM"}]'
     placeholder="Chọn thành phố"
     searchable>
   </web-select>

----

web-dropdown
------------

Menu thả xuống gắn vào nút.

**Props**

================  ===========================================  ==============================
Prop              Type / values                                Mô tả
================  ===========================================  ==============================
``label``         String                                       Text nút kích hoạt
``icon``          String                                       Icon nút kích hoạt
``items``         Array ``[{label, value, icon?, divider?}]`` Danh sách menu item
``opt``           Object                                       Config cho ``web-button``
``disabled``      Boolean
``placement``     ``bottom`` ``top`` ``left`` ``right``
``placementGap``  Number
``ui``            ``modern`` ``spatial``
``theme``         String
================  ===========================================  ==============================

**Events:** ``clicked`` — detail là item được chọn.

**Ví dụ cơ bản**

.. code-block:: html

   <web-dropdown
     label="Thao tác"
     items='[{"label":"Sửa","value":"edit","icon":"edit"},{"label":"Xóa","value":"delete","icon":"trash"}]'>
   </web-dropdown>

----

web-currency
------------

Input số có định dạng tiền tệ, bước tăng/giảm.

**Props**

=============  ==============================  ==============================
Prop           Type / values                   Mô tả
=============  ==============================  ==============================
``value``      Number                          Giá trị hiện tại
``step``       Number                          Bước nhảy tăng/giảm
``format``     ``de-DE`` ``en-US``             Định dạng số (dấu phân cách)
``precision``  Number                          Số chữ số thập phân
``min``        Number
``max``        Number
``placeholder``  String
``prefix``     String                          Ký hiệu trước (``$`` ``₫`` …)
``suffix``     String                          Ký hiệu sau
``disabled``   Boolean
``height``     String
``ui``         ``modern`` ``spatial``
=============  ==============================  ==============================

**Events:** ``input``, ``change``.

**Ví dụ cơ bản**

.. code-block:: html

   <web-currency value="150000" format="de-DE" prefix="₫" step="1000"></web-currency>

----

web-datetime
------------

Bộ chọn ngày / tháng / năm dùng vanilla-calendar-pro.

**Props**

===============  =================================  ==============================
Prop             Type / values                      Mô tả
===============  =================================  ==============================
``type``         ``default`` ``month`` ``year``     Chế độ chọn
``value``        String (ISO date)                  Giá trị đang chọn
``dateMin``      String (ISO date)                  Ngày nhỏ nhất
``dateMax``      String (ISO date)                  Ngày lớn nhất
``placeholder``  String
``disabled``     Boolean
``height``       String
``ui``           ``modern`` ``spatial``
``theme``        String
===============  =================================  ==============================

**Events:** ``change`` — detail là chuỗi ISO date.

**Ví dụ cơ bản**

.. code-block:: html

   <web-datetime type="default" placeholder="Chọn ngày" dateMin="2024-01-01"></web-datetime>

----

web-rating
----------

Đánh giá sao / tim / hình tùy chọn.

**Props**

===========  =====================================================  ============================
Prop         Type / values                                          Mô tả
===========  =====================================================  ============================
``value``    Number                                                 Giá trị hiện tại
``max``      Number                                                 Số sao tối đa
``half``     Boolean                                                Cho phép nửa sao
``disabled`` Boolean
``color``    CSS color token                                        Màu icon
``mask``     ``mask-star-2`` ``mask-heart`` ``mask-star``          Hình icon ApexUI mask
             ``mask-diamond`` ``mask-triangle`` …
``size``     ``xs`` ``sm`` ``md`` ``lg`` ``xl``
===========  =====================================================  ============================

**Ví dụ cơ bản**

.. code-block:: html

   <web-rating value="3.5" max="5" half mask="mask-star-2" size="lg"></web-rating>

----

web-colors
----------

Danh sách color swatch với ô nhập hex, thêm / xóa màu.

**Props**

===========  ==========================  ======================================
Prop         Type / values               Mô tả
===========  ==========================  ======================================
``value``    String (``#hex|#hex``)      Danh sách màu pipe-separated
``single``   Boolean                     Chỉ cho 1 màu
``disabled`` Boolean
``ui``       ``modern`` ``spatial``
``theme``    String
===========  ==========================  ======================================

**Ví dụ cơ bản**

.. code-block:: html

   <web-colors value="#FF5733|#33C3FF|#28B463"></web-colors>

----

web-files
---------

Dropzone tải file lên.

**Props**

============  ====================  ==============================
Prop          Type / values         Mô tả
============  ====================  ==============================
``multiple``  Boolean               Cho phép nhiều file
``accept``    String                MIME types chấp nhận
``files``     Array                 File hiện tại (controlled)
``ui``        ``modern`` ``spatial``
``theme``     String
============  ====================  ==============================

**Events:** ``change`` — detail là mảng ``File``.

**Ví dụ cơ bản**

.. code-block:: html

   <web-files multiple accept="image/*,application/pdf"></web-files>

----

web-cropper
-----------

Trình cắt ảnh với nhiều tỉ lệ khung hình.

**Props**

=========  ====================  ========================================
Prop       Type / values         Mô tả
=========  ====================  ========================================
``src``    String (URL / blob)   Ảnh nguồn cần cắt
=========  ====================  ========================================

**Tỉ lệ hỗ trợ:** ``free`` ``original`` ``1:1`` ``9:16`` ``16:9`` ``4:5`` ``5:4`` ``3:4`` ``4:3``.

**Methods (JS API):**

.. code-block:: js

   const cropper = document.querySelector('web-cropper');
   const data  = cropper.getCropData();          // { x, y, width, height, … }
   const canvas = cropper.getCroppedCanvas();    // HTMLCanvasElement

**Ví dụ cơ bản**

.. code-block:: html

   <web-cropper src="/img/photo.jpg"></web-cropper>

----

web-photor-upload
-----------------

Upload ảnh lên imgbb + preview + cắt ảnh tuỳ chọn.

**Props**

===============  ====================  ===========================================
Prop             Type / values         Mô tả
===============  ====================  ===========================================
``value``        String / Array        URL(s) hiện tại
``placeholder``  String
``multiple``     Boolean               Upload nhiều ảnh
``disabled``     Boolean
``height``       String
``mime``         String                MIME filter (``image/*``)
``ui``           ``modern`` ``spatial``
===============  ====================  ===========================================

**Events:** ``change`` — detail là URL hoặc mảng URL sau khi upload.

**Ví dụ cơ bản**

.. code-block:: html

   <web-photor-upload placeholder="Tải ảnh lên" multiple></web-photor-upload>

----

web-photor
----------

Quản lý bộ sưu tập ảnh với workflow chọn file → cắt → preview.

**Props**

============  ====================  ==============================
Prop          Type / values         Mô tả
============  ====================  ==============================
``multiple``  Boolean               Nhiều ảnh
``ui``        ``modern`` ``spatial``
============  ====================  ==============================

**Ví dụ cơ bản**

.. code-block:: html

   <web-photor multiple ui="spatial"></web-photor>

----

Navigation & Structure
======================

web-pagination
--------------

Phân trang với ellipsis tự động.

**Props**

============  ====================  ==============================
Prop          Type / values         Mô tả
============  ====================  ==============================
``total``     Number                Tổng số item
``current``   Number                Trang hiện tại
``pageSize``  Number                Item mỗi trang
``ui``        ``modern`` ``spatial``
``theme``     String
============  ====================  ==============================

**Events:** ``change`` — detail là số trang.

**Ví dụ cơ bản**

.. code-block:: html

   <web-pagination total="200" current="1" page-size="10"></web-pagination>

----

web-tabs
--------

Tab panel với slot nội dung.

**Props**

=========  ===================================  ==============================
Prop       Type / values                        Mô tả
=========  ===================================  ==============================
``tabs``   Array ``[{id, label}]``              Danh sách tab
``active`` String                               id tab đang active
``align``  ``left`` ``center`` ``right``        Căn chỉnh thanh tab
``size``   ``sm`` ``md`` ``lg`` ``xl``          Kích thước (mặc định ``md``)
``ui``     ``modern`` ``spatial``
``theme``  String
=========  ===================================  ==============================

**Events:** ``change`` — detail là id tab.

**Ví dụ cơ bản**

.. code-block:: html

   <web-tabs
     tabs='[{"id":"info","label":"Thông tin"},{"id":"history","label":"Lịch sử"}]'
     active="info">
     <div slot="info">Nội dung thông tin...</div>
     <div slot="history">Lịch sử thao tác...</div>
   </web-tabs>

----

web-steps
---------

Thanh tiến trình bước (wizard / stepper).

**Props**

==============  ==========================================  ==============================================================
Prop            Type / values                               Mô tả
==============  ==========================================  ==============================================================
``steps``       Array ``[{id, label, icon?}]``               Danh sách bước
``active``      String                                       id bước đang active
``size``        ``sm`` ``md`` ``lg`` ``xl``                  Kích thước (mặc định ``md``)
``isVertical``  Boolean                                      Timeline dọc: circle+line bên trái, label+content bên phải theo từng bước (mặc định ``false``)
``linear``      Boolean                                      Click chỉ đi tới step ``done``/``active``, chặn nhảy tới step ``pending`` (mặc định ``false`` — free-nav, dùng cho wizard tab-like như web-boxs)
``ui``          ``modern`` ``spatial``
``theme``       String
==============  ==========================================  ==============================================================

Trạng thái bước tự tính: ``done`` | ``active`` | ``pending`` | ``error`` theo index.

Khi ``isVertical``, nội dung slot của TẤT CẢ bước hiển thị cùng lúc (không ẩn/hiện theo tab)
— mỗi slot nằm ngay cạnh circle của chính bước đó, đường line kéo dọc xuống bước kế tiếp.

**Events:** ``change`` — detail là id bước.

**Ví dụ cơ bản**

.. code-block:: html

   <web-steps
     steps='[{"id":"cart","label":"Giỏ hàng"},{"id":"pay","label":"Thanh toán"},{"id":"done","label":"Hoàn tất"}]'
     active="pay">
   </web-steps>

----

web-expansion
-------------

Accordion mở / đóng từng panel.

**Props**

==========  =====================================  ======================================
Prop        Type / values                          Mô tả
==========  =====================================  ======================================
``panels``  Array ``[{id, label, icon?}]``         Danh sách panel
``active``  String / Array                         id panel đang mở
``multiple`` Boolean                               Mở nhiều panel cùng lúc
``size``    ``sm`` ``md`` ``lg`` ``xl``            Kích thước (mặc định ``md``)
``ui``      ``modern`` ``spatial``
``theme``   String
==========  =====================================  ======================================

**Events:** ``change`` — detail là id panel.

**Ví dụ cơ bản**

.. code-block:: html

   <web-expansion
     panels='[{"id":"faq1","label":"Câu hỏi 1"},{"id":"faq2","label":"Câu hỏi 2"}]'
     active="faq1">
     <div slot="faq1">Câu trả lời 1...</div>
     <div slot="faq2">Câu trả lời 2...</div>
   </web-expansion>

----

web-slider
----------

Carousel ảnh dùng KeenSlider.

**Props**

===========  =============================================  ============================
Prop         Type / values                                  Mô tả
===========  =============================================  ============================
``images``   Array ``[{src, alt?}]``                       Danh sách ảnh
``autoplay`` Boolean / Number (ms)                         Tự động chạy
``loop``     Boolean                                        Lặp vòng
``mode``     ``snap`` ``free`` ``free-snap``               Chế độ kéo
``vertical`` Boolean                                        Vuốt dọc
``slides``   Number / Object                               Số slide hiển thị
``spacing``  Number                                         Khoảng cách slide (px)
``nav``      Boolean                                        Nút prev/next
``dots``     Boolean                                        Dot indicator
``lazy``     Boolean                                        Lazy load ảnh
``fade``     Boolean                                        Chuyển slide fade
``origin``   ``auto`` ``center``                           Căn vị trí đầu
===========  =============================================  ============================

**Methods (JS API):** ``slider.next()``, ``slider.prev()``, ``slider.goto(index)``.

**Ví dụ cơ bản**

.. code-block:: html

   <web-slider
     images='[{"src":"/img/1.jpg"},{"src":"/img/2.jpg"}]'
     autoplay="3000"
     loop
     nav
     dots>
   </web-slider>

----

Layout & Grid
=============

.. note::

   ``web-board``, ``web-boxs``, ``web-box``, ``web-cell`` được tách ra tài liệu riêng:
   xem ``docs/web-board.rst``.

web-boxs-search
---------------

Bộ lọc tag + ô tìm kiếm cho ``web-boxs``.

**Props**

=========  ==============================  ============================================
Prop       Type / values                   Mô tả
=========  ==============================  ============================================
``items``  Array ``[{label, value}]``      Danh sách tag filter
``tags``   Array                           Tag đang active
``field``  String                          Field dữ liệu dùng để filter
``multi``  Boolean                         Chọn nhiều tag
``color``  String                          Màu chip tag
``query``  String                          Query tìm kiếm hiện tại
``active`` Array                           Tag active (controlled)
``ui``     ``modern`` ``spatial``
=========  ==============================  ============================================

**Events:** ``filter`` — detail ``{ tags: [], query: '' }``.

**Ví dụ cơ bản**

.. code-block:: html

   <web-boxs-search
     items='[{"label":"Áo","value":"shirt"},{"label":"Quần","value":"pants"}]'
     multi>
   </web-boxs-search>

----

web-split
---------

Chia đôi vùng với thanh kéo resize.

**Props**

================  ==============================  ==============================
Prop              Type / values                   Mô tả
================  ==============================  ==============================
``direction``     ``horizontal`` ``vertical``      Hướng chia
``size``          Number (%)                       Kích thước pane đầu
``min``           Number (%)                       Giới hạn nhỏ nhất
``max``           Number (%)                       Giới hạn lớn nhất
``showExpanded``  Boolean                          Hiện nút expand/collapse
``ui``            ``modern`` ``spatial``
``theme``         String
================  ==============================  ==============================

**Ví dụ cơ bản**

.. code-block:: html

   <web-split direction="horizontal" size="30" min="15" max="60">
     <div slot="primary">Sidebar</div>
     <div slot="secondary">Nội dung chính</div>
   </web-split>

----

web-popover
-----------

Floating popover gắn vào element trigger qua slot.

**Props**

================  ============================================  ============================
Prop              Type / values                                 Mô tả
================  ============================================  ============================
``open``          Boolean                                       Mở cố định
``placement``     ``top`` ``bottom`` ``left`` ``right``         Vị trí popover
``placementGap``  Number                                        Khoảng cách với trigger
``stys``          String / Object                               Style content
``ui``            ``modern`` ``spatial``
``theme``         String
================  ============================================  ============================

**Ví dụ cơ bản**

.. code-block:: html

   <web-popover placement="bottom">
     <web-button slot="trigger" type="ghost">Xem thêm</web-button>
     <div>Nội dung chi tiết bên trong popover</div>
   </web-popover>

----

web-table
---------

Bảng dữ liệu với màu hệ thống.

**Props**

=============  ==============================  ==============================
Prop           Type / values                   Mô tả
=============  ==============================  ==============================
``data``       Array                           Mảng dữ liệu hàng
``columns``    Array ``[{key, label}]``        Cấu hình cột
``mainColors`` String
``textColor``  String
``height``     String                          Chiều cao tối đa (scroll)
``stys``       String / Object
``ui``         ``modern`` ``spatial``
``theme``      String
=============  ==============================  ==============================

**Ví dụ cơ bản**

.. code-block:: html

   <web-table
     columns='[{"key":"name","label":"Tên"},{"key":"price","label":"Giá"}]'
     data='[{"name":"Sản phẩm A","price":"150,000"},{"name":"Sản phẩm B","price":"200,000"}]'>
   </web-table>

----

Utilities
=========

web-gradient
------------

Nền toàn trang dạng gradient / aurora / mesh animated.

**Props**

=============  =============================================  ================================
Prop           Type / values                                  Mô tả
=============  =============================================  ================================
``type``       ``aurora`` ``mesh`` ``gradient``              Kiểu hiệu ứng nền
               ``rotate45`` ``radialDouble`` ``radial``
``mainColors`` String (comma-sep 5 màu)                      Bảng màu gradient
``limit``      Number                                         Số layer / shape
=============  =============================================  ================================

**Ví dụ cơ bản**

.. code-block:: html

   <web-gradient type="aurora" main-colors="--color-primary,--color-base-200"></web-gradient>

----

web-location
------------

Nhập địa chỉ dạng text hoặc chọn trên bản đồ Leaflet + Nominatim.

**Props**

===========  ========================================  =====================================================
Prop         Type / values                             Mô tả
===========  ========================================  =====================================================
``value``    String (``street~ward~region~country``)   Địa chỉ mã hóa pipe ``~``
``apiKey``   String                                    API key nếu dùng provider có tính phí
``disabled`` Boolean
``ui``       ``modern`` ``spatial``                    Giao diện ``basic`` (text) hoặc ``map``
``theme``    String
===========  ========================================  =====================================================

**Events:** ``change`` — detail là chuỗi địa chỉ mã hóa.

**Ví dụ cơ bản**

.. code-block:: html

   <web-location value="123 Lê Lợi~Phường 1~TP.HCM~Việt Nam" ui="map"></web-location>

**Dùng thẳng ``web-location-map`` (không qua wrapper ``web-location``) — prop ``geo``**

``src/webs/apex/web-location-map.js`` (component map thật, ``web-location`` chỉ là wrapper
chọn ``basic``/``map``) có thêm prop ``geo`` (Boolean, mặc định ``false``) — khi ``true``,
``value`` mã hoá thêm 2 field toạ độ: ``street~ward~region~country~lat~lng`` (thay vì 4 field
thường). Khi load lại 1 ``value`` đã có toạ độ, component tự khôi phục pin trên map + trạng
thái "đã xác nhận" — không cần chọn lại từ đầu. Dùng khi cần lưu toạ độ thật, không chỉ địa chỉ
text — ví dụ ``svc-channel``'s room location, xem ``docs/CHANNEL.rst`` § Danh sách phòng.

.. code-block:: html

   <web-location-map geo placeholder="Vị trí (không bắt buộc)" .value=${this.location}
       @change=${e => { this.location = e.detail.value }}></web-location-map>

----

web-setting
-----------

Panel cài đặt dạng FAB + dialog, schema-driven.

**Props**

=========  =====================================================================  ============================
Prop       Type / values                                                          Mô tả
=========  =====================================================================  ============================
``schema`` Array ``[{label, fields:[{key, label, type, options?}]}]``             Cấu trúc form
``values`` Object                                                                 Giá trị hiện tại
``title``  String                                                                 Tiêu đề dialog
``icon``   String                                                                 Icon FAB
``ui``     ``modern`` ``spatial``
=========  =====================================================================  ============================

**Field types:** ``text`` ``select`` ``photor-upload`` ``checkbox`` ``toggle`` ``textarea`` ``colors`` ``texts``

**Events:** ``setting-save``, ``setting-preview``, ``setting-cancel``.

**Ví dụ cơ bản**

.. code-block:: html

   <web-setting
     title="Cài đặt giao diện"
     icon="settings"
     schema='[{"label":"Màu sắc","fields":[{"key":"primary","label":"Màu chính","type":"colors"}]}]'
     values='{"primary":"#3B82F6"}'>
   </web-setting>

----

web-fab
-------

Floating Action Button có thể kéo thả.

**Props**

============  ==================================  ======================================================
Prop          Type / values                       Mô tả
============  ==================================  ======================================================
``icon``      String                              Icon hiển thị
``badge``     String                              Số/chữ hiển thị trong chấm nhỏ góc phải-trên (vd số
                                                    lượng giỏ hàng) — falsy thì ẩn chấm
``position``  ``fixed`` ``absolute`` ``static``   Loại CSS position (mặc định ``fixed``)
``x``         String (mặc định ``"100%"``)        Toạ độ ngang. ``%`` tự bù kích thước phần tử (0%=sát
                                                    trái, 100%=sát phải — công thức giống
                                                    ``background-position``); đơn vị khác (px/rem/calc)
                                                    là inset thô từ mép trái, không tự bù
``y``         String (mặc định ``"1rem"``)        Toạ độ dọc, cùng quy tắc như ``x`` (0%=sát trên,
                                                    100%=sát dưới)
``size``      ``sm`` ``md`` ``lg``
``variant``   ``primary`` ``secondary`` ``base``  Màu nền nút
``movable``   Boolean                             Cho phép kéo thả vị trí (không dùng tên ``draggable``
                                                    — trùng thuộc tính HTML gốc, kích hoạt native
                                                    drag-and-drop của trình duyệt). Sau khi kéo, ``x``/``y``
                                                    hết tác dụng cho tới khi element được tạo lại.
``ui``        ``modern`` ``spatial``
============  ==================================  ======================================================

**Events:** ``drag`` trong khi kéo.

**Ví dụ cơ bản**

.. code-block:: html

   <web-fab icon="plus" x="100%" y="1rem" size="md" variant="primary"></web-fab>

   <!-- Góc dưới-trái: cách mép trái 2rem, gần sát đáy (% tự bù) -->
   <web-fab icon="plus" x="2rem" y="90%"></web-fab>

----

web-impact
----------

Overlay pháo hoa/ăn mừng toàn màn hình, vẽ bằng ``<canvas>`` (không DOM/CSS animation, không phụ
thuộc thư viện nào) — dùng cho khoảnh khắc ăn mừng (vd owner vừa tạo mã khuyến mãi mới, xem
``svc-channel.js``). Mỗi lượt ăn mừng bắn nhiều đợt nổ (``bursts``), MỖI đợt vị trí (x, y) ngẫu
nhiên trong khung hình và kiểu nổ ngẫu nhiên trong ``types``. 1 canvas + 1 vòng
``requestAnimationFrame`` tự quản mảng particle (không qua Lit reactive state) để chịu được số
lượng lớn particle cùng lúc mà không giật — khác cách tiếp cận DOM+CSS keyframes của các component
particle khác trong ``apex/``.

**Kiểu nổ** (``types``, mặc định dùng ngẫu nhiên cả 7 kiểu):

- ``confetti`` — giấy vụn + kim tuyến rơi theo trọng lực
- ``chrysanthemum`` — pháo hoa hình cầu cổ điển, tia toả đều 360°, có vệt sáng
- ``ring`` — 2 vòng tròn tia đồng tâm toả đều
- ``willow`` — tia vàng mảnh, rơi rũ chậm như cành liễu
- ``heart`` — tia bắn theo hướng dọc đường cong tham số hình trái tim
- ``crossette`` — vài tia dày bắn ra, giữa đường mỗi tia tự nổ tách thành 1 chùm nhỏ
- ``palm`` — vài tia dày dài bắn hình nón hẹp lên cao rồi rũ xuống như tàu cọ

``position: fixed`` đặt thẳng lên ``:host``, cùng kỹ thuật ``web-bg`` (không
cần top-layer/Popover API — component luôn nằm gần gốc cây DOM trang, không có tổ tiên
transform/filter/backdrop-filter nào cần thoát ra). Mỗi frame ``clearRect`` xoá sạch canvas rồi vẽ
lại toàn bộ particle — không để lại trail/motion-blur (sẽ nhoè nội dung trang phía dưới); vệt sáng
của các kiểu "spark" được giả lập bằng 1 đoạn thẳng vẽ theo hướng vận tốc mỗi frame.

``bursts`` = TỔNG SỐ LẦN PHÁT NỔ trong 1 lượt ăn mừng (mỗi lần 1 kiểu + 1 vị trí ngẫu nhiên);
``duration`` = thời gian tồn tại của MỖI lần nổ, từ lúc nổ tới lúc particle sống lâu nhất tàn hẳn
(KHÔNG phải độ dài cả lượt — 2 prop độc lập, không suy ra nhau). ``duration`` áp bằng time-dilation
RIÊNG CHO TỪNG KIỂU NỔ: mỗi kiểu có 1 hằng số nội bộ ``TYPE_MAX_LIFE`` = mốc life dài nhất mà kiểu
đó được tune (vd ``willow`` tune tới 3.6s, ``ring`` chỉ 1.7s). Mỗi particle được cấp
``durScale = duration / TYPE_MAX_LIFE`` của ĐÚNG kiểu đang spawn (không dùng chung 1 baseline cho
mọi kiểu) — nhờ vậy particle sống lâu nhất của BẤT KỲ kiểu nào cũng kéo dài chính xác bằng
``duration`` giây, dù mỗi kiểu vốn tune độ dài gốc rất khác nhau. Vật lý chạy theo
``simDt = dt / durScale`` còn tuổi thọ (``life``) nhân với ``durScale`` khi spawn — quỹ đạo
(vị trí theo % vòng đời) giữ nguyên hình dạng đã tune, chỉ chạy chậm/dài ra theo thời gian thực.

``spread`` = GIÃN CÁCH CHÍNH XÁC giữa 2 lần nổ liên tiếp — lần i bắn đúng tại mốc ``i × spread``
(lần đầu ngay lập tức; random chỉ còn ở vị trí + kiểu nổ). Mặc định = ``duration/bursts`` nếu
không set riêng: CẢ LOẠT ``bursts`` lần nổ rải đều gói gọn trong đúng ``duration`` giây đầu, mỗi
lần vẫn sống đủ ``duration`` giây riêng — ``bursts`` càng lớn nhịp bắn càng dồn dập kiểu finale,
không kéo lê tổng thời gian theo số lần nổ. Vd mặc định ``bursts=36``, ``duration=12`` → ~0.33s/lần
suốt 12s đầu, lần cuối tàn hẳn ở mốc ~24s; vd ``bursts=2``, ``duration=6`` → giãn cách 3s, tổng
nhìn thấy ``(bursts-1) × spread + duration = 9s``. Giảm tốc (``drag``) áp theo
``Math.pow(drag, simDt*60)`` thay vì nhân phẳng mỗi frame — quy về "mỗi giây" nên không phụ
thuộc refresh rate/độ trễ frame thực tế; fade in/out dùng smoothstep thay vì tuyến tính — cả hai
giúp chuyển động mượt và đều hơn, nhất là khi fps dao động.

Tối ưu render: không dùng ``shadowBlur`` (thao tác đắt nhất của canvas 2D) và cũng không vẽ lớp
"halo" giả glow (stroke đặc không blur nhìn như viền cứng bao quanh tia, không ra quầng sáng) —
tia spark chỉ vẽ lõi màu sạch + chấm sáng trắng ở đầu, glitter fill hình thoi + chớp alpha; không
``save()/restore()`` từng particle (hình cần xoay đặt ma trận qua ``setTransform`` rồi trả về ma
trận dpr gốc); dọn particle chết bằng nén mảng in-place thay vì ``splice()`` từng phần tử trong
vòng lặp.

**Props**

============  ============================================  ======================================================
Prop          Type / values                                 Mô tả
============  ============================================  ======================================================
``trigger``   Number / String                                Đổi giá trị (bất kỳ) → chạy 1 lượt ăn mừng mới. Không
                                                               đọc giá trị, chỉ so sánh đổi khác lần trước.
``types``     Array (mặc định ``null`` = cả 7 kiểu)           Danh sách kiểu nổ được phép chọn ngẫu nhiên mỗi đợt —
                                                               xem danh sách kiểu ở trên.
``bursts``    Number (mặc định ``36``)                        Tổng số LẦN PHÁT NỔ / lượt ăn mừng — mỗi lần vị trí +
                                                               kiểu ngẫu nhiên riêng. Set trực tiếp qua prop, KHÔNG
                                                               suy ra từ ``duration``.
``duration``  Number — giây (mặc định ``12``)                 Thời gian tồn tại của MỖI lần nổ, từ lúc nổ tới lúc tàn
                                                               hẳn (time-dilation, xem mô tả ở trên) — không phải độ
                                                               dài cả lượt ăn mừng.
``spread``    Number — giây (mặc định ``null``)                Giãn cách chính xác giữa 2 lần nổ liên tiếp (lần i bắn
                                                               đúng tại ``i × spread``). Mặc định ``null`` = tự tính
                                                               = ``duration/bursts`` (cả loạt gói trong ``duration``
                                                               giây đầu); set số để ghi đè.
``scale``     Number (mặc định ``1``)                         Hệ số nhân số particle mỗi đợt nổ — giảm để nhẹ máy hơn.
``colors``    Array (mặc định ``null`` = bảng màu có sẵn)      Bảng màu tuỳ biến cho các kiểu dùng palette chung
                                                               (``confetti``/``chrysanthemum``/``ring``/``crossette``).
``auto``      Boolean (mặc định ``false``)                    ``true`` = tự chạy 1 lượt ngay sau khi mount, không cần
                                                               chờ đổi ``trigger``.
============  ============================================  ======================================================

**Không có event** — component tự dọn particle sau khi đợt ăn mừng kết thúc, không cần parent can thiệp.

**Ví dụ cơ bản**

.. code-block:: html

   <!-- _giftRainKey tăng dần mỗi lần cần bắn 1 lượt mới — mặc định 36 lần nổ rải đều trong 12s
        đầu (~0.33s/lần), mỗi lần sống 12s → lần cuối tàn hẳn ở mốc ~24s -->
   <web-impact trigger=${this._giftRainKey}></web-impact>

   <!-- Nhẹ nhàng hơn: 2 lần nổ, mỗi lần sống 6s, lần 2 bắn tại mốc 3s → tổng nhìn thấy 9s -->
   <web-impact trigger=${this._giftRainKey} bursts="2" duration="6"></web-impact>

   <!-- Ghi đè giãn cách: 3 lần cách nhau đúng 2s, mỗi lần vẫn sống 12s -->
   <web-impact trigger=${this._giftRainKey} bursts="3" spread="2"></web-impact>

   <!-- Giới hạn chỉ 2 kiểu, ít particle hơn cho máy yếu -->
   <web-impact trigger=${this._key} types='["heart","confetti"]' scale="0.6"></web-impact>

   <!-- Tự chạy ngay khi mount, không cần trigger -->
   <web-impact auto></web-impact>

   <!-- Giữa màn hình theo cả 2 trục -->
   <web-fab icon="plus" x="50%" y="50%"></web-fab>

----

.. note::

   Tất cả component trong ``web-apex`` đều sử dụng Shadow DOM (trừ ``web-boxs`` dùng Light DOM).
   Sự kiện đều được dispatch với ``bubbles: true, composed: true`` để vượt qua Shadow DOM boundary.
   Màu sắc trong ``makes`` / ``config`` chỉ được phép dùng CSS variable hệ thống, không hardcode hex/rgb.
