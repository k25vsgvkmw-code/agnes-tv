CREATE TABLE IF NOT EXISTS health_bridges (
  id uuid PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  provider text NOT NULL,
  source_device_id text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  allowed_kinds jsonb NOT NULL DEFAULT '[]'::jsonb,
  auth_state text NOT NULL,
  last_heartbeat_at timestamptz,
  last_measurement_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, person_id, provider, source_device_id),
  CHECK (provider IN ('healthkit', 'health_connect')),
  CHECK (auth_state IN ('active', 'expired', 'revoked'))
);

CREATE TABLE IF NOT EXISTS health_measurements (
  id uuid PRIMARY KEY,
  bridge_id uuid NOT NULL REFERENCES health_bridges(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  kind text NOT NULL,
  value double precision NOT NULL,
  unit text NOT NULL,
  measured_at timestamptz NOT NULL,
  source_provider text NOT NULL,
  source_device_id text NOT NULL,
  external_id text,
  dedupe_key text NOT NULL UNIQUE,
  received_at timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind IN ('steps', 'heart_rate', 'sleep', 'weight', 'active_energy')),
  CHECK (unit IN ('count', 'bpm', 'minutes', 'kg', 'kcal')),
  CHECK (source_provider IN ('healthkit', 'health_connect'))
);

CREATE INDEX IF NOT EXISTS health_measurements_person_measured_idx
  ON health_measurements (person_id, measured_at DESC);

CREATE INDEX IF NOT EXISTS health_measurements_bridge_measured_idx
  ON health_measurements (bridge_id, measured_at DESC);
