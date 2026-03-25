-- Follow-up hardening migration to enforce RLS + policies on core tables.
-- Safe to run repeatedly.

alter table if exists public.users enable row level security;
alter table if exists public.landmarks enable row level security;
alter table if exists public.unlocks enable row level security;
alter table if exists public.gallery enable row level security;
alter table if exists public.landmark_assets enable row level security;
alter table if exists public.asset_status enable row level security;

do $$
begin
  if to_regclass('public.users') is not null and not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'users' and policyname = 'users_select_own'
  ) then
    create policy users_select_own on public.users
      for select to authenticated using (auth.uid() = id);
  end if;
end $$;

do $$
begin
  if to_regclass('public.users') is not null and not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'users' and policyname = 'users_insert_own'
  ) then
    create policy users_insert_own on public.users
      for insert to authenticated with check (auth.uid() = id);
  end if;
end $$;

do $$
begin
  if to_regclass('public.users') is not null and not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'users' and policyname = 'users_update_own'
  ) then
    create policy users_update_own on public.users
      for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
  end if;
end $$;

do $$
begin
  if to_regclass('public.landmarks') is not null and not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'landmarks' and policyname = 'landmarks_read_authenticated'
  ) then
    create policy landmarks_read_authenticated on public.landmarks
      for select to authenticated using (true);
  end if;
end $$;

do $$
begin
  if to_regclass('public.unlocks') is not null and not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'unlocks' and policyname = 'unlocks_select_own'
  ) then
    create policy unlocks_select_own on public.unlocks
      for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if to_regclass('public.unlocks') is not null and not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'unlocks' and policyname = 'unlocks_insert_own'
  ) then
    create policy unlocks_insert_own on public.unlocks
      for insert to authenticated with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if to_regclass('public.gallery') is not null and not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'gallery' and policyname = 'gallery_select_own'
  ) then
    create policy gallery_select_own on public.gallery
      for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if to_regclass('public.gallery') is not null and not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'gallery' and policyname = 'gallery_insert_own'
  ) then
    create policy gallery_insert_own on public.gallery
      for insert to authenticated with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if to_regclass('public.gallery') is not null and not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'gallery' and policyname = 'gallery_update_own'
  ) then
    create policy gallery_update_own on public.gallery
      for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if to_regclass('public.landmark_assets') is not null and not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'landmark_assets' and policyname = 'landmark_assets_read_authenticated'
  ) then
    create policy landmark_assets_read_authenticated on public.landmark_assets
      for select to authenticated using (true);
  end if;
end $$;

do $$
begin
  if to_regclass('public.asset_status') is not null and not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'asset_status' and policyname = 'asset_status_select_own'
  ) then
    create policy asset_status_select_own on public.asset_status
      for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if to_regclass('public.asset_status') is not null and not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'asset_status' and policyname = 'asset_status_insert_own'
  ) then
    create policy asset_status_insert_own on public.asset_status
      for insert to authenticated with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if to_regclass('public.asset_status') is not null and not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'asset_status' and policyname = 'asset_status_update_own'
  ) then
    create policy asset_status_update_own on public.asset_status
      for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
