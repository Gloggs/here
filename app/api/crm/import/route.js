import { NextResponse } from "next/server";
import { getOwnerId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { isSandbox } from "@/lib/guest";
import { cleanText, readJson } from "@/lib/validate";
import { validContactIds } from "@/lib/crm";
import { demoContact } from "@/lib/democrm-data";
import { importStudents } from "@/lib/crm-data";

export const dynamic = "force-dynamic";

// POST /api/crm/import { ids, className }: adds students from sample CRM contacts.
// Only the fixed sample contacts exist, so the browser cannot make up names.
export async function POST(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  if (!isSandbox(ownerId)) return badRequest("The sample CRM is for the sandbox and the demo.");
  const body = await readJson(req);
  const cls = cleanText(body?.className, { max: 30, required: true });
  if (cls.error) return badRequest("Please choose a class.");
  if (!validContactIds(body?.ids, 20)) return badRequest("Choose between 1 and 20 contacts.");
  const people = body.ids.map(demoContact).filter(Boolean).map((c) => ({ id: c.id, name: c.name, phone: c.phone }));
  if (!people.length) return badRequest("Those contacts do not exist.");
  try {
    const r = await importStudents(ownerId, cls.value, people);
    if (r.error) return badRequest(r.error);
    return NextResponse.json({ added: r.added });
  } catch (error) {
    return serverError("crm import", error);
  }
}
