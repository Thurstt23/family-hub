import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Applies every migration and seed.sql to an in-process Postgres (PGlite)
// with minimal stand-ins for Supabase's auth and storage schemas, then checks
// the RLS rules as each role. No Docker needed: `pnpm test:db`.
// It complements, not replaces, the Playwright suite against real Supabase.

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const db = new PGlite({ extensions: { pg_trgm } })

// ---- minimal Supabase platform stubs ----
await db.exec(`
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role supabase_admin nologin;
create schema auth;
create schema storage;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select current_user::text $$;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
grant all on all tables in schema storage to anon, authenticated, service_role;
grant all on all tables in schema auth to service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`)

const migDir = join(REPO, 'supabase/migrations')
for (const f of readdirSync(migDir).filter(f => f.endsWith('.sql')).sort()) {
  try {
    await db.exec(readFileSync(join(migDir, f), 'utf8'))
    console.log('applied', f)
  } catch (e) {
    console.log('FAILED', f, e.message)
    process.exit(1)
  }
}
await db.exec(readFileSync(join(REPO, 'supabase/seed.sql'), 'utf8'))
console.log('seed ok')

// ---- helpers ----
let pass = 0, fail = 0
const ok = (cond, label, extra) => {
  if (cond) { pass++; console.log('  ok  ', label) } else { fail++; console.log('  FAIL', label, extra ?? '') }
}
async function as(role, uid, sql, params = []) {
  await db.exec('reset role')
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? ''])
  if (role !== 'postgres') await db.exec(`set role ${role}`)
  try {
    const r = await db.query(sql, params)
    return { rows: r.rows, count: r.affectedRows, error: null }
  } catch (e) {
    return { rows: [], count: 0, error: e.message }
  } finally {
    await db.exec('reset role')
  }
}
const su = (sql, p) => as('postgres', null, sql, p)
const user = (uid, sql, p) => as('authenticated', uid, sql, p)
const branch = async slug => (await su(`select id from family_branches where slug=$1`, [slug])).rows[0].id

async function mkUser(email, { status = 'active', branchSlug = 'martin-savannah', roles = [], tier } = {}) {
  const id = (await su(`insert into auth.users (email, raw_user_meta_data) values ($1, '{"full_name":"x"}') returning id`, [email])).rows[0].id
  await su(`update profiles set status=$2, branch_id=$3, full_name=$4, phone='+1 555 0100' where id=$1`, [id, status, branchSlug ? await branch(branchSlug) : null, email.split('@')[0]])
  for (const r of roles) await su(`insert into user_roles (user_id, role) values ($1, $2)`, [id, r])
  if (tier) await su(`update memberships set tier_id=(select id from membership_tiers where slug=$2), current_period_end=now()+interval '1 year' where user_id=$1`, [id, tier])
  return id
}

console.log('\n== platform')
const noRls = await su(`select tablename from pg_tables where schemaname='public' and not rowsecurity`)
ok(noRls.rows.length === 0, 'RLS enabled on every public table', JSON.stringify(noRls.rows))

const owner = await mkUser('owner@t', { roles: ['owner'] })
const admin = await mkUser('admin@t', { roles: ['admin'] })
const steward = await mkUser('steward@t', { roles: ['steward'] })
await su(`insert into branch_stewards (user_id, branch_id) values ($1, $2)`, [steward, await branch('martin-savannah')])
const member = await mkUser('member@t', { branchSlug: 'sawyer-charleston' })
const patron = await mkUser('patron@t', { branchSlug: 'sawyer-marsh', tier: 'patron' })
const pendingIn = await mkUser('pending-in@t', { status: 'pending', branchSlug: 'martin-savannah' })
const pendingOut = await mkUser('pending-out@t', { status: 'pending', branchSlug: 'sawyer-charleston' })

console.log('\n== signup trigger')
const fresh = (await su(`insert into auth.users (email) values ('new.person@t') returning id`)).rows[0].id
const p = (await su(`select status, handle from profiles where id=$1`, [fresh])).rows[0]
ok(p?.status === 'pending' && p.handle === 'newperson', 'profile created pending with handle', JSON.stringify(p))
ok((await su(`select 1 from user_roles where user_id=$1 and role='member'`, [fresh])).rows.length === 1, 'member role created')
ok((await su(`select 1 from memberships m join membership_tiers t on t.id=m.tier_id where user_id=$1 and t.slug='free'`, [fresh])).rows.length === 1, 'free membership created')
ok((await su(`select announcements from email_preferences where user_id=$1`, [fresh])).rows[0]?.announcements === true, 'email preferences row created')

