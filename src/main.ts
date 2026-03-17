import Phaser from 'phaser';
import { createGameConfig } from './config/game';

const gameContainer = document.querySelector<HTMLElement>('#game-container');
const rotatePrompt = document.querySelector<HTMLElement>('#rotate-prompt');

if (!gameContainer) {
  throw new Error('Missing #game-container element.');
}

const shouldShowRotatePrompt = (): boolean => {
  const { innerWidth, innerHeight } = window;
  return innerWidth > innerHeight && Math.min(innerWidth, innerHeight) < 600;
};

const updateRotatePrompt = (): void => {
  if (!rotatePrompt) {
    return;
  }

  const visible = shouldShowRotatePrompt();
  rotatePrompt.classList.toggle('is-visible', visible);
  rotatePrompt.setAttribute('aria-hidden', visible ? 'false' : 'true');
};

window.addEventListener('resize', updateRotatePrompt, { passive: true });
window.addEventListener('orientationchange', updateRotatePrompt);
updateRotatePrompt();

gameContainer.querySelector('canvas')?.remove();

new Phaser.Game(createGameConfig());
