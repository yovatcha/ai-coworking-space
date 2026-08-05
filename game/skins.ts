// Player avatar skins — see docs/adr/0002-player-avatar-skins.md
//
// Pure data + localStorage helpers. No Phaser import, so this is safe to pull
// into React (the login picker) as well as the scene.
//
// Only characters with a full 4-direction walk cycle can be a skin. The NPC
// sprites (ped, google-bro, sheet-bro) have two idle frames each and are not
// eligible.

export type Dir = 'down' | 'left' | 'right' | 'up';

interface Walk {
  /** Atlas frame prefix — copy it from the real filenames, typos included. */
  prefix: string;
  start: number;
  end: number;
  frameRate: number;
}

export interface Skin {
  label: string;
  /** Atlas frame shown when standing still. */
  idle: string;
  walk: Record<Dir, Walk>;
}

export const SKINS: Record<string, Skin> = {
  'main-charactor': {
    label: 'DREAMER',
    idle: 'main-charactor/front1',
    walk: {
      // 'arrowrleft' matches the source filename typo — see assets-src/main-charactor/
      down:  { prefix: 'main-charactor/arrowdown',  start: 1, end: 3, frameRate: 6 },
      left:  { prefix: 'main-charactor/arrowrleft', start: 1, end: 4, frameRate: 8 },
      right: { prefix: 'main-charactor/arrowright', start: 1, end: 4, frameRate: 8 },
      up:    { prefix: 'main-charactor/arrowup',    start: 1, end: 4, frameRate: 8 },
    },
  },
  rattatoiue: {
    label: 'RATTATOIUE',
    idle: 'rattatoiue/front1',
    walk: {
      down:  { prefix: 'rattatoiue/arrowdown',  start: 1, end: 4, frameRate: 8 },
      left:  { prefix: 'rattatoiue/arrowleft',  start: 1, end: 4, frameRate: 8 },
      right: { prefix: 'rattatoiue/arrowright', start: 1, end: 4, frameRate: 8 },
      up:    { prefix: 'rattatoiue/arrowup',    start: 1, end: 4, frameRate: 8 },
    },
  },
};

export const DEFAULT_SKIN = 'main-charactor';
export const SKIN_IDS = Object.keys(SKINS);

/** Animation keys are namespaced so two skins can animate independently. */
export const animKey = (skinId: string, name: 'idle' | `walk-${Dir}`) =>
  `${skinId}:${name}`;

/** Unknown ids (stale client, tampering) fall back rather than crashing. */
export function resolveSkin(id: unknown): string {
  return typeof id === 'string' && id in SKINS ? id : DEFAULT_SKIN;
}

const SKIN_KEY = 'cowork_skin';

export function getSkinId(): string {
  if (typeof window === 'undefined') return DEFAULT_SKIN;
  return resolveSkin(localStorage.getItem(SKIN_KEY));
}

export function setSkinId(id: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SKIN_KEY, resolveSkin(id));
}
