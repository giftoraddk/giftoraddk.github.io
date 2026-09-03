# GEO Content Engine — Kế hoạch kỹ thuật (bản map vào source hiện tại)

> Bản gốc (giữ ở cuối file, §Phụ lục) mô tả một **GEO SaaS đa khách hàng** (organizations/
> projects/brands/competitors, crawler, AI Runner, CMS adapter, pricing tier, Autonomous Agent…) —
> đúng cho một sản phẩm B2B bán cho nhiều doanh nghiệp khác. Repo này **không phải sản phẩm đó** —
> đây là 1 website marketing tĩnh (Astro static) của **một** doanh nghiệp, tự tối ưu nội dung
> `products`/`posts` của chính mình cho AI Search. Toàn bộ phần dưới viết lại theo đúng phạm vi
> thật này, map trực tiếp vào `docs/SCHEMA.rst` + `docs/ARCHITECT.rst` — theo cùng nguyên tắc đã áp
> dụng ở `docs/new_feature.md`: **không tạo hạ tầng mới khi cái đã có đủ dùng**.

.. mục lục nhanh — Phần A (GEO Content Engine): 0 Phạm vi thật · 1 Vì sao không cần Backend/Worker
   mới · 2 Data Model (`meta.geo`) · 3 GEO Score (heuristic khả thi) · 4 AI Engine (tái dùng
   `tensor.js`) · 5 Cơ chế kích hoạt trong Admin · 6 Domain Scaffold `webs/geo` · 7 Trang Admin
   `/admin/geo` · 8 RBAC · 9 MVP Task List · 10 Phase 2 (AI Visibility thật) · 11 Ngoài phạm vi ·
   12 Rủi ro & quyết định
.. mục lục nhanh — Phần B (Render/Cache/Revalidation, đã implement): B0 Vấn đề thật · B1
   Time-based Revalidation · B2 On-demand Revalidation · B3 Cache cho non-fetch SDK (`unstable_cache`
   equivalent) · B4a `/product/*` SSG (tương tự `/post/*`) · B4b Việc chưa làm (ngoài scope) ·
   B5 Rủi ro & quyết định · B6 SEO/GEO plumbing (robots/sitemap/rss/llms.txt/JSON-LD, đã implement)

---

## 0. Phạm vi thật

Không có nhiều "tenant", không có "brand setup", không có crawler quét website đối thủ. Chỉ có 2
loại record đã tồn tại — `products` (collection `products`) và `posts` (collection `posts`), đọc/
ghi qua `createService('products')` / `createService('posts')` (`docs/CRUD.rst`). Mục tiêu:

> Với mỗi `product`/`post` đang có, tự động viết/gợi ý lại `title`/`description`/`content`/FAQ sao
> cho AI Search (ChatGPT, Perplexity, Google AI Overview…) dễ trích dẫn, dễ hiểu đúng entity, dễ
> xếp vào câu trả lời — rồi cho phép admin xem trước và áp dụng.

Không có khái niệm "competitor discovery", "citation graph", "multi-brand dashboard" ở MVP — những
phần đó thuộc về đúng loại SaaS bản gốc nhắm tới (xem §11 và §Phụ lục), không phải nhu cầu của 1
site tĩnh 1 chủ sở hữu.

---

## 1. Vì sao KHÔNG cần Backend/Worker mới (quyết định mặc định, không phải câu hỏi mở)

Bản gốc giả định có Node/Hono backend + Redis/BullMQ worker (§10-11 bản gốc). Kiểm tra source thật
cho thấy điều này **không khớp** và cũng **không cần thiết** cho quy mô bài toán:

- `astro.config.mjs`: `output: 'static'`, adapter Node **đã bị comment out** — toàn site build
  tĩnh, không có server process nào chạy thường trực.
- Không tồn tại `functions/`, không có `firebase-functions`, không có queue lib nào
  (BullMQ/Redis/node-cron) trong `package.json`.
- Codebase **đã có tiền lệ rõ ràng** cho việc né cron/worker: `docs/new_feature.md` §2.2 tự nhận
  "Auto-expire sau 48h ... polling phía client, không dùng cron — đúng constraint site tĩnh". Nạp
  Xu cũng dùng admin duyệt tay (`svc-wallet.js`) thay vì cổng thanh toán tự động ở MVP. Đây là quy
  ước có chủ đích của repo, không phải thiếu sót cần vá.
- Ngược lại, `src/services/tensor.js` **đã là chính xác thứ bản gốc §10 gọi là "AIProvider
  abstraction"** — multi-provider (Groq/OpenRouter), fallback chain, gọi trực tiếp từ browser qua
  `fetch`/SSE, không cần SDK, không cần secret server-side (key `PUBLIC_GROQ`/`PUBLIC_OPER` được
  thiết kế để ship client-side — xem cách `svc-admin.js`/`svc-editor.js`/`svc-bay-sections.js` đã
  dùng). Engine AI này **đã tồn tại và đã được dùng cho sinh nội dung** qua `svc-assist.js`.

**Quyết định MVP**: cơ chế "kích hoạt" GEO trong admin là **1 component Lit chạy trong trình
duyệt của admin** (`svc-geo.js`, xem §5-6), tuần tự gọi `tensor.js` cho từng record và ghi kết quả
ngay xuống Firestore sau mỗi record — **không có job chạy độc lập khi tắt tab**, giống hệt rủi ro
đã được repo chấp nhận cho `meta.views`/`meta.likes` bump (`docs/SCHEMA.rst`) và cache
`users.meta.xuBalance` (`docs/new_feature.md` §3.2): tắt tab giữa chừng chỉ mất phần **chưa xử
lý** trong hàng đợi (không mất phần đã ghi), và hàng đợi tự bỏ qua record đã `meta.geo.status ===
'optimized'` nên chạy lại là an toàn (idempotent).

Nếu sau này cần chạy **không cần mở tab** (vd tự chạy lại hàng tuần), §10 đề xuất đường nâng cấp
tối thiểu — nhưng đó là Phase 2, không phải điều kiện để ship MVP.

---

## 2. Data Model — không tạo bảng mới

`products`/`posts` **đã là 2 collection riêng** (đúng phát hiện của `docs/new_feature.md` §0: mỗi
loại dữ liệu trong `docs/SCHEMA.rst` map ra 1 collection Firestore riêng, `mode` chỉ còn giá trị
tài liệu). GEO không cần bảng mới — chỉ thêm 1 sub-object trong `meta`, đúng đúng cách
`meta.views`/`meta.likes` đã làm cho `post` và cách `talent.meta.verification` đã làm cho
`talent`:

```js
// meta.geo — thêm vào record products/posts hiện có, cạnh meta.views/meta.slug/...
{
  status:     'pending',      // 'pending' | 'optimized' | 'applied' | 'stale'
  score:      0,               // 0-100, xem công thức §3
  lastRunAt:  null,             // ISO string — lần AI chạy gần nhất
  model:      '',               // 'groq/llama-3.3-70b-versatile' — model thực tế đã trả lời (audit)
  signals:    { hasFaq: false, hasStructuredFacts: false, titleLen: 0, descLen: 0, entityClear: false },
  suggestion: {
    title: '', description: '', content: '',
    faq: [{ q: '', a: '' }],      // 3-6 câu hỏi AI cho là người dùng hay hỏi AI Search
    entities: [],                  // tên riêng/thuật ngữ nên xuất hiện rõ (brand, category, spec…)
  },
  appliedAt:  null,             // set khi admin bấm "Áp dụng" (§5) — ghi đè title/description/content thật
}
```

**Nguyên tắc**: `meta.geo.suggestion` **không tự động ghi đè** `title`/`description`/`content` —
đúng triết lý "AI Suggestion → Human Approval → Publish" mà cả bản gốc (§17) và tiền lệ
`svc-editor.js` (`_dfInsertAIDraft` — AI viết nháp, người dùng bấm chèn) đều theo. Ghi đè field
thật chỉ xảy ra khi admin bấm "Áp dụng" (§5.3).

