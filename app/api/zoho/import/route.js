import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/auth";
import { cleanText, readJson } from "@/lib/validate";
import { updateSettings } from "@/lib/connections";
import { zohoContext } from "@/lib/zoho-routes";
import { api } from "@/lib/providers/zoho";
import { importStudents } from "@/lib/crm-data";
import { validContactIds } from "@/lib/crm";

export const dynamic = "force-dynamic";

const FIELDS = "Full_Name,Email,Phone,Mobile,Tag";
const shape = (c) => ({
  id: String(c.id), name: c.Full_Name || "", mobile: c.Mobile || null, phone: c.Phone || null,
  tags: Array.isArray(c.Tag) ? c.Tag.map((t) => String(t.name || "").slice(0, 40)).filter(Boolean) : [],
});

// GET /api/zoho/import?page=1: the user's newest Contacts, 100 at a time, with their tags.
export async function GET(req) {
  const page = Number(new URL(req.url).searchParams.get("page") || 1);
  if (!Number.isInteger(page) || page < 1 || page > 20) return badRequest("Page is not valid.");
  const ctx = await zohoContext({ write: true });
  if (ctx.error) return ctx.error;
  try {
    const r = await api(ctx.conn, `/Contacts?${new URLSearchParams({ fields: FIELDS, sort_by: "Created_Time", sort_order: "desc", per_page: "100", page: String(page) })}`);
    const links = ctx.conn.settings.links || {};
    const linkedContacts = new Set(Object.values(links).map((l) => l.id));
    const contacts = (r.data || []).map(shape).filter((c) => c.name).map((c) => ({ id: c.id, name: c.name, phone: c.mobile || c.phone, tags: c.tags, linked: linkedContacts.has(c.id) }));
    return NextResponse.json({ contacts, more: !!r.info?.more_records });
  } catch (error) {
    return serverError("zoho import list", error);
  }
}

// POST /api/zoho/import { ids, className }: adds students to a class from the chosen Contacts.
// The details are read from Zoho again here, so the browser only says which Contacts to use.
export async function POST(req) {
  const body = await readJson(req);
  const cls = cleanText(body?.className, { max: 30, required: true });
  if (cls.error) return badRequest("Please choose a class.");
  if (!validContactIds(body?.ids) || !body.ids.every((i) => /^\d{5,25}$/.test(i))) return badRequest("Choose between 1 and 100 Contacts.");
  const ctx = await zohoContext({ write: true });
  if (ctx.error) return ctx.error;
  try {
    const links = ctx.conn.settings.links || {};
    const already = new Set(Object.values(links).map((l) => l.id));
    const ids = body.ids.filter((i) => !already.has(i));
    if (!ids.length) return badRequest("Those Contacts are already linked to students.");
    const r = await api(ctx.conn, `/Contacts?${new URLSearchParams({ ids: ids.join(","), fields: FIELDS })}`);
    const found = (r.data || []).map(shape).filter((c) => ids.includes(c.id));
    const result = await importStudents(ctx.ownerId, cls.value, found);
    if (result.error) return badRequest(result.error);
    if (result.added.length) {
      await updateSettings(ctx.ownerId, "zoho", (s) => {
        const next = { ...(s.links || {}) };
        for (const a of result.added) next[a.studentId] = { id: a.contactId, name: a.name };
        return { ...s, links: next };
      });
    }
    return NextResponse.json({ added: result.added.length, skipped: body.ids.length - result.added.length });
  } catch (error) {
    return serverError("zoho import", error);
  }
}
