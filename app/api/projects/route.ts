import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_DOC_CHARS = 100_000;

// GET /api/projects — all projects with their requirements (shared across the team)
export async function GET() {
  const [projects, requirements] = await Promise.all([
    prisma.project.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.requirement.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return NextResponse.json(
    projects.map((p) => ({
      ...p,
      requirements: requirements.filter((r) => r.projectId === p.id),
    }))
  );
}

// POST /api/projects
export async function POST(req: Request) {
  const { name, description = "", docName = "", docText = "", addedBy } = await req.json();

  if (!name || !addedBy) {
    return NextResponse.json({ error: "Missing name or addedBy" }, { status: 400 });
  }
  if (docText.length > MAX_DOC_CHARS) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  try {
    const existing = (await prisma.project.findMany()).find(
      (p) => p.name.toLowerCase() === String(name).toLowerCase()
    );
    if (existing) {
      return NextResponse.json(
        { error: "Project already exists", projectId: existing.id },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: { name, description, docName, docText, addedBy },
    });
    return NextResponse.json(project);
  } catch (err) {
    console.error("[POST /api/projects]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PATCH /api/projects — partial update { id, name?, description?, status?, docName?, docText? }
export async function PATCH(req: Request) {
  const { id, name, description, status, docName, docText } = await req.json();

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (typeof docText === "string" && docText.length > MAX_DOC_CHARS) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const data: Record<string, string> = {};
  if (typeof name === "string") data.name = name;
  if (typeof description === "string") data.description = description;
  if (typeof status === "string") data.status = status;
  if (typeof docName === "string") data.docName = docName;
  if (typeof docText === "string") data.docText = docText;

  try {
    const project = await prisma.project.update({ where: { id: Number(id) }, data });
    return NextResponse.json(project);
  } catch (err) {
    console.error("[PATCH /api/projects]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/projects?id=xxx
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.requirement.deleteMany({ where: { projectId: Number(id) } });
  await prisma.project.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
