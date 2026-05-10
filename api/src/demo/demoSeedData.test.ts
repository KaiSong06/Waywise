import { buildDemoSeedEvents, demoSyntheticSourceCount, demoTargetCount } from "./demoSeedData.js";

describe("demo seed data", () => {
  it("uses the 2026 Toronto in-progress pothole service request locations", () => {
    const events = buildDemoSeedEvents("sr2026");
    const summaries = events.map((seedEvent) => seedEvent.event.sensorWindowSummary);

    expect(demoTargetCount()).toBe(45);
    expect(demoSyntheticSourceCount()).toBeGreaterThan(50);
    expect(events.length).toBeGreaterThan(demoSyntheticSourceCount());
    expect(
      summaries.some(
        (summary) =>
          isSeedSummary(summary) &&
          summary.target === "Victoria Pr S 401 C W Ramp & Victoria Park Ave" &&
          summary.ward === "Scarborough-Agincourt (22)",
      ),
    ).toBe(true);
    expect(
      summaries.some(
        (summary) =>
          isSeedSummary(summary) &&
          summary.target === "Highway 27 S & Steeles Ave W" &&
          summary.serviceRequestType === "Pothole on Expressway",
      ),
    ).toBe(true);
    expect(events.every((seedEvent) => seedEvent.status === "monitoring")).toBe(true);
  });
});

function isSeedSummary(
  summary: unknown,
): summary is { target: string; ward: string; serviceRequestType: string } {
  return Boolean(summary && typeof summary === "object" && "target" in summary);
}
