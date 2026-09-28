-- Migration to enforce event capacity to prevent race conditions during RSVP

create or replace function public.check_event_capacity()
returns trigger
language plpgsql
as $$
declare
  v_capacity int;
  v_current_total int;
begin
  if new.status = 'going' then
    -- Lock event row to serialize concurrent RSVPs
    select capacity into v_capacity
    from public.events
    where id = new.event_id
    for update;
    
    if v_capacity is not null then
      -- Calculate current total attendees (including guests) for 'going' RSVPs
      -- Exclude the current user's previous RSVP to allow them to update their guest count
      select coalesce(sum(guests_count + 1), 0) into v_current_total
      from public.event_rsvps
      where event_id = new.event_id 
        and status = 'going'
        and (TG_OP = 'INSERT' or user_id != new.user_id);
        
      if v_current_total + (new.guests_count + 1) > v_capacity then
        raise exception 'Event capacity reached';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_event_capacity
  before insert or update on public.event_rsvps
  for each row execute function public.check_event_capacity();
