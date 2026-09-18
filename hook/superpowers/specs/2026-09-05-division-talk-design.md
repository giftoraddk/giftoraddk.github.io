# Division AI chat (divisions + engine refactor + svc-talk)

**Status:** Approved design, pre-implementation
**Files:** `src/webs/division/{svc-marketing.js,svc-talk.js,tools/engine.js,tools/image.js}`,
`src/services/schemas/admin/divisions.js`, `src/pages/admin/divisions.astro`,
`src/layouts/LayoutAdmin.astro`, `src/webs/chat/svc-chat.js` (small additive change)

## Goal

Sếp trò chuyện qua chat với "AI phòng ban" (vd Marketing) — mỗi phòng ban tự "suy nghĩ" theo
đúng chuyên môn của mình (pipeline AI nhiều bước, hiện có sẵn cho marketing trong
`svc-marketing.js`) rồi trả kết quả để sếp duyệt. Chuyên môn của từng phòng ban được bóc tách
thành JSON config trong 1 collection Firestore mới (`divisions`) — một engine dùng chung
(`tools/engine.js`) đọc config đó để chạy pipeline, thay vì mỗi phòng ban cần code riêng.

## 1. Collection `divisions`

1 doc/phòng ban:

```js
{
  id, created_at, updated_at, deleted_at, index, status,   // 'active' | 'inactive'
  title, description, pics,        // tên hiển thị, avatar bot dùng trong chat
  lang, ai,                        // ngôn ngữ mặc định, model override (rỗng = dùng ai global)
  meta: {
    steps: [
      {
        id: 1, key: 'analysis', vi: 'Phân tích', en: 'Strategy Analysis', type: 'text',
        role: 'Senior Content Strategist...', task: 'deeply analyze 1 TOPIC...',
        calls: [
          { key: 'g1', fields: [{ key:'topicAnalysis', desc:'...Max 3 sentences.' }, ...],
            contextKeys: [], dependsOn: [], maxTokens: 1200, temperature: 0.7 },
          ...
        ],
      },
      { id: 3, key: 'content', type: 'text', calls: [
          { key: 'titleDesc', fields: [...], dependsOn: [] },
          { key: 'content', fields: [{key:'content', desc:'...'}], dependsOn: ['titleDesc'] },
        ] },
      { id: 4, key: 'image', type: 'image', concept: { contextKeys: ['topicAnalysis','contentPillars'] } },
    ],
    output: { table: 'records', mode: 'post', fields: ['title','description','content','pics'], status: 'draft' },
  },
}
```

`type:'image'` là ngoại lệ không tổng quát hoá được (gọi Hugging Face thật) — engine special-case
đúng step này; mọi step `type:'text'` hoàn toàn generic.

Doc `fields` của mỗi lần chạy (xem §2) là **1 object phẳng duy nhất** — không còn tách
`mkt`/`draft` như code cũ. `output.fields` chọn ra những key nào trong bag phẳng đó là "kết quả
cuối" hiển thị ở review + copy khi tạo post.

**Seed & sửa cấu hình:** doc `divisions/marketing` được seed 1 lần từ hằng số JS local (di dời
nguyên nội dung `tools/prompts.js` hiện có) — nếu chưa tồn tại trong Firestore khi
`svc-marketing`/`svc-talk` cần dùng, tự `set()` seed đó vào rồi dùng luôn. Sau khi có trong DB,
sửa `meta` sau này qua **Xuất/Nhập CSV có sẵn của `svc-admin`** (`_dfExportCsv`/`_dfImportCsv` đã
tự gộp toàn bộ `meta` thành 1 cột JSON khi không cột con `meta.x` nào khớp field editor — xem
`svc-admin.js` dòng ~403-419 và ~475-491) — không cần thêm field-type mới cho `web-table`.

## 2. `tools/engine.js` (mới) — pipeline generic

- `buildCallPrompt(step, call, topic, languageName, fieldsSoFar)` → `{system, user}` — build
  persona (`step.role`+`step.task`) + JSON shape từ `call.fields[].desc`, tổng quát hoá
  `buildStep1Prompt`/`buildStep2Prompt`/`buildStep3*Prompt` cũ.
- `orderCallWaves(calls)` — topo-sort theo `call.dependsOn` thành từng "wave"; calls trong cùng
  wave chạy `Promise.all` (song song), wave sau chờ wave trước — tổng quát hoá cách step 1/2 chạy
  song song và step 3's `content` chờ `titleDesc`.
