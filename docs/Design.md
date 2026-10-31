# MelBond — Design System and UX

## Product feel
Calm, focused, credible student productivity tool—not a generic AI dashboard. Use clear hierarchy, meaningful whitespace, concise labels, and purposeful interactions.

## Principles
- Action first: show urgent work and next steps.
- Keep project context visible inside project navigation.
- Common task updates should take few taps.
- Explain sync, permission failures, and destructive consequences.
- No shame-based rankings or public contribution scores.
- Screen-reader support, scalable text, contrast, and large touch targets.
- Distinguish user-reported blockers from system-detected overdue tasks.

## Navigation
Global destinations: Home, Projects, Activity, Profile/Settings. Inside a project: Overview, Tasks, Timeline/Milestones, Meetings, Decisions, Resources, Team/Pulse, Settings (owner/admin). Keep global navigation compact; do not put every feature in the bottom bar.

## Main screens
Welcome/auth/reset password; profile onboarding; home; project create/template selection; invite/join; project overview; task list/detail/edit; phase editor; milestone timeline; meetings/polls/minutes; decisions; resource hub/upload; Team Pulse; search; notification preferences; membership management; archive/delete confirmations.

## Visual direction
Use a neutral surface palette and one restrained brand accent (e.g. indigo/blue or teal). Define centralized tokens after checking contrast and Android appearance. Statuses use text + icon + color, never color alone. Minimal elevation; avoid nested cards and decorative charts.

Typography: legible platform-appropriate sans-serif, consistent screen/section/body/metadata scale, respect Android font scaling. Use an 8-point spacing rhythm where practical.

## Components
Primary/secondary/text/destructive buttons; fields and date/time inputs; labeled status badges; task row/card; accessible member avatar stack; progress component with text alternative; filter chips; empty state with next action; loading state; inline error/retry; destructive confirmation; activity item; meeting/decision/resource item; snackbar for transient success.

## Interaction
- Disable/show loading during submission to avoid duplicates.
- Preserve form input after recoverable failures.
- Confirm destructive actions.
- Never make swipe the only way to act.
- Optimistic updates only with rollback strategy.
- Explain stale/sync state where it matters.
- Ask notification permission contextually, with rationale.

## Required states
Initial loading, empty first use, empty filtered result, success, offline/timeout, permission denied, expired session, validation failure, partial/retryable failure, archived/deleted record.

## Accessibility checks
Touch targets, contrast, icon-only labels, screen-reader progress/status, large fonts, logical focus order. Do not convey status solely by red/yellow/green.

## Design acceptance
Consistent components; no dead buttons; no fabricated data/charts; clear form validation; destructive actions guarded; all major states designed; real emulator/device review before marking phase verified.
