import { Timestamp } from 'firebase/firestore';

export interface Project {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'paused';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  currentStepIndex: number;
  totalSteps: number;
}

export interface Step {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  order: number;
  automatable: boolean;
  automationAttempted: boolean;
  automationResult?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}

export interface Notification {
  id: string;
  projectId: string;
  stepId: string;
  title: string;
  body: string;
  type: 'step_completed' | 'step_failed' | 'manual_action_required';
  createdAt: Timestamp;
  read: boolean;
}

export interface CreateProjectInput {
  title: string;
  description: string;
  steps: CreateStepInput[];
}

export interface CreateStepInput {
  title: string;
  description: string;
  automatable: boolean;
}

export interface UpdateStepInput {
  status?: Step['status'];
  automationAttempted?: boolean;
  automationResult?: string;
}
