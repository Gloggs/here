import { test } from "node:test";
import assert from "node:assert/strict";

process.env.GUEST_SECRET = "test-secret";
const { newGuestId, guestCookieValue, verifyGuest, isGuest, guestCreatedAt, limitsFor, GUEST_TTL_MS } = await import("../lib/guest.js");

test("a signed guest cookie verifies, and a tampered one does not", async () => {
  const id = newGuestId();
  assert.ok(isGuest(id));
  const value = await guestCookieValue(id);
  assert.equal(await verifyGuest(value), id);
  assert.equal(await verifyGuest(value.slice(0, -2) + "xx"), null);
  const other = newGuestId();
  assert.equal(await verifyGuest(`${other}.${value.split(".").pop()}`), null); // signature from another id
  assert.equal(await verifyGuest("kp_123.abc"), null); // a real account id can never be faked as a guest
  assert.equal(await verifyGuest(undefined), null);
});

test("guest sessions expire after 24 hours", async () => {
  const old = `guest_${(Date.now() - GUEST_TTL_MS - 1000).toString(36)}_abcdef`;
  assert.ok(guestCreatedAt(old) < Date.now() - GUEST_TTL_MS);
  assert.equal(await verifyGuest(await guestCookieValue(old)), null);
});

test("guests get smaller limits and no photos", () => {
  assert.deepEqual(limitsFor("guest_x_1"), { classes: 5, students: 60, tasks: 50, photos: false });
  assert.equal(limitsFor("kp_abc").photos, true);
});

test("the sandbox is its own owner id with its own limits", async () => {
  const { isSandbox, SANDBOX_SUFFIX } = await import("../lib/guest.js");
  const user = "kp_123";
  assert.equal(isSandbox(user), false);
  assert.equal(isSandbox(`${user}${SANDBOX_SUFFIX}`), true);
  assert.equal(isSandbox(newGuestId()), true);
  assert.notEqual(`${user}${SANDBOX_SUFFIX}`, user);
  assert.equal(limitsFor(`${user}${SANDBOX_SUFFIX}`).photos, true);
  assert.ok(limitsFor(`${user}${SANDBOX_SUFFIX}`).students < limitsFor(user).students);
});
