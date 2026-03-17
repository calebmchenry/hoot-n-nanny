import Phaser from 'phaser';
import { BarnScene } from '../scenes/BarnScene';
import { BootScene } from '../scenes/BootScene';
import { TradingPostScene } from '../scenes/TradingPostScene';
import { PALETTE } from './constants';

export const createGameConfig = (): Phaser.Types.Core.GameConfig => {
  return {
    type: Phaser.AUTO,
    backgroundColor: PALETTE.SKY_TOP,
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    scene: [BootScene, BarnScene, TradingPostScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
      parent: 'game-container',
    },
  };
};
