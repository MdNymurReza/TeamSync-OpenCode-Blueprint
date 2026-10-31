import { projectsService } from '@/features/projects';
import { supabase } from '@/lib/supabase/client';

jest.mock('@/lib/supabase/client', () => {
  const mockRpc = jest.fn();
  const mockFrom = jest.fn();
  const mockAuth = {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@student.edu' } },
      error: null,
    }),
  };

  return {
    isSupabaseConfigured: true,
    supabase: {
      auth: mockAuth,
      rpc: mockRpc,
      from: mockFrom,
    },
  };
});

describe('projectsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProject', () => {
    it('calls create_project_with_owner RPC with input parameters', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: 'new-proj-id',
        error: null,
      });

      const res = await projectsService.createProject({
        name: 'Capstone 2026',
        description: 'AI Autonomous Systems',
        project_type: 'fyp_capstone',
        course_code: 'ENG400',
        semester: 'Fall 2026',
      });

      expect(supabase.rpc).toHaveBeenCalledWith('create_project_with_owner', {
        p_name: 'Capstone 2026',
        p_description: 'AI Autonomous Systems',
        p_project_type: 'fyp_capstone',
        p_course_code: 'ENG400',
        p_semester: 'Fall 2026',
        p_target_date: null,
      });
      expect(res.data).toBe('new-proj-id');
      expect(res.error).toBeNull();
    });

    it('gracefully recovers via direct insert if RPC throws unique_project_member constraint error', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'duplicate key value violates unique constraint "unique_project_member"' },
      });

      const mockSingle = jest.fn().mockResolvedValue({
        data: { id: 'fallback-proj-id' },
        error: null,
      });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'projects') {
          return { insert: mockInsert };
        }
        if (table === 'project_members') {
          return { upsert: mockUpsert };
        }
        return {};
      });

      const res = await projectsService.createProject({
        name: 'Autonomous Drone Team',
        project_type: 'software_project',
      });

      expect(res.data).toBe('fallback-proj-id');
      expect(res.error).toBeNull();
      expect(mockInsert).toHaveBeenCalled();
      expect(mockUpsert).toHaveBeenCalledWith(
        {
          project_id: 'fallback-proj-id',
          user_id: 'test-user-id',
          role: 'owner',
        },
        { onConflict: 'project_id,user_id' }
      );
    });
  });

  describe('redeemInvitation', () => {
    it('calls redeem_invitation RPC with uppercase cleaned code', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: 'proj-123',
        error: null,
      });

      const res = await projectsService.redeemInvitation('abc123');

      expect(supabase.rpc).toHaveBeenCalledWith('redeem_invitation', {
        p_invitation_code: 'ABC123',
      });
      expect(res.data).toBe('proj-123');
    });
  });

  describe('leaveProject', () => {
    it('calls leave_project RPC with project ID', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        error: null,
      });

      const res = await projectsService.leaveProject('proj-123');

      expect(supabase.rpc).toHaveBeenCalledWith('leave_project', {
        p_project_id: 'proj-123',
      });
      expect(res.error).toBeNull();
    });
  });
});
