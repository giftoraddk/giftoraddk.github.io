# Astro + Lit + Supabase Auth + Cloudflare Worker + OpenRouter + Firestore

## 1. Mục tiêu

Tài liệu này mô tả kiến trúc:

```text
                         ┌──────────────────┐
                         │   Astro + Lit    │
                         │     Website      │
                         └────────┬─────────┘
                                  │
                                  │ Supabase Auth
                                  ▼
                         ┌──────────────────┐
                         │  Supabase Auth   │
                         │ Google/Facebook  │
                         │ Email/...        │
                         └────────┬─────────┘
                                  │
                                  │ Supabase JWT
                                  ▼
                       ┌──────────────────────┐
                       │  Cloudflare Worker   │
                       │                      │
                       │ Verify JWT           │
                       │ Rate limit           │
                       │ User quota           │
                       │ Validate input       │
                       │ Model allowlist      │
                       └───────┬────────┬─────┘
                               │        │
                     Secret    │        │ Google OAuth
                               ▼        ▼
                        ┌──────────┐  ┌─────────────┐
                        │OpenRouter│  │  Firestore  │
                        │   AI     │  │ dữ liệu cũ  │
                        └──────────┘  └─────────────┘
```

### Nguyên tắc bảo mật

1. **OpenRouter API key không bao giờ xuất hiện trong Astro/Lit/browser.**
2. **Firebase service-account private key không bao giờ xuất hiện trong Astro/Lit/browser.**
3. Browser chỉ biết:
   - Supabase publishable key.
   - URL của Worker.
   - Session của chính user.
4. Cloudflare Worker là backend duy nhất của website.
5. Worker xác thực Supabase JWT trước khi truy cập Firestore hoặc OpenRouter.
6. Worker tự quyết định user được đọc Firestore document nào.
7. Worker tự quyết định model và `max_tokens`.
8. OpenRouter key và Firebase service-account credentials được lưu bằng Cloudflare Secrets.
9. Firestore REST khi dùng Google service-account OAuth sẽ áp dụng **IAM**, không dựa vào Firestore Security Rules. Vì vậy authorization phải được kiểm tra trong Worker.

---

# 2. Vì sao không gọi OpenRouter/Firestore trực tiếp từ Lit?

Không làm:

```text
Lit
 ├──→ OpenRouter
 └──→ Firestore
```

Nếu OpenRouter key nằm trong Lit:

```js
const OPENROUTER_API_KEY = "...";
```

thì user có thể lấy key từ bundle, DevTools hoặc Network.

Không làm:

```text
Lit
 └──→ Firestore bằng service-account credential
```

Service account có quyền server-side rất lớn và tuyệt đối không được đưa xuống browser.

Kiến trúc đúng:

```text
Lit
  │
  │ Authorization: Bearer <Supabase access token>
  ▼
Cloudflare Worker
  │
  ├── verify Supabase JWT
  ├── authorize user
  ├── Firestore REST
  └── OpenRouter
```

Cloudflare Workers hỗ trợ gọi API bên ngoài bằng `fetch()` và hỗ trợ encrypted Secrets thông qua bindings.  
Tài liệu:
- Cloudflare Workers Fetch: https://developers.cloudflare.com/workers/runtime-apis/fetch/
- Cloudflare Workers Secrets: https://developers.cloudflare.com/workers/configuration/secrets/

---

# 3. Vai trò của từng thành phần

## Astro

Dùng để:

- layout
- routing
- SEO
- static pages
- build website

Astro có thể dùng Lit Custom Elements cho phần UI tương tác.

## Lit

Dùng cho:

- Login button
- Chat UI
- User menu
- AI response
- Loading state
- Error state

Astro integration cho Lit đã deprecated từ Astro 5; có thể dùng Lit trực tiếp bằng client-side script/import. Vì vậy không cần phụ thuộc vào `@astrojs/lit` cho kiến trúc mới.

Tài liệu:
https://docs.astro.build/en/guides/integrations-guide/lit/

## Supabase Auth

Dùng để:

- Google login
- Facebook login
- Apple login
- Email/password
- session
- access token/JWT

Supabase Auth trả về access token JWT. Token này được gửi từ browser tới Worker.

Tài liệu:
https://supabase.com/docs/reference/javascript/auth-signinwithoauth

## Cloudflare Worker

Đây là backend/API gateway.

Nó chịu trách nhiệm:

- verify Supabase JWT
- rate limit
- quota
- validate request
- gọi Firestore
- gọi OpenRouter
- không để lộ secret

## OpenRouter

Chỉ Worker được gọi OpenRouter.

## Firestore

Giữ dữ liệu cũ.

Worker truy cập Firestore thông qua Firestore REST API bằng Google OAuth access token tạo từ service account.

