import { createStatusWorkflowService } from "./statusWorkflowService.js";

describe("status workflow service", () => {
  it("updates candidate status and appends status history", async () => {
    const updateCandidateStatus = vi.fn(async () => ({
      id: "candidate-1",
      previousStatus: "monitoring",
      status: "verified",
    }));
    const insertStatusHistory = vi.fn(async () => ({
      id: "history-1",
    }));
    const service = createStatusWorkflowService({
      candidatesRepository: {
        updateCandidateStatus,
      },
      statusHistoryRepository: {
        insertStatusHistory,
      },
    });

    const result = await service.updateStatus("candidate-1", "verified", "confirmed");

    expect(result).toEqual({
      id: "candidate-1",
      status: "verified",
    });
    expect(insertStatusHistory).toHaveBeenCalledWith({
      potholeCandidateId: "candidate-1",
      oldStatus: "monitoring",
      newStatus: "verified",
      note: "confirmed",
    });
  });
});
