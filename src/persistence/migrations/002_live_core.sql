CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  owner_person_id uuid REFERENCES people(id) ON DELETE SET NULL,
  device_type text NOT NULL CHECK (
    device_type IN ('PHONE', 'TABLET', 'TV', 'HOME_PANEL', 'SPEAKER', 'WATCH', 'COMPUTER', 'OTHER')
  ),
  platform text NOT NULL,
  room text,
  capabilities jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(capabilities) = 'array'),
  trust_level text NOT NULL CHECK (
    trust_level IN ('UNTRUSTED', 'LIMITED', 'TRUSTED', 'HIGH_TRUST')
  ),
  connection_state text NOT NULL CHECK (connection_state IN ('ONLINE', 'STALE', 'OFFLINE')),
  agent_version text NOT NULL,
  public_key_pem text NOT NULL,
  last_seen_at timestamptz NOT NULL,
  registered_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK (last_seen_at >= registered_at),
  CHECK (revoked_at IS NULL OR revoked_at >= registered_at)
);

CREATE INDEX IF NOT EXISTS devices_household_last_seen_idx
  ON devices(household_id, last_seen_at DESC)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS devices_reachable_idx
  ON devices(household_id, connection_state, last_seen_at DESC)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS device_push_tokens (
  id uuid PRIMARY KEY,
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  provider text NOT NULL,
  token text NOT NULL,
  created_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK (revoked_at IS NULL OR revoked_at >= created_at),
  UNIQUE (provider, token)
);

CREATE INDEX IF NOT EXISTS device_push_tokens_active_idx
  ON device_push_tokens(device_id, created_at DESC)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS offline_commands (
  id uuid PRIMARY KEY,
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  actor_person_id uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  capability text NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  base_version text,
  status text NOT NULL CHECK (status IN ('PENDING', 'APPLIED', 'REJECTED', 'EXPIRED')),
  applied_at timestamptz,
  rejection_code text,
  CHECK (expires_at > created_at),
  UNIQUE (device_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS offline_commands_pending_idx
  ON offline_commands(device_id, created_at)
  WHERE status = 'PENDING';
