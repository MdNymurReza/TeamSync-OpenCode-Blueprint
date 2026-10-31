import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  CreateInvitationInput,
  CreateProjectInput,
  ProjectMemberWithProfile,
  ProjectRole,
  ProjectWithRole,
  UpdateProjectInput,
} from './types';
import { Profile, ProjectInvitation } from '@/types/database';

function generateInvitationCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  return result;
}

export const projectsService = {
  /**
   * Fetches all projects where current authenticated user is a member.
   */
  async fetchUserProjects(): Promise<{ data: ProjectWithRole[] | null; error: Error | null }> {
    if (!isSupabaseConfigured) {
      return { data: [], error: null };
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return { data: null, error: userError ?? new Error('User not authenticated') };
      }

      // Fetch user's memberships with project data
      const { data: memberships, error } = await supabase
        .from('project_members')
        .select(
          `
          role,
          project:projects (
            id,
            name,
            description,
            project_type,
            course_code,
            semester,
            target_date,
            is_archived,
            created_by,
            created_at,
            updated_at
          )
        `
        )
        .eq('user_id', user.id);

      if (error) {
        return { data: null, error };
      }

      const projectsWithRole: ProjectWithRole[] = [];

      for (const m of memberships ?? []) {
        if (m.project) {
          const project = m.project as unknown as ProjectWithRole;
          projectsWithRole.push({
            ...project,
            currentUserRole: m.role as ProjectRole,
          });
        }
      }

      // Sort by updated_at descending
      projectsWithRole.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      return { data: projectsWithRole, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Fetches full project details by ID and verifies membership.
   */
  async fetchProjectDetails(
    projectId: string
  ): Promise<{ data: ProjectWithRole | null; error: Error | null }> {
    if (!isSupabaseConfigured) {
      return { data: null, error: new Error('Supabase is not configured') };
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Fetch project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        return { data: null, error: projectError ?? new Error('Project not found') };
      }

      // Fetch role
      const { data: memberData } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();

      const role = (memberData?.role ?? 'member') as ProjectRole;

      return {
        data: {
          ...project,
          currentUserRole: role,
        },
        error: null,
      };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Fetches all members of a project with profile details.
   */
  async fetchProjectMembers(
    projectId: string
  ): Promise<{ data: ProjectMemberWithProfile[] | null; error: Error | null }> {
    if (!isSupabaseConfigured) {
      return { data: [], error: null };
    }

    try {
      let memberRows: {
        id: string;
        project_id: string;
        user_id: string;
        role: ProjectRole;
        joined_at: string;
        profile?: {
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          university?: string | null;
          department?: string | null;
        } | null;
      }[] = [];

      // 1. Try embedded select first
      const { data: members, error } = await supabase
        .from('project_members')
        .select(
          `
          id,
          project_id,
          user_id,
          role,
          joined_at,
          profile:profiles (
            full_name,
            email,
            avatar_url,
            university,
            department
          )
        `
        )
        .eq('project_id', projectId);

      if (!error && members && members.length > 0) {
        memberRows = members as unknown as typeof memberRows;
      } else {
        // Fallback: Fetch members directly then fetch profiles
        const { data: rawMembers, error: rawError } = await supabase
          .from('project_members')
          .select('id, project_id, user_id, role, joined_at')
          .eq('project_id', projectId);

        if (rawError) {
          return { data: null, error: rawError };
        }

        const userIds = (rawMembers ?? []).map((m) => m.user_id);
        const profileMap = new Map<string, Profile>();

        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds);

          (profiles ?? []).forEach((p) => {
            profileMap.set(p.id, p);
          });
        }

        memberRows = (rawMembers ?? []).map((m) => {
          const prof = profileMap.get(m.user_id);
          return {
            id: m.id,
            project_id: m.project_id,
            user_id: m.user_id,
            role: m.role as ProjectRole,
            joined_at: m.joined_at,
            profile: prof
              ? {
                  full_name: prof.full_name,
                  email: prof.email,
                  avatar_url: prof.avatar_url,
                  university: prof.university,
                  department: prof.department,
                }
              : null,
          };
        });
      }

      const roleWeights: Record<ProjectRole, number> = { owner: 0, admin: 1, member: 2 };

      const formatted: ProjectMemberWithProfile[] = memberRows.map((m) => ({
        id: m.id,
        project_id: m.project_id,
        user_id: m.user_id,
        role: m.role as ProjectRole,
        joined_at: m.joined_at,
        profile: m.profile
          ? {
              full_name: m.profile.full_name || 'Team Member',
              email: m.profile.email ?? null,
              avatar_url: m.profile.avatar_url ?? null,
              university: m.profile.university ?? null,
              department: m.profile.department ?? null,
            }
          : {
              full_name: 'Team Member',
              email: null,
              avatar_url: null,
              university: null,
              department: null,
            },
      }));

      formatted.sort((a, b) => {
        const weightDiff = (roleWeights[a.role] ?? 3) - (roleWeights[b.role] ?? 3);
        if (weightDiff !== 0) return weightDiff;
        return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
      });

      return { data: formatted, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Creates a project atomically with the creator as owner.
   */
  async createProject(input: CreateProjectInput): Promise<{ data: string | null; error: Error | null }> {
    if (!isSupabaseConfigured) {
      return { data: null, error: new Error('Supabase is not configured') };
    }

    try {
      // Call create_project_with_owner RPC
      const { data: projectId, error } = await supabase.rpc('create_project_with_owner', {
        p_name: input.name,
        p_description: input.description ?? null,
        p_project_type: input.project_type,
        p_course_code: input.course_code ?? null,
        p_semester: input.semester ?? null,
        p_target_date: input.target_date ?? null,
      });

      if (error) {
        return { data: null, error };
      }

      return { data: projectId, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Updates an existing project.
   */
  async updateProject(
    projectId: string,
    input: UpdateProjectInput
  ): Promise<{ error: Error | null }> {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured') };
    }

    try {
      const { error } = await supabase
        .from('projects')
        .update(input)
        .eq('id', projectId);

      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  },

  /**
   * Archives or unarchives a project.
   */
  async setProjectArchived(
    projectId: string,
    isArchived: boolean
  ): Promise<{ error: Error | null }> {
    return this.updateProject(projectId, { is_archived: isArchived });
  },

  /**
   * Creates an active invitation code for a project.
   */
  async createInvitation(
    input: CreateInvitationInput
  ): Promise<{ data: ProjectInvitation | null; error: Error | null }> {
    if (!isSupabaseConfigured) {
      return { data: null, error: new Error('Supabase is not configured') };
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const code = generateInvitationCode();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays ?? 7));

      const { data, error } = await supabase
        .from('project_invitations')
        .insert({
          project_id: input.projectId,
          invitation_code: code,
          role: input.role ?? 'member',
          created_by: user.id,
          expires_at: expiresAt.toISOString(),
          max_uses: input.maxUses ?? 5,
          uses_count: 0,
          is_revoked: false,
        })
        .select('*')
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Fetches active invitations for a project.
   */
  async fetchProjectInvitations(
    projectId: string
  ): Promise<{ data: ProjectInvitation[] | null; error: Error | null }> {
    if (!isSupabaseConfigured) {
      return { data: [], error: null };
    }

    try {
      const { data, error } = await supabase
        .from('project_invitations')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_revoked', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Revokes an existing invitation.
   */
  async revokeInvitation(invitationId: string): Promise<{ error: Error | null }> {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured') };
    }

    try {
      const { error } = await supabase
        .from('project_invitations')
        .update({ is_revoked: true })
        .eq('id', invitationId);

      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  },

  /**
   * Redeems an invitation code to join a project.
   */
  async redeemInvitation(
    invitationCode: string
  ): Promise<{ data: string | null; error: Error | null }> {
    if (!isSupabaseConfigured) {
      return { data: null, error: new Error('Supabase is not configured') };
    }

    try {
      const { data: projectId, error } = await supabase.rpc('redeem_invitation', {
        p_invitation_code: invitationCode.trim().toUpperCase(),
      });

      if (error) {
        return { data: null, error };
      }

      return { data: projectId, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Current user leaves the project (subject to owner invariant).
   */
  async leaveProject(projectId: string): Promise<{ error: Error | null }> {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured') };
    }

    try {
      const { error } = await supabase.rpc('leave_project', {
        p_project_id: projectId,
      });

      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  },

  /**
   * Removes a member from a project (owner/admin action).
   */
  async removeMember(projectId: string, userId: string): Promise<{ error: Error | null }> {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured') };
    }

    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);

      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  },

  /**
   * Updates a member's role (owner/admin action).
   */
  async updateMemberRole(
    projectId: string,
    userId: string,
    newRole: ProjectRole
  ): Promise<{ error: Error | null }> {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured') };
    }

    try {
      const { error } = await supabase
        .from('project_members')
        .update({ role: newRole })
        .eq('project_id', projectId)
        .eq('user_id', userId);

      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  },
};
