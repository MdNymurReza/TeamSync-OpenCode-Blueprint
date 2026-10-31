import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import ProjectPhasesScreen from '@/../app/projects/[id]/phases';
import { playbooksService } from '@/features/playbooks';
import { projectsService } from '@/features/projects';

jest.mock('@/features/projects', () => ({
  projectsService: {
    fetchProjectDetails: jest.fn(),
  },
}));

jest.mock('@/features/playbooks', () => {
  const actual = jest.requireActual('@/features/playbooks');
  return {
    ...actual,
    playbooksService: {
      getProjectPhases: jest.fn(),
      createPhase: jest.fn(),
      updatePhase: jest.fn(),
      togglePhaseCompletion: jest.fn(),
      deletePhase: jest.fn(),
      reorderPhases: jest.fn(),
      applyPlaybookTemplate: jest.fn(),
    },
  };
});

// Mock expo-router
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'proj-123' }),
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

describe('ProjectPhasesScreen (Phase 4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockProjectAdmin = {
    id: 'proj-123',
    name: 'CS50 Final Project',
    project_type: 'software_project' as const,
    currentUserRole: 'owner' as const,
    is_archived: false,
    created_by: 'owner-id',
    created_at: '2026-10-30T00:00:00Z',
    updated_at: '2026-10-30T00:00:00Z',
    course_code: null,
    department: null,
    description: null,
    semester: null,
    target_date: null,
  };

  const mockPhases = [
    {
      id: 'phase-1',
      project_id: 'proj-123',
      name: 'Requirements Breakdown',
      description: 'Scope and problem specification',
      sequence_order: 0,
      is_completed: true,
      created_at: '2026-10-30T00:00:00Z',
      updated_at: '2026-10-30T00:00:00Z',
    },
    {
      id: 'phase-2',
      project_id: 'proj-123',
      name: 'MVP Implementation',
      description: 'Build core feature prototype',
      sequence_order: 1,
      is_completed: false,
      created_at: '2026-10-30T00:00:00Z',
      updated_at: '2026-10-30T00:00:00Z',
    },
  ];

  it('renders header, completion progress, and phase items', async () => {
    (projectsService.fetchProjectDetails as jest.Mock).mockResolvedValueOnce({
      data: mockProjectAdmin,
      error: null,
    });
    (playbooksService.getProjectPhases as jest.Mock).mockResolvedValueOnce({
      data: mockPhases,
      error: null,
    });

    await render(<ProjectPhasesScreen />);

    expect(await screen.findByRole('header', { name: 'Workflow & Phases' })).toBeTruthy();
    expect(screen.getByText('CS50 Final Project')).toBeTruthy();
    expect(screen.getByText('50% Complete')).toBeTruthy();
    expect(screen.getByText('1 of 2 phases completed')).toBeTruthy();
    expect(screen.getByText('Requirements Breakdown')).toBeTruthy();
    expect(screen.getByText('MVP Implementation')).toBeTruthy();
  });

  it('shows empty state when no phases exist and owner can trigger templates', async () => {
    (projectsService.fetchProjectDetails as jest.Mock).mockResolvedValueOnce({
      data: mockProjectAdmin,
      error: null,
    });
    (playbooksService.getProjectPhases as jest.Mock).mockResolvedValueOnce({
      data: [],
      error: null,
    });

    await render(<ProjectPhasesScreen />);

    expect(await screen.findByText('No phases yet')).toBeTruthy();
    expect(screen.getByText('Apply Playbook')).toBeTruthy();
  });

  it('allows owner to toggle phase completion', async () => {
    (projectsService.fetchProjectDetails as jest.Mock).mockResolvedValueOnce({
      data: mockProjectAdmin,
      error: null,
    });
    (playbooksService.getProjectPhases as jest.Mock).mockResolvedValueOnce({
      data: mockPhases,
      error: null,
    });
    (playbooksService.togglePhaseCompletion as jest.Mock).mockResolvedValueOnce({
      data: { ...mockPhases[1], is_completed: true },
      error: null,
    });

    await render(<ProjectPhasesScreen />);

    const checkbox = await screen.findByLabelText(
      'Mark phase MVP Implementation as complete'
    );
    fireEvent.press(checkbox);

    await waitFor(() => {
      expect(playbooksService.togglePhaseCompletion).toHaveBeenCalledWith('phase-2', true);
    });
  });

  it('displays read-only notice when user is a standard member', async () => {
    const mockProjectMember = {
      ...mockProjectAdmin,
      currentUserRole: 'member' as const,
    };
    (projectsService.fetchProjectDetails as jest.Mock).mockResolvedValueOnce({
      data: mockProjectMember,
      error: null,
    });
    (playbooksService.getProjectPhases as jest.Mock).mockResolvedValueOnce({
      data: mockPhases,
      error: null,
    });

    await render(<ProjectPhasesScreen />);

    expect(
      await screen.findByText(/Phases are managed by project owners and admins\./)
    ).toBeTruthy();
    expect(screen.queryByText('Add Phase')).toBeNull();
  });
});
