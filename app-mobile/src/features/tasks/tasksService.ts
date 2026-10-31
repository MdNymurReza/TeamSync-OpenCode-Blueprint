import { supabase } from '@/lib/supabase/client';
import type { Profile, ProjectPhase, Task, TaskChecklistItem, TaskUpdate } from '@/types/database';
import type {
  CreateTaskInput,
  TaskCommentWithProfile,
  TaskFilterOptions,
  TaskStatus,
  TaskWithDetails,
  UpdateTaskInput,
} from './types';

interface TaskRowWithRelations extends Task {
  primary_assignee?: Profile | null;
  phase?: ProjectPhase | null;
  checklist?: { id: string; is_completed: boolean }[];
  comments?: { id: string }[];
  collaborators?: { user: Profile }[];
}

export const tasksService = {
  /**
   * Fetches all tasks for a project with optional filters.
   */
  async fetchProjectTasks(
    projectId: string,
    filters?: TaskFilterOptions
  ): Promise<{ data: TaskWithDetails[] | null; error: Error | null }> {
    try {
      let query = supabase
        .from('tasks')
        .select(
          `
          *,
          primary_assignee:profiles!tasks_primary_assignee_id_fkey(*),
          phase:project_phases!tasks_phase_id_fkey(*),
          checklist:task_checklist_items(id, is_completed),
          comments:task_comments(id)
        `
        )
        .eq('project_id', projectId);

      // Default: exclude archived tasks unless explicitly requested
      if (filters?.isArchived !== undefined) {
        query = query.eq('is_archived', filters.isArchived);
      } else {
        query = query.eq('is_archived', false);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }

      if (filters?.phaseId) {
        query = query.eq('phase_id', filters.phaseId);
      }

      if (filters?.assigneeId) {
        query = query.eq('primary_assignee_id', filters.assigneeId);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const rows = (data || []) as unknown as TaskRowWithRelations[];
      const tasks: TaskWithDetails[] = rows.map((row) => {
        const checklist = row.checklist || [];
        const checklist_total = checklist.length;
        const checklist_completed = checklist.filter((item) => item.is_completed).length;
        const comments_count = (row.comments || []).length;
        const collaborators = (row.collaborators || []).map((c) => c.user).filter(Boolean);

        return {
          ...row,
          collaborators,
          checklist_total,
          checklist_completed,
          comments_count,
        };
      });

      // Handle in-memory overdue filter if requested
      if (filters?.overdueOnly) {
        const now = new Date().toISOString();
        const overdueTasks = tasks.filter(
          (t) => t.due_date && t.due_date < now && t.status !== 'done'
        );
        return { data: overdueTasks, error: null };
      }

      return { data: tasks, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch tasks';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Fetches full task details including checklist items and comments.
   */
  async fetchTaskDetails(
    taskId: string
  ): Promise<{ data: TaskWithDetails | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          primary_assignee:profiles!tasks_primary_assignee_id_fkey(*),
          phase:project_phases!tasks_phase_id_fkey(*),
          collaborators:task_collaborators(user:profiles(*)),
          checklist:task_checklist_items(*),
          comments:task_comments(id)
        `
        )
        .eq('id', taskId)
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const row = data as unknown as TaskRowWithRelations;
      const checklist = row.checklist || [];
      const checklist_total = checklist.length;
      const checklist_completed = checklist.filter((item) => item.is_completed).length;
      const comments_count = (row.comments || []).length;
      const collaborators = (row.collaborators || []).map((c) => c.user).filter(Boolean);

      const task: TaskWithDetails = {
        ...row,
        collaborators,
        checklist_total,
        checklist_completed,
        comments_count,
      };

      return { data: task, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch task details';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Creates a new task in a project.
   */
  async createTask(
    projectId: string,
    input: CreateTaskInput
  ): Promise<{ data: TaskWithDetails | null; error: Error | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: new Error('You must be signed in to create a task') };
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          project_id: projectId,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          primary_assignee_id: input.primary_assignee_id || null,
          priority: input.priority || 'medium',
          due_date: input.due_date || null,
          start_date: input.start_date || null,
          phase_id: input.phase_id || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const newTask = data as TaskWithDetails;

      // Add collaborators if provided
      if (input.collaborator_ids && input.collaborator_ids.length > 0) {
        const collabRows = input.collaborator_ids.map((userId) => ({
          task_id: newTask.id,
          user_id: userId,
        }));
        await supabase.from('task_collaborators').insert(collabRows);
      }

      return { data: newTask, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create task';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Updates an existing task.
   */
  async updateTask(
    taskId: string,
    input: UpdateTaskInput
  ): Promise<{ data: TaskWithDetails | null; error: Error | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const updates: TaskUpdate = {
        updated_by: user?.id ?? null,
      };

      if (input.title !== undefined) updates.title = input.title.trim();
      if (input.description !== undefined) updates.description = input.description?.trim() || null;
      if (input.primary_assignee_id !== undefined) updates.primary_assignee_id = input.primary_assignee_id;
      if (input.status !== undefined) updates.status = input.status;
      if (input.priority !== undefined) updates.priority = input.priority;
      if (input.due_date !== undefined) updates.due_date = input.due_date;
      if (input.start_date !== undefined) updates.start_date = input.start_date;
      if (input.phase_id !== undefined) updates.phase_id = input.phase_id;
      if (input.is_archived !== undefined) updates.is_archived = input.is_archived;

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as TaskWithDetails, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update task';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Toggles task completion: done <-> in_progress / todo (reopening).
   */
  async toggleTaskStatus(
    taskId: string,
    currentStatus: TaskStatus
  ): Promise<{ data: TaskWithDetails | null; error: Error | null }> {
    const nextStatus: TaskStatus = currentStatus === 'done' ? 'in_progress' : 'done';
    return this.updateTask(taskId, { status: nextStatus });
  },

  /**
   * Archives or unarchives a task.
   */
  async archiveTask(
    taskId: string,
    isArchived: boolean
  ): Promise<{ error: Error | null }> {
    const res = await this.updateTask(taskId, { is_archived: isArchived });
    return { error: res.error };
  },

  /**
   * Deletes a task permanently.
   */
  async deleteTask(taskId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete task';
      return { error: new Error(message) };
    }
  },

  // --------------------------------------------------------------------------
  // Checklist Items
  // --------------------------------------------------------------------------

  async fetchTaskChecklist(
    taskId: string
  ): Promise<{ data: TaskChecklistItem[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('task_checklist_items')
        .select('*')
        .eq('task_id', taskId)
        .order('sequence_order', { ascending: true });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as TaskChecklistItem[], error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch checklist';
      return { data: null, error: new Error(message) };
    }
  },

  async addChecklistItem(
    taskId: string,
    title: string
  ): Promise<{ data: TaskChecklistItem | null; error: Error | null }> {
    try {
      const { data: existing } = await supabase
        .from('task_checklist_items')
        .select('sequence_order')
        .eq('task_id', taskId)
        .order('sequence_order', { ascending: false })
        .limit(1);

      const nextOrder = existing && existing.length > 0 ? (existing[0]?.sequence_order ?? 0) + 1 : 0;

      const { data, error } = await supabase
        .from('task_checklist_items')
        .insert({
          task_id: taskId,
          title: title.trim(),
          sequence_order: nextOrder,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as TaskChecklistItem, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add checklist item';
      return { data: null, error: new Error(message) };
    }
  },

  async toggleChecklistItem(
    itemId: string,
    isCompleted: boolean
  ): Promise<{ data: TaskChecklistItem | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('task_checklist_items')
        .update({ is_completed: isCompleted })
        .eq('id', itemId)
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as TaskChecklistItem, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to toggle checklist item';
      return { data: null, error: new Error(message) };
    }
  },

  async deleteChecklistItem(itemId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.from('task_checklist_items').delete().eq('id', itemId);
      if (error) {
        return { error: new Error(error.message) };
      }
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete checklist item';
      return { error: new Error(message) };
    }
  },

  // --------------------------------------------------------------------------
  // Comments
  // --------------------------------------------------------------------------

  async fetchTaskComments(
    taskId: string
  ): Promise<{ data: TaskCommentWithProfile[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select(
          `
          *,
          author:profiles!task_comments_user_id_fkey(*)
        `
        )
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: (data as unknown as TaskCommentWithProfile[]) || [], error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch comments';
      return { data: null, error: new Error(message) };
    }
  },

  async addComment(
    taskId: string,
    content: string
  ): Promise<{ data: TaskCommentWithProfile | null; error: Error | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: new Error('You must be signed in to comment') };
      }

      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: user.id,
          content: content.trim(),
        })
        .select(
          `
          *,
          author:profiles!task_comments_user_id_fkey(*)
        `
        )
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as unknown as TaskCommentWithProfile, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add comment';
      return { data: null, error: new Error(message) };
    }
  },

  async deleteComment(commentId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.from('task_comments').delete().eq('id', commentId);
      if (error) {
        return { error: new Error(error.message) };
      }
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete comment';
      return { error: new Error(message) };
    }
  },
};