- `generateJsonWithRetry(ai, opts)` — di dời nguyên `_generateJson`/`_parseJsonObject`/
  `_cleanJson`/`_hasForeignScript` từ `svc-marketing.js` (retry 3 lần + demoteModel + chống lẫn
  ngôn ngữ khác) — dùng chung cho mọi division thay vì chỉ marketing.
- `runTextStep({step, topic, languageName, ai, fields, hasData, onPatch})` — chạy hết các wave của
  1 step `type:'text'`, skip call đã có data (tương đương `_skipIfDone` cũ), gọi `onPatch(partial)`
  để caller cập nhật UI ngay khi từng call xong (giữ đúng UX "hiện dần từng sub-step" hiện có).

## 3. `tools/image.js` (mới, di dời từ `svc-marketing.js`/`prompts.js`)

`buildImageConceptPrompt`, `buildImagePrompt`, `IMAGE_NEGATIVE_PROMPT`, `_describeColors` +
`_runImageGenerate` (gọi Hugging Face + upload) — nguyên vẹn logic cũ, chỉ đổi tham số cứng
`IMAGE_CONTEXT_KEYS` thành `step.concept.contextKeys` đọc từ config. Dùng chung bởi
`svc-marketing.js` và `svc-talk.js` (division nào có step `type:'image'` đều gọi lại được).

## 4. `svc-marketing.js` — refactor, giữ nguyên UI/UX

Load config của chính nó (`divisions/marketing`, cache qua `loadData`) thay vì import
`tools/prompts.js` trực tiếp. `_runStep1/2/3` cũ gộp thành 1 lời gọi `runTextStep` theo đúng step
config; `_runStep4`/`_runImageGenerate` gọi `tools/image.js`. Doc Firestore đổi
`mkt`+`draft` → 1 object `fields` phẳng; review phase đọc `fields` theo `division.meta.output.fields`.
Toàn bộ macro/sub-step UI, review phase, nút "Tạo lại ảnh", 3 nút mở AI ngoài... giữ nguyên như cũ.

`processTable` đổi mặc định `'mkt'` → `'marketing'`.

## 5. `svc-talk.js` — chat sếp ↔ phòng ban

**Đã pivot — xem "Update v2" ở cuối file.** Bản đầu (tái dùng `<svc-chat>`, per-division DM tab,
1 doc `talks`/topic) đã bị thay bằng UI độc lập + 1 nhóm chat chung nhiều phòng ban luân phiên trả
lời tự nhiên. `svc-chat.js` đã revert nguyên trạng, KHÔNG còn `hideCall`/`m.actions` nữa.

## 6. `divisions.astro` + schema admin

`<svc-admin dataTable='divisions'>` với schema phẳng thông thường (title/description/status/
pics/lang/ai) — giống hệt `staff.js`/`posts.js`. Sửa `meta.steps` qua Xuất/Nhập CSV (§1), không
cần UI kéo-thả riêng cho pipeline (cấu hình này do dev soạn, không phải sếp tự chỉnh tay).

## 7. Mount `<svc-talk>`

Gắn trong `LayoutAdmin.astro` (toàn bộ trang admin), theo đúng pattern `<svc-roles>` đã có —
1 fab cố định, tự ẩn nếu chưa có division nào `active`.

## Ngoài phạm vi (không làm ở đây)

- Không build UI kéo-thả chỉnh sửa `meta.steps` trực quan.
- Không tổng quát hoá `output` cho nhiều loại kết quả khác blog-post (chỉ marketing có output
  config lúc này) — thêm phòng ban khác với output khác sẽ mở rộng `output` shape khi cần.
- Không làm việc tóm tắt câu hỏi tự do của sếp thành 1 "topic" ngắn gọn thủ công — việc này giờ do
  chính AI của từng division tự làm (xem Update v2 §chatter).

---

## Update v2 (cùng ngày) — bỏ svc-chat, thêm lớp "trò chuyện tự nhiên"

Yêu cầu mới: `svc-talk.js` KHÔNG dùng `<svc-chat>` nữa (đã revert svc-chat.js/svc-chat.css về
nguyên trạng), và thay mô hình "per-division DM tab" bằng **1 nhóm chat chung** — sếp nhắn 1 chỗ
duy nhất, TỪNG division đang `active` LẦN LƯỢT (turn-based) tự quyết định có nên trả lời không,
trả lời tự nhiên/vui vẻ thế nào, và tự nhận ra khi nào tin nhắn là 1 yêu cầu công việc thật.

### UI — độc lập, không phụ thuộc svc-chat

