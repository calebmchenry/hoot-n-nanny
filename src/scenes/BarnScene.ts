import Phaser from 'phaser';
import { LAYOUT, PALETTE, ANIMATION, TEXTURES, DOM_PHASE } from '../config/constants';
import {
  getDynamicSlotRects,
  getResourceBannerPosition,
  getNoiseMeterPosition,
  getDeckStackPosition,
  getFarmhouseRect,
  getFarmhouseWindowRect,
  getActionBarPosition,
  getOverlayBounds,
} from './barnLayout';
import { SceneKey } from '../types';
import * as gameStore from '../game/gameStore';
import { drawAnimalInSession, callItANightInSession } from '../game/session';
import { getAnimalDef } from '../game/animals';
import { parseSeedFromSearch } from '../game/deck';
import type {
  GameSession,
  NightEvent,
  NightScoreSummary,
  NightScoreLine,
  CardInstance,
} from '../game/types';
import { GamePhase } from '../game/types';

const TEXT_STYLE_DARK: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  color: PALETTE.TEXT_DARK,
};

const TEXT_STYLE_LIGHT: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  color: PALETTE.TEXT_LIGHT,
};

const setDomAttr = (attr: string, value: string): void => {
  const container = document.getElementById('game-container');
  if (container) {
    container.setAttribute(attr, value);
  }
};

export class BarnScene extends Phaser.Scene {
  // Environment
  private windowGlow!: Phaser.GameObjects.Image;
  private windowGlowTween: Phaser.Tweens.Tween | null = null;

  // Slots
  private slotImages: Phaser.GameObjects.Image[] = [];
  private cardContainers: Phaser.GameObjects.Container[] = [];

  // HUD texts
  private nightText!: Phaser.GameObjects.Text;
  private mischiefText!: Phaser.GameObjects.Text;
  private hayText!: Phaser.GameObjects.Text;
  private capacityText!: Phaser.GameObjects.Text;
  private deckCountText!: Phaser.GameObjects.Text;
  private pennedUpText!: Phaser.GameObjects.Text;

  // Noise meter
  private noiseDots: Phaser.GameObjects.Image[] = [];

  // Action buttons
  private primaryButton!: Phaser.GameObjects.Image;
  private primaryButtonText!: Phaser.GameObjects.Text;
  private secondaryButton: Phaser.GameObjects.Image | null = null;
  private secondaryButtonText: Phaser.GameObjects.Text | null = null;

  // Overlays
  private bustOverlay: Phaser.GameObjects.Container | null = null;
  private summaryOverlay: Phaser.GameObjects.Container | null = null;

  // State tracking
  private isAnimating = false;
  private hasDoneFirstDraw = false;

  constructor() {
    super(SceneKey.Barn);
  }

