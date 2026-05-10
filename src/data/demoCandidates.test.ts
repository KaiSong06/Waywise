import { demoCandidates } from "./demoCandidates";

describe("demo candidates", () => {
  it("uses the 2026 Toronto in-progress pothole service request locations", () => {
    expect(demoCandidates).toHaveLength(45);
    expect(demoCandidates.map((candidate) => candidate.address)).toContain(
      "Victoria Pr S 401 C W Ramp & Victoria Park Ave",
    );
    expect(demoCandidates.map((candidate) => candidate.address)).toContain(
      "Highway 27 S & Steeles Ave W",
    );
    expect(demoCandidates.map((candidate) => candidate.address)).toContain("M5V postal area");
    expect(demoCandidates.every((candidate) => candidate.status === "monitoring")).toBe(true);
  });
});
