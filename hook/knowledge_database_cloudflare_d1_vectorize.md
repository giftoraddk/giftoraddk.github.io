# Generic Knowledge Base — Cloudflare D1 + Vectorize

## 1. Mục tiêu

Knowledge Base tổng quát cho nhiều domain:

- `law`
- `product`
- `medical`
- `technical`
- `finance`
- `faq`
- ...

Không tạo table riêng cho từng domain.

Kiến trúc tối giản:

```text
Cloudflare D1
├── know    → nội dung + metadata
└── rel     → quan hệ giữa knowledge

Cloudflare Vectorize
└── knowledge → embedding / semantic search
```

**D1 không lưu embedding.** Embedding được lưu trong Vectorize.

---

## 2. Kiến trúc RAG

```text
Question
   │
   ▼
Worker
   │
   ▼
Workers AI ──→ embedding
   │
   ▼
Vectorize ──→ semantic search
   │
   ▼
know.id
   │
   ▼
D1 ──→ content + metadata
   │
   ├── rel ──→ related knowledge
   │
   ▼
Context
   │
   ▼
LLM
   │
   ▼
Answer
```

Thành phần:

| Thành phần | Vai trò |
|---|---|
| D1 | SQL / source of truth |
| Vectorize | vector database / similarity search |
| Workers AI | embedding và/hoặc LLM |
| Worker | API + ingestion + RAG orchestration |

---

# 3. Tên bảng / resource

Tên ngắn nhưng vẫn dễ hiểu:

```text
D1:
    know
    rel

Vectorize:
    knowledge
```

Không dùng:

```text
knowledge_embedding
knowledge_relation
product_knowledge
medical_knowledge
law_knowledge
```

---

# 4. D1: `know`

```sql
CREATE TABLE know (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT NOT NULL,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    meta        TEXT NOT NULL DEFAULT '{}',
    version     INTEGER NOT NULL DEFAULT 1,
    status      TEXT NOT NULL DEFAULT 'active',
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_know_type
ON know(type);

CREATE INDEX idx_know_status
ON know(status);
```

Ý nghĩa:

```text
id         → ID knowledge
type       → loại knowledge
title      → tiêu đề
content    → nội dung
meta       → metadata JSON
version    → version
status     → draft / active / archived
```

D1 dùng SQLite, vì vậy `meta` lưu JSON dưới dạng `TEXT`.

Ví dụ:

```json
{
  "country": "VN",
  "article": "13",
  "effective_date": "2021-01-01"
}
```

---

# 5. D1: `rel`

Quan hệ giữa các knowledge:

```sql
CREATE TABLE rel (
    from_id     INTEGER NOT NULL,
    to_id       INTEGER NOT NULL,
    type        TEXT NOT NULL,
    meta        TEXT NOT NULL DEFAULT '{}',

    PRIMARY KEY (from_id, to_id, type),

    FOREIGN KEY (from_id)
        REFERENCES know(id)
        ON DELETE CASCADE,

    FOREIGN KEY (to_id)
        REFERENCES know(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_rel_from ON rel(from_id);
CREATE INDEX idx_rel_to ON rel(to_id);
CREATE INDEX idx_rel_type ON rel(type);
```

Ví dụ:

```text
Điều 13
    │
    └── part_of ──> Bộ luật Lao động

Influenza
    │
    ├── has_symptom ──> Fever
    └── caused_by ────> Influenza Virus

iPhone
    │
    ├── made_by ──────> Apple
    └── has_feature ──> ProMotion
```

---

# 6. Vì sao không có `vec`

Không tạo table embedding trong D1:

```text
vec
knowledge_embedding
knowledge_vector
embedding
```

Thay vào đó:

```text
D1
 │
 └── know.id
          │
          │ same ID
          ▼
Vectorize
 │
 └── vector + metadata
```

Ví dụ:

```text
D1

know
┌─────┬───────────────┐
│ id  │ title         │
├─────┼───────────────┤
│ 101 │ Điều 13       │
│ 102 │ Điều 14       │
└─────┴───────────────┘


Vectorize

┌─────┬────────────────┐
│ id  │ embedding      │
├─────┼────────────────┤
│ 101 │ [0.12, ...]    │
│ 102 │ [0.83, ...]    │
└─────┴────────────────┘
```

