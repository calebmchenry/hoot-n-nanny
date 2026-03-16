import Phaser from 'phaser';
import { BarnScene } from '../scenes/BarnScene';
import { BootScene } from '../scenes/BootScene';
import { TradingPostScene } from '../scenes/TradingPostScene';
import { LAYOUT } from './constants';

export const createGameConfig = (): Phaser.Types.Core.GameConfig => {
  return {
    type: Phaser.AUTO,
    backgroundColor: 0x000000,
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    scene: [BootScene, BarnScene, TradingPostScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: LAYOUT.CANVAS.WIDTH,
      height: LAYOUT.CANVAS.HEIGHT,
      parent: 'game-container',
    },
  };
};
