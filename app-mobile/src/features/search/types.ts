export type SearchScope =
  | 'all'
  | 'projects'
  | 'tasks'
  | 'milestones'
  | 'decisions'
  | 'resources';

export interface SearchResultItem {
  id: string;
  entityType: 'project' | 'task' | 'milestone' | 'decision' | 'resource';
  projectId: string;
  projectName: string;
  title: string;
  subtitle: string;
  badgeLabel: string;
  route: string;
}

export const SEARCH_SCOPE_OPTIONS: {
  scope: SearchScope;
  label: string;
}[] = [
  { scope: 'all', label: 'All' },
  { scope: 'projects', label: 'Workspaces' },
  { scope: 'tasks', label: 'Tasks' },
  { scope: 'milestones', label: 'Milestones' },
  { scope: 'decisions', label: 'Decisions' },
  { scope: 'resources', label: 'Resources' },
];

