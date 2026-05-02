CREATE TYPE request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_discord_id TEXT NOT NULL,
  target_discord_id TEXT NOT NULL,
  url TEXT NOT NULL,
  status request_status NOT NULL DEFAULT 'PENDING',
  file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX requests_status_idx ON requests (status);
CREATE INDEX requests_target_status_idx ON requests (target_discord_id, status);
