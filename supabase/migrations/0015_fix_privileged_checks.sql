-- Two bugs found by running every migration against a real Postgres and
-- exercising RLS as each role.
--
-- 1. protect_profile_fields (0006, then 0011) decided "privileged session"
--    with `current_user in ('postgres', ...)`. The function is SECURITY
--    DEFINER, so inside it current_user is always the owner, postgres. The
--    check was therefore always true: any member could set their own status
--    to 'active' through the API and skip approval, and the steward
--    restrictions never applied.
--
-- 2. check_event_capacity (0008) ran as the caller. A member can only read
--    their own RSVPs and cannot lock the event row, so the capacity sum saw
--    nothing but their own reply and every RSVP passed.
--
-- The caller's role is read from the `role` setting instead: PostgREST sets
-- it to anon, authenticated or service_role for every request; it is 'none'
-- in the SQL editor and migrations.

create or replace function public.is_privileged_session()
returns boolean
language sql stable
as $$
  select coalesce(nullif(current_setting('role', true), ''), 'none') not in ('anon', 'authenticated');
$$;
revoke execute on function public.is_privileged_session() from anon;

create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_status member_status;
  v_reason text;
begin
  if public.is_privileged_session() or public.is_admin() then
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

create or replace function public.check_event_capacity()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_capacity int;
  v_current_total int;
begin
  if new.status = 'going' then
    -- Lock the event row to serialise concurrent RSVPs for the last places.
    select capacity into v_capacity
    from public.events
    where id = new.event_id
    for update;

    if v_capacity is not null then
      select coalesce(sum(guests_count + 1), 0) into v_current_total
      from public.event_rsvps
      where event_id = new.event_id
        and status = 'going'
        and (tg_op = 'INSERT' or user_id <> new.user_id);

      if v_current_total + (new.guests_count + 1) > v_capacity then
        raise exception 'Event capacity reached';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.enforce_rsvp_deadline()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_deadline timestamptz;
begin
  select rsvp_deadline into v_deadline from public.events where id = coalesce(new.event_id, old.event_id);
  if v_deadline is not null and v_deadline < now()
     and not public.is_privileged_session()
     and not public.is_staff() then
    raise exception 'RSVP deadline has passed' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
