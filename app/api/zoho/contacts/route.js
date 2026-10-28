import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/auth";
import { zohoContext } from "@/lib/zoho-routes";
import { api } from "@/lib/providers/zoho";

export const dynamic = "force-dynamic";

// GET /api/zoho/contacts?q=: searches the user's own Zoho Contacts by name, email or phone.
export async function GET(req) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 2 || q.length > 60) return badRequest("Type at least two letters.");
  const ctx = await zohoContext();
  if (ctx.error) return ctx.error;
  try {
    const r = await api(ctx.conn, `/Contacts/search?${new URLSearchParams({ word: q, per_page: "10" })}`);
    const contacts = (r.data || []).map((c) => ({ id: String(c.id), name: c.Full_Name || "No name", email: c.Email || null, phone: c.Phone || null }));
    return NextResponse.json({ contacts });
  } catch (error) {
    return serverError("zoho contacts", error);
  }
}
