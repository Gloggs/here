import { pgTable, serial, varchar, integer, smallint, boolean, text, index, uniqueIndex, timestamp, date } from 'drizzle-orm/pg-core';

// Every table except the legacy ones carries owner_id (the Kinde user id), and
// every query filters on it, so each account only ever sees its own records.

// Legacy shared class labels. No longer used by the app; kept so old data stays.
export const GRADES = pgTable('grades', {
  id: serial('id').primaryKey(),
  grade: varchar('grade', { length: 10 }).notNull(),
});

export const CLASSES = pgTable('classes', {
  id: serial('id').primaryKey(),
  ownerId: varchar('owner_id', { length: 64 }).notNull(),
  name: varchar('name', { length: 30 }).notNull(),
  isSample: boolean('is_sample').notNull().default(false),
  kind: varchar('kind', { length: 10 }).notNull().default('class'), // 'class' | 'team'
  goalPct: smallint('goal_pct'),
  goalReward: varchar('goal_reward', { length: 60 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ownerName: uniqueIndex('classes_owner_name_uq').on(t.ownerId, t.name),
}));

// `grade` holds the class name (kept as the column name for existing data).
export const STUDENTS = pgTable('students', {
  id: serial('id').primaryKey(),
  ownerId: varchar('owner_id', { length: 64 }),
  name: varchar('name', { length: 50 }).notNull(),
  grade: varchar('grade', { length: 30 }).notNull(),
  address: varchar('address', { length: 100 }),
  contact: varchar('contact', { length: 20 }),
  isSample: boolean('is_sample').notNull().default(false),
  photoConsent: boolean('photo_consent').notNull().default(false),
  photoAt: timestamp('photo_at', { withTimezone: true }),
}, (t) => ({
  ownerIdx: index('students_owner_idx').on(t.ownerId),
}));

// One mark per student per day. `date` is "MM/YYYY" and `day` is 1-31.
// status: 'present' | 'late' | 'absent'. `present` mirrors it for old data.
export const ATTENDANCE = pgTable('attendance', {
  id: serial('id').primaryKey(),
  ownerId: varchar('owner_id', { length: 64 }),
  studentId: integer('student_id').notNull(),
  present: boolean('present').default(false),
  status: varchar('status', { length: 10 }),
  reason: varchar('reason', { length: 30 }),
  note: varchar('note', { length: 200 }),
  markedAt: timestamp('marked_at', { withTimezone: true }),
  day: integer('day').notNull(),
  date: varchar('date', { length: 20 }).notNull(),
}, (t) => ({
  ownerDateIdx: index('attendance_owner_date_idx').on(t.ownerId, t.date),
  oneMark: uniqueIndex('attendance_one_mark_uq').on(t.ownerId, t.studentId, t.date, t.day),
}));

// Half-terms, bank holidays and closures: left out of every percentage.
export const DAYS_OFF = pgTable('days_off', {
  id: serial('id').primaryKey(),
  ownerId: varchar('owner_id', { length: 64 }).notNull(),
  day: date('day').notNull(),
  label: varchar('label', { length: 40 }).notNull(),
}, (t) => ({
  ownerDay: uniqueIndex('days_off_owner_day_uq').on(t.ownerId, t.day),
}));

// One small square photo per student, kept apart so student lists stay light.
export const STUDENT_PHOTOS = pgTable('student_photos', {
  studentId: integer('student_id').primaryKey(),
  ownerId: varchar('owner_id', { length: 64 }).notNull(),
  mime: varchar('mime', { length: 20 }).notNull(),
  data: text('data').notNull(), // base64
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Behaviour points: +1 for something good, -1 for something to work on.
export const POINTS = pgTable('points', {
  id: serial('id').primaryKey(),
  ownerId: varchar('owner_id', { length: 64 }).notNull(),
  studentId: integer('student_id').notNull(),
  behaviour: varchar('behaviour', { length: 40 }).notNull(),
  value: smallint('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const BEHAVIOURS = pgTable('behaviours', {
  id: serial('id').primaryKey(),
  ownerId: varchar('owner_id', { length: 64 }).notNull(),
  name: varchar('name', { length: 40 }).notNull(),
  value: smallint('value').notNull(),
  position: smallint('position').notNull().default(0),
}, (t) => ({
  ownerName: uniqueIndex('behaviours_owner_name_uq').on(t.ownerId, t.name),
}));

// Tasks for a group, and each member's result.
export const TASKS = pgTable('tasks', {
  id: serial('id').primaryKey(),
  ownerId: varchar('owner_id', { length: 64 }).notNull(),
  classId: integer('class_id').notNull(),
  title: varchar('title', { length: 80 }).notNull(),
  due: date('due').notNull(),
  notes: varchar('notes', { length: 300 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const TASK_MARKS = pgTable('task_marks', {
  id: serial('id').primaryKey(),
  ownerId: varchar('owner_id', { length: 64 }).notNull(),
  taskId: integer('task_id').notNull(),
  studentId: integer('student_id').notNull(),
  status: varchar('status', { length: 10 }).notNull(), // 'done' | 'late' | 'missed'
  share: smallint('share'),
  note: varchar('note', { length: 200 }),
  markedAt: timestamp('marked_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  one: uniqueIndex('task_marks_one_uq').on(t.ownerId, t.taskId, t.studentId),
}));

// The name an account chooses to be shown by. Keyed by the real user id, never the sandbox.
export const PROFILES = pgTable('profiles', {
  ownerId: varchar('owner_id', { length: 64 }).primaryKey(),
  displayName: varchar('display_name', { length: 60 }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Connected apps. access_token and refresh_token hold encrypted text only (see lib/crypto.js).
export const CONNECTIONS = pgTable('connections', {
  id: serial('id').primaryKey(),
  ownerId: varchar('owner_id', { length: 64 }).notNull(),
  provider: varchar('provider', { length: 20 }).notNull(),
  accountLabel: varchar('account_label', { length: 120 }),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  scope: text('scope'),
  apiDomain: varchar('api_domain', { length: 120 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  settings: text('settings'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  one: uniqueIndex('connections_owner_provider_uq').on(t.ownerId, t.provider),
}));

// Legacy. Nothing reads it any more.
export const SETTINGS = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 50 }).notNull().unique(),
  value: text('value'),
  updatedAt: varchar('updated_at', { length: 50 })
});
