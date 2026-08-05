// Who the local player is, and what colour they are.
// See docs/adr/0005-fixed-roster-member-colors.md
//
// localStorage is a cache for instant paint on load; Postgres is the source of
// truth (see /api/member-color). No Phaser or React imports.

import { GUEST, resolveMember, resolveColor } from '@/lib/members';

const MEMBER_KEY = 'cowork_member';
const COLOR_KEY = 'cowork_color';

export function getMemberId(): string {
  if (typeof window === 'undefined') return GUEST;
  return resolveMember(localStorage.getItem(MEMBER_KEY));
}

export function setMemberId(id: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MEMBER_KEY, resolveMember(id));
}

export function getColor(memberId = getMemberId()): string {
  if (typeof window === 'undefined') return resolveColor(null, memberId);
  return resolveColor(localStorage.getItem(COLOR_KEY), memberId);
}

export function setColor(color: string, memberId = getMemberId()) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(COLOR_KEY, resolveColor(color, memberId));
}

/** Pull the saved colour from Postgres and refresh the local cache. */
export async function syncColor(memberId: string): Promise<string> {
  try {
    const res = await fetch(`/api/member-color?memberId=${encodeURIComponent(memberId)}`);
    if (!res.ok) return getColor(memberId);
    const { color } = await res.json();
    const resolved = resolveColor(color, memberId);
    setColor(resolved, memberId);
    return resolved;
  } catch {
    return getColor(memberId);
  }
}

/** Save to Postgres, keeping the local cache in step. Returns false if rejected. */
export async function saveColor(memberId: string, color: string): Promise<boolean> {
  setColor(color, memberId);
  try {
    const res = await fetch('/api/member-color', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, color }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
