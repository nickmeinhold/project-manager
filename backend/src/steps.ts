import * as admin from "firebase-admin";
import { db } from "./db";
import { StepData } from "./types";
import { sendNotification } from "./notifications";
import { attemptAutomation } from "./automation";

// Handle step completion
export async function handleStepCompletion(
  projectId: string,
  stepId: string,
  stepData: admin.firestore.DocumentData,
  userId: string
) {
  console.log(`Step ${stepId} completed in project ${projectId}`);

  // Get all steps for this project
  const stepsSnapshot = await db
    .collection("projects")
    .doc(projectId)
    .collection("steps")
    .orderBy("order", "asc")
    .get();

  const steps = stepsSnapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      } as StepData)
  );
  const currentStepIndex = steps.findIndex((s) => s.id === stepId);
  const completedStepsCount = steps.filter(
    (s) => s.status === "completed"
  ).length;

  // Update project progress
  await db
    .collection("projects")
    .doc(projectId)
    .update({
      currentStepIndex: completedStepsCount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: completedStepsCount === steps.length ? "completed" : "active",
    });

  // Find next step
  const nextStep = steps[currentStepIndex + 1];

  if (nextStep) {
    // Send notification about completion and next step
    await sendNotification(projectId, stepId, userId, {
      title: "Step Completed!",
      body: `"${stepData.title}" is complete. Next: "${nextStep.title}"`,
      type: "step_completed",
    });

    // If next step is automatable, trigger automation
    if (nextStep.automatable && !nextStep.automationAttempted) {
      await attemptAutomation(projectId, nextStep.id, nextStep, userId);
    }
  } else {
    // Project completed
    await sendNotification(projectId, stepId, userId, {
      title: "Project Completed!",
      body: "All steps have been completed successfully.",
      type: "step_completed",
    });
  }
}
