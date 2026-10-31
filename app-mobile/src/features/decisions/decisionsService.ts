import { supabase } from '@/lib/supabase/client';
import type {
  Decision,
  DecisionStatus,
  DecisionUpdate,
  Meeting,
  Milestone,
  Profile,
  Task,
} from '@/types/database';
import type {
  CreateDecisionInput,
  DecisionListFilter,
  DecisionWithDetails,
  SupersedeDecisionInput,
} from './types';

interface DecisionRowWithRelations extends Decision {
  author?: Profile | null;
  meeting?: Pick<Meeting, 'id' | 'title' | 'starts_at'> | null;
  task?: Pick<Task, 'id' | 'title' | 'status'> | null;
  milestone?: Pick<Milestone, 'id' | 'title'> | null;
}

/**
 * Pure domain guard enforcing the architecture invariant:
 * "Decision history is not silently overwritten."
 *
 * Rules:
 * - A `'proposed'` decision may have its title, description, context_reason, or status updated,
 *   or may be deleted.
 * - An `'accepted'` decision is immutable in content (`title`, `description`, `context_reason`)
 *   and cannot be deleted; its status may only transition to `'superseded'` when replaced by a
 *   new decision via `supersedeDecision`.
 * - A `'superseded'` decision is a historical record and cannot be modified or deleted.
 */
export function validateDecisionMutation(
  existingDecision: Pick<
    Decision,
    'status' | 'title' | 'description' | 'context_reason'
  >,
  operation: 'update' | 'delete',
  updates?: Partial<Pick<Decision, 'status' | 'title' | 'description' | 'context_reason'>>
): { allowed: boolean; error: string | null } {
  if (operation === 'delete') {
    if (
      existingDecision.status === 'accepted' ||
      existingDecision.status === 'superseded'
    ) {
      return {
        allowed: false,
        error:
          'Accepted or superseded decisions cannot be deleted. Supersede the decision instead to preserve decision history.',
      };
    }
    return { allowed: true, error: null };
  }

  if (existingDecision.status === 'superseded') {
    return {
      allowed: false,
      error: 'Superseded decisions are historical records and cannot be modified.',
    };
  }

  if (existingDecision.status === 'accepted' && updates) {
    const contentChanged =
      (updates.title !== undefined && updates.title.trim() !== existingDecision.title) ||
      (updates.description !== undefined &&
        updates.description.trim() !== existingDecision.description) ||
      (updates.context_reason !== undefined &&
        (updates.context_reason?.trim() || null) !==
          (existingDecision.context_reason || null));

    if (contentChanged) {
      return {
        allowed: false,
        error:
          'Accepted decision content cannot be overwritten. Create a superseding decision to record changes.',
      };
    }

    if (updates.status && updates.status !== 'accepted' && updates.status !== 'superseded') {
      return {
        allowed: false,
        error: 'An accepted decision can only transition to superseded.',
      };
    }
  }

  return { allowed: true, error: null };
}

/**
 * Resolves `supersedes` and `superseded_by` links in-memory across a project's decision list
 * so every decision displays its full lineage chain.
 */
export function linkDecisionLineage(decisions: DecisionWithDetails[]): DecisionWithDetails[] {
  const byId = new Map<string, DecisionWithDetails>();
  for (const d of decisions) {
    byId.set(d.id, d);
  }

  return decisions.map((d) => {
    const supersedesTarget = d.supersedes_id ? byId.get(d.supersedes_id) : null;
    const supersededByTarget = d.superseded_by_id
      ? byId.get(d.superseded_by_id)
      : decisions.find((other) => other.supersedes_id === d.id) ?? null;

    return {
      ...d,
      supersedes: supersedesTarget
        ? {
            id: supersedesTarget.id,
            title: supersedesTarget.title,
            status: supersedesTarget.status,
          }
        : d.supersedes ?? null,
      superseded_by: supersededByTarget
        ? {
            id: supersededByTarget.id,
            title: supersededByTarget.title,
            status: supersededByTarget.status,
          }
        : d.superseded_by ?? null,
    };
  });
}

