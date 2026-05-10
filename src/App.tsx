import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, MapPin, RadioTower, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { defaultFilters, demoCandidates, severityOptions, statusOptions } from "./data/demoCandidates";
import {
  filterCandidates,
  summarizeCandidates,
  toCandidateFeatureCollection,
  updateCandidateStatus,
  type CandidateFilters,
  type CandidateStatus,
  type PotholeCandidate,
  type Severity,
} from "./domain/candidates";
import { MapView } from "./components/MapView";
import { MetricTile } from "./components/MetricTile";
import { createWaywiseApiClient, getConfiguredWaywiseApiBaseUrl } from "./services/waywiseApi";

const demoNow = new Date("2026-05-10T15:00:00Z");
const recencyOptions = [
  { label: "Any time", value: "all" },
  { label: "Last 24h", value: "24" },
  { label: "Last 72h", value: "72" },
];

const severityLabels: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const statusLabels: Record<CandidateStatus, string> = {
  monitoring: "Monitoring",
  verified: "Verified",
  assigned: "Assigned",
  repaired: "Repaired",
  recurring: "Recurring",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function toggleItem<T extends string>(items: T[], item: T) {
  return items.includes(item) ? items.filter((current) => current !== item) : [...items, item];
}

function CandidateButton({
  candidate,
  selected,
  onSelect,
}: {
  candidate: PotholeCandidate;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      className={`candidate-row ${selected ? "candidate-row-selected" : ""}`}
      onClick={() => onSelect(candidate.id)}
      type="button"
    >
      <span className={`severity-dot severity-${candidate.severity}`} />
      <span>
        <strong>{candidate.address}</strong>
        <small>
          {candidate.confidenceScore}% confidence · {candidate.uniqueSourceCount} sources
        </small>
      </span>
    </button>
  );
}

export default function App() {
  const apiBaseUrl = getConfiguredWaywiseApiBaseUrl();
  const apiClient = useMemo(
    () => (apiBaseUrl ? createWaywiseApiClient(apiBaseUrl) : undefined),
    [apiBaseUrl],
  );
  const [candidates, setCandidates] = useState<PotholeCandidate[]>(() =>
    apiClient ? [] : demoCandidates,
  );
  const [filters, setFilters] = useState<CandidateFilters>(defaultFilters);
  const [selectedId, setSelectedId] = useState(apiClient ? "" : demoCandidates[0].id);
  const [apiState, setApiState] = useState<"fixture" | "loading" | "connected" | "error">(
    apiClient ? "loading" : "fixture",
  );
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiClient) {
      setCandidates(demoCandidates);
      setSelectedId((current) => current || demoCandidates[0].id);
      setApiState("fixture");
      setApiError(null);
      return;
    }

    let cancelled = false;

    setApiState("loading");
    setApiError(null);

    apiClient
      .listMapCandidates(filters)
      .then((nextCandidates) => {
        if (cancelled) {
          return;
        }

        setCandidates(nextCandidates);
        setSelectedId((current) =>
          nextCandidates.some((candidate) => candidate.id === current)
            ? current
            : (nextCandidates[0]?.id ?? ""),
        );
        setApiState("connected");
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setCandidates((current) => current);
        setApiState("error");
        setApiError(error instanceof Error ? error.message : "Unable to load live API data");
      });

    return () => {
      cancelled = true;
    };
  }, [apiClient, filters]);

  const filteredCandidates = useMemo(
    () => (apiClient ? candidates : filterCandidates(candidates, filters, demoNow)),
    [apiClient, candidates, filters],
  );
  const visibleCandidates = filteredCandidates.length > 0 ? filteredCandidates : candidates;
  const selectedCandidate =
    visibleCandidates.find((candidate) => candidate.id === selectedId) ?? visibleCandidates[0];
  const summary = summarizeCandidates(filteredCandidates);
  const featureCollection = useMemo(
    () => toCandidateFeatureCollection(filteredCandidates),
    [filteredCandidates],
  );

  function updateSeverity(severity: Severity) {
    setFilters((current) => ({
      ...current,
      severities: toggleItem(current.severities, severity),
    }));
  }

  function updateStatusFilter(status: CandidateStatus) {
    setFilters((current) => ({
      ...current,
      statuses: toggleItem(current.statuses, status),
    }));
  }

  async function updateCandidate(status: CandidateStatus) {
    if (!selectedCandidate) {
      return;
    }

    if (!apiClient) {
      setCandidates((current) => updateCandidateStatus(current, selectedCandidate.id, status));
      return;
    }

    try {
      setApiError(null);
      const result = await apiClient.updateCandidateStatus(selectedCandidate.id, status);
      const nextCandidates = await apiClient.listMapCandidates(filters);

      setCandidates(nextCandidates);
      setSelectedId(
        nextCandidates.some((candidate) => candidate.id === result.id)
          ? result.id
          : (nextCandidates[0]?.id ?? ""),
      );
      setApiState("connected");
    } catch (error) {
      setApiState("error");
      setApiError(error instanceof Error ? error.message : "Unable to update candidate status");
    }
  }

  const liveChipLabel =
    apiState === "fixture"
      ? "Fixture mode"
      : apiState === "connected"
        ? "Live API connected"
        : apiState === "error"
          ? "Live API unavailable"
          : "Loading live API";

  function formatMaybeDateTime(value: string | null) {
    return value ? formatDateTime(value) : "No detections yet";
  }

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Municipal demo dashboard</p>
          <h1>Waywise Road Intelligence</h1>
          <p className="header-copy">
            Seeded fleet impacts and iPhone-originated events rendered as operational pothole
            candidate heat areas.
          </p>
        </div>
        <div className="live-chip">
          <RadioTower size={18} />
          {liveChipLabel}
        </div>
      </header>

      {apiError ? (
        <section className="api-alert" role="alert">
          <strong>Live API unavailable</strong>
          <span>{apiError}</span>
        </section>
      ) : null}

      <section className="metric-grid" aria-label="Dashboard summary">
        <MetricTile label="Active candidates" value={summary.active} icon={<Activity size={20} />} />
        <MetricTile label="High severity" value={summary.highSeverity} icon={<AlertTriangle size={20} />} />
        <MetricTile label="Avg. confidence" value={`${summary.averageConfidence}%`} icon={<ShieldCheck size={20} />} />
        <MetricTile label="Visible on map" value={filteredCandidates.length} icon={<MapPin size={20} />} />
      </section>

      <section className="workspace">
        <aside className="control-panel" aria-label="Dashboard filters">
          <div className="panel-heading">
            <SlidersHorizontal size={18} />
            <h2>Filters</h2>
          </div>

          <fieldset>
            <legend>Severity</legend>
            <div className="segmented-control">
              {severityOptions.map((severity) => (
                <button
                  className={filters.severities.includes(severity) ? "is-active" : ""}
                  key={severity}
                  onClick={() => updateSeverity(severity)}
                  type="button"
                >
                  {severityLabels[severity]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Status</legend>
            <div className="status-checks">
              {statusOptions.map((status) => (
                <label key={status}>
                  <input
                    checked={filters.statuses.includes(status)}
                    onChange={() => updateStatusFilter(status)}
                    type="checkbox"
                  />
                  {statusLabels[status]}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="range-control">
            <span>Minimum confidence</span>
            <input
              aria-label="Minimum confidence"
              max="100"
              min="0"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  minConfidence: Number(event.target.value),
                }))
              }
              type="range"
              value={filters.minConfidence}
            />
            <strong>{filters.minConfidence}%</strong>
          </label>

          <label className="select-control">
            <span>Last detected</span>
            <select
              value={String(filters.lastDetectedWithinHours)}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  lastDetectedWithinHours:
                    event.target.value === "all" ? "all" : Number(event.target.value),
                }))
              }
            >
              {recencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="candidate-list" aria-label="Pothole candidates">
            {visibleCandidates.length > 0 ? (
              visibleCandidates.map((candidate) => (
              <CandidateButton
                candidate={candidate}
                key={candidate.id}
                onSelect={setSelectedId}
                selected={candidate.id === selectedCandidate?.id}
              />
              ))
            ) : (
              <p className="empty-state">No pothole candidates available.</p>
            )}
          </div>
        </aside>

        <MapView
          candidates={filteredCandidates}
          featureCollection={featureCollection}
          onSelect={setSelectedId}
          selectedId={selectedCandidate?.id ?? ""}
        />

        <aside className="detail-panel" aria-label="Selected candidate details">
          {selectedCandidate ? (
            <>
              <div>
                <p className="eyebrow">Candidate details</p>
                <h2>{selectedCandidate.address}</h2>
                <span className={`severity-pill severity-${selectedCandidate.severity}`}>
                  {severityLabels[selectedCandidate.severity]} severity
                </span>
              </div>

              <dl className="detail-grid">
                <div>
                  <dt>Confidence score</dt>
                  <dd>{selectedCandidate.confidenceScore}%</dd>
                </div>
                <div>
                  <dt>Unique sources</dt>
                  <dd>{selectedCandidate.uniqueSourceCount}</dd>
                </div>
                <div>
                  <dt>Average impact</dt>
                  <dd>{selectedCandidate.averageImpactMagnitude.toFixed(1)}</dd>
                </div>
                <div>
                  <dt>Peak impact</dt>
                  <dd>{selectedCandidate.peakImpactMagnitude.toFixed(1)}</dd>
                </div>
                <div>
                  <dt>Coordinates</dt>
                  <dd>
                    {selectedCandidate.latitude.toFixed(4)}, {selectedCandidate.longitude.toFixed(4)}
                  </dd>
                </div>
                <div>
                  <dt>Last detected</dt>
                  <dd>{formatMaybeDateTime(selectedCandidate.lastDetectedAt)}</dd>
                </div>
              </dl>

              <label className="select-control">
                <span>Current status</span>
                <select
                  value={selectedCandidate.status}
                  onChange={(event) => void updateCandidate(event.target.value as CandidateStatus)}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <div className="detail-empty">
              <p className="eyebrow">Candidate details</p>
              <h2>No candidate selected</h2>
              <p>No live pothole candidates are available for the current filters.</p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
