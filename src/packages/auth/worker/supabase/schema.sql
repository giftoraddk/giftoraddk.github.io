-- src/packages/auth/worker/supabase/schema.sql — ported from astro-micro's worker/supabase/schema.sql (bảng profiles + ai_usage).
-- Supabase chỉ còn Auth + 2 bảng này; mọi bảng nội dung (posts/products/invoices/revisions/…) nằm
-- trên Cloudflare D1 của auth (src/packages/auth/worker/db/schema.sql).
-- profiles: dùng bởi src/packages/auth/worker. ai_usage: bảng cũ, không còn code nào đọc/ghi (giới hạn AI giờ là
-- Workers Rate Limiting của llm) — giữ tới khi xoá tay. Xem hook/SETUP.rst §2.
-- Run in the Supabase project's SQL editor (or via `supabase db push`) — idempotent: chạy lại sau mỗi lần file này đổi
-- (Supabase không tự đồng bộ như D1 `db/schema.sql`), bảng/cột thiếu được thêm, policy được tạo lại.
--
-- Both db-worker and llm always talk to these tables with the SERVICE ROLE key (see
-- src/packages/auth/worker/src/supabaseTable.ts), which bypasses RLS entirely — the Worker itself
-- (having verified the caller's Supabase JWT and role via src/packages/auth/worker/src/lib/roles.ts +
-- db-worker's db.ts / llm's data.ts authorization checks) is the trust boundary, not
-- Postgres RLS. RLS is still enabled + a narrow self-only policy is added below as
-- defense-in-depth, in case anything other than a Worker ever queries this table with a user's own
-- anon-key session (e.g. a future direct client read).

create table if not exists public.profiles (
    id           uuid primary key references auth.users(id) on delete cascade,
    status       text not null default 'active',   -- 'active' | 'pending' | 'banned' | 'suspended'
    email        text,
    username     text,
    display_name text,
    caption      text,                                -- bio / tagline ngắn — xem hook/SCHEMA.rst's cũ `users.caption`
    avatar       text,
    roles        text not null default 'user',      -- pipe-separated "table.capability|admin" — see
                                                      -- src/webs/auth/tools/service.js's parseRoles()
    connections  text default '',
    meta         jsonb default '{}'::jsonb,          -- provider info, talent-marketplace xuBalance, ...
    index        integer not null default 0,        -- thứ tự hiển thị thủ công — kéo-thả trong admin (svc-resources.js orderable)
    actors       text default '',                    -- "userId~iso~action|…" 9 lượt gần nhất — svc-resources.js _comActors()
    notes        text default '',                    -- JSON { nodes: [...] } — node riêng của user trên /system/app (svc-node-builder.js)
    deleted_at   timestamptz,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

-- DB đã tạo từ bản schema cũ (chưa có cột actors / notes)
alter table public.profiles add column if not exists actors text default '';
alter table public.profiles add column if not exists notes  text default '';

create index if not exists profiles_email_idx    on public.profiles (email);
create index if not exists profiles_username_idx on public.profiles (username);

alter table public.profiles enable row level security;

-- Defense-in-depth only — the Worker uses the service role key and never hits this policy.
drop policy if exists "profiles: self read" on public.profiles;
create policy "profiles: self read" on public.profiles
    for select using (auth.uid() = id);

-- AI usage quota (see hook/cloudflare-worker.md §21-22) — tracked per logged-in Supabase user;
-- the anonymous guest chat (svc-sale.js) is rate-limited by IP instead
-- (worker/packages/llm/src/rateLimit.ts), since there's no user_id to key this table by for
-- that case.
create table if not exists public.ai_usage (
    id         bigint generated always as identity primary key,
    user_id    uuid not null references auth.users(id) on delete cascade,
    date       date not null default current_date,
    requests   integer not null default 0,
    created_at timestamptz not null default now(),
    unique (user_id, date)
);

alter table public.ai_usage enable row level security;

drop policy if exists "ai_usage: self read" on public.ai_usage;
create policy "ai_usage: self read" on public.ai_usage
    for select using (auth.uid() = user_id);

-- PostgREST (API của Supabase) cache schema — báo nó đọc lại, nếu không cột vừa ADD vẫn lỗi PGRST204
-- "Could not find the ... column of profiles in the schema cache" tới khi cache tự làm mới.
notify pgrst, 'reload schema';