Tài liệu:
https://firebase.google.com/docs/firestore/use-rest-api

---

# 4. Cấu trúc repository

Khuyến nghị monorepo đơn giản:

```text
project/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── app-login.ts
│   │   │   │   ├── ai-chat.ts
│   │   │   │   └── user-menu.ts
│   │   │   │
│   │   │   ├── lib/
│   │   │   │   ├── supabase.ts
│   │   │   │   └── api.ts
│   │   │   │
│   │   │   ├── layouts/
│   │   │   └── pages/
│   │   │
│   │   └── astro.config.mjs
│   │
│   └── worker/
│       ├── src/
│       │   ├── index.ts
│       │   ├── auth.ts
│       │   ├── openrouter.ts
│       │   ├── firestore.ts
│       │   ├── google-token.ts
│       │   ├── rate-limit.ts
│       │   └── types.ts
│       │
│       ├── wrangler.jsonc
│       └── package.json
│
├── .gitignore
└── README.md
```

---

# 5. Astro + Lit

## 5.1 Tạo Astro

```bash
npm create astro@latest apps/web
cd apps/web
npm install
npm install lit @supabase/supabase-js
```

Nếu project Astro đã tồn tại:

```bash
npm install lit @supabase/supabase-js
```

---

# 6. Supabase client trong Astro

Tạo:

```text
apps/web/src/lib/supabase.ts
```

```ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY
);
```

Astro public environment variables:

```env
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
PUBLIC_API_BASE_URL=https://api.example.com
```

Các biến `PUBLIC_*` có thể xuất hiện ở browser.

**Không đặt những thứ sau vào `PUBLIC_*`:**

```text
OPENROUTER_API_KEY
FIREBASE_PRIVATE_KEY
FIREBASE_CLIENT_EMAIL
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

---

# 7. Supabase Auth

Ví dụ Google:

```ts
import { supabase } from "./supabase";

export async function loginWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });

  if (error) {
    throw error;
  }
}
```

Facebook:

```ts
export async function loginWithFacebook() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "facebook",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });

  if (error) {
    throw error;
  }
}
```

Supabase hỗ trợ OAuth và PKCE cho social login.

Tài liệu:
https://supabase.com/docs/reference/javascript/auth-signinwithoauth

---

# 8. Lit login component

Tạo:

```text
apps/web/src/components/app-login.ts
```

```ts
import { LitElement, html, css } from "lit";
import { customElement } from "lit/decorators.js";
import { supabase } from "../lib/supabase";

@customElement("app-login")
export class AppLogin extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    button {
      cursor: pointer;
      padding: 0.7rem 1rem;
    }
  `;

  async loginGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      console.error(error);
    }
  }

  render() {
    return html`
      <button @click=${this.loginGoogle}>
        Continue with Google
      </button>
    `;
  }
}
```

Trong Astro page:

```astro
---
import "../components/app-login";
---

<app-login></app-login>
```

Lit integration của Astro hiện không cần `@astrojs/lit`; custom element có thể được import từ client-side script.

---

# 9. Gọi Cloudflare Worker từ Lit

Tạo:

```text
apps/web/src/lib/api.ts
```

```ts
import { supabase } from "./supabase";

const API_BASE_URL =
  import.meta.env.PUBLIC_API_BASE_URL;

export async function callAI(message: string) {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(
    `${API_BASE_URL}/v1/ai/chat`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization":
          `Bearer ${session.access_token}`
      },

      body: JSON.stringify({
        message
      })
    }
  );

  if (!response.ok) {
    const error =
      await response.json().catch(() => ({}));

    throw new Error(
      error.message || "API request failed"
    );
  }

  return response.json();
}
```

Browser lúc này chỉ gửi:

```text
Authorization: Bearer <Supabase JWT>
```

Không có OpenRouter key.

---

# 10. Cloudflare Worker

## 10.1 Tạo Worker

```bash
mkdir -p apps/worker
cd apps/worker

npm init -y
npm install jose
npm install -D wrangler typescript
```

Tạo:

```text
apps/worker/src/index.ts
```

---

# 11. Supabase JWT verification

Supabase có JWKS endpoint:

```text
https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json
```

Worker có thể verify JWT bằng public signing key.

Không cần biết secret Supabase để verify chữ ký nếu project đang dùng asymmetric signing keys.

Tạo:

```text
apps/worker/src/auth.ts
```

```ts
import { createRemoteJWKSet, jwtVerify } from "jose";

const SUPABASE_URL =
  "https://YOUR_PROJECT_REF.supabase.co";

const JWKS = createRemoteJWKSet(
  new URL(
    `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`
  )
);

export async function verifySupabaseJWT(
  token: string
) {
  const { payload } = await jwtVerify(
    token,
    JWKS,
    {
      issuer:
        `${SUPABASE_URL}/auth/v1`
    }
  );

  if (!payload.sub) {
    throw new Error("JWT has no subject");
  }

  return {
    userId: payload.sub,
    claims: payload
  };
}
```

