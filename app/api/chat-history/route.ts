import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/chat-history?userId=xxx&npcId=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const npcId = searchParams.get("npcId");

  if (!userId || !npcId) {
    return NextResponse.json({ error: "Missing userId or npcId" }, { status: 400 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { userId, npcId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}

// POST /api/chat-history
export async function POST(req: Request) {
  const { userId, npcId, role, content } = await req.json();

  if (!userId || !npcId || !role || !content) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const message = await prisma.chatMessage.create({
    data: { userId, npcId, role, content },
  });

  return NextResponse.json(message);
}
