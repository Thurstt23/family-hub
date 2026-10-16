# Martin Sawyer Reunion

The family register: a public site, a members-only hub (directory, events, posts, photos), paid memberships through Stripe, and an admin console.

**Other guides:** [`docs/CONTENT_GUIDE.md`](docs/CONTENT_GUIDE.md) (changing the family's wording, names and photos, written for whoever does that with Claude) and [`docs/HUONG_DAN_SETUP.md`](docs/HUONG_DAN_SETUP.md) (setup and deployment, in Vietnamese, for the maintainer).

This README has two parts. **Part 1** is for the family administrators who run the site day to day. **Part 2** is for whoever maintains the code and the accounts behind it.

---

# Part 1: Running the site

Everything below happens in the **admin console**. Sign in, then choose **Admin** in the top bar (or go to `/admin`). You only see the sections your role allows:

| Role | Can do |
|---|---|
| Steward | Approve requests for the branches they look after, moderate photos and comments, publish announcements and events |
| Admin | Everything a steward can, for every branch, plus the member list, memberships, payments, branches, the audit log and CSV export |
| Owner | Everything, plus granting roles, assigning stewards, and editing tiers and Stripe prices |

Every change you make in the console is recorded in **Audit log**, with your name and the time.

## Approve a new member

1. Open **Approvals**. Requests are listed oldest first. A steward only sees their own branches.
2. Read the name, branch, place and short bio.
3. Choose one:
   - **Send approval**: the member gets a welcome email and can use the hub on their very next click.
   - **Ask for details**: type what you need to know. They get an email and can reply or update their details.
   - **Decline**: type a short reason. They see it on their waiting page and can correct their details. Nothing is deleted.

The dashboard (**Admin** home) shows how many requests are waiting. Please aim to clear the queue within three days; people are waiting to see their family.

## Publish an announcement

1. Open **Content**, then **Write an announcement**.
2. Fill in the title (the address slug fills itself in), choose **Announcement** as the kind, and choose who can read it: everyone, members, or members on a paid tier.
3. Write the body. It uses Markdown: a blank line starts a new paragraph, `**bold**`, `*italic*`, `[link text](https://...)`.
4. Set **Publish at**:
   - leave it empty to save a draft,
   - pick a time to schedule it,
   - or save the draft and press **Publish now** in the list.
5. Announcements published during the week go out in the **Monday morning email digest** to everyone who has not switched it off. Tier-only announcements are left out of the email so free members do not see their titles.

To take something down, press **Unpublish** in the list. It goes back to drafts.

Events work the same way from the **Events** half of the Content page: title, date, place, who can see it, capacity (guests included), and an RSVP deadline after which replies lock.

## Refund a payment

Refunds are made in Stripe, not in this console, so that money only ever moves in one place.

1. Open **Members**, search for the person, and open their page. Under **Membership**, the **Stripe customer** link opens them in Stripe. (Or open the receipt link in **Payments**.)
2. In Stripe, open the payment and press **Refund**. Choose full or partial and confirm.
3. If they should also lose the membership, cancel the subscription in Stripe (**Cancel subscription**, immediately). Stripe tells the site within seconds and the member returns to the free tier automatically. The change appears in the audit log as `membership.sync`.

To **give** someone a membership without payment (a gift, a committee member), open their page, expand **Grant a membership manually**, choose the tier, an expiry date and a reason. It ends on its own on that date.

## Other routine jobs

- **Moderation**: photos uploaded to albums wait here until a steward approves them. Comments that members report also land here. **Remove comment** hides it; the text is kept in the audit log.
- **Suspend or archive** someone from their member page. Suspension is reversible and emails the reason. Archive hides them from the directory and stops them signing in, and keeps their record. There is deliberately no delete button: permanent deletion is done by the maintainer on written request (Part 2).
- **Export**: **Members**, filter as needed, **Export CSV**. This is a list of family contact details: keep it safe, and know that every export is logged.
- **Branches**: edit names and order; owners assign stewards by email or handle.

## Who to contact

| What | Who |
|---|---|
| The site is down, payments are not arriving, an email bounces | The maintainer (Part 2) |
| Stripe account, payouts, refunds | The owner |
| A member asks for their data to be deleted | The owner, who passes it to the maintainer |

---

# Part 2: Maintaining the site

**Stack:** Next.js 15 (App Router) on Vercel, Supabase (Postgres, Auth, Storage, row level security), Stripe (Checkout, Billing Portal, webhooks), Resend with React Email. The plan documents `01` to `11` in the parent folder are the specification; this repository follows them.

Security model in one line: **row level security in Postgres is the boundary**. Layout guards only shape the UI. The service role client (`lib/supabase/admin.ts`) is used only in `app/api/webhooks/stripe` and `app/api/cron/*`.

## Local setup

```bash
pnpm install
pnpm exec supabase start           # needs Docker Desktop
pnpm exec supabase db reset        # applies supabase/migrations and seed.sql
cp .env.example .env.local         # fill from `pnpm exec supabase status -o env`
pnpm dev
```

Optional fixtures: `pnpm seed:members` creates 4,000 fake members (refuses to run with `NODE_ENV=production`).

To make yourself owner after signing up locally:

```sql
update profiles set status = 'active' where email = 'you@example.com';
insert into user_roles (user_id, role) select id, 'owner' from profiles where email = 'you@example.com';
```

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest unit tests (`lib/**/*.test.ts`) |
| `pnpm test:db` | Applies every migration to an in-process Postgres and checks the RLS rules as each role (no Docker) |
| `pnpm test:e2e` | Playwright: the six critical paths and the security matrix from `10` |
| `pnpm check:bundle` | Fails if any server secret appears in `.next/static` (run after build) |
| `pnpm race:rsvp` | 100 simultaneous RSVPs for 25 places; fails on overshoot |
| `pnpm load:directory` | k6: 200 users browsing and 50 searching the directory (see `load/directory.k6.js`) |
| `pnpm db:types` | Regenerate `types/database.ts` after a schema change |
| `pnpm stripe:sync` | Write Stripe price ids back into `membership_tiers` |
| `pnpm db:dump` | Dump the linked project's schema and data into `backups/` |

## Running the end-to-end tests

With the local stack running and `.env.local` pointing at it:

```bash
pnpm exec supabase db reset
pnpm exec playwright install chromium
pnpm test:e2e
```

Playwright builds and starts the app itself unless `E2E_BASE_URL` is set. `e2e/global-setup.ts` creates the fixture accounts (owner, admin, steward, member, patron) and signs each in once. The Stripe checkout test (`03-upgrade`) is skipped unless `STRIPE_E2E=1` and `stripe listen --forward-to localhost:3000/api/webhooks/stripe` is running with test keys.

CI (`.github/workflows/ci.yml`) runs typecheck, unit tests, build and the bundle scan on every push, then the full e2e suite and the RSVP race against a throwaway Supabase.

## Schema changes

Never edit the production schema in Supabase Studio. Every change is a migration:

```bash
pnpm exec supabase migration new describe_the_change
pnpm exec supabase db reset          # test locally
pnpm db:types
pnpm exec supabase link --project-ref <prod ref>
pnpm exec supabase db push           # production
```

## Environment variables

See `.env.example`. Secrets never get a `NEXT_PUBLIC_` prefix. `lib/env.ts` validates everything at build time. Production and preview use different Supabase projects and different Stripe modes (`09`).

| Variable | Notes |
|---|---|
| `CRON_SECRET` | Vercel sends it as `Authorization: Bearer …` to `/api/cron/*` |
| `ALERT_EMAIL` | Optional. Webhook failures, cron crashes and digest failures are emailed here |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_*` | Local Google sign in only; production values live in Supabase, Authentication, Providers, Google |

## Scheduled jobs (`vercel.json`)

| Path | When | What |
|---|---|---|
| `/api/cron/reconcile-memberships` | Daily 07:00 UTC | Corrects memberships against Stripe, expires manual grants |
| `/api/cron/announcement-digest` | Mondays 13:00 UTC | Weekly announcement email; opt outs re-read before each batch, one digest per week |

## Monitoring and alerts

- Every unhandled server error is one JSON line in Vercel logs: search `"level":"error"`.
- A 500 from the Stripe webhook, a crash in a cron route, or a failed digest batch is emailed to `ALERT_EMAIL` (`lib/observability/alert.ts`, `instrumentation.ts`).
- Also set, in Stripe: Developers, Webhooks, the endpoint, email on failure. Stripe retries for three days, and the webhook is idempotent, so a fix followed by a retry repairs everything.
- Supabase dashboard: database size (alert at 400MB of 500MB) and storage (800MB of 1GB) on the free tier.

## Backups and restore

Supabase keeps daily backups (7 days on the free tier). In addition, `.github/workflows/backup.yml` dumps schema, data and roles every Sunday, encrypts them with `BACKUP_PASSPHRASE`, and keeps them as a GitHub artifact for 90 days. Store the passphrase in the family password manager.

**Restore rehearsal** (do this once before launch, and after any major schema change):

1. Create a scratch Supabase project.
2. Download the latest `db-backup-*` artifact from the Actions tab and decrypt it:
   `gpg -d backup-YYYY-MM-DD.tar.gz.gpg | tar xz`
3. Restore into the scratch project (connection string from its dashboard):
   ```bash
   psql "$SCRATCH_DB_URL" -f backup/roles.sql
   psql "$SCRATCH_DB_URL" -f backup/schema.sql
   psql "$SCRATCH_DB_URL" -c "set session_replication_role = replica" -f backup/data.sql
   ```
4. Point a local `.env.local` at the scratch project, run `pnpm build && pnpm start`, sign in, and open the directory and the admin dashboard.
5. Note the date in the launch checklist, then delete the scratch project.

Storage files (avatars, photos) are not in the dump. Download the buckets from the Supabase dashboard, or enable versioning once media moves to Cloudflare R2.

## Permanent deletion requests (GDPR / CCPA)

The UI only archives. To delete someone permanently, in the Supabase SQL editor of the production project:

```sql
-- check first
select id, full_name, email, status from profiles where email = 'person@example.com';
-- delete the auth user; profile, roles, membership, RSVPs and preferences cascade.
-- Posts and photos keep the content with the author set to null.
delete from auth.users where email = 'person@example.com';
```

Also delete their files in Storage (`avatars/<user id>/`) and their customer in Stripe, then confirm to the person by email.

## Before going live

Work through the launch checklist in `10 Testing QA and Launch Checklist.md`. Items that are people's jobs rather than code: production Supabase project and migrations pushed, live Stripe keys and webhook, live price ids synced, domain and certificate, Supabase Auth site and redirect URLs, Resend domain with SPF and DKIM, Google OAuth client, Vercel Pro once real money is collected, a rehearsed restore, the friend walking through approve, publish and refund once, and someone besides Edward holding the Supabase and Stripe logins.
