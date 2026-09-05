import { NextResponse } from "next/server";
import type { Workload } from "@/lib/taskBoard";

// GET /api/task-board — per-person open tasks from irin-task-board.
//
// Server-side proxy so the shared secret never reaches the browser. Fails soft:
// an unreachable upstream is a 503 the client renders as "offline", never a
// crash. See docs/adr/0007-announce-board-cross-app-feed.md
export async function GET() {
  const base = process.env.IRIN_TASK_BOARD_URL;
  const secret = process.env.IRIN_TASK_BOARD_SECRET;

  if (!base || !secret) {
    return NextResponse.json(
      { error: "IRIN_TASK_BOARD_URL / IRIN_TASK_BOARD_SECRET not set" },
      { status: 503 },
    );
  }

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/workload`, {
      headers: { authorization: `Bearer ${secret}` },
      // Many clients poll this; one upstream call per 30s is plenty
      next: { revalidate: 30 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `upstream ${res.status}` },
        { status: 503 },
      );
    }
    const data = (await res.json()) as Workload;
    return NextResponse.json(data);
  } catch (error) {
    console.error("/api/task-board error:", error);
    return NextResponse.json({ error: "upstream unreachable" }, { status: 503 });
  }
}
