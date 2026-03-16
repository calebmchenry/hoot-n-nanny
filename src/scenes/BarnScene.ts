import Phaser from 'phaser';
import { LAYOUT } from '../config/constants';
import { getButtonRect, getSlotRects } from './barnLayout';
import { SceneKey, type SlotState } from '../types';

export class BarnScene extends Phaser.Scene {
  private slotStates: SlotState[] = [];
  private slotViews: Phaser.GameObjects.Rectangle[] = [];
  private drawButton!: Phaser.GameObjects.Rectangle;
  private farmhouse!: Phaser.GameObjects.Rectangle;

  constructor() {
    super(SceneKey.Barn);
  }

  create(): void {
    this.add
      .rectangle(
        LAYOUT.BARN.X,
        LAYOUT.BARN.Y,
        LAYOUT.BARN.WIDTH,
        LAYOUT.BARN.HEIGHT,
        LAYOUT.BARN.COLOR,
      )
      .setOrigin(0);

    this.slotStates = getSlotRects().map(() => 'empty');
    this.slotViews = getSlotRects().map((slotRect) => {
      return this.add
        .rectangle(slotRect.x, slotRect.y, slotRect.w, slotRect.h, LAYOUT.SLOTS.EMPTY.FILL)
        .setOrigin(0)
        .setStrokeStyle(LAYOUT.SLOTS.STROKE_WIDTH, LAYOUT.SLOTS.EMPTY.STROKE);
    });

    this.farmhouse = this.add
      .rectangle(
        LAYOUT.FARMHOUSE.X,
        LAYOUT.FARMHOUSE.Y,
        LAYOUT.FARMHOUSE.WIDTH,
        LAYOUT.FARMHOUSE.HEIGHT,
        LAYOUT.FARMHOUSE.COLOR,
      )
      .setOrigin(0);

    const buttonRect = getButtonRect();
    this.drawButton = this.add
      .rectangle(buttonRect.x, buttonRect.y, buttonRect.w, buttonRect.h, LAYOUT.BUTTON.BASE_COLOR)
      .setOrigin(0)
      .setInteractive();

    this.drawButton.on('pointerdown', this.onDraw, this);

    this.add
      .text(buttonRect.x + buttonRect.w / 2, buttonRect.y + buttonRect.h / 2, LAYOUT.BUTTON.LABEL, {
        color: LAYOUT.BUTTON.LABEL_COLOR,
        fontFamily: 'sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const readyWindow = window as Window & { __GAME_READY__?: boolean };
    readyWindow.__GAME_READY__ = true;
  }

  private onDraw(): void {
    this.drawButton.setFillStyle(LAYOUT.BUTTON.FLASH_COLOR);
    this.time.delayedCall(LAYOUT.BUTTON.FLASH_DURATION_MS, () => {
      this.drawButton.setFillStyle(LAYOUT.BUTTON.BASE_COLOR);
    });

    const firstEmptyIndex = this.slotStates.findIndex((slotState) => slotState === 'empty');

    if (firstEmptyIndex === -1) {
      this.slotStates.fill('empty');
    } else {
      this.slotStates[firstEmptyIndex] = 'occupied';
    }

    this.renderSlotStates();
  }

  private renderSlotStates(): void {
    this.slotViews.forEach((slotView, index) => {
      const isOccupied = this.slotStates[index] === 'occupied';
      const fillColor = isOccupied ? LAYOUT.SLOTS.OCCUPIED.FILL : LAYOUT.SLOTS.EMPTY.FILL;
      const strokeColor = isOccupied ? LAYOUT.SLOTS.OCCUPIED.STROKE : LAYOUT.SLOTS.EMPTY.STROKE;
      slotView.setFillStyle(fillColor);
      slotView.setStrokeStyle(LAYOUT.SLOTS.STROKE_WIDTH, strokeColor);
    });
  }
}
