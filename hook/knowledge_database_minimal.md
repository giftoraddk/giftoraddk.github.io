# Generic Knowledge Database — Minimal Schema

## 1. Mục tiêu

Thiết kế database tổng quát để lưu nhiều loại kiến thức:

- `law` — luật
- `product` — sản phẩm
- `medical` — y khoa
- `technical` — kỹ thuật
- `finance` — tài chính
- `faq` — câu hỏi thường gặp
- ...

Nguyên tắc:

> Không tạo table riêng cho từng loại knowledge.

Chỉ dùng 3 table chính:

```text
know  → nội dung kiến thức
rel   → quan hệ giữa các knowledge
vec   → vector embedding phục vụ semantic search / RAG
```

Nếu chưa cần vector search thì chỉ cần `know` + `rel`.

---

# 2. Tên bảng

| Table | Ý nghĩa | Mục đích |
|---|---|---|
| `know` | knowledge | Lưu đơn vị kiến thức |
| `rel` | relation | Quan hệ giữa các knowledge |
| `vec` | vector | Embedding của knowledge |

Tên được giữ ngắn nhưng vẫn có thể hiểu ngay khi đọc code.

Không sử dụng các tên dài như:

```text
knowledge_embedding
knowledge_relation
knowledge_attribute
product_knowledge
medical_knowledge
law_knowledge
```

---

# 3. Schema

Khuyến nghị PostgreSQL.

## 3.1. `know`

```sql
CREATE TABLE know (
    id          BIGSERIAL PRIMARY KEY,
    type        VARCHAR(50) NOT NULL,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    meta        JSONB NOT NULL DEFAULT '{}',
    version     INT NOT NULL DEFAULT 1,
    status      VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_know_type ON know(type);
CREATE INDEX idx_know_status ON know(status);
CREATE INDEX idx_know_meta ON know USING GIN(meta);
```

### Ý nghĩa

```text
id       = ID knowledge
type     = loại knowledge
title    = tiêu đề
content  = nội dung chính
meta     = dữ liệu đặc thù theo domain
version  = version của knowledge
status   = active / draft / archived
```

`meta` dùng JSONB để tránh phải tạo table riêng cho từng domain.

---

# 4. Ví dụ dữ liệu

## 4.1. Luật

```sql
INSERT INTO know (
    type,
    title,
    content,
    meta
)
VALUES (
    'law',
    'Điều kiện của hợp đồng lao động',
    'Hợp đồng lao động phải có các nội dung ...',
    '{
        "country": "VN",
        "law": "Bộ luật Lao động",
        "article": "13",
        "effective_date": "2021-01-01"
    }'
);
```

## 4.2. Sản phẩm

```sql
INSERT INTO know (
    type,
    title,
    content,
    meta
)
VALUES (
    'product',
    'iPhone 17 Pro',
    'iPhone 17 Pro có màn hình ...',
    '{
        "brand": "Apple",
        "model": "iPhone 17 Pro",
        "category": "smartphone"
    }'
);
```

## 4.3. Y khoa

```sql
INSERT INTO know (
    type,
    title,
    content,
    meta
)
VALUES (
    'medical',
    'Influenza',
    'Influenza là bệnh nhiễm virus đường hô hấp ...',
    '{
        "category": "infectious_disease",
        "symptoms": ["fever", "cough", "fatigue"]
    }'
);
```

---

# 5. `rel`

Lưu quan hệ giữa hai knowledge.

```sql
CREATE TABLE rel (
    from_id     BIGINT NOT NULL,
    to_id       BIGINT NOT NULL,
    type        VARCHAR(50) NOT NULL,
    meta        JSONB NOT NULL DEFAULT '{}',

    PRIMARY KEY (from_id, to_id, type),

    FOREIGN KEY (from_id) REFERENCES know(id) ON DELETE CASCADE,
    FOREIGN KEY (to_id) REFERENCES know(id) ON DELETE CASCADE
);

CREATE INDEX idx_rel_from ON rel(from_id);
CREATE INDEX idx_rel_to ON rel(to_id);
CREATE INDEX idx_rel_type ON rel(type);
```

## Ví dụ

```text
Điều 13
   │
   └── part_of ──> Bộ luật Lao động

Influenza
   │
   ├── has_symptom ──> Fever
   └── caused_by ──> Influenza Virus

iPhone 17 Pro
   │
   ├── made_by ──> Apple
   └── has_feature ──> ProMotion
```

