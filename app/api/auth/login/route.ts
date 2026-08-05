import { NextResponse } from "next/server";
import { MEMBERS, MEMBER_IDS, GUEST } from "@/lib/members";

/**
 * Each member has their own password so nobody can log in as somebody else:
 * PASSWORD_YO, PASSWORD_PHEE, PASSWORD_TENT, PASSWORD_ART, PASSWORD_JOE,
 * PASSWORD_GUEST. Guest falls back to the old ROOM_PASSWORD when
 * PASSWORD_GUEST is unset, so an existing deployment keeps working.
 */
function passwordFor(memberId: string): string | undefined {
  const own = process.env[`PASSWORD_${memberId.toUpperCase()}`];
  if (own) return own;
  return memberId === GUEST ? process.env.ROOM_PASSWORD : undefined;
}

export async function POST(req: Request) {
  const { password } = await req.json();

  if (typeof password !== "string" || !password) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Compare against every member so a wrong password costs the same as a right
  // one — no early return that would leak which slot matched.
  let matched: string | null = null;
  for (const id of MEMBER_IDS) {
    const expected = passwordFor(id);
    if (expected && password === expected) matched = id;
  }

  if (!matched) {
    // Small delay to slow brute-force attempts
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    memberId: matched,
    label: MEMBERS[matched].label,
  });
}
