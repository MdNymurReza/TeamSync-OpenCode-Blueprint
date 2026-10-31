import { supabase } from '@/lib/supabase/client';
import type {
  Milestone,
  MilestoneUpdate,
  ProjectPhase,
  Task,
  TaskPriority,
} from '@/types/database';
import { projectsService, type ProjectWithRole } from '@/features/projects';
import { tasksService, type TaskWithDetails } from '@/features/tasks';
import { meetingsService, type MeetingWithDetails } from '@/features/meetings';
import { decisionsService, type DecisionWithDetails } from '@/features/decisions';
import type {
  CreateMilestoneInput,
  DashboardDecisionItem,
  DashboardMeetingItem,
  DashboardMilestoneItem,
  DashboardSummary,
  DashboardTaskItem,
  MilestoneComputedState,
  MilestoneEffectiveStatus,
  MilestoneTimelineFilter,
  MilestoneWithDetails,
  UpdateMilestoneInput,
} from './types';

interface MilestoneRowWithRelations extends Milestone {
  phase?: ProjectPhase | null;
  tasks?: Task[];
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Pure domain calculation for a milestone's progress, effective status,
 * overdue state, and deadline risk from linked tasks and manual overrides.
 *
 * Rules (PRD FR-05):
 * - Linked archived tasks are excluded from progress counts.
 * - If manual `status === 'completed'`, progress is 100% and effectiveStatus is `'completed'`.
 * - If `progress_mode === 'auto'` and there is at least 1 active linked task:
 *   progressPercent = round(completedTasks / totalTasks * 100).
 *   When all linked tasks are done, effectiveStatus becomes `'completed'`.
 * - Otherwise (`progress_mode === 'manual'` or 0 linked tasks):
 *   progressPercent = clamped `manual_progress` (0..100).
 * - If not completed and `target_date < nowIso`, effectiveStatus is `'overdue'`.
 * - Deadline risk is true when not completed and either overdue OR target_date is
 *   within 7 days while progressPercent < 80%.
 */
export function computeMilestoneState(
  milestone: Pick<
    Milestone,
    'status' | 'progress_mode' | 'manual_progress' | 'target_date'
  >,
  linkedTasks: Pick<Task, 'status' | 'is_archived'>[] = [],
  nowIso: string = new Date().toISOString()
): MilestoneComputedState {
  const activeTasks = linkedTasks.filter((t) => !t.is_archived);
  const totalTasks = activeTasks.length;
  const completedTasks = activeTasks.filter((t) => t.status === 'done').length;

  const clampedManual = Math.min(100, Math.max(0, Math.round(milestone.manual_progress ?? 0)));

  let progressPercent: number;
  if (milestone.status === 'completed') {
    progressPercent = 100;
  } else if (milestone.progress_mode === 'auto' && totalTasks > 0) {
    progressPercent = Math.round((completedTasks / totalTasks) * 100);
  } else {
    progressPercent = clampedManual;
  }

  const autoCompleted =
    milestone.progress_mode === 'auto' && totalTasks > 0 && completedTasks === totalTasks;
  const isCompleted = milestone.status === 'completed' || autoCompleted;

  let effectiveStatus: MilestoneEffectiveStatus;
  if (isCompleted) {
    effectiveStatus = 'completed';
  } else if (milestone.target_date && milestone.target_date < nowIso) {
    effectiveStatus = 'overdue';
  } else if (milestone.status === 'in_progress' || progressPercent > 0) {
    effectiveStatus = 'in_progress';
  } else {
    effectiveStatus = 'upcoming';
  }

  const isOverdue = effectiveStatus === 'overdue';

  let hasDeadlineRisk = false;
  if (!isCompleted && milestone.target_date) {
    if (isOverdue) {
      hasDeadlineRisk = true;
    } else {
      const nowMs = new Date(nowIso).getTime();
      const targetMs = new Date(milestone.target_date).getTime();
      if (!isNaN(nowMs) && !isNaN(targetMs)) {
        const msUntilTarget = targetMs - nowMs;
        if (msUntilTarget <= SEVEN_DAYS_MS && progressPercent < 80) {
          hasDeadlineRisk = true;
        }
      }
    }
  }

  return {
    totalTasks,
    completedTasks,
    progressPercent,
    effectiveStatus,
    isOverdue,
    hasDeadlineRisk,
  };
}

/**
 * Pure reconciliation of dashboard metrics from authoritative workspace, task,
 * and milestone records (PRD FR-10).
 */
export function reconcileDashboardSummary(params: {
  projects: ProjectWithRole[];
  tasksByProject: Record<string, TaskWithDetails[]>;
  milestonesByProject: Record<string, MilestoneWithDetails[]>;
  meetingsByProject?: Record<string, MeetingWithDetails[]>;
  decisionsByProject?: Record<string, DecisionWithDetails[]>;
  currentUserId?: string | null;
  nowIso?: string;
}): DashboardSummary {
  const {
    projects,
    tasksByProject,
    milestonesByProject,
    meetingsByProject = {},
    decisionsByProject = {},
    currentUserId,
    nowIso = new Date().toISOString(),
  } = params;

  const activeProjects = projects.filter((p) => !p.is_archived);
  const activeProjectCount = activeProjects.length;

  let totalTasksCount = 0;
  let completedTasksCount = 0;
  const myAssignedTasks: DashboardTaskItem[] = [];
  const overdueTasks: DashboardTaskItem[] = [];
  const upcomingMilestones: DashboardMilestoneItem[] = [];
  const upcomingMeetings: DashboardMeetingItem[] = [];
  const recentDecisions: DashboardDecisionItem[] = [];

  for (const project of activeProjects) {
    const projectTasks = (tasksByProject[project.id] ?? []).filter((t) => !t.is_archived);
    for (const task of projectTasks) {
      totalTasksCount += 1;
      const isDone = task.status === 'done';
      if (isDone) {
        completedTasksCount += 1;
      }

      const isOverdue = Boolean(task.due_date && task.due_date < nowIso && !isDone);
      const dashboardTask: DashboardTaskItem = {
        ...task,
        projectName: project.name,
        isOverdue,
      };

      if (isOverdue) {
        overdueTasks.push(dashboardTask);
      }

      if (currentUserId && task.primary_assignee_id === currentUserId && !isDone) {
        myAssignedTasks.push(dashboardTask);
      }
    }

    const projectMilestones = milestonesByProject[project.id] ?? [];
    for (const ms of projectMilestones) {
      if (ms.effectiveStatus !== 'completed') {
        upcomingMilestones.push({
          ...ms,
          projectName: project.name,
        });
      }
    }

    const projectMeetings = meetingsByProject[project.id] ?? [];
    for (const mtg of projectMeetings) {
      if (mtg.status === 'scheduled' && mtg.starts_at >= nowIso) {
        upcomingMeetings.push({
          ...mtg,
          projectName: project.name,
        });
      }
    }

    const projectDecisions = decisionsByProject[project.id] ?? [];
    for (const dec of projectDecisions) {
      if (dec.status === 'accepted' || dec.status === 'proposed') {
        recentDecisions.push({
          ...dec,
          projectName: project.name,
        });
      }
    }
  }

  // Sort assigned tasks: overdue first, then earliest due_date, then highest priority
  myAssignedTasks.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    if (a.due_date && b.due_date && a.due_date !== b.due_date) {
      return a.due_date < b.due_date ? -1 : 1;
    }
    if (a.due_date && !b.due_date) return -1;
    if (!a.due_date && b.due_date) return 1;
    return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
  });

  // Sort overdue tasks by earliest due_date
  overdueTasks.sort((a, b) => {
    if (a.due_date && b.due_date && a.due_date !== b.due_date) {
      return a.due_date < b.due_date ? -1 : 1;
    }
    return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
  });

  // Sort upcoming milestones: overdue first, then earliest target_date (nulls last)
  upcomingMilestones.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    if (a.target_date && b.target_date && a.target_date !== b.target_date) {
      return a.target_date < b.target_date ? -1 : 1;
    }
    if (a.target_date && !b.target_date) return -1;
    if (!a.target_date && b.target_date) return 1;
    return a.sequence_order - b.sequence_order;
  });

  // Sort upcoming meetings by earliest starts_at
  upcomingMeetings.sort((a, b) => (a.starts_at < b.starts_at ? -1 : 1));

  // Sort recent decisions by most recent decided_at
  recentDecisions.sort((a, b) => (a.decided_at > b.decided_at ? -1 : 1));

  const overallTaskProgressPercent =
    totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  return {
    activeProjectCount,
    totalTasksCount,
    completedTasksCount,
    overallTaskProgressPercent,
    myAssignedTasks,
    overdueTasks,
    upcomingMilestones,
    upcomingMeetings,
    recentDecisions,
  };
}

