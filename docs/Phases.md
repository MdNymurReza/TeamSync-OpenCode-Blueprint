# MelBond — Phased Delivery Plan

## Gate states
`NOT_STARTED` · `IN_PROGRESS` · `BLOCKED` · `READY_FOR_REVIEW` · `VERIFIED`

Only the user authorizes the next phase. An agent can recommend it but cannot self-advance.

## Phase 0 — Repository discovery and bootstrap
Inspect repo/git status/runtime/tools, resolve open decisions, create minimal Expo/TypeScript shell only if needed, `.env.example`, ignore rules, scripts, lint/typecheck/test setup, and migration strategy. No feature implementation.
**Gate:** `VERIFIED` (app shell scaffolded, checks pass with 0 errors/warnings, baseline recorded, no secrets, migration strategy documented in `supabase/README.md`). Ready for Phase 1 authorization.

## Phase 1 — Design foundation and app shell
Theme/tokens, reusable accessible components, navigation shell, route states, loading/empty/error primitives.
**Gate:** `VERIFIED` (design tokens, accessible components, Expo Router tabs shell, and 24 unit/screen tests passing with 0 errors/warnings; no dead buttons). Ready for Phase 2 authorization.

## Phase 2 — Database foundation and authentication
Migrations, profiles, grants/RLS, auth screens/session management, local/hosted setup instructions.
**Gate:** `VERIFIED` (Initial migration with strict RLS and profile triggers; Supabase client configured with AsyncStorage session persistence and safe unconfigured fallback; AuthContext and auth flows; accessible Input primitive; Sign In, Sign Up, and Reset Password screens; session-aware root routing; 17 test suites, 37 tests passing with 0 TS errors and 0 lint warnings; expo-doctor 20/20 checks passed). Ready for Phase 3 authorization.

## Phase 3 — Projects, roles, invitations, membership
Create/list/detail/edit/archive projects; roles; secure invite create/redeem/revoke/expiry; member management and leave rules.
**Gate:** `VERIFIED` (Phase 3 migration with projects, project_members, project_invitations, atomic RPCs, owner invariant, and strict RLS; projectsService domain layer; accessible screens for listing workspaces, creating projects, redeeming invitations, viewing details, and managing team members; 21 test suites, 54 unit/screen/migration tests passing with 0 TS errors and 0 lint warnings; expo-doctor 20/20 checks passed). Ready for Phase 4 authorization.

## Phase 4 — Playbooks and phases
Starter templates: assignment, software, research, FYDP; project-scoped phase customization.
**Gate:** `VERIFIED` (Phase 4 migration with project_phases, RLS policies, seed_project_phases, reorder_project_phases RPCs, auto-seeding on workspace creation; playbooks domain types, starter templates, and playbooksService; accessible phases management screen with progress tracking, accessible move up/down reordering, template resets, and role-based permissions; 24 test suites, 71 tests passing with 0 TS errors and 0 lint warnings; expo-doctor 20/20 checks passed). Ready for Phase 5 authorization.

## Phase 5 — Task management
CRUD/archive behavior, assignee/collaborators, status/priority/dates, checklist/comments, filters, overdue and reopen behavior.
**Gate:** `VERIFIED` (Phase 5 migration with tasks, task_collaborators, task_checklist_items, task_comments, membership validation triggers, and RLS; task domain types and tasksService; accessible task board screen with status/overdue/phase filters and quick checkbox toggle; create task screen with phase/assignee/priority selection and date parsing; task details screen with status chips, reopen behavior, interactive checklist, comments thread, and archive/delete flows; 29 test suites, 94 tests passing with 0 TS errors and 0 lint warnings; expo-doctor 20/20 checks passed). Ready for Phase 6 authorization.

## Phase 6 — Milestones, timeline, dashboard
Milestone/task links, progress calculation/manual state rules, dashboard from authoritative data.
**Gate:** progress/timezone tests and dashboard reconciliation; empty/error states.

## Phase 7 — Meetings, minutes, decisions
Meeting schedule/agenda, minutes, decision history, action-item conversion. Availability polls only if approved.
**Gate:** timezone, permissions, history, and idempotency tests.

## Phase 8 — Resource hub and private uploads
Categories, descriptions, external links, private upload/download, storage policies.
**Gate:** non-member cannot list/download; file limits and signed URL behavior tested.

## Phase 9 — Activity, notifications, Team Pulse, search
Activity, preferences, reminders, check-ins, authorized search.
**Gate:** no content leakage, deduplicated reminders, preferences honored, search isolation. Missing push credentials means delivery tests are blocked.

## Phase 10 — Hardening and beta release
E2E flows, accessibility, pagination/performance, security checklist, deletion flows, docs, Android build/device smoke tests.
**Gate:** critical flows pass; failed/skipped checks disclosed; release evidence recorded.

## Post-MVP (separate approval)
Advanced filters/saved views, calendar integration, recurring tasks; supervisor portal, advanced templates, exports; AI summaries/drafts/risk summaries; optional web dashboard.

## Phase boundary checklist
- [ ] Scope met; no unrelated features.
- [ ] Tests added and executed.
- [ ] Lint/typecheck/build checks run where available.
- [ ] Authorization matrix and cross-project isolation reviewed.
- [ ] Loading/empty/error/retry/accessibility reviewed.
- [ ] Diff reviewed; no secrets/unrelated changes.
- [ ] `LOG.md`, `Memory.md`, and this file updated.
- [ ] Report includes evidence and limitations.
- [ ] Stop and wait for authorization.
