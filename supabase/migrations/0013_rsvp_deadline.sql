-- Phase 10 hardening: the RSVP deadline was enforced only in the UI, so a
-- direct API call could still create or change an RSVP after it passed
-- (10, critical path 5). Enforce it where the capacity rule already lives.

create or replace function public.enforce_rsvp_deadline()
returns trigger
language plpgsql
as $$
declare
  v_deadline timestamptz;
begin
  select rsvp_deadline into v_deadline from public.events where id = coalesce(new.event_id, old.event_id);
  if v_deadline is not null and v_deadline < now()
     and current_user not in ('postgres', 'supabase_admin', 'service_role')
     and not public.is_staff() then
    raise exception 'RSVP deadline has passed' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger enforce_rsvp_deadline
  before insert or update or delete on public.event_rsvps
  for each row execute function public.enforce_rsvp_deadline();