export const milestonesService = {
  /**
   * Fetches all milestones for a project, enriched with linked tasks and computed progress/status.
   */
  async fetchProjectMilestones(
    projectId: string,
    filter: MilestoneTimelineFilter = 'all',
    nowIso: string = new Date().toISOString()
  ): Promise<{ data: MilestoneWithDetails[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('milestones')
        .select(
          `
          *,
          phase:project_phases!milestones_phase_id_fkey(*),
          tasks:tasks!tasks_milestone_id_fkey(*)
        `
        )
        .eq('project_id', projectId)
        .order('target_date', { ascending: true, nullsFirst: false })
        .order('sequence_order', { ascending: true });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const rows = (data || []) as unknown as MilestoneRowWithRelations[];
      const enriched: MilestoneWithDetails[] = rows.map((row) => {
        const linkedTasks = (row.tasks || []).filter((t) => !t.is_archived);
        const computed = computeMilestoneState(row, linkedTasks, nowIso);
        return {
          ...row,
          linkedTasks,
          ...computed,
        };
      });

      if (filter === 'completed') {
        return {
          data: enriched.filter((m) => m.effectiveStatus === 'completed'),
          error: null,
        };
      }
      if (filter === 'overdue') {
        return {
          data: enriched.filter((m) => m.effectiveStatus === 'overdue'),
          error: null,
        };
      }
      if (filter === 'upcoming') {
        return {
          data: enriched.filter(
            (m) => m.effectiveStatus === 'upcoming' || m.effectiveStatus === 'in_progress'
          ),
          error: null,
        };
      }

      return { data: enriched, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch milestones';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Creates a new milestone in a project.
   */
  async createMilestone(
    projectId: string,
    input: CreateMilestoneInput
  ): Promise<{ data: MilestoneWithDetails | null; error: Error | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: new Error('You must be signed in to create a milestone') };
      }

      const clampedManual = Math.min(100, Math.max(0, Math.round(input.manual_progress ?? 0)));

      const { data, error } = await supabase
        .from('milestones')
        .insert({
          project_id: projectId,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          target_date: input.target_date || null,
          phase_id: input.phase_id || null,
          status: input.status || 'upcoming',
          progress_mode: input.progress_mode || 'auto',
          manual_progress: clampedManual,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const row = data as Milestone;
      const computed = computeMilestoneState(row, []);

      return {
        data: {
          ...row,
          linkedTasks: [],
          ...computed,
        },
        error: null,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create milestone';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Updates an existing milestone.
   */
  async updateMilestone(
    milestoneId: string,
    input: UpdateMilestoneInput
  ): Promise<{ data: Milestone | null; error: Error | null }> {
    try {
      const updates: MilestoneUpdate = {};

      if (input.title !== undefined) updates.title = input.title.trim();
      if (input.description !== undefined) updates.description = input.description?.trim() || null;
      if (input.target_date !== undefined) updates.target_date = input.target_date;
      if (input.phase_id !== undefined) updates.phase_id = input.phase_id;
      if (input.status !== undefined) updates.status = input.status;
      if (input.progress_mode !== undefined) updates.progress_mode = input.progress_mode;
      if (input.manual_progress !== undefined) {
        updates.manual_progress = Math.min(100, Math.max(0, Math.round(input.manual_progress)));
      }
      if (input.sequence_order !== undefined) updates.sequence_order = input.sequence_order;

      const { data, error } = await supabase
        .from('milestones')
        .update(updates)
        .eq('id', milestoneId)
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as Milestone, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update milestone';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Deletes a milestone permanently. Linked tasks remain intact (`ON DELETE SET NULL`).
   */
  async deleteMilestone(milestoneId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.from('milestones').delete().eq('id', milestoneId);
      if (error) {
        return { error: new Error(error.message) };
      }
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete milestone';
      return { error: new Error(message) };
    }
  },

  /**
   * Links or unlinks a task to/from a milestone.
   */
  async linkTaskToMilestone(
    taskId: string,
    milestoneId: string | null
  ): Promise<{ error: Error | null }> {
    const res = await tasksService.updateTask(taskId, { milestone_id: milestoneId });
    return { error: res.error };
  },

  /**
   * Fetches authoritative records across the user's active workspaces and reconciles
   * the Home dashboard summary.
   */
  async fetchDashboardSummary(
    currentUserId?: string | null
  ): Promise<{ data: DashboardSummary | null; error: Error | null }> {
    try {
      const { data: projects, error: projError } = await projectsService.fetchUserProjects();
      if (projError) {
        return { data: null, error: projError };
      }

      const activeProjects = (projects ?? []).filter((p) => !p.is_archived);
      const tasksByProject: Record<string, TaskWithDetails[]> = {};
      const milestonesByProject: Record<string, MilestoneWithDetails[]> = {};
      const meetingsByProject: Record<string, MeetingWithDetails[]> = {};
      const decisionsByProject: Record<string, DecisionWithDetails[]> = {};

      await Promise.all(
        activeProjects.map(async (project) => {
          const [tasksRes, milestonesRes, meetingsRes, decisionsRes] = await Promise.all([
            tasksService.fetchProjectTasks(project.id),
            this.fetchProjectMilestones(project.id),
            meetingsService?.fetchProjectMeetings
              ? meetingsService.fetchProjectMeetings(project.id)
              : Promise.resolve({ data: [] as MeetingWithDetails[], error: null }),
            decisionsService?.fetchProjectDecisions
              ? decisionsService.fetchProjectDecisions(project.id)
              : Promise.resolve({ data: [] as DecisionWithDetails[], error: null }),
          ]);
          tasksByProject[project.id] = tasksRes.data ?? [];
          milestonesByProject[project.id] = milestonesRes.data ?? [];
          meetingsByProject[project.id] = meetingsRes.data ?? [];
          decisionsByProject[project.id] = decisionsRes.data ?? [];
        })
      );

      const summary = reconcileDashboardSummary({
        projects: activeProjects,
        tasksByProject,
        milestonesByProject,
        meetingsByProject,
        decisionsByProject,
        currentUserId,
      });

      return { data: summary, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard';
      return { data: null, error: new Error(message) };
    }
  },
};