console.log('\n== security matrix (10, section 2)')
ok((await as('anon', null, `select * from profiles`)).rows.length === 0, 'anon reads 0 profiles')
const pr = await user(pendingIn, `select id from profiles`)
ok(pr.rows.length === 1 && pr.rows[0].id === pendingIn, 'pending user sees only own row')
const ab = await user(member, `update profiles set city='Hacked' where id=$1`, [patron])
ok(ab.count === 0, "member A cannot update member B", JSON.stringify(ab))
await user(pendingIn, `update profiles set status='active' where id=$1`, [pendingIn])
ok((await su(`select status from profiles where id=$1`, [pendingIn])).rows[0].status === 'pending', 'own status change silently reverted')
const ins = await user(member, `insert into memberships (user_id, tier_id) select $1, id from membership_tiers where slug='lifetime'`, [member])
ok(!!ins.error, 'member insert into memberships rejected', ins.error)
const upd = await user(member, `update memberships set tier_id=(select id from membership_tiers where slug='lifetime') where user_id=$1`, [member])
ok(upd.count === 0, 'member update of own membership affects 0 rows')

await su(`insert into posts (slug, title, body, visibility, min_tier_level, published_at) values ('gated','Gated','secret','tier_gated',20, now()-interval '1 minute')`)
ok((await user(member, `select id from posts where slug='gated'`)).rows.length === 0, 'free member gets 0 tier gated rows')
ok((await user(patron, `select id from posts where slug='gated'`)).rows.length === 1, 'patron reads the tier gated post')

console.log('\n== stewards (06, section 6)')
ok((await user(steward, `select id from profiles where id=$1`, [pendingOut])).rows.length === 0, 'steward cannot see pending member outside branch')
ok((await user(steward, `select id from profiles where id=$1`, [pendingIn])).rows.length === 1, 'steward sees pending member in own branch')
const so = await user(steward, `update profiles set status='active' where id=$1`, [pendingOut])
ok(so.count === 0, 'steward approve outside branch affects 0 rows')
const si = await user(steward, `update profiles set status='active', city='Elsewhere', full_name='Renamed' where id=$1 returning status, city, full_name`, [pendingIn])
ok(si.rows[0]?.status === 'active' && si.rows[0]?.city !== 'Elsewhere' && si.rows[0]?.full_name !== 'Renamed', 'steward approves in branch; other fields reverted', JSON.stringify(si))
await su(`update profiles set status='pending' where id=$1`, [pendingIn])
const rej = await user(steward, `update profiles set rejection_reason='Need surname' where id=$1 returning status, rejection_reason, reviewed_by`, [pendingIn])
ok(rej.rows[0]?.status === 'pending' && rej.rows[0]?.rejection_reason === 'Need surname' && rej.rows[0]?.reviewed_by === steward, 'steward decline keeps row pending with note')
const suspend = await user(steward, `update profiles set status='suspended' where id=$1`, [patron])
ok(suspend.count === 0, 'steward cannot suspend an active member elsewhere')

console.log('\n== roles (06, section 5)')
ok(!!(await user(admin, `insert into user_roles (user_id, role) values ($1, 'admin')`, [member])).error, 'admin cannot grant admin')
ok(!!(await user(member, `insert into user_roles (user_id, role) values ($1, 'owner')`, [member])).error, 'member cannot self-grant owner')
const grantee = await mkUser('grantee@t')
ok(!(await user(owner, `insert into user_roles (user_id, role, granted_by) values ($1, 'admin', $2)`, [grantee, owner])).error, 'owner grants admin')
ok((await user(grantee, `select is_admin() as a`)).rows[0].a === true, 'granted role effective on next query')
ok(!!(await user(owner, `delete from user_roles where user_id=$1 and role='owner'`, [owner])).error, 'owner cannot revoke own role')
const owner2 = await mkUser('owner2@t', { roles: ['owner'] })
ok(!(await user(owner, `delete from user_roles where user_id=$1 and role='owner'`, [owner2])).error, 'owner can remove another owner while one remains')
const last = await as('service_role', null, `delete from user_roles where user_id=$1 and role='owner'`, [owner])
ok(!!last.error && last.error.includes('last owner'), 'last owner cannot be removed, even by service role', last.error)
ok(!!(await user(admin, `insert into branch_stewards (user_id, branch_id) values ($1, $2)`, [member, await branch('sawyer-marsh')])).error, 'admin cannot assign stewards')
ok(!(await user(owner, `insert into branch_stewards (user_id, branch_id) values ($1, $2)`, [admin, await branch('sawyer-marsh')])).error, 'owner assigns stewards')
ok(!!(await user(admin, `update membership_tiers set price_cents=1 where slug='patron'`)).error || (await user(admin, `update membership_tiers set price_cents=1 where slug='patron'`)).count === 0, 'admin cannot edit tiers')
ok((await user(owner, `update membership_tiers set description='x' where slug='patron'`)).count === 1, 'owner edits tiers')