Supabase hiện có JWKS endpoint dành cho việc verify JWT. Public key chỉ dùng để verify chữ ký, không thể dùng để tạo JWT.

Tài liệu:
https://supabase.com/docs/guides/auth/signing-keys

---

# 12. Worker xử lý API

`apps/worker/src/index.ts`:

```ts
import { verifySupabaseJWT } from "./auth";
import { callOpenRouter } from "./openrouter";
import { getFirestoreDocument } from "./firestore";

interface Env {
  OPENROUTER_API_KEY: string;

  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;

  SUPABASE_URL: string;
}

export default {
  async fetch(
    request: Request,
    env: Env
  ): Promise<Response> {

    const url =
      new URL(request.url);

    if (
      request.method === "OPTIONS"
    ) {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    if (
      request.method !== "POST" ||
      url.pathname !== "/v1/ai/chat"
    ) {
      return json(
        { message: "Not found" },
        404
      );
    }

    try {
      const authorization =
        request.headers.get(
          "Authorization"
        );

      if (!authorization?.startsWith("Bearer ")) {
        return json(
          { message: "Unauthorized" },
          401
        );
      }

      const token =
        authorization.slice(7);

      const auth =
        await verifySupabaseJWT(token);

      const body =
        await request.json();

      const message =
        body?.message;

      if (
        typeof message !== "string" ||
        message.length === 0 ||
        message.length > 4000
      ) {
        return json(
          { message: "Invalid message" },
          400
        );
      }

      /*
       * QUOTA / RATE LIMIT
       *
       * Thêm Durable Objects/KV hoặc
       * một lớp rate limiter ở đây.
       */

      /*
       * FIRESTORE
       *
       * Chỉ lấy dữ liệu mà user được phép
       * truy cập.
       */
      const profile =
        await getFirestoreDocument(
          env,
          `users/${auth.userId}`
        );

      /*
       * Không cho client truyền model.
       * Worker tự quyết định model.
       */
      const ai =
        await callOpenRouter(
          env,
          message
        );

      return json({
        userId: auth.userId,
        profile,
        answer: ai
      });

    } catch (error) {
      console.error(error);

      return json(
        {
          message:
            "Internal server error"
        },
        500
      );
    }
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin":
      "https://YOUR_DOMAIN.com",

    "Access-Control-Allow-Headers":
      "Authorization, Content-Type",

    "Access-Control-Allow-Methods":
      "POST, OPTIONS"
  };
}

function json(
  data: unknown,
  status = 200
) {
  return new Response(
    JSON.stringify(data),
    {
      status,

      headers: {
        "Content-Type":
          "application/json",

        ...corsHeaders()
      }
    }
  );
}
```

---

# 13. OpenRouter module

Tạo:

```text
apps/worker/src/openrouter.ts
```

```ts
interface Env {
  OPENROUTER_API_KEY: string;
}

export async function callOpenRouter(
  env: Env,
  message: string
) {
  const response =
    await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Authorization":
            `Bearer ${env.OPENROUTER_API_KEY}`,

          "Content-Type":
            "application/json",

          "HTTP-Referer":
            "https://YOUR_DOMAIN.com",

          "X-Title":
            "YOUR_APP_NAME"
        },

        body: JSON.stringify({
          model:
            "YOUR_ALLOWED_MODEL",

          messages: [
            {
              role: "user",
              content: message
            }
          ],

          max_tokens: 1000
        })
      }
    );

  if (!response.ok) {
    const error =
      await response.text();

    console.error(
      "OpenRouter error:",
      error
    );

    throw new Error(
      "OpenRouter request failed"
    );
  }

  const data =
    await response.json();

  return (
    data?.choices?.[0]?.message?.content
    ?? ""
  );
}
```

### Quan trọng

Không nhận:

```json
{
  "model": "..."
}
```

từ browser nếu không cần.

Thay vào đó Worker:

```ts
const model = "YOUR_ALLOWED_MODEL";
```

hoặc dùng server-side mapping:

```ts
const MODELS = {
  fast: "MODEL_A",
  smart: "MODEL_B"
};
```

Client chỉ gửi:

```json
{
  "mode": "fast",
  "message": "Hello"
}
```

Worker quyết định model thật.

---

# 14. Firestore: cách kết nối đúng

Supabase JWT **không phải Firebase Auth JWT**.

Do đó không thể gửi thẳng:

```text
Supabase JWT
    ↓
Firestore Security Rules
```

và mong Firebase tự nhận diện user.

