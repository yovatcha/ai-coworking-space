import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MEMBERS, isMemberId, isHexColor, resolveColor } from "@/lib/members";

// GET /api/member-color            -> every member's colour (the room paints with this)
// GET /api/member-color?memberId=  -> one member's colour
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");

  if (memberId) {
    if (!isMemberId(memberId)) {
      return NextResponse.json({ error: "Unknown member" }, { status: 400 });
    }
    const row = await prisma.memberColor.findUnique({ where: { memberId } });
    return NextResponse.json({ memberId, color: resolveColor(row?.color, memberId) });
  }

  const rows = await prisma.memberColor.findMany();
  const saved = new Map(rows.map((r) => [r.memberId, r.color]));
  const colors: Record<string, string> = {};
  for (const id of Object.keys(MEMBERS)) {
    colors[id] = resolveColor(saved.get(id), id);
  }
  return NextResponse.json(colors);
}

// POST /api/member-color { memberId, color }
export async function POST(req: Request) {
  const { memberId, color } = await req.json();

  if (!isMemberId(memberId)) {
    return NextResponse.json({ error: "Unknown member" }, { status: 400 });
  }
  // Enforced here as well as in the UI — the button being hidden is not a rule.
  if (!MEMBERS[memberId].canChangeColor) {
    return NextResponse.json({ error: "This member cannot change colour" }, { status: 403 });
  }
  if (!isHexColor(color)) {
    return NextResponse.json({ error: "Colour must be #rrggbb" }, { status: 400 });
  }

  await prisma.memberColor.upsert({
    where: { memberId },
    update: { color },
    create: { memberId, color },
  });

  return NextResponse.json({ memberId, color });
}
