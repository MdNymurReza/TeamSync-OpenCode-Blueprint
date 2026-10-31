import {
  buildNotificationDedupeKey,
  buildSafeNotificationPayload,
  DEFAULT_NOTIFICATION_PREFERENCES,
  evaluateNotificationCandidate,
  isNotificationCategoryEnabled,
} from '@/features/notifications';

describe('notificationsService (Phase 9)', () => {
  it('checks category preferences accurately', () => {
    expect(
      isNotificationCategoryEnabled(DEFAULT_NOTIFICATION_PREFERENCES, 'task_assignment')
    ).toBe(true);
    expect(
      isNotificationCategoryEnabled(
        { ...DEFAULT_NOTIFICATION_PREFERENCES, task_assignments: false },
        'task_assignment'
      )
    ).toBe(false);
    expect(
      isNotificationCategoryEnabled(
        { ...DEFAULT_NOTIFICATION_PREFERENCES, team_pulse_reminders: false },
        'pulse_reminder'
      )
    ).toBe(false);
  });

  it('builds deterministic dedupe keys', () => {
    const key = buildNotificationDedupeKey({
      category: 'deadline_reminder',
      projectId: 'proj-1',
      entityId: 'task-9',
      windowKey: '2026-11-01',
    });
    expect(key).toBe('deadline_reminder:proj-1:task-9:2026-11-01');
  });

  it('redacts sensitive body content when minimizeLockScreenContent is enabled', () => {
    const redacted = buildSafeNotificationPayload({
      category: 'mention',
      projectName: 'Capstone Rover',
      title: 'Mentioned in Secret API Audit',
      sensitiveBody: 'Alice: Check the staging token rotation notes',
      genericBody: 'Open MelBond to view this mention.',
      minimizeLockScreenContent: true,
    });
    expect(redacted.title).toBe('MelBond Workspace Update');
    expect(redacted.body).toBe('Open MelBond to view this mention.');

    const full = buildSafeNotificationPayload({
      category: 'mention',
      projectName: 'Capstone Rover',
      title: 'Mentioned in Secret API Audit',
      sensitiveBody: 'Alice: Check the staging token rotation notes',
      genericBody: 'Open MelBond to view this mention.',
      minimizeLockScreenContent: false,
    });
    expect(full.title).toBe('Mentioned in Secret API Audit');
    expect(full.body).toBe('Alice: Check the staging token rotation notes');
  });

  it('blocks notification delivery when recipient is not an active project member', () => {
    const decision = evaluateNotificationCandidate({
      candidate: {
        user_id: 'user-1',
        project_id: 'proj-unauth',
        projectName: 'Secret Lab',
        category: 'task_assignment',
        dedupe_key: 'task_assignment:proj-unauth:t-1:once',
        title: 'New task assigned',
        sensitiveBody: 'Confidential task title',
      },
      preferences: DEFAULT_NOTIFICATION_PREFERENCES,
      authorizedProjectIds: new Set(['proj-1']),
      deliveredDedupeKeys: new Set(),
    });

    expect(decision).toEqual({
      shouldDeliver: false,
      reason: 'unauthorized_project',
      payload: null,
    });
  });

  it('blocks duplicate notifications with the same dedupe_key and honors disabled preferences', () => {
    const disabledDecision = evaluateNotificationCandidate({
      candidate: {
        user_id: 'user-1',
        project_id: 'proj-1',
        projectName: 'Capstone Rover',
        category: 'pulse_reminder',
        dedupe_key: 'pulse_reminder:proj-1:w-1:2026-10-26',
        title: 'Weekly Team Pulse',
        sensitiveBody: 'Share your weekly check-in',
      },
      preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES, team_pulse_reminders: false },
      authorizedProjectIds: new Set(['proj-1']),
      deliveredDedupeKeys: new Set(),
    });
    expect(disabledDecision).toEqual({
      shouldDeliver: false,
      reason: 'preference_disabled',
      payload: null,
    });

    const duplicateDecision = evaluateNotificationCandidate({
      candidate: {
        user_id: 'user-1',
        project_id: 'proj-1',
        projectName: 'Capstone Rover',
        category: 'deadline_reminder',
        dedupe_key: 'deadline_reminder:proj-1:t-1:2026-11-01',
        title: 'Task due soon',
        sensitiveBody: 'Submit final slides',
      },
      preferences: DEFAULT_NOTIFICATION_PREFERENCES,
      authorizedProjectIds: new Set(['proj-1']),
      deliveredDedupeKeys: new Set(['deadline_reminder:proj-1:t-1:2026-11-01']),
    });

    expect(duplicateDecision).toEqual({
      shouldDeliver: false,
      reason: 'duplicate_dedupe_key',
      payload: null,
    });
  });
});
