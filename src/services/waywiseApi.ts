import type {
  CandidateFeatureCollection,
  CandidateFilters,
  CandidateStatus,
  CandidateSummary,
  PotholeCandidate,
} from "../domain/candidates";

type Fetcher = typeof fetch;

export interface WaywiseApiClient {
  listMapCandidates(filters: CandidateFilters): Promise<PotholeCandidate[]>;
  getDashboardSummary(): Promise<CandidateSummary>;
  updateCandidateStatus(id: string, status: CandidateStatus): Promise<{ id: string; status: CandidateStatus }>;
}

interface StatusUpdateResponse {
  id: string;
  status: CandidateStatus;
}

export function getConfiguredWaywiseApiBaseUrl(env: ImportMetaEnv = import.meta.env) {
  return normalizeBaseUrl(env.VITE_API_BASE_URL);
}

export function createWaywiseApiClient(baseUrl: string, fetcher: Fetcher = fetch): WaywiseApiClient {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  if (!normalizedBaseUrl) {
    throw new Error("Waywise API base URL is required");
  }

  return {
    async listMapCandidates(filters) {
      const collection = await fetchJson<CandidateFeatureCollection>(
        fetcher,
        buildMapCandidatesUrl(normalizedBaseUrl, filters),
      );

      return collection.features.map((feature) => feature.properties);
    },

    async getDashboardSummary() {
      return fetchJson<CandidateSummary>(fetcher, `${normalizedBaseUrl}/api/dashboard/summary`);
    },

    async updateCandidateStatus(id, status) {
      return fetchJson<StatusUpdateResponse>(
        fetcher,
        `${normalizedBaseUrl}/api/pothole-candidates/${encodeURIComponent(id)}/status`,
        {
          body: JSON.stringify({ status }),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        },
      );
    },
  };
}

function buildMapCandidatesUrl(baseUrl: string, filters: CandidateFilters) {
  const params = new URLSearchParams();

  if (filters.severities.length > 0) {
    params.set("severity", filters.severities.join(","));
  }

  if (filters.statuses.length > 0) {
    params.set("status", filters.statuses.join(","));
  }

  params.set("minConfidence", String(filters.minConfidence));

  if (filters.lastDetectedWithinHours !== "all") {
    params.set("lastDetectedWithinHours", String(filters.lastDetectedWithinHours));
  }

  params.set("activeOnly", "true");

  return `${baseUrl}/api/pothole-candidates/map?${params.toString()}`;
}

async function fetchJson<T>(fetcher: Fetcher, input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = init === undefined ? await fetcher(input) : await fetcher(input, init);

  if (!response.ok) {
    throw new Error(`Waywise API request failed: ${formatStatus(response)}`);
  }

  return response.json() as Promise<T>;
}

function normalizeBaseUrl(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed.replace(/\/+$/, "");
}

function formatStatus(response: Response) {
  const statusText = response.statusText || defaultStatusText(response.status);

  return statusText ? `${response.status} ${statusText}` : String(response.status);
}

function defaultStatusText(status: number) {
  switch (status) {
    case 400:
      return "Bad Request";
    case 404:
      return "Not Found";
    case 500:
      return "Internal Server Error";
    case 502:
      return "Bad Gateway";
    case 503:
      return "Service Unavailable";
    default:
      return "";
  }
}
