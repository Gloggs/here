import { NextResponse } from "next/server";
import { getOwnerId, getUserId, unauthorized, serverError } from "@/lib/auth";
import { SANDBOX_SUFFIX } from "@/lib/guest";
import { removeAccount, removeProfile } from "@/lib/cleanup";

export const dynamic = 'force-dynamic';

// DELETE /api/account: removes every class, student, photo, mark, point, task and day off this account owns,
// in both the real register and the sandbox.
export async function DELETE() {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  try {
    const userId = await getUserId();
    if (userId) { await removeAccount(userId); await removeAccount(`${userId}${SANDBOX_SUFFIX}`); await removeProfile(userId); }
    else await removeAccount(ownerId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError("account DELETE", error);
  }
}