`score`/`signals` được **tính lại (recompute) mỗi lần chạy hoặc mỗi lần record được sửa tay**,
không cộng dồn thủ công — cùng kỹ thuật read-modify-write đã dùng cho `talent.meta.stats`.

Không cần sửa `docs/SCHEMA.rst` bảng chính — chỉ cần thêm 1 đoạn mô tả `meta.geo` vào mục "`meta`
shape theo `mode`" (việc này nằm trong Task List §9, bước 1).

---

## 3. GEO Score — heuristic khả thi, không giả vờ đo AI Visibility thật

Bản gốc §8 định nghĩa GEO Score từ `Visibility × 25% + Recommendation × 20% + Citation × 15% + ...`
— các con số này **chỉ đo được** nếu có 1 hệ thống chạy hàng trăm prompt qua nhiều AI Search thật
và phân tích response NLP (đúng "Layer 1 — GEO Analytics" ở bản gốc §37) — đó là 1 sản phẩm khác,
lớn hơn hẳn, và **khả thi thật với hạ tầng hiện có** (xem §10, dùng lại `tensor.js`) nhưng **không
phải MVP** vì tốn rất nhiều lần gọi AI cho lợi ích chưa chứng minh ở quy mô 1 site.

MVP đo cái đo được ngay, không cần gọi AI để "chấm điểm" — **content readiness heuristic**, tính
100% client-side từ chính field của record (rẻ, tức thời, chạy lại tuỳ ý):

```js
function computeGeoScore(record) {
  const desc = record.description || ''
  const faq  = record.meta?.geo?.suggestion?.faq?.length || record.meta?.faq?.length || 0
  const hasStructuredFacts = record.mode === 'product'
    ? Boolean(record.pricing && record.tags)                 // giá + specs/tags rõ ràng
    : Boolean(record.meta?.seo_title && record.meta?.seo_desc)
  return Math.round(
    (record.title?.length > 10 ? 20 : 0) +                   // entity/tiêu đề rõ
    Math.min(desc.length / 160, 1) * 20 +                    // mô tả đủ dài để AI trích
    Math.min(faq, 4) * 10 +                                  // có block hỏi-đáp (AI rất hay lấy FAQ)
    (hasStructuredFacts ? 20 : 0) +                           // fact có cấu trúc (giá/spec/seo meta)
    (record.tags ? 10 : 0) +                                  // entity/category rõ qua tags
    (record.pics ? 10 : 0)                                    // có ảnh minh hoạ thực thể
  )
}
```

Đây chính là "Layer 1 rút gọn, làm được ngay" — không phải thay thế toàn bộ GEO Score bản gốc, mà
là bước MVP trung thực với thứ hạ tầng hiện tại đo được. §10 mô tả cách nâng lên đo AI Visibility
thật khi cần.

---

## 4. AI Engine — tái dùng `tensor.js`, không viết provider mới

Không cần trừu tượng hoá `AIProvider` mới (bản gốc §10) — `createAIStream`/`generateText`
(`src/services/tensor.js`) **đã đúng vai trò đó**: multi-provider, fallback tự động, cache ranking.
GEO chỉ cần 1 system prompt mới, đặt trong domain scaffold mới (§6), theo đúng khung
`_systemPrompt` mà `svc-assist.js` đã dùng cho sinh record — khác ở chỗ **input là 1 record đã
tồn tại** (rewrite/optimize), không phải sinh mới từ mô tả người dùng:

```js
// src/webs/geo/tools/prompt.js (phác thảo, không phải code cuối)
export function buildGeoSystemPrompt(record) {
  return `Bạn là chuyên gia tối ưu nội dung cho AI Search (GEO — Generative Engine Optimization).
Cho 1 sản phẩm/bài viết, hãy viết lại để AI (ChatGPT, Perplexity, Google AI Overview) dễ trích dẫn:
nêu rõ entity (tên, loại, đặc điểm), viết câu trả lời trực tiếp thay vì mơ hồ, thêm 3-6 câu hỏi-đáp
thường gặp. Trả về ĐÚNG 1 JSON OBJECT: { "title", "description", "content", "faq":[{"q","a"}],
"entities":[...] }, không markdown, không giải thích thêm. Giữ đúng ngôn ngữ gốc của nội dung.`
}
```

Gọi qua đúng API đã có, cùng cách `svc-assist.js` gọi:

```js
const raw = await generateText(aiConfig, [{ role: 'user', content: JSON.stringify(record) }], {
  system: buildGeoSystemPrompt(record), maxTokens: 2000, temperature: 0.6,
})
```

`aiConfig` = `[PUBLIC_GROQ, PUBLIC_OPER].filter(Boolean).join('|')` — copy nguyên `_comAiConfig`
(`svc-admin.js:547`), không cần biến env mới.

---

## 5. Cơ chế kích hoạt trong Admin (thay cho "Backend/Worker")

### 5.1 Luồng chạy (client-resident queue)

```text
Admin mở /admin/geo
   ↓
svc-geo.js load toàn bộ products + posts (createService(...).findAll())
   ↓
Tính computeGeoScore() cho mỗi record (client-side, tức thời) → sort theo score thấp trước
   ↓
Admin chọn 1/nhiều record (hoặc "Chọn tất cả score < 60") → bấm "Chạy GEO"
   ↓
FOR EACH record (tuần tự, await, KHÔNG Promise.all — tránh rate-limit + dễ resume):
   [1] generateText(aiConfig, ..., { system: buildGeoSystemPrompt(record) })
   [2] parse JSON → coerce (đúng kiểu _coerceFields của svc-assist.js — không tin thẳng AI)
   [3] svc.update(record.id, { meta: { ...record.meta, geo: { status:'optimized', score, suggestion, lastRunAt: now } } })
   [4] cập nhật UI ngay dòng đó (không chờ hết queue) — admin thấy tiến độ real-time
   ↓
Đóng tab giữa chừng → các record ĐÃ xử lý vẫn lưu; mở lại /admin/geo, hàng đợi tự loại record
đã 'optimized' (rerun-safe, không tốn lại token cho record đã xong)
```

### 5.2 Vì sao tuần tự (không song song)

Cả 2 provider (Groq free tier, OpenRouter free models) đều có rate limit thấp — chạy song song N
record cùng lúc sẽ làm `tensor.js` demote model liên tục (đúng cơ chế "demote model lỗi xuống cuối"
đã có trong `tensor.js`), phản tác dụng. Tuần tự chậm hơn nhưng ổn định, và vì đây là tác vụ admin
chạy 1 lần/tuần chứ không phải realtime, tốc độ không quan trọng.

### 5.3 Xem trước & Áp dụng (Human Approval)

Không có nút "Auto-publish" ở MVP (đúng khuyến nghị bản gốc §17 Level 1/2, khác Level 3 auto-approve
chưa cần ngay). Mỗi record có dialog "Xem gợi ý GEO" hiện side-by-side field cũ vs
`meta.geo.suggestion`, 2 nút:

- **Áp dụng** → ghi `suggestion.title/description/content` vào field thật + `meta.appliedAt = now`
  + `meta.geo.status = 'applied'` + `meta.faq = suggestion.faq` (nếu schema post đã hỗ trợ FAQ,
  xem §9 bước cần kiểm tra) — 1 lần `svc.update()`.
- **Bỏ qua** → giữ nguyên field thật, `meta.geo.status` vẫn `'optimized'` (gợi ý còn đó để xem lại
  sau, không mất).

---

## 6. Domain Scaffold — `src/webs/geo/`

Theo đúng khung leaf-domain (`docs/ARCHITECT.rst` §Micro Service Pattern), tham chiếu gần nhất là
`src/webs/auth/svc-assist.js` (AI sinh dữ liệu theo schema) và `src/webs/auth/svc-admin.js`
(bảng CRUD generic):

