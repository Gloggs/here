-- Register features: classes per account, present/late/absent with reasons, days off.
-- Safe to run more than once. Only adds things. Run after 0001_private_accounts.sql.

CREATE TABLE IF NOT EXISTS classes (
  id serial PRIMARY KEY,
  owner_id varchar(64) NOT NULL,
  name varchar(30) NOT NULL,
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS classes_owner_name_uq ON classes (owner_id, name);

ALTER TABLE students   ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE students   ALTER COLUMN grade TYPE varchar(30);

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS status varchar(10);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS reason varchar(30);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS note varchar(200);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS marked_at timestamptz;
UPDATE attendance SET status = CASE WHEN present THEN 'present' ELSE 'absent' END WHERE status IS NULL;

-- One mark per student per day.
DELETE FROM attendance a USING attendance b
 WHERE a.id > b.id AND a.owner_id IS NOT DISTINCT FROM b.owner_id
   AND a.student_id = b.student_id AND a.date = b.date AND a.day = b.day;
CREATE UNIQUE INDEX IF NOT EXISTS attendance_one_mark_uq ON attendance (owner_id, student_id, date, day);

CREATE TABLE IF NOT EXISTS days_off (
  id serial PRIMARY KEY,
  owner_id varchar(64) NOT NULL,
  day date NOT NULL,
  label varchar(40) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS days_off_owner_day_uq ON days_off (owner_id, day);

-- Turn each account's existing class labels into classes they own.
INSERT INTO classes (owner_id, name)
SELECT DISTINCT owner_id, grade FROM students WHERE owner_id IS NOT NULL
ON CONFLICT (owner_id, name) DO NOTHING;
