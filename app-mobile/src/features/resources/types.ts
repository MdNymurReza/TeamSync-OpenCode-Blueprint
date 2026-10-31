import type {
  Milestone,
  Profile,
  Resource,
  ResourceCategory,
  ResourceType,
} from '@/types/database';

export const RESOURCE_STORAGE_BUCKET = 'project-resources';
export const MAX_RESOURCE_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour

export const ALLOWED_RESOURCE_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
  'application/zip',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
] as const;

export interface ResourceWithDetails extends Resource {
  author?: Profile | null;
  milestone?: Pick<Milestone, 'id' | 'title'> | null;
}

export type ResourceListFilter = 'all' | ResourceCategory;

export interface CreateExternalResourceInput {
  title: string;
  external_url: string;
  category?: ResourceCategory;
  custom_category?: string | null;
  description?: string | null;
  milestone_id?: string | null;
}

export interface UploadProjectFileInput {
  title: string;
  fileName: string;
  mimeType: string;
  content: string | Uint8Array | ArrayBuffer;
  fileSizeBytes?: number;
  category?: ResourceCategory;
  custom_category?: string | null;
  description?: string | null;
  milestone_id?: string | null;
}

export interface UpdateResourceInput {
  title?: string;
  description?: string | null;
  category?: ResourceCategory;
  custom_category?: string | null;
  milestone_id?: string | null;
  external_url?: string | null;
}

export const RESOURCE_CATEGORY_OPTIONS: {
  category: ResourceCategory;
  label: string;
  icon: string;
  badgeVariant: 'primary' | 'info' | 'success' | 'warning' | 'default';
}[] = [
  {
    category: 'research',
    label: 'Research',
    icon: 'book-outline',
    badgeVariant: 'primary',
  },
  {
    category: 'datasets',
    label: 'Datasets',
    icon: 'analytics-outline',
    badgeVariant: 'info',
  },
  {
    category: 'design',
    label: 'Design',
    icon: 'color-palette-outline',
    badgeVariant: 'warning',
  },
  {
    category: 'code',
    label: 'Code & Repo',
    icon: 'code-slash-outline',
    badgeVariant: 'success',
  },
  {
    category: 'reports',
    label: 'Reports',
    icon: 'document-text-outline',
    badgeVariant: 'primary',
  },
  {
    category: 'presentations',
    label: 'Slides & Demos',
    icon: 'easel-outline',
    badgeVariant: 'info',
  },
  {
    category: 'other',
    label: 'Custom',
    icon: 'folder-outline',
    badgeVariant: 'default',
  },
];

export type { Resource, ResourceCategory, ResourceType };

