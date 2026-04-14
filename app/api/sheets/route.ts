import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/sheets?userId=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const sheets = await prisma.sheetEntry.findMany({
    where: { userId },
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

  const entry = await prisma.sheetEntry.create({
    data: { userId, name, sheetId, scriptUrl, columns: JSON.stringify(columns) },
  });

  return NextResponse.json({ ...entry, columns });
}

// DELETE /api/sheets?id=xxx
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.sheetEntry.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
