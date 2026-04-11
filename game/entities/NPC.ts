import * as Phaser from 'phaser';

const INTERACT_DIST = 120;

export default class NPC extends Phaser.GameObjects.Sprite {
  private hint: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'ped-stand1');
    scene.add.existing(this);
    this.setScale(0.2);

    this.hint = scene.add
      .text(x, y - 36, '[E] Talk', {
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setVisible(false);

    scene.anims.create({
      key: 'ped-idle',
      frames: [{ key: 'ped-stand1' }, { key: 'ped-stand2' }],
      frameRate: 2,
      repeat: -1,
    });

    this.anims.play('ped-idle');
  }

  /** Returns true when player is within interaction range */
  updateProximity(px: number, py: number): boolean {
    const near = Phaser.Math.Distance.Between(px, py, this.x, this.y) < INTERACT_DIST;
    this.hint.setVisible(near);
    return near;
  }

  /** Fire a browser event so the React chat panel can open */
  interact() {
    window.dispatchEvent(new CustomEvent('npc-chat'));
  }
}
