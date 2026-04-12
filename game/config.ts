import * as Phaser from 'phaser';
import MainScene from './scenes/MainScene';

export const getGameConfig = (parent: string | HTMLElement): Phaser.Types.Core.GameConfig => {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
  return {
    type: Phaser.AUTO,
    // Render at physical pixels so text stays crisp on HiDPI/retina screens
    width: 800 * dpr,
    height: 600 * dpr,
    parent,
    scene: [MainScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: "100%",
      height: "100%",
    },
    audio: {
      noAudio: true,
    },
    input: {
      keyboard: { capture: [] },
    },
    backgroundColor: '#1a1a2e',
  };
};
