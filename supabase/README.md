# Supabase — backend (migrations, Edge Functions, seed)

Status: **Phase 5 active.** Migrations created:
- `supabase/migrations/20261030000000_initial_schema.sql` (Profiles, triggers, RLS)
- `supabase/migrations/20261030010000_projects_and_members.sql` (Projects, roles, invitations, membership RPCs, RLS)
- `supabase/migrations/20261030020000_playbooks_and_phases.sql` (Playbooks, project_phases, RLS, seed_project_phases, reorder_project_phases RPCs)
- `supabase/migrations/20261030030000_task_management.sql` (Tasks, task_collaborators, task_checklist_items, task_comments, membership validation triggers, RLS)

### Applying to a Supabase project:
- **Option A (Supabase Dashboard):** Open your Supabase project -> SQL Editor -> paste `supabase/migrations/20261030030000_task_management.sql` -> Run.
- **Option B (Supabase CLI linked project):** `npx supabase db push`.
- **Client Configuration:** Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `app-mobile/.env`.

## Layout
```text
supabase/
├── config.toml        # created by `supabase init` in Phase 2
├── migrations/        # timestamped SQL migrations (source of truth)
├── functions/         # Edge Functions (trusted server-side logic)
├── tests/             # pgTAP RLS / policy tests
└── seed.sql           # local-only, non-production fixture data
```

## Migration strategy
1. Migrations are plain SQL created with `npx supabase migration new <name>`
   and committed. They are append-only once applied to any shared environment;
   corrections are new migrations, never edits to applied files.
2. Every user-accessible table enables RLS in the **same** migration that
   creates it, with explicit grants and policies (no table is ever briefly
   exposed).
3. Local verification: `npx supabase start` → `npx supabase db reset`
   (replays all migrations + seed) → `npx supabase test db` (pgTAP RLS matrix:
   anonymous, non-member, member, admin, owner, cross-project).
4. Hosted rollout: `npx supabase db push` against a linked project, only after
   local reset + tests pass. Never use the dashboard to change schema directly.
5. Generated DB types: `npx supabase gen types typescript --local` →
   `app-mobile/src/types/database.ts` (regenerated after each migration).
6. Secrets (service-role key, push credentials) live only in Supabase/Edge
   Function secrets, never in this repo or the mobile app.

## Current blocker
Local Supabase requires Docker, which is **not installed** on the development
machine (checked 2026-10-30). Until Docker Desktop is installed, migration
replay and RLS tests are `BLOCKED`.
