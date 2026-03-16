import Phaser from 'phaser';
import { createGameConfig } from './config/game';

const gameContainer = document.querySelector<HTMLElement>('#game-container');

if (!gameContainer) {
  throw new Error('Missing #game-container element.');
}

gameContainer.querySelector('canvas')?.remove();

new Phaser.Game(createGameConfig());
