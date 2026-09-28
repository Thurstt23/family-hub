-- Phase 3 needs an active member count and a per-branch member count on the
-- public marketing site. Anon reads on `profiles` are intentionally blocked
-- by RLS (03 Data Model and RLS, section 6), so the homepage cannot query
-- `profiles` directly. These security definer functions expose only the
-- aggregate counts, never a row of `profiles`.

create or replace function public.active_member_count()
returns bigint
language sql stable security definer set search_path = public
as $$
  select count(*) from public.profiles where status = 'active';
$$;

create or replace function public.branch_member_counts()
returns table (branch_id uuid, member_count bigint)
language sql stable security definer set search_path = public
as $$
  select branch_id, count(*)
  from public.profiles
  where status = 'active' and branch_id is not null
  group by branch_id;
$$;

grant execute on function public.active_member_count() to anon, authenticated;
grant execute on function public.branch_member_counts() to anon, authenticated;
