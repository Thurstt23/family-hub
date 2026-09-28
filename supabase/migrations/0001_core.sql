-- ============ extensions ============
create extension if not exists pg_trgm;

-- ============ enums ============
create type app_role     as enum ('member','steward','admin','owner');
create type member_status as enum ('pending','active','suspended','archived');
create type visibility    as enum ('public','members','tier_gated','stewards');
create type rsvp_status   as enum ('going','maybe','declined');
create type mod_status    as enum ('pending','approved','rejected');

-- ============ family_branches ============
create table public.family_branches (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  description   text,
  parent_id     uuid references public.family_branches(id) on delete set null,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

-- ============ profiles ============
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  handle          text not null unique,
  full_name       text not null,
  display_name    text,
  avatar_url      text,
  bio             text,
  email           text,
  phone           text,
  birthday        date,
  city            text,
  country         text,
  generation      int,
  branch_id       uuid references public.family_branches(id) on delete set null,
  status          member_status not null default 'pending',
  -- per field privacy, defaults to hidden for contact data
  show_email      boolean not null default false,
  show_phone      boolean not null default false,
  show_birthday   boolean not null default true,
  search_vector   tsvector generated always as (
                    to_tsvector('simple',
                      coalesce(full_name,'') || ' ' ||
                      coalesce(display_name,'') || ' ' ||
                      coalesce(city,''))
                  ) stored,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============ user_roles ============
create table public.user_roles (
  user_id  uuid not null references public.profiles(id) on delete cascade,
  role     app_role not null,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create index profiles_search_idx  on public.profiles using gin (search_vector);
create index profiles_name_trgm   on public.profiles using gin (full_name gin_trgm_ops);
create index profiles_branch_idx  on public.profiles (branch_id) where status = 'active';
create index profiles_status_idx  on public.profiles (status);
create index profiles_created_idx on public.profiles (created_at desc);
