-- Phase 8: admin console (06 Admin Console.md).
-- branch_stewards, steward-scoped approvals, role safety rails, the audit
-- insert path used by adminAction, membership overrides and the dashboard RPC.

-- ============ branch_stewards ============
create table public.branch_stewards (
  user_id   uuid not null references public.profiles(id) on delete cascade,
  branch_id uuid not null references public.family_branches(id) on delete cascade,
  primary key (user_id, branch_id)
);
alter table public.branch_stewards enable row level security;
create policy "read own steward rows" on public.branch_stewards for select
  using (user_id = auth.uid() or public.is_admin());
create policy "owner writes steward rows" on public.branch_stewards for all
  using (public.has_role('owner')) with check (public.has_role('owner'));

create or replace function public.is_branch_steward(target_branch uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select target_branch is not null
    and public.has_role('steward')
    and exists (
      select 1 from public.branch_stewards
      where user_id = auth.uid() and branch_id = target_branch
    );
$$;
revoke execute on function public.is_branch_steward(uuid) from anon;

-- ============ review columns on profiles ============
-- A rejection keeps the row pending and records why (04, section 2).
-- reviewed_by deliberately has no foreign key: a second profiles -> profiles
-- relationship would make PostgREST embeds ambiguous.
alter table public.profiles
  add column rejection_reason text,
  add column reviewed_at      timestamptz,
  add column reviewed_by      uuid;

-- ============ profiles: steward scoping enforced in SQL ============
-- Stewards no longer read every profile. They read their own branches (which
-- is what scopes the approvals queue) plus whatever active members can read.
drop policy "staff read all profiles" on public.profiles;

create policy "admins read all profiles"
  on public.profiles for select
  using (public.is_admin());

create policy "stewards read own branch profiles"
  on public.profiles for select
  using (public.is_branch_steward(branch_id));

create policy "steward approves own branch"
  on public.profiles for update
  using (public.is_branch_steward(branch_id))
  with check (public.is_branch_steward(branch_id));

-- Replaces 0006. Three paths:
--   privileged session or admin: anything goes
--   steward editing someone else: only pending -> active and the review note
--   member editing themselves: never status or review fields
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_status member_status;
  v_reason text;
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') or public.is_admin() then
    new.updated_at := now();
    return new;
  end if;

  if auth.uid() is distinct from old.id then
    if not public.is_branch_steward(old.branch_id) then
      raise exception 'Not allowed to edit this profile' using errcode = '42501';
    end if;
    v_status := new.status;
    v_reason := new.rejection_reason;
    new := old;
    if old.status = 'pending' and v_status in ('pending', 'active') then
      new.status := v_status;
    end if;
    new.rejection_reason := v_reason;
    new.reviewed_at      := now();
    new.reviewed_by      := auth.uid();
    new.updated_at       := now();
    return new;
  end if;

  new.id               := old.id;
  new.status           := old.status;
  new.rejection_reason := old.rejection_reason;
  new.reviewed_at      := old.reviewed_at;
  new.reviewed_by      := old.reviewed_by;
  new.updated_at       := now();
  return new;
end;
$$;

-- ============ user_roles safety rails ============
-- Owner-only writes already come from the "owner writes roles" policy, so an
-- admin cannot grant admin. This trigger adds the two rules RLS cannot express.
create or replace function public.protect_user_roles()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_remaining int;
begin
  if auth.uid() is not null and old.user_id = auth.uid() then
    raise exception 'You cannot revoke your own role' using errcode = '42501';
  end if;

  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner' or new.user_id <> old.user_id) then
    -- serialise owner removals so two owners cannot demote each other at once
    perform pg_advisory_xact_lock(hashtext('public.user_roles.owner'));
    select count(*) into v_remaining
    from public.user_roles
    where role = 'owner' and user_id <> old.user_id;
    if v_remaining = 0 then
      raise exception 'Cannot remove the last owner' using errcode = '42501';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger user_roles_protect
  before update or delete on public.user_roles
  for each row execute function public.protect_user_roles();

-- ============ tiers: owner only ============
drop policy "tiers admin write" on public.membership_tiers;
create policy "tiers owner write" on public.membership_tiers for all
  using (public.has_role('owner')) with check (public.has_role('owner'));
create policy "tiers admin read all" on public.membership_tiers for select
  using (public.is_admin());

-- ============ membership overrides ============
-- A gifted membership is written by an admin through RLS, never the service
-- role (06, section 5). The expiry lives in current_period_end, so
-- current_tier_level() drops it to 0 automatically once it lapses.
alter table public.memberships
  add column override_note text,
  add column override_by   uuid;

create policy "admin override membership" on public.memberships for update
  using (public.is_admin()) with check (public.is_admin());

-- ============ audit_log: written by adminAction as the acting user ============
create policy "staff write own audit rows" on public.audit_log for insert
  with check (actor_id = auth.uid() and public.is_staff());
create index audit_actor_idx  on public.audit_log (actor_id, created_at desc);
create index audit_action_idx on public.audit_log (action, created_at desc);
create index audit_entity_idx on public.audit_log (entity_id);

-- ============ payments ============
create index payments_status_idx on public.payments (status, created_at desc);

-- ============ dashboard ============
-- One round trip for every dashboard card (06, section 2). Money fields are
-- null for stewards, who may not see payments or revenue.
create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_admin boolean := public.is_admin();
  v_result jsonb;
begin
  if not public.is_staff() then
    raise exception 'Staff only' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'total_members',
      (select count(*) from public.profiles where status = 'active'),
    'pending_approvals',
      (select count(*) from public.profiles p
        where p.status = 'pending' and (v_admin or public.is_branch_steward(p.branch_id))),
    'paid_members',
      case when v_admin then (
        select count(*)
        from public.memberships m
        join public.membership_tiers t on t.id = m.tier_id
        where m.status in ('active', 'trialing') and t.level > 0
          and (m.current_period_end is null or m.current_period_end > now())
      ) end,
    'arr_cents',
      case when v_admin then (
        select coalesce(sum(t.price_cents), 0)
        from public.memberships m
        join public.membership_tiers t on t.id = m.tier_id
        where m.status in ('active', 'trialing')
          and t.level > 0
          and t.billing_interval = 'year'
          and m.stripe_subscription_id is not null
      ) end,
    'signups_30d',
      (select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'count', coalesce(c.n, 0)) order by d.day), '[]'::jsonb)
       from (select generate_series(current_date - 29, current_date, interval '1 day')::date as day) d
       left join (
         select created_at::date as day, count(*) as n
         from public.profiles
         where created_at >= current_date - 29
         group by 1
       ) c on c.day = d.day),
    'failed_payments_7d',
      case when v_admin then (
        select coalesce(jsonb_agg(jsonb_build_object(
          'user_id', pay.user_id, 'full_name', pr.full_name,
          'amount_cents', pay.amount_cents, 'created_at', pay.created_at
        ) order by pay.created_at desc), '[]'::jsonb)
        from public.payments pay
        left join public.profiles pr on pr.id = pay.user_id
        where pay.status = 'failed' and pay.created_at > now() - interval '7 days'
      ) end,
    'next_event',
      (select jsonb_build_object(
          'id', e.id, 'title', e.title, 'slug', e.slug, 'starts_at', e.starts_at, 'capacity', e.capacity,
          'going', coalesce((select sum(1 + r.guests_count) from public.event_rsvps r
                             where r.event_id = e.id and r.status = 'going'), 0)
        )
       from public.events e
       where e.starts_at > now()
       order by e.starts_at
       limit 1),
    'recent_signups',
      (select coalesce(jsonb_agg(to_jsonb(s) order by s.created_at desc), '[]'::jsonb)
       from (
         select p.id, p.full_name, p.handle, p.status, p.created_at
         from public.profiles p
         where v_admin or public.is_branch_steward(p.branch_id)
         order by p.created_at desc
         limit 8
       ) s)
  ) into v_result;

  return v_result;
end;
$$;
revoke execute on function public.admin_dashboard_stats() from anon, public;
grant execute on function public.admin_dashboard_stats() to authenticated;
