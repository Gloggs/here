import { NextResponse } from "next/server";
import { badRequest, notFound, serverError } from "@/lib/auth";
import { readJson, cleanId } from "@/lib/validate";
import { zohoContext } from "@/lib/zoho-routes";
import { api } from "@/lib/providers/zoho";
import { studentFacts } from "@/lib/crm-data";

export const dynamic = "force-dynamic";

// POST /api/zoho/note { studentId }: adds an attendance summary note to the linked Contact.
// The note is built here from stored marks, so the browser cannot send anything else to Zoho.
export async function POST(req) {
  const body = await readJson(req);
  const id = cleanId(body?.studentId);
  if (id.error) return badRequest("Student id is not valid.");
  const ctx = await zohoContext();
  if (ctx.error) return ctx.error;
  const link = ctx.conn.settings.links?.[id.value];
  if (!link) return badRequest("Link this student to a Zoho Contact first.");
  try {
    const [facts] = await studentFacts(ctx.ownerId, [id.value]);
    if (!facts) return notFound("Student not found.");
    await api(ctx.conn, `/Contacts/${link.id}/Notes`, { method: "POST", body: JSON.stringify({ data: [{ Note_Title: facts.note.title, Note_Content: facts.note.body }] }) });
    return NextResponse.json({ sent: true, to: link.name });
  } catch (error) {
    return serverError("zoho note", error);
  }
}
