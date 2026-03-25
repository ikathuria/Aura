-- Aura core schema + RLS baseline
-- This migration is written to be safe for projects that were previously
-- bootstrapped manually via SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default 'Explorer',
  interests text[] not null default '{}',
  "personaId" text not null default 'historian',
  "personaTitle" text not null default 'The Historian',
  "hasOnboarded" boolean not null default false,
  "createdAt" bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.landmarks (
  id text primary key,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  description text not null default '',
  type text not null default 'historic',
  "createdAt" timestamptz not null default now()
);

create table if not exists public.unlocks (
  user_id uuid not null references auth.users (id) on delete cascade,
  "landmarkId" text not null references public.landmarks (id) on delete cascade,
  "unlockedAt" timestamptz not null default now(),
  primary key (user_id, "landmarkId")
);

create table if not exists public.gallery (
  user_id uuid not null references auth.users (id) on delete cascade,
  "landmarkId" text not null references public.landmarks (id) on delete cascade,
  "landmarkName" text,
  "savedAt" timestamptz not null default now(),
  "videoUrl" text,
  "audioUrl" text,
  "imageUrl" text,
  script text,
  primary key (user_id, "landmarkId")
);

create table if not exists public.landmark_assets (
  "landmarkId" text not null references public.landmarks (id) on delete cascade,
  "personaId" text not null,
  script text,
  "videoUrl" text,
  "audioUrl" text,
  "imageUrl" text,
  status text not null default 'queued' check (status in ('queued', 'generating', 'ready', 'failed')),
  "updatedAt" timestamptz not null default now(),
  primary key ("landmarkId", "personaId")
);

create table if not exists public.asset_status (
  user_id uuid not null references auth.users (id) on delete cascade,
  "landmarkId" text not null references public.landmarks (id) on delete cascade,
  "personaId" text not null,
  status text not null default 'queued' check (status in ('queued', 'generating', 'ready', 'failed')),
  "updatedAt" bigint not null default (extract(epoch from now()) * 1000)::bigint,
  primary key (user_id, "landmarkId")
);

create index if not exists idx_unlocks_user_id on public.unlocks (user_id);
create index if not exists idx_gallery_user_id on public.gallery (user_id);
create index if not exists idx_asset_status_user_id on public.asset_status (user_id);

alter table public.users enable row level security;
alter table public.landmarks enable row level security;
alter table public.unlocks enable row level security;
alter table public.gallery enable row level security;
alter table public.landmark_assets enable row level security;
alter table public.asset_status enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'users' and policyname = 'users_select_own'
  ) then
    create policy users_select_own on public.users
      for select to authenticated using (auth.uid() = id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'users' and policyname = 'users_insert_own'
  ) then
    create policy users_insert_own on public.users
      for insert to authenticated with check (auth.uid() = id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'users' and policyname = 'users_update_own'
  ) then
    create policy users_update_own on public.users
      for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'landmarks' and policyname = 'landmarks_read_authenticated'
  ) then
    create policy landmarks_read_authenticated on public.landmarks
      for select to authenticated using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'unlocks' and policyname = 'unlocks_select_own'
  ) then
    create policy unlocks_select_own on public.unlocks
      for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'unlocks' and policyname = 'unlocks_insert_own'
  ) then
    create policy unlocks_insert_own on public.unlocks
      for insert to authenticated with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'gallery' and policyname = 'gallery_select_own'
  ) then
    create policy gallery_select_own on public.gallery
      for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'gallery' and policyname = 'gallery_insert_own'
  ) then
    create policy gallery_insert_own on public.gallery
      for insert to authenticated with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'gallery' and policyname = 'gallery_update_own'
  ) then
    create policy gallery_update_own on public.gallery
      for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'landmark_assets' and policyname = 'landmark_assets_read_authenticated'
  ) then
    create policy landmark_assets_read_authenticated on public.landmark_assets
      for select to authenticated using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'asset_status' and policyname = 'asset_status_select_own'
  ) then
    create policy asset_status_select_own on public.asset_status
      for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'asset_status' and policyname = 'asset_status_insert_own'
  ) then
    create policy asset_status_insert_own on public.asset_status
      for insert to authenticated with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'asset_status' and policyname = 'asset_status_update_own'
  ) then
    create policy asset_status_update_own on public.asset_status
      for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
