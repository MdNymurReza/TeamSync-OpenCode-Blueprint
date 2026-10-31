import { tasksService } from '@/features/tasks';
import { supabase } from '@/lib/supabase/client';

jest.mock('@/lib/supabase/client', () => {
  const mockFrom = jest.fn();
  const mockAuth = {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'user-123', email: 'student@uni.edu' } },
      error: null,
    }),
  };

  return {
    isSupabaseConfigured: true,
    supabase: {
      auth: mockAuth,
      from: mockFrom,
    },
  };
});

describe('tasksService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchProjectTasks', () => {
    it('fetches tasks and computes checklist and comment metrics', async () => {
      const mockOrder = jest.fn().mockResolvedValueOnce({
        data: [
          {
            id: 't1',
            title: 'Task 1',
            status: 'todo',
            priority: 'medium',
            checklist: [{ id: 'c1', is_completed: true }, { id: 'c2', is_completed: false }],
            comments: [{ id: 'cm1' }],
          },
        ],
        error: null,
      });
      const mockEq2 = jest.fn().mockReturnValue({ order: mockOrder });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      const res = await tasksService.fetchProjectTasks('proj-123');

      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(mockEq1).toHaveBeenCalledWith('project_id', 'proj-123');
      expect(res.data).toHaveLength(1);
      expect(res.data?.[0]?.checklist_total).toBe(2);
      expect(res.data?.[0]?.checklist_completed).toBe(1);
      expect(res.data?.[0]?.comments_count).toBe(1);
    });

    it('filters overdue tasks when overdueOnly is specified', async () => {
      const pastDate = '2026-01-01T00:00:00Z';
      const futureDate = '2099-01-01T00:00:00Z';

      const mockOrder = jest.fn().mockResolvedValueOnce({
        data: [
          { id: 't1', title: 'Overdue Task', status: 'in_progress', due_date: pastDate },
          { id: 't2', title: 'Future Task', status: 'in_progress', due_date: futureDate },
          { id: 't3', title: 'Done Task', status: 'done', due_date: pastDate },
        ],
        error: null,
      });
      const mockEq2 = jest.fn().mockReturnValue({ order: mockOrder });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      const res = await tasksService.fetchProjectTasks('proj-123', { overdueOnly: true });

      expect(res.data).toHaveLength(1);
      expect(res.data?.[0]?.id).toBe('t1');
    });
  });

  describe('createTask', () => {
    it('creates a task with authenticated user and inserts collaborators', async () => {
      const mockSingle = jest.fn().mockResolvedValueOnce({
        data: { id: 'new-task-id', title: 'New Task', project_id: 'proj-123' },
        error: null,
      });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsertTask = jest.fn().mockReturnValue({ select: mockSelect });
      const mockInsertCollab = jest.fn().mockResolvedValueOnce({ error: null });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce({ insert: mockInsertTask })
        .mockReturnValueOnce({ insert: mockInsertCollab });

      const res = await tasksService.createTask('proj-123', {
        title: 'New Task',
        priority: 'high',
        collaborator_ids: ['user-456'],
      });

      expect(mockInsertTask).toHaveBeenCalledWith({
        project_id: 'proj-123',
        title: 'New Task',
        description: null,
        primary_assignee_id: null,
        priority: 'high',
        due_date: null,
        start_date: null,
        phase_id: null,
        milestone_id: null,
        created_by: 'user-123',
      });
      expect(mockInsertCollab).toHaveBeenCalledWith([
        { task_id: 'new-task-id', user_id: 'user-456' },
      ]);
      expect(res.data?.id).toBe('new-task-id');
    });
  });

  describe('toggleTaskStatus (reopening)', () => {
    it('transitions done task to in_progress (reopen)', async () => {
      const mockSingle = jest.fn().mockResolvedValueOnce({
        data: { id: 't1', status: 'in_progress' },
        error: null,
      });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const res = await tasksService.toggleTaskStatus('t1', 'done');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'in_progress' })
      );
      expect(res.data?.status).toBe('in_progress');
    });

    it('transitions in_progress task to done', async () => {
      const mockSingle = jest.fn().mockResolvedValueOnce({
        data: { id: 't1', status: 'done' },
        error: null,
      });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      const res = await tasksService.toggleTaskStatus('t1', 'in_progress');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'done' })
      );
      expect(res.data?.status).toBe('done');
    });
  });

  describe('Checklist and Comments', () => {
    it('adds and toggles checklist item', async () => {
      // Limit for sequence order
      const mockLimit = jest.fn().mockResolvedValueOnce({ data: [{ sequence_order: 1 }] });
      const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      // Insert item
      const mockSingle = jest.fn().mockResolvedValueOnce({
        data: { id: 'c3', title: 'Write unit tests', sequence_order: 2, is_completed: false },
        error: null,
      });
      const mockSelectInsert = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelectInsert });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce({ select: mockSelect })
        .mockReturnValueOnce({ insert: mockInsert });

      const res = await tasksService.addChecklistItem('t1', 'Write unit tests');
      expect(res.data?.title).toBe('Write unit tests');
      expect(res.data?.sequence_order).toBe(2);
    });

    it('adds a task comment with user id', async () => {
      const mockSingle = jest.fn().mockResolvedValueOnce({
        data: { id: 'cm1', content: 'PR submitted for review', user_id: 'user-123' },
        error: null,
      });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
      (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

      const res = await tasksService.addComment('t1', 'PR submitted for review');
      expect(mockInsert).toHaveBeenCalledWith({
        task_id: 't1',
        user_id: 'user-123',
        content: 'PR submitted for review',
      });
      expect(res.data?.content).toBe('PR submitted for review');
    });
  });
});
