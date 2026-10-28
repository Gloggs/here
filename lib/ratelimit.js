// A small per-server limit on how often one account can call a route. Vercel may run
// several copies of the app, so this slows abuse rather than stopping it outright.
const hits = new Map();

export function tooMany(key, max, windowMs = 60_000, now = Date.now()) {
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return list.length > max;
}
