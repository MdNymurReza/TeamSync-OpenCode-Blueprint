import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import HomeScreen from '@/../app/(tabs)/index';
import { useAuth } from '@/features/auth';
import { milestonesService } from '@/features/milestones';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('@/features/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/milestones', () => ({
  milestonesService: {
    fetchDashboardSummary: jest.fn(),
  },
}));

describe('HomeScreen (Phase 6 Authoritative Dashboard)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      profile: null,
      isConfigured: false,
    });
    (milestonesService.fetchDashboardSummary as jest.Mock).mockResolvedValue({
      data: null,
      error: null,
    });
  });

  it('renders greeting header and upcoming tasks empty state when unconfigured or no tasks exist', async () => {
    await render(<HomeScreen />);

    expect(await screen.findByRole('header', { name: 'Welcome to MelBond' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Upcoming Tasks' })).toBeTruthy();
    expect(screen.getByText('No tasks scheduled yet')).toBeTruthy();
    expect(screen.queryByText('Phase 1 Active')).toBeNull();
  });

  it('quick actions route to real create/join/browse flows (no dead buttons)', async () => {
    await render(<HomeScreen />);

    const createBtn = await screen.findByRole('button', { name: 'Create a new workspace' });
    await fireEvent.press(createBtn);
    expect(mockPush).toHaveBeenCalledWith('/projects/new');

    await fireEvent.press(
      screen.getByRole('button', { name: 'Join a workspace with an invitation code' })
    );
    expect(mockPush).toHaveBeenCalledWith('/projects/join');

    await fireEvent.press(screen.getByRole('button', { name: 'Browse all workspaces' }));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/projects');

    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('renders authoritative workspace pulse, assigned tasks, and upcoming milestones when signed in', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-1', email: 'alex@uni.edu' },
      profile: { id: 'user-1', full_name: 'Alex Rivera' },
      isConfigured: true,
    });

    (milestonesService.fetchDashboardSummary as jest.Mock).mockResolvedValueOnce({
      data: {
        activeProjectCount: 2,
        totalTasksCount: 10,
        completedTasksCount: 6,
        overallTaskProgressPercent: 60,
        myAssignedTasks: [
          {
            id: 'task-101',
            project_id: 'proj-1',
            projectName: 'AI Research Group',
            isOverdue: false,
            phase_id: null,
            milestone_id: 'ms-1',
            title: 'Submit IRB Ethics Form',
            description: null,
            status: 'in_progress',
            priority: 'urgent',
            due_date: '2026-11-12T00:00:00.000Z',
            primary_assignee_id: 'user-1',
            created_by: 'user-1',
            is_archived: false,
            completed_at: null,
            created_at: '2026-10-01T00:00:00.000Z',
            updated_at: '2026-10-01T00:00:00.000Z',
            primary_assignee: null,
            phase: null,
            collaborators: [],
            checklist_total: 0,
            checklist_completed: 0,
            comments_count: 0,
          },
        ],
        overdueTasks: [
          {
            id: 'task-102',
            project_id: 'proj-1',
            projectName: 'AI Research Group',
            isOverdue: true,
            phase_id: null,
            milestone_id: null,
            title: 'Overdue Task',
            description: null,
            status: 'todo',
            priority: 'high',
            due_date: '2026-10-15T00:00:00.000Z',
            primary_assignee_id: 'user-2',
            created_by: 'user-1',
            is_archived: false,
            completed_at: null,
            created_at: '2026-10-01T00:00:00.000Z',
            updated_at: '2026-10-01T00:00:00.000Z',
            primary_assignee: null,
            phase: null,
            collaborators: [],
            checklist_total: 0,
            checklist_completed: 0,
            comments_count: 0,
          },
        ],
        upcomingMilestones: [
          {
            id: 'ms-1',
            project_id: 'proj-1',
            projectName: 'AI Research Group',
            phase_id: null,
            title: 'Dataset v1 Release',
            description: null,
            target_date: '2026-11-04T00:00:00.000Z',
            status: 'in_progress',
            progress_mode: 'auto',
            manual_progress: 0,
            sequence_order: 0,
            created_by: 'user-1',
            created_at: '2026-10-01T00:00:00.000Z',
            updated_at: '2026-10-01T00:00:00.000Z',
            phase: null,
            linkedTasks: [],
            totalTasks: 4,
            completedTasks: 3,
            progressPercent: 75,
            effectiveStatus: 'in_progress',
            isOverdue: false,
            hasDeadlineRisk: true,
          },
        ],
      },
      error: null,
    });

    await render(<HomeScreen />);

    expect(await screen.findByRole('header', { name: /Alex/ })).toBeTruthy();
    expect(screen.getByText('2 Active Workspaces')).toBeTruthy();
    expect(screen.getByText('60% Complete')).toBeTruthy();
    expect(screen.getByText('6/10 tasks done')).toBeTruthy();
    expect(screen.getByText('1 Overdue')).toBeTruthy();
    expect(screen.getByText('Task Distribution Graph')).toBeTruthy();
    expect(screen.getByTestId('stacked-status-chart')).toBeTruthy();
    expect(screen.getByText('Submit IRB Ethics Form')).toBeTruthy();
    expect(screen.getByText('Dataset v1 Release')).toBeTruthy();
    expect(screen.getByText('At Risk')).toBeTruthy();

    // Open the Full Project Report Modal and verify all report graphs & sections
    const reportBtn = screen.getByTestId('open-project-report-button');
    await fireEvent.press(reportBtn);

    expect(await screen.findByTestId('full-project-report-modal')).toBeTruthy();
    expect(screen.getByText('All Active Workspaces Report')).toBeTruthy();
    expect(screen.getByText('Task Status Breakdown Chart')).toBeTruthy();
    expect(screen.getByTestId('report-status-chart')).toBeTruthy();
    expect(screen.getByText('Priority & Urgency Graph')).toBeTruthy();
    expect(screen.getByTestId('report-priority-chart')).toBeTruthy();
    expect(screen.getByText('Milestones & Governance Snapshot')).toBeTruthy();
  });
});
