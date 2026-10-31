import type { PlaybookTemplate } from './types';

export const PLAYBOOK_TEMPLATES: Record<string, PlaybookTemplate> = {
  course_assignment: {
    id: 'course_assignment',
    title: 'Course Assignment',
    description: 'Structured for course coursework, rubrics breakdown, and deadline submissions.',
    defaultPhases: [
      {
        name: 'Requirements & Problem Breakdown',
        description: 'Deconstruct prompt, rubrics, constraints, and success criteria',
        sequence_order: 0,
      },
      {
        name: 'Design & Task Division',
        description: 'Architecture, mockups, modular division, and milestones',
        sequence_order: 1,
      },
      {
        name: 'Implementation & Peer Review',
        description: 'Core development, integration testing, and team code reviews',
        sequence_order: 2,
      },
      {
        name: 'Final Polish & Submission',
        description: 'Report drafting, presentation slides, rubric check, and handover',
        sequence_order: 3,
      },
    ],
    suggestedCategories: ['Documentation', 'Research', 'Design', 'Implementation', 'Report', 'Review'],
  },
  software_project: {
    id: 'software_project',
    title: 'Software Project',
    description: 'Agile sprints, architecture, code reviews, testing, and deployment.',
    defaultPhases: [
      {
        name: 'Planning & Tech Stack',
        description: 'User stories, system architecture, repo setup, and tool selection',
        sequence_order: 0,
      },
      {
        name: 'MVP Development',
        description: 'Core feature implementation, database models, and internal APIs',
        sequence_order: 1,
      },
      {
        name: 'Testing & Code Review',
        description: 'Unit/integration tests, bug fixes, performance, and security checks',
        sequence_order: 2,
      },
      {
        name: 'Deployment & Documentation',
        description: 'CI/CD pipeline, user documentation, README, and demo recording',
        sequence_order: 3,
      },
    ],
    suggestedCategories: ['Backend', 'Frontend', 'Database', 'DevOps', 'Testing', 'Bugfix', 'Documentation'],
  },
  research: {
    id: 'research',
    title: 'Research Project',
    description: 'Literature review, methodology, data gathering, experiment analysis, and publication.',
    defaultPhases: [
      {
        name: 'Literature Review & Hypothesis',
        description: 'Background reading, gap analysis, and formulating research questions',
        sequence_order: 0,
      },
      {
        name: 'Methodology & Data Collection',
        description: 'Experimental design, dataset sourcing, ethics/approvals, and tooling',
        sequence_order: 1,
      },
      {
        name: 'Data Analysis & Findings',
        description: 'Running experiments, statistical validation, and result synthesis',
        sequence_order: 2,
      },
      {
        name: 'Paper Draft & Presentation',
        description: 'Manuscript writing, citations, peer feedback, and presentation defense',
        sequence_order: 3,
      },
    ],
    suggestedCategories: ['Literature', 'Data Collection', 'Experimentation', 'Analysis', 'Writing', 'Defense'],
  },
  fyp_capstone: {
    id: 'fyp_capstone',
    title: 'FYP / Capstone Project',
    description: 'Year-long final year project with proposal, mid-term demo, thesis, and defense.',
    defaultPhases: [
      {
        name: 'Proposal & Feasibility Study',
        description: 'Project charter, supervisor approval, literature survey, and feasibility',
        sequence_order: 0,
      },
      {
        name: 'System Architecture & Specification',
        description: 'Detailed requirements, UX wireframes, and schema specifications',
        sequence_order: 1,
      },
      {
        name: 'Build & Mid-Semester Review',
        description: 'Prototype implementation, interim demonstration, and supervisor check-in',
        sequence_order: 2,
      },
      {
        name: 'Evaluation, Thesis & Defense',
        description: 'User evaluations, final thesis writeup, poster session, and oral defense',
        sequence_order: 3,
      },
    ],
    suggestedCategories: ['Proposal', 'System Architecture', 'Implementation', 'Supervisor Checkin', 'Thesis', 'Defense'],
  },
  other: {
    id: 'other',
    title: 'General Project',
    description: 'Simple, versatile project flow for extracurriculars, case studies, or competitions.',
    defaultPhases: [
      {
        name: 'Discovery & Scoping',
        description: 'Define objectives, deliverables, and team responsibilities',
        sequence_order: 0,
      },
      {
        name: 'Execution & Iteration',
        description: 'Main sprint cycle, weekly check-ins, and draft deliverables',
        sequence_order: 1,
      },
      {
        name: 'Final Review & Delivery',
        description: 'Consolidated deliverables, retrospective, and project submission',
        sequence_order: 2,
      },
    ],
    suggestedCategories: ['Planning', 'Tasks', 'Milestones', 'Meeting Action', 'Final Review'],
  },
};