  create(): void {
    // Seed support: check URL for seed on night 1
    const session = gameStore.getState();
    const seed = parseSeedFromSearch(window.location.search);
    if (seed && session.nightNumber === 1 && !session.currentNight?.hasDrawn) {
      gameStore.reset(seed);
    }

    this.isAnimating = false;
    this.hasDoneFirstDraw = false;
    this.bustOverlay = null;
    this.summaryOverlay = null;
    this.cardContainers = [];
    this.slotImages = [];
    this.noiseDots = [];
    this.secondaryButton = null;
    this.secondaryButtonText = null;
    this.windowGlowTween = null;

    const state = gameStore.getState();
    const capacity = state.capacity;

    // Set DOM attributes
    setDomAttr('data-scene', 'Barn');
    this.updateDomPhase(state);

    // === Environment rendering ===
    this.add.image(0, 0, TEXTURES.BARN_PLANK).setOrigin(0);
    this.add.image(0, 0, TEXTURES.RAFTER).setOrigin(0);
    this.add.image(0, LAYOUT.BARN.FLOOR_Y, TEXTURES.FLOOR_STRAW).setOrigin(0);

    // Farmhouse
    const farmhouseRect = getFarmhouseRect(capacity);
    this.add.image(farmhouseRect.x, farmhouseRect.y, TEXTURES.FARMHOUSE).setOrigin(0);

    // Window glow (initially invisible)
    const windowRect = getFarmhouseWindowRect(capacity);
    this.windowGlow = this.add
      .image(windowRect.x, windowRect.y, TEXTURES.WINDOW_GLOW)
      .setOrigin(0)
      .setAlpha(0);

    // Deck stack
    const deckRect = getDeckStackPosition(capacity);
    this.add.image(deckRect.x, deckRect.y, TEXTURES.DECK_BACK).setOrigin(0);

    // Deck remaining count
    const night = state.currentNight;
    const deckRemaining = night ? night.deck.length : 0;
    this.deckCountText = this.add
      .text(deckRect.x + deckRect.w / 2, deckRect.y + deckRect.h / 2, `${deckRemaining}`, {
        ...TEXT_STYLE_LIGHT,
        fontSize: '16px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // === Empty slot outlines ===
    const slotRects = getDynamicSlotRects(capacity);
    this.slotImages = slotRects.map((rect) => {
      return this.add.image(rect.x, rect.y, TEXTURES.SLOT_EMPTY).setOrigin(0);
    });

    // === Resource banner ===
    const bannerRect = getResourceBannerPosition(capacity);
    const nightNum = night ? night.nightNumber : state.nightNumber;
    this.nightText = this.add
      .text(bannerRect.x, bannerRect.y, `Night ${nightNum}`, {
        ...TEXT_STYLE_LIGHT,
        fontSize: '18px',
        fontStyle: 'bold',
      })
      .setOrigin(0);

    this.mischiefText = this.add
      .text(bannerRect.x + 120, bannerRect.y, `Mischief: ${state.mischief}`, {
        ...TEXT_STYLE_LIGHT,
        fontSize: '14px',
      })
      .setOrigin(0);

    this.hayText = this.add
      .text(bannerRect.x + 120, bannerRect.y + 20, `Hay: ${state.hay}`, {
        ...TEXT_STYLE_LIGHT,
        fontSize: '14px',
      })
      .setOrigin(0);

    // === Noise meter ===
    const noiseRect = getNoiseMeterPosition(capacity);
    this.add
      .text(noiseRect.x, noiseRect.y, 'Noise:', {
        ...TEXT_STYLE_LIGHT,
        fontSize: '14px',
      })
      .setOrigin(0);

    const noisyCount = night ? night.noisyCount : 0;
    for (let i = 0; i < 3; i++) {
      const dotTexture = i < noisyCount ? TEXTURES.NOISE_DOT_FILLED : TEXTURES.NOISE_DOT_EMPTY;
      const dot = this.add
        .image(noiseRect.x + 60 + i * 28, noiseRect.y + 4, dotTexture)
        .setOrigin(0);
      this.noiseDots.push(dot);
    }

    // === Capacity indicator ===
    const barnCount = night ? night.barn.length : 0;
    this.capacityText = this.add
      .text(bannerRect.x, bannerRect.y + 28, `Barn: ${barnCount}/${capacity}`, {
        ...TEXT_STYLE_LIGHT,
        fontSize: '14px',
      })
      .setOrigin(0);

    // === Penned up indicator ===
    this.pennedUpText = this.add
      .text(bannerRect.x + 240, bannerRect.y, '', {
        ...TEXT_STYLE_LIGHT,
        fontSize: '12px',
      })
      .setOrigin(0);
    this.updatePennedUpIndicator(state);

    // === Action buttons (initial: single draw button) ===
    this.createActionButtons(false);

    // If resuming a night with draws already made, render existing barn cards
    if (night && night.barn.length > 0) {
      this.hasDoneFirstDraw = true;
      for (let i = 0; i < night.barn.length; i++) {
        this.renderCardInSlot(night.barn[i], i, false);
      }
      // Update noise meter for resumed state
      this.updateNoiseMeter(night.noisyCount);
      // If warning is active, start glow
      if (night.warning) {
        this.startWindowGlow();
      }
      // Show dual buttons if game is still in progress
      if (!night.complete && !night.bust) {
        this.createActionButtons(true);
      }
    }

    // Handle resuming into bust or summary state
    if (night?.bust) {
      this.showBustOverlay(night.bust.type === 'farmer' ? 'FARMER WOKE UP!' : 'BARN OVERWHELMED!');
    } else if (night?.complete && night.summary) {
      this.showNightSummaryOverlay(night.summary, state);
    }

    // Signal game ready
    (window as Window & { __GAME_READY__?: boolean }).__GAME_READY__ = true;
  }

  // === DOM Phase tracking ===

  private updateDomPhase(session: GameSession): void {
    const night = session.currentNight;
    let phase: string = DOM_PHASE.READY_TO_DRAW;
    if (night) {
      switch (night.phase) {
        case GamePhase.ReadyToDraw:
          phase = DOM_PHASE.READY_TO_DRAW;
          break;
        case GamePhase.AnimatingDraw:
          phase = DOM_PHASE.ANIMATING_DRAW;
          break;
        case GamePhase.PlayerDecision:
          phase = DOM_PHASE.PLAYER_DECISION;
          break;
        case GamePhase.Warning:
          phase = DOM_PHASE.WARNING;
          break;
        case GamePhase.Bust:
          phase = DOM_PHASE.BUST;
          break;
        case GamePhase.NightSummary:
          phase = DOM_PHASE.NIGHT_SUMMARY;
          break;
        default:
          break;
      }
    }
    setDomAttr('data-phase', phase);
    setDomAttr('data-noisy-count', `${night?.noisyCount ?? 0}`);
    setDomAttr('data-capacity', `${session.capacity}`);
  }

  // === Button creation ===

  private createActionButtons(dual: boolean): void {
    // Clean up existing buttons
    if (this.primaryButton) {
      this.primaryButton.destroy();
      this.primaryButtonText.destroy();
    }
    if (this.secondaryButton) {
      this.secondaryButton.destroy();
      this.secondaryButtonText!.destroy();
      this.secondaryButton = null;
      this.secondaryButtonText = null;
    }

    const state = gameStore.getState();
    const layout = getActionBarPosition(state.capacity, dual);

    // Primary button
    this.primaryButton = this.add
      .image(layout.primary.x, layout.primary.y, TEXTURES.BUTTON_PRIMARY)
      .setOrigin(0)
      .setDisplaySize(layout.primary.w, layout.primary.h)
      .setInteractive();

    const primaryLabel = dual ? 'KEEP GOING' : 'DRAW ANIMAL';
    this.primaryButtonText = this.add
      .text(
        layout.primary.x + layout.primary.w / 2,
        layout.primary.y + layout.primary.h / 2,
        primaryLabel,
        {
          ...TEXT_STYLE_LIGHT,
          fontSize: '18px',
          fontStyle: 'bold',
        },
      )
      .setOrigin(0.5);

    this.primaryButton.on('pointerdown', this.onDrawAnimal, this);

    // Secondary button (call it a night)
    if (dual && layout.secondary) {
      this.secondaryButton = this.add
        .image(layout.secondary.x, layout.secondary.y, TEXTURES.BUTTON_SECONDARY)
        .setOrigin(0)
        .setDisplaySize(layout.secondary.w, layout.secondary.h)
        .setInteractive();

      this.secondaryButtonText = this.add
        .text(
          layout.secondary.x + layout.secondary.w / 2,
          layout.secondary.y + layout.secondary.h / 2,
          'CALL IT A NIGHT',
          {
            ...TEXT_STYLE_LIGHT,
            fontSize: '18px',
            fontStyle: 'bold',
          },
        )
        .setOrigin(0.5);

      this.secondaryButton.on('pointerdown', this.onCallItANight, this);
    }
  }

  private disableButtons(): void {
    this.primaryButton.removeInteractive();
    this.primaryButton.setAlpha(0.6);
    this.primaryButtonText.setAlpha(0.6);
    if (this.secondaryButton) {
      this.secondaryButton.removeInteractive();
      this.secondaryButton.setAlpha(0.6);
      this.secondaryButtonText!.setAlpha(0.6);
    }
  }

  private enableButtons(): void {
    this.primaryButton.setInteractive();
    this.primaryButton.setAlpha(1);
    this.primaryButtonText.setAlpha(1);
    if (this.secondaryButton) {
      this.secondaryButton.setInteractive();
      this.secondaryButton.setAlpha(1);
      this.secondaryButtonText!.setAlpha(1);
    }
  }

  // === Draw handler ===

  private onDrawAnimal(): void {
    if (this.isAnimating) return;

    const session = gameStore.getState();
    const result = drawAnimalInSession(session);
    gameStore.setState(result.session);

    this.isAnimating = true;
    this.disableButtons();
    this.updateDomPhase(result.session);

    this.processEvents(result.events, result.session);
  }

  // === Call it a night handler ===

  private onCallItANight(): void {
    if (this.isAnimating) return;

    const session = gameStore.getState();
    const result = callItANightInSession(session);
    gameStore.setState(result.session);

    this.updateDomPhase(result.session);
    this.processCallItANightEvents(result.events, result.session);
  }

  private processCallItANightEvents(events: NightEvent[], session: GameSession): void {
    for (const event of events) {
      if (event.type === 'night_scored') {
        this.updateHud(session);
        this.showNightSummaryOverlay(event.summary, session);
      }
    }
  }

  // === Event processing ===

  private processEvents(events: NightEvent[], session: GameSession): void {
    let animationChain = Promise.resolve();
    let revealedCard: CardInstance | null = null;
    let revealSlotIndex = -1;
    let warningChanged = false;
    let warningNoisyCount = 0;
    let warningActive = false;
    let bustTriggered = false;
    let bustMessage = '';
    let nightScored: NightScoreSummary | null = null;

    // Parse all events first
    for (const event of events) {
      switch (event.type) {
        case 'card_revealed':
          revealedCard = event.card;
          revealSlotIndex = event.slotIndex;
          break;
        case 'warning_state_changed':
          warningChanged = true;
          warningNoisyCount = event.noisyCount;
          warningActive = event.warning;
          break;
        case 'bust_triggered':
          bustTriggered = true;
          bustMessage = event.bustType === 'farmer' ? 'FARMER WOKE UP!' : 'BARN OVERWHELMED!';
          break;
        case 'night_scored':
          nightScored = event.summary;
          break;
      }
    }

    // Animate card reveal
    if (revealedCard && revealSlotIndex >= 0) {
      animationChain = animationChain.then(() => {
        return this.animateCardReveal(revealedCard!, revealSlotIndex);
      });
    }

    // Warning state after card animation
    if (warningChanged) {
      animationChain = animationChain.then(() => {
        this.updateNoiseMeter(warningNoisyCount);
        if (warningActive) {
          this.startWindowGlow();
        } else {
          this.stopWindowGlow();
        }
      });
    }

    // Bust
    if (bustTriggered) {
      animationChain = animationChain.then(() => {
        return this.animateBust(bustMessage);
      });
    }

    // After all animations
    animationChain.then(() => {
      this.isAnimating = false;
      this.updateHud(session);
      this.updateDomPhase(session);

      if (bustTriggered) {
        // Bust overlay has its own continue button; don't re-enable draw buttons
        if (nightScored) {
          // Store summary for the continue button in bust overlay
          this.bustOverlaySummary = nightScored;
        }
      } else if (session.currentNight?.complete && nightScored) {
        this.showNightSummaryOverlay(nightScored, session);
      } else {
        // Switch to dual buttons after first draw
        if (!this.hasDoneFirstDraw) {
          this.hasDoneFirstDraw = true;
          this.createActionButtons(true);
        } else {
          this.enableButtons();
        }
      }
    });
  }

  private bustOverlaySummary: NightScoreSummary | null = null;

  // === Card rendering ===

  private renderCardInSlot(
    card: CardInstance,
    slotIndex: number,
    animated: boolean,
  ): Phaser.GameObjects.Container {
    const state = gameStore.getState();
    const slotRects = getDynamicSlotRects(state.capacity);
    const slot = slotRects[slotIndex];
    if (!slot) return this.add.container(0, 0);

    const animalDef = getAnimalDef(card.animalId);
    const container = this.add.container(slot.x, slot.y);

    // Card background
    const cardBgTexture = animalDef.noisy ? TEXTURES.CARD_NOISY : TEXTURES.CARD_PARCHMENT;
    const cardBg = this.add.image(0, 0, cardBgTexture).setOrigin(0).setDisplaySize(slot.w, slot.h);
    container.add(cardBg);

    // Animal sprite (pixel art scaled 2x, centered in card)
    const sprite = this.add
      .sprite(slot.w / 2, slot.h / 2 - 8, 'animals', card.animalId)
      .setOrigin(0.5)
      .setScale(2);
    container.add(sprite);

    // Animal name at bottom
    const nameText = this.add
      .text(slot.w / 2, slot.h - 14, animalDef.name, {
        ...TEXT_STYLE_DARK,
        fontSize: '9px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    container.add(nameText);

    // Resource badges
    if (animalDef.mischief !== 0) {
      const badgeMischief = this.add
        .image(4, 4, TEXTURES.BADGE_MISCHIEF)
        .setOrigin(0)
        .setScale(0.5);
      container.add(badgeMischief);
      const mischiefVal = this.add
        .text(20, 6, `${animalDef.mischief}`, {
          ...TEXT_STYLE_DARK,
          fontSize: '10px',
          fontStyle: 'bold',
        })
        .setOrigin(0);
      container.add(mischiefVal);
    }

    if (animalDef.hay !== 0) {
      const badgeHay = this.add
        .image(slot.w - 32, 4, TEXTURES.BADGE_HAY)
        .setOrigin(0)
        .setScale(0.5);
      container.add(badgeHay);
      const hayVal = this.add
        .text(slot.w - 16, 6, `${animalDef.hay}`, {
          ...TEXT_STYLE_DARK,
          fontSize: '10px',
          fontStyle: 'bold',
        })
        .setOrigin(0);
      container.add(hayVal);
    }

    if (animated) {
      container.setScale(0.5);
      container.setAlpha(0);
    }

    this.cardContainers.push(container);
    return container;
  }

  // === Animations ===

  private animateCardReveal(card: CardInstance, slotIndex: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const state = gameStore.getState();
      const slotRects = getDynamicSlotRects(state.capacity);
      const slot = slotRects[slotIndex];
      if (!slot) {
        resolve();
        return;
      }

      const deckPos = getDeckStackPosition(state.capacity);

      // Create card at deck position
      const container = this.renderCardInSlot(card, slotIndex, true);
      container.setPosition(deckPos.x, deckPos.y);
      container.setAlpha(1);
      container.setScale(0.5);

      // Slide from deck to slot
      this.tweens.add({
        targets: container,
        x: slot.x,
        y: slot.y,
        scale: 1,
        duration: ANIMATION.DRAW_SLIDE_MS,
        ease: 'Back.easeOut',
        onComplete: () => {
          // Pop effect
          this.tweens.add({
            targets: container,
            scale: 1.08,
            duration: ANIMATION.DRAW_POP_MS / 2,
            yoyo: true,
            ease: 'Quad.easeInOut',
            onComplete: () => {
              // Update deck count
              this.updateDeckCount();
              this.updateCapacityText();
              resolve();
            },
          });
        },
      });
    });
  }

  private animateBust(message: string): Promise<void> {
    return new Promise<void>((resolve) => {
      // Camera shake
      this.cameras.main.shake(ANIMATION.BUST_SHAKE_MS, 0.01);

      this.time.delayedCall(ANIMATION.BUST_SHAKE_MS, () => {
        this.showBustOverlay(message);
        resolve();
      });
    });
  }

  // === Noise meter ===

  private updateNoiseMeter(noisyCount: number): void {
    for (let i = 0; i < 3; i++) {
      const texture = i < noisyCount ? TEXTURES.NOISE_DOT_FILLED : TEXTURES.NOISE_DOT_EMPTY;
      this.noiseDots[i].setTexture(texture);
    }
  }

  // === Window glow ===

  private startWindowGlow(): void {
    if (this.windowGlowTween) return;
    this.windowGlow.setAlpha(0.3);
    this.windowGlowTween = this.tweens.add({
      targets: this.windowGlow,
      alpha: 0.8,
      duration: ANIMATION.WARNING_GLOW_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private stopWindowGlow(): void {
    if (this.windowGlowTween) {
      this.windowGlowTween.destroy();
      this.windowGlowTween = null;
    }
    this.windowGlow.setAlpha(0);
  }

  // === HUD updates ===

  private updateHud(session: GameSession): void {
    const night = session.currentNight;
    this.mischiefText.setText(`Mischief: ${session.mischief}`);
    this.hayText.setText(`Hay: ${session.hay}`);
    this.updateDeckCount();
    this.updateCapacityText();
    this.updatePennedUpIndicator(session);
    setDomAttr('data-noisy-count', `${night?.noisyCount ?? 0}`);
  }

  private updateDeckCount(): void {
    const state = gameStore.getState();
    const night = state.currentNight;
    const remaining = night ? night.deck.length : 0;
    this.deckCountText.setText(`${remaining}`);
  }

  private updateCapacityText(): void {
    const state = gameStore.getState();
    const night = state.currentNight;
    const barnCount = night ? night.barn.length : 0;
    this.capacityText.setText(`Barn: ${barnCount}/${state.capacity}`);
  }

  private updatePennedUpIndicator(session: GameSession): void {
    const night = session.currentNight;
    if (night?.pennedUpCard) {
      const def = getAnimalDef(night.pennedUpCard.animalId);
      this.pennedUpText.setText(`Penned: ${def.name}`);
    } else {
      this.pennedUpText.setText('');
    }
  }

  // === Bust overlay ===

  private showBustOverlay(message: string): void {
    if (this.bustOverlay) return;

    const state = gameStore.getState();
    const bounds = getOverlayBounds(state.capacity);
    const overlay = this.add.container(bounds.x, bounds.y);

    // Semi-transparent background
    const bg = this.add.rectangle(0, 0, bounds.w, bounds.h, 0x000000, 0.75).setOrigin(0);
    overlay.add(bg);

    // Bust message
    const bustText = this.add
      .text(bounds.w / 2, bounds.h / 2 - 40, message, {
        fontFamily: 'monospace',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#d94b3d',
        align: 'center',
      })
      .setOrigin(0.5);
    overlay.add(bustText);

    // Continue button
    const btnW = 200;
    const btnH = 48;
    const btnX = (bounds.w - btnW) / 2;
    const btnY = bounds.h / 2 + 30;

    const continueBtn = this.add
      .image(btnX, btnY, TEXTURES.BUTTON_PRIMARY)
      .setOrigin(0)
      .setDisplaySize(btnW, btnH)
      .setInteractive();
    overlay.add(continueBtn);

    const continueText = this.add
      .text(btnX + btnW / 2, btnY + btnH / 2, 'Continue', {
        ...TEXT_STYLE_LIGHT,
        fontSize: '18px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    overlay.add(continueText);

    continueBtn.on(
      'pointerdown',
      () => {
        overlay.destroy();
        this.bustOverlay = null;
        const currentSession = gameStore.getState();
        const summary = this.bustOverlaySummary ?? currentSession.currentNight?.summary;
        if (summary) {
          this.showNightSummaryOverlay(summary, currentSession);
        }
      },
      this,
    );

    // Fade in
    overlay.setAlpha(0);
    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: ANIMATION.BUST_OVERLAY_MS,
    });

    this.bustOverlay = overlay;
  }

  // === Night Summary overlay ===

  private showNightSummaryOverlay(summary: NightScoreSummary, session: GameSession): void {
    if (this.summaryOverlay) return;

    const bounds = getOverlayBounds(session.capacity);
    const overlay = this.add.container(bounds.x, bounds.y);

    // Semi-transparent background
    const bg = this.add.rectangle(0, 0, bounds.w, bounds.h, 0x000000, 0.85).setOrigin(0);
    overlay.add(bg);

    // Title
    const titleStr = summary.reason === 'bust' ? 'Night Summary (Bust!)' : 'Night Summary';
    const title = this.add
      .text(bounds.w / 2, 20, titleStr, {
        ...TEXT_STYLE_LIGHT,
        fontSize: '20px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0);
    overlay.add(title);

    // Score lines
    let lineY = 60;
    const lineHeight = 24;

    summary.lines.forEach((line: NightScoreLine, index: number) => {
      const y = lineY + index * lineHeight;
      const mStr = line.mischief + (line.bonusMischief > 0 ? `+${line.bonusMischief}` : '');
      const lineText = this.add
        .text(20, y, `${line.name}  M:${mStr}  H:${line.hay}`, {
          ...TEXT_STYLE_LIGHT,
          fontSize: '12px',
        })
        .setOrigin(0);
      overlay.add(lineText);

      // Stagger animation
      lineText.setAlpha(0);
      this.tweens.add({
        targets: lineText,
        alpha: 1,
        duration: ANIMATION.SCORE_LINE_MS,
        delay: index * ANIMATION.SCORE_STAGGER_MS,
      });
    });

    // Totals section
    const totalsY = lineY + summary.lines.length * lineHeight + 16;

    const baseLine = this.add
      .text(20, totalsY, `Base Mischief: ${summary.baseMischief}`, {
        ...TEXT_STYLE_LIGHT,
        fontSize: '13px',
      })
      .setOrigin(0);
    overlay.add(baseLine);

    if (summary.bonusMischief > 0) {
      const bonusLine = this.add
        .text(20, totalsY + 20, `Bonus Mischief: +${summary.bonusMischief}`, {
          ...TEXT_STYLE_LIGHT,
          fontSize: '13px',
        })
        .setOrigin(0);
      overlay.add(bonusLine);
    }

    if (summary.penaltyMischief < 0) {
      const penaltyLine = this.add
        .text(20, totalsY + 40, `Penalty: ${summary.penaltyMischief}`, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#d94b3d',
        })
        .setOrigin(0);
      overlay.add(penaltyLine);
    }

    const totalMischiefY = totalsY + 64;
    const totalLine = this.add
      .text(20, totalMischiefY, `Total Mischief: ${summary.totalMischief}`, {
        ...TEXT_STYLE_LIGHT,
        fontSize: '15px',
        fontStyle: 'bold',
      })
      .setOrigin(0);
    overlay.add(totalLine);

    const hayLine = this.add
      .text(
        20,
        totalMischiefY + 24,
        `Hay Earned: ${summary.hayEarned}  Cost: ${summary.hayCost}  Net Hay: ${summary.totalHay}`,
        {
          ...TEXT_STYLE_LIGHT,
          fontSize: '12px',
        },
      )
      .setOrigin(0);
    overlay.add(hayLine);

    if (summary.hayUnpaid > 0) {
      const unpaidLine = this.add
        .text(20, totalMischiefY + 44, `Hay unpaid: ${summary.hayUnpaid}`, {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#ffbe4d',
        })
        .setOrigin(0);
      overlay.add(unpaidLine);
    }

    // Penned up animal notification
    const pennedUpEvents = session.currentNight?.bust ? [session.currentNight.bust.card] : [];
    if (pennedUpEvents.length > 0) {
      const pennedCard = pennedUpEvents[0];
      const pennedDef = getAnimalDef(pennedCard.animalId);
      const pennedY = totalMischiefY + 72;
      const lockImg = this.add.image(20, pennedY, TEXTURES.LOCK_ICON).setOrigin(0).setScale(0.5);
      overlay.add(lockImg);
      const pennedText = this.add
        .text(44, pennedY, `${pennedDef.name} penned up next night`, {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#ffbe4d',
        })
        .setOrigin(0);
      overlay.add(pennedText);
    }

    // Continue button
    const btnW = 280;
    const btnH = 48;
    const btnX = (bounds.w - btnW) / 2;
    const btnY = bounds.h - 70;

    const continueBtn = this.add
      .image(btnX, btnY, TEXTURES.BUTTON_PRIMARY)
      .setOrigin(0)
      .setDisplaySize(btnW, btnH)
      .setInteractive();
    overlay.add(continueBtn);

    const continueText = this.add
      .text(btnX + btnW / 2, btnY + btnH / 2, 'Continue to Trading Post', {
        ...TEXT_STYLE_LIGHT,
        fontSize: '16px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    overlay.add(continueText);

    continueBtn.on(
      'pointerdown',
      () => {
        this.scene.start(SceneKey.TradingPost);
      },
      this,
    );

    this.summaryOverlay = overlay;
  }
}
