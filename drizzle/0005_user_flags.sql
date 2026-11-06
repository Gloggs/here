-- One-time things an account has seen, such as the first-run guide, so it shows once ever and not on every device.
-- Safe to run more than once. It only adds things; it never deletes data.
CREATE TABLE IF NOT EXISTS user_flags (
  owner_id varchar(64) NOT NULL,
  name varchar(40) NOT NULL,
  set_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, name)
);
