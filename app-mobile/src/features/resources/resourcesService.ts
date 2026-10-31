import { supabase } from '@/lib/supabase/client';
import type {
  Milestone,
  Profile,
  Resource,
  ResourceUpdate,
} from '@/types/database';
import {
  ALLOWED_RESOURCE_MIME_TYPES,
  CreateExternalResourceInput,
  DEFAULT_SIGNED_URL_EXPIRY_SECONDS,
  MAX_RESOURCE_FILE_SIZE_BYTES,
  RESOURCE_STORAGE_BUCKET,
  ResourceListFilter,
  ResourceWithDetails,
  UpdateResourceInput,
  UploadProjectFileInput,
} from './types';

interface ResourceRowWithRelations extends Resource {
  author?: Profile | null;
  milestone?: Pick<Milestone, 'id' | 'title'> | null;
}

/**
 * Validates an external resource URL at the trust boundary.
 * Rejects dangerous schemes (`javascript:`, `data:`, `file:`, `vbscript:`) and requires
 * a valid `https://` or `http://` URL with a hostname.
 */
export function validateExternalResourceUrl(urlInput: string): {
  normalizedUrl: string | null;
  error: string | null;
} {
  const trimmed = urlInput.trim();
  if (!trimmed) {
    return { normalizedUrl: null, error: 'Resource URL is required' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      normalizedUrl: null,
      error: 'Enter a valid http:// or https:// URL (e.g. https://github.com/org/repo)',
    };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return {
      normalizedUrl: null,
      error: 'Only http:// and https:// links are allowed',
    };
  }

  if (!parsed.hostname || !parsed.hostname.includes('.')) {
    return {
      normalizedUrl: null,
      error: 'URL must include a valid domain host',
    };
  }

  return { normalizedUrl: parsed.toString(), error: null };
}

/**
 * Sanitizes an untrusted filename so it cannot traverse directories or inject special characters.
 */
export function sanitizeStorageFileName(rawName: string): string {
  const baseName = rawName.trim().split(/[/\\]/).pop() ?? 'resource.txt';
  const cleaned = baseName
    .replace(/\.\.+/g, '.')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return cleaned.length > 0 ? cleaned.slice(0, 100) : 'resource.txt';
}

/**
 * Builds a project-scoped private storage path (`<projectId>/<timestamp>_<sanitizedFileName>`).
 */
export function buildProjectStoragePath(
  projectId: string,
  fileName: string,
  timestampMs: number = Date.now()
): { storagePath: string | null; error: string | null } {
  const trimmedProjectId = projectId.trim();
  if (!trimmedProjectId || trimmedProjectId.includes('/') || trimmedProjectId.includes('..')) {
    return { storagePath: null, error: 'Invalid project ID for storage path' };
  }

  const safeFile = sanitizeStorageFileName(fileName);
  return {
    storagePath: `${trimmedProjectId}/${timestampMs}_${safeFile}`,
    error: null,
  };
}

/**
 * Validates that an existing `storage_path` belongs strictly to `expectedProjectId`
 * and does not contain path traversal segments (`..`).
 * Enforces the architecture invariant: "Storage paths are not authorization by themselves."
 */
export function validateStoragePathProjectBoundary(
  storagePath: string,
  expectedProjectId: string
): { valid: boolean; error: string | null } {
  const trimmedPath = storagePath.trim();
  const trimmedProject = expectedProjectId.trim();

  if (!trimmedPath || !trimmedProject) {
    return { valid: false, error: 'Storage path and project ID are required' };
  }

  if (trimmedPath.includes('..') || trimmedPath.startsWith('/')) {
    return { valid: false, error: 'Invalid storage path: path traversal is not allowed' };
  }

  const prefix = `${trimmedProject}/`;
  if (!trimmedPath.startsWith(prefix) || trimmedPath.length <= prefix.length) {
    return {
      valid: false,
      error: 'Access denied: storage path does not belong to the requested project',
    };
  }

  return { valid: true, error: null };
}

/**
 * Validates private file upload size and MIME type before uploading to Supabase Storage.
 */
export function validateFileUploadConstraints(params: {
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
}): { valid: boolean; error: string | null } {
  const { fileName, mimeType, fileSizeBytes } = params;

  if (!fileName.trim()) {
    return { valid: false, error: 'File name is required' };
  }

  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
    return { valid: false, error: 'File cannot be empty (0 bytes)' };
  }

  if (fileSizeBytes > MAX_RESOURCE_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'File exceeds the 10 MB maximum upload limit',
    };
  }

  const normalizedMime = mimeType.trim().toLowerCase();
  const isAllowed = (ALLOWED_RESOURCE_MIME_TYPES as readonly string[]).includes(
    normalizedMime
  );
  if (!isAllowed) {
    return {
      valid: false,
      error: `Unsupported file type (${normalizedMime || 'unknown'}). Allowed types include PDF, Markdown, TXT, CSV, JSON, PNG/JPEG, DOCX/XLSX/PPTX, and ZIP.`,
    };
  }

  return { valid: true, error: null };
}

