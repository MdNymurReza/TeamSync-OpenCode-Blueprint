import { supabase } from '@/lib/supabase/client';
import type { ProjectPhaseUpdate, ProjectType } from '@/types/database';
import type { CreatePhaseInput, ProjectPhase, UpdatePhaseInput } from './types';

export const playbooksService = {
  /**
   * Fetches all phases for a project ordered by sequence_order.
   */
  async getProjectPhases(
    projectId: string
  ): Promise<{ data: ProjectPhase[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('sequence_order', { ascending: true });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: (data as ProjectPhase[]) ?? [], error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch project phases';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Creates a new phase in a project.
   */
  async createPhase(
    projectId: string,
    input: CreatePhaseInput
  ): Promise<{ data: ProjectPhase | null; error: Error | null }> {
    try {
      let order = input.sequence_order;
      if (order === undefined) {
        // Fetch current highest sequence_order
        const { data: existing } = await supabase
          .from('project_phases')
          .select('sequence_order')
          .eq('project_id', projectId)
          .order('sequence_order', { ascending: false })
          .limit(1);

        order = existing && existing.length > 0 ? (existing[0]?.sequence_order ?? 0) + 1 : 0;
      }

      const { data, error } = await supabase
        .from('project_phases')
        .insert({
          project_id: projectId,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          sequence_order: order,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as ProjectPhase, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create phase';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Updates an existing phase's details.
   */
  async updatePhase(
    phaseId: string,
    input: UpdatePhaseInput
  ): Promise<{ data: ProjectPhase | null; error: Error | null }> {
    try {
      const updates: ProjectPhaseUpdate = {};
      if (input.name !== undefined) updates.name = input.name.trim();
      if (input.description !== undefined) updates.description = input.description?.trim() || null;
      if (input.is_completed !== undefined) updates.is_completed = input.is_completed;
      if (input.sequence_order !== undefined) updates.sequence_order = input.sequence_order;

      const { data, error } = await supabase
        .from('project_phases')
        .update(updates)
        .eq('id', phaseId)
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as ProjectPhase, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update phase';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Toggles phase completion status.
   */
  async togglePhaseCompletion(
    phaseId: string,
    isCompleted: boolean
  ): Promise<{ data: ProjectPhase | null; error: Error | null }> {
    return this.updatePhase(phaseId, { is_completed: isCompleted });
  },

  /**
   * Deletes a phase from the project.
   */
  async deletePhase(phaseId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.from('project_phases').delete().eq('id', phaseId);

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete phase';
      return { error: new Error(message) };
    }
  },

  /**
   * Atomically reorders phases in a project using the server-side RPC.
   */
  async reorderPhases(
    projectId: string,
    phaseIds: string[]
  ): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.rpc('reorder_project_phases', {
        p_project_id: projectId,
        p_phase_ids: phaseIds,
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reorder phases';
      return { error: new Error(message) };
    }
  },

  /**
   * Applies a playbook template to a project, replacing existing phases with the template defaults.
   */
  async applyPlaybookTemplate(
    projectId: string,
    templateType: ProjectType
  ): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.rpc('seed_project_phases', {
        p_project_id: projectId,
        p_template_type: templateType,
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to apply template';
      return { error: new Error(message) };
    }
  },
};
