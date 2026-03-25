-- RLS coverage audit for Aura core tables.
-- Run with:
--   supabase db remote commit (or psql) and execute this file.

with target_tables as (
  select unnest(array[
    'users',
    'landmarks',
    'unlocks',
    'gallery',
    'landmark_assets',
    'asset_status'
  ]) as table_name
),
policy_counts as (
  select tablename as table_name, count(*)::int as policy_count
  from pg_policies
  where schemaname = 'public'
  group by tablename
),
rls_flags as (
  select c.relname as table_name, c.relrowsecurity as rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
)
select
  t.table_name,
  coalesce(r.rls_enabled, false) as rls_enabled,
  coalesce(p.policy_count, 0) as policy_count,
  case
    when coalesce(r.rls_enabled, false) = false then 'FAIL'
    when coalesce(p.policy_count, 0) = 0 then 'WARN'
    else 'PASS'
  end as audit_status
from target_tables t
left join rls_flags r on r.table_name = t.table_name
left join policy_counts p on p.table_name = t.table_name
order by t.table_name;