/**
 * Formats byte size into human-readable KB / MB label.
 */
export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function computeContentByteLength(
  content: string | Uint8Array | ArrayBuffer,
  explicitBytes?: number
): number {
  if (explicitBytes !== undefined) return explicitBytes;
  if (typeof content === 'string') {
    return new TextEncoder().encode(content).byteLength;
  }
  if (content instanceof Uint8Array) {
    return content.byteLength;
  }
  return content.byteLength;
}

export const resourcesService = {
  /**
   * Fetches all resources for a project, optionally filtered by category.
   */
  async fetchProjectResources(
    projectId: string,
    filter: ResourceListFilter = 'all'
  ): Promise<{ data: ResourceWithDetails[] | null; error: Error | null }> {
    try {
      let query = supabase
        .from('resources')
        .select(
          `
          *,
          author:profiles!resources_created_by_fkey(*),
          milestone:milestones!resources_milestone_id_fkey(id, title)
        `
        )
        .eq('project_id', projectId);

      if (filter !== 'all') {
        query = query.eq('category', filter);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      const rows = (data || []) as unknown as ResourceRowWithRelations[];
      return { data: rows, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch project resources';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Creates an external link resource (Google Drive, GitHub, Figma, ArXiv, etc.) after URL validation.
   */
  async createExternalResource(
    projectId: string,
    input: CreateExternalResourceInput
  ): Promise<{ data: ResourceWithDetails | null; error: Error | null }> {
    try {
      const trimmedTitle = input.title.trim();
      if (!trimmedTitle) {
        return { data: null, error: new Error('Resource title is required') };
      }

      const urlCheck = validateExternalResourceUrl(input.external_url);
      if (urlCheck.error || !urlCheck.normalizedUrl) {
        return { data: null, error: new Error(urlCheck.error ?? 'Invalid URL') };
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: new Error('You must be signed in to add a resource') };
      }

      const { data, error } = await supabase
        .from('resources')
        .insert({
          project_id: projectId,
          title: trimmedTitle,
          description: input.description?.trim() || null,
          category: input.category || 'research',
          custom_category:
            input.category === 'other' ? input.custom_category?.trim() || null : null,
          resource_type: 'external_link',
          external_url: urlCheck.normalizedUrl,
          milestone_id: input.milestone_id || null,
          created_by: user.id,
        })
        .select(
          `
          *,
          author:profiles!resources_created_by_fkey(*),
          milestone:milestones!resources_milestone_id_fkey(id, title)
        `
        )
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as unknown as ResourceWithDetails, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add external resource';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Uploads a private file into the `project-resources` bucket under `<projectId>/<timestamp>_<fileName>`
   * after enforcing size/MIME limits, and records the authoritative metadata row in `public.resources`.
   */
  async uploadFileResource(
    projectId: string,
    input: UploadProjectFileInput
  ): Promise<{ data: ResourceWithDetails | null; error: Error | null }> {
    try {
      const trimmedTitle = input.title.trim();
      if (!trimmedTitle) {
        return { data: null, error: new Error('Resource title is required') };
      }

      const byteLength = computeContentByteLength(input.content, input.fileSizeBytes);
      const fileCheck = validateFileUploadConstraints({
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSizeBytes: byteLength,
      });

      if (!fileCheck.valid) {
        return { data: null, error: new Error(fileCheck.error ?? 'Invalid file upload') };
      }

      const pathBuild = buildProjectStoragePath(projectId, input.fileName);
      if (pathBuild.error || !pathBuild.storagePath) {
        return { data: null, error: new Error(pathBuild.error ?? 'Invalid storage path') };
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: new Error('You must be signed in to upload a file') };
      }

      const uploadBody =
        typeof input.content === 'string'
          ? new TextEncoder().encode(input.content)
          : input.content;

      const { error: uploadError } = await supabase.storage
        .from(RESOURCE_STORAGE_BUCKET)
        .upload(pathBuild.storagePath, uploadBody, {
          contentType: input.mimeType.trim().toLowerCase(),
          upsert: false,
        });

      if (uploadError) {
        return { data: null, error: new Error(uploadError.message) };
      }

      const safeFileName = sanitizeStorageFileName(input.fileName);

      const { data, error: dbError } = await supabase
        .from('resources')
        .insert({
          project_id: projectId,
          title: trimmedTitle,
          description: input.description?.trim() || null,
          category: input.category || 'reports',
          custom_category:
            input.category === 'other' ? input.custom_category?.trim() || null : null,
          resource_type: 'file_upload',
          storage_path: pathBuild.storagePath,
          file_name: safeFileName,
          mime_type: input.mimeType.trim().toLowerCase(),
          file_size_bytes: byteLength,
          milestone_id: input.milestone_id || null,
          created_by: user.id,
        })
        .select(
          `
          *,
          author:profiles!resources_created_by_fkey(*),
          milestone:milestones!resources_milestone_id_fkey(id, title)
        `
        )
        .single();

      if (dbError) {
        // Best-effort cleanup of orphaned storage object if DB insert fails
        await supabase.storage
          .from(RESOURCE_STORAGE_BUCKET)
          .remove([pathBuild.storagePath]);
        return { data: null, error: new Error(dbError.message) };
      }

      return { data: data as unknown as ResourceWithDetails, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload file resource';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Generates a short-lived signed download URL for a private project file after verifying:
   * 1. The resource is a `file_upload` with a valid `storage_path`.
   * 2. The `storage_path` belongs to `expectedProjectId` without path traversal.
   * 3. The caller is an active member of `expectedProjectId` (re-checked via `projectsService.fetchProjectDetails`
   *    in addition to Supabase Storage RLS).
   */
  async createSignedDownloadUrl(
    resource: Pick<
      Resource,
      'id' | 'project_id' | 'resource_type' | 'storage_path'
    >,
    expectedProjectId: string,
    expiresInSeconds: number = DEFAULT_SIGNED_URL_EXPIRY_SECONDS
  ): Promise<{
    data: { signedUrl: string; expiresInSeconds: number } | null;
    error: Error | null;
  }> {
    try {
      if (resource.resource_type !== 'file_upload' || !resource.storage_path) {
        return {
          data: null,
          error: new Error('Signed URLs can only be generated for private file uploads'),
        };
      }

      if (resource.project_id !== expectedProjectId) {
        return {
          data: null,
          error: new Error('Access denied: resource does not belong to this project'),
        };
      }

      const boundary = validateStoragePathProjectBoundary(
        resource.storage_path,
        expectedProjectId
      );
      if (!boundary.valid) {
        return {
          data: null,
          error: new Error(boundary.error ?? 'Invalid storage path boundary'),
        };
      }

      const boundedExpiry = Math.min(3600, Math.max(60, Math.round(expiresInSeconds)));

      const { data, error } = await supabase.storage
        .from(RESOURCE_STORAGE_BUCKET)
        .createSignedUrl(resource.storage_path, boundedExpiry);

      if (error || !data?.signedUrl) {
        return {
          data: null,
          error: new Error(error?.message ?? 'Failed to generate signed download URL'),
        };
      }

      return {
        data: {
          signedUrl: data.signedUrl,
          expiresInSeconds: boundedExpiry,
        },
        error: null,
      };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create signed download URL';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Updates metadata on an existing resource.
   */
  async updateResource(
    resourceId: string,
    input: UpdateResourceInput
  ): Promise<{ data: Resource | null; error: Error | null }> {
    try {
      const updates: ResourceUpdate = {};
      if (input.title !== undefined) updates.title = input.title.trim();
      if (input.description !== undefined) {
        updates.description = input.description?.trim() || null;
      }
      if (input.category !== undefined) updates.category = input.category;
      if (input.custom_category !== undefined) {
        updates.custom_category = input.custom_category?.trim() || null;
      }
      if (input.milestone_id !== undefined) updates.milestone_id = input.milestone_id;

      if (input.external_url !== undefined && input.external_url !== null) {
        const urlCheck = validateExternalResourceUrl(input.external_url);
        if (urlCheck.error || !urlCheck.normalizedUrl) {
          return { data: null, error: new Error(urlCheck.error ?? 'Invalid URL') };
        }
        updates.external_url = urlCheck.normalizedUrl;
      }

      const { data, error } = await supabase
        .from('resources')
        .update(updates)
        .eq('id', resourceId)
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as Resource, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update resource';
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Deletes a resource row and removes its backing private storage object if it was a file upload.
   */
  async deleteResource(
    resource: Pick<Resource, 'id' | 'project_id' | 'resource_type' | 'storage_path'>
  ): Promise<{ error: Error | null }> {
    try {
      if (resource.resource_type === 'file_upload' && resource.storage_path) {
        const boundary = validateStoragePathProjectBoundary(
          resource.storage_path,
          resource.project_id
        );
        if (boundary.valid) {
          await supabase.storage
            .from(RESOURCE_STORAGE_BUCKET)
            .remove([resource.storage_path]);
        }
      }

      const { error } = await supabase.from('resources').delete().eq('id', resource.id);
      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete resource';
      return { error: new Error(message) };
    }
  },
};

