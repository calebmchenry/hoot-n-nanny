import Phaser from 'phaser';
import { BarnScene } from '../scenes/BarnScene';
import { BootScene } from '../scenes/BootScene';
import { LAYOUT } from './constants';

export const createGameConfig = (): Phaser.Types.Core.GameConfig => {
  return {
    type: Phaser.AUTO,
    backgroundColor: 0x000000,
    scene: [BootScene, BarnScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: LAYOUT.CANVAS.WIDTH,
      height: LAYOUT.CANVAS.HEIGHT,
      parent: 'game-container',
    },
  };
};
