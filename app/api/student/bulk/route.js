import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/utils/dbConfig";
import { STUDENTS } from "@/utils/schema";
import { containsProfanity } from "@/lib/utils";
import { limitsFor } from "@/lib/guest";
import { getOwnerId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { cleanText, readJson } from "@/lib/validate";
import { classExists } from "@/lib/data";

export const dynamic = 'force-dynamic';


// POST /api/student/bulk { className, names: ["Ada Lovelace", ...] }: adds up to 100 at once.
export async function POST(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const body = await readJson(req);
  const cls = cleanText(body?.className, { max: 30, required: true });
  if (cls.error) return badRequest("Please choose a class.");
  if (!Array.isArray(body.names)) return badRequest("Please add at least one name.");
  const names = [...new Set(body.names
    .filter((n) => typeof n === "string")
    .map((n) => n.replace(/\s+/g, " ").trim())
    .filter(Boolean))];
  if (!names.length) return badRequest("Please add at least one name.");
  if (names.length > 100) return badRequest("Add up to 100 names at a time.");
  const tooLong = names.find((n) => n.length > 50);
  if (tooLong) return badRequest(`"${tooLong.slice(0, 20)}…" is longer than 50 characters.`);
  if (names.some(containsProfanity)) return badRequest("Please remove inappropriate words.");
  try {
    if (!(await classExists(ownerId, cls.value))) return badRequest("Please choose one of your classes.");
    const count = await db.select({ n: sql`count(*)::int` }).from(STUDENTS).where(eq(STUDENTS.ownerId, ownerId));
    const max = limitsFor(ownerId).students;
    if (count[0].n + names.length > max) return badRequest(`You can have up to ${max} students${max < 500 ? " in the demo. Create a free account for more" : ""}.`);
    const created = await db.insert(STUDENTS)
      .values(names.map((name) => ({ ownerId, name, grade: cls.value })))
      .returning({ id: STUDENTS.id, name: STUDENTS.name });
    return NextResponse.json({ added: created.length, students: created }, { status: 201 });
  } catch (error) {
    return serverError("student bulk POST", error);
  }
}
