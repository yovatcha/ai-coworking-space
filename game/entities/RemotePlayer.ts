import * as Phaser from 'phaser';

export default class RemotePlayer extends Phaser.GameObjects.Sprite {
  private nameLabel: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, id: string) {
    super(scene, x, y, 'front1');
    scene.add.existing(this);
    this.setScale(0.18);
    // Tint remote players so they're visually distinct
    this.setTint(0x88ccff);

    // Small name tag above the sprite
    this.nameLabel = scene.add.text(x, y - 20, id.slice(0, 6), {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 2, y: 1 },
    }).setOrigin(0.5, 1);
  }

  applyState(x: number, y: number, anim: string) {
    this.x = x;
    this.y = y;
    this.nameLabel.setPosition(x, y - 20);
    // Only play if the animation key is registered (guards against race on init)
    if (anim && this.scene.anims.exists(anim)) {
      this.anims.play(anim, true);
    }
  }

  destroy(fromScene?: boolean) {
    this.nameLabel.destroy();
    super.destroy(fromScene);
  }
}