Phương án trong kiến trúc này:

```text
Supabase JWT
     ↓
Cloudflare Worker
     ↓
Google OAuth access token
     ↓
Firestore REST API
```

Firestore REST API hỗ trợ Google OAuth 2.0 token của service account. Với loại token này, Firestore dùng **IAM** để authorization thay vì Firestore Security Rules.

Tài liệu:
https://firebase.google.com/docs/firestore/use-rest-api

Điều này có nghĩa:

> Worker phải tự enforce quyền truy cập theo `auth.userId`.

Đây là một phần cực kỳ quan trọng.

---

# 15. Firebase service account

Trong Firebase/Google Cloud tạo service account có quyền tối thiểu cần thiết.

Không nên dùng credential owner/editor toàn project.

Khuyến nghị:

```text
Firestore read-only:
    roles/datastore.viewer

Firestore read/write:
    roles/datastore.user
```

Chọn quyền thấp nhất phù hợp với use case.

Service account cần:

```text
client_email
private_key
project_id
```

Nhưng **không đưa chúng vào Astro/Lit**.

Đưa vào Cloudflare Secrets:

```text
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

---

# 16. Google OAuth token trong Worker

Tạo:

```text
apps/worker/src/google-token.ts
```

Ý tưởng:

```text
Service Account
      │
      │ sign JWT bằng private key
      ▼
Google OAuth token endpoint
      │
      ▼
access_token
      │
      ▼
Firestore REST API
```

Scope:

```text
https://www.googleapis.com/auth/datastore
```

Firestore documentation xác nhận scope này dùng cho Google OAuth token khi gọi Firestore REST API.

### Không nên tạo access token mới cho mọi Firestore request

Worker nên cache access token trong memory/Cache API trong thời gian ngắn.

Pseudo-code:

```ts
let cachedToken:
  {
    value: string;
    expiresAt: number;
  } | null = null;

async function getGoogleAccessToken(env) {

  if (
    cachedToken &&
    Date.now() <
      cachedToken.expiresAt - 60_000
  ) {
    return cachedToken.value;
  }

  // 1. create JWT assertion
  // 2. sign with service-account private key
  // 3. POST to Google OAuth token endpoint
  // 4. cache returned access_token

  return token;
}
```

Nếu triển khai production, nên tách phần ký JWT thành module riêng và test kỹ việc parse PEM/private key.

---

# 17. Firestore REST module

Tạo:

```text
apps/worker/src/firestore.ts
```

```ts
import {
  getGoogleAccessToken
} from "./google-token";

interface Env {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
}

export async function getFirestoreDocument(
  env: Env,
  path: string
) {
  const token =
    await getGoogleAccessToken(env);

  const encodedPath =
    path
      .split("/")
      .map(encodeURIComponent)
      .join("/");

  const url =
    `https://firestore.googleapis.com/v1/` +
    `projects/${env.FIREBASE_PROJECT_ID}` +
    `/databases/(default)/documents/` +
    encodedPath;

  const response =
    await fetch(url, {
      headers: {
        Authorization:
          `Bearer ${token}`
      }
    });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const text =
      await response.text();

    console.error(
      "Firestore error:",
      text
    );

    throw new Error(
      "Firestore request failed"
    );
  }

  return response.json();
}
```

Đây là REST API trực tiếp, không cần Firebase Admin SDK.

---

# 18. Legacy Firestore UID

Nếu dữ liệu cũ đang dùng Firebase Auth UID:

```text
Firestore:
users/
  FIREBASE_UID_123
```

nhưng user mới đăng nhập bằng Supabase:

```text
Supabase:
user.id = SUPABASE_UUID_456
```

thì **không nên giả định hai UID giống nhau**.

Cần mapping:

```text
Supabase user UUID
        │
        ▼
identity mapping
        │
        ▼
Firebase legacy UID
        │
        ▼
Firestore
```

Có thể lưu mapping ở Supabase:

```text
user_id                 firebase_uid
-------------------------------------
SUPABASE_UUID_456       FIREBASE_UID_123
```

hoặc trong Firestore:

```text
identityMappings/
    SUPABASE_UUID_456
        firebaseUid:
            FIREBASE_UID_123
```

Khuyến nghị lưu mapping ở Supabase PostgreSQL nếu Supabase đã là identity source chính.

---

# 19. Authorization với Firestore legacy data

Ví dụ user request:

```http
POST /v1/ai/chat
Authorization: Bearer SUPABASE_JWT
```

Worker:

```text
1. Verify Supabase JWT
        ↓
2. lấy supabase user_id
        ↓
3. lookup firebase_uid
        ↓
4. validate resource ownership
        ↓