```text
src/webs/geo/
├── svc-geo.js              # component chính mount ở /admin/geo — table 2 nguồn (products+posts)
│                            # + cột GEO Score + bulk-select + nút "Chạy GEO" + dialog xem/áp dụng
├── styles/geo.css
└── tools/
    ├── service.js           # re-export createService('products')/createService('posts')
    │                        # + runGeoOptimize(record) + applyGeoSuggestion(record)
    ├── prompt.js            # buildGeoSystemPrompt() (§4)
    └── score.js             # computeGeoScore() (§3)
```

`svc-geo.js` **không dùng `web-boxs`** — giống lý do `svc-talent-profile.js` trong
`docs/new_feature.md` §7: đây là logic có điều kiện thật (trộn 2 collection, tính score, điều
khiển hàng đợi tuần tự, dialog so sánh trước/sau), `web-boxs`/`web-cell` không có primitive cho
việc này. Có thể tái dùng `<web-table>` (đã dùng trong `svc-admin.js`) làm phần hiển thị bảng nếu
`web-table` hỗ trợ cột tuỳ biến (render `score`, checkbox chọn dòng) — kiểm tra khi code, không
giả định trước.

`tools/service.js` — hàm nghiệp vụ chính (khung `CHECK/PROCESS/EXECUTE/RETURN`,
`docs/ARCHITECT.rst` §Comment Convention):

```
loadCandidates()           — gộp products + posts, tính score, sort
runGeoOptimize(record)      — gọi AI (§4), coerce, update meta.geo
runGeoBatch(records, onProgress) — lặp tuần tự runGeoOptimize, callback tiến độ cho UI (§5.1)
applyGeoSuggestion(record)  — ghi suggestion vào field thật (§5.3)
```

---

## 7. Trang Admin `/admin/geo.astro`

Khác các trang admin khác (`products.astro`, `posts.astro` — chỉ mount `<svc-admin dataTable=...>`
generic), `/admin/geo` mount thẳng component riêng, đúng pattern mount trực tiếp mà
`docs/new_feature.md` §8 dùng cho `svc-talent-profile`:

```astro
---
import LayoutAdmin from '@/layouts/LayoutAdmin.astro';
---
<LayoutAdmin title="GEO Admin" description="Tối ưu nội dung cho AI Search">
  <div class="p-4">
    <h1 class="text-xl font-bold mb-5">Tối ưu GEO — Products & Posts</h1>
    <svc-geo id="admin-geo" lang="vi"></svc-geo>
  </div>
  <script>
    import '@/webs/geo/svc-geo.js';
  </script>
</LayoutAdmin>
```

Thêm 1 dòng vào `allMenuItems` trong `src/layouts/LayoutAdmin.astro`:

```js
{ text: 'GEO', textIcon: 'GO', href: root + '/geo', require: 'geo' },
```

`require: 'geo'` không phải tên collection thật (GEO không có collection riêng, §2) — đây chỉ là
**pseudo-table dùng để gate hiển thị menu theo role**, giống cách RBAC hiện có hoạt động theo
`{table}.{capability}`. Quyền ghi thật (khi bấm "Áp dụng") vẫn check `products.update` /
`posts.update` như bình thường — `svc-geo.js` gọi đúng `createService('products')`/
`createService('posts')`, không bypass RBAC hiện có.

---

## 8. RBAC

Thêm `'geo'` vào `TABLES_STD` (`src/webs/auth/svc-roles.js:15-18`, đúng cách `docs/new_feature.md`
§6.2 đã thêm `talents`/`jobs`/`proposals`) — chỉ để admin gán preset (`editor`/`moderator`/`admin`)
cho pseudo-table này, dùng làm điều kiện hiện link "GEO" trong menu. Không cần capability mới —
`ROLE_PRESETS` hiện có đủ (`read` để xem gợi ý, `update`/`manage_status` để áp dụng — map từ preset
`editor`/`admin` có sẵn).

---

## 9. MVP — Task List theo file

1. **Doc**: thêm đoạn `meta.geo` shape vào `docs/SCHEMA.rst` (mục "`meta` shape theo `mode`"),
   trỏ sang file này cho chi tiết — theo đúng thói quen "cập nhật doc trước khi code" của repo.
2. **`src/webs/geo/tools/score.js`** — `computeGeoScore(record)` (§3), pure function, có thể viết
   unit test độc lập vì không đụng I/O.
3. **`src/webs/geo/tools/prompt.js`** — `buildGeoSystemPrompt(record)` (§4).
4. **`src/webs/geo/tools/service.js`** — `loadCandidates/runGeoOptimize/runGeoBatch/
   applyGeoSuggestion` (§6), dùng `createService('products')`/`createService('posts')` +
   `generateText` từ `tensor.js`.
5. **`src/webs/geo/svc-geo.js`** — component chính (§6-7): load candidates, hiện bảng + score,
   bulk-select, nút "Chạy GEO" (gọi `runGeoBatch`, hiện tiến độ), dialog xem/áp dụng gợi ý (§5.3).
6. **`src/pages/admin/geo.astro`** — mount `<svc-geo>` (§7) — file hiện đang trống, đây là nội dung
   cần điền.
7. **`src/layouts/LayoutAdmin.astro`** — thêm menu item "GEO" (§7).
8. **`src/webs/auth/svc-roles.js`** — thêm `'geo'` vào `TABLES_STD` (§8).
9. **Kiểm tra field FAQ trên `posts`**: schema hiện tại (`src/services/schemas/admin/posts.js`)
   chưa có field FAQ hiển thị trong bảng — quyết định khi code: thêm cột `meta.faq` (kiểu
   `repeater`, đúng field type đã có sẵn cho `web-table`/`svc-assist`, xem `docs/SCHEMA.rst`) hay
   chỉ lưu trong `meta.geo.suggestion.faq` và render riêng ở trang `/post/[id]` — không quyết trước
   khi chưa xem `posts.js` schema đầy đủ + cách trang post hiện hiển thị nội dung.
10. **`products.js`**: không cần field mới — `meta.geo` đủ, admin xem qua dialog của `svc-geo.js`,
    không cần lộ ra trong bảng CRUD chính của `products.astro`.

### Chưa cần ngay (đúng nguyên tắc tối giản)

Đo AI Visibility thật bằng cách chạy prompt qua AI Search (§10) · Crawl website/sitemap · Competitor
discovery · Citation graph · CMS adapter (WordPress/Shopify) · Autonomous publish agent.

---

## 10. Phase 2 — AI Visibility thật (nếu cần, dùng lại đúng hạ tầng đã có)

Khi MVP (content-readiness heuristic, §3) đã chạy ổn và cần số liệu "AI có thực sự nhắc đến brand
không" (đúng Layer 1 bản gốc), **không cần backend mới** — `tensor.js` gọi được nhiều model qua
Groq/OpenRouter, đủ để làm 1 "AI Runner" đơn giản:

```text
FOR EACH prompt trong 1 danh sách prompt cố định (vd "top 5 <category> tốt nhất ở Việt Nam")
   generateText(aiConfig, [{role:'user', content: prompt}])
   → response text
   → kiểm tra brand name / product title có xuất hiện trong response không (string match, không
     cần NLP phức tạp ở bước đầu)
   → lưu vào meta.geo.mentionLog: [{ prompt, mentioned: bool, ts }]
```

