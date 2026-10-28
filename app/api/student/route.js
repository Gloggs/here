import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/utils/dbConfig";
import { STUDENTS, STUDENT_PHOTOS } from "@/utils/schema";
import { removeStudents } from "@/lib/cleanup";
import { containsProfanity } from "@/lib/utils";
import { limitsFor } from "@/lib/guest";
import { getOwnerId, unauthorized, badRequest, notFound, serverError } from "@/lib/auth";
import { cleanText, cleanContact, cleanId, readJson } from "@/lib/validate";
import { classExists, loadStudents } from "@/lib/data";

export const dynamic = 'force-dynamic';

const PUBLIC_FIELDS = {
  id: STUDENTS.id, name: STUDENTS.name, className: STUDENTS.grade,
  address: STUDENTS.address, contact: STUDENTS.contact,
  photoConsent: STUDENTS.photoConsent, photoAt: STUDENTS.photoAt,
};

/** Checks and tidies a student form. Returns { values } or { error }. */
export async function readStudent(ownerId, body) {
  const name = cleanText(body.name, { max: 50, required: true });
  if (name.error) return { error: `Name ${name.error}.` };
  const cls = cleanText(body.className ?? body.grade, { max: 30, required: true });
  if (cls.error) return { error: "Please choose a class." };
  const address = cleanText(body.address, { max: 100 });
  if (address.error) return { error: `Address ${address.error}.` };
  const contact = cleanContact(body.contact);
  if (contact.error) return { error: `Contact ${contact.error}.` };
  if (containsProfanity(name.value) || containsProfanity(address.value)) {
    return { error: "Please remove inappropriate words." };
  }
  if (!(await classExists(ownerId, cls.value))) return { error: "Please choose one of your classes." };
  const values = { name: name.value, grade: cls.value, address: address.value, contact: contact.value };
  if (body.photoConsent !== undefined) {
    if (typeof body.photoConsent !== "boolean") return { error: "Photo consent must be yes or no." };
    values.photoConsent = body.photoConsent;
    if (!body.photoConsent) values.photoAt = null; // withdrawing consent removes the photo
  }
  return { values };
}

// GET /api/student[?class=Name]
export async function GET(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const cls = cleanText(req.nextUrl.searchParams.get("class"), { max: 30 });
  if (cls.error) return badRequest("Class is not valid.");
  try {
    return NextResponse.json(await loadStudents(ownerId, cls.value));
  } catch (error) {
    return serverError("student GET", error);
  }
}

// POST /api/student
export async function POST(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const body = await readJson(req);
  if (!body) return badRequest("Please send the student details.");
  try {
    const { values, error } = await readStudent(ownerId, body);
    if (error) return badRequest(error);
    const count = await db.select({ n: sql`count(*)::int` }).from(STUDENTS).where(eq(STUDENTS.ownerId, ownerId));
    const max = limitsFor(ownerId).students;
    if (count[0].n >= max) return badRequest(`You can have up to ${max} students${max < 500 ? " in the demo. Create a free account for more" : ""}.`);
    const [created] = await db.insert(STUDENTS).values({ ...values, ownerId }).returning(PUBLIC_FIELDS);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return serverError("student POST", error);
  }
}

// PUT /api/student { id, ... }
export async function PUT(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const body = await readJson(req);
  if (!body) return badRequest("Please send the student details.");
  const id = cleanId(body.id);
  if (id.error) return badRequest("Student id is not valid.");
  try {
    const { values, error } = await readStudent(ownerId, body);
    if (error) return badRequest(error);
    const updated = await db.update(STUDENTS).set(values)
      .where(and(eq(STUDENTS.id, id.value), eq(STUDENTS.ownerId, ownerId)))
      .returning(PUBLIC_FIELDS);
    if (!updated.length) return notFound("Student not found.");
    if (values.photoConsent === false) {
      await db.delete(STUDENT_PHOTOS).where(and(eq(STUDENT_PHOTOS.studentId, id.value), eq(STUDENT_PHOTOS.ownerId, ownerId)));
    }
    return NextResponse.json(updated[0]);
  } catch (error) {
    return serverError("student PUT", error);
  }
}

// DELETE /api/student?id=N: also removes that student's marks.
export async function DELETE(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  const id = cleanId(req.nextUrl.searchParams.get("id"));
  if (id.error) return badRequest("Student id is not valid.");
  try {
    const found = await db.select({ id: STUDENTS.id }).from(STUDENTS)
      .where(and(eq(STUDENTS.id, id.value), eq(STUDENTS.ownerId, ownerId))).limit(1);
    if (!found.length) return notFound("Student not found.");
    await removeStudents(ownerId, [id.value]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError("student DELETE", error);
  }
}
