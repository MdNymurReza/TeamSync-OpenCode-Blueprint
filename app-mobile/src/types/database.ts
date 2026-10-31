export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProjectRole = 'owner' | 'admin' | 'member';
export type ProjectType =
  | 'course_assignment'
  | 'software_project'
  | 'research'
  | 'fyp_capstone'
  | 'other';

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string;
          avatar_url: string | null;
          university: string | null;
          department: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name: string;
          avatar_url?: string | null;
          university?: string | null;
          department?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string;
          avatar_url?: string | null;
          university?: string | null;
          department?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          project_type: ProjectType;
          course_code: string | null;
          semester: string | null;
          target_date: string | null;
          is_archived: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          project_type?: ProjectType;
          course_code?: string | null;
          semester?: string | null;
          target_date?: string | null;
          is_archived?: boolean;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          project_type?: ProjectType;
          course_code?: string | null;
          semester?: string | null;
          target_date?: string | null;
          is_archived?: boolean;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'projects_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: ProjectRole;
          joined_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role?: ProjectRole;
          joined_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: ProjectRole;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_members_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_members_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      project_invitations: {
        Row: {
          id: string;
          project_id: string;
          invitation_code: string;
          role: 'admin' | 'member';
          created_by: string;
          expires_at: string;
          max_uses: number;
          uses_count: number;
          is_revoked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          invitation_code: string;
          role?: 'admin' | 'member';
          created_by?: string;
          expires_at?: string;
          max_uses?: number;
          uses_count?: number;
          is_revoked?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          invitation_code?: string;
          role?: 'admin' | 'member';
          created_by?: string;
          expires_at?: string;
          max_uses?: number;
          uses_count?: number;
          is_revoked?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_invitations_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      project_phases: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          description: string | null;
          sequence_order: number;
          is_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          description?: string | null;
          sequence_order?: number;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          description?: string | null;
          sequence_order?: number;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_phases_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string | null;
          primary_assignee_id: string | null;
          status: TaskStatus;
          priority: TaskPriority;
          due_date: string | null;
          start_date: string | null;
          phase_id: string | null;
          is_archived: boolean;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          description?: string | null;
          primary_assignee_id?: string | null;
          status?: TaskStatus;
          priority?: TaskPriority;
          due_date?: string | null;
          start_date?: string | null;
          phase_id?: string | null;
          is_archived?: boolean;
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          description?: string | null;
          primary_assignee_id?: string | null;
          status?: TaskStatus;
          priority?: TaskPriority;
          due_date?: string | null;
          start_date?: string | null;
          phase_id?: string | null;
          is_archived?: boolean;
          created_by?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_primary_assignee_id_fkey';
            columns: ['primary_assignee_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_phase_id_fkey';
            columns: ['phase_id'];
            referencedRelation: 'project_phases';
            referencedColumns: ['id'];
          },
        ];
      };
      task_collaborators: {
        Row: {
          task_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          task_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          task_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_collaborators_task_id_fkey';
            columns: ['task_id'];
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_collaborators_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      task_checklist_items: {
        Row: {
          id: string;
          task_id: string;
          title: string;
          is_completed: boolean;
          sequence_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          title: string;
          is_completed?: boolean;
          sequence_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          title?: string;
          is_completed?: boolean;
          sequence_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_checklist_items_task_id_fkey';
            columns: ['task_id'];
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      task_comments: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_comments_task_id_fkey';
            columns: ['task_id'];
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_comments_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_project_with_owner: {
        Args: {
          p_name: string;
          p_description?: string | null;
          p_project_type?: ProjectType;
          p_course_code?: string | null;
          p_semester?: string | null;
          p_target_date?: string | null;
        };
        Returns: string;
      };
      redeem_invitation: {
        Args: {
          p_invitation_code: string;
        };
        Returns: string;
      };
      leave_project: {
        Args: {
          p_project_id: string;
        };
        Returns: void;
      };
      get_project_role: {
        Args: {
          p_project_id: string;
          p_user_id: string;
        };
        Returns: string | null;
      };
      is_project_member: {
        Args: {
          p_project_id: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      seed_project_phases: {
        Args: {
          p_project_id: string;
          p_template_type?: string;
        };
        Returns: void;
      };
      reorder_project_phases: {
        Args: {
          p_project_id: string;
          p_phase_ids: string[];
        };
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type Project = Database['public']['Tables']['projects']['Row'];
export type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
export type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

export type ProjectMember = Database['public']['Tables']['project_members']['Row'];
export type ProjectMemberInsert = Database['public']['Tables']['project_members']['Insert'];

export type ProjectInvitation = Database['public']['Tables']['project_invitations']['Row'];

export type ProjectPhase = Database['public']['Tables']['project_phases']['Row'];
export type ProjectPhaseInsert = Database['public']['Tables']['project_phases']['Insert'];
export type ProjectPhaseUpdate = Database['public']['Tables']['project_phases']['Update'];

export type Task = Database['public']['Tables']['tasks']['Row'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

export type TaskCollaborator = Database['public']['Tables']['task_collaborators']['Row'];
export type TaskChecklistItem = Database['public']['Tables']['task_checklist_items']['Row'];
export type TaskComment = Database['public']['Tables']['task_comments']['Row'];