- `<web-fab>` (icon "ri:team-line") mở 1 popover neo cạnh nó — dùng lại đúng kỹ thuật của
  `web-dropdown.js`: `popover="manual"` (Popover API, top-layer, không bị kẹt containing block bởi
  ancestor có transform/filter/backdrop-filter), tự tính lại `top/left` từ
  `fab.getBoundingClientRect()` mỗi lần mở (bám đúng vị trí fab dù fab `movable`), đóng khi bấm ra
  ngoài (`mousedown` capture + `composedPath().includes(this)`) — KHÔNG phải `<dialog>` full-screen.
- Bên trong popover: 1 khung chat tự vẽ (`.tlk-messages` + `.tlk-composer`) — bubble trái/phải theo
  `from === 'boss'`, avatar qua `<web-avatar>` (apex, primitive dùng chung, không phải phần của
  svc-chat), 1 bubble "•••" tạm thời (không persist) khi 1 division đang "gõ".

### Data model — 1 collection `talks` duy nhất, phẳng theo thời gian

Không còn "1 doc/topic" — mỗi doc `talks` là **1 bubble trong nhóm chat**, `kind`:

- `'chat'` — `{ kind:'chat', from: 'boss'|divisionId, content, created_at, updated_at }`.
- `'job'` — tiến trình + kết quả pipeline chuyên môn (đúng field cũ): `{ kind:'job', from:
  divisionId, division: divisionId, topic, language, colors, status, error, fields, approved,
  createdPostId, created_at, updated_at }`.

Toàn bộ `_log` (mảng, sort theo `created_at`) render trực tiếp thành bubble, không cần dựng lại gì.

### Lớp "trò chuyện tự nhiên" — `tools/chatter.js` (mới)

`decideChatterReply(ai, division, recentMessages, message)` — 1 lệnh AI JSON strict (dùng lại
`generateJsonWithRetry` của `tools/engine.js`, KHÔNG đụng gì tới engine cũ) trả về:

```js
{ reply: "câu trả lời ngắn, tự nhiên, tiếng Việt", isTask: true|false, topic: "..." }
```

System prompt yêu cầu model đóng vai trưởng phòng, trả lời NGẮN + tự nhiên/vui vẻ (không phải báo
cáo trịnh trọng), đồng thời tự phán đoán tin nhắn mới nhất của sếp có phải việc thật thuộc chuyên
môn phòng mình không — đúng ví dụ sếp cho: "quà noel" → marketing tự hiểu đây là topic thật.

### Luồng 1 tin nhắn của sếp (`svc-talk.js`'s `_reactTurn`)

1. Boss gửi → persist 1 doc `kind:'chat', from:'boss'` → đẩy vào **hàng đợi tuần tự toàn cục**
   (`this._queue`, instance-level, FIFO — giữ nguyên nguyên tắc "1 division nói tại 1 thời điểm").
2. LẦN LƯỢT từng division `active`: gọi `decideChatterReply` (kèm 8 tin gần nhất làm ngữ cảnh) →
   post ngay câu `reply` (nếu có) → nếu `isTask`, gom vào hàng chờ pipeline (KHÔNG chạy ngay).
3. Sau khi TẤT CẢ division đã "chat" xong lượt này (nhanh, không bị heavy pipeline chặn giữa
   chừng), mới lần lượt chạy pipeline thật (`_runJob`, tái dùng y hệt `runTextStep`/`runImageStep`
   không đổi 1 dòng) cho từng job đã gom — post job doc `kind:'job', status:'queued'` trước khi
   chạy để bubble "đang xử lý…" hiện ngay, patch Firestore + `_log` sau MỖI step (resumable y hệt
   svc-marketing.js).
4. Xong → bubble hiện tóm tắt + nút Duyệt/Tạo lại (nút thật, `<web-button>` trong bubble — không
   cần cơ chế `m.actions` nữa vì không còn dùng svc-chat).

### Duyệt — không đổi so với bản đầu

Đọc `division.meta.output` (`table:'posts'`, `fields`, `status`) → `createService('posts').create(...)`
→ đánh dấu job doc `approved: true, createdPostId`.

### Ngoài phạm vi (v2)

- Chưa có "skip" (1 division im lặng nếu tin nhắn không liên quan) — mọi division active đều được
  hỏi ý kiến mỗi tin nhắn; với nhiều phòng ban hơn sau này, cân nhắc bổ sung nếu thấy ồn.
- Chưa giới hạn/dedupe nếu 2 division cùng nhận ra cùng 1 topic — chấp nhận được vì hiện chỉ có 1
  division (marketing).
