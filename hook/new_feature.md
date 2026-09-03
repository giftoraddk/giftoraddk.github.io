# Part-time Talent Marketplace — Technical Design

> Bản gốc (product vision) đã được giữ lại ở §11–§13. Toàn bộ phần còn lại được viết lại để map
> trực tiếp vào schema (`docs/SCHEMA.rst`) và kiến trúc Conductor / Web Boxs / Micro Services
> (`docs/ARCHITECT.rst`) hiện có — **không tạo bảng mới trừ khi không thể tái dùng `records` /
> `users` / `invoice` / `hubs`**.

.. mục lục nhanh: 0 Phạm vi · 1 Data Model · 2 State Machines · 3 Xu · 4 Verification/Trust ·
   5 Contact Masking · 6 RBAC · 7 Domain Scaffold · 8 Pages/Sections · 9 MVP Task List ·
   10 Phase 2/3 · 11 UX Principles · 12 Core Loop · 13 Rủi ro & quyết định cần chốt

---

## 0. Phạm vi

Marketplace kết nối **Employer** (thuê) và **Talent** (nhận việc); một `users` row có thể mang cả
hai vai trò. Giá trị cốt lõi:

> Tìm đúng người → kiểm chứng năng lực → thương lượng → thanh toán → hoàn thành → đánh giá → tích
> lũy uy tín.

Nguyên tắc thiết kế bắt buộc khi map vào source hiện tại:

- **`docs/SCHEMA.rst` mô tả field vocabulary dùng chung** (title/description/content/tags/pics/
  pricing/score/status/scope/secure/meta...), **không phải 1 collection Firestore vật lý duy nhất**
  — đã xác nhận qua code thật: `posts`/`products`/`orders`/`bays`/`invoices`/`hubs` đều là collection
  **riêng** (`createService('posts')`, `createService('bays')`, ...), `records.js`
  (`src/services/schemas/admin/records.js`) chỉ là **field schema chung cho `svc-admin`**, không
  phải tên collection. Theo đúng convention này, `talent`/`job`/`proposal`/`wallet_txn` cũng là
  **collection riêng** (`talents`/`jobs`/`proposals`/`walletTxns`) nhưng **dùng chung field
  vocabulary** của `records` trong `docs/SCHEMA.rst` — mọi chỗ dưới đây ghi `mode: 'talent'` nghĩa
  là "field shape giống records, mode chỉ còn ý nghĩa tài liệu/lọc nội bộ nếu cần", **không phải**
  1 giá trị cột `mode` filter trên 1 bảng chung.
- **Tái dùng field thật trước, chỉ rơi xuống `meta.xxx` khi không có field phù hợp** — đúng quy tắc
  đã áp dụng cho mọi loại dữ liệu khác trong `docs/SCHEMA.rst`.
- **Không phình bảng mới**: Proposal + Negotiation + Deal gộp làm **một** record (`mode:
  'proposal'`) tiến hoá qua `meta.stage`, theo đúng mẫu `major/sub` mà `webs/pay` đã dùng cho đơn
  hàng (`docs/PAY.rst`) — thay vì tạo record mới ở mỗi bước.
- **`invoice` đã tồn tại cho thanh toán thật (VNĐ)** — tái dùng nguyên vẹn cho phần escrow của
  Deal, không tạo bảng thanh toán riêng.
- **Xu (platform credit) là khái niệm hoàn toàn mới**, không có primitive nào trong codebase hiện
  tại (đã grep `wallet`/`credit`/`escrow` — chỉ tồn tại dưới dạng config tài khoản nhận tiền tĩnh
  trong `webs/pay`, không phải ledger). Thiết kế tối giản ở §3.
- **`records.scope` + `records.secure`** (ACL có sẵn) là primitive để ẩn/mở contact — không cần cơ
  chế mask mới.
- Domain mới là **leaf domain** `src/webs/talent/`, không import ngược từ `bay`/`pay`/`socials`;
  kết nối bằng props khi mount (giống nguyên tắc isolation của `webs/pay` trong `docs/PAY.rst`).

---

## 1. Data Model

### 1.1 Tổng quan mapping

| Khái niệm sản phẩm | Firestore collection | `mode`* | Ghi chú |
| --- | --- | --- | --- |
| Talent professional profile | `talents` | `talent` | 1 record / user, `user_id` FK |
| Job posting / đề nghị thuê trực tiếp | `jobs` | `job` | employer tạo, `user_id` = employer |
| Proposal + Negotiation + Deal | `proposals` | `proposal` | 1 record duy nhất tiến hoá theo `meta.stage` |
| Review | `reviews`** | `review` | mode đã có trong convention table của SCHEMA.rst nhưng chưa có collection/implementation |
| Giao dịch Xu | `walletTxns` | `wallet_txn` | append-only, không update sau khi tạo |
| Danh mục ngành nghề | config tĩnh (MVP) → collection `categories` (Phase 2) | — | xem §1.10 |
| Escrow thanh toán Deal (VNĐ thật) | `invoices` (server `'invoices'`, xem `_invoiceSvc()` trong `webs/pay`) | — | tái dùng nguyên collection, `order_id` → `proposals.id` |
| Landing page marketplace / theo category | `hubs` | — | `link: '/talent'`, `link: '/talent/backend-developer'`, ... |
| Talent/Employer role label | `users.roles` | — | thêm token `talent` / `employer` (không thay thế `user/editor/admin`) |
| Xu balance hiện tại | `users.meta.xuBalance` | — | cache, nguồn sự thật vẫn là tổng `walletTxns` |

\* Cột `mode` giữ lại trên mỗi record cho nhất quán tài liệu/khả năng gộp collection sau này, không
dùng để filter (mỗi collection đã tách sẵn theo type). \*\* `reviews` là collection mới, độc lập với
`posts`/`products` — không đụng vào collection nào khác.

### 1.2 `mode: 'talent'` — Professional Profile

