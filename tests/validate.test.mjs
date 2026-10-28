import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanText, cleanContact, cleanId, cleanMonth, cleanDay } from "../lib/validate.js";

test("cleanText trims, enforces length and required", () => {
  assert.deepEqual(cleanText("  Ada  ", { max: 10 }), { value: "Ada" });
  assert.ok(cleanText("x".repeat(11), { max: 10 }).error);
  assert.ok(cleanText("   ", { required: true }).error);
  assert.deepEqual(cleanText(undefined), { value: null });
  assert.ok(cleanText(42).error);
});

test("contacts allow phone characters only", () => {
  assert.deepEqual(cleanContact("+44 (0)161 123-4567"), { value: "+44 (0)161 123-4567" });
  assert.ok(cleanContact("<script>").error);
});

test("ids must be positive whole numbers", () => {
  assert.deepEqual(cleanId("12"), { value: 12 });
  for (const bad of ["0", "-1", "1.5", "abc", 9999999999]) assert.ok(cleanId(bad).error, String(bad));
});

test("months and days are checked against the calendar", () => {
  assert.equal(cleanMonth("02/2024").daysInMonth, 29);
  assert.ok(cleanMonth("13/2026").error);
  assert.ok(cleanDay(31, 30).error);
  assert.deepEqual(cleanDay("30", 30), { value: 30 });
});
