-- Phase 9: announcement digest opt out (08, Phase 9; 04, section 7).
-- Kept out of `profiles` on purpose: active members can read other active
-- profiles row by row, and an unsubscribe token must never be readable by
-- anyone but its owner.

create table public.email_preferences (
  user_id           uuid primary key references public.profiles(id) on delete cascade,
  announcements     boolean not null default true,
  unsubscribe_token uuid not null unique default gen_random_uuid(),
  updated_at        timestamptz not null default now()
);
alter table public.email_preferences enable row level security;

create policy "read own email preferences" on public.email_preferences for select
  using (user_id = auth.uid());
create policy "update own email preferences" on public.email_preferences for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- inserts happen in handle_new_user (security definer); the digest cron reads
-- through the service role.

insert into public.email_preferences (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- One-click unsubscribe from an email link, no session required. Only flips
-- the flag for the row the token belongs to and reveals nothing else.
create or replace function public.unsubscribe_by_token(p_token uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_rows int;
begin
  update public.email_preferences
     set announcements = false, updated_at = now()
   where unsubscribe_token = p_token;
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;
grant execute on function public.unsubscribe_by_token(uuid) to anon, authenticated;

-- Same body as 0004 plus the email_preferences row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  base_handle text;
  final_handle text;
  n int := 0;
begin
  base_handle := regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9]', '', 'g');
  if base_handle = '' then base_handle := 'member'; end if;
  final_handle := base_handle;
  while exists (select 1 from public.profiles where handle = final_handle) loop
    n := n + 1;
    final_handle := base_handle || n::text;
  end loop;

  insert into public.profiles (id, handle, full_name, email, avatar_url, status)
  values (
    new.id,
    final_handle,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    'pending'
  );

  insert into public.user_roles (user_id, role) values (new.id, 'member');

  insert into public.memberships (user_id, tier_id)
  select new.id, id from public.membership_tiers where slug = 'free';

  insert into public.email_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;