5. gọi Firestore
```

Không làm:

```text
GET /firestore/users/{id-from-request}
```

vì user có thể thay:

```json
{
  "userId": "SOME_OTHER_USER"
}
```

và đọc dữ liệu người khác.

Thay vào đó:

```ts
const userId =
  verifiedSupabaseToken.userId;
```

ID phải lấy từ JWT, không lấy từ body.

---

# 20. Firestore response không nên trả nguyên document

Không nên:

```ts
return firestoreDocument;
```

nếu document chứa:

```text
internal flags
admin data
private metadata
legacy tokens
```

Nên map response:

```ts
return {
  id: profile.name,
  displayName:
    profile.fields?.displayName?.stringValue
      ?? null,

  avatar:
    profile.fields?.avatar?.stringValue
      ?? null
};
```

Worker là lớp kiểm soát dữ liệu.

---

# 21. Rate limit

Có ít nhất hai lớp.

## IP rate limit

Ví dụ:

```text
10 requests / minute / IP
```

## User rate limit

Ví dụ:

```text
Free:
20 AI requests/day

Pro:
500 AI requests/day
```

User identity:

```ts
const userId =
  verifiedToken.userId;
```

Không dùng email làm primary key cho quota.

---

# 22. Quota nên được lưu ở đâu?

Nếu Supabase đã là database chính:

```text
Supabase PostgreSQL
    users
    usage
    subscriptions
```

Ví dụ:

```text
ai_usage
--------------------------------
id
user_id
date
requests
input_tokens
output_tokens
```

Worker:

```text
Supabase JWT
      ↓
user_id
      ↓
quota check
      ↓
OpenRouter
      ↓
usage record
```

Firestore chỉ giữ **legacy data**.

Đây là cách sạch nhất.

---

# 23. Không dùng Firestore cho quota mới nếu không cần

Không nên tạo:

```text
Firestore
  ↓
quota
  ↓
usage
  ↓
OpenRouter
```

nếu Supabase đã có PostgreSQL.

Kiến trúc nên là:

```text
Supabase
 ├── Auth
 ├── users
 ├── usage
 └── quota

Firestore
 └── legacy data

Cloudflare Worker
 ├── Auth verification
 ├── quota
 ├── Firestore bridge
 └── OpenRouter bridge
```

---

# 24. Secrets trên Cloudflare

Các secret cần:

```text
OPENROUTER_API_KEY
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
FIREBASE_PROJECT_ID
```

`SUPABASE_URL` có thể là public config, nhưng Worker có thể giữ nó trong environment variable.

Đưa secret vào Worker:

```bash
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler secret put FIREBASE_CLIENT_EMAIL
npx wrangler secret put FIREBASE_PRIVATE_KEY
npx wrangler secret put FIREBASE_PROJECT_ID
```

Không commit:

```text
.dev.vars
.env
.env.production
service-account.json
firebase-key.json
```

Cloudflare khuyến nghị dùng Secrets cho API keys/auth tokens và không lưu sensitive values trong plaintext vars.

Tài liệu:
https://developers.cloudflare.com/workers/configuration/secrets/

---

# 25. Wrangler config

Ví dụ:

```json
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "my-ai-api",
  "main": "src/index.ts",
  "compatibility_date": "2026-09-01",

  "vars": {
    "SUPABASE_URL":
      "https://YOUR_PROJECT.supabase.co"
  }
}
```

Không ghi:

```json
{
  "vars": {
    "OPENROUTER_API_KEY": "..."
  }
}
```

Secrets phải được cấu hình bằng secret bindings.

---

# 26. CORS

Worker chỉ cho phép domain website:

```ts
const ALLOWED_ORIGIN =
  "https://example.com";
```

Không dùng:

```text
Access-Control-Allow-Origin: *
```

cho API có authenticated user data.

CORS không phải cơ chế authentication, nhưng nó giảm khả năng các website khác gọi API từ browser.

---

# 27. Không coi CORS là security boundary

Attacker vẫn có thể:

```bash
curl https://api.example.com/v1/ai/chat
```

vì curl không bị CORS.

Do đó security thật phải là:

```text
JWT
+
Rate limit
+
Quota
+
Authorization
+
Input validation
+
Model allowlist
+
OpenRouter spending limit
```

---

# 28. OpenRouter spending limit

Tạo một API key riêng cho production:

```text
openrouter-prod
```

Không dùng key cá nhân chính cho tất cả project.

Đặt spending limit phù hợp.

Nên tách:

```text
openrouter-dev
openrouter-staging
openrouter-prod
```

Nếu dev bị loop:

```text
dev key
   ↓
limit
   ↓
