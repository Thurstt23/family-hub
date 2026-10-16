# Content guide: getting the words, names and photos right

This guide is for whoever is making the site *say the right things* about the family, and for the Claude (Claude Code, or Claude in the desktop app) helping them. It assumes no programming. The code is finished; what is left is replacing placeholder wording, checking facts, and adding the family's real details.

> **If you are Claude reading this:** follow the rules in [section 5](#5-rules-for-claude) for every change. Content changes only. Do not touch the files listed under "Do not edit". When unsure whether something is content or code, ask the person.

---

## 1. What you can change, and where

There are two kinds of content on this site:

| Kind | Examples | Where it is changed |
|---|---|---|
| **Words built into the site** | Family name, tagline, the family story on the home page, the About page, the Join page steps, privacy and terms wording | Files in this repository (this guide) |
| **Things the family adds over time** | Branches, events, announcements, photo albums, membership tier names, prices and benefits | The **admin console** on the live site (`/admin`), no code at all. See README part 1 |

If something is in the second row, **do not change it in code**: it lives in the database, and an edit in code will either do nothing or be overwritten.

### Files you may edit

| What | File | Notes |
|---|---|---|
| Family name, tagline, home story, About page, Join page, contact email | `content/site.ts` | **Start here.** Almost everything a visitor reads is in this one file |
| Home page photograph | `public/` folder plus `content/site.ts` → `home.heroImage` | See [section 3](#3-adding-the-home-page-photograph) |
| Privacy policy | `app/privacy/page.tsx` | Plain sentences inside `<p>` and `<li>` tags |
| Terms | `app/terms/page.tsx` | Same |
| Wording of emails the site sends | `lib/email/templates/index.tsx` | One block per email: pending, welcome, status update, payment failed, weekly digest |
| Branch names in the starter data (local copies only) | `supabase/seed.sql` | Only affects fresh test databases. Real branches: Admin → Branches |

### Do not edit

`lib/supabase/`, `lib/auth/`, `lib/admin/`, `lib/stripe/`, `app/api/`, `supabase/migrations/`, `middleware.ts`, `.env*`, `package.json`, `pnpm-lock.yaml`, anything under `.github/`. These are security, payments and database code. A content change never needs them.

---

## 2. Getting the code onto your computer

You need, once:

1. A GitHub account, and to be added to the repository by Edward (he will send an invitation).
2. **Git**: <https://git-scm.com/downloads>.
3. **Node.js 22** (LTS): <https://nodejs.org>.
4. **pnpm**: open a terminal and run `npm install -g pnpm`.
5. **Claude Code** (optional but recommended): <https://claude.com/claude-code>.

Then, in a terminal:

```bash
git clone https://github.com/Thurstt23/family-hub.git
cd family-hub
pnpm install
git checkout -b content/first-pass        # your own branch, never work on main
```

### Seeing your changes

There are two ways to see the site while you edit:

- **Preview links (simplest, nothing to set up).** Every time you push your branch to GitHub, Vercel builds a private preview of the site and posts its link on your pull request. Open that link to see your changes exactly as members will. Public pages work fully; to sign in on a preview you need an account on the test database (ask Edward).
- **On your own computer.** Ask Edward for a `.env.local` file pointing at the *test* database (never the live one), put it in the `family-hub` folder, then run `pnpm dev` and open <http://localhost:3000>. Pages update as you save.

---

## 3. Adding the home page photograph

The home page is designed around one full-width archival photograph with a dark overlay. Until one is added, the top of the page is plain dark blue.

1. Choose a landscape photograph, at least 2000 pixels wide. Older family photographs work well; the overlay keeps the white heading readable.
2. Save it as `public/hero.jpg` (lowercase, no spaces). Keep it under about 1MB: export as JPEG at around 80% quality.
3. In `content/site.ts`, change
   `heroImage: { src: null as string | null, alt: '...' }`
   to
   `heroImage: { src: '/hero.jpg' as string | null, alt: 'Describe the photograph in one sentence' }`.
   With a photograph the drawn botanical illustration on the right of the heading is replaced by the photo behind it; without one, the illustration shows.
4. The `alt` text is read aloud to blind visitors. Say who and what, and the year if known, for example *"Four generations on the porch of the Savannah house, Easter 1974"*.

Only use photographs the family has the right to publish, and remember the home page is public.

---

## 4. The content checklist before launch

Work through these with Claude. Each one is a placeholder written during development that must become true.

**In `content/site.ts`:**

- [ ] `familyName`, `name`, `shortName`, `familyNameInSentence`: exactly how the family wants to be named.
- [ ] `tagline`: currently "Six branches. Four generations. One register." Only keep the numbers if they are true.
- [ ] `home.heroNote` ("Kept since 1961 · Savannah, Georgia") and `home.heroTitle` (the big two-line heading; the second line is set in gold italic).
- [ ] `home.generations`: the number shown beside the live branch and member counts.
- [ ] `home.storyHeading`, `home.branchesHeading`, `home.branchesIntro`, `home.joinHeading`: section headings on the home page.
- [ ] `home.quote`: the line set large near the bottom of the home page and beside the sign-in form. The current one is invented; use a real saying from the family, or a line everyone agrees on.
- [ ] `home.story`: the two paragraphs mention **1961**, a **leather-bound ledger** and **Savannah**. These were invented as examples. Replace them with the family's real story.
- [ ] `about.intro` and `about.sections`: same, real history. Add or remove sections freely (copy one `{ heading, paragraphs }` block).
- [ ] `join.steps` and `join.intro`: check they describe how approval really works in this family (who the stewards are, how long it usually takes).
- [ ] `contactEmail`: currently `hello@example.com`. Must be a real inbox someone reads.

**On the live site, in the admin console (not code):**

- [ ] **Branches** (Admin → Branches): the six starter branches (Martin, Martin (Savannah), Martin (Atlanta), Sawyer, Sawyer (Charleston), Sawyer-Marsh) are examples. Rename them, fix descriptions, add or reorder.
- [ ] **Tiers** (Admin → Settings, owner only): names, prices, descriptions and benefits. **Benefits must only promise what the site actually restricts.** Today the site can restrict *posts, events and albums* to a tier (an admin chooses "Members on a paid tier" when creating them). It has no supporters wall or document archive. If the family wants to promise those, they need building first.
- [ ] **Events**: at least one real upcoming gathering, marked "Everyone" so it shows on the public home page.
- [ ] **An announcement** welcoming members, so the feed is not empty on day one.

**Pages:**

- [ ] Privacy (`app/privacy/page.tsx`): read it as a family member would. It names what is stored and who sees it. If anything differs (for example the family does not want birthdays), change the wording *and* tell Edward.
- [ ] Terms (`app/terms/page.tsx`): check the refund wording matches what the family will actually do.
- [ ] Emails (`lib/email/templates/index.tsx`): read each one aloud. They should sound like the family, not like a company.

---

## 5. Rules for Claude

These keep the site consistent with its design (the "family register" look) and safe.

**Scope**
- Content changes only: text, the hero image, privacy and terms wording, email wording. If a request needs a code change (a new page, a new feature, a new field), say so and stop; that goes to Edward.
- Never edit the files under "Do not edit" in section 1, never add dependencies, never touch `.env` files or print their contents.
- The site is **English only**, written for an American family.

**Voice** (from the design spec)
- Calm, mildly formal, warm. Not marketing. Never use "unlock", "supercharge", "seamless", "journey", exclamation marks, or emoji.
- Buttons say exactly what happens: "Join the register", "Save changes", "Send approval". Not "Submit" or "Click here".
- Empty states name the next action and never apologise ("No one matches that. Try a surname or a city.").
- Short paragraphs. A line on screen should not exceed about 68 characters, so prefer two short paragraphs over one long one.
- Do not invent facts about the family: names, dates, places, numbers. If a sentence needs a fact you were not given, leave a clearly marked question for the person, for example `[[TODO: year the first reunion was held?]]`, and list every TODO at the end of your reply.

**Design**
- Do not add colours, fonts, shadows, gradients, card grids or animations. Colours come from the existing names only: `ink`, `ink-deep`, `paper`, `paper-deep`, `card`, `slate`, `rule`, `brass` (the single accent), `brass-light` (only on dark ink), `mulberry` (money and tiers only), `sage` (success), `clay` (errors).
- The drawings (`components/illustrations/`) are part of the design: a botanical sprig, an open register, and the family tree drawn from the real branches. Reuse them; do not add clip art or stock icons.
- Headings use the serif (`font-serif`), everything else the default sans.
- Every image needs real `alt` text.

**Before handing back**
Run these and fix anything that fails:

```bash
pnpm typecheck     # the code still fits together
pnpm lint          # 0 errors (warnings are known and fine)
pnpm build         # the site builds
```

Then summarise for the person, in plain words: which files changed, what each change says now, and any TODO questions.

---

## 6. Ready-made requests for Claude

Copy one, change the parts in brackets, paste it to Claude in the `family-hub` folder.

**First pass**
> Read docs/CONTENT_GUIDE.md. Then read content/site.ts and list every sentence that states a fact about the family (names, dates, places, numbers) so I can confirm or correct each one. Do not change anything yet.

**Replace the story**
> Following docs/CONTENT_GUIDE.md, rewrite `home.story` and `about` in content/site.ts using these facts: [paste notes, dates, names]. Keep the register's voice, two short paragraphs on the home page. Mark anything you had to guess as a TODO.

**Add the photograph**
> I have put our photo at public/hero.jpg. It shows [who, where, when]. Following docs/CONTENT_GUIDE.md, switch the home page to use it with good alt text, then run the checks.

**Review the privacy page**
> Following docs/CONTENT_GUIDE.md, read app/privacy/page.tsx and tell me, in plain language, what it promises members. Point out anything a family member might find surprising or unclear. Do not edit yet.

**Proofread everything**
> Following docs/CONTENT_GUIDE.md, proofread content/site.ts, app/privacy/page.tsx, app/terms/page.tsx and lib/email/templates/index.tsx for spelling, tone and consistency (the family name must be written the same way everywhere). Fix only wording, then run the checks and summarise the changes.

---

## 7. Sending your changes back

When you are happy with what the preview shows:

```bash
git add -A
git commit -m "content: real family story and contact email"
git push -u origin content/first-pass
```

GitHub prints a link to open a **pull request**. Open it, say in a sentence what you changed, and Edward reviews and merges it. When it is merged into `main`, the live site updates by itself within a couple of minutes.

Next time, start from the latest version:

```bash
git checkout main
git pull
git checkout -b content/next-change
```

If git says something confusing, stop and ask; do not force anything.
