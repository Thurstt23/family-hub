-- Content review fixes.

-- 1. Places taken on an event. Members can only read their own RSVP (RLS),
--    so the event page computed "spots left" from that one row. This returns
--    only the total, never who replied.
create or replace function public.event_seats_taken(p_event uuid)
returns int
language sql stable security definer set search_path = public
as $$
  select coalesce(sum(1 + guests_count), 0)::int
  from public.event_rsvps
  where event_id = p_event and status = 'going';
$$;
grant execute on function public.event_seats_taken(uuid) to anon, authenticated;

-- 2. Albums had a 'tier_gated' visibility but no tier column, so a gated
--    album was visible to every member. Same shape as posts and events now.
alter table public.albums add column if not exists min_tier_level int not null default 0;

drop policy if exists "albums member read" on public.albums;
create policy "albums member read" on public.albums for select
  using (
    public.is_active_member()
    and (
      visibility = 'members'
      or (visibility = 'tier_gated' and public.current_tier_level() >= min_tier_level)
    )
  );

-- 3. Tier benefits shown on /join and /me/membership. Written to match what
--    the code actually gates (launch checklist: "tier benefits copy matches
--    what is actually gated"). Only fills tiers whose benefits are still empty,
--    so anything the owner has written in Admin, Settings is kept.
update public.membership_tiers set benefits = '["The family directory","Announcements, stories and photographs","RSVP to family gatherings"]'::jsonb
 where slug = 'free' and benefits = '[]'::jsonb;
update public.membership_tiers set benefits = '["Everything in Free","Posts, albums and events marked for Supporters","Helps pay for the site and the reunion"]'::jsonb
 where slug = 'supporter' and benefits = '[]'::jsonb;
update public.membership_tiers set benefits = '["Everything in Supporter","Posts, albums and events marked for Patrons","Sustains the family archive work"]'::jsonb
 where slug = 'patron' and benefits = '[]'::jsonb;
update public.membership_tiers set benefits = '["Everything in Patron","One payment, never expires"]'::jsonb
 where slug = 'lifetime' and benefits = '[]'::jsonb;

-- 4. The hub composer lets any member share a story, but posts only had a
--    staff write policy, so every non-staff post failed with an RLS error.
--    Members may write stories only: announcements and notices stay staff work.
create policy "members write own stories" on public.posts for insert
  with check (
    author_id = auth.uid()
    and public.is_active_member()
    and kind = 'story'
    and visibility = 'members'
    and min_tier_level = 0
    and album_id is null
  );
create policy "members delete own stories" on public.posts for delete
  using (author_id = auth.uid() and kind = 'story');

-- 5. Reporting a comment changes someone else's row, which the comment
--    policies (own comments only) silently refused. Reporting only ever moves
--    an approved comment into the moderation queue.
create or replace function public.report_comment(p_comment uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_rows int;
begin
  if not public.is_active_member() then
    raise exception 'Members only' using errcode = '42501';
  end if;
  update public.comments set status = 'pending' where id = p_comment and status = 'approved';
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;
revoke execute on function public.report_comment(uuid) from anon, public;
grant execute on function public.report_comment(uuid) to authenticated;

-- 6. Album uploads must wait for moderation (08, Phase 6). Previously a
--    member could insert a photo with status 'approved' directly. Photos on
--    the member's own feed story are still published with the story.
drop policy if exists "upload own photo" on public.photos;
create policy "upload own photo" on public.photos for insert
  with check (
    uploader_id = auth.uid()
    and public.is_active_member()
    and (
      status = 'pending'
      or (
        album_id is null
        and post_id is not null
        and exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
      )
    )
  );
