CREATE TABLE IF NOT EXISTS households (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  timezone text NOT NULL,
  locale text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS people (
  id uuid PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  role text NOT NULL,
  locale text NOT NULL,
  timezone text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS external_references (
  id bigserial PRIMARY KEY,
  provider text NOT NULL,
  external_id text NOT NULL,
  external_version text,
  etag text,
  sync_token text,
  last_synced_at timestamptz NOT NULL,
  authoritative boolean NOT NULL DEFAULT true,
  UNIQUE (provider, external_id)
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  owner_person_id uuid REFERENCES people(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  timezone text NOT NULL,
  participants jsonb NOT NULL DEFAULT '[]'::jsonb,
  visibility text NOT NULL,
  status text NOT NULL,
  external_reference_id bigint REFERENCES external_references(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS outbox_events (
  event_id uuid PRIMARY KEY,
  event_type text NOT NULL,
  event_version integer NOT NULL,
  event_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz,
  last_error text,
  UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS outbox_pending_idx
  ON outbox_events (published_at, next_attempt_at, created_at);

CREATE INDEX IF NOT EXISTS calendar_household_starts_idx
  ON calendar_events (household_id, starts_at);
