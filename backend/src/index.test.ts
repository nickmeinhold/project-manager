import * as admin from "firebase-admin";

// Mock firebase-admin before importing the functions
jest.mock("firebase-admin", () => {
  const mockAdd = jest.fn().mockResolvedValue({ id: "notification-id" });
  const mockUpdate = jest.fn().mockResolvedValue({});
  const mockGet = jest.fn();
  const mockWhere = jest.fn();
  const mockOrderBy = jest.fn();

  const mockCollection = jest.fn().mockReturnValue({
    add: mockAdd,
    doc: jest.fn().mockReturnValue({
      get: mockGet,
      update: mockUpdate,
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          update: mockUpdate,
        }),
        orderBy: mockOrderBy,
      }),
    }),
    where: mockWhere,
  });

  const mockDb = {
    collection: mockCollection,
  };

  return {
    initializeApp: jest.fn(),
    app: jest.fn(),
    firestore: {
      FieldValue: {
        serverTimestamp: jest.fn().mockReturnValue("SERVER_TIMESTAMP"),
      },
      Timestamp: {
        now: jest.fn().mockReturnValue({ toDate: () => new Date() }),
      },
    },
    messaging: jest.fn().mockReturnValue({
      sendEachForMulticast: jest.fn().mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      }),
    }),
    __mockDb: mockDb,
    __mockAdd: mockAdd,
    __mockGet: mockGet,
    __mockWhere: mockWhere,
    __mockUpdate: mockUpdate,
    __mockOrderBy: mockOrderBy,
    __mockCollection: mockCollection,
  };
});

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn().mockReturnValue(
    (admin as any).__mockDb
  ),
}));

// Mock firebase-functions to capture the handlers
const mockOnDocumentCreated = jest.fn();
const mockOnDocumentUpdated = jest.fn();

jest.mock("firebase-functions/v2/firestore", () => ({
  onDocumentCreated: mockOnDocumentCreated,
  onDocumentUpdated: mockOnDocumentUpdated,
}));

