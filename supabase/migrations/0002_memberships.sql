create table public.membership_tiers (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,          -- 'free','supporter','patron','lifetime'
  name            text not null,
  description     text,
  level           int  not null,                 -- 0 free, 10 supporter, 20 patron, 30 lifetime
  price_cents     int  not null default 0,
  currency        text not null default 'usd',
  billing_interval text not null default 'year', -- 'year' | 'one_time'
  stripe_price_id text unique,
  benefits        jsonb not null default '[]'::jsonb,
  is_active       boolean not null default true,
  sort_order      int not null default 0
);

create table public.memberships (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null unique references public.profiles(id) on delete cascade,
  tier_id                uuid not null references public.membership_tiers(id),
  status                 text not null default 'active',
      -- active | past_due | canceled | incomplete | trialing
  stripe_customer_id     text,
  stripe_subscription_id text unique,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  started_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index memberships_customer_idx on public.memberships (stripe_customer_id);
create index memberships_period_idx   on public.memberships (current_period_end);

create table public.payments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles(id) on delete set null,
  stripe_invoice_id text unique,
  stripe_pi_id      text,
  amount_cents      int not null,
  currency          text not null default 'usd',
  status            text not null,     -- paid | failed | refunded
  description       text,
  receipt_url       text,
  paid_at           timestamptz,
  created_at        timestamptz not null default now()
);

-- webhook idempotency ledger
create table public.stripe_events (
  id           text primary key,        -- Stripe event id, evt_...
  type         text not null,
  processed_at timestamptz not null default now(),
  payload      jsonb
);