export const decisionsService = {
  /**
   * Fetches all decisions for a project, enriched with author, linked meeting/task/milestone,
   * and superseding lineage.
   */
  async fetchProjectDecisions(
    projectId: string,
    filter: DecisionListFilter = 'all'
  ): Promise<{ data: DecisionWithDetails[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('decisions')
        .select(
          `
          *,
          author:profiles!decisions_created_by_fkey(*),
          meeting:meetings!decisions_meeting_id_fkey(id, title, starts_at),
          task:tasks!decisions_task_id_fkey(id, title, status),
          milestone:milestones!decisions_milestone_id_fkey(id, title)
        `
        )
        .eq('project_id', projectId)
        .order('decided_at', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const rows = (data || []) as unknown as DecisionRowWithRelations[];
      const linked = linkDecisionLineage(rows as DecisionWithDetails[]);

      if (filter !== 'all') {
        return {
          data: linked.filter((d) => d.status === filter),
          error: null,
        };
      }

      return { data: linked, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch decisions';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Records a new decision in a project (either `'proposed'` or `'accepted'`).
   */
  async createDecision(
    projectId: string,
    input: CreateDecisionInput
  ): Promise<{ data: DecisionWithDetails | null; error: Error | null }> {
    try {
      const trimmedTitle = input.title.trim();
      const trimmedDesc = input.description.trim();
      if (!trimmedTitle) {
        return { data: null, error: new Error('Decision title is required') };
      }
      if (!trimmedDesc) {
        return { data: null, error: new Error('Decision description is required') };
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: new Error('You must be signed in to record a decision') };
      }

      const { data, error } = await supabase
        .from('decisions')
        .insert({
          project_id: projectId,
          title: trimmedTitle,
          description: trimmedDesc,
          context_reason: input.context_reason?.trim() || null,
          status: input.status || 'accepted',
          decided_at: input.decided_at || new Date().toISOString(),
          meeting_id: input.meeting_id || null,
          task_id: input.task_id || null,
          milestone_id: input.milestone_id || null,
          supersedes_id: input.supersedes_id || null,
          created_by: user.id,
        })
        .select(
          `
          *,
          author:profiles!decisions_created_by_fkey(*),
          meeting:meetings!decisions_meeting_id_fkey(id, title, starts_at),
          task:tasks!decisions_task_id_fkey(id, title, status),
          milestone:milestones!decisions_milestone_id_fkey(id, title)
        `
        )
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as unknown as DecisionWithDetails, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create decision';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Updates status on a proposed decision (`'accepted'` or `'rejected'`).
   */
  async updateDecisionStatus(
    decision: Pick<Decision, 'id' | 'status' | 'title' | 'description' | 'context_reason'>,
    nextStatus: DecisionStatus
  ): Promise<{ data: Decision | null; error: Error | null }> {
    try {
      const guard = validateDecisionMutation(decision, 'update', { status: nextStatus });
      if (!guard.allowed) {
        return { data: null, error: new Error(guard.error ?? 'Operation not allowed') };
      }

      const updates: DecisionUpdate = {
        status: nextStatus,
        decided_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('decisions')
        .update(updates)
        .eq('id', decision.id)
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as Decision, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update decision status';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Supersedes an accepted decision with a new replacement decision while preserving
   * the original decision intact in history (PRD FR-07).
   */
  async supersedeDecision(
    priorDecision: Pick<
      Decision,
      | 'id'
      | 'project_id'
      | 'status'
      | 'title'
      | 'description'
      | 'context_reason'
      | 'meeting_id'
      | 'task_id'
      | 'milestone_id'
    >,
    replacement: SupersedeDecisionInput
  ): Promise<{
    data: { newDecision: DecisionWithDetails; supersededDecisionId: string } | null;
    error: Error | null;
  }> {
    try {
      if (priorDecision.status === 'superseded') {
        return {
          data: null,
          error: new Error('This decision has already been superseded.'),
        };
      }

      // 1. Create the new accepted decision pointing to supersedes_id = priorDecision.id
      const { data: newDecision, error: createError } = await this.createDecision(
        priorDecision.project_id,
        {
          title: replacement.title,
          description: replacement.description,
          context_reason: replacement.context_reason,
          status: 'accepted',
          supersedes_id: priorDecision.id,
          meeting_id: replacement.meeting_id ?? priorDecision.meeting_id,
          task_id: replacement.task_id ?? priorDecision.task_id,
          milestone_id: replacement.milestone_id ?? priorDecision.milestone_id,
        }
      );

      if (createError || !newDecision) {
        return {
          data: null,
          error: createError ?? new Error('Failed to create superseding decision'),
        };
      }

      // 2. Mark the prior decision as 'superseded' and link superseded_by_id = newDecision.id
      const { error: updateError } = await supabase
        .from('decisions')
        .update({
          status: 'superseded',
          superseded_by_id: newDecision.id,
        })
        .eq('id', priorDecision.id);

      if (updateError) {
        return { data: null, error: new Error(updateError.message) };
      }

      return {
        data: {
          newDecision,
          supersededDecisionId: priorDecision.id,
        },
        error: null,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to supersede decision';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Deletes a proposed or rejected decision. Accepted or superseded decisions are blocked.
   */
  async deleteDecision(
    decision: Pick<Decision, 'id' | 'status' | 'title' | 'description' | 'context_reason'>
  ): Promise<{ error: Error | null }> {
    try {
      const guard = validateDecisionMutation(decision, 'delete');
      if (!guard.allowed) {
        return { error: new Error(guard.error ?? 'Cannot delete accepted decision') };
      }

      const { error } = await supabase.from('decisions').delete().eq('id', decision.id);
      if (error) {
        return { error: new Error(error.message) };
      }
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete decision';
      return { error: new Error(message) };
    }
  },
};