describe("Firebase Functions", () => {
  let capturedProjectCreateHandler: Function;
  let capturedStepCreateHandler: Function;
  let capturedStepUpdateHandler: Function;
  let mockAdd: jest.Mock;
  let mockGet: jest.Mock;
  let mockWhere: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockOrderBy: jest.Mock;
  let mockSendEachForMulticast: jest.Mock;

  beforeAll(() => {
    // Capture the handlers when the module is imported
    mockOnDocumentCreated.mockImplementation((config, handler) => {
      if (config.document === "projects/{projectId}") {
        capturedProjectCreateHandler = handler;
      } else if (config.document === "projects/{projectId}/steps/{stepId}") {
        capturedStepCreateHandler = handler;
      }
      return handler;
    });
    mockOnDocumentUpdated.mockImplementation((config, handler) => {
      if (config.document === "projects/{projectId}/steps/{stepId}") {
        capturedStepUpdateHandler = handler;
      }
      return handler;
    });

    // Import the module to register handlers
    require("./index");
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockAdd = (admin as any).__mockAdd;
    mockGet = (admin as any).__mockGet;
    mockWhere = (admin as any).__mockWhere;
    mockUpdate = (admin as any).__mockUpdate;
    mockOrderBy = (admin as any).__mockOrderBy;
    mockSendEachForMulticast = admin.messaging().sendEachForMulticast as jest.Mock;

    // Default mock for FCM tokens query (empty)
    mockWhere.mockReturnValue({
      get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
    });
  });

  describe("onProjectCreate", () => {
    it("should send notification with correct payload when project is created", async () => {
      const projectData = {
        id: "project-123",
        userId: "user-456",
        title: "My New Project",
        description: "Test project",
        status: "active",
        currentStepIndex: 0,
      };

      const event = {
        params: { projectId: "project-123" },
        data: {
          data: () => projectData,
        },
      };

      await capturedProjectCreateHandler(event);

      // Verify notification was added to Firestore
      expect(mockAdd).toHaveBeenCalledWith({
        userId: "user-456",
        projectId: "project-123",
        stepId: "",
        title: "Project Created!",
        body: '"My New Project" is ready to go.',
        type: "project_created",
        createdAt: "SERVER_TIMESTAMP",
        read: false,
      });
    });

    it("should not send notification if project data is missing", async () => {
      const event = {
        params: { projectId: "project-123" },
        data: {
          data: () => undefined,
        },
      };

      await capturedProjectCreateHandler(event);

      expect(mockAdd).not.toHaveBeenCalled();
    });

    it("should include project title in notification body", async () => {
      const projectData = {
        id: "project-789",
        userId: "user-111",
        title: "Build a Rocket Ship",
        status: "active",
        currentStepIndex: 0,
      };

      const event = {
        params: { projectId: "project-789" },
        data: {
          data: () => projectData,
        },
      };

      await capturedProjectCreateHandler(event);

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          body: '"Build a Rocket Ship" is ready to go.',
        })
      );
    });
  });

  describe("onStepUpdate", () => {
    beforeEach(() => {
      // Mock project lookup
      mockGet.mockResolvedValue({
        data: () => ({
          id: "project-123",
          userId: "user-456",
          title: "Test Project",
          status: "active",
          currentStepIndex: 0,
        }),
      });

      // Mock steps query for handleStepCompletion
      mockOrderBy.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "step-1",
              data: () => ({
                id: "step-1",
                title: "First Step",
                status: "completed",
                order: 0,
                automatable: false,
              }),
            },
            {
              id: "step-2",
              data: () => ({
                id: "step-2",
                title: "Second Step",
                status: "pending",
                order: 1,
                automatable: false,
              }),
            },
          ],
        }),
      });
    });

    it("should send step_completed notification when step status changes to completed", async () => {
      const event = {
        params: { projectId: "project-123", stepId: "step-1" },
        data: {
          before: {
            data: () => ({
              id: "step-1",
              title: "First Step",
              status: "in_progress",
              order: 0,
              automatable: false,
            }),
          },
          after: {
            data: () => ({
              id: "step-1",
              title: "First Step",
              status: "completed",
              order: 0,
              automatable: false,
            }),
          },
        },
      };

      await capturedStepUpdateHandler(event);

      // Verify notification includes next step info
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-456",
          projectId: "project-123",
          title: "Step Completed!",
          body: '"First Step" is complete. Next: "Second Step"',
          type: "step_completed",
        })
      );
    });

    it("should send project completed notification when last step is completed", async () => {
      // Mock only one step that's now completed
      mockOrderBy.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "step-1",
              data: () => ({
                id: "step-1",
                title: "Only Step",
                status: "completed",
                order: 0,
                automatable: false,
              }),
            },
          ],
        }),
      });

      const event = {
        params: { projectId: "project-123", stepId: "step-1" },
        data: {
          before: {
            data: () => ({
              id: "step-1",
              title: "Only Step",
              status: "in_progress",
              order: 0,
              automatable: false,
            }),
          },
          after: {
            data: () => ({
              id: "step-1",
              title: "Only Step",
              status: "completed",
              order: 0,
              automatable: false,
            }),
          },
        },
      };

      await capturedStepUpdateHandler(event);

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Project Completed!",
          body: "All steps have been completed successfully.",
          type: "step_completed",
        })
      );
    });

    it("should not send notification if step status did not change to completed", async () => {
      const event = {
        params: { projectId: "project-123", stepId: "step-1" },
        data: {
          before: {
            data: () => ({
              id: "step-1",
              title: "First Step",
              status: "pending",
              order: 0,
              automatable: false,
            }),
          },
          after: {
            data: () => ({
              id: "step-1",
              title: "First Step",
              status: "in_progress", // Changed but not to completed
              order: 0,
              automatable: false,
            }),
          },
        },
      };

      await capturedStepUpdateHandler(event);

      expect(mockAdd).not.toHaveBeenCalled();
    });

    it("should attempt automation for automatable steps", async () => {
      const event = {
        params: { projectId: "project-123", stepId: "step-1" },
        data: {
          before: {
            data: () => ({
              id: "step-1",
              title: "Auto Step",
              description: "A simple task",
              status: "pending",
              order: 0,
              automatable: true,
              automationAttempted: false,
            }),
          },
          after: {
            data: () => ({
              id: "step-1",
              title: "Auto Step",
              description: "A simple task", // Contains "simple" so automation succeeds
              status: "pending",
              order: 0,
              automatable: true,
              automationAttempted: false,
            }),
          },
        },
      };

      await capturedStepUpdateHandler(event);

      // Should have updated the step with automationAttempted: true
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          automationAttempted: true,
        })
      );
    });

    it("should send manual action notification when automation fails", async () => {
      const event = {
        params: { projectId: "project-123", stepId: "step-1" },
        data: {
          before: {
            data: () => ({
              id: "step-1",
              title: "Complex Task",
              description: "A complex task requiring manual work", // No "simple" = automation fails
              status: "pending",
              order: 0,
              automatable: true,
              automationAttempted: false,
            }),
          },
          after: {
            data: () => ({
              id: "step-1",
              title: "Complex Task",
              description: "A complex task requiring manual work",
              status: "pending",
              order: 0,
              automatable: true,
              automationAttempted: false,
            }),
          },
        },
      };

      await capturedStepUpdateHandler(event);

      // Should send "Manual Action Required" notification
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Manual Action Required",
          body: expect.stringContaining("Complex Task"),
          type: "manual_action_required",
        })
      );
    });

    it("should skip automation if already attempted", async () => {
      const event = {
        params: { projectId: "project-123", stepId: "step-1" },
        data: {
          before: {
            data: () => ({
              id: "step-1",
              title: "Auto Step",
              description: "A simple task",
              status: "pending",
              order: 0,
              automatable: true,
              automationAttempted: true, // Already attempted
            }),
          },
          after: {
            data: () => ({
              id: "step-1",
              title: "Auto Step",
              description: "A simple task",
              status: "in_progress",
              order: 0,
              automatable: true,
              automationAttempted: true,
            }),
          },
        },
      };

      await capturedStepUpdateHandler(event);

      // Should NOT attempt automation again
      expect(mockUpdate).not.toHaveBeenCalledWith(
        expect.objectContaining({
          automationAttempted: true,
        })
      );
    });

    it("should trigger automation on next step when current step completes", async () => {
      // Mock steps with next step being automatable
      mockOrderBy.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "step-1",
              data: () => ({
                id: "step-1",
                title: "First Step",
                status: "completed",
                order: 0,
                automatable: false,
              }),
            },
            {
              id: "step-2",
              data: () => ({
                id: "step-2",
                title: "Second Step",
                description: "A simple automated task",
                status: "pending",
                order: 1,
                automatable: true,
                automationAttempted: false,
              }),
            },
          ],
        }),
      });

      const event = {
        params: { projectId: "project-123", stepId: "step-1" },
        data: {
          before: {
            data: () => ({
              id: "step-1",
              title: "First Step",
              status: "in_progress",
              order: 0,
              automatable: false,
            }),
          },
          after: {
            data: () => ({
              id: "step-1",
              title: "First Step",
              status: "completed",
              order: 0,
              automatable: false,
            }),
          },
        },
      };

      await capturedStepUpdateHandler(event);

      // Should trigger automation on next step (step-2)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          automationAttempted: true,
        })
      );
    });

    it("should recalculate project progress when step is reset from completed to pending", async () => {
      // Mock steps after reset - all pending now
      mockOrderBy.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "step-1",
              data: () => ({
                id: "step-1",
                title: "First Step",
                status: "pending", // Was completed, now reset
                order: 0,
              }),
            },
            {
              id: "step-2",
              data: () => ({
                id: "step-2",
                title: "Second Step",
                status: "pending",
                order: 1,
              }),
            },
          ],
        }),
      });

      const event = {
        params: { projectId: "project-123", stepId: "step-1" },
        data: {
          before: {
            data: () => ({
              id: "step-1",
              title: "First Step",
              status: "completed", // Was completed
              order: 0,
            }),
          },
          after: {
            data: () => ({
              id: "step-1",
              title: "First Step",
              status: "pending", // Now reset to pending
              order: 0,
            }),
          },
        },
      };

      await capturedStepUpdateHandler(event);

      // Should update project with recalculated currentStepIndex (0 completed steps)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          currentStepIndex: 0,
          status: "active",
        })
      );
    });
  });

  describe("onStepCreate", () => {
    beforeEach(() => {
      // Mock project lookup
      mockGet.mockResolvedValue({
        data: () => ({
          id: "project-123",
          userId: "user-456",
          title: "Test Project",
          status: "active",
          currentStepIndex: 0,
        }),
      });
    });

    it("should trigger automation for first automatable step", async () => {
      const event = {
        params: { projectId: "project-123", stepId: "step-1" },
        data: {
          data: () => ({
            id: "step-1",
            title: "First Step",
            description: "A simple task",
            status: "pending",
            order: 0, // First step
            automatable: true,
            automationAttempted: false,
          }),
        },
      };

      await capturedStepCreateHandler(event);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          automationAttempted: true,
        })
      );
    });

    it("should not trigger automation for non-first steps", async () => {
      const event = {
        params: { projectId: "project-123", stepId: "step-2" },
        data: {
          data: () => ({
            id: "step-2",
            title: "Second Step",
            description: "A simple task",
            status: "pending",
            order: 1, // Not first step
            automatable: true,
            automationAttempted: false,
          }),
        },
      };

      await capturedStepCreateHandler(event);

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("should not trigger automation for non-automatable first step", async () => {
      const event = {
        params: { projectId: "project-123", stepId: "step-1" },
        data: {
          data: () => ({
            id: "step-1",
            title: "First Step",
            description: "Manual task",
            status: "pending",
            order: 0,
            automatable: false, // Not automatable
          }),
        },
      };

      await capturedStepCreateHandler(event);

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("should handle missing project gracefully", async () => {
      mockGet.mockResolvedValue({
        data: () => undefined,
      });

      const event = {
        params: { projectId: "missing-project", stepId: "step-1" },
        data: {
          data: () => ({
            id: "step-1",
            title: "First Step",
            order: 0,
            automatable: true,
          }),
        },
      };

      await capturedStepCreateHandler(event);

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("sendNotification with FCM", () => {
    it("should send push notification when FCM tokens exist", async () => {
      // Mock FCM tokens exist for user
      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [
            { data: () => ({ token: "fcm-token-1", userId: "user-456" }) },
            { data: () => ({ token: "fcm-token-2", userId: "user-456" }) },
          ],
        }),
      });

      const projectData = {
        id: "project-123",
        userId: "user-456",
        title: "Test Project",
        status: "active",
        currentStepIndex: 0,
      };

      const event = {
        params: { projectId: "project-123" },
        data: {
          data: () => projectData,
        },
      };

      await capturedProjectCreateHandler(event);

      // Verify FCM was called with correct payload
      expect(mockSendEachForMulticast).toHaveBeenCalledWith({
        notification: {
          title: "Project Created!",
          body: '"Test Project" is ready to go.',
        },
        data: {
          projectId: "project-123",
          stepId: "",
          type: "project_created",
        },
        tokens: ["fcm-token-1", "fcm-token-2"],
      });
    });

    it("should include stepId in FCM data payload for step notifications", async () => {
      // Mock project lookup
      mockGet.mockResolvedValue({
        data: () => ({
          id: "project-123",
          userId: "user-456",
          title: "Test Project",
          status: "active",
          currentStepIndex: 0,
        }),
      });

      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [{ data: () => ({ token: "fcm-token-1", userId: "user-456" }) }],
        }),
      });

      mockOrderBy.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: "step-1",
              data: () => ({
                id: "step-1",
                title: "Only Step",
                status: "completed",
                order: 0,
                automatable: false,
              }),
            },
          ],
        }),
      });

      const event = {
        params: { projectId: "project-123", stepId: "step-1" },
        data: {
          before: {
            data: () => ({
              id: "step-1",
              title: "Only Step",
              status: "in_progress",
              order: 0,
            }),
          },
          after: {
            data: () => ({
              id: "step-1",
              title: "Only Step",
              status: "completed",
              order: 0,
            }),
          },
        },
      };

      await capturedStepUpdateHandler(event);

      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            projectId: "project-123",
            stepId: "step-1",
            type: "step_completed",
          }),
        })
      );
    });

    it("should not call FCM when no tokens exist", async () => {
      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
      });

      const projectData = {
        id: "project-123",
        userId: "user-456",
        title: "Test Project",
        status: "active",
        currentStepIndex: 0,
      };

      const event = {
        params: { projectId: "project-123" },
        data: {
          data: () => projectData,
        },
      };

      await capturedProjectCreateHandler(event);

      expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    });
  });
});
