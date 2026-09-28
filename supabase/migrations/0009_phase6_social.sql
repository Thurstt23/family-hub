-- Add likes, comment threads, and link photos to posts

create table public.post_likes (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;
create policy "read all likes" on public.post_likes for select using (public.is_active_member());
create policy "insert own like" on public.post_likes for insert with check (user_id = auth.uid());
create policy "delete own like" on public.post_likes for delete using (user_id = auth.uid());

alter table public.comments add column parent_id uuid references public.comments(id) on delete cascade;

-- Allow posts to belong to an album
alter table public.posts add column album_id uuid references public.albums(id) on delete set null;

-- Allow photos to belong to a post, and make album_id optional
alter table public.photos add column post_id uuid references public.posts(id) on delete cascade;
alter table public.photos alter column album_id drop not null;
