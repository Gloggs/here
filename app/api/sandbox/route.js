import { NextResponse } from "next/server";
import { getOwnerId, unauthorized, badRequest, serverError } from "@/lib/auth";
import { readJson } from "@/lib/validate";
import { isSandbox } from "@/lib/guest";
import { SANDBOX_ACTIONS, runSandbox } from "@/lib/sandbox";

export const dynamic = 'force-dynamic';

// POST /api/sandbox { action }: practice tools. Only ever runs inside a sandbox space,
// so a real register can never be reset or filled with made-up marks.
export async function POST(req) {
  const ownerId = await getOwnerId();
  if (!ownerId) return unauthorized();
  if (!isSandbox(ownerId)) return badRequest("Sandbox tools only work in the sandbox.");
  const body = await readJson(req);
  if (!SANDBOX_ACTIONS.includes(body?.action)) return badRequest("Unknown sandbox tool.");
  try {
    return NextResponse.json({ message: await runSandbox(ownerId, body.action) });
  } catch (error) {
    return serverError("sandbox POST", error);
  }
}
