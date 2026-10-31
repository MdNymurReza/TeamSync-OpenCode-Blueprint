import {
  formatMeetingDateTime,
  meetingsService,
  parseMeetingTimestamp,
  validateMeetingTimeRange,
} from '@/features/meetings';
import { supabase } from '@/lib/supabase/client';
import { tasksService } from '@/features/tasks';

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock('@/features/tasks', () => ({
  tasksService: {
    createTask: jest.fn(),
  },
}));

describe('meetingsService & timezone/idempotency domain helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseMeetingTimestamp (timezone & ISO handling)', () => {
    it('parses YYYY-MM-DD and 24-hour HH:MM into canonical UTC ISO string', () => {
      const res = parseMeetingTimestamp('2026-11-15', '14:30');
      expect(res.error).toBeNull();
      expect(res.iso).toBe('2026-11-15T14:30:00.000Z');
    });

    it('normalizes an ISO string with explicit timezone offset (+06:00) into UTC', () => {
      const res = parseMeetingTimestamp('2026-11-15T18:00:00+06:00');
      expect(res.error).toBeNull();
      expect(res.iso).toBe('2026-11-15T12:00:00.000Z');
    });

    it('defaults date-only input to 09:00 UTC', () => {
      const res = parseMeetingTimestamp('2026-11-20');
      expect(res.error).toBeNull();
      expect(res.iso).toBe('2026-11-20T09:00:00.000Z');
    });

    it('rejects invalid calendar dates or malformed times', () => {
      expect(parseMeetingTimestamp('2026-02-30', '10:00').error).toBeTruthy();
      expect(parseMeetingTimestamp('2026-11-15', '25:99').error).toBeTruthy();
      expect(parseMeetingTimestamp('').error).toBeTruthy();
    });
  });

  describe('validateMeetingTimeRange & formatMeetingDateTime', () => {
    it('rejects end time earlier than start time', () => {
      const check = validateMeetingTimeRange(
        '2026-11-15T14:00:00.000Z',
        '2026-11-15T13:00:00.000Z'
      );
      expect(check.valid).toBe(false);
      expect(check.error).toContain('cannot be earlier');
    });

    it('accepts valid time range or open-ended meeting', () => {
      expect(
        validateMeetingTimeRange(
          '2026-11-15T14:00:00.000Z',
          '2026-11-15T15:00:00.000Z'
        ).valid
      ).toBe(true);
      expect(validateMeetingTimeRange('2026-11-15T14:00:00.000Z', null).valid).toBe(
        true
      );
    });

    it('formats UTC date/time deterministically', () => {
      expect(formatMeetingDateTime('2026-11-15T14:30:00.000Z')).toBe(
        '2026-11-15 • 14:30 UTC'
      );
    });
  });

  describe('convertActionItemToTask (idempotency)', () => {
    it('returns existing converted_task_id immediately without creating duplicate task', async () => {
      const res = await meetingsService.convertActionItemToTask({
        id: 'ai-1',
        meeting_id: 'mtg-1',
        project_id: 'proj-1',
        title: 'Write API spec',
        assignee_id: 'user-1',
        due_date: null,
        converted_task_id: 'task-existing-99',
      });

      expect(res.error).toBeNull();
      expect(res.data).toEqual({
        taskId: 'task-existing-99',
        alreadyConverted: true,
      });
      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(tasksService.createTask).not.toHaveBeenCalled();
    });

    it('detects concurrent conversion from database check and avoids duplicate task creation', async () => {
      const singleMock = jest.fn().mockResolvedValue({
        data: { converted_task_id: 'task-concurrent-42' },
        error: null,
      });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

      const res = await meetingsService.convertActionItemToTask({
        id: 'ai-2',
        meeting_id: 'mtg-1',
        project_id: 'proj-1',
        title: 'Prepare demo slides',
        assignee_id: null,
        due_date: null,
        converted_task_id: null,
      });

      expect(res.error).toBeNull();
      expect(res.data).toEqual({
        taskId: 'task-concurrent-42',
        alreadyConverted: true,
      });
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('calls convert_action_item_to_task RPC when not yet converted', async () => {
      const singleMock = jest.fn().mockResolvedValue({
        data: { converted_task_id: null },
        error: null,
      });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: 'task-created-101',
        error: null,
      });

      const res = await meetingsService.convertActionItemToTask({
        id: 'ai-3',
        meeting_id: 'mtg-1',
        project_id: 'proj-1',
        title: 'Set up test harness',
        assignee_id: 'user-2',
        due_date: '2026-11-20T17:00:00.000Z',
        converted_task_id: null,
      });

      expect(res.error).toBeNull();
      expect(res.data).toEqual({
        taskId: 'task-created-101',
        alreadyConverted: false,
      });
      expect(supabase.rpc).toHaveBeenCalledWith('convert_action_item_to_task', {
        p_action_item_id: 'ai-3',
      });
    });
  });
});

