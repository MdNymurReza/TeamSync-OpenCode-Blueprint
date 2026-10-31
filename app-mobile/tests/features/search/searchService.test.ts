import { filterAuthorizedSearchResults } from '@/features/search';
import type { ProjectWithRole } from '@/features/projects';
import type { TaskWithDetails } from '@/features/tasks';
import type { MilestoneWithDetails } from '@/features/milestones';
import type { DecisionWithDetails } from '@/features/decisions';
import type { ResourceWithDetails } from '@/features/resources';

describe('searchService — Cross-Project Isolation & Filtering (Phase 9)', () => {
  const authorizedProjects: ProjectWithRole[] = [
    {
      id: 'proj-member',
      name: 'Robotics Capstone',
      description: 'Autonomous rover navigation',
      project_type: 'fyp_capstone',
      course_code: 'CS-499',
      semester: 'Fall 2026',
      target_date: '2026-12-15',
      created_by: 'user-1',
      is_archived: false,
      created_at: '2026-10-01T00:00:00.000Z',
      updated_at: '2026-10-01T00:00:00.000Z',
      currentUserRole: 'member',
      memberCount: 4,
    },
  ];

  const tasks: TaskWithDetails[] = [
    {
      id: 'task-1',
      project_id: 'proj-member',
      title: 'Calibrate rover lidar sensor',
      description: 'Run indoor calibration tests',
      primary_assignee_id: 'user-1',
      status: 'in_progress',
      priority: 'high',
      due_date: null,
      start_date: null,
      phase_id: null,
      milestone_id: null,
      is_archived: false,
      created_by: 'user-1',
      updated_by: null,
      created_at: '2026-10-10T00:00:00.000Z',
      updated_at: '2026-10-10T00:00:00.000Z',
    },
    {
      id: 'task-secret',
      project_id: 'proj-secret',
      title: 'Calibrate secret lidar',
      description: 'Top secret calibration',
      primary_assignee_id: null,
      status: 'todo',
      priority: 'urgent',
      due_date: null,
      start_date: null,
      phase_id: null,
      milestone_id: null,
      is_archived: false,
      created_by: 'user-99',
      updated_by: null,
      created_at: '2026-10-10T00:00:00.000Z',
      updated_at: '2026-10-10T00:00:00.000Z',
    },
  ];

  const milestones: MilestoneWithDetails[] = [
    {
      id: 'ms-1',
      project_id: 'proj-member',
      phase_id: null,
      title: 'Rover Lidar Prototype Demo',
      description: 'Demo lidar navigation',
      target_date: null,
      status: 'in_progress',
      progress_mode: 'auto',
      manual_progress: 0,
      sequence_order: 0,
      created_by: 'user-1',
      created_at: '2026-10-10T00:00:00.000Z',
      updated_at: '2026-10-10T00:00:00.000Z',
      totalTasks: 2,
      completedTasks: 1,
      progressPercent: 50,
      effectiveStatus: 'in_progress',
      isOverdue: false,
      hasDeadlineRisk: false,
    },
    {
      id: 'ms-secret',
      project_id: 'proj-secret',
      phase_id: null,
      title: 'Secret Lidar Demo',
      description: 'Unauthorized milestone',
      target_date: null,
      status: 'upcoming',
      progress_mode: 'auto',
      manual_progress: 0,
      sequence_order: 0,
      created_by: 'user-99',
      created_at: '2026-10-10T00:00:00.000Z',
      updated_at: '2026-10-10T00:00:00.000Z',
      totalTasks: 0,
      completedTasks: 0,
      progressPercent: 0,
      effectiveStatus: 'upcoming',
      isOverdue: false,
      hasDeadlineRisk: false,
    },
  ];

  const decisions: DecisionWithDetails[] = [
    {
      id: 'dec-1',
      project_id: 'proj-member',
      meeting_id: null,
      task_id: null,
      milestone_id: null,
      title: 'Adopt ROS2 for Lidar Rover Control',
      description: 'Standardize lidar nodes on ROS2',
      context_reason: 'Hardware compatibility',
      status: 'accepted',
      supersedes_id: null,
      superseded_by_id: null,
      created_by: 'user-1',
      decided_at: '2026-10-12T00:00:00.000Z',
      created_at: '2026-10-12T00:00:00.000Z',
      updated_at: '2026-10-12T00:00:00.000Z',
    },
    {
      id: 'dec-secret',
      project_id: 'proj-secret',
      meeting_id: null,
      task_id: null,
      milestone_id: null,
      title: 'Secret ROS2 Lidar Architecture',
      description: 'Unauthorized decision',
      context_reason: null,
      status: 'accepted',
      supersedes_id: null,
      superseded_by_id: null,
      created_by: 'user-99',
      decided_at: '2026-10-12T00:00:00.000Z',
      created_at: '2026-10-12T00:00:00.000Z',
      updated_at: '2026-10-12T00:00:00.000Z',
    },
  ];

  const resources: ResourceWithDetails[] = [
    {
      id: 'res-1',
      project_id: 'proj-member',
      milestone_id: null,
      title: 'Lidar Wiring Diagram',
      description: 'Pinout reference PDF',
      resource_type: 'file_upload',
      category: 'design',
      custom_category: null,
      external_url: null,
      storage_path: 'proj-member/res-1/wiring.pdf',
      file_name: 'wiring.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 12000,
      created_by: 'user-1',
      created_at: '2026-10-15T00:00:00.000Z',
      updated_at: '2026-10-15T00:00:00.000Z',
    },
    {
      id: 'res-secret',
      project_id: 'proj-secret',
      milestone_id: null,
      title: 'Secret Lidar Blueprint',
      description: 'Unauthorized file',
      resource_type: 'file_upload',
      category: 'design',
      custom_category: null,
      external_url: null,
      storage_path: 'proj-secret/res-secret/secret.pdf',
      file_name: 'secret.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 12000,
      created_by: 'user-99',
      created_at: '2026-10-15T00:00:00.000Z',
      updated_at: '2026-10-15T00:00:00.000Z',
    },
  ];

  it('strictly excludes tasks, milestones, decisions, and resources from unauthorized projects', () => {
    const results = filterAuthorizedSearchResults({
      query: 'lidar',
      scope: 'all',
      authorizedProjects,
      tasks,
      milestones,
      decisions,
      resources,
    });

    expect(results).toHaveLength(4);
    expect(results.every((r) => r.projectId === 'proj-member')).toBe(true);
    expect(results.some((r) => r.projectId === 'proj-secret')).toBe(false);
    expect(results.map((r) => r.id).sort()).toEqual([
      'decision:dec-1',
      'milestone:ms-1',
      'resource:res-1',
      'task:task-1',
    ]);
  });

  it('filters by entity scope when specified', () => {
    const decisionResults = filterAuthorizedSearchResults({
      query: 'ros2',
      scope: 'decisions',
      authorizedProjects,
      tasks,
      milestones,
      decisions,
      resources,
    });

    expect(decisionResults).toHaveLength(1);
    expect(decisionResults[0]?.id).toBe('decision:dec-1');
    expect(decisionResults[0]?.entityType).toBe('decision');
  });

  it('returns empty array for empty or whitespace-only queries', () => {
    const results = filterAuthorizedSearchResults({
      query: '   ',
      scope: 'all',
      authorizedProjects,
      tasks,
      milestones,
      decisions,
      resources,
    });

    expect(results).toEqual([]);
  });
});
