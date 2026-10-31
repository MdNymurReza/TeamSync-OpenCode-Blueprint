import { projectsService, type ProjectWithRole } from '@/features/projects';
import { tasksService, type TaskWithDetails } from '@/features/tasks';
import { milestonesService, type MilestoneWithDetails } from '@/features/milestones';
import { decisionsService, type DecisionWithDetails } from '@/features/decisions';
import { resourcesService, type ResourceWithDetails } from '@/features/resources';
import type { SearchResultItem, SearchScope } from './types';

function matchesQuery(query: string, ...fields: (string | null | undefined)[]): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return fields.some((field) => field && field.toLowerCase().includes(normalizedQuery));
}

/**
 * Pure authorized search filter (PRD FR-12 & Security Invariant):
 * - Searches across `projects`, `tasks`, `milestones`, `decisions`, and `resources`.
 * - Strictly restricts results to `authorizedProjectIds` (derived from the user's `projects` membership list)
 *   so records from unauthorized or cross-tenant projects can NEVER leak into search results.
 */
export function filterAuthorizedSearchResults(params: {
  query: string;
  scope?: SearchScope;
  authorizedProjects: ProjectWithRole[];
  tasks?: TaskWithDetails[];
  milestones?: MilestoneWithDetails[];
  decisions?: DecisionWithDetails[];
  resources?: ResourceWithDetails[];
}): SearchResultItem[] {
  const {
    query,
    scope = 'all',
    authorizedProjects,
    tasks = [],
    milestones = [],
    decisions = [],
    resources = [],
  } = params;

  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  // Authoritative membership map: only projects in `authorizedProjects` are permitted
  const projectMap = new Map<string, ProjectWithRole>();
  for (const p of authorizedProjects) {
    projectMap.set(p.id, p);
  }

  const results: SearchResultItem[] = [];

  if (scope === 'all' || scope === 'projects') {
    for (const proj of authorizedProjects) {
      if (
        matchesQuery(
          trimmed,
          proj.name,
          proj.description,
          proj.course_code,
          proj.semester
        )
      ) {
        results.push({
          id: `project:${proj.id}`,
          entityType: 'project',
          projectId: proj.id,
          projectName: proj.name,
          title: proj.name,
          subtitle: proj.course_code
            ? `${proj.course_code} • ${proj.description ?? 'Workspace'}`
            : proj.description ?? 'Student Workspace',
          badgeLabel: 'WORKSPACE',
          route: `/projects/${proj.id}`,
        });
      }
    }
  }

  if (scope === 'all' || scope === 'tasks') {
    for (const task of tasks) {
      const proj = projectMap.get(task.project_id);
      if (!proj) continue; // Strict cross-project isolation guard
      if (matchesQuery(trimmed, task.title, task.description)) {
        results.push({
          id: `task:${task.id}`,
          entityType: 'task',
          projectId: proj.id,
          projectName: proj.name,
          title: task.title,
          subtitle: `${proj.name} • ${task.status.replace('_', ' ')}`,
          badgeLabel: 'TASK',
          route: `/projects/${proj.id}/tasks/${task.id}`,
        });
      }
    }
  }

  if (scope === 'all' || scope === 'milestones') {
    for (const ms of milestones) {
      const proj = projectMap.get(ms.project_id);
      if (!proj) continue; // Strict cross-project isolation guard
      if (matchesQuery(trimmed, ms.title, ms.description)) {
        results.push({
          id: `milestone:${ms.id}`,
          entityType: 'milestone',
          projectId: proj.id,
          projectName: proj.name,
          title: ms.title,
          subtitle: `${proj.name} • ${ms.progressPercent}% complete`,
          badgeLabel: 'MILESTONE',
          route: `/projects/${proj.id}/milestones`,
        });
      }
    }
  }

  if (scope === 'all' || scope === 'decisions') {
    for (const dec of decisions) {
      const proj = projectMap.get(dec.project_id);
      if (!proj) continue; // Strict cross-project isolation guard
      if (matchesQuery(trimmed, dec.title, dec.description, dec.context_reason)) {
        results.push({
          id: `decision:${dec.id}`,
          entityType: 'decision',
          projectId: proj.id,
          projectName: proj.name,
          title: dec.title,
          subtitle: `${proj.name} • ${dec.status.toUpperCase()}`,
          badgeLabel: 'DECISION',
          route: `/projects/${proj.id}/decisions`,
        });
      }
    }
  }

  if (scope === 'all' || scope === 'resources') {
    for (const res of resources) {
      const proj = projectMap.get(res.project_id);
      if (!proj) continue; // Strict cross-project isolation guard
      if (
        matchesQuery(
          trimmed,
          res.title,
          res.description,
          res.category,
          res.custom_category,
          res.file_name,
          res.external_url
        )
      ) {
        results.push({
          id: `resource:${res.id}`,
          entityType: 'resource',
          projectId: proj.id,
          projectName: proj.name,
          title: res.title,
          subtitle: `${proj.name} • ${res.category}`,
          badgeLabel: 'RESOURCE',
          route: `/projects/${proj.id}/resources`,
        });
      }
    }
  }

  return results;
}

