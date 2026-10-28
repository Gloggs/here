import { NextResponse } from "next/server";
import { getOwnerId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { addSample, removeSample } from "@/lib/sample";

export const dynamic = 'force-dynamic';

// POST /api/sample: adds a sample class with four weeks of marks, points and group tasks.
export async function POST() {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  try {
    const r = await addSample(ownerId);
    if (r.error) return badRequest(r.error);
    return NextResponse.json(r, { status: 201 });
  } catch (error) {
    return serverError("sample POST", error);
  }
}

// DELETE /api/sample: removes the sample class, its students and everything recorded for them.
export async function DELETE() {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  try {
    return NextResponse.json(await removeSample(ownerId));
  } catch (error) {
    return serverError("sample DELETE", error);
  }
}
