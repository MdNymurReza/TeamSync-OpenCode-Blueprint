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
**Gate:** `VERIFIED` (Phase 5 migration with tasks, task_collaborators, task_checklist_items, task_comments, membership validation triggers, and RLS; task domain types and tasksService; accessible task board screen with status/overdue/phase filters and quick checkbox toggle; create task screen with phase/assignee/priority selection and date parsing; task details screen with status chips, reopen behavior, interactive checklist, comments thread, and archive/delete flows; 29 test suites, 94 tests passing with 0 TS errors and 0 lint warnings; expo-doctor 20/20 checks passed). Ready for Phase 5.5 / Phase 6 authorization.

## Phase 5.5 — Visual polish & design system refinement
Refined typography scale (`display`, `label`, `overline`), soft elevation and radii tokens, deterministic `Avatar` palette, reusable layout primitives (`Avatar`, `IconTile`, `ProgressBar`, `ScreenHeader`, `SectionHeader`, `TabScreen`), unified navigation header options, and full visual hierarchy polish across Auth, Tabs, Project Overview, Team Members, Playbook Phases, Task Board, Task Creation, Task Details, Create Workspace, and Join Workspace screens. No new product features or data mutations.
**Gate:** `VERIFIED` (Refined tokens and 6 new accessible UI primitives; removed stale developer status card on Home in favor of real quick-action cards; polished all 14 screens while preserving all domain logic, RLS boundaries, and accessibility contracts; 30 test suites, 98 tests passing with 0 TS errors and 0 lint warnings; expo-doctor 20/20 checks passed). Ready for Phase 6 authorization.

## Phase 6 — Milestones, timeline, dashboard
Milestone/task links, progress calculation/manual state rules, dashboard from authoritative data.
**Gate:** `VERIFIED` (Phase 6 migration `20261031000000_milestones_and_timeline.sql` with `milestones`, `tasks.milestone_id` `ON DELETE SET NULL`, cross-project phase/milestone integrity triggers, and RLS; `milestonesService` with deterministic `computeMilestoneState` auto/manual progress, overdue & 7-day deadline risk detection, and `reconcileDashboardSummary`; Project Timeline & Milestones screen `app/projects/[id]/milestones.tsx`; Project Overview milestones card; authoritative Home Dashboard `app/(tabs)/index.tsx`; plus `Input.tsx` Android Fabric focus stability fix; 33 test suites, 114 tests passing with 0 TS errors and 0 lint warnings; expo-doctor 20/20 checks passed). Ready for Phase 7 authorization.

## Phase 7 — Meetings, minutes, decisions
Meeting schedule/agenda, minutes, decision history, action-item conversion. Availability polls only if approved.
**Gate:** `VERIFIED` (Phase 7 migration `20261031010000_meetings_and_decisions.sql` with `meetings`, `meeting_action_items`, `decisions`, cross-project integrity triggers, `protect_decision_history` immutability trigger, idempotent `convert_action_item_to_task` RPC, and strict RLS; `meetingsService` with UTC/ISO timezone parsing, time-range validation, optional non-evaluative attendance, and idempotent action-item-to-task conversion; `decisionsService` with `validateDecisionMutation`, `linkDecisionLineage`, and `supersedeDecision` preserving accepted decisions; `app/projects/[id]/meetings/index.tsx` and `app/projects/[id]/decisions.tsx` screens; Project Overview and Home Dashboard integration; 38 test suites, 142 tests passing with 0 TS errors and 0 lint warnings; expo-doctor 20/20 checks passed). Ready for Phase 8 authorization.

## Phase 8 — Resource hub and private uploads
Categories, descriptions, external links, private upload/download, storage policies.
**Gate:** `VERIFIED` (Phase 8 migration `20261031020000_resources_and_storage.sql` with `public.resources`, private `project-resources` storage bucket with 10 MB size and MIME allowlist limits, `storage_object_project_id` helper, storage RLS policies for `SELECT`/`INSERT`/`DELETE` restricted to active project members, and cross-project milestone/storage-path trigger `check_resource_integrity`; `resourcesService` with `validateExternalResourceUrl`, `sanitizeStorageFileName`, `validateStoragePathProjectBoundary`, `validateFileUploadConstraints`, and `createSignedDownloadUrl`; Resource Hub screen `app/projects/[id]/resources.tsx` and Project Overview integration; 41 test suites, 163 tests passing with 0 TS errors and 0 lint warnings; expo-doctor 20/20 checks passed). Ready for Phase 9 authorization.

## Phase 9 — Activity, notifications, Team Pulse, search
Activity, preferences, reminders, check-ins, authorized search.
**Gate:** `VERIFIED` (Phase 9 migration `20261031030000_activity_notifications_pulse_search.sql` with append-only `activity_events` + `protect_activity_events_immutability` trigger, `notification_preferences` with default `minimize_lock_screen_content: true`, `notification_deliveries` with `UNIQUE (user_id, dedupe_key)` and `check_notification_recipient_membership` trigger, `team_pulse_checkins` with weekly uniqueness, and strict RLS; `notificationsService` with `isNotificationCategoryEnabled`, `buildNotificationDedupeKey`, `buildSafeNotificationPayload`, and `evaluateNotificationCandidate`; `pulseService` with UTC Monday `getWeekStartDateIso` and non-ranking `summarizeTeamPulse`; `searchService` with cross-project isolated `filterAuthorizedSearchResults`; updated `app/(tabs)/activity.tsx`, `app/(tabs)/profile.tsx`, `app/projects/[id]/index.tsx`, and new `app/projects/[id]/pulse.tsx`; 46 test suites, 178 tests passing with 0 TS errors and 0 lint warnings. Note: live external push provider delivery tests are `BLOCKED` when push provider credentials are not configured). Ready for Phase 10 authorization.

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