Vẫn chạy client-resident trong `svc-geo.js` (thêm 1 tab "AI Visibility" cạnh "Content Readiness"),
KHÔNG cần crawler/queue — vì số lượng prompt cố định + nhỏ (không phải hàng triệu như "Prompt
Dataset" bản gốc §22, chỉ vài chục prompt liên quan tới đúng ngành của 1 doanh nghiệp).

**Chỉ khi thực sự cần chạy không mở tab** (vd tự động mỗi tuần, không phụ thuộc admin online) mới
đáng cân nhắc bật `@astrojs/node` adapter đã comment sẵn (`astro.config.mjs`) + 1 route
`prerender:false` (`src/pages/api/geo/run.ts`, đúng mẫu route on-demand đã có cho `/api/products`,
`docs/CRUD.rst`), trigger bằng GitHub Actions scheduled workflow gọi route đó với 1 secret header.
Đây là **lựa chọn**, không phải yêu cầu — vẫn không cần Redis/BullMQ vì chỉ có 1 batch job, không
phải hệ thống hàng đợi nhiều loại job.

---

## 11. Ngoài phạm vi (giữ nguyên định hướng dài hạn của bản gốc, ghi lại để không quên)

Các phần sau của bản gốc vẫn là ý tưởng đúng cho **nếu sản phẩm này pivot thành SaaS bán cho nhiều
doanh nghiệp khác** — không xoá, chỉ đánh dấu rõ là không thuộc phạm vi 1 site tĩnh hiện tại:

- Multi-tenant: `organizations`/`memberships`/`projects`/`brands`/`competitors` — chỉ cần nếu bán
  cho nhiều khách hàng khác, không cần cho chính site này.
- Website crawler + Sitemap crawler + Competitor discovery — cần khi phải phân tích website của
  NGƯỜI KHÁC; site này đã có toàn bộ dữ liệu trong `records`, không cần crawl chính mình.
- Citation Graph / Content Gap / Entity Gap dashboard nhiều brand.
- CMS Adapter (WordPress/Shopify/Webflow) — không liên quan vì đây chính là CMS (Astro + Firestore
  của chính site).
- Pricing tier (Free/Starter/Growth/Pro/Enterprise), Product Moat, North Star Metric đa khách hàng.
- Autonomous publish agent (Level 3 auto-approve) — §5.3 đã chốt MVP chỉ đến Level 2 (human approval).

---

## 12. Rủi ro & quyết định đã chốt (để review, không phải câu hỏi mở)

1. **Không có backend/worker mới** (§1) — đánh đổi: phải giữ tab admin mở trong lúc chạy batch;
   chấp nhận vì tần suất chạy thấp (không phải realtime), đúng quy mô 1 site.
2. **GEO Score là heuristic on-page, không phải AI Visibility thật** (§3) — trung thực hơn là giả
   vờ đo được thứ chưa đo; đường nâng cấp đã note rõ ở §10.
3. **Chạy AI tuần tự, không song song** (§5.2) — chậm hơn nhưng tránh rate-limit/thrashing model
   fallback của `tensor.js`.
4. **Không tự động ghi đè nội dung thật** (§5.3) — luôn cần 1 click "Áp dụng" của admin, đổi lại an
   toàn hơn cho nội dung marketing thật (sai lệch AI-viết có thể ảnh hưởng SEO/uy tín nếu tự publish).
5. **`geo` là pseudo-table trong RBAC, không phải collection thật** (§8) — nếu sau này GEO cần lưu
   trạng thái phức tạp hơn `meta.geo` cho phép (vd lịch sử nhiều lần chạy), cân nhắc tách
   `records mode: 'geo_run'` giống mẫu `wallet_txn` append-only trong `docs/new_feature.md` §1.6 —
   chưa cần ở MVP vì `meta.geo.lastRunAt` (1 giá trị, không phải log) đã đủ.

---

# Phần B — Render/Cache/Revalidation cho SEO/GEO (đã implement)

> Yêu cầu gốc dùng thuật ngữ Next.js: **1. Time-based Revalidation (ISR)**, **2. On-demand
> Revalidation** (xoá cache qua webhook khi có cập nhật), **3. Cache cho hàm không dùng `fetch` gốc
> (`unstable_cache`/`revalidateTag`)**. Astro `output: 'static'` không có API nào trong 3 cái này —
> phần dưới dịch từng khái niệm sang đúng cơ chế tương đương với kiến trúc thật của repo (không
> tái sử dụng code từ nhánh `v1-ddk`, theo yêu cầu — viết mới hoàn toàn).

## B0. Vấn đề thật (phát hiện qua audit source, không giả định)

- `src/pages/post/[id].astro` **đã** làm SSG đúng: `getStaticPaths()` + `fetchCollection('posts')`
  (`src/services/firestore.server.ts`) — nội dung thật bake vào HTML lúc `astro build`. Đây là nơi
  DUY NHẤT hiện tại mà "revalidation" (theo nghĩa Next.js — làm mới HTML đã build) có ý nghĩa,
  vì HTML của nó đứng yên tới lần build kế tiếp.
- `src/pages/shop/index.astro`/`gift/index.astro` **không** SSG — chỉ render `<web-board>`, dữ
  liệu sản phẩm fetch 100% client-side qua `conductor.all()` sau khi hydrate (đúng
  `docs/ARCHITECT.rst`). Khái niệm "revalidate HTML" không áp dụng ở đây — cái cần "làm mới" là
  cache **runtime** (IndexedDB), không phải HTML.
- Không có `functions/`, không có CI/CD, không có `vercel.json`/`netlify.toml` — chưa chọn hosting
  target (đã xác nhận qua audit trước khi viết Phần A). Mọi thiết kế dưới đây phải chạy được
  KHÔNG cần biết trước host cụ thể.

Kết luận: repo có **2 tầng cache khác nhau**, mỗi khái niệm Next.js map vào 1 tầng khác nhau —
không có 1 giải pháp chung cho cả 2.

| Tầng | Ở đâu | Sinh ra bởi | "Đứng yên" tới khi nào |
| --- | --- | --- | --- |
| **A — Runtime cache** | IndexedDB, browser | `conductor.all()` / `crud.js loadData()` | Hết TTL (mặc định 5 phút) |
| **B — Build-time SSG** | HTML tĩnh, `post/[id].astro` | `astro build` + `fetchCollection()` | Lần `astro build` kế tiếp |

## B1. "Time-based Revalidation (ISR)" → Tầng A đã có sẵn, Tầng B = rebuild theo lịch

**Tầng A**: `conductor.all(sectionId, { cache: 5 })` (phút) **đã chính là** time-based
revalidation — hết TTL thì lần load kế tiếp tự fetch lại Firestore, không cần thêm gì
(`docs/SERVICES.rst`). Không có gì để implement ở tầng này.

**Tầng B**: Astro static không có per-page revalidate khi không có adapter/server thường trực
(đã xác nhận). Tương đương thật duy nhất, không thêm hạ tầng mới: **rebuild toàn site theo lịch**
— mọi trang SSG "revalidate" cùng lúc. Cơ chế: 1 job chạy theo lịch NGOÀI repo (cron của host, hoặc
GitHub Actions `on: schedule`) gọi build-hook URL của host (Vercel/Netlify/Cloudflare Pages đều có
sẵn 1 endpoint POST kích hoạt build lại). Việc này **cần chọn host trước** nên nằm ngoài scope code
— `src/services/deployHook.js` (§B2) đã viết sẵn để dùng CHUNG 1 URL cho cả time-based (job ngoài
gọi định kỳ) và on-demand (gọi từ admin), không cần 2 cơ chế riêng.

## B2. "On-demand Revalidation" → Tầng A: purge cache key; Tầng B: trigger rebuild

### Tầng A — `src/services/crud.js` (`invalidate()`, mới thêm)

```js
export function invalidate({ dataTable = '', dataSrc = '', server = '' } = {}) {
    if (!dataSrc && !dataTable) return Promise.resolve();
    return cacheRemove(loadKey(dataSrc, dataTable, server));
}
```

Purge đúng 1 cache entry IndexedDB (key sinh từ `loadKey`, cùng key mà `conductor.all()`/
`loadData()` dùng — xem `docs/CRUD.rst`) — lần load TIẾP THEO (reload trang, tab mới) lấy dữ liệu
mới ngay, không cần chờ hết TTL 5 phút. **Không** đẩy dữ liệu mới vào tab đang mở sẵn (section đã
có data trong RAM của conductor không tự re-fetch, đúng thiết kế `docs/SERVICES.rst`) — đây là hạn
chế đã biết, chấp nhận được vì admin/storefront là 2 tab riêng, không cần đồng bộ realtime.

### Tầng B — `src/services/deployHook.js` (mới)

```js
export function triggerRebuild() {
    const url = import.meta.env.PUBLIC_DEPLOY_HOOK;
    if (!url) return; // chưa cấu hình host — no-op, không phải lỗi
    clearTimeout(_pending);
    _pending = setTimeout(() => { fetch(url, { method: 'POST' }).catch(...) }, 30_000);
}
```

Debounce 30s — nhiều save liên tiếp trong 1 phiên admin (sửa nhiều bài viết) chỉ trigger 1 lần
rebuild. Không cấu hình `PUBLIC_DEPLOY_HOOK` → im lặng, đúng trạng thái hiện tại (chưa chọn host).

### Điểm gắn — `src/webs/auth/svc-admin.js`

Thêm prop `revalidate` (Boolean, mặc định `false`, cùng convention với `orderable`) + method
`_dfRevalidate()` gọi từ **cả 5 write path** đã có (`_dfSave` create/update, `_dfDeleteExec`,
`_dfMove`, `_dfImportCsv`, `_dhAssistRecords` — tái dùng đúng chỗ `_syncConductor()` đã gọi, không
thêm write path mới):

```js
_dfRevalidate() {
    cacheInvalidate({ dataTable: this._table, server: this.server }); // Tầng A — LUÔN chạy
    if (this.revalidate) triggerRebuild();                             // Tầng B — chỉ khi bật
}
```

Tầng A chạy cho **mọi** bảng (rẻ, không hại gì). Tầng B chỉ bật cho bảng có trang SSG phụ thuộc —
hiện tại là `posts` VÀ `products` (`src/pages/admin/posts.astro` + `src/pages/admin/products.astro`
đã thêm attribute `revalidate`, xem §B4b). KHÔNG bật cho `orders`/`inventory`/`staff`/`users` —
không có trang SSG nào đọc các bảng này, rebuild toàn site cho chúng chỉ tốn thời gian build vô ích.

## B3. "Cache cho hàm không dùng `fetch` gốc" (`unstable_cache` equivalent)

Next.js cần `unstable_cache` vì code gọi SDK (Firebase/Prisma) không tự được cache qua tham số
`fetch()`. Repo này **đã có class tương đương cho Tầng A** — `withCache()`/`cacheGet`/`cacheSet`
(`crud.js`) bọc mọi lời gọi Firestore SDK bằng IndexedDB, dùng chung bởi `loadData()`/
`conductor.all()`. Không cần viết thêm gì cho Tầng A.

**Gap thật tìm thấy**: Tầng B (`fetchCollection()` trong `firestore.server.ts`, chạy trong Node
lúc `astro build`) **không** có tầng cache nào — mỗi file gọi `fetchCollection('posts')` riêng
(`post/[id].astro` + `post/index.astro`) tự fetch lại nguyên collection trong CÙNG 1 lần build,
tốn quota Firestore vô ích. Đã sửa trực tiếp trong `fetchCollection()` (không đổi signature, mọi
call site cũ tự động hưởng lợi):

```ts
const _buildCache = new Map<string, Promise<Record<string, any>[]>>();

export function fetchCollection(collectionName, opts = {}) {
    const key = `${collectionName}::${opts.connection ?? 'firestore'}::${opts.activeOnly ?? true}`;
    const cached = _buildCache.get(key);
    if (cached) return cached;
    const promise = _fetchCollectionRaw(collectionName, opts);
    _buildCache.set(key, promise);
    return promise;
}
```

Không cần TTL/tag-invalidate như `unstable_cache` — "invalidate" ở đây tự nhiên là **build mới**
(process Node mới, `Map` mới, không sống sót qua request thứ 2 vì không có request thứ 2 — build
chạy 1 lần rồi thoát).

## B4a. `/product/*` — SSG detail + list pages (bổ sung theo yêu cầu tiếp theo, tương tự `/post/*`)

Yêu cầu ban đầu (§B0-B3) chỉ nói 3 kỹ thuật cache/revalidation, không có trang SSG nào cho
`products` để mà revalidate — Tầng B lúc đó chỉ có `posts`. Yêu cầu tiếp theo ("bổ sung cho
pages/products tương tự posts") lấp đúng khoảng trống này — viết mới hoàn toàn (không tái dùng
`gift/*` của `v1-ddk`, giữ đúng quyết định trước đó), bám sát 1:1 khung `post/[id].astro` +
`post/index.astro` nhưng field THẬT của `products` (`pricing`/`quantity`/`vat`/`meta.sku`, xem
`docs/SCHEMA.rst`), không phải field bịa như `_cardProductNeat.js` (`meta.oldPrice`/`meta.badge`).

| File | Vai trò |
| --- | --- |
| `src/sections/another/_cardProductSeo.js` | Card config masonry — cùng khung `_cardPost.js` nhưng field `pics`/`title`/`tags`/`score`/`pricing` thật |
| `src/pages/product/[id].astro` | SSG detail: `getStaticPaths()` + `fetchCollection('products')`, giá/tồn kho/VAT/SKU/sản phẩm liên quan (tag-overlap, cùng thuật toán `post/[id].astro`) |
| `src/pages/product/index.astro` | SSG catalog: data bake vào HTML (`sr-only` crawlable list + `web-boxs masonry`), search/sort client-side (mới nhất/giá/rating) qua `conductorAll('products', ...)`, infinite scroll |
| `src/pages/admin/products.astro` | Thêm attribute `revalidate` (Tầng B bật cho `products`, xem §B2) |

**Route riêng, không thay `/shop`**: `/shop` vẫn là storefront giữ nguyên (grid + add-to-cart
client-side, `SHOP_SELLER_ID`) — `/product/*` là lớp crawlable đọc-only song song, giống cách
`/post/*` tồn tại độc lập với các section blog nhúng trong landing pages. CTA "Đặt mua trên cửa
hàng" trên `/product/[id]` dẫn về `/shop` — không có add-to-cart trên trang SSG (giữ tách bạch:
SSG để crawl, `/shop` để mua).