STOP
```

Production không bị ảnh hưởng.

---

# 29. App Check / anti-bot

Supabase Auth giúp xác định user.

Nhưng:

```text
login account
```

không đồng nghĩa:

```text
không thể spam
```

Nên có thêm:

```text
Cloudflare rate limit
+
Turnstile nếu cần
+
user quota
```

Turnstile phù hợp cho các action nhạy cảm như signup/login hoặc khi phát hiện abuse.

Không nên bắt captcha cho mọi AI request nếu trải nghiệm không cần thiết.

---

# 30. Lit AI chat component

Tạo:

```text
apps/web/src/components/ai-chat.ts
```

```ts
import {
  LitElement,
  html,
  css
} from "lit";

import {
  customElement,
  state
} from "lit/decorators.js";

import { callAI } from "../lib/api";

@customElement("ai-chat")
export class AiChat extends LitElement {

  @state()
  private message = "";

  @state()
  private answer = "";

  @state()
  private loading = false;

  @state()
  private error = "";

  static styles = css`
    :host {
      display: block;
    }

    textarea {
      width: 100%;
      min-height: 100px;
    }

    button {
      margin-top: 8px;
      cursor: pointer;
    }

    .error {
      color: #b00020;
    }
  `;

  private async submit() {
    if (!this.message.trim()) {
      return;
    }

    this.loading = true;
    this.error = "";

    try {
      const result =
        await callAI(
          this.message.trim()
        );

      this.answer =
        result.answer ?? "";

      this.message = "";

    } catch (error) {
      this.error =
        error instanceof Error
          ? error.message
          : "Unknown error";

    } finally {
      this.loading = false;
    }
  }

  render() {
    return html`
      <section>

        <textarea
          .value=${this.message}
          @input=${(event: Event) => {
            this.message =
              (event.target as HTMLTextAreaElement)
                .value;
          }}
          placeholder="Ask AI..."
        ></textarea>

        <button
          @click=${this.submit}
          ?disabled=${this.loading}
        >
          ${
            this.loading
              ? "Thinking..."
              : "Send"
          }
        </button>

        ${
          this.error
            ? html`
                <p class="error">
                  ${this.error}
                </p>
              `
            : ""
        }

        ${
          this.answer
            ? html`
                <article>
                  ${this.answer}
                </article>
              `
            : ""
        }

      </section>
    `;
  }
}
```

---

# 31. Astro page

Ví dụ:

```text
apps/web/src/pages/index.astro
```

```astro
---
import "../components/ai-chat";
import "../components/app-login";
---

<html lang="vi">
  <head>
    <title>AI App</title>
  </head>

  <body>
    <main>
      <app-login></app-login>

      <hr />

      <ai-chat></ai-chat>
    </main>
  </body>
</html>
```

---

# 32. Authentication flow

```text
User
 │
 │ click Google
 ▼
Supabase Auth
 │
 │ OAuth
 ▼
Google
 │
 │ callback
 ▼
Supabase
 │
 │ session + access token
 ▼
Browser
 │
 │ Authorization: Bearer JWT
 ▼
Cloudflare Worker
 │
 │ verify signature
 ▼
user_id
```

Supabase access token được dùng làm JWT để xác thực request.

Tài liệu:
https://supabase.com/docs/guides/auth/jwts

---

# 33. AI request flow

```text
Lit
 │
 │ message
 │
 │ Supabase JWT
 ▼
Cloudflare Worker
 │
 ├── JWT valid?
 │      │
 │      └── no → 401
 │
 ├── rate limit?
 │      │
 │      └── no → 429
 │
 ├── daily quota?
 │      │
 │      └── no → 429
 │
 ├── validate message
 │
 ├── choose model
 │
 ▼
OpenRouter
 │
 ▼
AI response
 │
 ▼
Worker
 │
 ▼
Lit
```

---

# 34. Legacy Firestore request flow

```text
Lit
 │
 │ Supabase JWT
 ▼
Cloudflare Worker
 │
 ├── verify Supabase JWT
 │
 ├── user_id = JWT.sub
 │
 ├── map legacy Firebase UID
 │
 ├── authorize resource
 │
 ▼
Google OAuth token
 │
 ▼
Firestore REST
 │
 ▼
Legacy document
 │
 ▼
Worker filters fields
 │
 ▼
Lit
```

---

# 35. Điểm đặc biệt về Firestore Security Rules

Nếu Worker dùng service account:

```text
Worker
  ↓
Google OAuth access token
  ↓
Firestore
```

Firestore dùng:

```text
IAM
```

thay vì:

```text
Firestore Security Rules
```

Do đó không được nghĩ:

```text
Firestore Rules
    ↓
bảo vệ Worker
```

Không.

Phải làm:

```text
Supabase JWT
    ↓
Worker authorization
    ↓
