-- Display names and connected apps. Safe to run more than once. Only adds things.
-- Run after 0003_photos_points_tasks.sql. The live app keeps working before and after.

-- The name shown in the app. Sign-in only gives the name from Google or Microsoft,
-- so people can choose their own here.
CREATE TABLE IF NOT EXISTS profiles (
  owner_id varchar(64) PRIMARY KEY,
  display_name varchar(60) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One row per account per connected app. Tokens are encrypted by the app before
-- they are stored, so this table alone reveals nothing.
CREATE TABLE IF NOT EXISTS connections (
  id serial PRIMARY KEY,
  owner_id varchar(64) NOT NULL,
  provider varchar(20) NOT NULL,
  account_label varchar(120),
  access_token text NOT NULL,
  refresh_token text,
  scope text,
  api_domain varchar(120),
  expires_at timestamptz,
  settings text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS connections_owner_provider_uq ON connections (owner_id, provider);