**Không thêm** so với `/post/*` (giữ đúng parity, không vượt phạm vi "tương tự posts"): không
JSON-LD (posts hiện tại cũng chưa có), không nav link trong `menuItems` (posts cũng chưa được
link từ nav chính), không sitemap/robots — những phần này vẫn thuộc §B4b (ngoài scope).

## B4b. Việc CHƯA làm (đã cân nhắc, không thuộc scope yêu cầu này)

- ~~Không viết `sitemap.xml`/`robots.txt`/JSON-LD/`llms.txt`~~ — **đã làm** (yêu cầu audit tiếp
  theo, xem §B6): `src/pages/sitemap.xml.ts`, `public/robots.txt`, `src/pages/rss.xml.ts` (fix
  luôn link `/rss.xml` mà `Head/Base.astro` đã emit từ trước nhưng chưa từng có file thật),
  `src/pages/llms.txt.ts`, JSON-LD `Organization` (`Head/Base.astro`, mọi trang) + `BlogPosting`
  (`post/[id].astro`) + `Product` (`product/[id].astro`). Không tái dùng code `v1-ddk` (giữ đúng
  quyết định trước đó) — viết mới hoàn toàn, tái dùng `fetchCollection()`/`site` config đã có.
- Không chọn host/hosting adapter — `PUBLIC_DEPLOY_HOOK` (§B2) hoạt động với BẤT KỲ host có build
  hook, cấu hình khi host được chọn, không cần quyết định trước trong code.