Quy ước:

```text
Vectorize.id = String(know.id)
```

Không cần mapping table.

---

# 7. Tạo Vectorize index

Ví dụ:

```bash
npx wrangler vectorize create knowledge   --dimensions=1536   --metric=cosine
```

`1536` chỉ là ví dụ.

Dimension phải khớp với embedding model.

---

# 8. Wrangler configuration

Ví dụ:

```toml
name = "knowledge-api"
main = "src/index.ts"
compatibility_date = "2026-01-01"

[[d1_databases]]
binding = "DB"
database_name = "knowledge"
database_id = "YOUR_D1_DATABASE_ID"

[[vectorize]]
binding = "VEC"
index_name = "knowledge"

[ai]
binding = "AI"
```

Worker bindings:

```ts
export interface Env {
  DB: D1Database;
  VEC: VectorizeIndex;
  AI: Ai;
}
```

---

# 9. Tạo knowledge

API:

```text
POST /know
```

Request:

```json
{
  "type": "law",
  "title": "Điều kiện của hợp đồng lao động",
  "content": "Hợp đồng lao động phải có các nội dung ...",
  "meta": {
    "country": "VN",
    "article": "13"
  }
}
```

Insert:

```ts
const result = await env.DB
  .prepare(`
    INSERT INTO know (
      type,
      title,
      content,
      meta
    )
    VALUES (?, ?, ?, ?)
    RETURNING *
  `)
  .bind(
    body.type,
    body.title,
    body.content,
    JSON.stringify(body.meta ?? {})
  )
  .first();
```

---

# 10. Ingestion → Embedding → Vectorize

Flow:

```text
POST /know
    │
    ▼
Validate
    │
    ▼
Insert D1
    │
    ▼
Chunk content
    │
    ▼
Workers AI
    │
    ▼
Embedding
    │
    ▼
Vectorize.upsert()
```

Nếu content dài, nên chunk trước khi embedding.

---

# 11. Chunking

Không nên embedding một document cực lớn thành một vector.

Ví dụ:

```text
Bộ luật Lao động
        │
        ├── Điều 1
        ├── Điều 2
        ├── Điều 3
        ├── ...
        └── Điều 13
```

Khuyến nghị cho schema tối giản:

> Mỗi chunk có ý nghĩa độc lập và được lưu thành một `know`.

Ví dụ:

```text
know #100 = Bộ luật Lao động
know #101 = Điều 1
know #102 = Điều 2
know #103 = Điều 13
```

Quan hệ:

```text
101 --part_of--> 100
102 --part_of--> 100
103 --part_of--> 100
```

Vectorize:

```text
101 → embedding Điều 1
102 → embedding Điều 2
103 → embedding Điều 13
```

Ưu điểm:

- retrieval chính xác hơn
- citation dễ hơn
- update từng phần
- relation rõ ràng
- không cần bảng chunk riêng

---

# 12. Tạo embedding

Ví dụ Worker:

```ts
const result = await env.AI.run(
  "@cf/baai/bge-base-en-v1.5",
  {
    text: [content]
  }
);

const embedding = result.data[0];
```

Tên model chỉ là ví dụ. Nên cấu hình tập trung:

```ts
const EMBEDDING_MODEL = "...";
```

Không hard-code tên model ở nhiều nơi.

---

# 13. Upsert Vectorize

Dùng `know.id` làm vector ID:

```ts
await env.VEC.upsert([
  {
    id: String(know.id),
    values: embedding,
    metadata: {
      type: know.type,
      title: know.title
    }
  }
]);
```

Thiết kế:

```text
D1 know.id
      =
Vectorize vector.id
```

---

# 14. Semantic Search

Flow:

```text
Question
   │
   ▼
Workers AI
embedding(question)
   │
   ▼
Vectorize.query()
   │
   ▼
Top K vector IDs
   │
   ▼
D1
   │
   ▼
Knowledge content
```

Ví dụ:

```ts
const result = await env.VEC.query(
  queryEmbedding,
  {
    topK: 10,
    returnMetadata: "all"
  }
);
```

Kết quả có thể là:

```text
101
205
310
```

Sau đó lấy content từ D1.

---

# 15. Load knowledge từ D1

