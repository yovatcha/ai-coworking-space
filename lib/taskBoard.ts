// Announce board data — see docs/adr/0007-announce-board-cross-app-feed.md
//
// Pure data. Imported by the API route, React, and the Phaser scene, so it must
// not pull in React, Prisma, or Phaser.

import { MEMBERS } from './members';

export interface WorkloadTask {
  id: string;
  text: string;
  cardTitle: string;
  laneTitle: string;
  boardName: string;
  priority: number;
  dueDate: string | null;
}

export interface WorkloadUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  tasks: WorkloadTask[];
}

export interface Workload {
  updatedAt: string;
  users: WorkloadUser[];
}

/**
 * irin-task-board users are LINE accounts, not roster members. If a LINE name
 * happens to be a member id or label ("yo", "PHEE"), paint them in that
 * member's colour so the board reads like the room; otherwise null.
 */
export function memberColorForName(name: string): string | null {
  const key = name.trim().toLowerCase();
  for (const [id, m] of Object.entries(MEMBERS)) {
    if (key === id || key === m.label.toLowerCase()) return m.defaultColor;
  }
  return null;
}