| Field | Dùng cho |
| --- | --- |
| `user_id` | FK → `users.id`, chủ hồ sơ |
| `title` | Professional title, vd `"Backend Developer"` |
| `description` | Bio ngắn hiển thị trên card |
| `content` | Bio đầy đủ (profile detail) |
| `tags` | Skills, pipe-separated: `'nodejs\|python\|postgresql\|aws'` — dùng luôn cơ chế filter theo `tags` đã có (`sift`, xem `docs/SERVICES.rst`) |
| `pics` | Portfolio images (`avatar` chính lấy từ `users.avatar`, không lặp lại ở đây) |
| `pricing` | **Redefine cho mode này**: `rateMin~rateMax~unit` (vd `'300000~450000~hour'`) — tái dùng 3 slot của format `price~cost~unit` với ngữ nghĩa khác, giống cách `mode: 'order'` tái dùng `meta.items` khác `mode: 'product'` |
| `score` | `avg~count` tổng — parse/update dùng đúng công thức trong `docs/SCHEMA.rst` §`score format` |
| `status` | `draft` (chưa publish) → `active` (hiển thị + đang nhận việc) → `inactive` (tạm ẩn) → `archived` |
| `scope` / `secure` | `public` mặc định; `secure` chỉ dùng để cấp quyền xem `meta.contact` (xem §5) |
| `meta` | xem bên dưới |

```js
// mode: 'talent'
{
  category: 'technology', subCategory: 'backend-developer',
  experienceYears: 4,
  availability: 'available',        // available | busy | unavailable
  hoursPerWeek: '15-20',
  workMode: 'remote',                // remote | onsite | hybrid
  location: 'Ho Chi Minh City',
  languages: ['vi', 'en'],

  ratings: { quality: 4.9, communication: 5.0, deadline: 4.8, professional: 4.9, value: 4.8 },
  stats: { completedJobs: 23, totalProjects: 28, completionRate: 0.96, reviewRate: 0.94, repeatClients: 5 },

  verification: { professional: false, transaction: false, transactionCount: 0, topRated: false },
  trustScore: 0,                     // công thức xem §4.4

  contact: { phone: '0909123456', email: 'a@b.com', zalo: '', whatsapp: '', telegram: '' },
  workHistory: [{ title, org, period, verified }],
}
```

`ratings` / `stats` / `verification.transactionCount` được **tính lại (recompute), không cộng dồn
thủ công**, mỗi khi có `review` hoặc `proposal` mới hoàn tất — dùng cùng kỹ thuật read-modify-write
đã mô tả cho `meta.views`/`meta.likes` trong `docs/SCHEMA.rst` (`bumpMeta`,
`src/webs/socials/tools/service.js`), chấp nhận rủi ro sai lệch nhỏ khi 2 request ghi gần đồng
thời — cùng mức rủi ro nền tảng đã chấp nhận cho counters khác.

### 1.3 `mode: 'job'` — Job Posting / Direct Hire Request

Dùng chung cho 2 luồng ở §11 (Employer Flow) và §12 (đề nghị thuê trực tiếp từ profile): nếu
`meta.talentId` có giá trị ngay từ đầu → đây là request thuê trực tiếp 1 talent cụ thể (job không
public); nếu rỗng → job public, nhận proposal từ nhiều talent.

| Field | Dùng cho |
| --- | --- |
| `user_id` | Employer tạo job |
| `title`/`description`/`content` | Tên job, mô tả ngắn, JD đầy đủ |
| `tags` | Skill yêu cầu |
| `pricing` | `budgetMin~budgetMax~unit` |
| `status` | `draft` → `published` → `closed` (đã chọn được talent) → `expired` / `cancelled` |
| `meta` | `{ category, subCategory, jobType: 'hourly'|'fixed', hoursPerWeek, durationWeeks, startDate, talentId: '' , proposalCount: 0, hiredProposalId: '' }` |

Job **không** tự chứa lifecycle thương lượng — mọi thứ từ "Proposal Received" đến "Reviewed" nằm
trong record `proposal` (xem §2.2), `job.status = 'closed'` chỉ đánh dấu đã có deal, tránh 2 nguồn
sự thật cho cùng 1 trạng thái.

### 1.4 `mode: 'proposal'` — Negotiation & Deal (1 record duy nhất)

Đây là record trung tâm — thay thế cả 3 khái niệm Proposal / Deal / (một phần) Job execution ở bản
gốc để tránh tạo bảng `deals` riêng.

| Field | Dùng cho |
| --- | --- |
| `user_id` | Người tạo proposal ban đầu (thường là Employer; có thể là Talent nếu Talent chủ động ứng tuyển job public) |
| `title` | copy từ job title hoặc `"Đề nghị thuê trực tiếp"` |
| `pricing` | Rate đang đề xuất **hiện tại** trong vòng thương lượng: `rate~~unit` (slot `cost` bỏ trống — không cần) |
| `quantity` | Số giờ/tuần đang đề xuất (tái dùng cột INTEGER có sẵn thay vì thêm field mới) |
| `status` | coarse, hợp pháp: `open` (đang thương lượng) → `accepted` / `declined` → `cancelled` / `expired` |
| `meta.jobId` | FK → `records.id` (`mode: 'job'`), rỗng nếu request trực tiếp không qua job posting |
| `meta.talentId` / `meta.employerId` | FK → `users.id` |

