import {
  buildProjectStoragePath,
  formatFileSize,
  MAX_RESOURCE_FILE_SIZE_BYTES,
  resourcesService,
  sanitizeStorageFileName,
  validateExternalResourceUrl,
  validateFileUploadConstraints,
  validateStoragePathProjectBoundary,
} from '@/features/resources';
import { supabase } from '@/lib/supabase/client';

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  },
}));

describe('resourcesService & storage security guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateExternalResourceUrl', () => {
    it('accepts valid https and http URLs (e.g. GitHub, Google Drive)', () => {
      const gh = validateExternalResourceUrl('https://github.com/org/capstone-rover');
      expect(gh.error).toBeNull();
      expect(gh.normalizedUrl).toBe('https://github.com/org/capstone-rover');
    });

    it('rejects untrusted javascript:, data:, and file: schemes', () => {
      expect(validateExternalResourceUrl('javascript:alert(1)').error).toContain(
        'Only http:// and https:// links are allowed'
      );
      expect(validateExternalResourceUrl('data:text/html,<script>').error).toBeTruthy();
      expect(validateExternalResourceUrl('file:///etc/passwd').error).toBeTruthy();
      expect(validateExternalResourceUrl('not-a-url').error).toBeTruthy();
    });
  });

  describe('sanitizeStorageFileName & buildProjectStoragePath', () => {
    it('strips path traversal and unsafe characters from untrusted filenames', () => {
      expect(sanitizeStorageFileName('../../etc/passwd')).toBe('passwd');
      expect(sanitizeStorageFileName('final report (v2)!.pdf')).toBe(
        'final_report_v2_.pdf'
      );
    });

    it('builds a project-scoped storage path', () => {
      const res = buildProjectStoragePath('proj-123', 'dataset.csv', 1700000000000);
      expect(res.error).toBeNull();
      expect(res.storagePath).toBe('proj-123/1700000000000_dataset.csv');
    });
  });

  describe('validateStoragePathProjectBoundary (cross-project isolation)', () => {
    it('allows storage path scoped to the expected project ID', () => {
      const res = validateStoragePathProjectBoundary(
        'proj-123/1700000000000_report.pdf',
        'proj-123'
      );
      expect(res.valid).toBe(true);
    });

    it('blocks cross-project storage path access and path traversal', () => {
      const crossProject = validateStoragePathProjectBoundary(
        'proj-other-999/1700000000000_secret.pdf',
        'proj-123'
      );
      expect(crossProject.valid).toBe(false);
      expect(crossProject.error).toContain('does not belong to the requested project');

      const traversal = validateStoragePathProjectBoundary(
        'proj-123/../proj-other/secret.pdf',
        'proj-123'
      );
      expect(traversal.valid).toBe(false);
      expect(traversal.error).toContain('path traversal');
    });
  });

  describe('validateFileUploadConstraints (size & MIME limits)', () => {
    it('accepts allowed MIME types within the 10 MB limit', () => {
      const res = validateFileUploadConstraints({
        fileName: 'experiment.csv',
        mimeType: 'text/csv',
        fileSizeBytes: 2048,
      });
      expect(res.valid).toBe(true);
    });

    it('rejects empty files, files exceeding 10 MB, and disallowed executable MIME types', () => {
      expect(
        validateFileUploadConstraints({
          fileName: 'empty.txt',
          mimeType: 'text/plain',
          fileSizeBytes: 0,
        }).valid
      ).toBe(false);

      const overLimit = validateFileUploadConstraints({
        fileName: 'huge.zip',
        mimeType: 'application/zip',
        fileSizeBytes: MAX_RESOURCE_FILE_SIZE_BYTES + 1,
      });
      expect(overLimit.valid).toBe(false);
      expect(overLimit.error).toContain('10 MB');

      const badMime = validateFileUploadConstraints({
        fileName: 'payload.exe',
        mimeType: 'application/x-msdownload',
        fileSizeBytes: 1024,
      });
      expect(badMime.valid).toBe(false);
      expect(badMime.error).toContain('Unsupported file type');
    });

    it('formats file sizes clearly', () => {
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(2048)).toBe('2.0 KB');
      expect(formatFileSize(2 * 1024 * 1024)).toBe('2.00 MB');
    });
  });

  describe('createSignedDownloadUrl (signed URL & non-member / cross-project denial)', () => {
    it('blocks generating a signed URL when the resource belongs to another project', async () => {
      const res = await resourcesService.createSignedDownloadUrl(
        {
          id: 'res-1',
          project_id: 'proj-other',
          resource_type: 'file_upload',
          storage_path: 'proj-other/123_secret.pdf',
        },
        'proj-1'
      );

      expect(res.data).toBeNull();
      expect(res.error?.message).toContain('Access denied');
      expect(supabase.storage.from).not.toHaveBeenCalled();
    });

    it('returns a bounded short-lived signed URL for an authorized project file', async () => {
      const createSignedUrlMock = jest.fn().mockResolvedValue({
        data: { signedUrl: 'https://supabase.example/storage/v1/object/sign/project-resources/proj-1/123_spec.pdf?token=abc' },
        error: null,
      });
      (supabase.storage.from as jest.Mock).mockReturnValue({
        createSignedUrl: createSignedUrlMock,
      });

      const res = await resourcesService.createSignedDownloadUrl(
        {
          id: 'res-1',
          project_id: 'proj-1',
          resource_type: 'file_upload',
          storage_path: 'proj-1/123_spec.pdf',
        },
        'proj-1',
        1800
      );

      expect(res.error).toBeNull();
      expect(res.data?.signedUrl).toContain('token=abc');
      expect(res.data?.expiresInSeconds).toBe(1800);
      expect(createSignedUrlMock).toHaveBeenCalledWith('proj-1/123_spec.pdf', 1800);
    });

    it('surfaces storage RLS denial when a non-member attempts to download', async () => {
      const createSignedUrlMock = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'new row violates row-level security policy' },
      });
      (supabase.storage.from as jest.Mock).mockReturnValue({
        createSignedUrl: createSignedUrlMock,
      });

      const res = await resourcesService.createSignedDownloadUrl(
        {
          id: 'res-1',
          project_id: 'proj-1',
          resource_type: 'file_upload',
          storage_path: 'proj-1/123_spec.pdf',
        },
        'proj-1'
      );

      expect(res.data).toBeNull();
      expect(res.error?.message).toContain('row-level security');
    });
  });
});

