"use client";
// Marks taken with no signal wait here, on the phone, until the connection is back.
// Built on idb (Jake Archibald's small promise wrapper for IndexedDB).
//
// The rule when changes clash: one entry per student per day, so if you tap twice while offline only your
// last tap is sent. When the signal returns the phone sends its entries in the order they were made, and the
// server keeps the last one it receives, the same as if you had tapped with a signal.
import { openDB, deleteDB } from "idb";

const DB = "here-offline";
const STORE = "outbox";
export const OUTBOX_EVENT = "here:outbox";

function open() {
  return openDB(DB, 1, { upgrade(db) { db.createObjectStore(STORE, { keyPath: "key" }); } });
}

function changed() { window.dispatchEvent(new Event(OUTBOX_EVENT)); }

/** Saves one change for later: { key, method, url, body }. A newer change for the same key replaces the older one. */
export async function queue(item) {
  const db = await open();
  await db.put(STORE, { ...item, at: Date.now() });
  changed();
}

/** Everything waiting, oldest first. */
export async function pending() {
  try {
    const db = await open();
    return (await db.getAll(STORE)).sort((a, b) => a.at - b.at);
  } catch { return []; }
}

let flushing = null;

/** Sends what is waiting, in order. Stops at the first sign of no connection and tries again later. */
export function flush() {
  if (flushing) return flushing;
  flushing = (async () => {
    const result = { sent: 0, failed: 0 };
    for (const item of await pending()) {
      let res;
      try {
        res = await fetch(item.url, { method: item.method, headers: item.body ? { "Content-Type": "application/json" } : undefined,
          body: item.body ? JSON.stringify(item.body) : undefined, cache: "no-store" });
      } catch { break; } // still no connection
      if (res.status === 401 || res.status >= 500) break; // signed out or a server problem: keep it and try later
      const db = await open();
      await db.delete(STORE, item.key);
      if (res.ok) result.sent++; else result.failed++; // a 4xx will never succeed, so it is dropped and reported
    }
    changed();
    return result;
  })().finally(() => { flushing = null; });
  return flushing;
}

/** Signing out or ending the demo leaves nothing behind on a shared phone. */
export async function clearDevice() {
  try { await deleteDB(DB); } catch { /* nothing stored */ }
  try { for (const name of await caches.keys()) if (name.startsWith("here-")) await caches.delete(name); } catch { /* no caches */ }
}
