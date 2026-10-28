import { test } from "node:test";
import assert from "node:assert/strict";

const { absenceRun, riskOf, attendanceFields, taskFor, snoozed, studentFromContact, validContactIds, FIELD_NAMES } = await import("../lib/crm.js");
const store = await import("../lib/democrm-store.js");
const { DEMO_CONTACTS, demoContact } = await import("../lib/democrm-data.js");
const { weekdayOf } = await import("../lib/register.js");

const m = (iso, status) => ({ iso, status });

test("an absence run counts back from the newest mark and stops at the first mark that is not absent", () => {
  const marks = [m("2026-10-26", "absent"), m("2026-10-27", "absent"), m("2026-10-28", "absent"), m("2026-10-23", "present"), m("2026-10-22", "absent")];
  assert.equal(absenceRun(marks), 3);
  assert.equal(absenceRun([m("2026-10-28", "late"), m("2026-10-27", "absent")]), 0);
  assert.equal(absenceRun([]), 0);
});

test("days off do not break or extend a run", () => {
  const marks = [m("2026-10-28", "absent"), m("2026-10-27", "absent"), m("2026-10-26", "absent")];
  assert.equal(absenceRun(marks, new Set(["2026-10-28"])), 2);
});

test("a check-in is suggested for a run of three or for low attendance with enough marks, never on thin data", () => {
  assert.equal(riskOf({ marked: 10, pct: 95 }, 2), null);
  assert.match(riskOf({ marked: 10, pct: 95 }, 3).text, /3 absences in a row/);
  assert.match(riskOf({ marked: 10, pct: 80 }, 0).text, /80%/);
  assert.equal(riskOf({ marked: 4, pct: 50 }, 0), null, "four marks is too few to judge a percentage");
  assert.equal(riskOf({ marked: 0, pct: null }, 0), null);
  const both = riskOf({ marked: 10, pct: 70 }, 4).text;
  assert.ok(both.includes("4 absences") && both.includes("70%"));
});

test("only numbers, a fixed status word and a date go to the CRM fields", () => {
  const f = attendanceFields({ marked: 10, pct: 92.5 }, null, "2026-10-28");
  assert.deepEqual(f, { [FIELD_NAMES.attendance]: 92.5, [FIELD_NAMES.status]: "On track", [FIELD_NAMES.lastMarked]: "2026-10-28" });
  assert.equal(attendanceFields({ marked: 10, pct: 60 }, { text: "x" }, null)[FIELD_NAMES.status], "Check in");
  assert.equal(attendanceFields({ marked: 0, pct: null }, null, null)[FIELD_NAMES.status], "No marks yet");
});

test("a task falls on a working day, two days out, with only server-built text", () => {
  for (const day of ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]) {
    const t = taskFor({ name: "Ada Lovelace", className: "10B" }, { pct: 80 }, { text: "3 absences in a row" }, day);
    assert.ok(![0, 6].includes(weekdayOf(t.due)), `${day} -> ${t.due}`);
    assert.ok(t.due > day);
  }
  const t = taskFor({ name: "Ada Lovelace", className: "10B" }, { pct: null }, { text: "x" }, "2026-10-26");
  assert.equal(t.subject, "Check in with Ada: x");
  assert.ok(t.description.includes("no marks yet"));
});

test("a dealt-with suggestion stays quiet for two weeks", () => {
  assert.equal(snoozed({ 5: "2026-10-20" }, 5, "2026-10-28"), true);
  assert.equal(snoozed({ 5: "2026-10-10" }, 5, "2026-10-28"), false);
  assert.equal(snoozed({}, 5, "2026-10-28"), false);
  assert.equal(snoozed(undefined, 5, "2026-10-28"), false);
  assert.equal(store.isSnoozed({ tasked: { 5: "2026-10-20" } }, 5, "2026-10-28"), true);
  assert.equal(store.isSnoozed({ tasked: { 5: "2026-10-10" } }, 5, "2026-10-28"), false);
});

test("imported contacts are tidied: length capped, odd phone numbers dropped, nameless ones skipped", () => {
  assert.deepEqual(studentFromContact({ name: "  Ada   Lovelace ", mobile: "07700 900123" }), { name: "Ada Lovelace", contact: "07700 900123" });
  assert.equal(studentFromContact({ name: "A".repeat(80) }).name.length, 50);
  assert.equal(studentFromContact({ name: "Bob", mobile: "call me <script>", phone: "020 7946 0000" }).contact, "020 7946 0000");
  assert.equal(studentFromContact({ name: "Bob", mobile: "+44 7700 900123 ext 9999999" }).contact, null);
  assert.equal(studentFromContact({ name: "   " }), null);
  assert.equal(studentFromContact(null), null);
});

test("contact id lists are bounded and plain", () => {
  assert.ok(validContactIds(["123456", "d01"]));
  assert.ok(!validContactIds([]));
  assert.ok(!validContactIds(["1; DROP"]));
  assert.ok(!validContactIds([1]));
  assert.ok(!validContactIds(Array.from({ length: 101 }, (_, i) => String(i + 10000))));
  assert.ok(!validContactIds("123456"));
});

test("the sample CRM store keeps links, notes, fields and tasks, and survives junk in storage", () => {
  let s = store.emptyStore();
  s = store.setLink(s, 7, DEMO_CONTACTS[0]);
  assert.deepEqual(s.links[7], { id: "d01", name: "Zainab Ali" });
  s = store.addNote(s, "d01", { title: "t", body: "b" }, "2026-10-28T10:00:00Z");
  s = store.setFields(s, "d01", { Here_Attendance: 90 });
  s = store.addTask(s, "d01", { subject: "s", due: "2026-10-30", description: "d" }, "2026-10-28T10:00:00Z");
  s = store.markTasked(s, 7, "2026-10-28");
  const round = store.readStore(JSON.stringify(s));
  assert.deepEqual(round, s);
  assert.equal(store.setLink(s, 7, null).links[7], undefined);
  for (const junk of ["", "null", "[]", "{\"links\":[],\"notes\":5}", "not json", "{\"links\":\"x\"}"]) {
    const r = store.readStore(junk);
    assert.deepEqual(Object.keys(r).sort(), ["fields", "links", "notes", "tasked", "tasks"]);
    assert.ok(Array.isArray(r.notes) && Array.isArray(r.tasks) && !Array.isArray(r.links));
  }
  const long = store.addNote(store.emptyStore(), "d01", { title: "x".repeat(900), body: "y".repeat(5000) }, "now");
  assert.equal(long.notes[0].title.length, 200);
  assert.equal(long.notes[0].body.length, 1000);
});

test("sample contacts are fixed, unique and made up", () => {
  assert.equal(new Set(DEMO_CONTACTS.map((c) => c.id)).size, DEMO_CONTACTS.length);
  assert.ok(DEMO_CONTACTS.every((c) => c.email.endsWith("@example.com") && c.phone.startsWith("07700 900")));
  assert.equal(demoContact("d01").name, "Zainab Ali");
  assert.equal(demoContact("nope"), null);
});
