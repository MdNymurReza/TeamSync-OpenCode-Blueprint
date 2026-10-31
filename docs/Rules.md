# MelBond — Mandatory Engineering Rules

## Scope and phase control
1. Follow `PRD.md`; do not silently expand MVP.
2. AI, supervisor portal, web dashboard, recurring tasks, and advanced integrations are post-MVP unless approved.
3. Work on exactly one phase at a time.
4. Never start the next phase without explicit user authorization.
5. A phase is `VERIFIED` only when its gate checks pass with evidence.
6. If a check cannot run, mark `BLOCKED` or `READY_FOR_REVIEW` and explain.
7. Update `LOG.md`, `Memory.md`, and `Phases.md` at every phase boundary.

## Repository discipline
8. Inspect git status before editing and preserve user work.
9. Do not run destructive commands/reset branches without approval.
10. Avoid unrelated refactors and unnecessary dependency churn.
11. Review diffs for secrets, generated junk, unrelated changes, and accidental data loss.
12. Do not commit unless asked.

## Security
13. Every user-accessible project table needs RLS and appropriately scoped grants.
14. Frontend guards are not authorization.
15. Never expose service-role keys or privileged secrets in client bundles.
16. Enforce membership and roles in trusted database/server logic.
17. Validate untrusted inputs at trusted boundaries.
18. Keep uploads private and enforce Storage access policies.
19. Invitations need high entropy, expiry, revocation, replay protection, and race-safe redemption.
20. Test cross-project/IDOR access, not only happy paths.
21. Never log credentials, session tokens, invitation tokens, or unnecessary private content.
22. Re-check access before sending notifications or exposing file URLs.
23. Decide deletion/cascade behavior before migrations.

## Code and UX
24. TypeScript strict mode and explicit domain types.
25. Keep business rules out of presentation components.
26. Use schema validation at appropriate boundaries.
27. Use stable query keys and clear user-scoped cache on sign-out/account switch.
28. Avoid `any` unless justified and localized.
29. Check Expo SDK compatibility before adding packages.
30. No fake production data, dead buttons, or false success states.
31. Provide loading, empty, error, retry, and success states for important flows.
32. Preserve user input after recoverable errors.
33. Use accessible labels, touch targets, text scaling, and contrast.
34. Do not rely on color alone for status.

## Verification
35. Run focused tests and broader relevant checks.
36. Inspect command output; report skips and failures honestly.
37. Record exact commands and pass/fail/skip counts.
38. Never claim hosted backend, push, build, or device tests unless performed.
39. Documentation must describe actual behavior, not intentions.
40. Finish with a phase report and stop.
