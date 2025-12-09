import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";

admin.initializeApp();

// Use the named 'default' database (not the '(default)' database)
const db = getFirestore(admin.app(), "default");

// Project data interface
interface ProjectData {
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
interface StepData {
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

// Attempt to automate a step
async function attemptAutomation(
  projectId: string,
  stepId: string,
  stepData: admin.firestore.DocumentData,
  userId: string
) {
  console.log(
    `Attempting automation for step ${stepId} in project ${projectId}`
  );

  // Mark that we've attempted automation
  await db
    .collection("projects")
    .doc(projectId)
    .collection("steps")
    .doc(stepId)
    .update({
      automationAttempted: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  // TODO: Implement actual AI/automation logic here
  // This is where you would:
  // 1. Analyze the step description
  // 2. Determine if it can be automated
  // 3. Call appropriate APIs or AI services
  // 4. Execute the automation
  // 5. Update the step with results

  // For now, we'll simulate automation with a simple check
  const canAutomate = await simulateAutomation(stepData);

  if (canAutomate.success) {
    // Update step as completed
    await db
      .collection("projects")
      .doc(projectId)
      .collection("steps")
      .doc(stepId)
      .update({
        status: "completed",
        automationResult: canAutomate.result,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  } else {
    // Mark as requiring manual action
    await db
      .collection("projects")
      .doc(projectId)
      .collection("steps")
      .doc(stepId)
      .update({
        status: "in_progress",
        automationResult: canAutomate.result,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Send notification that manual action is required
    await sendNotification(projectId, stepId, userId, {
      title: "Manual Action Required",
      body: `Step "${stepData.title}" could not be automated. ${canAutomate.result}`,
      type: "manual_action_required",
    });
  }
}

// Simulate automation logic (replace with actual AI/automation)
async function simulateAutomation(
  stepData: admin.firestore.DocumentData
): Promise<{ success: boolean; result: string }> {
  // This is a placeholder. In a real implementation, you would:
  // - Use AI to understand the task
  // - Call appropriate APIs
  // - Execute automation workflows

  // For demo purposes, let's say steps with "simple" in description can be automated
  if (stepData.description?.toLowerCase().includes("simple")) {
    return {
      success: true,
      result: "Task was automatically completed successfully.",
    };
  }

  return {
    success: false,
    result: "This task requires manual intervention.",
  };
}

// Handle step completion
async function handleStepCompletion(
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

// Send notification
async function sendNotification(
  projectId: string,
  stepId: string,
  userId: string,
  notification: { title: string; body: string; type: string }
) {
  // Save notification to Firestore
  await db.collection("notifications").add({
    userId,
    projectId,
    stepId,
    title: notification.title,
    body: notification.body,
    type: notification.type,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    read: false,
  });

  // Send push notification via FCM to user's registered devices only
  try {
    const tokensSnapshot = await db
      .collection("fcmTokens")
      .where("userId", "==", userId)
      .get();

    if (tokensSnapshot.empty) {
      console.log("No FCM tokens found");
      return;
    }

    const tokens = tokensSnapshot.docs.map((doc) => doc.data().token);

    if (tokens.length > 0) {
      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          projectId: projectId,
          stepId: stepId,
          type: notification.type,
        },
        tokens: tokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(
        `✅ Successfully sent ${response.successCount} notifications`
      );

      if (response.failureCount > 0) {
        console.log(`❌ Failed to send ${response.failureCount} notifications`);
        // Clean up invalid tokens
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error(`Error sending to token ${tokens[idx]}:`, resp.error);
            // Optionally remove invalid token from Firestore
          }
        });
      }
    }
  } catch (error) {
    console.error("Error sending push notification:", error);
  }

  console.log(`Notification logged: ${notification.title}`);
}
