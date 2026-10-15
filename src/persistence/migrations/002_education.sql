CREATE TABLE IF NOT EXISTS education_page_state (
  learner_id text NOT NULL,
  page_id text NOT NULL,
  state jsonb NOT NULL,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (learner_id, page_id)
);

CREATE TABLE IF NOT EXISTS education_resume (
  learner_id text PRIMARY KEY,
  state jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS education_progress (
  learner_id text PRIMARY KEY,
  state jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
