import {
  computeMilestoneState,
  milestonesService,
  reconcileDashboardSummary,
  Milestone,
} from '@/features/milestones';
import { TaskWithDetails } from '@/features/tasks';
import { ProjectWithRole } from '@/features/projects';
import { Task } from '@/types/database';
import { supabase } from '@/lib/supabase/client';

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

const mockNowIso = '2026-10-31T10:00:00.000Z';

function makeMilestone(overrides: Partial<Milestone> = {}): Milestone {
  return {
    id: 'ms-1',
    project_id: 'proj-1',
    phase_id: null,
    title: 'Design Freeze',
    description: 'Finalize UI wireframes and database schema',
    target_date: '2026-11-10T00:00:00.000Z',
    status: 'upcoming',
    progress_mode: 'auto',
    manual_progress: 0,
    sequence_order: 0,
    created_by: 'user-1',
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    project_id: 'proj-1',
    phase_id: null,
    milestone_id: 'ms-1',
    title: 'Write schema SQL',
    description: null,
    status: 'todo',
    priority: 'medium',
    due_date: '2026-11-05T00:00:00.000Z',
    start_date: null,
    primary_assignee_id: 'user-1',
    created_by: 'user-1',
    updated_by: null,
    is_archived: false,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('milestonesService domain calculations', () => {
  describe('computeMilestoneState', () => {
    it('calculates auto progress from active linked tasks and excludes archived tasks', () => {
      const milestone = makeMilestone({ progress_mode: 'auto', status: 'upcoming' });
      const linkedTasks: Task[] = [
        makeTask({ id: 't1', status: 'done', is_archived: false }),
        makeTask({ id: 't2', status: 'in_progress', is_archived: false }),
        makeTask({ id: 't3', status: 'done', is_archived: true }), // archived — ignored
      ];

      const result = computeMilestoneState(milestone, linkedTasks, mockNowIso);

      expect(result.totalTasks).toBe(2);
      expect(result.completedTasks).toBe(1);
      expect(result.progressPercent).toBe(50);
      expect(result.effectiveStatus).toBe('in_progress');
      expect(result.isOverdue).toBe(false);
    });

    it('marks auto milestone as completed when all linked tasks are done', () => {
      const milestone = makeMilestone({ progress_mode: 'auto', status: 'in_progress' });
      const linkedTasks: Task[] = [
        makeTask({ id: 't1', status: 'done' }),
        makeTask({ id: 't2', status: 'done' }),
      ];

      const result = computeMilestoneState(milestone, linkedTasks, mockNowIso);

      expect(result.progressPercent).toBe(100);
      expect(result.effectiveStatus).toBe('completed');
      expect(result.isOverdue).toBe(false);
    });

    it('uses manual_progress when progress_mode is manual and respects manual completed status', () => {
      const manualInProgress = makeMilestone({
        progress_mode: 'manual',
        manual_progress: 75,
        status: 'in_progress',
      });
      const res1 = computeMilestoneState(manualInProgress, [], mockNowIso);
      expect(res1.progressPercent).toBe(75);
      expect(res1.effectiveStatus).toBe('in_progress');

      const manualCompleted = makeMilestone({
        progress_mode: 'manual',
        manual_progress: 40,
        status: 'completed',
      });
      const res2 = computeMilestoneState(manualCompleted, [], mockNowIso);
      expect(res2.progressPercent).toBe(100);
      expect(res2.effectiveStatus).toBe('completed');
    });

    it('detects overdue milestones and 7-day deadline risk accurately', () => {
      const overdueMilestone = makeMilestone({
        target_date: '2026-10-25T00:00:00.000Z',
        status: 'in_progress',
      });
      const overdueRes = computeMilestoneState(overdueMilestone, [], mockNowIso);
      expect(overdueRes.isOverdue).toBe(true);
      expect(overdueRes.effectiveStatus).toBe('overdue');
      expect(overdueRes.hasDeadlineRisk).toBe(true);

      const riskMilestone = makeMilestone({
        target_date: '2026-11-03T00:00:00.000Z', // 3 days away, < 80%
        progress_mode: 'manual',
        manual_progress: 50,
      });
      const riskRes = computeMilestoneState(riskMilestone, [], mockNowIso);
      expect(riskRes.isOverdue).toBe(false);
      expect(riskRes.hasDeadlineRisk).toBe(true);
    });
  });

  describe('reconcileDashboardSummary', () => {
    it('reconciles authoritative counts, progress, assigned tasks, overdue tasks, and upcoming milestones', () => {
      const projects: ProjectWithRole[] = [
        {
          id: 'proj-1',
          name: 'Capstone AI',
          description: null,
          course_code: 'CS499',
          semester: 'Fall 2026',
          project_type: 'fyp_capstone',
          target_date: null,
          is_archived: false,
          created_by: 'user-1',
          created_at: '2026-10-01T00:00:00Z',
          updated_at: '2026-10-01T00:00:00Z',
          currentUserRole: 'owner',
        },
        {
          id: 'proj-archived',
          name: 'Old Project',
          description: null,
          course_code: null,
          semester: null,
          project_type: 'course_assignment',
          target_date: null,
          is_archived: true,
          created_by: 'user-1',
          created_at: '2026-09-01T00:00:00Z',
          updated_at: '2026-09-01T00:00:00Z',
          currentUserRole: 'owner',
        },
      ];

      const tasks: TaskWithDetails[] = [
        {
          ...makeTask({
            id: 't-done',
            project_id: 'proj-1',
            status: 'done',
            primary_assignee_id: 'user-1',
          }),
          primary_assignee: null,
          phase: null,
          collaborators: [],
          checklist_total: 0,
          checklist_completed: 0,
          comments_count: 0,
        },
        {
          ...makeTask({
            id: 't-overdue',
            project_id: 'proj-1',
            title: 'Overdue Literature Review',
            status: 'in_progress',
            due_date: '2026-10-20T00:00:00.000Z',
            primary_assignee_id: 'user-1',
          }),
          primary_assignee: null,
          phase: null,
          collaborators: [],
          checklist_total: 0,
          checklist_completed: 0,
          comments_count: 0,
        },
      ];

      const rawMilestone = makeMilestone({
        id: 'ms-1',
        project_id: 'proj-1',
        title: 'Midterm Demo',
        target_date: '2026-11-02T00:00:00.000Z',
      });
      const msComputed = computeMilestoneState(rawMilestone, tasks, mockNowIso);

      const summary = reconcileDashboardSummary({
        projects,
        tasksByProject: { 'proj-1': tasks },
        milestonesByProject: {
          'proj-1': [{ ...rawMilestone, linkedTasks: tasks, ...msComputed }],
        },
        currentUserId: 'user-1',
        nowIso: mockNowIso,
      });

      expect(summary.activeProjectCount).toBe(1);
      expect(summary.totalTasksCount).toBe(2);
      expect(summary.completedTasksCount).toBe(1);
      expect(summary.overallTaskProgressPercent).toBe(50);
      expect(summary.overdueTasks).toHaveLength(1);
      expect(summary.myAssignedTasks).toHaveLength(1);
      expect(summary.myAssignedTasks[0]?.title).toBe('Overdue Literature Review');
      expect(summary.myAssignedTasks[0]?.projectName).toBe('Capstone AI');
      expect(summary.upcomingMilestones).toHaveLength(1);
      expect(summary.upcomingMilestones[0]?.title).toBe('Midterm Demo');
      expect(summary.upcomingMilestones[0]?.hasDeadlineRisk).toBe(true);
      expect(summary.teammateWorkloads).toHaveLength(1);
      expect(summary.teammateWorkloads?.[0]?.userId).toBe('user-1');
      expect(summary.teammateWorkloads?.[0]?.completedTasks).toBe(1);
      expect(summary.teammateWorkloads?.[0]?.activeWorkloadTasks).toBe(1);
      expect(summary.teammateWorkloads?.[0]?.completionPercent).toBe(50);
    });
  });

  describe('milestonesService CRUD methods', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('rejects createMilestone when user is not signed in', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const res = await milestonesService.createMilestone('proj-1', {
        title: 'Beta Release',
      });
      expect(res.data).toBeNull();
      expect(res.error?.message).toBe('You must be signed in to create a milestone');
    });

    it('creates a milestone with trimmed fields and computed initial state', async () => {
      const createdRow = makeMilestone({ title: 'Beta Release', sequence_order: 2 });

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: createdRow, error: null }),
          }),
        }),
      });

      const res = await milestonesService.createMilestone('proj-1', {
        title: '  Beta Release  ',
        progress_mode: 'auto',
      });

      expect(res.error).toBeNull();
      expect(res.data?.title).toBe('Beta Release');
      expect(res.data?.sequence_order).toBe(2);
      expect(res.data?.progressPercent).toBe(0);
    });
  });
});
