# Agent Instructions — TeamSync

Read `PRD.md`, `docs/Architecture.md`, `docs/Design.md`, `docs/Rules.md`, `docs/Phases.md`, `docs/Memory.md`, and the latest `docs/LOG.md` before coding.

## Mandatory workflow
1. Inspect repository, git status, existing architecture, runtime, and available tools. Preserve user changes.
2. Work on exactly one explicitly authorized phase.
3. Verify prerequisites/gates before starting.
4. State scope, expected files, risks, and checks before implementation.
5. Implement only in-scope changes; ask when a security, data-loss, or product decision is ambiguous.
6. Add/update tests and documentation.
7. Run focused tests, then relevant broader checks; inspect outputs.
8. Review authorization, privacy, accessibility, error states, and regressions.
9. Inspect `git diff` for secrets, generated junk, unrelated changes, or data loss.
10. Update `docs/Memory.md`, `docs/Phases.md`, and append to `docs/LOG.md`.
11. Provide a phase report with exact commands, results, limitations, and gate.
12. Stop. Never begin the next phase until the user explicitly authorizes it.

Gate states: `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `READY_FOR_REVIEW`, `VERIFIED`. Use `VERIFIED` only if required checks pass and evidence is recorded. If checks cannot run, mark blocked/review and explain why.

## Security
- Never put service-role keys or privileged secrets in the mobile client.
- Client guards are UX only; use RLS and trusted server-side checks.
- Test anonymous, non-member, member, admin, owner, and cross-project cases as applicable.
- Treat uploads and external URLs as untrusted.
- Never log session/invitation tokens or unnecessary private content.
- Use least privilege and re-check access before notification delivery or file access.

## Quality
- TypeScript strict mode; explicit domain types.
- Keep domain logic separate from UI.
- Validate untrusted input at trusted boundaries.
- Add loading, empty, success, failure, and retry states.
- Accessible labels, touch targets, text scaling, and contrast.
- Avoid unnecessary dependencies and dead controls.
- Never claim a test/build/device check passed unless actually run and inspected.
- Do not commit unless requested. Never run destructive commands without permission.
