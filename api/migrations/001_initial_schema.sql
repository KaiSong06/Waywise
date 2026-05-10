CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS anonymous_sources (
  id text PRIMARY KEY,
  source_type text NOT NULL CHECK (source_type IN ('ios_demo', 'seeded_demo')),
  app_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS drive_sessions (
  id text PRIMARY KEY,
  anonymous_source_id text NOT NULL REFERENCES anonymous_sources(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  event_count integer NOT NULL DEFAULT 0 CHECK (event_count >= 0),
  collection_mode text NOT NULL DEFAULT 'demo_send'
    CHECK (collection_mode IN ('bounded_passive', 'detector', 'demo_send', 'seeded')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS impact_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_source_id text NOT NULL REFERENCES anonymous_sources(id) ON DELETE CASCADE,
  drive_session_id text NOT NULL REFERENCES drive_sessions(id) ON DELETE CASCADE,
  location geography(Point, 4326) NOT NULL,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  gps_accuracy_meters double precision CHECK (gps_accuracy_meters IS NULL OR gps_accuracy_meters >= 0),
  speed_kph double precision NOT NULL CHECK (speed_kph >= 0),
  heading_degrees double precision CHECK (heading_degrees IS NULL OR (heading_degrees >= 0 AND heading_degrees < 360)),
  impact_magnitude double precision NOT NULL CHECK (impact_magnitude >= 0),
  vertical_acceleration double precision,
  occurred_at timestamptz NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  source_type text NOT NULL CHECK (source_type IN ('ios_demo', 'seeded_demo')),
  sensor_window_summary jsonb,
  accepted boolean NOT NULL DEFAULT true,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pothole_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location geography(Point, 4326) NOT NULL,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  approximate_address text NOT NULL DEFAULT 'Unknown road segment',
  confidence_score integer NOT NULL DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
  severity_level text NOT NULL DEFAULT 'low' CHECK (severity_level IN ('low', 'medium', 'high')),
  heat_radius_meters integer NOT NULL DEFAULT 12 CHECK (heat_radius_meters > 0),
  heat_intensity double precision NOT NULL DEFAULT 0.2 CHECK (heat_intensity BETWEEN 0 AND 1),
  unique_source_count integer NOT NULL DEFAULT 0 CHECK (unique_source_count >= 0),
  event_count integer NOT NULL DEFAULT 0 CHECK (event_count >= 0),
  average_impact_magnitude double precision NOT NULL DEFAULT 0 CHECK (average_impact_magnitude >= 0),
  peak_impact_magnitude double precision NOT NULL DEFAULT 0 CHECK (peak_impact_magnitude >= 0),
  first_detected_at timestamptz,
  last_detected_at timestamptz,
  status text NOT NULL DEFAULT 'monitoring'
    CHECK (status IN ('monitoring', 'verified', 'assigned', 'repaired', 'recurring')),
  last_scored_at timestamptz,
  demo_run_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidate_events (
  pothole_candidate_id uuid NOT NULL REFERENCES pothole_candidates(id) ON DELETE CASCADE,
  impact_event_id uuid NOT NULL REFERENCES impact_events(id) ON DELETE CASCADE,
  distance_meters_from_candidate double precision NOT NULL CHECK (distance_meters_from_candidate >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pothole_candidate_id, impact_event_id)
);

CREATE TABLE IF NOT EXISTS status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pothole_candidate_id uuid NOT NULL REFERENCES pothole_candidates(id) ON DELETE CASCADE,
  old_status text CHECK (old_status IN ('monitoring', 'verified', 'assigned', 'repaired', 'recurring')),
  new_status text NOT NULL CHECK (new_status IN ('monitoring', 'verified', 'assigned', 'repaired', 'recurring')),
  changed_at timestamptz NOT NULL DEFAULT now(),
  note text
);

CREATE TABLE IF NOT EXISTS known_road_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_type text NOT NULL
    CHECK (feature_type IN ('speed_bump', 'rail_crossing', 'manhole_area', 'bridge', 'construction_zone', 'other')),
  location geography(Point, 4326) NOT NULL,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  radius_meters integer NOT NULL DEFAULT 15 CHECK (radius_meters > 0),
  confidence double precision NOT NULL DEFAULT 1 CHECK (confidence BETWEEN 0 AND 1),
  source text NOT NULL DEFAULT 'demo',
  active_from timestamptz,
  active_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS demo_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seed text NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  target_locations_count integer NOT NULL DEFAULT 0 CHECK (target_locations_count >= 0),
  synthetic_source_count integer NOT NULL DEFAULT 0 CHECK (synthetic_source_count >= 0),
  event_count integer NOT NULL DEFAULT 0 CHECK (event_count >= 0),
  error_message text
);

CREATE INDEX IF NOT EXISTS impact_events_location_idx ON impact_events USING gist (location);
CREATE INDEX IF NOT EXISTS impact_events_source_session_time_idx ON impact_events (anonymous_source_id, drive_session_id, occurred_at);
CREATE INDEX IF NOT EXISTS impact_events_accepted_time_idx ON impact_events (accepted, occurred_at);
CREATE INDEX IF NOT EXISTS pothole_candidates_location_idx ON pothole_candidates USING gist (location);
CREATE INDEX IF NOT EXISTS pothole_candidates_status_last_detected_idx ON pothole_candidates (status, last_detected_at DESC);
CREATE INDEX IF NOT EXISTS candidate_events_event_idx ON candidate_events (impact_event_id);
CREATE INDEX IF NOT EXISTS known_road_features_location_idx ON known_road_features USING gist (location);
