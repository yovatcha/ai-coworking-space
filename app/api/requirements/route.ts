import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/requirements
export async function POST(req: Request) {
  const { projectId, text, addedBy } = await req.json();

  if (!projectId || !text || !addedBy) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    const requirement = await prisma.requirement.create({
      data: { projectId: Number(projectId), text, addedBy },
    });
    return NextResponse.json(requirement);
  } catch (err) {
    console.error("[POST /api/requirements]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PATCH /api/requirements — { id, text }
export async function PATCH(req: Request) {
  const { id, text } = await req.json();

  if (!id || !text) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  try {
    const requirement = await prisma.requirement.update({
      where: { id: Number(id) },
      data: { text },
    });
    return NextResponse.json(requirement);
  } catch (err) {
    console.error("[PATCH /api/requirements]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/requirements?id=xxx
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.requirement.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