```js
// mode: 'proposal' — meta
{
  jobId: 'rec_job_01', talentId: 'usr_talent', employerId: 'usr_employer',

  // [1] NEGOTIATION — lịch sử đề xuất/phản hồi, append-only
  stage: 'negotiating',   // proposed -> negotiating -> accepted -> in_progress -> submitted -> completed -> reviewed
  subStatus: null,        // null | cancel_requested | cancelled | disputed | refunded | expired
  history: [
    { actor: 'usr_employer', action: 'proposed',  rate: 350000, hoursPerWeek: 20, weeks: 4, message: '...', ts: '2026-08-20T10:00:00Z' },
    { actor: 'usr_talent',   action: 'countered', rate: 380000, hoursPerWeek: 20, weeks: 4, message: '...', ts: '2026-08-20T14:00:00Z' },
  ],

  // [2] DEAL — chốt khi stage chuyển 'accepted', copy từ history[last]
  deal: { rate: 380000, hoursPerWeek: 20, weeks: 4, startDate: '2026-09-01', endDate: '2026-09-28',
          scope: 'Backend/API support', estimatedTotal: 30400000 },

  // [3] EXECUTION — cập nhật khi work in progress / hoàn thành
  invoiceId: '',          // set sau khi employer thanh toán escrow — FK -> invoice.id
  contactUnlockedAt: null,
  completedAt: null, reviewedAt: null,
}
```

State machine đầy đủ ở §2.2 — đây chính là mẫu `major/sub` mà `webs/pay` đã dùng cho
`invoice.meta` (`docs/PAY.rst`), áp lại cho negotiation thay vì shipping.

### 1.5 `mode: 'review'`

Mode này **đã được khai báo trong convention table của `docs/SCHEMA.rst`** nhưng chưa có
implementation trong repo (đã xác nhận qua grep) — đây là lần đầu hiện thực hoá.

| Field | Dùng cho |
| --- | --- |
| `user_id` | Reviewer (Employer) |
| `content` | Comment |
| `score` | `rating~1` — 1 review = 1 rating, dùng lại đúng format `avg~count` nhưng count luôn = 1 ở record gốc; **aggregate** nằm ở `talent.meta.ratings`, không tính trung bình tại đây |
| `meta` | `{ proposalId, talentId, employerId, breakdown: { quality, communication, deadline, professional } }` |

**Điều kiện tạo hợp lệ** (server-side, trong `tools/service.js`, không chỉ UI-side):
`proposal.status === 'accepted'` và `proposal.meta.stage === 'completed'` và
`review.user_id === proposal.meta.employerId` và chưa tồn tại review nào khác cùng `proposalId` —
đúng nguyên tắc "Chỉ review từ giao dịch thật" + "Một giao dịch không tạo nhiều review" ở bản gốc
§4.3.

### 1.6 `mode: 'wallet_txn'` — Xu Ledger

Xem thiết kế đầy đủ ở §3. Ghi chú riêng cho row shape:

| Field | Dùng cho |
| --- | --- |
| `user_id` | Chủ ví |
| `status` | luôn `'active'` — record bất biến (không update, không xoá) |
| `meta` | `{ type: 'topup'|'spend'|'refund', amount: 50, reason: 'send_proposal', refId: 'rec_proposal_01', balanceAfter: 1200 }` |

### 1.7 `users` — role label & profile meta

- Thêm token `talent` và/hoặc `employer` vào `users.roles` (pipe-separated, cộng thêm bên cạnh
  `user`/`editor`/`admin` đã có) — **đây là nhãn UI cho việc bật/tắt "chế độ" trong app, không phải
  capability RBAC** (phân biệt rõ ở §6.1, tránh nhầm với `docs/AUTH_ROLES.rst`).
- `users.meta.xuBalance` — cache số dư Xu hiện tại (số nguyên), cập nhật read-modify-write mỗi lần
  có `wallet_txn` mới.

### 1.8 `invoice` — Escrow cho Deal (tái dùng nguyên bảng)

Khi `proposal.meta.stage` chuyển sang `accepted` và Employer xác nhận thanh toán:

- Tạo 1 row `invoice` mới: `order_id = proposal.id`, `seller` = thông tin Talent
  (`accountName~accountNo~bank~name~phone~address~email~taxCode~talentUserId`), `buyer` = thông tin
  Employer, `items` = 1 dòng dịch vụ (`"<jobTitle>~<rate>~hour~<hours>~0~<amount>~<vat>~<vatAmount>"`),
  `summary = subTotal~vatAmount~total`.
- `invoice.status`: `draft` (tạo trước khi employer bấm thanh toán) → `issued` (đã thanh toán, tiền
  đang giữ ở platform — escrow) → không đổi thành `cancelled` trừ khi Deal bị huỷ trước khi hoàn
  thành.