Dùng parameter binding:

```ts
const ids = result.matches.map(
  x => Number(x.id)
);

const placeholders = ids.map(() => "?").join(",");

const rows = await env.DB
  .prepare(`
    SELECT *
    FROM know
    WHERE id IN (${placeholders})
      AND status = 'active'
  `)
  .bind(...ids)
  .all();
```

Không nối trực tiếp input của user vào SQL.

---

# 16. Metadata

D1 là source of truth:

```json
{
  "brand": "Apple",
  "model": "iPhone 17 Pro",
  "category": "smartphone"
}
```

Vectorize chỉ nên giữ metadata cần cho retrieval/filter:

```json
{
  "type": "product",
  "brand": "Apple"
}
```

Nguyên tắc:

```text
D1
→ toàn bộ metadata

Vectorize
→ metadata tối thiểu cần search/filter
```

---

# 17. RAG

Pseudo-code:

```ts
async function rag(
  question: string,
  env: Env
) {
  // 1. Embed question
  const queryVector = await embed(question, env);

  // 2. Semantic search
  const result = await env.VEC.query(
    queryVector,
    {
      topK: 10,
      returnMetadata: "all"
    }
  );

  // 3. Get knowledge IDs
  const ids = result.matches.map(
    match => Number(match.id)
  );

  // 4. Load source data from D1
  const knowledge = await getKnow(ids, env);

  // 5. Build context
  const context = knowledge
    .map(k => `${k.title}
${k.content}`)
    .join("

");

  // 6. Generate answer
  return generateAnswer(
    question,
    context,
    env
  );
}
```

Flow đầy đủ:

```text
User question
      ↓
Embedding
      ↓
Vectorize
      ↓
Top K
      ↓
D1
      ↓
Optional rel expansion
      ↓
Context
      ↓
LLM
      ↓
Answer
```

---

# 18. Relation trong RAG

Ví dụ Vectorize tìm được:

```text
Điều 13
```

Có thể query `rel`:

```text
Điều 13
   │
   ├── part_of → Bộ luật Lao động
   ├── related_to → Hợp đồng lao động
   └── references → Điều 14
```

Sau đó load thêm các knowledge liên quan.

Nên giới hạn:

```text
depth = 1
```

và:

```text
max related nodes = 5
```

Không lấy toàn bộ graph.

---

# 19. Update knowledge

Khi content thay đổi:

```text
D1 UPDATE
     │
     ▼
Create embedding mới
     │
     ▼
Vectorize.upsert()
```

Ví dụ:

```ts
await env.DB
  .prepare(`
    UPDATE know
    SET
      content = ?,
      version = version + 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `)
  .bind(content, id)
  .run();
```

Sau đó tạo embedding mới và:

```ts
await env.VEC.upsert([
  {
    id: String(id),
    values: embedding,
    metadata: {
      type,
      title
    }
  }
]);
```

---

# 20. Delete knowledge

Xóa D1:

```ts
await env.DB
  .prepare(`
    DELETE FROM know
    WHERE id = ?
  `)
  .bind(id)
  .run();
```

Đồng thời xóa Vectorize:

```ts
await env.VEC.deleteByIds([
  String(id)
]);
```

Không để vector mồ côi.

---

# 21. Consistency

D1 và Vectorize là hai hệ thống khác nhau.

Không có một transaction ACID chung:

```text
D1 transaction
    ≠
Vectorize transaction
```

Vì vậy ingestion production nên có retry.

Flow:

```text
1. Write D1
2. Generate embedding
3. Upsert Vectorize
4. Nếu Vectorize fail → retry
```

Khi hệ thống lớn hơn có thể thêm trạng thái processing vào `know`.

Nhưng phiên bản tối giản chưa cần thêm column đó.

---

# 22. Hybrid Search

Production có thể kết hợp:

```text
                 Query
                   │
          ┌────────┴────────┐
          ▼                 ▼
     Vector Search      Keyword Search
      Vectorize               D1
          │                 │
          └────────┬────────┘
                   ▼
              Re-ranking
                   │
                   ▼
               Top results
```

Ban đầu chỉ cần Vectorize.

Chỉ thêm keyword/FTS khi nhu cầu thực tế xuất hiện.