console.log('\n== admin features')
const ov = await user(admin, `update memberships set tier_id=(select id from membership_tiers where slug='supporter'), current_period_end=now()+interval '30 days', override_note='gift', override_by=$2 where user_id=$1`, [member, admin])
ok(ov.count === 1, 'admin membership override allowed', ov.error)
ok((await user(member, `select current_tier_level() as l`)).rows[0].l === 10, 'override grants tier level 10')
await su(`update memberships set tier_id=(select id from membership_tiers where slug='free'), current_period_end=null, override_note=null where user_id=$1`, [member])

ok(!(await user(admin, `insert into audit_log (actor_id, action, entity) values ($1, 'test', 'x')`, [admin])).error, 'staff writes own audit row')
ok(!!(await user(admin, `insert into audit_log (actor_id, action, entity) values ($1, 'test', 'x')`, [owner])).error, 'staff cannot forge another actor')
ok(!!(await user(member, `insert into audit_log (actor_id, action, entity) values ($1, 'test', 'x')`, [member])).error, 'member cannot write audit')
ok((await user(steward, `select id from audit_log`)).rows.length === 0, 'steward cannot read audit')
ok((await user(admin, `select id from audit_log`)).rows.length >= 1, 'admin reads audit')

const st = await user(steward, `select admin_dashboard_stats() as s`)
ok(!st.error && st.rows[0].s.arr_cents === null && typeof st.rows[0].s.pending_approvals === 'number', 'steward dashboard: counts, no revenue', st.error ?? JSON.stringify(st.rows[0]?.s))
const sa = await user(admin, `select admin_dashboard_stats() as s`)
ok(!sa.error && typeof Number(sa.rows[0].s.arr_cents) === 'number' && sa.rows[0].s.signups_30d.length === 30, 'admin dashboard: revenue and 30 day series', sa.error)
ok(!!(await user(member, `select admin_dashboard_stats()`)).error, 'member cannot call dashboard RPC')
ok(!!(await as('anon', null, `select admin_dashboard_stats()`)).error, 'anon cannot call dashboard RPC')

console.log('\n== rsvp')
const ev = (await su(`insert into events (slug, title, starts_at, rsvp_deadline, capacity) values ('ev','Ev', now()+interval '10 days', now()+interval '5 days', 3) returning id`)).rows[0].id
ok(!(await user(member, `insert into event_rsvps (event_id, user_id, guests_count) values ($1,$2,1)`, [ev, member])).error, 'RSVP before deadline')
const full = await user(patron, `insert into event_rsvps (event_id, user_id, guests_count) values ($1,$2,1)`, [ev, patron])
ok(!!full.error && full.error.includes('capacity'), 'capacity enforced for a normal member (2 taken, 2 more refused)', full.error)
ok(!(await user(patron, `insert into event_rsvps (event_id, user_id, guests_count) values ($1,$2,0)`, [ev, patron])).error, 'last single place still accepted')
await su(`update events set rsvp_deadline=now()-interval '1 minute' where id=$1`, [ev])
const late = await user(member, `update event_rsvps set guests_count=0 where event_id=$1 and user_id=$2`, [ev, member])
ok(!!late.error && late.error.includes('deadline'), 'RSVP edit after deadline refused', late.error)

