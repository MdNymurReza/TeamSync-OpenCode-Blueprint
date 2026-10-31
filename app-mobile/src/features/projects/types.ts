import { Project, ProjectMember, ProjectRole, ProjectType, Profile } from '@/types/database';

export type { Project, ProjectMember, ProjectRole, ProjectType };

export interface ProjectWithRole extends Project {
  currentUserRole: ProjectRole;
  memberCount?: number;
}

export interface ProjectMemberWithProfile extends ProjectMember {
  profile: Pick<Profile, 'full_name' | 'email' | 'avatar_url' | 'university' | 'department'> | null;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  project_type: ProjectType;
  course_code?: string;
  semester?: string;
  target_date?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  project_type?: ProjectType;
  course_code?: string;
  semester?: string;
  target_date?: string;
  is_archived?: boolean;
}

export interface CreateInvitationInput {
  projectId: string;
  role?: 'admin' | 'member';
  maxUses?: number;
  expiresInDays?: number;
}

export interface ProjectTypeOption {
  type: ProjectType;
  label: string;
  description: string;
  icon: string;
}

export const PROJECT_TYPE_OPTIONS: ProjectTypeOption[] = [
  {
    type: 'course_assignment',
    label: 'Course Assignment',
    description: 'Weekly or multi-week coursework with milestones & deliverables',
    icon: 'school-outline',
  },
  {
    type: 'software_project',
    label: 'Software Project',
    description: 'App development, sprint tasks, feature backlogs & reviews',
    icon: 'code-slash-outline',
  },
  {
    type: 'research',
    label: 'Research Project',
    description: 'Literature reviews, experiments, papers, and dataset tracking',
    icon: 'flask-outline',
  },
  {
    type: 'fyp_capstone',
    label: 'FYDP / Capstone',
    description: 'Year-long final design projects with phases, advisors & presentations',
    icon: 'trophy-outline',
  },
  {
    type: 'other',
    label: 'General Workspace',
    description: 'Flexible structure for hackathons, study groups & clubs',
    icon: 'layers-outline',
  },
];
