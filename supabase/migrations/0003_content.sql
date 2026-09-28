create table public.events (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title          text not null,
  description    text,
  cover_url      text,
  location_name  text,
  location_url   text,
  starts_at      timestamptz not null,
  ends_at        timestamptz,
  rsvp_deadline  timestamptz,
  capacity       int,
  visibility     visibility not null default 'members',
  min_tier_level int not null default 0,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index events_starts_idx on public.events (starts_at desc);

create table public.event_rsvps (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  status       rsvp_status not null default 'going',
  guests_count int not null default 0 check (guests_count between 0 and 10),
  note         text,
  updated_at   timestamptz not null default now(),
  unique (event_id, user_id)
);

create table public.posts (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title          text not null,
  body           text not null,          -- markdown
  excerpt        text,
  cover_url      text,
  kind           text not null default 'announcement', -- announcement | story | notice
  visibility     visibility not null default 'members',
  min_tier_level int not null default 0,
  author_id      uuid references public.profiles(id) on delete set null,
  published_at   timestamptz,
  created_at     timestamptz not null default now()
);
create index posts_published_idx on public.posts (published_at desc nulls last);

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete set null,
  body       text not null check (char_length(body) between 1 and 4000),
  status     mod_status not null default 'approved',
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);

create table public.albums (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  event_id   uuid references public.events(id) on delete set null,
  cover_url  text,
  visibility visibility not null default 'members',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.photos (
  id           uuid primary key default gen_random_uuid(),
  album_id     uuid not null references public.albums(id) on delete cascade,
  uploader_id  uuid references public.profiles(id) on delete set null,
  storage_path text not null,
  caption      text,
  width        int,
  height       int,
  status       mod_status not null default 'pending',
  created_at   timestamptz not null default now()
);
create index photos_album_idx on public.photos (album_id, status);

create table public.audit_log (
  id         bigserial primary key,
  actor_id   uuid references public.profiles(id) on delete set null,
  action     text not null,        -- 'role.grant', 'member.approve', 'membership.sync'
  entity     text not null,
  entity_id  text,
  meta       jsonb,
  created_at timestamptz not null default now()
);
create index audit_created_idx on public.audit_log (created_at desc);
