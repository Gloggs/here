-- Photos, points, tasks and class goals. Safe to run more than once. Only adds things.
-- Run after 0002_register_features.sql. The live app keeps working before and after.

-- Photo consent and when the photo last changed (null means no photo).
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_consent boolean NOT NULL DEFAULT false;
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_at timestamptz;

-- Small square photos, kept apart from students so lists stay light.
CREATE TABLE IF NOT EXISTS student_photos (
  student_id integer PRIMARY KEY,
  owner_id varchar(64) NOT NULL,
  mime varchar(20) NOT NULL,
  data text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS student_photos_owner_idx ON student_photos (owner_id);

-- A group can be a class or a team, with an optional weekly attendance goal.
ALTER TABLE classes ADD COLUMN IF NOT EXISTS kind varchar(10) NOT NULL DEFAULT 'class';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS goal_pct smallint;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS goal_reward varchar(60);

-- Behaviour points.
CREATE TABLE IF NOT EXISTS points (
  id serial PRIMARY KEY,
  owner_id varchar(64) NOT NULL,
  student_id integer NOT NULL,
  behaviour varchar(40) NOT NULL,
  value smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS points_owner_student_idx ON points (owner_id, student_id, created_at);

-- Each account's own list of behaviours. Empty means the built-in list is used.
CREATE TABLE IF NOT EXISTS behaviours (
  id serial PRIMARY KEY,
  owner_id varchar(64) NOT NULL,
  name varchar(40) NOT NULL,
  value smallint NOT NULL,
  position smallint NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS behaviours_owner_name_uq ON behaviours (owner_id, name);

-- Tasks for a group, and who did what.
CREATE TABLE IF NOT EXISTS tasks (
  id serial PRIMARY KEY,
  owner_id varchar(64) NOT NULL,
  class_id integer NOT NULL,
  title varchar(80) NOT NULL,
  due date NOT NULL,
  notes varchar(300),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tasks_owner_class_idx ON tasks (owner_id, class_id, due);

CREATE TABLE IF NOT EXISTS task_marks (
  id serial PRIMARY KEY,
  owner_id varchar(64) NOT NULL,
  task_id integer NOT NULL,
  student_id integer NOT NULL,
  status varchar(10) NOT NULL,
  share smallint,
  note varchar(200),
  marked_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS task_marks_one_uq ON task_marks (owner_id, task_id, student_id);