- Không thêm nav link `/product/` vào `menuItems` — giữ parity với `/post/` (cũng chưa được link
  từ nav chính hiện tại).

## B6. SEO/GEO plumbing (đã implement, bổ sung theo yêu cầu audit tiếp theo)

Audit phát hiện `pnpm build` trước đó KHÔNG sinh `robots.txt`/`sitemap.xml`, và `Head/Base.astro`
đã emit `<link rel="alternate" href="/rss.xml">` trên MỌI trang nhưng file đó không tồn tại (404
thật). Đã bổ sung, đều là build-time endpoint/static file — không cần adapter/server:

| File | Vai trò |
| --- | --- |
| `public/robots.txt` | `Disallow /admin/` + `/gift/login`, trỏ `Sitemap:` |
| `src/pages/sitemap.xml.ts` | Endpoint `GET` — liệt kê static routes + 5 dịp `gift/[occasions]` + toàn bộ `post/{id}`/`product/{id}` từ `fetchCollection()`, `lastmod` từ `updated_at` |
| `src/pages/rss.xml.ts` | Feed RSS 2.0 cho 50 post mới nhất — lấp đúng link đã emit sẵn ở `Head/Base.astro` |
| `src/pages/llms.txt.ts` | Markdown tóm tắt site + link posts/products cho AI/LLM crawler (chuẩn llmstxt.org) |
| `Head/Base.astro` | Prop `noindex` (dùng cho `/admin/*`, `/admin/login`, `/gift/login` qua `LayoutAdmin.astro`/`Empty.astro`) + JSON-LD `Organization` site-wide (bỏ qua khi `noindex`) |
| `post/[id].astro` | JSON-LD `BlogPosting` (headline/image/datePublished/dateModified) |
| `product/[id].astro` | JSON-LD `Product` (offers/price/availability/aggregateRating) |
| `src/services/constants/site.js` | `description` trước để rỗng (`''`) — mọi trang không tự truyền `description` sẽ ra `<meta name="description">` trống; đã set nội dung thật |

**Không làm thêm** (ngoài scope audit này): sitemap index/phân trang nhiều file (chưa cần, số
lượng record hiện tại còn nhỏ), hreflang (site đơn ngữ `vi`), `llms-full.txt` (bản đầy đủ nội dung
thay vì tóm tắt — cân nhắc sau nếu cần).

## B5. Rủi ro & quyết định đã chốt (Phần B)

1. **`invalidate()` không đồng bộ tab đang mở** (§B2 Tầng A) — chỉ ảnh hưởng lần load tiếp theo,
   chấp nhận vì admin và storefront là 2 tab riêng, không cần realtime cross-tab.
2. **Rebuild toàn site, không revalidate từng path** (§B1/§B2 Tầng B) — Astro static không có
   route-level cache để purge; đổi lại đơn giản, không cần chọn CDN/host cụ thể trước.
3. **`revalidate` prop bật cho `posts` VÀ `products`** (§B2, §B4a) — bảng nào có thêm trang SSG phụ
   thuộc trong tương lai, chỉ cần thêm attribute `revalidate` vào đúng trang admin đó, không cần
   sửa `svc-admin.js`.
4. **`fetchCollection()` build-cache không có TTL** (§B3) — đúng vì lifetime = 1 lần build; nếu
   sau này có route on-demand (`prerender:false`, chạy lâu hơn 1 build) đọc `fetchCollection()`,
   cân nhắc thêm TTL ngắn lúc đó, chưa cần ở MVP vì hiện tại 100% caller là `getStaticPaths()`
   build-time.
5. **`/product/*` không có add-to-cart** (§B4a) — mua hàng vẫn qua `/shop`; đánh đổi 1 click thêm
   để giữ trang SSG đơn giản (không cần mount `svc-cart`/`svc-pay` vào trang tĩnh), chấp nhận vì
   mục tiêu trang này là crawl/GEO, không phải conversion trực tiếp.

---

# Phụ lục — Bản gốc (Product Vision cho GEO SaaS đa khách hàng)

> Giữ nguyên nguyên văn để tham khảo nếu sau này cần pivot sang bán cho nhiều doanh nghiệp khác —
> không áp dụng trực tiếp cho site hiện tại (xem lý do ở §0-§11 phía trên).

## 1. Product Vision

Xây dựng một **GEO SaaS Platform** giúp doanh nghiệp:

1. Đo mức độ xuất hiện của thương hiệu/sản phẩm trên AI Search.
2. Hiểu tại sao AI nhắc đến đối thủ nhưng không nhắc đến mình.
3. Xác định content/entity/citation gap.
4. Đề xuất và thực hiện các thay đổi để tăng AI visibility.
5. Tự động theo dõi và tối ưu liên tục.

### Product loop

```text
DISCOVER
   ↓
MONITOR
   ↓
ANALYZE
   ↓
DIAGNOSE
   ↓
OPTIMIZE
   ↓
PUBLISH
   ↓
MEASURE
   ↓
RE-OPTIMIZE
```

---

# 2. Ba tầng sản phẩm

## Layer 1 — GEO Analytics

**Mục tiêu:** biết AI đang nhìn nhận thương hiệu như thế nào.

### Features

- [ ] Project management
- [ ] Brand/product setup
- [ ] Website crawling
- [ ] Competitor discovery
- [ ] Prompt generation
- [ ] Prompt library
- [ ] AI response collection
- [ ] Brand mention detection
- [ ] Competitor detection
- [ ] Citation extraction
- [ ] AI visibility score
- [ ] Share of voice
- [ ] Citation score
- [ ] Brand accuracy
- [ ] Competitor comparison
- [ ] Historical tracking
- [ ] Scheduled audit
- [ ] GEO report

### Output

```text
GEO Score: 68/100

AI Mention Rate       72%
Recommendation Rate   61%
Citation Rate         54%
Brand Accuracy        89%
Share of Voice        32%
```

**Layer 1 là MVP bắt buộc (cho phiên bản SaaS đa khách hàng).**

---

# 3. Layer 2 — GEO Optimization

**Mục tiêu:** không chỉ phát hiện vấn đề mà đưa ra cách sửa.

## Content Gap

Phát hiện:

```text
AI Query
   ↓
Competitor mentioned
   ↓
Your brand missing
   ↓
Analyze sources
   ↓
Find missing topic
```

Ví dụ:

> Competitor xuất hiện khi người dùng hỏi "best CRM for Vietnamese SMEs".

App phát hiện website chưa có content phù hợp.

→ Recommendation:

> Create: "Best CRM for Vietnamese SMEs"

---

## Entity Optimization

Kiểm tra:

- Brand description
- Product description
- Company information
- Author
- Product features
- Industry
- Category
- Competitors
- Organization data
- Structured data

Phát hiện inconsistency:

```text
Website:
CRM platform

G2:
Sales automation

LinkedIn:
Business software

AI:
Sales tool
```

→ Đề xuất chuẩn hóa entity.

---

## Citation Optimization

Phân tích nguồn AI sử dụng:

```text
G2
Capterra
Reddit
Forbes
Industry blogs
Comparison sites
Product directories
```

Sau đó tạo:

> Citation Gap Report

```text
Competitor A
8 important sources

Your Brand
2 important sources

Gap
6 sources
```

---

## Content Brief Generator

Từ GEO gap tạo:

- Topic
- Search/AI intent
- Target audience
- Questions
- Entities
- Competitors
- Required facts
- Suggested structure
- FAQ
- Internal links
- Citation opportunities

---

# 4. Layer 3 — Autonomous GEO

Đây là mục tiêu dài hạn.

User chỉ cần:

> **Optimize my brand for AI search**

Agent tự:

```text
Crawl
 ↓
Understand
 ↓
Generate prompts
 ↓
Run AI analysis
 ↓
Find gaps
 ↓
Prioritize
 ↓
Generate changes
 ↓
Ask approval
 ↓
Publish
 ↓
Monitor
 ↓
Measure
 ↓
Optimize again
```

