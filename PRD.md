# MelBond — Product Requirements Document

**Platform:** Android-first  
**Audience:** University student teams  
**Initial team size:** 3–6 members  
**Use cases:** Course assignments, semester projects, research projects, FYDP  
**Principle:** One project, one organized workspace.

## 1. Problem
Students coordinate group work across messaging apps, shared drives, spreadsheets, calendars, and personal notes. Responsibilities become unclear, decisions are hard to trace, and deadlines are missed. MelBond centralizes project planning and execution.

## 2. Goals
1. Centralize tasks, deadlines, milestones, meetings, decisions, and resources.
2. Make task ownership, upcoming responsibilities, and blockers visible.
3. Support academic workflows through customizable templates.
4. Show progress without unhealthy rankings.
5. Provide a simple mobile-first experience.

### MVP non-goals
- Recruiting teammates.
- Replacing WhatsApp, Discord, Drive, or GitHub.
- Automatic AI project generation.
- University administration or grading.
- Surveillance, attendance enforcement, or member performance scoring.
- AI content that silently changes project records.

## 3. Roles
**Project Owner:** creates project, invites members, configures settings, manages membership, archives/deletes project.  
**Project Admin:** manages tasks, milestones, meetings, and resources within granted permissions; cannot perform owner-only actions unless explicitly allowed.  
**Team Member:** views workspace and updates records according to permissions; participates in meetings and decisions, adds resources, reports blockers.  
**Supervisor (future):** optional, explicitly invited, limited to selected information; no default access to private team content.

## 4. Functional requirements

### FR-01 Authentication and onboarding
- Secure sign-up, sign-in, sign-out, and session restoration.
- Profile: display name, avatar, department, optional academic details.
- Secure invitations and redemption.
- Project leaving rules preserve ownership and integrity.
- Account deletion follows a documented retention policy.

### FR-02 Project creation
- Multiple independent projects per user.
- Required: name, type, owner, workflow template.
- Optional: description, department, course code, semester, start/deadline, supervisor details.
- Projects can be archived.
- Each project has independent membership and authorization boundaries.

### FR-03 Customizable playbooks
- Templates for course assignment, software project, research, and FYDP.
- Templates provide default phases, milestones, suggested task categories.
- Teams can rename, reorder, add, and remove phases.
- Templates do not impose a mandatory academic process.
- Phase changes must not silently delete existing tasks.
- Template changes affect only the selected project.

### FR-04 Task management
Each task has title, description, one primary assignee, optional collaborators, status (`todo`, `in_progress`, `in_review`, `done`), priority (`low`, `medium`, `high`, `urgent`), optional dates, optional phase/milestone links, checklist, comments, creator/updater metadata.
- Filter by assignee, status, priority, phase, and due date.
- Done tasks can be reopened.
- Overdue tasks remain visible until resolved or rescheduled.
- Validate transitions and membership references at trusted boundaries.

### FR-05 Milestones and timeline
- Create milestones with target dates and descriptions; link tasks.
- Show completed, upcoming, overdue milestones.
- Calculate progress from associated tasks when configured.
- Allow manual status updates with clearly defined interaction with calculated progress.
- Highlight deadline risks without silently changing ownership or phases.

### FR-06 Meetings and minutes
- Meeting date/time, location/link, agenda.
- Availability polls for suitable times.
- Optional attendance; never use attendance as productivity evidence.
- Save minutes and decisions.
- Convert action items to assigned tasks.
- Notify relevant members of upcoming meetings.

### FR-07 Decision log
- Title, description, date, author, context/reason, optional linked task/meeting/resource.
- Status: `proposed`, `accepted`, `rejected`, `superseded`.
- Preserve accepted decisions and trace corrections/replacements.

### FR-08 Resource hub
- Organize links/files by research, datasets, design, code, reports, presentations, or custom categories.
- Descriptions and optional milestone links.
- Private storage and access controls for uploads.
- External Drive/GitHub links; do not recreate document platforms.

### FR-09 Notifications and activity
- Assignment, relevant task update, mention, and deadline/meeting notifications.
- Chronological project activity.
- Configurable non-essential notifications; avoid duplicate/excessive reminders.
- Never notify unauthorized users about private content.
- Use server-side scheduling where reliable reminders require it.
- Document Android OS/network delivery limitations.

### FR-10 Dashboard
Show project/current phase, overall task progress, upcoming milestones/deadlines, overdue/blocked tasks, next meeting, recent decisions/activity, and current user's assigned tasks. Prioritize actionable information over decorative charts.

### FR-11 Team Pulse
- Optional weekly states: `on_track`, `needs_support`, `blocked`.
- Optional blocker details and follow-up summary.
- Self-reports are not verified productivity measures.
- No automatic member ranking.

### FR-12 Search and filtering
- Search projects, tasks, milestones, decisions, resources.
- Relevant filters.
- Results must be restricted to content the user may access; do not leak private project existence.

## 5. Primary journey
Sign up → create project/template → invite 3–5 teammates → customize phases → assign tasks/deadlines → record meetings/decisions/resources → update progress/blockers → act on dashboard alerts → final checklist and archive.

## 6. MVP acceptance criteria
- Account creation and session restoration work.
- Project creation and secure invitations work.
- Invitees can join only the intended project; invitation abuse is prevented.
- Anonymous and unauthorized users cannot access private data.
- Members can create, assign, update, complete, and reopen tasks within permissions.
- Deadline/overdue and timezone behavior is correct and documented.
- Starter workflow can be safely customized.
- Meetings/minutes, decisions, and resources can be stored/retrieved.
- Dashboard matches authoritative records.
- Notifications work under supported Android conditions and failures are handled.
- Owners can remove members and archive projects.
- Destructive actions, RLS, uploads, and critical errors are tested.
- Important screens have loading, empty, success, and retryable error states.
- No test is falsely reported as passed.

## 7. Non-functional requirements
**Security:** enforce membership/roles server-side and with RLS; keep secrets server-side; validate inputs; private files by default; high-entropy, expiring, revocable invitations; least privilege.  
**Performance:** responsive common operations; pagination; efficient dashboard queries and indexes.  
**Reliability:** recoverable network errors, duplicate-write protection where practical, visible loading/empty/success/error states, no silent input loss.  
**Accessibility:** readable typography, contrast, screen-reader labels, adequate touch targets, scalable text, no color-only status.  
**Privacy:** collect only necessary data; no public project search; account/project deletion flows; explain member/supervisor visibility; minimize lock-screen notification content.

## 8. Success metrics
Project creation completion, invite acceptance, projects with assigned tasks, weekly active teams, on-time task completion interpreted in context, minutes that produce follow-up tasks, 7/30-day retention, and user-reported reduction in organization difficulties. Task counts alone do not measure contribution or quality.

## 9. Post-MVP
Phase 2: saved views, calendar integration, file previews/version references, recurring tasks.  
Phase 3: supervisor portal, advanced templates, report/presentation checklists, exports.  
Phase 4: reviewable AI meeting summaries/action-item drafts/status reports/risk summaries, optional web dashboard. AI must never silently modify project records.

## 10. Definition of Done
A feature is complete only when normal/error workflows work, authorization is tested, mobile UI is accessible/responsive, loading/empty/failure states exist, relevant automated tests pass, and behavior/limitations are documented with evidence in `docs/LOG.md`.
