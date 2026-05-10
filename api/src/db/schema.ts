export const sourceTypes = ["ios_demo", "seeded_demo"] as const;
export type SourceType = (typeof sourceTypes)[number];

export const collectionModes = ["bounded_passive", "detector", "demo_send", "seeded"] as const;
export type CollectionMode = (typeof collectionModes)[number];

export const candidateStatuses = ["monitoring", "verified", "assigned", "repaired", "recurring"] as const;
export type CandidateStatus = (typeof candidateStatuses)[number];

export const severityLevels = ["low", "medium", "high"] as const;
export type SeverityLevel = (typeof severityLevels)[number];

export const knownRoadFeatureTypes = [
  "speed_bump",
  "rail_crossing",
  "manhole_area",
  "bridge",
  "construction_zone",
  "other",
] as const;
export type KnownRoadFeatureType = (typeof knownRoadFeatureTypes)[number];

export const migrationTableName = "schema_migrations";
