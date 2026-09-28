create or replace function public.has_role(target app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = target
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('steward','admin','owner')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('admin','owner')
  );
$$;

create or replace function public.is_active_member()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
  );
$$;

-- current entitlement level, 0 for free or lapsed
create or replace function public.current_tier_level()
returns int
language sql stable security definer set search_path = public
as $$
  select coalesce((
    select t.level
    from public.memberships m
    join public.membership_tiers t on t.id = m.tier_id
    where m.user_id = auth.uid()
      and m.status in ('active','trialing')
      and (m.current_period_end is null or m.current_period_end > now())
  ), 0);
$$;

revoke execute on function public.has_role(app_role) from anon;

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

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
