import { NextResponse } from "next/server";
import { getOwnerId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { isSandbox } from "@/lib/guest";
import { cleanId } from "@/lib/validate";
import { studentFacts } from "@/lib/crm-data";

export const dynamic = "force-dynamic";

// GET /api/crm/facts?ids=1,2,3: what the sample CRM is "sent" about these students.
// Sandbox and demo only. Real accounts use the Zoho routes, which build the same things.
export async function GET(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  if (!isSandbox(ownerId)) return badRequest("The sample CRM is for the sandbox and the demo.");
  const raw = (new URL(req.url).searchParams.get("ids") || "").split(",").filter(Boolean).slice(0, 100);
  const ids = raw.map(cleanId);
  if (!raw.length || ids.some((i) => i.error)) return badRequest("Student ids are not valid.");
  try {
    const facts = await studentFacts(ownerId, ids.map((i) => i.value));
    return NextResponse.json({ facts: facts.map((f) => ({ studentId: f.student.id, name: f.student.name, note: f.note, fields: f.fields, risk: f.risk, task: f.task })) });
  } catch (error) {
    return serverError("crm facts", error);
  }
}
