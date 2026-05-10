import { createTestApp } from "../test/appTestHarness.js";

describe("candidate recalculation route", () => {
  it("runs candidate recalculation on demand", async () => {
    const app = await createTestApp({
      candidateAssignmentService: {
        recalculateUnassignedEvents: vi.fn(async () => ({
          assignedEventCount: 3,
        })),
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/pothole-candidates/recalculate",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      assignedEventCount: 3,
    });
  });
});
