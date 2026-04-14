import * as Phaser from 'phaser';

const INTERACT_DIST = 120;

export default class GoogleBro extends Phaser.GameObjects.Sprite {
  private hint: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'google-bro-front1');
    scene.add.existing(this);
    this.setScale(0.13).setDepth(10);

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
      key: 'google-bro-idle',
      frames: [{ key: 'google-bro-front1' }, { key: 'google-bro-front2' }],
      frameRate: 2,
      repeat: -1,
    });

    this.anims.play('google-bro-idle');
  }

  updateProximity(px: number, py: number): boolean {
    const near = Phaser.Math.Distance.Between(px, py, this.x, this.y) < INTERACT_DIST;
    this.hint.setVisible(near);
    return near;
  }

  interact() {
    window.dispatchEvent(new CustomEvent('google-bro-chat'));
  }
}