Insert:

```sql
INSERT INTO rel (from_id, to_id, type)
VALUES
    (1, 2, 'part_of'),
    (3, 4, 'has_symptom');
```

---

# 6. `vec`

Chỉ tạo nếu hệ thống cần semantic search / RAG.

Cài `pgvector`:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Sau đó:

```sql
CREATE TABLE vec (
    know_id     BIGINT PRIMARY KEY,
    embedding   VECTOR(1536),

    FOREIGN KEY (know_id) REFERENCES know(id) ON DELETE CASCADE
);
```

Nếu model embedding có dimension khác thì thay `1536`.

Ví dụ:

```text
OpenAI embedding
1536 dimensions

=> VECTOR(1536)
```

Index:

```sql
CREATE INDEX idx_vec_embedding
ON vec
USING hnsw (embedding vector_cosine_ops);
```

---

# 7. Kiến trúc tổng thể

```text
                    ┌─────────────┐
                    │    know     │
                    │-------------│
                    │ id          │
                    │ type        │
                    │ title       │
                    │ content     │
                    │ meta        │
                    │ version     │
                    │ status      │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │                         │
              ▼                         ▼
        ┌───────────┐             ┌───────────┐
        │    rel    │             │    vec    │
        │-----------│             │-----------│
        │ from_id   │             │ know_id   │
        │ to_id     │             │ embedding │
        │ type      │             └───────────┘
        └───────────┘
```

---

# 8. Cách xử lý knowledge

Mỗi knowledge nên là một đơn vị có ý nghĩa độc lập.

Không nên lưu một document cực lớn thành một record duy nhất nếu hệ thống dùng RAG.

Ví dụ document luật:

```text
Bộ luật Lao động
    ↓
Điều 1
Điều 2
Điều 3
...
Điều 13
...
```

Có thể lưu:

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

Điều này giúp:

- tìm kiếm chính xác hơn
- citation chính xác hơn
- embedding nhỏ hơn
- cập nhật từng phần
- xây knowledge graph dễ hơn

---

# 9. Metadata

Không nên đưa tất cả field vào column của `know`.

Không nên:

```sql
CREATE TABLE know (
    ...
    country TEXT,
    article TEXT,
    brand TEXT,
    model TEXT,
    disease TEXT,
    symptom TEXT,
    price NUMERIC,
    manufacturer TEXT,
    ...
);
```

Vì sau này domain sẽ tăng liên tục.

Thay vào đó:

```json
{
    "country": "VN",
    "article": "13",
    "effective_date": "2021-01-01"
}
```

hoặc:

```json
{
    "brand": "Apple",
    "model": "iPhone 17 Pro",
    "category": "smartphone"
}
```

hoặc:

```json
{
    "disease": "Influenza",
    "severity": "mild",
    "age_group": "adult"
}
```

---

# 10. Query metadata

PostgreSQL JSONB:

```sql
SELECT *
FROM know
WHERE meta->>'country' = 'VN';
```

Tìm product:

```sql
SELECT *
FROM know
WHERE type = 'product'
  AND meta->>'brand' = 'Apple';
```

Tìm theo article:

```sql
SELECT *
FROM know
WHERE type = 'law'
  AND meta->>'article' = '13';
```

Tìm array:

```sql
SELECT *
FROM know
WHERE meta->'symptoms' ? 'fever';
```

---

# 11. Semantic search

Flow:

```text
User question
     ↓
Embedding question
     ↓
Search vec
     ↓
Get know.id
     ↓
Load know.content
     ↓
Optional: load rel
     ↓
Build context
     ↓
LLM
```

SQL ví dụ:

```sql
SELECT
    k.id,
    k.title,
    k.content,
    1 - (v.embedding <=> :query_embedding) AS score
FROM vec v
JOIN know k ON k.id = v.know_id
WHERE k.status = 'active'
ORDER BY v.embedding <=> :query_embedding
LIMIT 10;
```

---

# 12. Hybrid search

Trong production nên kết hợp:

```text
Keyword search
       +
Vector search
       +
Metadata filter
       +
Relation
```

Ví dụ:

