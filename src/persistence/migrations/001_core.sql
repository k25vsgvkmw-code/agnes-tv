create table if not exists households (
  id uuid primary key,
  name text not null,
  timezone text not null,
  locale text not null,
  home_location_id text,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists people (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  display_name text not null,
  role text not null,
  birth_date date,
  locale text not null,
  timezone text not null,
  permissions_profile_id text,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists external_references (
  id uuid primary key,
  provider text not null,
  external_id text not null,
  external_version text,
  etag text,
  sync_token text,
  last_synced_at timestamptz not null,
  authoritative boolean not null default true,
  unique (provider, external_id)
);

create table if not exists calendar_events (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  owner_person_id uuid references people(id) on delete set null,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null,
  participants jsonb not null default '[]'::jsonb,
  location_id text,
  recurrence text,
  visibility text not null,
  status text not null,
  external_reference_id uuid unique references external_references(id) on delete set null,
  constraint calendar_events_valid_range check (ends_at > starts_at)
);

create table if not exists outbox_events (
  event_id uuid primary key,
  event_type text not null,
  event_version integer not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null,
  source text not null,
  household_id uuid not null,
  actor_id uuid,
  entity_type text,
  entity_id text,
  correlation_id text,
  causation_id text,
  payload jsonb not null,
  metadata jsonb not null default '{}'::jsonb,
  publication_state text not null default 'pending',
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  published_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index if not exists outbox_events_pending_idx
  on outbox_events (publication_state, available_at, created_at);
