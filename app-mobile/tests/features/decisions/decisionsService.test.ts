import {
  decisionsService,
  linkDecisionLineage,
  validateDecisionMutation,
} from '@/features/decisions';
import { supabase } from '@/lib/supabase/client';

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('decisionsService & decision history protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateDecisionMutation (immutability of accepted decisions)', () => {
    const acceptedDecision = {
      id: 'dec-1',
      status: 'accepted' as const,
      title: 'Use PostgreSQL RLS',
      description: 'All tenant isolation enforced in database policies.',
      context_reason: 'Client is untrusted.',
    };

    it('blocks deleting an accepted or superseded decision', () => {
      const delAccepted = validateDecisionMutation(acceptedDecision, 'delete');
      expect(delAccepted.allowed).toBe(false);
      expect(delAccepted.error).toContain('cannot be deleted');

      const delSuperseded = validateDecisionMutation(
        { ...acceptedDecision, status: 'superseded' },
        'delete'
      );
      expect(delSuperseded.allowed).toBe(false);
    });

    it('allows deleting a proposed or rejected decision', () => {
      expect(
        validateDecisionMutation(
          { ...acceptedDecision, status: 'proposed' },
          'delete'
        ).allowed
      ).toBe(true);
      expect(
        validateDecisionMutation(
          { ...acceptedDecision, status: 'rejected' },
          'delete'
        ).allowed
      ).toBe(true);
    });

    it('blocks overwriting title, description, or rationale of an accepted decision', () => {
      const res = validateDecisionMutation(acceptedDecision, 'update', {
        title: 'Changed title silently',
      });
      expect(res.allowed).toBe(false);
      expect(res.error).toContain('cannot be overwritten');
    });

    it('allows transitioning an accepted decision to superseded', () => {
      const res = validateDecisionMutation(acceptedDecision, 'update', {
        status: 'superseded',
      });
      expect(res.allowed).toBe(true);
    });
  });

  describe('linkDecisionLineage', () => {
    it('resolves supersedes and superseded_by references across decisions', () => {
      const raw = [
        {
          id: 'dec-2',
          project_id: 'proj-1',
          title: 'Use Supabase Storage with signed URLs',
          description: 'Updated policy with 1-hour expiry.',
          context_reason: 'Tighter security',
          status: 'accepted' as const,
          decided_at: '2026-11-12T10:00:00Z',
          meeting_id: null,
          task_id: null,
          milestone_id: null,
          supersedes_id: 'dec-1',
          superseded_by_id: null,
          created_by: 'user-1',
          created_at: '2026-11-12T10:00:00Z',
          updated_at: '2026-11-12T10:00:00Z',
        },
        {
          id: 'dec-1',
          project_id: 'proj-1',
          title: 'Use Supabase Storage',
          description: 'Initial storage decision.',
          context_reason: null,
          status: 'superseded' as const,
          decided_at: '2026-11-01T10:00:00Z',
          meeting_id: null,
          task_id: null,
          milestone_id: null,
          supersedes_id: null,
          superseded_by_id: 'dec-2',
          created_by: 'user-1',
          created_at: '2026-11-01T10:00:00Z',
          updated_at: '2026-11-12T10:00:00Z',
        },
      ];

      const linked = linkDecisionLineage(raw);
      const newer = linked.find((d) => d.id === 'dec-2');
      const older = linked.find((d) => d.id === 'dec-1');

      expect(newer?.supersedes?.id).toBe('dec-1');
      expect(newer?.supersedes?.title).toBe('Use Supabase Storage');
      expect(older?.superseded_by?.id).toBe('dec-2');
      expect(older?.superseded_by?.title).toBe(
        'Use Supabase Storage with signed URLs'
      );
    });
  });

  describe('supersedeDecision', () => {
    it('creates a new accepted decision and marks the prior decision as superseded', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-1' } },
      });

      const createdDecision = {
        id: 'dec-new',
        project_id: 'proj-1',
        title: 'Architecture v2',
        description: 'Updated architecture',
        context_reason: 'Scalability',
        status: 'accepted',
        supersedes_id: 'dec-old',
        superseded_by_id: null,
        decided_at: '2026-11-15T10:00:00Z',
        meeting_id: null,
        task_id: null,
        milestone_id: null,
        created_by: 'user-1',
        created_at: '2026-11-15T10:00:00Z',
        updated_at: '2026-11-15T10:00:00Z',
      };

      const singleInsertMock = jest.fn().mockResolvedValue({
        data: createdDecision,
        error: null,
      });
      const selectInsertMock = jest.fn().mockReturnValue({ single: singleInsertMock });
      const insertMock = jest.fn().mockReturnValue({ select: selectInsertMock });

      const eqUpdateMock = jest.fn().mockResolvedValue({ error: null });
      const updateMock = jest.fn().mockReturnValue({ eq: eqUpdateMock });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: insertMock,
        update: updateMock,
      });

      const res = await decisionsService.supersedeDecision(
        {
          id: 'dec-old',
          project_id: 'proj-1',
          status: 'accepted',
          title: 'Architecture v1',
          description: 'Initial architecture',
          context_reason: null,
          meeting_id: null,
          task_id: null,
          milestone_id: null,
        },
        {
          title: 'Architecture v2',
          description: 'Updated architecture',
          context_reason: 'Scalability',
        }
      );

      expect(res.error).toBeNull();
      expect(res.data?.newDecision.id).toBe('dec-new');
      expect(res.data?.supersededDecisionId).toBe('dec-old');
      expect(updateMock).toHaveBeenCalledWith({
        status: 'superseded',
        superseded_by_id: 'dec-new',
      });
    });
  });
});