```text
User:
"Điều kiện thử việc theo luật Việt Nam"

          ↓

Filter:
type = law
country = VN

          ↓

Vector search

          ↓

Keyword search:
"thử việc"
"Điều kiện"

          ↓

Combine score

          ↓

Top knowledge

          ↓

Load related knowledge

          ↓

LLM
```

---

# 13. API model

Không nên tạo API riêng:

```text
POST /law
POST /product
POST /medical
```

Chỉ cần:

```text
POST /know
GET  /know/:id
PUT  /know/:id
DELETE /know/:id
```

Request:

```json
{
    "type": "law",
    "title": "Điều kiện của hợp đồng lao động",
    "content": "....",
    "meta": {
        "country": "VN",
        "article": "13"
    }
}
```

Product:

```json
{
    "type": "product",
    "title": "iPhone 17 Pro",
    "content": "....",
    "meta": {
        "brand": "Apple",
        "model": "iPhone 17 Pro"
    }
}
```

Không cần thay đổi backend khi thêm domain mới.

---

# 14. Backend model

Ví dụ TypeScript:

```ts
type Know = {
  id: number;
  type: string;
  title: string;
  content: string;
  meta: Record<string, unknown>;
  version: number;
  status: "draft" | "active" | "archived";
  createdAt: Date;
  updatedAt: Date;
};

type Rel = {
  fromId: number;
  toId: number;
  type: string;
  meta: Record<string, unknown>;
};
```

Không tạo:

```ts
LawKnowledge
ProductKnowledge
MedicalKnowledge
```

Thay vào đó:

```ts
Know
```

---

# 15. Khi nào cần thêm table?

Chỉ thêm table khi dữ liệu có tính chất riêng và cần query/constraint/index riêng.

Ví dụ:

```text
know
rel
vec
```

là đủ cho knowledge core.

Sau này nếu cần:

```text
user
tenant
permission
audit
source
document
```

thì tạo riêng vì đó là **system data**, không phải domain knowledge.

Không nên cố nhét tất cả vào `know`.

---

# 16. Source / Citation

Nếu knowledge cần citation mạnh, có thể lưu source ngay trong `meta`:

```json
{
    "source": {
        "name": "Bộ luật Lao động",
        "url": "...",
        "publisher": "...",
        "published_at": "2021-01-01"
    }
}
```

Nếu source cần quản lý phức tạp:

```text
know
source
rel
vec
```

Nhưng **không tạo `source` ngay từ đầu nếu chưa cần**.

---

# 17. Versioning

Mỗi lần knowledge thay đổi:

```text
id = 100
version = 1
```

sửa thành:

```text
version = 2
```

Nếu cần audit/history đầy đủ, sau này có thể thêm:

```text
know_ver
```

Không cần đưa version history vào schema tối thiểu.

---

# 18. Quy tắc thiết kế

### Rule 1 — Domain không quyết định table

Sai:

```text
law → law table
product → product table
medical → medical table
```

Đúng:

```text
law
product
medical
    ↓
  know
```

### Rule 2 — Field phổ biến để column

```text
id
type
title
content
version
status
created_at
updated_at
```

### Rule 3 — Field đặc thù để `meta`

```text
law       → article, country, effective_date
product   → brand, model, price
medical   → disease, symptom, severity
```

### Rule 4 — Quan hệ dùng `rel`

```text
part_of
related_to
caused_by
has_symptom
has_feature
replaced_by
depends_on
```

### Rule 5 — Semantic search dùng `vec`

```text
know ↔ vec
```

---

# 19. Final schema

Nếu cần tối giản nhất:

```text
┌─────────────────────────┐
│          know           │
├─────────────────────────┤
│ id                      │
│ type                    │
│ title                   │
│ content                 │
│ meta JSONB              │
│ version                 │
│ status                  │
│ created_at              │
│ updated_at              │
└────────────┬────────────┘
             │
       ┌─────┴─────┐
       ▼           ▼
    ┌───────┐   ┌───────┐
    │  rel  │   │  vec  │
    ├───────┤   ├───────┤
    │from_id│   │know_id│
    │to_id  │   │vector │
    │type   │   └───────┘
    └───────┘
```

**Tối thiểu: 2 table**

```text
know
rel
```

**Có RAG/vector: 3 table**

```text
know
rel
vec
```

Đây là schema nên bắt đầu triển khai. Chỉ thêm table khi xuất hiện một nhu cầu dữ liệu thực tế mà `know`, `rel`, `vec` không còn phù hợp.
