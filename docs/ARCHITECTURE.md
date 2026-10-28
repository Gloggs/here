# Architecture

## Overview

Here. is a Next.js 14 app using the App Router. Pages are React components. The server side is a set of route handlers under `app/api` that talk to Postgres through Drizzle ORM. Kinde handles sign-in. Everything is deployed on Vercel, with a database on Neon.

```
Browser (React pages)
   |  fetch, JSON
   v
middleware.js            rejects requests with no session or demo guest cookie
   |
app/api/**/route.js      checks the session again, validates input
   |
lib/data.js, lib/marks.js  every query filtered by owner_id
   |
Neon Postgres (Drizzle ORM)
```

## Folders

| Path | What lives there |
| --- | --- |
| `app/page.js` | Landing page, including the tap-to-try register in `app/_landing/DemoRegister.jsx` |
| `app/dashboard/` | The signed-in app: Today, Classes, Students, Reports, Settings, More |
| `app/dashboard/classes/[id]/` | One class, with Register, Month, Students and Settings tabs |
| `app/dashboard/ui.jsx` | Shared pieces: page header, panels, dialogs, search, forms |
| `app/api/` | Route handlers, one folder per resource |
| `app/_brand/` | Logo and wordmark |
| `lib/auth.js` | Session check (Kinde user or demo guest) and standard error responses |
| `lib/guest.js` | Signed guest ids for the demo, expiry and guest limits |
| `lib/sample.js` | The sample class that fills a new sandbox |
| `lib/sandbox.js` | Sandbox tools: fill today, simulate a bad week, add students, reset, empty |
| `lib/validate.js` | Input checks used by every route |
| `lib/register.js` | Pure date and attendance maths, register codes, streaks, CSV helpers |
| `lib/insights.js` | Pure maths for points, tasks, celebrations, goals and groups |
| `lib/owned.js`, `lib/cleanup.js` | Ownership checks and removing everything that belongs to a student or group |
| `lib/data.js`, `lib/marks.js` | Database reads and writes, always scoped to the account |
| `lib/client.js` | Browser-side fetch helper and date formatting |
| `utils/schema.jsx` | Table definitions |
| `drizzle/` | SQL migrations, run in order |
| `tests/` | Unit tests run with `node --test` |
| `docs/` | This guide, the design guide and decision records |

## Data model

| Table | Key columns | Notes |
| --- | --- | --- |
| `classes` | `owner_id`, `name`, `is_sample` | Unique per account by name |
| `students` | `owner_id`, `name`, `grade` (class name), `contact`, `address`, `is_sample` | |
| `attendance` | `owner_id`, `student_id`, `date` (MM/YYYY), `day`, `status`, `reason`, `note`, `marked_at` | One row per student per day, enforced by a unique index |
| `days_off` | `owner_id`, `day`, `label` | Left out of every percentage |
| `student_photos` | `student_id`, `owner_id`, `mime`, `data` | One small photo per student, base64 |
| `points` | `owner_id`, `student_id`, `behaviour`, `value` | +1 or -1 |
| `behaviours` | `owner_id`, `name`, `value`, `position` | Empty means the built-in list |
| `tasks` | `owner_id`, `class_id`, `title`, `due`, `notes` | |
| `task_marks` | `owner_id`, `task_id`, `student_id`, `status`, `share`, `note` | One per person per task |

`owner_id` is the Kinde user id. It is never taken from the browser: each route reads it from the session.

## Main API routes

| Route | Methods | Purpose |
| --- | --- | --- |
| `/api/overview` | GET | Today, this week, school year, students below 90%, absences with no reason |
| `/api/classes` | GET, POST, PUT, DELETE | List, create, rename and delete classes |
| `/api/student` | GET, POST, PUT, DELETE | Students, one at a time |
| `/api/student/bulk` | POST | Add up to 100 students from a pasted list |
| `/api/student/[id]` | GET | Profile: totals, weekday pattern, reasons, recent marks |
| `/api/attendance` | GET, POST, DELETE | Read a date range, set or clear one mark |
| `/api/attendance/rest` | POST | Mark everyone not yet marked as present |
| `/api/days-off` | GET, POST, DELETE | Half terms and bank holidays |
| `/api/export` | GET | CSV summary or every mark |
| `/api/sample` | POST, DELETE | Add or remove the sample class, with points and tasks |
| `/api/student/[id]/photo` | GET, PUT, DELETE | A student's photo, only for the owning account |
| `/api/points` | GET, POST, DELETE | Behaviour points for a class or a student, and undo |
| `/api/behaviours` | GET, PUT | The account's behaviour list |
| `/api/tasks` | GET, POST, PUT, DELETE | A group's tasks with everyone's results |
| `/api/tasks/marks` | POST, DELETE | One person's result and share for a task |
| `/api/account/export` | GET | Everything in the account as JSON |
| `/api/account` | DELETE | Remove everything in the account |
| `/api/space` | GET, POST | Which space the request is in, and switching between the real register and the sandbox |
| `/api/sandbox` | POST | Run a sandbox tool. Refused outside the sandbox |
| `/demo` | GET | Start a private guest demo with the sample class (no sign-up) |
| `/demo/end` | GET | Delete the guest's data and end the demo |

## How a mark is saved

1. The register updates on screen straight away (optimistic update).
2. `POST /api/attendance` checks the session, validates the date, status and reason, and confirms the student belongs to the account.
3. The mark is written with an upsert on the unique (account, student, day) key, so a double tap cannot create two rows.
4. If the request fails, the screen goes back to the previous mark and shows the error.

## Percentages

`lib/register.js` holds the maths, and it is unit tested.

- Attendance is (present + late) divided by marked sessions, to one decimal place.
- Days off are left out.
- Anyone under 90% is flagged, the Department for Education's persistent absence line.
- The school year starts on 1 September and weeks start on Monday.
