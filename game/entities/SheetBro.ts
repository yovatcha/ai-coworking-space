import * as Phaser from 'phaser';
import { ATLAS } from '../scenes/MainScene';

const INTERACT_DIST = 120;

export default class SheetBro extends Phaser.GameObjects.Sprite {
  private hint: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, ATLAS, 'sheet-bro/front1');
    scene.add.existing(this);
    this.setScale(0.5).setDepth(10);

    this.hint = scene.add
      .text(x, y - 36, '[E] Talk', {
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setVisible(false)
      .setDepth(20);

    scene.anims.create({
      key: 'sheet-bro-idle',
      frames: [
        { key: ATLAS, frame: 'sheet-bro/front1' },
        { key: ATLAS, frame: 'sheet-bro/front2' },
      ],
      frameRate: 2,
      repeat: -1,
    });

    this.anims.play('sheet-bro-idle');
  }

  updateProximity(px: number, py: number): boolean {
    const near = Phaser.Math.Distance.Between(px, py, this.x, this.y) < INTERACT_DIST;
    this.hint.setVisible(near);
    return near;
  }

  interact() {
    window.dispatchEvent(new CustomEvent('sheet-bro-chat'));
  }
}
