import * as admin from "firebase-admin";

// Project data interface
export interface ProjectData {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: "active" | "completed" | "archived";
  currentStepIndex: number;
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
}

// Step data interface
export interface StepData {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed";
  order: number;
  automatable: boolean;
  automationAttempted?: boolean;
  automationResult?: string;
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
  completedAt?: admin.firestore.Timestamp;
}
