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

export type MilestoneStatus = 'upcoming' | 'in_progress' | 'completed';
export type MilestoneProgressMode = 'auto' | 'manual';

export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled';
export type DecisionStatus = 'proposed' | 'accepted' | 'rejected' | 'superseded';

export type ResourceCategory =
  | 'research'
  | 'datasets'
  | 'design'
  | 'code'
  | 'reports'
  | 'presentations'
  | 'other';
export type ResourceType = 'external_link' | 'file_upload';

export type ActivityEventType =
  | 'task_created'
  | 'task_completed'
  | 'task_assigned'
  | 'milestone_created'
  | 'milestone_completed'
  | 'meeting_scheduled'
  | 'minutes_recorded'
  | 'decision_accepted'
  | 'decision_superseded'
  | 'resource_shared'
  | 'pulse_submitted';

export type ActivityEntityType =
  | 'task'
  | 'milestone'
  | 'meeting'
  | 'decision'
  | 'resource'
  | 'pulse';

export type NotificationCategory =
  | 'task_assignment'
  | 'task_update'
  | 'mention'
  | 'deadline_reminder'
  | 'meeting_reminder'
  | 'pulse_reminder';

export type TeamPulseStatus = 'on_track' | 'needs_support' | 'blocked';

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
          milestone_id: string | null;
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
          milestone_id?: string | null;
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
          milestone_id?: string | null;
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
          {
            foreignKeyName: 'tasks_milestone_id_fkey';
            columns: ['milestone_id'];
            referencedRelation: 'milestones';
            referencedColumns: ['id'];
          },
        ];
      };
      milestones: {
        Row: {
          id: string;
          project_id: string;
          phase_id: string | null;
          title: string;
          description: string | null;
          target_date: string | null;
          status: MilestoneStatus;
          progress_mode: MilestoneProgressMode;
          manual_progress: number;
          sequence_order: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          phase_id?: string | null;
          title: string;
          description?: string | null;
          target_date?: string | null;
          status?: MilestoneStatus;
          progress_mode?: MilestoneProgressMode;
          manual_progress?: number;
          sequence_order?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          phase_id?: string | null;
          title?: string;
          description?: string | null;
          target_date?: string | null;
          status?: MilestoneStatus;
          progress_mode?: MilestoneProgressMode;
          manual_progress?: number;
          sequence_order?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'milestones_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'milestones_phase_id_fkey';
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
      meetings: {
        Row: {
          id: string;
          project_id: string;
          phase_id: string | null;
          title: string;
          agenda: string | null;
          location_or_link: string | null;
          starts_at: string;
          ends_at: string | null;
          status: MeetingStatus;
          minutes_summary: string | null;
          attendee_ids: string[];
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          phase_id?: string | null;
          title: string;
          agenda?: string | null;
          location_or_link?: string | null;
          starts_at: string;
          ends_at?: string | null;
          status?: MeetingStatus;
          minutes_summary?: string | null;
          attendee_ids?: string[];
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          phase_id?: string | null;
          title?: string;
          agenda?: string | null;
          location_or_link?: string | null;
          starts_at?: string;
          ends_at?: string | null;
          status?: MeetingStatus;
          minutes_summary?: string | null;
          attendee_ids?: string[];
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'meetings_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meetings_phase_id_fkey';
            columns: ['phase_id'];
            referencedRelation: 'project_phases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meetings_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      meeting_action_items: {
        Row: {
          id: string;
          meeting_id: string;
          project_id: string;
          title: string;
          assignee_id: string | null;
          due_date: string | null;
          is_completed: boolean;
          converted_task_id: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          project_id: string;
          title: string;
          assignee_id?: string | null;
          due_date?: string | null;
          is_completed?: boolean;
          converted_task_id?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          project_id?: string;
          title?: string;
          assignee_id?: string | null;
          due_date?: string | null;
          is_completed?: boolean;
          converted_task_id?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'meeting_action_items_meeting_id_fkey';
            columns: ['meeting_id'];
            referencedRelation: 'meetings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meeting_action_items_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meeting_action_items_assignee_id_fkey';
            columns: ['assignee_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meeting_action_items_converted_task_id_fkey';
            columns: ['converted_task_id'];
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      decisions: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string;
          context_reason: string | null;
          status: DecisionStatus;
          decided_at: string;
          meeting_id: string | null;
          task_id: string | null;
          milestone_id: string | null;
          supersedes_id: string | null;
          superseded_by_id: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          description: string;
          context_reason?: string | null;
          status?: DecisionStatus;
          decided_at?: string;
          meeting_id?: string | null;
          task_id?: string | null;
          milestone_id?: string | null;
          supersedes_id?: string | null;
          superseded_by_id?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          description?: string;
          context_reason?: string | null;
          status?: DecisionStatus;
          decided_at?: string;
          meeting_id?: string | null;
          task_id?: string | null;
          milestone_id?: string | null;
          supersedes_id?: string | null;
          superseded_by_id?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'decisions_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'decisions_meeting_id_fkey';
            columns: ['meeting_id'];
            referencedRelation: 'meetings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'decisions_task_id_fkey';
            columns: ['task_id'];
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'decisions_milestone_id_fkey';
            columns: ['milestone_id'];
            referencedRelation: 'milestones';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'decisions_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      resources: {
        Row: {
          id: string;
          project_id: string;
          milestone_id: string | null;
          title: string;
          description: string | null;
          category: ResourceCategory;
          custom_category: string | null;
          resource_type: ResourceType;
          external_url: string | null;
          storage_path: string | null;
          file_name: string | null;
          mime_type: string | null;
          file_size_bytes: number | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          milestone_id?: string | null;
          title: string;
          description?: string | null;
          category?: ResourceCategory;
          custom_category?: string | null;
          resource_type: ResourceType;
          external_url?: string | null;
          storage_path?: string | null;
          file_name?: string | null;
          mime_type?: string | null;
          file_size_bytes?: number | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          milestone_id?: string | null;
          title?: string;
          description?: string | null;
          category?: ResourceCategory;
          custom_category?: string | null;
          resource_type?: ResourceType;
          external_url?: string | null;
          storage_path?: string | null;
          file_name?: string | null;
          mime_type?: string | null;
          file_size_bytes?: number | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'resources_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'resources_milestone_id_fkey';
            columns: ['milestone_id'];
            referencedRelation: 'milestones';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'resources_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      activity_events: {
        Row: {
          id: string;
          project_id: string;
          actor_id: string;
          event_type: ActivityEventType;
          entity_type: ActivityEntityType;
          entity_id: string;
          summary_text: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          actor_id: string;
          event_type: ActivityEventType;
          entity_type: ActivityEntityType;
          entity_id: string;
          summary_text: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          actor_id?: string;
          event_type?: ActivityEventType;
          entity_type?: ActivityEntityType;
          entity_id?: string;
          summary_text?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'activity_events_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activity_events_actor_id_fkey';
            columns: ['actor_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_preferences: {
        Row: {
          user_id: string;
          task_assignments: boolean;
          task_updates: boolean;
          mentions: boolean;
          deadline_reminders: boolean;
          meeting_reminders: boolean;
          team_pulse_reminders: boolean;
          minimize_lock_screen_content: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          task_assignments?: boolean;
          task_updates?: boolean;
          mentions?: boolean;
          deadline_reminders?: boolean;
          meeting_reminders?: boolean;
          team_pulse_reminders?: boolean;
          minimize_lock_screen_content?: boolean;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          task_assignments?: boolean;
          task_updates?: boolean;
          mentions?: boolean;
          deadline_reminders?: boolean;
          meeting_reminders?: boolean;
          team_pulse_reminders?: boolean;
          minimize_lock_screen_content?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_preferences_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_deliveries: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
          category: NotificationCategory;
          dedupe_key: string;
          title: string;
          body: string;
          is_read: boolean;
          delivered_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id: string;
          category: NotificationCategory;
          dedupe_key: string;
          title: string;
          body: string;
          is_read?: boolean;
          delivered_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string;
          category?: NotificationCategory;
          dedupe_key?: string;
          title?: string;
          body?: string;
          is_read?: boolean;
          delivered_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_deliveries_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notification_deliveries_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      team_pulse_checkins: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          week_start_date: string;
          status: TeamPulseStatus;
          blocker_details: string | null;
          follow_up_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          week_start_date: string;
          status: TeamPulseStatus;
          blocker_details?: string | null;
          follow_up_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          week_start_date?: string;
          status?: TeamPulseStatus;
          blocker_details?: string | null;
          follow_up_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'team_pulse_checkins_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'team_pulse_checkins_user_id_fkey';
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
      convert_action_item_to_task: {
        Args: {
          p_action_item_id: string;
        };
        Returns: string;
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

export type Milestone = Database['public']['Tables']['milestones']['Row'];
export type MilestoneInsert = Database['public']['Tables']['milestones']['Insert'];
export type MilestoneUpdate = Database['public']['Tables']['milestones']['Update'];

export type Meeting = Database['public']['Tables']['meetings']['Row'];
export type MeetingInsert = Database['public']['Tables']['meetings']['Insert'];
export type MeetingUpdate = Database['public']['Tables']['meetings']['Update'];

export type MeetingActionItem = Database['public']['Tables']['meeting_action_items']['Row'];
export type MeetingActionItemInsert = Database['public']['Tables']['meeting_action_items']['Insert'];
export type MeetingActionItemUpdate = Database['public']['Tables']['meeting_action_items']['Update'];

export type Decision = Database['public']['Tables']['decisions']['Row'];
export type DecisionInsert = Database['public']['Tables']['decisions']['Insert'];
export type DecisionUpdate = Database['public']['Tables']['decisions']['Update'];

export type Resource = Database['public']['Tables']['resources']['Row'];
export type ResourceInsert = Database['public']['Tables']['resources']['Insert'];
export type ResourceUpdate = Database['public']['Tables']['resources']['Update'];

export type ActivityEvent = Database['public']['Tables']['activity_events']['Row'];
export type ActivityEventInsert = Database['public']['Tables']['activity_events']['Insert'];

export type NotificationPreference =
  Database['public']['Tables']['notification_preferences']['Row'];
export type NotificationPreferenceUpdate =
  Database['public']['Tables']['notification_preferences']['Update'];

export type NotificationDelivery =
  Database['public']['Tables']['notification_deliveries']['Row'];
export type NotificationDeliveryInsert =
  Database['public']['Tables']['notification_deliveries']['Insert'];

export type TeamPulseCheckin = Database['public']['Tables']['team_pulse_checkins']['Row'];
export type TeamPulseCheckinInsert =
  Database['public']['Tables']['team_pulse_checkins']['Insert'];
export type TeamPulseCheckinUpdate =
  Database['public']['Tables']['team_pulse_checkins']['Update'];
