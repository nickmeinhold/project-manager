import * as admin from "firebase-admin";

// Mock firebase-admin before importing the functions
jest.mock("firebase-admin", () => {
  const mockAdd = jest.fn().mockResolvedValue({ id: "notification-id" });
  const mockUpdate = jest.fn().mockResolvedValue({});
  const mockGet = jest.fn();
  const mockWhere = jest.fn();
  const mockOrderBy = jest.fn();
  const mockDelete = jest.fn().mockResolvedValue({});
  const mockBatchDelete = jest.fn();
  const mockBatchCommit = jest.fn().mockResolvedValue({});

  const mockCollection = jest.fn().mockReturnValue({
    add: mockAdd,
    doc: jest.fn().mockImplementation((docId: string) => ({
      get: mockGet,
      update: mockUpdate,
      delete: mockDelete,
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          update: mockUpdate,
        }),
        orderBy: mockOrderBy,
      }),
    })),
    where: mockWhere,
  });

  const mockDb = {
    collection: mockCollection,
    batch: jest.fn().mockReturnValue({
      delete: mockBatchDelete,
      commit: mockBatchCommit,
    }),
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
        fromDate: jest.fn().mockImplementation((date: Date) => ({
          toDate: () => date,
          seconds: Math.floor(date.getTime() / 1000),
        })),
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
    __mockDelete: mockDelete,
    __mockBatchDelete: mockBatchDelete,
    __mockBatchCommit: mockBatchCommit,
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
const mockOnSchedule = jest.fn();

jest.mock("firebase-functions/v2/firestore", () => ({
  onDocumentCreated: mockOnDocumentCreated,
  onDocumentUpdated: mockOnDocumentUpdated,
}));

jest.mock("firebase-functions/v2/scheduler", () => ({
  onSchedule: mockOnSchedule,
}));

describe("Firebase Functions", () => {
  let capturedProjectCreateHandler: Function;
  let capturedStepCreateHandler: Function;
  let capturedStepUpdateHandler: Function;
  let capturedCleanupHandler: Function;
  let mockAdd: jest.Mock;
  let mockGet: jest.Mock;
  let mockWhere: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockOrderBy: jest.Mock;
  let mockSendEachForMulticast: jest.Mock;
  let mockDelete: jest.Mock;
  let mockBatchDelete: jest.Mock;
  let mockBatchCommit: jest.Mock;

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
    mockOnSchedule.mockImplementation((_config, handler) => {
      capturedCleanupHandler = handler;
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
    mockDelete = (admin as any).__mockDelete;
    mockBatchDelete = (admin as any).__mockBatchDelete;
    mockBatchCommit = (admin as any).__mockBatchCommit;

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

    it("should delete invalid tokens when FCM returns registration-token-not-registered error", async () => {
      // Mock FCM tokens exist for user
      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [
            { data: () => ({ token: "valid-token", userId: "user-456" }) },
            { data: () => ({ token: "invalid-token", userId: "user-456" }) },
          ],
        }),
      });

      // Mock FCM response with one failure
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 1,
        responses: [
          { success: true },
          {
            success: false,
            error: { code: "messaging/registration-token-not-registered" },
          },
        ],
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

      // Verify the invalid token was deleted
      expect(mockDelete).toHaveBeenCalled();
    });

    it("should delete invalid tokens when FCM returns invalid-registration-token error", async () => {
      // Mock FCM tokens exist for user
      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [
            { data: () => ({ token: "invalid-token-1", userId: "user-456" }) },
          ],
        }),
      });

      // Mock FCM response with failure
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 0,
        failureCount: 1,
        responses: [
          {
            success: false,
            error: { code: "messaging/invalid-registration-token" },
          },
        ],
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

      // Verify the invalid token was deleted
      expect(mockDelete).toHaveBeenCalled();
    });

    it("should not delete tokens for other FCM errors", async () => {
      // Mock FCM tokens exist for user
      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [{ data: () => ({ token: "token-1", userId: "user-456" }) }],
        }),
      });

      // Mock FCM response with a different error (e.g., quota exceeded)
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 0,
        failureCount: 1,
        responses: [
          {
            success: false,
            error: { code: "messaging/quota-exceeded" },
          },
        ],
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

      // Verify no tokens were deleted
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  describe("cleanupStaleFcmTokens", () => {
    it("should delete tokens older than 30 days", async () => {
      const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000); // 31 days ago
      const mockRef1 = { id: "stale-token-1" };
      const mockRef2 = { id: "stale-token-2" };

      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          empty: false,
          size: 2,
          docs: [
            { ref: mockRef1, data: () => ({ token: "stale-token-1", updatedAt: { toDate: () => oldDate } }) },
            { ref: mockRef2, data: () => ({ token: "stale-token-2", updatedAt: { toDate: () => oldDate } }) },
          ],
        }),
      });

      await capturedCleanupHandler();

      // Verify batch delete was called for stale tokens
      expect(mockBatchDelete).toHaveBeenCalledTimes(2);
      expect(mockBatchCommit).toHaveBeenCalled();
    });

    it("should not delete any tokens when none are stale", async () => {
      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          empty: true,
          size: 0,
          docs: [],
        }),
      });

      await capturedCleanupHandler();

      // Verify no batch operations were performed
      expect(mockBatchDelete).not.toHaveBeenCalled();
      expect(mockBatchCommit).not.toHaveBeenCalled();
    });

    it("should handle large batches of stale tokens", async () => {
      const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);

      // Create 600 stale tokens (should be processed in 2 batches of 500)
      const staleDocs = Array.from({ length: 600 }, (_, i) => ({
        ref: { id: `stale-token-${i}` },
        data: () => ({ token: `stale-token-${i}`, updatedAt: { toDate: () => oldDate } }),
      }));

      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          empty: false,
          size: 600,
          docs: staleDocs,
        }),
      });

      await capturedCleanupHandler();

      // Verify batch operations were performed (2 batches: 500 + 100)
      expect(mockBatchDelete).toHaveBeenCalledTimes(600);
      expect(mockBatchCommit).toHaveBeenCalledTimes(2);
    });
  });
});
