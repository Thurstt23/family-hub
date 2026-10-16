@AGENTS.md

# Martin Sawyer Reunion: notes for Claude

- **Content work** (names, family story, About/Join wording, privacy and terms, email wording, the home photograph): read `docs/CONTENT_GUIDE.md` first and follow its rules. Almost all public wording is in `content/site.ts`. Branches, events, announcements, albums and tiers are database content edited in the admin console, not in code.
- **Security model:** Postgres row level security is the boundary. Never use the service role client outside `app/api/webhooks/stripe` and `app/api/cron/*`. Schema changes are new files in `supabase/migrations/`, never edits to existing ones.
- **Design:** "the register". Colours only from the tokens in `app/globals.css`; brass is the single accent, mulberry only for money and tiers. No new fonts, gradients, card grids or decorative animation. English only.
- **Dates:** format with `lib/dates.ts` (family timezone), never `toLocaleString` or date-fns `format` on the server.
- **Checks before finishing:** `pnpm typecheck`, `pnpm lint` (0 errors), `pnpm test`, `pnpm test:db` if SQL changed, `pnpm build`.
