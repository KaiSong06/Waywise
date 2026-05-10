import type { CandidateStatus } from "../db/schema.js";
import type { ImpactEventPayload } from "../domain/impactEvent.js";

interface DemoTarget {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  status: CandidateStatus;
  sourceCount: number;
  eventsPerSource: number;
  baseImpactMagnitude: number;
}

const demoTargets: DemoTarget[] = [
  {
    id: "queen-spadina",
    address: "Queen St W & Spadina Ave",
    latitude: 43.6487,
    longitude: -79.396,
    status: "verified",
    sourceCount: 7,
    eventsPerSource: 2,
    baseImpactMagnitude: 8.4,
  },
  {
    id: "dundas-bathurst",
    address: "Dundas St W & Bathurst St",
    latitude: 43.6521,
    longitude: -79.4059,
    status: "assigned",
    sourceCount: 4,
    eventsPerSource: 2,
    baseImpactMagnitude: 6.3,
  },
  {
    id: "college-ossington",
    address: "College St & Ossington Ave",
    latitude: 43.6547,
    longitude: -79.4217,
    status: "monitoring",
    sourceCount: 2,
    eventsPerSource: 1,
    baseImpactMagnitude: 4.4,
  },
  {
    id: "adelaide-parliament",
    address: "Adelaide St E & Parliament St",
    latitude: 43.6513,
    longitude: -79.3619,
    status: "recurring",
    sourceCount: 6,
    eventsPerSource: 2,
    baseImpactMagnitude: 7.9,
  },
];

export function buildDemoSeedEvents(seed: string): Array<{
  targetId: string;
  status: CandidateStatus;
  event: ImpactEventPayload;
}> {
  const events: Array<{ targetId: string; status: CandidateStatus; event: ImpactEventPayload }> = [];
  const start = new Date("2026-05-10T09:00:00.000Z");

  for (const target of demoTargets) {
    for (let sourceIndex = 0; sourceIndex < target.sourceCount; sourceIndex += 1) {
      for (let eventIndex = 0; eventIndex < target.eventsPerSource; eventIndex += 1) {
        const offset = sourceIndex * target.eventsPerSource + eventIndex;
        events.push({
          targetId: target.id,
          status: target.status,
          event: {
            vehicleId: `${seed}-${target.id}-vehicle-${sourceIndex + 1}`,
            driveSessionId: `${seed}-${target.id}-session-${sourceIndex + 1}`,
            latitude: target.latitude + (offset % 4) * 0.000015,
            longitude: target.longitude - (offset % 5) * 0.000015,
            speed: 28 + (offset % 5) * 4,
            heading: (245 + offset * 7) % 360,
            impactMagnitude: Math.round((target.baseImpactMagnitude + (eventIndex % 2) * 0.4) * 10) / 10,
            verticalAcceleration: Math.round((target.baseImpactMagnitude / 3) * 10) / 10,
            gpsAccuracyMeters: 5 + (offset % 3),
            timestamp: new Date(start.getTime() + offset * 18 * 60 * 1000).toISOString(),
            sourceType: "seeded_demo",
            appVersion: "demo-seed",
            sensorWindowSummary: {
              samples: 16,
              target: target.address,
            },
          },
        });
      }
    }
  }

  return events;
}

export function demoTargetCount() {
  return demoTargets.length;
}

export function demoSyntheticSourceCount() {
  return demoTargets.reduce((total, target) => total + target.sourceCount, 0);
}
