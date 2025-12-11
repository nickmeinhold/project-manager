import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { ProjectData } from "../types";
import { sendNotification } from "../notifications";

// Trigger when a project is created
export const onProjectCreate = onDocumentCreated(
  {
    document: "projects/{projectId}",
    database: "default",
  },
  async (event) => {
    const { projectId } = event.params;
    const projectData = event.data?.data() as ProjectData | undefined;

    if (!projectData) {
      console.error("Missing project data");
      return;
    }

    // Send notification to the user who created the project
    await sendNotification(projectId, "", projectData.userId, {
      title: "Project Created!",
      body: `"${projectData.title}" is ready to go.`,
      type: "project_created",
    });
  }
);
