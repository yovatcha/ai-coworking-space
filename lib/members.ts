// Fixed roster — see docs/adr/0005-fixed-roster-member-colors.md
//
// Pure data. Imported by API routes, React, and the Phaser scene, so it must
// not pull in React, Prisma, or Phaser.

export interface Member {
  label: string;
  /** Tint used until the member picks one. Guest never changes from this. */
  defaultColor: string;
  canChangeColor: boolean;
}

export const MEMBERS: Record<string, Member> = {
  yo:    { label: 'YO',    defaultColor: '#f7a84f', canChangeColor: true },
  phee:  { label: 'PHEE',  defaultColor: '#4f8ef7', canChangeColor: true },
  tent:  { label: 'TENT',  defaultColor: '#39d353', canChangeColor: true },
  art:   { label: 'ART',   defaultColor: '#e74c3c', canChangeColor: true },
  joe:   { label: 'JOE',   defaultColor: '#b18cff', canChangeColor: true },
  guest: { label: 'GUEST', defaultColor: '#9aa5b1', canChangeColor: false },
};

export const MEMBER_IDS = Object.keys(MEMBERS);
export const GUEST = 'guest';

/** Swatches offered in the colour picker. ORIGINAL leaves the art untinted. */
export const PALETTE = [
  { color: '#ffffff', label: 'ORIGINAL' },
  { color: '#f7a84f', label: 'ORANGE' },
  { color: '#4f8ef7', label: 'BLUE' },
  { color: '#39d353', label: 'GREEN' },
  { color: '#e74c3c', label: 'RED' },
  { color: '#b18cff', label: 'PURPLE' },
  { color: '#f7d794', label: 'SAND' },
  { color: '#7ee8e8', label: 'CYAN' },
];

const HEX = /^#[0-9a-f]{6}$/i;

export function isMemberId(id: unknown): id is string {
  return typeof id === 'string' && id in MEMBERS;
}

export function resolveMember(id: unknown): string {
  return isMemberId(id) ? id : GUEST;
}

/** Unknown or malformed colours fall back to the member's default. */
export function resolveColor(color: unknown, memberId: string): string {
  const member = MEMBERS[memberId] ?? MEMBERS[GUEST];
  if (!member.canChangeColor) return member.defaultColor;
  return typeof color === 'string' && HEX.test(color) ? color : member.defaultColor;
}

export const isHexColor = (c: unknown): c is string => typeof c === 'string' && HEX.test(c);

/** '#f7a84f' -> 0xf7a84f for Phaser's setTint. */
export const toTint = (hex: string): number => parseInt(hex.slice(1), 16);
