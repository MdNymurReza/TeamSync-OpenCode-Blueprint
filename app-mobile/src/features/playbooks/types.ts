import type { ProjectPhase, ProjectType } from '../../types/database';

export interface PlaybookTemplatePhase {
  name: string;
  description: string;
  sequence_order: number;
}

export interface PlaybookTemplate {
  id: ProjectType;
  title: string;
  description: string;
  defaultPhases: PlaybookTemplatePhase[];
  suggestedCategories: string[];
}

export interface CreatePhaseInput {
  name: string;
  description?: string;
  sequence_order?: number;
}

export interface UpdatePhaseInput {
  name?: string;
  description?: string;
  is_completed?: boolean;
  sequence_order?: number;
}

export type { ProjectPhase };