console.log('\n== email preferences')
ok((await user(member, `select user_id from email_preferences`)).rows.length === 1, 'member sees only own preferences')
const token = (await su(`select unsubscribe_token from email_preferences where user_id=$1`, [member])).rows[0].unsubscribe_token
const un = await as('anon', null, `select unsubscribe_by_token($1) as ok`, [token])
ok(un.rows[0]?.ok === true, 'anon one-click unsubscribe by token', un.error)
ok((await su(`select announcements from email_preferences where user_id=$1`, [member])).rows[0].announcements === false, 'preference switched off')

console.log('\n== storage')
ok(!(await user(member, `insert into storage.objects (bucket_id, name) values ('avatars', $1)`, [`${member}/a.png`])).error, 'avatar upload into own folder')
ok(!!(await user(member, `insert into storage.objects (bucket_id, name) values ('avatars', $1)`, [`${patron}/a.png`])).error, 'avatar upload into someone else\'s folder refused')
const b = (await su(`select allowed_mime_types from storage.buckets where id='avatars'`)).rows[0]
ok(b && !b.allowed_mime_types.includes('image/svg+xml'), 'avatars bucket excludes SVG')

console.log('\n== PostgREST embed hints used by the app')
const fks = (await su(`select conname from pg_constraint where contype='f' and conrelid='public.user_roles'::regclass`)).rows.map(r => r.conname)
ok(fks.includes('user_roles_user_id_fkey'), 'user_roles_user_id_fkey exists', fks)
const memFks = (await su(`select count(*)::int n from pg_constraint where contype='f' and conrelid='public.memberships'::regclass and confrelid='public.profiles'::regclass`)).rows[0].n
ok(memFks === 1, 'memberships has exactly one FK to profiles (unambiguous embed)')
const audFks = (await su(`select count(*)::int n from pg_constraint where contype='f' and conrelid='public.audit_log'::regclass and confrelid='public.profiles'::regclass`)).rows[0].n
ok(audFks === 1, 'audit_log has exactly one FK to profiles')

console.log('\n== social (phase 6)')
const story = await user(member, `insert into posts (slug, title, body, kind, author_id, published_at) values ('story1','Hi','Hello family','story',$1, now()) returning id`, [member])
ok(!story.error, 'a member can post a story to the feed', story.error)
const forged = await user(member, `insert into posts (slug, title, body, kind, visibility, author_id, published_at) values ('fake-ann','Official','x','announcement','public',$1, now())`, [member])
ok(!!forged.error, 'a member cannot publish an announcement', forged.error)
const anyPost = (await su(`insert into posts (slug,title,body,published_at) values ('staff-post','t','b',now()) returning id`)).rows[0].id
const c = (await user(patron, `insert into comments (post_id, author_id, body) values ($1,$2,'rude') returning id`, [anyPost, patron])).rows[0]?.id
const rep = await user(member, `select report_comment($1)`, [c])
ok(!rep.error && (await su(`select status from comments where id=$1`, [c])).rows[0]?.status === 'pending', "a member can report someone else's comment", rep.error)
const alb = (await su(`insert into albums (title) values ('Reunion 2025') returning id`)).rows[0].id
const sneaky = await user(member, `insert into photos (album_id, uploader_id, storage_path, status) values ($1,$2,'x.webp','approved')`, [alb, member])
ok(!!sneaky.error, 'a member cannot insert an already-approved album photo', sneaky.error)
ok(!(await user(member, `insert into photos (album_id, uploader_id, storage_path) values ($1,$2,'y.webp')`, [alb, member])).error, 'a member uploads a pending album photo')
const storyId = (await su(`select id from posts where slug='story1'`)).rows[0]?.id
ok(!!storyId && !(await user(member, `insert into photos (post_id, uploader_id, storage_path, status) values ($1,$2,'z.webp','approved')`, [storyId, member])).error, "photos on the member's own story are published with it")
ok(!!(await user(patron, `insert into photos (post_id, uploader_id, storage_path, status) values ($1,$2,'w.webp','approved')`, [storyId, patron])).error, "cannot attach approved photos to someone else's post")
await su(`insert into albums (title, visibility, min_tier_level) values ('Patron album','tier_gated',20)`)
ok((await user(member, `select id from albums where title='Patron album'`)).rows.length === 0, 'free member cannot see a patron album')
ok((await user(patron, `select id from albums where title='Patron album'`)).rows.length === 1, 'patron sees the patron album')
ok((await as('anon', null, `select event_seats_taken($1) as n`, [ev])).rows[0]?.n === 3, 'seat total visible without exposing rows')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
