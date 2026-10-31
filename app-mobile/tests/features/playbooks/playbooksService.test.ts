import { playbooksService } from '@/features/playbooks';
import { supabase } from '@/lib/supabase/client';

jest.mock('@/lib/supabase/client', () => {
  const mockRpc = jest.fn();
  const mockFrom = jest.fn();

  return {
    isSupabaseConfigured: true,
    supabase: {
      rpc: mockRpc,
      from: mockFrom,
    },
  };
});

describe('playbooksService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProjectPhases', () => {
    it('fetches phases ordered by sequence_order', async () => {
      const mockOrder = jest.fn().mockResolvedValueOnce({
        data: [
          { id: 'p1', name: 'Phase 1', sequence_order: 0, is_completed: true },
          { id: 'p2', name: 'Phase 2', sequence_order: 1, is_completed: false },
        ],
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      const res = await playbooksService.getProjectPhases('proj-123');

      expect(supabase.from).toHaveBeenCalledWith('project_phases');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('project_id', 'proj-123');
      expect(mockOrder).toHaveBeenCalledWith('sequence_order', { ascending: true });
      expect(res.data).toHaveLength(2);
      expect(res.error).toBeNull();
    });
  });

  describe('createPhase', () => {
    it('creates a phase and auto-increments sequence_order if none provided', async () => {
      // Mock highest order fetch
      const mockLimit = jest.fn().mockResolvedValueOnce({
        data: [{ sequence_order: 2 }],
      });
      const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelectExisting = jest.fn().mockReturnValue({ eq: mockEq });

      // Mock insert
      const mockSingle = jest.fn().mockResolvedValueOnce({
        data: {
          id: 'new-phase-id',
          project_id: 'proj-123',
          name: 'Testing Phase',
          sequence_order: 3,
          is_completed: false,
        },
        error: null,
      });
      const mockSelectInserted = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelectInserted });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce({ select: mockSelectExisting })
        .mockReturnValueOnce({ insert: mockInsert });

      const res = await playbooksService.createPhase('proj-123', {
        name: 'Testing Phase',
      });

      expect(mockInsert).toHaveBeenCalledWith({
        project_id: 'proj-123',
        name: 'Testing Phase',
        description: null,
        sequence_order: 3,
      });
      expect(res.data?.id).toBe('new-phase-id');
      expect(res.error).toBeNull();
    });
  });

  describe('updatePhase', () => {
    it('updates phase properties', async () => {
      const mockSingle = jest.fn().mockResolvedValueOnce({
        data: { id: 'p1', name: 'Updated Name', is_completed: true },
        error: null,
      });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const res = await playbooksService.updatePhase('p1', {
        name: 'Updated Name',
        is_completed: true,
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        name: 'Updated Name',
        is_completed: true,
      });
      expect(mockEq).toHaveBeenCalledWith('id', 'p1');
      expect(res.data?.name).toBe('Updated Name');
    });
  });

  describe('deletePhase', () => {
    it('deletes phase by id', async () => {
      const mockEq = jest.fn().mockResolvedValueOnce({ error: null });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as jest.Mock).mockReturnValue({ delete: mockDelete });

      const res = await playbooksService.deletePhase('p1');

      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'p1');
      expect(res.error).toBeNull();
    });
  });

  describe('reorderPhases', () => {
    it('calls reorder_project_phases RPC with ordered IDs', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const res = await playbooksService.reorderPhases('proj-123', ['p2', 'p1', 'p3']);

      expect(supabase.rpc).toHaveBeenCalledWith('reorder_project_phases', {
        p_project_id: 'proj-123',
        p_phase_ids: ['p2', 'p1', 'p3'],
      });
      expect(res.error).toBeNull();
    });
  });

  describe('applyPlaybookTemplate', () => {
    it('calls seed_project_phases RPC with template type', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const res = await playbooksService.applyPlaybookTemplate('proj-123', 'software_project');

      expect(supabase.rpc).toHaveBeenCalledWith('seed_project_phases', {
        p_project_id: 'proj-123',
        p_template_type: 'software_project',
      });
      expect(res.error).toBeNull();
    });
  });
});
