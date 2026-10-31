import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import ProjectResourcesScreen from '@/../app/projects/[id]/resources';
import { projectsService } from '@/features/projects';
import { milestonesService } from '@/features/milestones';
import { resourcesService } from '@/features/resources';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'proj-1' }),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'student@uni.edu' },
    profile: { id: 'user-1', full_name: 'Student One' },
    isConfigured: true,
  }),
}));

jest.mock('@/features/projects', () => ({
  projectsService: {
    fetchProjectDetails: jest.fn(),
  },
}));

jest.mock('@/features/milestones', () => ({
  milestonesService: {
    fetchProjectMilestones: jest.fn(),
  },
}));

jest.mock('@/features/resources', () => {
  const actual = jest.requireActual('@/features/resources');
  return {
    ...actual,
    resourcesService: {
      fetchProjectResources: jest.fn(),
      createExternalResource: jest.fn(),
      uploadFileResource: jest.fn(),
      createSignedDownloadUrl: jest.fn(),
      deleteResource: jest.fn(),
    },
  };
});

describe('ProjectResourcesScreen', () => {
  const mockProject = {
    id: 'proj-1',
    name: 'Autonomous Rover Capstone',
    description: 'Robotics team workspace',
    course_code: 'ME490',
    semester: 'Fall 2026',
    project_type: 'fyp_capstone' as const,
    target_date: null,
    is_archived: false,
    created_by: 'user-1',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    currentUserRole: 'owner' as const,
  };

  const mockResources = [
    {
      id: 'res-1',
      project_id: 'proj-1',
      milestone_id: null,
      title: 'Rover Firmware GitHub Repo',
      description: 'Main embedded C++ repository',
      category: 'code' as const,
      custom_category: null,
      resource_type: 'external_link' as const,
      external_url: 'https://github.com/uni-robotics/rover-firmware',
      storage_path: null,
      file_name: null,
      mime_type: null,
      file_size_bytes: null,
      created_by: 'user-1',
      created_at: '2026-10-31T10:00:00Z',
      updated_at: '2026-10-31T10:00:00Z',
      author: {
        id: 'user-1',
        full_name: 'Student One',
        email: 'student@uni.edu',
        avatar_url: null,
        university: null,
        department: null,
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
      },
      milestone: null,
    },
    {
      id: 'res-2',
      project_id: 'proj-1',
      milestone_id: null,
      title: 'Sensor Calibration Dataset',
      description: 'LIDAR calibration CSV measurements',
      category: 'datasets' as const,
      custom_category: null,
      resource_type: 'file_upload' as const,
      external_url: null,
      storage_path: 'proj-1/1700000000_lidar_cal.csv',
      file_name: 'lidar_cal.csv',
      mime_type: 'text/csv',
      file_size_bytes: 4096,
      created_by: 'user-1',
      created_at: '2026-10-31T10:05:00Z',
      updated_at: '2026-10-31T10:05:00Z',
      author: null,
      milestone: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (projectsService.fetchProjectDetails as jest.Mock).mockResolvedValue({
      data: mockProject,
      error: null,
    });
    (milestonesService.fetchProjectMilestones as jest.Mock).mockResolvedValue({
      data: [],
      error: null,
    });
    (resourcesService.fetchProjectResources as jest.Mock).mockResolvedValue({
      data: mockResources,
      error: null,
    });
  });

  it('renders Resource Hub header, external link card, and private file upload card', async () => {
    await render(<ProjectResourcesScreen />);

    expect(await screen.findByRole('header', { name: 'Resource Hub' })).toBeTruthy();
    expect(screen.getByText('Rover Firmware GitHub Repo')).toBeTruthy();
    expect(screen.getByText('Sensor Calibration Dataset')).toBeTruthy();
    expect(screen.getByText('lidar_cal.csv • 4.0 KB')).toBeTruthy();
  });

  it('requests a signed download URL when Download (Signed URL) is pressed on a private file', async () => {
    (resourcesService.createSignedDownloadUrl as jest.Mock).mockResolvedValue({
      data: {
        signedUrl: 'https://supabase.example/sign/proj-1/1700000000_lidar_cal.csv',
        expiresInSeconds: 3600,
      },
      error: null,
    });

    await render(<ProjectResourcesScreen />);

    const downloadBtn = await screen.findByRole('button', {
      name: 'Download private file Sensor Calibration Dataset',
    });
    await fireEvent.press(downloadBtn);

    await waitFor(() => {
      expect(resourcesService.createSignedDownloadUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'res-2',
          storage_path: 'proj-1/1700000000_lidar_cal.csv',
        }),
        'proj-1'
      );
    });
  });

  it('opens the Add Link modal and creates a new external resource', async () => {
    (resourcesService.createExternalResource as jest.Mock).mockResolvedValue({
      data: { id: 'res-3', title: 'Google Drive Folder' },
      error: null,
    });

    await render(<ProjectResourcesScreen />);

    const addLinkBtn = await screen.findByRole('button', {
      name: 'Add external link resource',
    });
    await fireEvent.press(addLinkBtn);

    const titleInput = await screen.findByPlaceholderText(
      'e.g. GitHub Repository or Figma Wireframes'
    );
    await fireEvent.changeText(titleInput, 'Google Drive Folder');

    const urlInput = screen.getByPlaceholderText('https://github.com/team/project');
    await fireEvent.changeText(urlInput, 'https://drive.google.com/drive/folders/123');

    await fireEvent.press(screen.getByRole('button', { name: 'Save Resource Link' }));

    await waitFor(() => {
      expect(resourcesService.createExternalResource).toHaveBeenCalledWith(
        'proj-1',
        expect.objectContaining({
          title: 'Google Drive Folder',
          external_url: 'https://drive.google.com/drive/folders/123',
        })
      );
    });
  });

  it('opens the Upload File modal and uploads a private project file', async () => {
    (resourcesService.uploadFileResource as jest.Mock).mockResolvedValue({
      data: { id: 'res-4', title: 'Architecture Notes' },
      error: null,
    });

    await render(<ProjectResourcesScreen />);

    const uploadBtn = await screen.findByRole('button', {
      name: 'Upload private project file',
    });
    await fireEvent.press(uploadBtn);

    const titleInput = await screen.findByPlaceholderText(
      'e.g. Lab Experiment Dataset or Design Notes'
    );
    await fireEvent.changeText(titleInput, 'Architecture Notes');

    const contentInput = screen.getByPlaceholderText(
      'Paste or type document/dataset contents to store in private bucket...'
    );
    await fireEvent.changeText(contentInput, '# Rover Architecture\nAll sensors on CAN bus.');

    await fireEvent.press(screen.getByRole('button', { name: 'Upload File' }));

    await waitFor(() => {
      expect(resourcesService.uploadFileResource).toHaveBeenCalledWith(
        'proj-1',
        expect.objectContaining({
          title: 'Architecture Notes',
          fileName: 'architecture-notes.md',
          mimeType: 'text/markdown',
          content: '# Rover Architecture\nAll sensors on CAN bus.',
        })
      );
    });
  });
});

