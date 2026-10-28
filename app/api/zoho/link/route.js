import { NextResponse } from "next/server";
import { badRequest, notFound, serverError } from "@/lib/auth";
import { readJson, cleanId } from "@/lib/validate";
import { ownedStudent } from "@/lib/owned";
import { updateSettings } from "@/lib/connections";
import { zohoContext } from "@/lib/zoho-routes";

export const dynamic = "force-dynamic";

// GET /api/zoho/link?studentId=: which Zoho Contact a student is linked to, if any.
export async function GET(req) {
  const id = cleanId(new URL(req.url).searchParams.get("studentId"));
  if (id.error) return badRequest("Student id is not valid.");
  const ctx = await zohoContext();
  if (ctx.error) return NextResponse.json({ connected: false });
  return NextResponse.json({ connected: true, link: ctx.conn.settings.links?.[id.value] || null });
}

// POST /api/zoho/link { studentId, contactId, contactName }: links a student to a Contact.
// contactId null removes the link.
export async function POST(req) {
  const body = await readJson(req);
  const id = cleanId(body?.studentId);
  if (id.error) return badRequest("Student id is not valid.");
  const contactId = body?.contactId == null ? null : String(body.contactId);
  if (contactId !== null && !/^\d{5,25}$/.test(contactId)) return badRequest("Contact id is not valid.");
  const ctx = await zohoContext();
  if (ctx.error) return ctx.error;
  try {
    if (!(await ownedStudent(ctx.ownerId, id.value))) return notFound("Student not found.");
    const name = String(body?.contactName || "").slice(0, 120);
    await updateSettings(ctx.ownerId, "zoho", (s) => {
      const links = { ...(s.links || {}) };
      if (contactId) links[id.value] = { id: contactId, name }; else delete links[id.value];
      return { ...s, links };
    });
    return NextResponse.json({ link: contactId ? { id: contactId, name } : null });
  } catch (error) {
    return serverError("zoho link", error);
  }
}