---

# 23. Source / Citation

Source có thể lưu trong `meta`:

```json
{
  "source": {
    "name": "Bộ luật Lao động",
    "url": "https://...",
    "article": "13"
  }
}
```

D1 giữ source đầy đủ.

Vectorize chỉ giữ metadata cần retrieval.

Khi RAG trả lời:

```text
Knowledge
    ↓
Context
    ↓
LLM
    ↓
Answer + Citation
```

---

# 24. Multi-domain

Không thay đổi schema.

### Law

```json
{
  "type": "law",
  "title": "Điều 13",
  "content": "...",
  "meta": {
    "country": "VN",
    "article": "13"
  }
}
```

### Product

```json
{
  "type": "product",
  "title": "iPhone 17 Pro",
  "content": "...",
  "meta": {
    "brand": "Apple",
    "model": "iPhone 17 Pro"
  }
}
```

### Medical

```json
{
  "type": "medical",
  "title": "Influenza",
  "content": "...",
  "meta": {
    "category": "infectious_disease",
    "symptoms": [
      "fever",
      "cough"
    ]
  }
}
```

---

# 25. API tối thiểu

```text
POST   /know
GET    /know/:id
PUT    /know/:id
DELETE /know/:id

POST   /search
POST   /rag
```

Không tạo:

```text
POST /law
POST /product
POST /medical
```

Domain được xác định bởi:

```json
{
  "type": "law"
}
```

---

# 26. Folder structure

```text
src/
├── index.ts
│
├── know/
│   ├── create.ts
│   ├── get.ts
│   ├── update.ts
│   └── delete.ts
│
├── search/
│   ├── embed.ts
│   ├── vector.ts
│   └── hybrid.ts
│
├── rag/
│   ├── retrieve.ts
│   ├── context.ts
│   └── answer.ts
│
├── rel/
│   └── query.ts
│
└── db/
    └── queries.ts
```

Không cần:

```text
law/
product/
medical/
```

trừ khi từng domain có business logic thực sự khác nhau.

---

# 27. Migration

File:

```text
migrations/
└── know_db.sql
```

Nội dung:

```sql
CREATE TABLE know (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT NOT NULL,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    meta        TEXT NOT NULL DEFAULT '{}',
    version     INTEGER NOT NULL DEFAULT 1,
    status      TEXT NOT NULL DEFAULT 'active',
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_know_type
ON know(type);

CREATE INDEX idx_know_status
ON know(status);

CREATE TABLE rel (
    from_id     INTEGER NOT NULL,
    to_id       INTEGER NOT NULL,
    type        TEXT NOT NULL,
    meta        TEXT NOT NULL DEFAULT '{}',

    PRIMARY KEY (from_id, to_id, type),

    FOREIGN KEY (from_id)
        REFERENCES know(id)
        ON DELETE CASCADE,

    FOREIGN KEY (to_id)
        REFERENCES know(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_rel_from
ON rel(from_id);

CREATE INDEX idx_rel_to
ON rel(to_id);

CREATE INDEX idx_rel_type
ON rel(type);
```

Apply:

```bash
npx wrangler d1 migrations apply knowledge
```

---

# 28. Final architecture

```text
                       Cloudflare
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
           D1          Vectorize      Workers AI
            │              │              │
       ┌────┴────┐         │         embedding
       │         │         │         + LLM
     know       rel        │
       │         │         │
       └────┬────┘         │
            │              │
            │   know.id    │
            └──────────────┘
                    │
                    ▼
              Semantic Search
                    │
                    ▼
                   RAG
```

## Database tối thiểu

```text
D1
├── know
└── rel
```

## Vector database

```text
Vectorize
└── knowledge
```

## AI

```text
Workers AI
├── embedding
└── LLM
```

### Kết luận

Bắt đầu với:

```text
D1:
    know
    rel

Vectorize:
    knowledge
```

Không tạo:

```text
knowledge_embedding
knowledge_vector
knowledge_relation
law_knowledge
product_knowledge
medical_knowledge
```

D1 là **source of truth**, Vectorize là **retrieval layer**, Workers AI là **AI layer**.

Chỉ thêm table khi có một yêu cầu dữ liệu thực tế mà `know + rel` không thể xử lý tốt.