Firestore IAM
```

Service account chỉ nên được cấp quyền tối thiểu.

---

# 36. Mapping user với dữ liệu cũ

Nếu Firestore cũ dùng Firebase UID:

```text
Firebase UID:
abc123
```

Supabase:

```text
Supabase UUID:
550e8400-e29b-41d4-a716-446655440000
```

Không dùng UUID Supabase trực tiếp nếu document cũ đang dùng Firebase UID.

Tạo bảng:

```sql
create table legacy_identity_map (
  supabase_user_id uuid primary key,
  firebase_uid text not null unique,
  created_at timestamptz
    not null default now()
);
```

Worker:

```text
JWT.sub
 ↓
legacy_identity_map
 ↓
firebase_uid
 ↓
Firestore
```

---

# 37. Không lưu Firebase private key vào Supabase

Không làm:

```text
Supabase Database
    ↓
firebase_private_key
```

Không làm:

```text
Supabase Storage
    ↓
service-account.json
```

Secret nên nằm tại runtime backend:

```text
Cloudflare Worker Secrets
```

Cloudflare Secrets được mã hóa và Worker truy cập thông qua binding `env`.

---

# 38. Development environment

Tạo:

```text
apps/worker/.dev.vars
```

Ví dụ:

```env
OPENROUTER_API_KEY="..."
FIREBASE_PROJECT_ID="..."
FIREBASE_CLIENT_EMAIL="..."
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SUPABASE_URL="https://xxxxx.supabase.co"
```

Không commit file này.

`.gitignore`:

```gitignore
node_modules/
dist/
.astro/
.dev.vars
.dev.vars.*
.env
.env.*
*.pem
service-account*.json
firebase-key*.json
```

Cloudflare docs cũng khuyến nghị `.dev.vars`/`.env` local không được commit.

---

# 39. Deploy Worker

```bash
cd apps/worker

npx wrangler login

npx wrangler secret put OPENROUTER_API_KEY
npx wrangler secret put FIREBASE_CLIENT_EMAIL
npx wrangler secret put FIREBASE_PRIVATE_KEY
npx wrangler secret put FIREBASE_PROJECT_ID

npx wrangler deploy
```

Cloudflare hỗ trợ `wrangler secret put` để tạo secret cho Worker.

---

# 40. Test từng lớp

Không test tất cả cùng lúc.

## Test 1 — Supabase Auth

Kiểm tra:

```text
Google login
Facebook login
Email login
```

## Test 2 — JWT

Browser gọi Worker:

```text
Authorization: Bearer JWT
```

Worker phải trả:

```json
{
  "userId": "..."
}
```

## Test 3 — Firestore

Worker gọi:

```text
GET /users/{legacyUid}
```

## Test 4 — OpenRouter

Worker gọi AI.

## Test 5 — Quota

```text
20 requests
```

Request thứ 21:

```http
429 Too Many Requests
```

## Test 6 — Authorization

User A cố đọc User B:

```text
403 Forbidden
```

## Test 7 — Secret leak

Search frontend bundle:

```bash
grep -R "OPENROUTER_API_KEY" dist/
```

Không được xuất hiện key.

---

# 41. Các lỗi bảo mật cần tránh

## ❌ 1. OpenRouter key trong frontend

```js
const key = "sk-or...";
```

## ❌ 2. Firebase service account trong frontend

```json
{
  "private_key": "..."
}
```

## ❌ 3. Cho client chọn Firestore path

```json
{
  "path": "users/OTHER_USER"
}
```

## ❌ 4. Cho client chọn OpenRouter model tùy ý

```json
{
  "model": "..."
}
```

## ❌ 5. Chỉ dựa vào CORS

CORS không chống curl/script/server abuse.

## ❌ 6. Không rate limit

User có thể spam Worker.

## ❌ 7. Không đặt OpenRouter spending limit

Một bug có thể tạo hàng nghìn request.

## ❌ 8. Dùng service account quá quyền

Không dùng Owner/Editor nếu chỉ cần Firestore.

---

# 42. Kiến trúc production đề xuất

```text
                         INTERNET
                             │
                             ▼
                   ┌─────────────────┐
                   │ Cloudflare      │
                   │ Pages           │
                   │ Astro + Lit     │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Supabase Auth   │
                   │                 │
                   │ Google          │
                   │ Facebook        │
                   │ Apple           │
                   │ Email           │
                   └────────┬────────┘
                            │
                         JWT │
                            ▼
              ┌───────────────────────────┐
              │ Cloudflare Worker         │
              │                           │
              │ JWT verification          │
              │ Rate limiting             │
              │ Quota                     │
              │ Authorization             │
              │ Input validation           │
              │ Model allowlist            │
              │                           │
              │ Secrets:                  │
              │ - OpenRouter              │
              │ - Firebase service acct   │
              └─────────────┬─────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
       ┌─────────────────┐    ┌──────────────────┐
       │ OpenRouter      │    │ Firestore        │
       │                 │    │                  │
       │ AI              │    │ Legacy data      │
       │ spending limit  │    │ old Firebase app │
       └─────────────────┘    └──────────────────┘
