CREATE TABLE IF NOT EXISTS households (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  timezone text NOT NULL,
  locale text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS people (
  id uuid PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('adult', 'child', 'guest')),
  locale text NOT NULL,
  timezone text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS external_references (
  id uuid PRIMARY KEY,
  provider text NOT NULL,
  external_id text NOT NULL,
  external_version text,
  etag text,
  sync_token text,
  last_synced_at timestamptz NOT NULL,
  authoritative boolean NOT NULL,
  UNIQUE (provider, external_id)
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  timezone text NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  external_reference_id uuid REFERENCES external_references(id),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS calendar_events_household_starts_idx
  ON calendar_events(household_id, starts_at);

CREATE TABLE IF NOT EXISTS outbox_events (
  event_id uuid PRIMARY KEY,
  event_type text NOT NULL,
  event_version integer NOT NULL CHECK (event_version > 0),
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL,
  source text NOT NULL,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  actor_id text,
  entity_type text,
  entity_id text,
  correlation_id text,
  causation_id uuid,
  payload jsonb NOT NULL,
  metadata jsonb NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  published_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outbox_events_pending_idx
  ON outbox_events(available_at, created_at)
  WHERE published_at IS NULL;