export const searchService = {
  /**
   * Executes an authorized workspace search across all projects the user is an active member of.
   * Never queries or returns records outside the user's authorized project list.
   */
  async searchAuthorizedWorkspaceContent(
    query: string,
    scope: SearchScope = 'all',
    projectIdFilter?: string
  ): Promise<{ data: SearchResultItem[] | null; error: Error | null }> {
    try {
      const trimmed = query.trim();
      if (!trimmed) {
        return { data: [], error: null };
      }

      const { data: userProjects, error: projError } =
        await projectsService.fetchUserProjects();
      if (projError) {
        return { data: null, error: projError };
      }

      const authorizedProjects = (userProjects ?? []).filter((p) =>
        projectIdFilter ? p.id === projectIdFilter : true
      );

      if (authorizedProjects.length === 0) {
        return { data: [], error: null };
      }

      const allTasks: TaskWithDetails[] = [];
      const allMilestones: MilestoneWithDetails[] = [];
      const allDecisions: DecisionWithDetails[] = [];
      const allResources: ResourceWithDetails[] = [];

      await Promise.all(
        authorizedProjects.map(async (proj) => {
          const [tRes, mRes, dRes, rRes] = await Promise.all([
            scope === 'all' || scope === 'tasks'
              ? tasksService.fetchProjectTasks(proj.id)
              : Promise.resolve({ data: [] as TaskWithDetails[], error: null }),
            scope === 'all' || scope === 'milestones'
              ? milestonesService.fetchProjectMilestones(proj.id)
              : Promise.resolve({ data: [] as MilestoneWithDetails[], error: null }),
            scope === 'all' || scope === 'decisions'
              ? decisionsService.fetchProjectDecisions(proj.id)
              : Promise.resolve({ data: [] as DecisionWithDetails[], error: null }),
            scope === 'all' || scope === 'resources'
              ? resourcesService.fetchProjectResources(proj.id)
              : Promise.resolve({ data: [] as ResourceWithDetails[], error: null }),
          ]);

          if (tRes.data) allTasks.push(...tRes.data);
          if (mRes.data) allMilestones.push(...mRes.data);
          if (dRes.data) allDecisions.push(...dRes.data);
          if (rRes.data) allResources.push(...rRes.data);
        })
      );

      const results = filterAuthorizedSearchResults({
        query: trimmed,
        scope,
        authorizedProjects,
        tasks: allTasks,
        milestones: allMilestones,
        decisions: allDecisions,
        resources: allResources,
      });

      return { data: results, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Search failed';
      return { data: null, error: new Error(message) };
    }
  },
};

