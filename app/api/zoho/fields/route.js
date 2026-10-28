import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/auth";
import { cleanId, readJson } from "@/lib/validate";
import { zohoContext } from "@/lib/zoho-routes";
import { api } from "@/lib/providers/zoho";
import { studentFacts } from "@/lib/crm-data";

export const dynamic = "force-dynamic";

// POST /api/zoho/fields { studentId? }: writes attendance %, a status and the last marked date
// onto the linked Contact. Without studentId it does every linked student, up to 100.
// Only numbers, a fixed status word and a date are sent, all built here from stored marks.
export async function POST(req) {
  const body = (await readJson(req)) || {};
  let studentIds;
  const ctx = await zohoContext({ write: true });
  if (ctx.error) return ctx.error;
  const links = ctx.conn.settings.links || {};
  if (body.studentId !== undefined) {
    const id = cleanId(body.studentId);
    if (id.error) return badRequest("Student id is not valid.");
    if (!links[id.value]) return badRequest("Link this student to a Zoho Contact first.");
    studentIds = [id.value];
  } else {
    studentIds = Object.keys(links).map(Number).filter((n) => Number.isInteger(n)).slice(0, 100);
    if (!studentIds.length) return badRequest("No students are linked to Zoho Contacts yet.");
  }
  try {
    const facts = await studentFacts(ctx.ownerId, studentIds);
    const data = facts.map((f) => ({ id: links[f.student.id].id, ...f.fields }));
    if (!data.length) return badRequest("Nothing to update.");
    const r = await api(ctx.conn, "/Contacts", { method: "PUT", body: JSON.stringify({ data }) });
    const results = r.data || [];
    const ok = results.filter((x) => x.status === "success").length;
    if (!ok) {
      const code = results[0]?.code;
      return badRequest(code === "INVALID_DATA" || code === "INVALID_MODULE"
        ? "Zoho does not have the three Here_ fields on Contacts yet. Create them first, as shown on the Apps page."
        : `Zoho did not accept the update${code ? ` (${code})` : ""}.`);
    }
    return NextResponse.json({ updated: ok, failed: results.length - ok });
  } catch (error) {
    return serverError("zoho fields", error);
  }
}
