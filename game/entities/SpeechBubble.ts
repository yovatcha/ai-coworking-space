import * as Phaser from 'phaser';

// Pixel speech balloon drawn in world space, anchored above a character's head.
// Colors mirror the UI kit: #1a1c2c fill, #5a6988 border, black drop shadow.
// Thai has no spaces, so Phaser's word wrap never breaks it — wrap by character
// count instead. ~26 chars ≈ 240px at 14px Sarabun.
const MAX_CHARS = 26;
const PAD_X = 12;
const PAD_Y = 8;
const TAIL_H = 10;
const HEAD_OFFSET = 32;
const BASE_MS = 2200;
const MS_PER_CHAR = 60;
const MAX_MS = 8000;

/** Greedy wrap: prefer the last space on the line, hard-break when there is none */
function wrap(text: string, max: number): string {
  const lines: string[] = [];
  let rest = text;
  while (rest.length > max) {
    const space = rest.lastIndexOf(' ', max);
    const cut = space > max / 2 ? space : max;
    lines.push(rest.slice(0, cut));
    rest = rest.slice(space > max / 2 ? cut + 1 : cut);
  }
  lines.push(rest);
  return lines.join('\n');
}

export default class SpeechBubble extends Phaser.GameObjects.Container {
  private box: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private hideTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, private headOffset = HEAD_OFFSET) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(30).setVisible(false);

    this.box = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, '', {
        fontFamily: "'Sarabun', sans-serif",
        fontSize: '14px',
        color: '#e6d4aa',
        align: 'center',
      })
      .setOrigin(0.5, 0.5);

    this.add([this.box, this.label]);
  }

  say(text: string) {
    this.label.setText(wrap(text, MAX_CHARS));

    const w = Math.ceil(this.label.width) + PAD_X * 2;
    const h = Math.ceil(this.label.height) + PAD_Y * 2;
    const top = -TAIL_H - h;

    this.label.setPosition(0, top + h / 2);

    const g = this.box.clear();
    g.fillStyle(0x000000).fillRect(-w / 2 + 3, top + 3, w, h);      // drop shadow
    g.fillStyle(0x5a6988).fillRect(-w / 2, top, w, h);              // border
    g.fillStyle(0x1a1c2c).fillRect(-w / 2 + 3, top + 3, w - 6, h - 6); // fill
    g.fillStyle(0x5a6988).fillRect(-7, -TAIL_H, 14, 5);             // tail (2 pixel steps)
    g.fillStyle(0x5a6988).fillRect(-4, -5, 8, 5);

    this.setVisible(true);

    this.hideTimer?.remove();
    const ms = Math.min(BASE_MS + text.length * MS_PER_CHAR, MAX_MS);
    this.hideTimer = this.scene.time.delayedCall(ms, () => this.setVisible(false));
  }

  /** Keep the balloon pinned above the character */
  follow(x: number, y: number) {
    this.setPosition(x, y - this.headOffset);
  }

  destroy(fromScene?: boolean) {
    this.hideTimer?.remove();
    super.destroy(fromScene);
  }
}
