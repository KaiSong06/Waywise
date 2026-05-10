import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "./App";
import type { CandidateStatus, PotholeCandidate } from "./domain/candidates";

describe("App", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the dashboard skeleton with candidate triage data", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Waywise Road Intelligence" })).toBeInTheDocument();
    expect(screen.getByText("Active candidates")).toBeInTheDocument();
    expect(screen.getByText("Avg. confidence")).toBeInTheDocument();
    expect(screen.getByLabelText("Minimum confidence")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Queen St W & Spadina Ave/i }).length).toBeGreaterThan(0);
    expect(screen.getByText("Candidate details")).toBeInTheDocument();
    expect(screen.getByText("Unique sources")).toBeInTheDocument();
  });

  it("filters visible candidates by minimum confidence", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Minimum confidence"), {
      target: { value: "80" },
    });

    expect(screen.getAllByText("Queen St W & Spadina Ave").length).toBeGreaterThan(0);
    expect(screen.queryByText("College St & Ossington Ave")).not.toBeInTheDocument();
  });

  it("selects a candidate and updates its local status", () => {
    render(<App />);

    fireEvent.click(screen.getAllByRole("button", { name: /Dundas St W & Bathurst St/i })[0]);

    const detailPanel = screen.getByLabelText("Selected candidate details");
    expect(within(detailPanel).getByRole("heading", { name: "Dundas St W & Bathurst St" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Current status"), {
      target: { value: "verified" },
    });

    expect(screen.getByLabelText("Current status")).toHaveValue("verified");
  });

  it("loads candidate data from the live API when configured", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
    const fetchMock = mockFetchSequence(jsonResponse(featureCollection([apiCandidate()])));

    render(<App />);

    expect(await screen.findByText("Live API connected")).toBeInTheDocument();
    expect(screen.getAllByText("Queen St W & Spadina Ave").length).toBeGreaterThan(0);
    expect(screen.queryByText("College St & Ossington Ave")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/pothole-candidates/map?severity=low%2Cmedium%2Chigh&status=monitoring%2Cverified%2Cassigned%2Crecurring&minConfidence=0&activeOnly=true",
    );
  });

  it("sends filters to the live API", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
    const fetchMock = mockFetchSequence(
      jsonResponse(featureCollection([apiCandidate()])),
      jsonResponse(featureCollection([apiCandidate({ confidenceScore: 88 })])),
    );

    render(<App />);

    await screen.findByText("Live API connected");

    fireEvent.change(screen.getByLabelText("Minimum confidence"), {
      target: { value: "80" },
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "https://api.example.test/api/pothole-candidates/map?severity=low%2Cmedium%2Chigh&status=monitoring%2Cverified%2Cassigned%2Crecurring&minConfidence=80&activeOnly=true",
      );
    });
  });

  it("persists status changes through the live API", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
    mockFetchSequence(
      jsonResponse(featureCollection([apiCandidate()])),
      jsonResponse({ id: "candidate-1", status: "assigned" }),
    );

    render(<App />);

    await screen.findByText("Live API connected");

    fireEvent.change(screen.getByLabelText("Current status"), {
      target: { value: "assigned" },
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Current status")).toHaveValue("assigned");
    });
  });

  it("shows a live API error without silently falling back to fixtures", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
    mockFetchSequence(jsonResponse({ error: "unavailable" }, { status: 503 }));

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Live API unavailable");
    expect(screen.queryByText("Queen St W & Spadina Ave")).not.toBeInTheDocument();
  });
});

function mockFetchSequence(...responses: Response[]) {
  const fetchMock = vi.fn();

  responses.forEach((response) => {
    fetchMock.mockResolvedValueOnce(response);
  });

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function featureCollection(candidates: PotholeCandidate[]) {
  return {
    type: "FeatureCollection",
    features: candidates.map((candidate) => ({
      type: "Feature",
      id: candidate.id,
      geometry: {
        type: "Point",
        coordinates: [candidate.longitude, candidate.latitude],
      },
      properties: candidate,
    })),
  };
}

function apiCandidate(overrides: Partial<PotholeCandidate> = {}): PotholeCandidate {
  return {
    id: "candidate-1",
    address: "Queen St W & Spadina Ave",
    latitude: 43.6487,
    longitude: -79.396,
    confidenceScore: 91,
    severity: "high",
    heatRadiusMeters: 34,
    heatIntensity: 0.9,
    uniqueSourceCount: 8,
    eventCount: 21,
    averageImpactMagnitude: 7.8,
    peakImpactMagnitude: 9.4,
    firstDetectedAt: "2026-05-10T09:00:00.000Z",
    lastDetectedAt: "2026-05-10T14:00:00.000Z",
    status: "verified" as CandidateStatus,
    ...overrides,
  };
}