### Autonomous GEO Agent

Agent có các capabilities:

```text
Research Agent
Content Agent
Entity Agent
Citation Agent
Optimization Agent
Monitoring Agent
```

Không nên cho agent tự publish ngay từ đầu.

Nên có:

```text
AI Suggestion
      ↓
Human Approval
      ↓
Publish
```

Sau khi hệ thống đủ tin cậy mới cho phép:

```text
Auto Approval Rules
      ↓
Auto Publish
```

---

# 5. MVP Scope (cho phiên bản SaaS đa khách hàng)

Không làm cả 3 tầng ngay.

### MVP v1

Chỉ làm:

```text
Brand
 ↓
Website
 ↓
Generate prompts
 ↓
Run AI
 ↓
Analyze response
 ↓
Mention
Citation
Competitor
 ↓
GEO Score
 ↓
Dashboard
```

### MVP features

- [ ] Authentication
- [ ] Organization
- [ ] Project
- [ ] Brand setup
- [ ] Website crawler
- [ ] Sitemap crawler
- [ ] Product extraction
- [ ] Competitor input
- [ ] Prompt generator
- [ ] Prompt categories
- [ ] AI runner
- [ ] Response storage
- [ ] Mention detection
- [ ] Competitor detection
- [ ] Citation extraction
- [ ] GEO score
- [ ] Share of voice
- [ ] Competitor dashboard
- [ ] Citation dashboard
- [ ] Historical data
- [ ] Scheduled scan
- [ ] Basic report

---

# 6. Product Information Architecture

```text
/
├── Home
├── Features
├── Pricing
├── Blog
├── Docs
│
└── app/
    ├── dashboard
    │
    ├── projects
    │   └── [project]
    │
    ├── visibility
    │
    ├── prompts
    │
    ├── competitors
    │
    ├── citations
    │
    ├── content-gaps
    │
    ├── recommendations
    │
    ├── reports
    │
    └── settings
```

---

# 7. Dashboard

Dashboard phải trả lời 5 câu hỏi:

### 1. AI có biết tôi không?

> Brand Mention Rate

### 2. AI có recommend tôi không?

> Recommendation Rate

### 3. AI đang recommend đối thủ nào?

> Competitor Share of Voice

### 4. AI dựa vào nguồn nào?

> Citation Sources

### 5. Tôi nên làm gì tiếp theo?

> Recommended Actions

---

# 8. GEO Score (định nghĩa đầy đủ cho phiên bản SaaS)

Không dùng một metric duy nhất.

```text
GEO Score
│
├── Visibility
├── Recommendation
├── Citation
├── Brand Accuracy
├── Entity Strength
├── Competitive Position
└── Content Coverage
```

### Formula ban đầu

Có thể dùng weighted score:

```text
GEO Score =
    Visibility       × 25%
  + Recommendation   × 20%
  + Citation         × 15%
  + Accuracy         × 15%
  + Entity           × 10%
  + Competition      × 10%
  + Coverage         × 5%
```

**Lưu ý:** đây là proprietary score của sản phẩm, không phải một chuẩn ngành.

---

# 9. Prompt Engine

Đây là core engine.

### Input

```json
{
  "brand": "ABC",
  "product": "ABC CRM",
  "category": "CRM",
  "market": "Vietnam",
  "audience": "SME",
  "competitors": [
    "HubSpot",
    "Zoho"
  ]
}
```

### Prompt categories

```text
Discovery
Problem
Educational
Commercial
Comparison
Alternative
Recommendation
Product
Feature
Industry
Local
```

### Ví dụ

```text
Best CRM for Vietnamese SMEs

Best CRM for startups

CRM alternatives to HubSpot

HubSpot vs ABC CRM

CRM with Zalo integration

Affordable CRM for small businesses
```

---

# 10. AI Runner (cho phiên bản SaaS — xem §4/§10 phía trên cho bản rút gọn khả thi ngay)

Thiết kế abstraction ngay từ đầu:

```text
AIProvider
│
├── Provider A
├── Provider B
├── Provider C
└── Search AI
```

Không để business logic phụ thuộc trực tiếp vào một provider.

### Job

```text
GEO_SCAN
    ↓
Prompt Queue
    ↓
AI Request
    ↓
Response
    ↓
Parser
    ↓
Analyzer
```

---

# 11. Background Worker (cho phiên bản SaaS — xem §1 phía trên cho lý do MVP hiện tại không cần)

Đây là thành phần rất quan trọng.

Frontend:

```text
POST /scan
```

Backend:

```text
Create Job
   ↓
Queue
```

Worker:

```text
Generate prompts
      ↓
Execute prompts
      ↓
Parse responses
      ↓
Extract entities
      ↓
Extract citations
      ↓
Calculate metrics
      ↓
Save results
```

User có thể đóng browser.

---

# 12. Database (cho phiên bản SaaS đa khách hàng)

### Core

```text
organizations
users
memberships
projects
brands
products
competitors
```

### GEO

```text
prompts
prompt_clusters
prompt_runs
ai_responses
mentions
recommendations
```

### Citation

```text
sources
citations
source_domains
```

### Analytics

```text
geo_scores
visibility_snapshots
competitor_snapshots
```

### Optimization

```text
content_gaps
entity_gaps
citation_gaps
optimization_tasks
```

---

# 13. Recommended Tech Stack (cho phiên bản SaaS đa khách hàng)

## Frontend

```text
Astro
React
TypeScript
Tailwind
```

Astro:

- Marketing
- SEO pages
- App shell
- Routing

React:

- Charts
- Tables
- Filters
- Interactive dashboard

---

## Backend

```text
Node.js
Hono
TypeScript
```

Hoặc giai đoạn đầu có thể dùng API layer của Astro.

---

## Database

```text
PostgreSQL
```

Nếu cần vector search:

```text
pgvector
```

---

## Queue

MVP:

```text
Redis
BullMQ
```

---

## Crawler

```text
Playwright
Cheerio
Sitemap parser
```

---

## Infrastructure

Ban đầu:

```text
Frontend
    ↓
Vercel / Cloudflare

Backend
    ↓
Container / VPS

PostgreSQL
    ↓
Managed PostgreSQL

Redis
    ↓
Managed Redis
```

Không cần Kubernetes ở MVP.

---

# 14. Layer 2 Architecture

Khi MVP ổn định, thêm:

```text
                    GEO Analytics
                         │
                         ▼
                  Gap Detection
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
     Content Gap    Entity Gap    Citation Gap
          │              │              │
          ▼              ▼              ▼
     Content AI      Entity AI      Research AI
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                  Recommendations
                         │
                         ▼
                    CMS Adapter
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
          WordPress   Shopify     Webflow
```

---

# 15. CMS Strategy

**Không tự xây CMS ở giai đoạn đầu.**

Làm adapter:

```text
CMSAdapter
│
├── WordPressAdapter
├── ShopifyAdapter
├── WebflowAdapter
├── ContentfulAdapter
└── SanityAdapter
```

API thống nhất:

```text
createContent()
updateContent()
publishContent()
getContent()
getPages()
```

Như vậy GEO engine không cần biết website đang dùng CMS nào.

---

# 16. Layer 3 Architecture

Khi đã có đủ dữ liệu:

```text
                 GEO Agent
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
   Research      Strategy      Execution
     Agent         Agent         Agent
       │            │            │
       └────────────┼────────────┘
                    ▼
              Action Planner
                    │
                    ▼
              Approval System
                    │
                    ▼
             CMS / Web Actions
                    │
                    ▼
                 Publish
                    │
                    ▼
               Monitoring
                    │
                    ▼
                Feedback
                    │
                    └──────→ Agent
```

---

# 17. Autonomous Rules

Không để AI tự ý sửa website.

Tạo approval levels:

