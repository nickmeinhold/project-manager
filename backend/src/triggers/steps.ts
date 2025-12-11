import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import { db } from "../db";
import { ProjectData } from "../types";
import { attemptAutomation } from "../automation";
import { handleStepCompletion } from "../steps";

// Trigger when a step is updated
export const onStepUpdate = onDocumentUpdated(
  {
    document: "projects/{projectId}/steps/{stepId}",
    database: "default",
  },
  async (event) => {
    const { projectId, stepId } = event.params;
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) {
      console.error("Missing document data");
      return;
    }

    // Get the project to retrieve userId
    const projectDoc = await db.collection("projects").doc(projectId).get();
    const projectData = projectDoc.data() as ProjectData;

    if (!projectData) {
      console.error(`Project ${projectId} not found`);
      return;
    }

    // Check if step was just marked as pending or in_progress and is automatable
    if (after.automatable && !after.automationAttempted) {
      if (after.status === "pending" || after.status === "in_progress") {
        // Attempt automation
        try {
          await attemptAutomation(projectId, stepId, after, projectData.userId);
        } catch (error) {
          console.error("Automation error:", error);
        }
      }
    }

    // Check if step was just completed
    if (before.status !== "completed" && after.status === "completed") {
      await handleStepCompletion(projectId, stepId, after, projectData.userId);
    }
  }
);

// Trigger when a step is created
export const onStepCreate = onDocumentCreated(
  {
    document: "projects/{projectId}/steps/{stepId}",
    database: "default",
  },
  async (event) => {
    const { projectId, stepId } = event.params;
    const stepData = event.data?.data();

    if (!stepData) {
      console.error("Missing document data");
      return;
    }

    // Get the project to retrieve userId
    const projectDoc = await db.collection("projects").doc(projectId).get();
    const projectData = projectDoc.data() as ProjectData;

    if (!projectData) {
      console.error(`Project ${projectId} not found`);
      return;
    }

    // If this is the first step and it's automatable, try automation
    if (
      stepData.order === 0 &&
      stepData.automatable &&
      !stepData.automationAttempted
    ) {
      try {
        await attemptAutomation(
          projectId,
          stepId,
          stepData,
          projectData.userId
        );
      } catch (error) {
        console.error("Automation error:", error);
      }
    }
  }
);