- **Escrow "giữ tiền" và "release"** không phải trạng thái hợp pháp của `invoice.status` (invoice
  là văn bản pháp lý bất biến sau `issued`, theo đúng nguyên tắc trong `docs/SCHEMA.rst` §"Điểm
  khác biệt so với records") — trạng thái escrow (`held` → `released` → `refunded`) sống ở
  `proposal.meta.escrow`, đúng mẫu tách "trạng thái pháp lý" khỏi "trạng thái vận hành" mà
  `docs/PAY.rst` đã áp dụng cho `invoice.meta.major/sub`.
- Kênh nhận tiền tái dùng `wallet` (bank/momo static info) đã có sẵn trong `webs/pay` — Employer
  chuyển khoản/quét VietQR vào tài khoản platform, không phải tài khoản Talent trực tiếp.

### 1.9 `hubs` — Landing page overlay (không phải cơ chế render trang)

`hubs` **không tự render trang** — nó chỉ là overlay admin-editable (theme/colors/bg/section-config
preset) đè lên 1 trang đã tồn tại, đọc bởi `src/webs/setting/tools/service.js` (`<svc-setting
link="...">`, xem cách `Shop.astro` dùng `link="/shop"`). `/talent` vẫn cần viết tay
`src/pages/talent/index.astro` + `src/modules/talent-page.js` (§8) — `hubs` row bên dưới chỉ cho
phép chỉnh theme/section preset qua `<svc-setting link="/talent">` sau khi trang đã tồn tại, không
thay thế module/page đó.

```js
// hubs row: link = '/talent'
{
  title: 'Talent Marketplace', link: '/talent', tags: 'talent',
  meta: {
    sections: [
      { id: 'talentSearchFilter', dataTable: '', configKey: 'talent/directory/filter' },
      { id: 'talentDirectoryGrid', dataTable: 'talents', dataSrc: '',
        showSearch: true, emptyText: 'Không tìm thấy Talent phù hợp',
        tags: { filterField: 'tags', filterColor: 'primary' },
        configKey: 'talent/directory/card' },
    ],
  },
}
```

`dataTable: 'talents'` trỏ thẳng vào collection riêng (§1.1) — **không cần filter theo `mode`** như
suy nghĩ ban đầu (`records` không phải 1 collection chung), collection đã tách sẵn theo type. Trang
theo category (`/talent/backend-developer`) dùng chung `talentDirectoryGrid` section nhưng set thêm
`sift()`-side filter theo `tags` (client-side, xem `docs/SERVICES.rst` §`sift`) — không cần query
Firestore riêng theo category.

### 1.10 Categories — data-driven nhưng không cần bảng mới ở MVP

Bản gốc §18 yêu cầu category "data-driven, không hard-code vào UI". Đề xuất tối giản (theo nguyên
tắc ưu tiên tái dùng trước khi thêm bảng):

- **MVP**: 1 file registry tĩnh `src/webs/talent/tools/categories.js` (export mảng
  `{ id, parentId, label }`) — đủ "data-driven" theo nghĩa UI không hard-code chuỗi, nhưng chưa cần
  CRUD admin.
- **Phase 2**: nếu cần admin tự thêm ngành nghề qua UI mà không deploy lại, chuyển sang
  `records mode: 'category'` (`tags = slug`, `meta.parentId`, `index` cho thứ tự) — migrate 1
  chiều, không cần thiết kế lại chỗ khác vì mọi nơi filter theo category đều dùng `tags`.

---

## 2. State Machines

### 2.1 Job lifecycle

`records.status` (`mode: 'job'`) giữ **thô, hợp pháp**: `draft → published → closed`, cộng nhánh
ngoại lệ `expired` / `cancelled`. Các bước trung gian ở bản gốc §15
("Proposal Received / Negotiating / Hired / In Progress / Submitted / Completed / Reviewed")
**không** nằm trên `job` — chúng là `proposal.meta.stage` của (các) proposal gắn với job đó, vì 1
job public có thể có nhiều proposal cùng lúc ở các stage khác nhau. `job.status = 'closed'` chỉ set
khi có đúng 1 proposal đạt `stage: 'accepted'`.

### 2.2 Proposal / Negotiation / Deal — `meta.stage` + `meta.subStatus`

Áp lại chính xác mẫu `major/sub` đã dùng cho đơn hàng trong `docs/PAY.rst`
(`MAJOR_STEPS`/`SUB_STEPS`) — thay steps giao hàng bằng steps thương lượng:

```text
proposed → negotiating (0..n lần counter) → accepted ─┬─→ in_progress → submitted → completed → reviewed
                                            └─→ declined

subStatus (song song, không thay thế stage):
  null → cancel_requested → cancelled
                          ↘ (từ chối cancel) → quay lại stage trước đó
  bất kỳ lúc nào (do admin) → disputed → resolved | refunded
  proposed/negotiating quá hạn (48h không phản hồi) → expired
```

- Mỗi lần đổi `stage`/thêm `history[]` entry: **read-modify-write** `findById` → merge `meta` →
  `update` (JSONB không tự deep-merge, đúng cảnh báo trong `docs/CRUD.rst`).
- Ai thao tác được ghi lại theo kiểu tilde-encode `"<ts>~<userId>~<name>~<action>"` — cùng kỹ thuật
  `parseHandler()` mà `webs/pay` dùng để lưu "ai xác nhận bước nào" (`docs/PAY.rst`).
- Auto-expire sau 48h không phản hồi: polling phía client (`_dcMaybeAutoExpire()` trong
  `svc-proposal.js`), không dùng cron — đúng constraint site tĩnh, cùng kỹ thuật auto-confirm 15
  phút của `webs/pay`.
- `records.actors` (rolling, tối đa 9 entry) vẫn được cập nhật song song cho audit nhanh
  (`created`/`updated`) — độc lập với `meta.history` (log nghiệp vụ chi tiết).

### 2.3 Escrow payment

```text
invoice: draft → issued (tiền đã vào platform)
proposal.meta.escrow: null → held → released (khi employer confirm completed)
                                   ↘ refunded (khi dispute nghiêng về employer / job bị huỷ giữa chừng)
```

`released`/`refunded` chỉ là **trạng thái vận hành** trong `proposal.meta`, invoice vẫn giữ nguyên
`issued` (không có trạng thái `released` ở tầng invoice vì invoice là văn bản kế toán, không phải
sổ theo dõi tiền treo — tách bạch đúng nguyên tắc đã nêu ở §1.8).

---

## 3. Xu (Credit) System

### 3.1 Phân biệt Xu vs Escrow

Bản gốc dùng chung từ "Thanh toán" cho cả 2 khái niệm khác nhau — cần tách rõ khi implement:

| | Xu | Escrow (invoice) |
| --- | --- | --- |
| Mục đích | Phí hành động (gửi proposal, mở contact, feature...) | Giá trị công việc thật (VNĐ) |
| Nạp | Employer mua Xu qua chuyển khoản/QR, admin duyệt cộng | Employer chuyển khoản trực tiếp theo Deal |
| Lưu ở | `wallet_txn` + `users.meta.xuBalance` | `invoice` (đã có sẵn) |
| Rút/hoàn | Refund Xu (record `type:'refund'`) | `proposal.meta.escrow = 'refunded'` |

### 3.2 Ledger + balance cache

- **Nguồn sự thật**: tổng các `wallet_txn` của 1 user (append-only, không update).
- **Cache hiệu năng**: `users.meta.xuBalance` — cộng/trừ ngay khi tạo `wallet_txn` mới, theo đúng
  pattern read-modify-write + chấp nhận rủi ro nhỏ lệch số khi 2 request gần như đồng thời, y hệt
  cách `docs/SCHEMA.rst` đã chấp nhận cho `meta.views`/`meta.likes` (phù hợp traffic marketplay
  cá nhân/SME, không phải sàn giao dịch tài chính tần suất cao).
- Không cần bảng/Firestore project riêng ở MVP (khác `invoice` vốn tách bảng vì lý do pháp lý) —
  Xu chỉ là điểm thưởng nội bộ, rủi ro thấp hơn nhiều so với escrow tiền thật.
- Nếu về sau cần audit chặt (đối soát nạp Xu bằng tiền thật ở scale lớn), migrate sang server
  Firestore riêng qua `registerAdapter` (`docs/CRUD.rst`) — không đổi shape `wallet_txn`.

### 3.3 Bảng giá & flow spend

Giữ nguyên bảng giá đề xuất ở bản gốc §8 làm default (cần A/B test sau), implement là 1 map hằng số
`XU_COSTS` trong `src/webs/talent/tools/constant.js`:

```js
export const XU_COSTS = { send_proposal: 50, hire_request: 100, unlock_contact: 100, featured_request: 200 }
```

Flow chi Xu (trong `tools/service.js`):

```
[1] CHECK — users.meta.xuBalance >= XU_COSTS[action]? không đủ → chặn, hiện CTA "Mua Xu"
[2] PROCESS — balanceAfter = balance - cost
[3] EXECUTE — create wallet_txn (type:'spend', amount:-cost, refId, balanceAfter)
            — update users.meta.xuBalance = balanceAfter (read-modify-write)
            — thực hiện hành động chính (tạo proposal / mở contact / ...)
[4] RETURN — balance mới cho UI
```

Xem miễn phí (card/profile/review) **không** trừ Xu, đúng nguyên tắc bản gốc §8–9 (không chặn
khám phá marketplace).

---

## 4. Verification & Trust Score

### 4.1 Professional Verified

- Action ghi vào `talent.actors` với action mới `'verified'` (mở rộng enum actors ngoài 7 giá trị
  có sẵn trong `docs/SCHEMA.rst`, tương thích ngược vì `actors` chỉ parse tự do theo `~`).
- Yêu cầu capability `talents.approve` (table = tên collection số nhiều, đúng convention
  `TABLES_STD`/`roleCaps(preset, table)` trong `src/webs/auth/svc-roles.js`) — **tái dùng capability
  `approve` có sẵn trong
  `ROLE_PRESETS.moderator`** (`src/services/schemas/roles-constant.js`), không tạo capability mới:
  `ROLE_PRESETS` là danh sách cố định dùng chung mọi table (`roleCaps(preset, table)` chỉ nối chuỗi
  `${table}.${cap}`), không hỗ trợ capability tuỳ biến per-table.
- Set `talent.meta.verification.professional = true` (+ optional `meta.verification.verifiedBy`,
  `verifiedByOrg` nếu công ty xác nhận) — không cần bảng `revisions`-style riêng ở MVP vì tần suất
  thấp và `actors` đã đủ audit; nếu sau này cần lưu **bằng chứng** (file chứng chỉ, ai duyệt, snapshot
  lý do), tái dùng đúng schema của `revisions` (`docs/AUTH_DIFFS.rst`) thay vì thiết kế bảng mới.

### 4.2 Transaction Verified

Tính **tự động**, không thao tác thủ công: mỗi khi 1 `proposal` chuyển `stage: 'completed' →
'reviewed'` thành công, recompute `talent.meta.verification.transactionCount` = đếm số `proposal`
với `talentId = X AND meta.stage = 'reviewed'` và set `verification.transaction = true` khi
count ≥ 1 — khớp đúng flow bản gốc §4.2 (`Job tạo → nhận → thanh toán → hoàn thành → xác nhận →
review → Transaction Verified`).

### 4.3 Rating Verified

Đã đảm bảo tại nguồn vì `review` chỉ được tạo qua điều kiện ở §1.5 (gắn với `proposal` thật, 1
review/proposal, reviewer phải đúng employer của deal đó) — không cần bước verify thêm.

### 4.4 Trust Score

Công thức tường minh (không phụ thuộc hoàn toàn vào rating, đúng nguyên tắc bản gốc §20), tính lại
mỗi khi `talent.meta.stats`/`verification` thay đổi:

```js
function computeTrustScore(meta) {
  const v = meta.verification, s = meta.stats
  return Math.round(
    (v.professional ? 30 : 0) +
    Math.min(s.completedJobs, 25) +                 // +1/job, cap 25
    (meta.ratings ? avgOf(meta.ratings) / 5 * 20 : 0) +
    s.reviewRate * 10 +
    Math.min(s.repeatClients, 5) +
    4 // account history — placeholder cố định MVP, refine Phase 2
  )
}
```

---

## 5. Contact Masking & Privacy

### 5.1 Nguyên tắc

`talent.scope = 'public'` (card/profile/review luôn xem free — đúng bản gốc §9 "hồ sơ cơ bản nên
được xem miễn phí"), nhưng UI **không bao giờ render** `talent.meta.contact` thật — luôn hiển thị
bản mask (`+84 *** *** 123`, `n***@gmail.com`) trừ khi user hiện tại có quyền `read` trên field đó.

### 5.2 Unlock flow

```
proposal.meta.stage = 'accepted' (Talent đồng ý)
   ↓
Employer trả 100 Xu (unlock_contact, §3.3) hoặc escrow đã issued
   ↓
talent.secure += ',<employerId>~read'     // ACL entry format đúng docs/SCHEMA.rst
proposal.meta.contactUnlockedAt = now()
   ↓
UI check: secure.split(',').some(e => e.startsWith(currentUserId + '~') && e.includes('read'))
   → true: render contact thật; false: render mask
```

Không cần thêm cột/bảng — tái dùng 100% `secure` đã có sẵn cho mục đích ACL generic.

### 5.3 Anti-circumvention (Phase 2)

Phát hiện SĐT/email/link/Zalo ID/Telegram trong nội dung chat nội bộ — quét phía client trước khi
gửi (regex), cảnh báo hoặc che theo policy. Không thuộc MVP (marketplace chưa có `webs/chat` domain
sẵn để hook vào — cân nhắc tái dùng `docs/CHATS.rst` P2P chat khi triển khai).

---

## 6. RBAC

### 6.1 Hai hệ thống "role" khác nhau — không nhầm lẫn

- **`users.roles` hiện có** (`user`/`editor`/`admin`) — capability RBAC toàn hệ thống, dùng bởi
  `auth.isAdmin()`/`auth.hasRole()` (`docs/ARCHITECT.rst` §Auth Service).
- **Nhãn marketplace mới** (`talent`/`employer`) — chỉ để UI biết hiển thị "chế độ" nào (switch
  giữa Talent Dashboard / Employer Dashboard khi user có cả 2 token), **không** cấp thêm quyền hệ
  thống. Lưu chung field `users.roles` (pipe-separated, cộng thêm) vì đây vẫn đúng semantic "vai
  trò của user", nhưng permission check thật (`hasAccess(parseRoles(user).roles, '{table}.{cap}')`
  trong `src/webs/auth/tools/service.js` — **không phải `can()`**, hàm đó không tồn tại trong repo)
  chỉ nhìn `admin`/`{table}.{capability}` — 2 token mới không tham gia check này.

### 6.2 Capability — tái dùng nguyên `ROLE_PRESETS`, không tạo capability mới

`ROLE_PRESETS` (`src/services/schemas/roles-constant.js`) là danh sách capability **cố định, dùng
chung cho mọi table** — `roleCaps(preset, table)` chỉ nối `${table}.${cap}`, không có cơ chế thêm
capability riêng theo table. Vì vậy `talents`/`jobs`/`proposals` (tên collection, đã thêm vào
`TABLES_STD` trong `src/webs/auth/svc-roles.js`) **tái dùng nguyên vocabulary có sẵn**, không thêm
capability mới như `verify`/`dispute_resolve`:

| Preset | Capability áp dụng cho `talents`/`jobs`/`proposals` (đã có sẵn trong `ROLE_PRESETS`) |
| --- | --- |
| `editor` | `read, create, update, save_draft, upload_media, view_history` |
| `moderator` | `comment, approve, reject, request_edit, publish, unpublish` — **`approve` dùng làm "Professional Verified" (§4.1)** |
| `admin` | toàn bộ + `delete, import, export, manage_status` — **`manage_status` dùng để admin huỷ/khoá 1 Deal đang dispute** |

Việc "thêm table mới" chỉ là thêm `'talent'`, `'proposal'` vào danh sách table mà UI `<svc-roles>`
quản lý (`TABLES_STD` trong `src/webs/auth/svc-roles.js`), rồi gọi `roleCaps('editor','talent')`/
`roleCaps('moderator','proposal')`/... khi seed role cho user — không sửa `roles-constant.js`.

---

## 7. Domain Scaffold — `src/webs/talent/`

Theo đúng cấu trúc leaf-domain của `docs/ARCHITECT.rst` §Micro Service Pattern, tham chiếu trực
tiếp 2 domain gần nhất: `src/webs/bay/` (storefront/profile scaffold) và `src/webs/pay/`
(state-machine + panel-splitting).

Chỉ **Talent Directory grid** là thuần declarative (`web-boxs` + section config, §8). **Profile
Detail** cần logic có điều kiện thật (mask contact theo quyền, badge theo `meta.verification`, nút
hành động theo `proposal.meta.stage` hiện tại) — `web-boxs`/`web-cell` không có primitive rẽ nhánh
theo giá trị data trong config khai báo, nên trang này là **1 Lit component** (`svc-talent-profile.js`)
tự fetch record qua `tools/service.js` và tự render toàn bộ, không qua `web-boxs`:

```text
src/webs/talent/
├── svc-talent-edit.js         # form tạo/sửa profile (chỉ chủ sở hữu / admin)
├── svc-talent-profile.js      # Profile Detail: hero + tabs (Overview/Verification/Experience/Reviews/Hire)
│                               # + hành động "Đề nghị thuê"/"Mở contact" (spend Xu, tạo proposal)
├── svc-job.js                 # form đăng/quản lý job
├── svc-proposal.js            # orchestrator: state hiện tại, load 1 proposal theo id
├── svc-proposal-negotiate.js  # panel thuần render: form đề xuất/counter, emit action lên svc-proposal
├── svc-proposal-deal.js       # panel thuần render: hiển thị Deal đã chốt + nút xác nhận hoàn thành
├── svc-wallet.js              # số dư Xu + lịch sử wallet_txn + nút mua Xu
├── svc-review.js              # form submit review (gate theo điều kiện §1.5)
├── styles/
│   ├── talent.css / proposal.css / wallet.css
└── tools/
    ├── service.js             # re-export conductor (state/make/get/patch/all/setFilter) + domain logic
    ├── constant.js             # XU_COSTS, STAGE, SUB_STATUS enums
    └── categories.js           # registry tĩnh (§1.10)
```

`tools/service.js` — danh sách hàm nghiệp vụ chính (theo khung 4-bước `CHECK/PROCESS/EXECUTE/RETURN`
đã chuẩn hoá trong `docs/ARCHITECT.rst` §Comment Convention):

```
createTalentProfile · updateTalentProfile · publishTalentProfile
createJob · publishJob · closeJob
createProposal · counterOffer · acceptProposal · declineProposal · cancelProposal
markInProgress · submitWork · confirmCompleted · openDispute
issueEscrowInvoice · releaseEscrow · refundEscrow
spendXu · topUpXu · refundXu
unlockContact
submitReview · recomputeTalentStats
verifyTalent
```

**Event listener đăng ký đồng bộ trước mọi `await`** trong `service.js` — bắt buộc theo
`docs/ARCHITECT.rst`.

Conductor sections (mỗi domain sở hữu section riêng, key theo id động):

- `talentDirectory` — danh sách talent cho trang `/talent`
- `talentProfile:<userId>` — 1 profile detail
- `proposal:<proposalId>` — 1 thread thương lượng
- `wallet:<userId>` — số dư + lịch sử Xu

---

## 8. Pages, Modules, Sections

| Route | Astro page | Module (`variant` + `views`) | Ghi chú |
| --- | --- | --- | --- |
| `/talent` | `src/pages/talent/index.astro` | `src/modules/talent-page.js` (`buildViews()`) | Talent Directory — 1 section `web-boxs` card grid (`dataTable:'talents'`, `loadLimit`+`filters` cho category, xem §1.9) |
| `/talent/[category]` | `src/pages/talent/[category].astro` | dùng chung `talent-page.js` (`buildViews(categoryId)`), `getStaticPaths()` từ `tools/categories.js` | native Firestore filter `meta.category` qua `loadLimit`+`filters` (không phải client `sift`) |
| `/talent/edit` | `src/pages/talent/edit.astro` | — | mount `<svc-talent-edit userId>` trực tiếp — Talent tự tạo/sửa hồ sơ |
| `/talent/profile/[id]` | `src/pages/talent/profile/[id].astro` | `getStaticPaths()` qua `fetchCollection('talents')` (đúng convention `src/pages/post/[id].astro`) | mount `<svc-talent-profile talentId>` trực tiếp — hero + `web-tabs` (overview/verification/experience/reviews/hire), KHÔNG qua `web-boxs` (xem §7 lý do) |
| `/talent/wallet` | `src/pages/talent/wallet.astro` | mount `<svc-wallet userId>` trực tiếp — riêng tư theo user đang đăng nhập |
| `/talent/proposal?id=` | `src/pages/talent/proposal.astro` | mount `<svc-proposal>`, đọc `proposalId` từ **query string** phía client — **KHÔNG** dùng `[id].astro`+`getStaticPaths` như `/talent/profile/[id]`: proposal là dữ liệu riêng tư (thương lượng 2 bên), build-time `fetchCollection()` (REST+API key, tuân theo Firestore Rules) không nên/không thể enumerate; 1 route tĩnh duy nhất + query string tránh bake nội dung riêng tư vào static HTML |

Section configs mới cần tạo trong `src/sections/talent/`, tái dùng layout gần nhất theo
`docs/SECTIONS.rst`:

| Section id | Layout gợi ý (từ SECTIONS.rst) | Vai trò |
| --- | --- | --- |
| `talentDirectoryGrid` | `teamSpatialCardGridNeat` (card 3/hàng) | Grid Talent Card đúng mockup §3 bản gốc |
| `talentProfileHero` | mẫu `M1` (text 7 + pinned image 5) trong `docs/DESIGN.rst` | Header profile (avatar, badges, rate, availability) |
| `talentReviewsMasonry` | `testimonialsSpatialMasonryNeat` | Reviews list |
| `talentPricingTabs` | `pricingSpatialTabPlans` | (nếu Talent có nhiều gói dịch vụ — Phase 2) |

`web-cell` modes cần dùng: `avatar` (`web-avatar`, status dot cho `availability`), `rating`
(`web-rating`, từ `score`), `badge` (`web-button mode="badge"`, cho verification), `currency`
(`web-currency`, cho `pricing`) — tất cả đã có sẵn trong `docs/web-apex.rst`, không cần component
mới.

---

## 9. MVP — Task List theo file

Giữ đúng phạm vi §24 bản gốc, tách theo file cụ thể để implement tuần tự:

1. **Schema**: thêm `mode: 'talent' | 'job' | 'proposal' | 'wallet_txn'` vào tài liệu convention
   (`docs/SCHEMA.rst` §"mode convention") — cập nhật doc trước khi code theo đúng thói quen của repo.
2. **`src/webs/talent/tools/constant.js`** — enum `STAGE`, `SUB_STATUS`, `XU_COSTS`, `categories.js`.
3. **`src/webs/talent/tools/service.js`** — CRUD wrapper qua `createService('talents')` /
   `createService('jobs')` / `createService('proposals')` / `createService('walletTxns')` (theo
   `docs/CRUD.rst`, mỗi collection riêng — xem §1.1) + toàn bộ hàm nghiệp vụ liệt kê ở §7.
4. **`src/sections/talent/directory/card.js`** + `filter.js` — config Web Boxs cho `/talent`.
5. **`src/modules/talent-page.js`** + `src/pages/talent/index.astro`, `[category].astro`.
6. **`svc-talent-edit.js`** — form tạo/sửa profile (Talent tự quản lý hồ sơ).
7. **`src/sections/talent/profile/hero.js`** + `src/pages/talent/profile/[id].astro` — Profile
   Detail theo IA §23.
8. **`svc-proposal.js` + `svc-proposal-negotiate.js` + `svc-proposal-deal.js`** — toàn bộ luồng
   Negotiation → Deal (§2.2).
9. **`svc-wallet.js`** — UI ví Xu + mua Xu. MVP tách 2 hàm rõ ràng vì lý do bảo mật: user tự gọi
   `requestTopUp()` (chỉ tạo `wallet_txn status:'pending'`, KHÔNG cộng balance ngay — nếu cộng ngay
   từ client, user tự cấp Xu miễn phí được), admin xác nhận đã nhận chuyển khoản rồi gọi
   `approveTopUp()` (cộng thật vào `users.meta.xuBalance` + đổi txn đó thành `'active'`) — chưa cần
   cổng thanh toán tự động.
10. **`svc-review.js`** — submit review, gọi `recomputeTalentStats`.
11. **Escrow**: hàm `issueEscrowInvoice` tái dùng đúng `createService('invoices', '', 'invoices')`
    (giống `_invoiceSvc()` trong `src/webs/pay/tools/service.js`) — không viết lại adapter mới.
12. **RBAC**: cập nhật `docs/AUTH_ROLES.rst` + capability map trong `src/webs/auth/svc-roles.js`
    thêm `talent`/`proposal` presets (§6.2).
13. **Contact masking**: helper `maskContact()` + `canReadContact(user, talent)` dùng chung, đặt ở
    `src/webs/talent/tools/service.js` (không cần domain riêng).
14. **Hub**: seed 1 row `hubs` (`link: '/talent'`) qua admin UI có sẵn (`svc-bay`/`svc-admin`
    pattern), không cần code riêng.

### Chưa cần ngay (giữ nguyên từ bản gốc)

Trust Score phức tạp hơn công thức §4.4 · AI matching · Subscription · Advanced analytics ·
Recommendation engine · Gamification.

---

## 10. Phase 2 / Phase 3

Giữ nguyên định hướng bản gốc, chỉ chú thích chỗ nào đã có nền tảng sẵn từ MVP:

**Phase 2** — Dispute system nâng cấp `subStatus: 'disputed'` đã có ở §2.2 thành flow đầy đủ (UI
admin resolve) · Advanced reputation (thay công thức tĩnh §4.4 bằng trọng số cấu hình được) ·
Repeat hire / Favorite Talent (dùng `users.connections`-style list, xem `docs/SCHEMA.rst`) · Saved
search · Notification · Calendar/Availability sync · Portfolio verification · Company verification
portal · `category` chuyển từ static file sang `records mode: 'category'` (§1.10) · Anti-circumvention
detection (§5.3) · Cổng thanh toán tự động cho mua Xu (thay quy trình admin duyệt thủ công ở MVP).

**Phase 3** — AI Talent Matching (giữ nguyên §26 bản gốc; input matching engine lấy trực tiếp từ
`talent.tags`, `talent.meta.stats`, `talent.meta.ratings`, `job.tags`, `job.pricing` — không cần
thêm field mới, chỉ cần pipeline đọc dữ liệu đã có).

---

## 11. Nguyên tắc UX

(Giữ nguyên nguyên văn từ bản gốc — vẫn đúng và không phụ thuộc kiến trúc)

- **Card**: Không cần biết mọi thứ. Chỉ cần đủ để quyết định có click hay không.
- **Profile**: Cung cấp bằng chứng để quyết định có thuê hay không.
- **Review**: Chỉ review từ giao dịch thật.
- **Verification**: Luôn nói rõ ai xác minh và xác minh điều gì.
- **Contact**: Ẩn trước khi có giao dịch/đủ điều kiện.
- **Negotiation**: Cho phép hai bên tự thương lượng nhưng mọi thỏa thuận cuối cùng phải trở thành
  Deal trên nền tảng.
- **Xu**: Thu phí cho hành động có giá trị, không chặn việc khám phá marketplace.

---

## 12. Core Marketplace Loop & North Star Metric

(Giữ nguyên bản gốc — map trực tiếp vào state machine §2)

```text
Talent đăng hồ sơ (talent, status:draft)
  → Professional Verification (§4.1)
  → status:active, xuất hiện trong Search (talentDirectory section)
  → Employer xem Card/Profile/Reviews (free, §5.1)
  → Gửi Proposal bằng Xu (proposal, stage:proposed, §3.3)
  → Negotiation (stage:negotiating, §2.2)
  → Hai bên đồng ý (stage:accepted = Deal, §1.4)
  → Payment (invoice issued, escrow held, §1.8/§2.3)
  → Contact Unlock (secure ACL, §5.2)
  → Work → Complete (stage:in_progress → completed)
  → Review (mode:review, §1.5) → recomputeTalentStats
  → Reputation tăng (trustScore, §4.4) → Talent dễ được thuê hơn → Repeat Hire (Phase 2)
```

**North Star Metric**: **Completed Paid Jobs / tháng** = số `proposal` đạt
`stage: 'reviewed' AND meta.escrow: 'released'` trong tháng — không lấy số user đăng ký hay số
`talent` record làm metric chính.

---

## 13. Rủi ro & Quyết định cần chốt

Các quyết định thiết kế mặc định đã chọn ở trên (theo hướng tối giản/tái dùng tối đa hạ tầng hiện
có) — liệt kê lại để review trước khi code, không phải câu hỏi mở:

1. **Gộp Proposal/Negotiation/Deal thành 1 record `mode: 'proposal'`** thay vì 3 bảng/mode riêng —
   giảm phức tạp, đánh đổi: query "danh sách Deal đang active" phải lọc theo `meta.stage` (không
   index native trên JSONB path, cần cân nhắc thêm generated column nếu tập dữ liệu lớn ở Phase 2).
2. **Xu lưu trong `records` (mode `wallet_txn`) thay vì bảng/Firestore project riêng** — đủ cho quy
   mô MVP; nếu volume giao dịch Xu lớn, tách bảng sau (đã note rõ đường migrate ở §3.2).
3. **Category MVP là file tĩnh, không phải bảng** — nhanh để ship, đổi ngành nghề cần deploy lại;
   chấp nhận trade-off này cho giai đoạn đầu (đường nâng cấp đã note ở §1.10).
4. **Trust Score dùng công thức cố định** (§4.4) thay vì cấu hình được — đơn giản hoá MVP, refine ở
   Phase 2 khi có đủ dữ liệu thật để tune trọng số.
5. **Bảng giá Xu ở §3.3 là giả định** (giữ nguyên từ bản gốc) — cần A/B test sau khi có traffic
   thật, không nên hard-code vĩnh viễn trong `constant.js` mà không có cơ chế đổi qua config/DB ở
   Phase 2.
