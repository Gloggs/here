import { NextResponse } from "next/server";
import { badRequest, notFound, serverError } from "@/lib/auth";
import { cleanId, readJson } from "@/lib/validate";
import { todayIso } from "@/lib/register";
import { snoozed } from "@/lib/crm";
import { updateSettings } from "@/lib/connections";
import { zohoContext } from "@/lib/zoho-routes";
import { api } from "@/lib/providers/zoho";
import { studentFacts } from "@/lib/crm-data";

export const dynamic = "force-dynamic";

async function suggestions(ctx) {
  const links = ctx.conn.settings.links || {};
  const tasked = ctx.conn.settings.tasked || {};
  const today = todayIso();
  const ids = Object.keys(links).map(Number).filter((n) => Number.isInteger(n)).slice(0, 100);
  return (await studentFacts(ctx.ownerId, ids))
    .filter((f) => f.risk && !snoozed(tasked, f.student.id, today))
    .map((f) => ({ f, link: links[f.student.id] }));
}

// GET /api/zoho/actions: linked students who need a check-in. Nothing is created in Zoho yet.
export async function GET() {
  const ctx = await zohoContext({ write: true });
  if (ctx.error) return ctx.error;
  try {
    const list = await suggestions(ctx);
    return NextResponse.json({ actions: list.map(({ f, link }) => ({ studentId: f.student.id, name: f.student.name, reason: f.risk.text, contactName: link.name })) });
  } catch (error) {
    return serverError("zoho actions", error);
  }
}

// POST /api/zoho/actions { studentId, dismiss? }: creates the Task after approval, or snoozes the suggestion.
// The suggestion is worked out again here, so a stale or forged request cannot create a Task.
export async function POST(req) {
  const body = await readJson(req);
  const id = cleanId(body?.studentId);
  if (id.error) return badRequest("Student id is not valid.");
  const ctx = await zohoContext({ write: true });
  if (ctx.error) return ctx.error;
  try {
    const match = (await suggestions(ctx)).find(({ f }) => f.student.id === id.value);
    if (!match) return notFound("That suggestion is no longer needed.");
    if (!body.dismiss) {
      const t = match.f.task;
      const r = await api(ctx.conn, "/Tasks", { method: "POST", body: JSON.stringify({ data: [{ Subject: t.subject, Due_Date: t.due, Description: t.description, Who_Id: { id: match.link.id } }] }) });
      if (r.data?.[0]?.status !== "success") return badRequest(`Zoho did not create the task${r.data?.[0]?.code ? ` (${r.data[0].code})` : ""}.`);
    }
    await updateSettings(ctx.ownerId, "zoho", (s) => ({ ...s, tasked: { ...(s.tasked || {}), [id.value]: todayIso() } }));
    return NextResponse.json({ created: !body.dismiss });
  } catch (error) {
    return serverError("zoho actions", error);
  }
}
