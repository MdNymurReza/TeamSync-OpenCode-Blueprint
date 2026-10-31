# MelBond — OpenCode Development Blueprint

Android-first workspace for university student teams. This package provides documentation and phase-gated OpenCode prompts; it does not claim the app is implemented.

## Recommended stack
- React Native + Expo + TypeScript
- Expo Router
- Supabase Auth, PostgreSQL, Row Level Security (RLS), private Storage
- Supabase Edge Functions and scheduled jobs for trusted server-side work
- TanStack Query; React Hook Form + Zod
- Expo Notifications; EAS Build
- React Native Testing Library and a test runner compatible with the chosen Expo SDK

Check package compatibility with the selected Expo SDK before installing dependencies.

## Start
1. Extract this folder and open it in OpenCode.
2. Read `AGENTS.md`, `PRD.md`, and `docs/Rules.md`.
3. Run `prompts/00-bootstrap.md`.
4. Review architecture decisions and phase gates.
5. Run one phase prompt at a time, in order.
6. Do not advance until the current phase gate is verified and you explicitly authorize the next phase.

## Source of truth
- `PRD.md`: product requirements
- `docs/Architecture.md`: system design and security boundaries
- `docs/Design.md`: UX and design system
- `docs/Rules.md`: mandatory engineering rules
- `docs/Memory.md`: durable decisions and current state
- `docs/Phases.md`: ordered implementation plan
- `docs/LOG.md`: chronological development record
- `AGENTS.md`: instructions for coding agents
