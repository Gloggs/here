-- Private accounts: every student and attendance mark belongs to one signed-in user.
-- Safe to run more than once. It only adds things; it never deletes data.
-- Run it in the Neon SQL Editor before deploying the code that uses owner_id.

-- Tables (only created if they don't already exist, for fresh databases).
CREATE TABLE IF NOT EXISTS grades (
  id serial PRIMARY KEY,
  grade varchar(10) NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id serial PRIMARY KEY,
  name varchar(50) NOT NULL,
  grade varchar(10) NOT NULL,
  address varchar(100),
  contact varchar(20)
);

CREATE TABLE IF NOT EXISTS attendance (
  id serial PRIMARY KEY,
  student_id integer NOT NULL,
  present boolean DEFAULT false,
  day integer NOT NULL,
  date varchar(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id serial PRIMARY KEY,
  key varchar(50) NOT NULL UNIQUE,
  value text,
  updated_at varchar(50)
);

-- Owner columns. Existing rows keep owner_id = NULL, which means no account can see them.
ALTER TABLE students   ADD COLUMN IF NOT EXISTS owner_id varchar(64);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS owner_id varchar(64);

CREATE INDEX IF NOT EXISTS students_owner_idx        ON students (owner_id);
CREATE INDEX IF NOT EXISTS attendance_owner_date_idx ON attendance (owner_id, date);

-- The old admin PIN is no longer used anywhere.
DELETE FROM settings WHERE key = 'admin_pin';

-- Class labels for brand-new databases only (skipped if any classes exist).
INSERT INTO grades (grade)
SELECT g FROM (VALUES ('Year 7'), ('Year 8'), ('Year 9'), ('Year 10'), ('Year 11')) AS v(g)
WHERE NOT EXISTS (SELECT 1 FROM grades);