```

---

# 43. Phân chia dữ liệu

Khuyến nghị:

```text
SUPABASE
├── Auth
├── users
├── legacy_identity_map
├── ai_usage
├── subscriptions
└── application settings

FIRESTORE
└── legacy data

CLOUDFLARE
├── Worker
├── Secrets
├── Rate limiting
└── API gateway

OPENROUTER
└── AI
```

Đừng cố biến Firestore thành database mới nếu nó chỉ đang chứa dữ liệu cũ.

---

# 44. Lộ trình triển khai

## Phase 1 — Authentication

```text
[ ] Tạo Supabase project
[ ] Bật Google
[ ] Bật Facebook
[ ] Bật Email
[ ] Tạo Astro
[ ] Tạo Lit login component
[ ] Login/logout
```

## Phase 2 — Worker

```text
[ ] Tạo Cloudflare Worker
[ ] Verify Supabase JWT
[ ] CORS
[ ] /health
[ ] /v1/me
```

## Phase 3 — Firestore bridge

```text
[ ] Tạo service account
[ ] Cấp IAM tối thiểu
[ ] Cloudflare secret
[ ] Google OAuth token
[ ] Firestore REST GET
[ ] Mapping Supabase UID → Firebase UID
[ ] Authorization
```

## Phase 4 — OpenRouter

```text
[ ] OpenRouter API key
[ ] Cloudflare secret
[ ] Allowed models
[ ] max_tokens
[ ] AI endpoint
[ ] Error handling
```

## Phase 5 — Abuse protection

```text
[ ] IP rate limit
[ ] User rate limit
[ ] Daily quota
[ ] Request body limit
[ ] Model allowlist
[ ] OpenRouter spending limit
[ ] Turnstile khi cần
```

## Phase 6 — Production

```text
[ ] HTTPS
[ ] Custom API domain
[ ] CORS production domain
[ ] Secrets production
[ ] Logging
[ ] Error monitoring
[ ] Test auth
[ ] Test authorization
[ ] Test quota
[ ] Test secret leakage
```

---

# 45. Kết luận

Kiến trúc cuối cùng nên là:

```text
Astro + Lit
     │
     ▼
Supabase Auth
     │
     │ JWT
     ▼
Cloudflare Worker
     │
     ├───────────────┐
     ▼               ▼
OpenRouter       Firestore
     │               │
     │               └── dữ liệu cũ
     │
     └── AI
```

### Secret chỉ tồn tại ở Worker

```text
OPENROUTER_API_KEY
FIREBASE_PRIVATE_KEY
FIREBASE_CLIENT_EMAIL
```

### Browser chỉ có

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
WORKER_URL
SUPABASE_SESSION
```

### Database mới

Ưu tiên Supabase PostgreSQL cho:

```text
users
usage
quota
subscriptions
mapping
```

### Database cũ

Giữ Firestore cho:

```text
legacy data
```

### AI

Chỉ Worker được gọi OpenRouter.

Đây là điểm cốt lõi:

```text
Browser không bao giờ có
        ↓
OpenRouter API key
        ↓
Firebase service-account private key
```

---

# Tài liệu chính thức nên đọc

- Supabase Auth / OAuth:
  https://supabase.com/docs/reference/javascript/auth-signinwithoauth
- Supabase JWT:
  https://supabase.com/docs/guides/auth/jwts
- Supabase JWT signing keys / JWKS:
  https://supabase.com/docs/guides/auth/signing-keys
- Cloudflare Workers Secrets:
  https://developers.cloudflare.com/workers/configuration/secrets/
- Cloudflare Workers Fetch:
  https://developers.cloudflare.com/workers/runtime-apis/fetch/
- Cloud Firestore REST API:
  https://firebase.google.com/docs/firestore/use-rest-api
- Astro + Lit:
  https://docs.astro.build/en/guides/integrations-guide/lit/

---

## Ghi chú quan trọng

Phần **Firestore bridge** là phần nhạy cảm nhất của kiến trúc này. Không nên copy một service-account JSON vào source code. Worker cần tạo Google OAuth access token từ service-account credential được lưu dưới dạng Cloudflare Secret, sau đó gọi Firestore REST API. Vì request kiểu này được IAM authorize thay vì Firestore Security Rules, authorization theo user phải được thực hiện **trước khi Worker gọi Firestore**.

Đây cũng là lý do Worker nên là lớp duy nhất có quyền truy cập dữ liệu Firestore cũ.
