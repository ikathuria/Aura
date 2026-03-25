-- Phase 4 foundation: curated local content + admin backoffice controls.
-- Adds publish state, soft delete, admin role checks, and audit-friendly logs.

alter table if exists public.users
  add column if not exists "isAdmin" boolean not null default false;

alter table if exists public.landmarks
  add column if not exists "isPublished" boolean not null default true,
  add column if not exists "isDeleted" boolean not null default false,
  add column if not exists "updatedAt" timestamptz not null default now();

create table if not exists public.events (
  id text primary key,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  description text not null default '',
  type text not null default 'other' check (type in ('festival', 'market', 'concert', 'sports', 'other')),
  "startTime" timestamptz not null,
  "isPublished" boolean not null default false,
  "isDeleted" boolean not null default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "createdBy" uuid references auth.users (id) on delete set null
);

create table if not exists public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  resource_type text not null,
  resource_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_events_published_not_deleted
  on public.events ("isPublished", "isDeleted");

create index if not exists idx_events_start_time
  on public.events ("startTime");

create index if not exists idx_admin_action_logs_actor_id
  on public.admin_action_logs (actor_id);

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and coalesce(u."isAdmin", false) = true
  );
$$;

grant execute on function public.is_admin_user() to authenticated;

alter table if exists public.events enable row level security;
alter table if exists public.admin_action_logs enable row level security;

drop policy if exists landmarks_read_authenticated on public.landmarks;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'landmarks' and policyname = 'landmarks_select_published'
  ) then
    create policy landmarks_select_published on public.landmarks
      for select to authenticated using ("isPublished" = true and "isDeleted" = false);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'landmarks' and policyname = 'landmarks_select_admin_all'
  ) then
    create policy landmarks_select_admin_all on public.landmarks
      for select to authenticated using (public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'landmarks' and policyname = 'landmarks_admin_insert'
  ) then
    create policy landmarks_admin_insert on public.landmarks
      for insert to authenticated with check (public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'landmarks' and policyname = 'landmarks_admin_update'
  ) then
    create policy landmarks_admin_update on public.landmarks
      for update to authenticated using (public.is_admin_user()) with check (public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'landmarks' and policyname = 'landmarks_admin_delete'
  ) then
    create policy landmarks_admin_delete on public.landmarks
      for delete to authenticated using (public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'events' and policyname = 'events_select_published'
  ) then
    create policy events_select_published on public.events
      for select to authenticated using ("isPublished" = true and "isDeleted" = false);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'events' and policyname = 'events_select_admin_all'
  ) then
    create policy events_select_admin_all on public.events
      for select to authenticated using (public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'events' and policyname = 'events_admin_insert'
  ) then
    create policy events_admin_insert on public.events
      for insert to authenticated with check (public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'events' and policyname = 'events_admin_update'
  ) then
    create policy events_admin_update on public.events
      for update to authenticated using (public.is_admin_user()) with check (public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'events' and policyname = 'events_admin_delete'
  ) then
    create policy events_admin_delete on public.events
      for delete to authenticated using (public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'admin_action_logs' and policyname = 'admin_action_logs_select_admin'
  ) then
    create policy admin_action_logs_select_admin on public.admin_action_logs
      for select to authenticated using (public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'admin_action_logs' and policyname = 'admin_action_logs_insert_admin'
  ) then
    create policy admin_action_logs_insert_admin on public.admin_action_logs
      for insert to authenticated with check (public.is_admin_user() and actor_id = auth.uid());
  end if;
end $$;
