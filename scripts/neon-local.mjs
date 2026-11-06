// A local stand-in for Neon's SQL-over-HTTP endpoint, for end-to-end tests and screenshots only.
// It answers POST /sql with { query, params } or { queries: [...] } (a transaction), returning rows as raw
// text arrays, which is what @neondatabase/serverless expects. Point the app at it with
// NEON_LOCAL_SQL_URL=http://localhost:4445/sql (see docs/TESTING.md). Never used in production.
import http from "node:http";
import pg from "pg";

const PORT = Number(process.env.NEON_LOCAL_PORT || 4445);
const raw = (v) => v; // keep every value as Postgres sends it; the Neon driver parses types itself
const pool = new pg.Pool({
  connectionString: process.env.PG_URL || "postgres://postgres:postgres@127.0.0.1:6543/main",
  types: { getTypeParser: () => raw },
});

async function run(client, q) {
  const r = await client.query({ text: q.query, values: q.params || [], rowMode: "array" });
  return {
    command: r.command, rowCount: r.rowCount, rows: r.rows,
    fields: r.fields.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID, tableID: f.tableID, columnID: f.columnID,
      dataTypeSize: f.dataTypeSize, dataTypeModifier: f.dataTypeModifier, format: "text" })),
  };
}

http.createServer(async (req, res) => {
  if (req.method !== "POST") { res.writeHead(200).end("ok"); return; }
  let body = "";
  for await (const c of req) body += c;
  const client = await pool.connect();
  try {
    const j = JSON.parse(body || "{}");
    let out;
    if (Array.isArray(j.queries)) {
      await client.query("BEGIN");
      const results = [];
      for (const q of j.queries) results.push(await run(client, q));
      await client.query("COMMIT");
      out = { results };
    } else {
      out = await run(client, j);
    }
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(out));
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch { /* not in a transaction */ }
    res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ message: e.message, code: e.code }));
  } finally {
    client.release();
  }
}).listen(PORT, "127.0.0.1", () => console.log(`neon-local on http://localhost:${PORT}/sql`));
