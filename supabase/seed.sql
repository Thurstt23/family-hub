-- ============ membership_tiers ============
insert into public.membership_tiers (slug, name, description, level, price_cents, currency, billing_interval, stripe_price_id, is_active, sort_order) values
('free', 'Free', 'Basic access to the directory and free events', 0, 0, 'usd', 'year', null, true, 0),
('supporter', 'Supporter', 'Helps cover the platform costs', 10, 2500, 'usd', 'year', 'price_fake_supporter', true, 10),
('patron', 'Patron', 'Sustains the community and family archive', 20, 10000, 'usd', 'year', 'price_fake_patron', true, 20),
('lifetime', 'Lifetime', 'One-time contribution for lifetime access', 30, 50000, 'usd', 'one_time', 'price_fake_lifetime', true, 30)
on conflict (slug) do nothing;

-- ============ family_branches ============
-- Parent branches
insert into public.family_branches (id, name, slug, description, sort_order) values
('00000000-0000-4000-a000-000000000001', 'Martin', 'martin', 'Descendants of the Martin family line', 10),
('00000000-0000-4000-a000-000000000002', 'Sawyer', 'sawyer', 'Descendants of the Sawyer family line', 20)
on conflict (slug) do update set name = excluded.name;

-- Child branches
insert into public.family_branches (name, slug, description, parent_id, sort_order) values
('Martin (Savannah)', 'martin-savannah', 'Savannah branch of the Martin family', '00000000-0000-4000-a000-000000000001', 11),
('Martin (Atlanta)', 'martin-atlanta', 'Atlanta branch of the Martin family', '00000000-0000-4000-a000-000000000001', 12),
('Sawyer (Charleston)', 'sawyer-charleston', 'Charleston branch of the Sawyer family', '00000000-0000-4000-a000-000000000002', 21),
('Sawyer-Marsh', 'sawyer-marsh', 'The Sawyer-Marsh connected line', '00000000-0000-4000-a000-000000000002', 22)
on conflict (slug) do update set name = excluded.name;