### Level 1 — Suggest

AI chỉ đề xuất.

### Level 2 — Approve

User click:

> Approve

### Level 3 — Auto

User thiết lập:

```text
Auto approve:
- FAQ
- Meta description
- Internal links

Require approval:
- Product pages
- Pricing
- Brand claims
- Comparison content
```

---

# 18. GEO Recommendations Engine

Recommendation phải có:

```text
Problem
Impact
Evidence
Action
Difficulty
Expected benefit
```

Ví dụ:

```text
Problem:
Your brand is missing from "best CRM for SMB".

Evidence:
7/10 AI responses recommend competitors.

Impact:
HIGH

Action:
Create a comparison/buying guide targeting SMB CRM.

Difficulty:
MEDIUM

Priority:
9.2/10
```

### Priority formula

```text
Priority =
Impact
× AI Opportunity
× Competitive Gap
÷ Implementation Cost
```

---

# 19. Roadmap (cho phiên bản SaaS đa khách hàng)

## Phase 0 — Foundation

**1–2 tuần**

- [ ] Repository
- [ ] Astro
- [ ] React
- [ ] TypeScript
- [ ] PostgreSQL
- [ ] Auth
- [ ] Organization
- [ ] Project
- [ ] CI/CD
- [ ] Environment config
- [ ] Logging

---

## Phase 1 — GEO Analytics MVP

**3–5 tuần**

- [ ] Website crawler
- [ ] Brand extraction
- [ ] Product extraction
- [ ] Competitor setup
- [ ] Prompt generator
- [ ] Prompt clusters
- [ ] AI runner
- [ ] Queue
- [ ] Worker
- [ ] Response parser
- [ ] Mention detection
- [ ] Citation detection
- [ ] GEO scoring
- [ ] Dashboard

**Milestone:**

> User nhập website → bấm Scan → nhận GEO report.

---

## Phase 2 — Intelligence

**3–4 tuần**

- [ ] Competitor analysis
- [ ] Share of voice
- [ ] Citation analysis
- [ ] Source quality
- [ ] Historical tracking
- [ ] Prompt trends
- [ ] GEO alerts
- [ ] Scheduled scan
- [ ] PDF/report export

**Milestone:**

> User biết tại sao competitor đang thắng.

---

## Phase 3 — Optimization

**4–6 tuần**

- [ ] Content gap
- [ ] Entity gap
- [ ] Citation gap
- [ ] Content brief
- [ ] AI recommendations
- [ ] Action priority
- [ ] Content generation
- [ ] Human approval
- [ ] CMS integration

**Milestone:**

> User có thể chuyển từ "phát hiện vấn đề" sang "thực hiện giải pháp".

---

## Phase 4 — Autonomous GEO

**6–10+ tuần**

- [ ] GEO Agent
- [ ] Research Agent
- [ ] Content Agent
- [ ] Entity Agent
- [ ] Citation Agent
- [ ] Optimization planner
- [ ] Approval rules
- [ ] Auto publish
- [ ] Continuous monitoring
- [ ] Feedback loop

**Milestone:**

> User có thể giao mục tiêu cho GEO Agent và để hệ thống liên tục tìm → sửa → đo.

---

# 20. Pricing Strategy (cho phiên bản SaaS đa khách hàng)

### Free

```text
1 project
20 prompts
1 scan/month
Basic score
```

### Starter

```text
$49/month

1–3 projects
500 prompts
Weekly scan
Competitor tracking
```

### Growth

```text
$149/month

10 projects
2,000 prompts
Daily scan
Citation intelligence
Content gaps
Recommendations
```

### Pro

```text
$399/month

Unlimited/team features
10,000+ prompts
Advanced competitor intelligence
CMS integrations
API
Reports
```

### Enterprise

Custom:

- Dedicated infrastructure
- Custom AI providers
- SSO
- API
- Custom limits
- Multiple markets
- Custom reporting

---

# 21. North Star Metric (cho phiên bản SaaS đa khách hàng)

Không lấy:

> Number of scans

hay:

> Number of prompts

làm metric chính.

Nên theo dõi:

## AI Visibility Share

Ví dụ:

```text
                    Month 1   Month 3

Your Brand            18%       34%
Competitor A          31%       28%
Competitor B          24%       21%
Others                27%       17%
```

Product value trở nên rất rõ:

> **"GEO Platform đã giúp AI visibility của tôi tăng từ 18% lên 34%."**

---

# 22. Product Moat (cho phiên bản SaaS đa khách hàng)

Thứ khó copy không phải UI.

Moat nên nằm ở:

### 1. Prompt Dataset

Hàng triệu prompt được phân loại theo:

- Industry
- Intent
- Country
- Product
- Persona

### 2. AI Response Dataset

Lịch sử:

> AI nói gì về brand nào?

### 3. Citation Graph

```text
Brand
 ↓
AI Response
 ↓
Citation
 ↓
Source
 ↓
Entity
```

### 4. GEO Benchmark

Ví dụ:

> SaaS CRM benchmark

> Ecommerce benchmark

> Fintech benchmark

> Vietnam market benchmark

### 5. Recommendation Engine

Dữ liệu thực tế giúp biết:

> Action nào thực sự làm AI visibility tăng?

Đây có thể trở thành moat mạnh nhất.

---

# 23. Definition of Done cho MVP (phiên bản SaaS đa khách hàng)

MVP được xem là hoàn thành khi user có thể:

```text
1. Đăng ký
       ↓
2. Tạo Project
       ↓
3. Nhập website
       ↓
4. Nhập competitor
       ↓
5. Generate prompts
       ↓
6. Click "Run GEO Audit"
       ↓
7. Worker chạy background
       ↓
8. AI responses được lưu
       ↓
9. Hệ thống detect:
       - Brand
       - Competitors
       - Citations
       ↓
10. Tính GEO Score
       ↓
11. Hiển thị Dashboard
       ↓
12. User xem:
       - Visibility
       - Share of Voice
       - Citations
       - Competitors
       - Recommendations
```

**Đây là mốc nên đạt trước khi đụng vào CMS và Autonomous Agent.**

---

# 24. Thứ tự build (phiên bản SaaS đa khách hàng)

```text
             ┌───────────────────┐
             │     ASTRO APP     │
             └─────────┬─────────┘
                       │
                       ▼
              ┌────────────────┐
              │ GEO ANALYTICS  │ ← BUILD FIRST
              └───────┬────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
       Prompts    AI Runner   Citations
          │           │           │
          └───────────┼───────────┘
                      ▼
                GEO Intelligence
                      │
                      ▼
             ┌────────────────┐
             │  OPTIMIZATION  │ ← BUILD SECOND
             └───────┬────────┘
                     │
              ┌──────┼──────┐
              ▼      ▼      ▼
           Content Entity Citation
              │      │      │
              └──────┼──────┘
                     ▼
                  CMS/API
                     │
                     ▼
             ┌────────────────┐
             │ AUTONOMOUS GEO │ ← BUILD LAST
             └────────────────┘
```

## Kết luận (bản gốc)

**Không bắt đầu bằng CMS hay Agent.**

Hãy xây **GEO Analytics Engine** trước. Nó là "bộ não" của cả ba tầng; khi engine đã có dữ liệu về:

```text
Prompt
→ AI Response
→ Mention
→ Citation
→ Competitor
→ Gap
→ Recommendation
```

thì tầng **Optimization** và **Autonomous GEO** sẽ được xây lên trên cùng một nền tảng thay vì phải
làm lại kiến trúc.

**Ghi chú cho repo hiện tại**: kết luận này đúng cho SaaS đa khách hàng. Cho site tĩnh 1 chủ sở hữu
hiện tại, thứ tự đúng là §9 (MVP Task List) ở đầu file — bắt đầu từ `meta.geo` + `svc-geo.js` dùng
lại `tensor.js`, không xây Analytics Engine riêng.
