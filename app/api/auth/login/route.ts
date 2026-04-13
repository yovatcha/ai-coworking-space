import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = await req.json();

  if (!process.env.ROOM_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  if (password === process.env.ROOM_PASSWORD) {
    return NextResponse.json({ ok: true });
  }

  // Small delay to slow brute-force attempts
  await new Promise((r) => setTimeout(r, 400));
  return NextResponse.json({ ok: false }, { status: 401 });
}
