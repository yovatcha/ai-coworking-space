import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/sheets — returns all sheets (shared across all users)
export async function GET() {
  const sheets = await prisma.sheetEntry.findMany({
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    sheets.map((s) => ({ ...s, columns: JSON.parse(s.columns) }))
  );
}

// POST /api/sheets
export async function POST(req: Request) {
  const { userId, name, sheetId, scriptUrl, columns } = await req.json();

  if (!userId || !name || !sheetId || !scriptUrl || !columns) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    const entry = await prisma.sheetEntry.create({
      data: { userId, name, sheetId, scriptUrl, columns: JSON.stringify(columns) },
    });
    return NextResponse.json({ ...entry, columns });
  } catch (err) {
    console.error("[POST /api/sheets]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/sheets?id=xxx
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.sheetEntry.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
