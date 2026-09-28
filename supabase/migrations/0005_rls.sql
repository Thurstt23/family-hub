alter table public.profiles         enable row level security;
alter table public.user_roles       enable row level security;
alter table public.family_branches  enable row level security;
alter table public.membership_tiers enable row level security;
alter table public.memberships      enable row level security;
alter table public.payments         enable row level security;
alter table public.events           enable row level security;
alter table public.event_rsvps      enable row level security;
alter table public.posts            enable row level security;
alter table public.comments         enable row level security;
alter table public.albums           enable row level security;
alter table public.photos           enable row level security;
alter table public.audit_log        enable row level security;
alter table public.stripe_events    enable row level security;

create policy "own profile readable"
  on public.profiles for select
  using (id = auth.uid());

create policy "active members read active profiles"
  on public.profiles for select
  using (status = 'active' and public.is_active_member());

create policy "staff read all profiles"
  on public.profiles for select
  using (public.is_staff());

create policy "own profile updatable"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "admins update any profile"
  on public.profiles for update
  using (public.is_admin());

create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.status := old.status;
    new.id     := old.id;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_protect
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

create policy "read own roles"  on public.user_roles for select using (user_id = auth.uid());
create policy "staff read roles" on public.user_roles for select using (public.is_staff());
create policy "owner writes roles" on public.user_roles for all
  using (public.has_role('owner')) with check (public.has_role('owner'));

create policy "branches public read" on public.family_branches for select using (true);
create policy "branches admin write" on public.family_branches for all
  using (public.is_admin()) with check (public.is_admin());

create policy "tiers public read" on public.membership_tiers for select using (is_active = true);
create policy "tiers admin write" on public.membership_tiers for all
  using (public.is_admin()) with check (public.is_admin());

create policy "read own membership" on public.memberships for select using (user_id = auth.uid());
create policy "staff read memberships" on public.memberships for select using (public.is_staff());

create policy "read own payments" on public.payments for select using (user_id = auth.uid());
create policy "admin read payments" on public.payments for select using (public.is_admin());

create policy "posts public read" on public.posts for select
  using (visibility = 'public' and published_at is not null and published_at <= now());
create policy "posts member read" on public.posts for select
  using (
    published_at is not null and published_at <= now()
    and public.is_active_member()
    and (
      visibility = 'members'
      or (visibility = 'tier_gated' and public.current_tier_level() >= min_tier_level)
    )
  );
create policy "posts staff all" on public.posts for all
  using (public.is_staff()) with check (public.is_staff());

create policy "events public read" on public.events for select
  using (visibility = 'public');
create policy "events member read" on public.events for select
  using (
    public.is_active_member()
    and (
      visibility = 'members'
      or (visibility = 'tier_gated' and public.current_tier_level() >= min_tier_level)
    )
  );
create policy "events staff all" on public.events for all
  using (public.is_staff()) with check (public.is_staff());

create policy "albums public read" on public.albums for select
  using (visibility = 'public');
create policy "albums member read" on public.albums for select
  using (
    public.is_active_member()
    and (
      visibility = 'members'
      or visibility = 'tier_gated'
    )
  );
create policy "albums staff all" on public.albums for all
  using (public.is_staff()) with check (public.is_staff());

create policy "own rsvp all" on public.event_rsvps for all
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_active_member());
create policy "staff read rsvps" on public.event_rsvps for select using (public.is_staff());

create policy "read approved comments" on public.comments for select
  using (status = 'approved' and public.is_active_member());
create policy "write own comment" on public.comments for insert
  with check (author_id = auth.uid() and public.is_active_member());
create policy "edit own comment" on public.comments for update
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "staff moderate comments" on public.comments for all using (public.is_staff());

create policy "read approved photos" on public.photos for select
  using (status = 'approved' and public.is_active_member());
create policy "upload own photo" on public.photos for insert
  with check (uploader_id = auth.uid() and public.is_active_member());
create policy "staff moderate photos" on public.photos for all using (public.is_staff());

create policy "admin read audit" on public.audit_log for select using (public.is_admin());
