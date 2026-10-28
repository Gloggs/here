import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/utils/dbConfig";
import { STUDENTS, STUDENT_PHOTOS } from "@/utils/schema";
import { getOwnerId, unauthorized, badRequest, notFound, serverError } from "@/lib/auth";
import { cleanId, readJson } from "@/lib/validate";
import { ownedStudent } from "@/lib/owned";
import { limitsFor } from "@/lib/guest";

export const dynamic = 'force-dynamic';

const MAX_BYTES = 150 * 1024; // photos are resized to 320px squares in the browser first
const TYPES = { "image/webp": [0x52, 0x49, 0x46, 0x46], "image/jpeg": [0xff, 0xd8, 0xff], "image/png": [0x89, 0x50, 0x4e, 0x47] };

// GET /api/student/N/photo: the photo itself, only for the account that owns the student.
export async function GET(_req, { params }) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const id = cleanId(params.id);
  if (id.error) return badRequest("Student id is not valid.");
  try {
    const r = await db.select({ mime: STUDENT_PHOTOS.mime, data: STUDENT_PHOTOS.data }).from(STUDENT_PHOTOS)
      .where(and(eq(STUDENT_PHOTOS.studentId, id.value), eq(STUDENT_PHOTOS.ownerId, ownerId))).limit(1);
    if (!r.length) return notFound("No photo.");
    return new Response(Buffer.from(r[0].data, "base64"), { headers: {
      "Content-Type": r[0].mime,
      // Private to this browser; the URL carries a version, so a new photo is a new URL.
      "Cache-Control": "private, max-age=31536000, immutable",
    } });
  } catch (error) {
    return serverError("photo GET", error);
  }
}

// PUT /api/student/N/photo { data: "data:image/webp;base64,..." }
export async function PUT(req, { params }) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const id = cleanId(params.id);
  if (id.error) return badRequest("Student id is not valid.");
  if (!limitsFor(ownerId).photos) return badRequest("Create a free account to add photos.");
  const body = await readJson(req);
  const m = /^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(body?.data || "");
  if (!m) return badRequest("Please choose a photo.");
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length > MAX_BYTES) return badRequest("That photo is too large.");
  if (!TYPES[m[1]].every((b, i) => bytes[i] === b)) return badRequest("That file is not a photo.");
  try {
    const student = await ownedStudent(ownerId, id.value);
    if (!student) return notFound("Student not found.");
    if (!student.photoConsent) return badRequest("Tick photo consent for this student first.");
    const now = new Date();
    await db.insert(STUDENT_PHOTOS).values({ studentId: id.value, ownerId, mime: m[1], data: m[2], updatedAt: now })
      .onConflictDoUpdate({ target: STUDENT_PHOTOS.studentId, set: { mime: m[1], data: m[2], updatedAt: now } });
    await db.update(STUDENTS).set({ photoAt: now }).where(and(eq(STUDENTS.id, id.value), eq(STUDENTS.ownerId, ownerId)));
    return NextResponse.json({ photoAt: now.toISOString() });
  } catch (error) {
    return serverError("photo PUT", error);
  }
}

// DELETE /api/student/N/photo
export async function DELETE(_req, { params }) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const id = cleanId(params.id);
  if (id.error) return badRequest("Student id is not valid.");
  try {
    if (!(await ownedStudent(ownerId, id.value))) return notFound("Student not found.");
    await db.delete(STUDENT_PHOTOS).where(and(eq(STUDENT_PHOTOS.studentId, id.value), eq(STUDENT_PHOTOS.ownerId, ownerId)));
    await db.update(STUDENTS).set({ photoAt: null }).where(and(eq(STUDENTS.id, id.value), eq(STUDENTS.ownerId, ownerId)));
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError("photo DELETE", error);
  }
}
