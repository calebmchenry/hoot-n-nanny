import Phaser from 'phaser';
import { DEPTH, LAYOUT, PALETTE } from '../config/constants';
import type { AbilityDef } from '../game/abilities';
import type { AnimalDef } from '../game/types';

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(value, max));
};

const getTriggerLabel = (trigger: AbilityDef['trigger']): string => {
  switch (trigger) {
    case 'on_enter':
      return 'On Enter';
    case 'on_score':
      return 'On Score';
    case 'manual':
      return 'Manual';
    case 'passive':
    default:
      return 'Passive';
  }
};

export function showAbilityTooltip(
  scene: Phaser.Scene,
  x: number,
  y: number,
  _animalDef: AnimalDef,
  abilityDef: AbilityDef,
  cw: number,
  ch: number,
): Phaser.GameObjects.Container {
  const panelW = clamp(Math.round((200 / LAYOUT.CANVAS.REF_WIDTH) * cw), 170, 280);
  const panelH = clamp(Math.round((92 / LAYOUT.CANVAS.REF_HEIGHT) * ch), 86, 150);
  const margin = Math.max(8, Math.round((8 / LAYOUT.CANVAS.REF_WIDTH) * cw));
  const gap = Math.max(10, Math.round((10 / LAYOUT.CANVAS.REF_HEIGHT) * ch));

  const left = clamp(Math.round(x - panelW / 2), margin, cw - panelW - margin);
  const aboveY = Math.round(y - panelH - gap);
  const top = aboveY < margin ? Math.round(y + gap) : aboveY;

  const container = scene.add
    .container(left, top)
    .setDepth(DEPTH.BUTTONS - 1)
    .setAlpha(0);

  const bg = scene.add.graphics();
  bg.fillStyle(PALETTE.OVERLAY_WOOD, 0.9);
  bg.fillRoundedRect(0, 0, panelW, panelH, 10);
  bg.lineStyle(2, 0x5c4030, 1);
  bg.strokeRoundedRect(1, 1, panelW - 2, panelH - 2, 10);
  container.add(bg);

  const title = scene.add
    .text(10, 8, abilityDef.label, {
      fontFamily: 'sans-serif',
      fontSize: `${clamp(Math.round((13 / LAYOUT.CANVAS.REF_HEIGHT) * ch), 11, 18)}px`,
      fontStyle: 'bold',
      color: '#f8f3e5',
    })
    .setOrigin(0, 0);

  const trigger = scene.add
    .text(10, 26, getTriggerLabel(abilityDef.trigger), {
      fontFamily: 'sans-serif',
      fontSize: `${clamp(Math.round((11 / LAYOUT.CANVAS.REF_HEIGHT) * ch), 10, 16)}px`,
      color: '#f1c86a',
    })
    .setOrigin(0, 0);

  const description = scene.add
    .text(10, 42, abilityDef.description, {
      fontFamily: 'sans-serif',
      fontSize: `${clamp(Math.round((11 / LAYOUT.CANVAS.REF_HEIGHT) * ch), 10, 15)}px`,
      color: '#f8f3e5',
      wordWrap: { width: panelW - 20 },
    })
    .setOrigin(0, 0);

  container.add([title, trigger, description]);

  scene.tweens.add({
    targets: container,
    alpha: 1,
    duration: 100,
    ease: 'Sine.easeOut',
  });

  return container;
}

export function hideAbilityTooltip(
  scene: Phaser.Scene,
  tooltip: Phaser.GameObjects.Container,
): void {
  if (!tooltip.active) {
    tooltip.destroy();
    return;
  }

  scene.tweens.killTweensOf(tooltip);
  scene.tweens.add({
    targets: tooltip,
    alpha: 0,
    duration: 80,
    ease: 'Sine.easeIn',
    onComplete: () => {
      tooltip.destroy();
    },
  });
}
