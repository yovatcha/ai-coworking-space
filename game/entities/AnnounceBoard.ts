import * as Phaser from 'phaser';
import type { Workload, WorkloadUser } from '@/lib/taskBoard';
import { memberColorForName } from '@/lib/taskBoard';

// Notice board on the back wall — see docs/adr/0007-announce-board-cross-app-feed.md
//
// Draws over the "WORK HARD / DRIVE PASSION" sign baked into bg3. Shows one
// person's open tasks at a time and rotates; [E] opens the full panel.
//
// A plain class owning its game objects rather than a Container subclass:
// Phaser 4's Container typings fight both `add.existing(this)` and a `body`
// field, and nothing here needs to move as a unit.

// The sofa keeps the player well back from this wall, so the reach is measured
// from the board's bottom edge and is wider than the NPCs' 120.
const INTERACT_DIST = 230;
const REFRESH_MS = 60_000;
const ROTATE_MS = 6_000;
const MAX_LINES = 3;
const LINE_CHARS = 26;

export const BOARD_W = 200;
export const BOARD_H = 100;

type Status = 'loading' | 'ok' | 'offline';

export default class AnnounceBoard {
  private title: Phaser.GameObjects.Text;
  private page: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;
  private users: WorkloadUser[] = [];
  private index = 0;
  private status: Status = 'loading';
  private alive = true;

  constructor(
    scene: Phaser.Scene,
    readonly x: number,
    readonly y: number,
  ) {
    // Above the background, below every actor (actors sort at 10+)
    const DEPTH = 5;
    scene.add
      .rectangle(x, y, BOARD_W, BOARD_H, 0x2b1d12)
      .setStrokeStyle(4, 0x6b4a2b)
      .setDepth(DEPTH);
    scene.add.rectangle(x, y, BOARD_W - 16, BOARD_H - 16, 0xf3e9d2).setDepth(DEPTH);

    const left = x - BOARD_W / 2 + 14;
    const top = y - BOARD_H / 2 + 12;
    this.title = scene.add
      .text(left, top, 'TEAM TASKS', {
        fontSize: '10px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: '#1a1c2c',
      })
      .setDepth(DEPTH);
    this.page = scene.add
      .text(left, top + 18, 'loading...', {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#2d2a26',
        lineSpacing: 3,
      })
      .setDepth(DEPTH);

    this.hint = scene.add
      .text(x, y + BOARD_H / 2 + 6, '[E] Read board', {
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 0)
      .setVisible(false)
      .setDepth(20);

    this.refresh();
    scene.time.addEvent({ delay: REFRESH_MS, loop: true, callback: () => this.refresh() });
    scene.time.addEvent({ delay: ROTATE_MS, loop: true, callback: () => this.rotate() });
    scene.events.once('shutdown', () => {
      this.alive = false;
    });
  }

  private async refresh() {
    try {
      const res = await fetch('/api/task-board');
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as Workload;
      this.users = data.users;
      this.status = 'ok';
    } catch {
      // Keep the last good list on screen; only the title says it is stale
      this.status = 'offline';
    }
    if (!this.alive) return; // scene shut down while the fetch was in flight
    this.render();
  }

  /** People who actually have something in hand — nobody wants to watch empty pages. */
  private busy(): WorkloadUser[] {
    return this.users.filter((u) => u.tasks.length > 0);
  }

  private rotate() {
    const n = this.busy().length;
    if (n === 0) return;
    this.index = (this.index + 1) % n;
    this.render();
  }

  private render() {
    const offline = this.status === 'offline';
    this.title.setText(offline ? 'TEAM TASKS (offline)' : 'TEAM TASKS');
    this.title.setColor(offline ? '#8a2b2b' : '#1a1c2c');

    if (this.status === 'loading') {
      this.page.setText('loading...');
      return;
    }

    const busy = this.busy();
    if (busy.length === 0) {
      this.page.setText(this.users.length ? 'all clear — nothing in hand' : 'no one on the board yet');
      this.page.setColor('#2d2a26');
      return;
    }

    if (this.index >= busy.length) this.index = 0;
    const u = busy[this.index];
    const n = u.tasks.length;
    const head = `${u.name.toUpperCase()} · ${n} task${n === 1 ? '' : 's'}`;
    const lines = [
      busy.length > 1 ? `${head}   ${this.index + 1}/${busy.length}` : head,
      ...u.tasks.slice(0, MAX_LINES).map((t) => '- ' + clip(`${t.cardTitle}: ${t.text}`, LINE_CHARS)),
    ];
    if (n > MAX_LINES) lines.push(`  +${n - MAX_LINES} more`);

    this.page.setText(lines);
    // Phaser Text is single-colour, so the whole page leans toward the member's
    // tint — darkened enough to stay legible on the cream paper.
    const color = memberColorForName(u.name);
    this.page.setColor(color ? darken(color) : '#2d2a26');
  }

  updateProximity(px: number, py: number): boolean {
    const near =
      Phaser.Math.Distance.Between(px, py, this.x, this.y + BOARD_H / 2) < INTERACT_DIST;
    this.hint.setVisible(near);
    return near;
  }

  interact() {
    window.dispatchEvent(new CustomEvent('task-board-open'));
  }
}

function clip(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

/** '#f7a84f' -> a darker shade that reads on the cream paper. */
function darken(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.floor(((n >> 16) & 0xff) * 0.55);
  const g = Math.floor(((n >> 8) & 0xff) * 0.55);
  const b = Math.floor((n & 0xff) * 0.55);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
