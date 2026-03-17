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
  getInfoPanelBounds,
  scaledFont,
  type Rect,
} from './barnLayout';
import { SceneKey } from '../types';
import * as gameStore from '../game/gameStore';
import {
  drawAnimalInSession,
  callItANightInSession,
  acceptPeekInSession,
  rejectPeekInSession,
  executeBootInSession,
  executeFetchInSession,
  activateManualAbilityInSession,
} from '../game/session';
import { getAnimalDef } from '../game/animals';
import { ABILITY_REGISTRY } from '../game/abilities';
import { parseSeedFromSearch } from '../game/deck';
import type {
  GameSession,
  NightEvent,
  NightScoreSummary,
  NightScoreLine,
  CardInstance,
  AnimalId,
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
  // Viewport
  private pendingResize: { cw: number; ch: number } | null = null;

  // Environment
  private barnBackground!: Phaser.GameObjects.Image;
  private rafter!: Phaser.GameObjects.Image;
  private floorStraw!: Phaser.GameObjects.Image;
  private farmhouseImage!: Phaser.GameObjects.Image;
  private deckStack!: Phaser.GameObjects.Image;
  private windowGlow!: Phaser.GameObjects.Image;
  private noiseLabel!: Phaser.GameObjects.Text;
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
  private legendaryText!: Phaser.GameObjects.Text;

  // Noise meter
  private noiseDots: Phaser.GameObjects.Image[] = [];

  // Action buttons
  private primaryButton!: Phaser.GameObjects.Image;
  private primaryButtonText!: Phaser.GameObjects.Text;
  private secondaryButton: Phaser.GameObjects.Image | null = null;
  private secondaryButtonText: Phaser.GameObjects.Text | null = null;
  private actionBarVisible = true;

  // Overlays
  private bustOverlay: Phaser.GameObjects.Container | null = null;
  private summaryOverlay: Phaser.GameObjects.Container | null = null;
  private infoPanelOverlay: Phaser.GameObjects.Container | null = null;
  private infoPanelDismissArea: Phaser.GameObjects.Rectangle | null = null;
  private abilityOverlay: Phaser.GameObjects.Container | null = null;
  private winOverlay: Phaser.GameObjects.Container | null = null;

  // State tracking
  private isAnimating = false;
  private hasDoneFirstDraw = false;
  private bustOverlaySummary: NightScoreSummary | null = null;

  // Long-press
  private longPressTimer: Phaser.Time.TimerEvent | null = null;
  private longPressStartPos: { x: number; y: number } | null = null;

  constructor() {
    super(SceneKey.Barn);
  }

  private getCanvasSize(): { cw: number; ch: number } {
    return {
      cw: Math.round(this.scale.width),
      ch: Math.round(this.scale.height),
    };
  }

  private fontPx(base: number, ch: number): string {
    return `${scaledFont(base, ch)}px`;
  }

  private resizeOverlayContainer(container: Phaser.GameObjects.Container, bounds: Rect): void {
    const baseW = container.getData('baseW') as number | undefined;
    const baseH = container.getData('baseH') as number | undefined;
    if (!baseW || !baseH) {
      return;
    }

    container.setPosition(bounds.x, bounds.y);
    container.setScale(bounds.w / baseW, bounds.h / baseH);
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
    this.infoPanelOverlay = null;
    this.abilityOverlay = null;
    this.winOverlay = null;
    this.bustOverlaySummary = null;
    this.cardContainers = [];
    this.slotImages = [];
    this.noiseDots = [];
    this.secondaryButton = null;
    this.secondaryButtonText = null;
    this.windowGlowTween = null;
    this.actionBarVisible = true;
    this.pendingResize = null;
    this.infoPanelDismissArea = null;

    const state = gameStore.getState();
    const capacity = state.capacity;
    const { cw, ch } = this.getCanvasSize();

    // Set DOM attributes
    setDomAttr('data-scene', 'Barn');
    this.updateDomPhase(state);

    // === Environment rendering ===
    this.barnBackground = this.add
      .image(0, 0, TEXTURES.BARN_PLANK)
      .setOrigin(0)
      .setDisplaySize(cw, ch);
    const rafterHeight = Math.max(30, Math.round((42 / LAYOUT.CANVAS.REF_HEIGHT) * ch));
    this.rafter = this.add
      .image(0, 0, TEXTURES.RAFTER)
      .setOrigin(0)
      .setDisplaySize(cw, rafterHeight);
    const floorTop = Math.round((LAYOUT.BARN.FLOOR_Y / LAYOUT.CANVAS.REF_HEIGHT) * ch);
    const floorHeight = Math.max(
      80,
      Math.round((LAYOUT.BARN.FLOOR_HEIGHT / LAYOUT.CANVAS.REF_HEIGHT) * ch),
    );
    this.floorStraw = this.add
      .image(0, floorTop, TEXTURES.FLOOR_STRAW)
      .setOrigin(0)
      .setDisplaySize(cw, floorHeight);

    // Farmhouse
    const farmhouseRect = getFarmhouseRect(capacity, cw, ch);
    this.farmhouseImage = this.add
      .image(farmhouseRect.x, farmhouseRect.y, TEXTURES.FARMHOUSE)
      .setOrigin(0)
      .setDisplaySize(farmhouseRect.w, farmhouseRect.h);

    // Window glow (initially invisible)
    const windowRect = getFarmhouseWindowRect(capacity, cw, ch);
    this.windowGlow = this.add
      .image(windowRect.x, windowRect.y, TEXTURES.WINDOW_GLOW)
      .setOrigin(0)
      .setDisplaySize(windowRect.w, windowRect.h)
      .setAlpha(0);

    // Deck stack
    const deckRect = getDeckStackPosition(capacity, cw, ch);
    this.deckStack = this.add
      .image(deckRect.x, deckRect.y, TEXTURES.DECK_BACK)
      .setOrigin(0)
      .setDisplaySize(deckRect.w, deckRect.h);

    // Deck remaining count
    const night = state.currentNight;
    const deckRemaining = night ? night.deck.length : 0;
    this.deckCountText = this.add
      .text(deckRect.x + deckRect.w / 2, deckRect.y + deckRect.h / 2, `${deckRemaining}`, {
        ...TEXT_STYLE_LIGHT,
        fontSize: this.fontPx(16, ch),
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // === Empty slot outlines ===
    const slotRects = getDynamicSlotRects(capacity, cw, ch);
    this.slotImages = slotRects.map((rect) => {
      return this.add
        .image(rect.x, rect.y, TEXTURES.SLOT_EMPTY)
        .setOrigin(0)
        .setDisplaySize(rect.w, rect.h);
    });

    // === Resource banner ===
    const bannerRect = getResourceBannerPosition(capacity, cw, ch);
    const labelOffsetX = Math.round((120 / LAYOUT.CANVAS.REF_WIDTH) * cw);
    const legendaryOffsetX = Math.round((260 / LAYOUT.CANVAS.REF_WIDTH) * cw);
    const hayOffsetY = Math.round((20 / LAYOUT.CANVAS.REF_HEIGHT) * ch);
    const capacityOffsetY = Math.round((28 / LAYOUT.CANVAS.REF_HEIGHT) * ch);
    const pennedOffsetY = Math.round((42 / LAYOUT.CANVAS.REF_HEIGHT) * ch);
    const nightNum = night ? night.nightNumber : state.nightNumber;
    this.nightText = this.add
      .text(bannerRect.x, bannerRect.y, `Night ${nightNum}`, {
        ...TEXT_STYLE_LIGHT,
        fontSize: this.fontPx(18, ch),
        fontStyle: 'bold',
      })
      .setOrigin(0);

    this.mischiefText = this.add
      .text(bannerRect.x + labelOffsetX, bannerRect.y, `Mischief: ${state.mischief}`, {
        ...TEXT_STYLE_LIGHT,
        fontSize: this.fontPx(14, ch),
      })
      .setOrigin(0);

    this.hayText = this.add
      .text(bannerRect.x + labelOffsetX, bannerRect.y + hayOffsetY, `Hay: ${state.hay}`, {
        ...TEXT_STYLE_LIGHT,
        fontSize: this.fontPx(14, ch),
      })
      .setOrigin(0);

    // Legendary tracker
    const legendaryCount = night?.legendaryCount ?? 0;
    this.legendaryText = this.add
      .text(bannerRect.x + legendaryOffsetX, bannerRect.y, `Legendary: ${legendaryCount}/3`, {
        ...TEXT_STYLE_LIGHT,
        fontSize: this.fontPx(12, ch),
      })
      .setOrigin(0);

    // === Noise meter ===
    const noiseRect = getNoiseMeterPosition(capacity, cw, ch);
    this.noiseLabel = this.add
      .text(noiseRect.x, noiseRect.y, 'Noise:', {
        ...TEXT_STYLE_LIGHT,
        fontSize: this.fontPx(14, ch),
      })
      .setOrigin(0);

    const dotSize = Math.max(14, Math.round((18 / LAYOUT.CANVAS.REF_HEIGHT) * ch));
    const dotStartX = Math.round((60 / LAYOUT.CANVAS.REF_WIDTH) * cw);
    const dotGap = Math.max(18, Math.round((28 / LAYOUT.CANVAS.REF_WIDTH) * cw));
    const dotOffsetY = Math.round((4 / LAYOUT.CANVAS.REF_HEIGHT) * ch);
    const noisyCount = night ? night.noisyCount : 0;
    for (let i = 0; i < 3; i++) {
      const dotTexture = i < noisyCount ? TEXTURES.NOISE_DOT_FILLED : TEXTURES.NOISE_DOT_EMPTY;
      const dot = this.add
        .image(noiseRect.x + dotStartX + i * dotGap, noiseRect.y + dotOffsetY, dotTexture)
        .setOrigin(0)
        .setDisplaySize(dotSize, dotSize);
      this.noiseDots.push(dot);
    }

    // === Capacity indicator ===
    const barnCount = night ? night.barn.length : 0;
    this.capacityText = this.add
      .text(bannerRect.x, bannerRect.y + capacityOffsetY, `Barn: ${barnCount}/${capacity}`, {
        ...TEXT_STYLE_LIGHT,
        fontSize: this.fontPx(14, ch),
      })
      .setOrigin(0);

    // === Penned up indicator ===
    this.pennedUpText = this.add
      .text(bannerRect.x + labelOffsetX, bannerRect.y + pennedOffsetY, '', {
        ...TEXT_STYLE_LIGHT,
        fontSize: this.fontPx(12, ch),
      })
      .setOrigin(0);
    this.updatePennedUpIndicator(state);

    // === Action buttons (initial: single draw button) ===
    this.createActionButtons(false, cw, ch);

    // If resuming a night with draws already made, render existing barn cards
    if (night && night.barn.length > 0) {
      this.hasDoneFirstDraw = true;
      for (let i = 0; i < night.barn.length; i++) {
        this.renderCardInSlot(night.barn[i], i, false);
      }
      this.updateNoiseMeter(night.noisyCount);
      if (night.warning) {
        this.startWindowGlow();
      }
      if (!night.complete && !night.bust) {
        this.createActionButtons(true, cw, ch);
      }
    }

    // Handle resuming into bust or summary state
    if (night?.bust) {
      this.showBustOverlay(night.bust.type === 'farmer' ? 'FARMER WOKE UP!' : 'BARN OVERWHELMED!');
    } else if (night?.wonThisNight) {
      this.showWinOverlay(state);
    } else if (night?.complete && night.summary) {
      this.showNightSummaryOverlay(night.summary, state);
    }

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.applyLayout(cw, ch);

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
        case GamePhase.AbilityDecision:
          phase = DOM_PHASE.ABILITY_DECISION;
          break;
        case GamePhase.Bust:
          phase = DOM_PHASE.BUST;
          break;
        case GamePhase.NightSummary:
          phase = DOM_PHASE.NIGHT_SUMMARY;
          break;
        case GamePhase.Win:
          phase = DOM_PHASE.WIN;
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

  private createActionButtons(dual: boolean, cw?: number, ch?: number): void {
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

    const canvasSize = this.getCanvasSize();
    const width = cw ?? canvasSize.cw;
    const height = ch ?? canvasSize.ch;
    const state = gameStore.getState();
    const layout = getActionBarPosition(state.capacity, dual, width, height);

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
          fontSize: this.fontPx(18, height),
          fontStyle: 'bold',
        },
      )
      .setOrigin(0.5);

    this.primaryButton.on('pointerdown', this.onDrawAnimal, this);

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
            fontSize: this.fontPx(18, height),
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

  private hideActionBar(): void {
    this.actionBarVisible = false;
    this.primaryButton.setVisible(false);
    this.primaryButtonText.setVisible(false);
    if (this.secondaryButton) {
      this.secondaryButton.setVisible(false);
      this.secondaryButtonText!.setVisible(false);
    }
  }

  private showActionBar(): void {
    this.actionBarVisible = true;
    this.primaryButton.setVisible(true);
    this.primaryButtonText.setVisible(true);
    if (this.secondaryButton) {
      this.secondaryButton.setVisible(true);
      this.secondaryButtonText!.setVisible(true);
    }
  }

  private updateActionButtonsLayout(capacity: number, cw: number, ch: number): void {
    if (!this.primaryButton) {
      return;
    }

    const dual = Boolean(this.secondaryButton && this.secondaryButtonText);
    const layout = getActionBarPosition(capacity, dual, cw, ch);
    this.primaryButton
      .setPosition(layout.primary.x, layout.primary.y)
      .setDisplaySize(layout.primary.w, layout.primary.h);
    this.primaryButtonText
      .setPosition(layout.primary.x + layout.primary.w / 2, layout.primary.y + layout.primary.h / 2)
      .setStyle({ fontSize: this.fontPx(18, ch) });

    if (dual && this.secondaryButton && this.secondaryButtonText && layout.secondary) {
      this.secondaryButton
        .setPosition(layout.secondary.x, layout.secondary.y)
        .setDisplaySize(layout.secondary.w, layout.secondary.h);
      this.secondaryButtonText
        .setPosition(
          layout.secondary.x + layout.secondary.w / 2,
          layout.secondary.y + layout.secondary.h / 2,
        )
        .setStyle({ fontSize: this.fontPx(18, ch) });
    }
  }

  private applyLayout(cw: number, ch: number): void {
    const state = gameStore.getState();
    const capacity = state.capacity;
    const slotRects = getDynamicSlotRects(capacity, cw, ch);
    const farmhouseRect = getFarmhouseRect(capacity, cw, ch);
    const windowRect = getFarmhouseWindowRect(capacity, cw, ch);
    const deckRect = getDeckStackPosition(capacity, cw, ch);
    const bannerRect = getResourceBannerPosition(capacity, cw, ch);
    const noiseRect = getNoiseMeterPosition(capacity, cw, ch);
    const overlayBounds = getOverlayBounds(capacity, cw, ch);
    const infoPanelBounds = getInfoPanelBounds(cw, ch);

    this.barnBackground.setDisplaySize(cw, ch);

    const rafterHeight = Math.max(30, Math.round((42 / LAYOUT.CANVAS.REF_HEIGHT) * ch));
    this.rafter.setPosition(0, 0).setDisplaySize(cw, rafterHeight);

    const floorTop = Math.round((LAYOUT.BARN.FLOOR_Y / LAYOUT.CANVAS.REF_HEIGHT) * ch);
    const floorHeight = Math.max(
      80,
      Math.round((LAYOUT.BARN.FLOOR_HEIGHT / LAYOUT.CANVAS.REF_HEIGHT) * ch),
    );
    this.floorStraw.setPosition(0, floorTop).setDisplaySize(cw, floorHeight);

    this.farmhouseImage
      .setPosition(farmhouseRect.x, farmhouseRect.y)
      .setDisplaySize(farmhouseRect.w, farmhouseRect.h);
    this.windowGlow
      .setPosition(windowRect.x, windowRect.y)
      .setDisplaySize(windowRect.w, windowRect.h);
    this.deckStack.setPosition(deckRect.x, deckRect.y).setDisplaySize(deckRect.w, deckRect.h);
    this.deckCountText
      .setPosition(deckRect.x + deckRect.w / 2, deckRect.y + deckRect.h / 2)
      .setStyle({ fontSize: this.fontPx(16, ch) });

    this.slotImages.forEach((slotImage, index) => {
      const slot = slotRects[index];
      if (!slot) {
        slotImage.setVisible(false);
        return;
      }
      slotImage.setVisible(true).setPosition(slot.x, slot.y).setDisplaySize(slot.w, slot.h);
    });

    this.cardContainers.forEach((container, index) => {
      const slot = slotRects[index];
      if (!slot) {
        return;
      }

      const baseW = Number(container.getData('slotW')) || LAYOUT.SLOT.WIDTH;
      const baseH = Number(container.getData('slotH')) || LAYOUT.SLOT.HEIGHT;
      container.setPosition(slot.x, slot.y);
      container.setScale(slot.w / baseW, slot.h / baseH);
    });

    const labelOffsetX = Math.round((120 / LAYOUT.CANVAS.REF_WIDTH) * cw);
    const legendaryOffsetX = Math.round((260 / LAYOUT.CANVAS.REF_WIDTH) * cw);
    const hayOffsetY = Math.round((20 / LAYOUT.CANVAS.REF_HEIGHT) * ch);
    const capacityOffsetY = Math.round((28 / LAYOUT.CANVAS.REF_HEIGHT) * ch);
    const pennedOffsetY = Math.round((42 / LAYOUT.CANVAS.REF_HEIGHT) * ch);

    this.nightText
      .setPosition(bannerRect.x, bannerRect.y)
      .setStyle({ fontSize: this.fontPx(18, ch) });
    this.mischiefText
      .setPosition(bannerRect.x + labelOffsetX, bannerRect.y)
      .setStyle({ fontSize: this.fontPx(14, ch) });
    this.hayText
      .setPosition(bannerRect.x + labelOffsetX, bannerRect.y + hayOffsetY)
      .setStyle({ fontSize: this.fontPx(14, ch) });
    this.legendaryText
      .setPosition(bannerRect.x + legendaryOffsetX, bannerRect.y)
      .setStyle({ fontSize: this.fontPx(12, ch) });
    this.capacityText
      .setPosition(bannerRect.x, bannerRect.y + capacityOffsetY)
      .setStyle({ fontSize: this.fontPx(14, ch) });
    this.pennedUpText
      .setPosition(bannerRect.x + labelOffsetX, bannerRect.y + pennedOffsetY)
      .setStyle({ fontSize: this.fontPx(12, ch) });

    this.noiseLabel
      .setPosition(noiseRect.x, noiseRect.y)
      .setStyle({ fontSize: this.fontPx(14, ch) });
    const dotSize = Math.max(14, Math.round((18 / LAYOUT.CANVAS.REF_HEIGHT) * ch));
    const dotStartX = Math.round((60 / LAYOUT.CANVAS.REF_WIDTH) * cw);
    const dotGap = Math.max(18, Math.round((28 / LAYOUT.CANVAS.REF_WIDTH) * cw));
    const dotOffsetY = Math.round((4 / LAYOUT.CANVAS.REF_HEIGHT) * ch);
    this.noiseDots.forEach((dot, index) => {
      dot
        .setPosition(noiseRect.x + dotStartX + index * dotGap, noiseRect.y + dotOffsetY)
        .setDisplaySize(dotSize, dotSize);
    });

    this.updateActionButtonsLayout(capacity, cw, ch);
    if (!this.actionBarVisible) {
      this.hideActionBar();
    }

    if (this.infoPanelOverlay) {
      this.resizeOverlayContainer(this.infoPanelOverlay, infoPanelBounds);
      this.infoPanelDismissArea?.setSize(cw, ch);
    }
    if (this.summaryOverlay) {
      this.resizeOverlayContainer(this.summaryOverlay, overlayBounds);
    }
    if (this.bustOverlay) {
      this.resizeOverlayContainer(this.bustOverlay, overlayBounds);
    }
    if (this.winOverlay) {
      const baseW = Number(this.winOverlay.getData('baseW')) || LAYOUT.CANVAS.REF_WIDTH;
      const baseH = Number(this.winOverlay.getData('baseH')) || LAYOUT.CANVAS.REF_HEIGHT;
      this.winOverlay.setScale(cw / baseW, ch / baseH);
      const isRaised = this.winOverlay.getData('raised') === true;
      this.winOverlay.setPosition(0, isRaised ? 0 : ch);
    }
    if (this.abilityOverlay) {
      const baseW = Number(this.abilityOverlay.getData('baseW'));
      const baseH = Number(this.abilityOverlay.getData('baseH'));
      if (baseW > 0 && baseH > 0) {
        this.abilityOverlay.setScale(cw / baseW, ch / baseH);
      }
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const cw = Math.round(gameSize.width);
    const ch = Math.round(gameSize.height);

    if (this.isAnimating) {
      this.pendingResize = { cw, ch };
      return;
    }

    this.applyLayout(cw, ch);
  }

  private flushPendingResize(): void {
    if (!this.pendingResize) {
      return;
    }

    const { cw, ch } = this.pendingResize;
    this.pendingResize = null;
    this.applyLayout(cw, ch);
  }

  private shutdown(): void {
    this.scale.off('resize', this.handleResize, this);
    this.pendingResize = null;
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
    let winTriggered = false;
    let peekOffered = false;
    let fetchRequested = false;
    let abilitiesRefreshedCardIds: string[] = [];

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
        case 'win_triggered':
          winTriggered = true;
          break;
        case 'peek_offered':
          peekOffered = true;
          break;
        case 'fetch_requested':
          fetchRequested = true;
          break;
        case 'abilities_refreshed':
          abilitiesRefreshedCardIds = event.refreshedCardIds;
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

    // Refresh pulse
    if (abilitiesRefreshedCardIds.length > 0) {
      animationChain = animationChain.then(() => {
        this.animateRefreshPulse(abilitiesRefreshedCardIds);
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
        if (nightScored) {
          this.bustOverlaySummary = nightScored;
        }
      } else if (winTriggered) {
        this.showWinOverlay(session);
      } else if (peekOffered) {
        this.showPeekUI(session);
      } else if (fetchRequested) {
        this.showFetchUI(session);
      } else if (session.currentNight?.complete && nightScored) {
        this.showNightSummaryOverlay(nightScored, session);
      } else {
        if (!this.hasDoneFirstDraw) {
          this.hasDoneFirstDraw = true;
          const { cw, ch } = this.getCanvasSize();
          this.createActionButtons(true, cw, ch);
        } else {
          this.enableButtons();
        }
      }

      this.flushPendingResize();
    });
  }

  // === Card rendering (Sprint 003 readability overhaul) ===

  private renderCardInSlot(
    card: CardInstance,
    slotIndex: number,
    animated: boolean,
  ): Phaser.GameObjects.Container {
    const state = gameStore.getState();
    const { cw, ch } = this.getCanvasSize();
    const slotRects = getDynamicSlotRects(state.capacity, cw, ch);
    const slot = slotRects[slotIndex];
    if (!slot) return this.add.container(0, 0);

    const animalDef = getAnimalDef(card.animalId);
    const ability = ABILITY_REGISTRY[animalDef.abilityKind];
    const container = this.add.container(slot.x, slot.y);

    // Card background based on tier
    let cardBgTexture: string;
    if (animalDef.tier === 'legendary') {
      cardBgTexture = TEXTURES.CARD_LEGENDARY;
    } else if (animalDef.noisy) {
      cardBgTexture = TEXTURES.CARD_NOISY;
    } else {
      cardBgTexture = TEXTURES.CARD_PARCHMENT;
    }
    const cardBg = this.add.image(0, 0, cardBgTexture).setOrigin(0).setDisplaySize(slot.w, slot.h);
    container.add(cardBg);

    // NOISY! stripe overlay at top of card
    if (animalDef.noisy) {
      const stripeHeight = Math.max(14, Math.round((20 / 104) * slot.h));
      const stripe = this.add
        .image(0, 0, TEXTURES.BADGE_NOISY_STRIPE)
        .setOrigin(0)
        .setDisplaySize(slot.w, stripeHeight);
      container.add(stripe);
      const noisyLabel = this.add
        .text(slot.w / 2, stripeHeight / 2, 'NOISY!', {
          fontFamily: 'monospace',
          fontSize: this.fontPx(10, ch),
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(0.5);
      container.add(noisyLabel);
    }

    // Animal sprite (pixel art scaled 2x, centered in card)
    const spriteY = animalDef.noisy ? slot.h / 2 - 2 : slot.h / 2 - 8;
    const sprite = this.add
      .sprite(slot.w / 2, spriteY, 'animals', card.animalId)
      .setOrigin(0.5)
      .setScale(2);
    container.add(sprite);

    // Name strip at bottom (h=20)
    const nameY = slot.h - 10;
    const nameText = this.add
      .text(slot.w / 2, nameY, animalDef.name, {
        ...TEXT_STYLE_DARK,
        fontSize: this.fontPx(11, ch),
        fontStyle: 'bold',
        wordWrap: { width: slot.w - 8 },
      })
      .setOrigin(0.5);
    container.add(nameText);

    // Resource badges (32px, gold for Mischief top-left, green for Hay top-right)
    const badgeY = animalDef.noisy
      ? Math.round((22 / 104) * slot.h)
      : Math.round((4 / 104) * slot.h);
    const badgeSize = Math.max(24, Math.round((LAYOUT.BADGE.DIAMETER / 96) * slot.w));
    if (animalDef.mischief !== 0) {
      const badge = this.add
        .image(Math.round((4 / 96) * slot.w), badgeY, TEXTURES.BADGE_MISCHIEF_LG)
        .setOrigin(0)
        .setDisplaySize(badgeSize, badgeSize);
      container.add(badge);
      const val = this.add
        .text(Math.round((20 / 96) * slot.w), badgeY + badgeSize / 2, `${animalDef.mischief}`, {
          ...TEXT_STYLE_DARK,
          fontSize: this.fontPx(14, ch),
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      container.add(val);
    }

    if (animalDef.hay !== 0) {
      const badge = this.add
        .image(slot.w - badgeSize - Math.round((4 / 96) * slot.w), badgeY, TEXTURES.BADGE_HAY_LG)
        .setOrigin(0)
        .setDisplaySize(badgeSize, badgeSize);
      container.add(badge);
      const val = this.add
        .text(slot.w - Math.round((20 / 96) * slot.w), badgeY + badgeSize / 2, `${animalDef.hay}`, {
          ...TEXT_STYLE_DARK,
          fontSize: this.fontPx(14, ch),
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      container.add(val);
    }

    // Ability keyword chip at bottom of card
    if (ability.kind !== 'none' && ability.label) {
      let chipTexture: string;
      let chipTextColor = '#ffffff';
      if (ability.trigger === 'on_enter' || ability.trigger === 'manual') {
        chipTexture = TEXTURES.ABILITY_STRIP_ACTIVE;
      } else if (ability.trigger === 'passive') {
        chipTexture = TEXTURES.ABILITY_STRIP_PASSIVE;
      } else {
        chipTexture = TEXTURES.ABILITY_STRIP_TRIGGERED;
        chipTextColor = PALETTE.TEXT_DARK;
      }
      const chipY = slot.h - Math.round((24 / 104) * slot.h);
      const chipH = Math.max(12, Math.round((14 / 104) * slot.h));
      const chip = this.add.image(0, chipY, chipTexture).setOrigin(0).setDisplaySize(slot.w, chipH);
      container.add(chip);
      const chipLabel = this.add
        .text(slot.w / 2, chipY + chipH / 2, ability.label.toUpperCase(), {
          fontFamily: 'monospace',
          fontSize: this.fontPx(9, ch),
          fontStyle: 'bold',
          color: chipTextColor,
        })
        .setOrigin(0.5);
      container.add(chipLabel);
    }

    // Legendary shimmer border
    if (animalDef.tier === 'legendary') {
      const starSize = Math.max(12, Math.round((16 / 96) * slot.w));
      const star = this.add
        .image(
          slot.w - Math.round((14 / 96) * slot.w),
          Math.round((6 / 104) * slot.h),
          TEXTURES.BADGE_STAR,
        )
        .setOrigin(0.5, 0)
        .setDisplaySize(starSize, starSize);
      container.add(star);

      // Animated gold border glow
      const glowBorder = this.add
        .rectangle(slot.w / 2, slot.h / 2, slot.w + 4, slot.h + 4)
        .setStrokeStyle(2, PALETTE.LEGENDARY_BORDER, 0.35);
      container.addAt(glowBorder, 0);
      this.tweens.add({
        targets: glowBorder,
        alpha: { from: 0.35, to: 0.8 },
        duration: ANIMATION.LEGENDARY_GLOW_MS,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Manual ability indicator (tap indicator for unused manual abilities)
    if (ability.trigger === 'manual' && !card.abilityUsed && !this.isAnimating) {
      const tapIndicator = this.add
        .text(slot.w / 2, slot.h - Math.round((38 / 104) * slot.h), 'TAP', {
          fontFamily: 'monospace',
          fontSize: this.fontPx(8, ch),
          fontStyle: 'bold',
          color: '#ffd700',
        })
        .setOrigin(0.5);
      container.add(tapIndicator);
    }

    // Long-press + tap interactivity on card
    const hitArea = this.add
      .rectangle(0, 0, slot.w, slot.h)
      .setOrigin(0)
      .setAlpha(0.001)
      .setInteractive();
    container.add(hitArea);

    hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.longPressStartPos = { x: pointer.x, y: pointer.y };
      this.longPressTimer = this.time.delayedCall(ANIMATION.LONG_PRESS_MS, () => {
        this.showInfoPanel(card);
      });
    });

    hitArea.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.longPressStartPos && this.longPressTimer) {
        const dx = pointer.x - this.longPressStartPos.x;
        const dy = pointer.y - this.longPressStartPos.y;
        if (Math.sqrt(dx * dx + dy * dy) > ANIMATION.LONG_PRESS_MOVE_THRESHOLD) {
          this.longPressTimer.destroy();
          this.longPressTimer = null;
        }
      }
    });

    hitArea.on('pointerup', () => {
      if (this.longPressTimer) {
        this.longPressTimer.destroy();
        this.longPressTimer = null;
        // This was a short tap, check for manual ability
        this.onCardTap(card);
      }
    });

    if (animated) {
      container.setScale(0.5);
      container.setAlpha(0);
    }

    container.setData('slotW', slot.w);
    container.setData('slotH', slot.h);
    this.cardContainers.push(container);
    return container;
  }

  private onCardTap(card: CardInstance): void {
    if (this.isAnimating) return;
    if (this.infoPanelOverlay) return;

    const session = gameStore.getState();
    const night = session.currentNight;
    if (!night || night.complete) return;

    // Check for manual ability activation
    const def = getAnimalDef(card.animalId);
    const ability = ABILITY_REGISTRY[def.abilityKind];
    if (ability.trigger === 'manual' && !card.abilityUsed) {
      const result = activateManualAbilityInSession(session, card.id);
      gameStore.setState(result.session);
      this.updateDomPhase(result.session);

      // If boot requested, show boot UI
      if (result.session.currentNight?.pendingDecision?.kind === 'boot') {
        this.showBootUI(result.session);
      }
    }
  }

  // === Info Panel ===

  private showInfoPanel(card: CardInstance): void {
    if (this.infoPanelOverlay) return;

    const { cw, ch } = this.getCanvasSize();
    const bounds = getInfoPanelBounds(cw, ch);
    const animalDef = getAnimalDef(card.animalId);
    const ability = ABILITY_REGISTRY[animalDef.abilityKind];
    const sx = bounds.w / LAYOUT.INFO_PANEL.WIDTH;
    const sy = bounds.h / LAYOUT.INFO_PANEL.HEIGHT;

    this.hideActionBar();

    const overlay = this.add.container(bounds.x, ch);
    overlay.setData('baseW', bounds.w);
    overlay.setData('baseH', bounds.h);

    // Background
    const bg = this.add
      .image(0, 0, TEXTURES.INFO_PANEL_BG)
      .setOrigin(0)
      .setDisplaySize(bounds.w, bounds.h);
    overlay.add(bg);

    // Portrait frame
    const portrait = this.add
      .sprite((24 + 36) * sx, (18 + 36) * sy, 'animals', card.animalId)
      .setOrigin(0.5)
      .setScale(3 * Math.min(sx, sy));
    overlay.add(portrait);

    // Name
    const name = this.add
      .text(110 * sx, 20 * sy, animalDef.name, {
        ...TEXT_STYLE_LIGHT,
        fontSize: this.fontPx(16, ch),
        fontStyle: 'bold',
      })
      .setOrigin(0, 0);
    overlay.add(name);

    // Tier badge
    if (animalDef.tier === 'legendary') {
      const tierBadge = this.add
        .text(110 * sx, 40 * sy, 'LEGENDARY', {
          fontFamily: 'monospace',
          fontSize: this.fontPx(10, ch),
          fontStyle: 'bold',
          color: '#ffd700',
        })
        .setOrigin(0, 0);
      overlay.add(tierBadge);
    }

    // Resource badges
    const badgeY = 54 * sy;
    const badgeSize = 24 * Math.min(sx, sy);
    const mBadge = this.add
      .image(110 * sx, badgeY, TEXTURES.BADGE_MISCHIEF)
      .setOrigin(0, 0)
      .setDisplaySize(badgeSize, badgeSize);
    overlay.add(mBadge);
    const mText = this.add
      .text(136 * sx, badgeY + 4 * sy, `${animalDef.mischief}`, {
        ...TEXT_STYLE_LIGHT,
        fontSize: this.fontPx(14, ch),
        fontStyle: 'bold',
      })
      .setOrigin(0, 0);
    overlay.add(mText);

    const hBadge = this.add
      .image(176 * sx, badgeY, TEXTURES.BADGE_HAY)
      .setOrigin(0, 0)
      .setDisplaySize(badgeSize, badgeSize);
    overlay.add(hBadge);
    const hText = this.add
      .text(202 * sx, badgeY + 4 * sy, `${animalDef.hay}`, {
        ...TEXT_STYLE_LIGHT,
        fontSize: this.fontPx(14, ch),
        fontStyle: 'bold',
      })
      .setOrigin(0, 0);
    overlay.add(hText);

    // Trait row
    const traits: string[] = [];
    if (animalDef.noisy) traits.push('NOISY!');
    if (ability.kind !== 'none') traits.push(ability.label.toUpperCase());
    if (animalDef.tier === 'legendary') traits.push('LEGENDARY');
    const traitText = this.add
      .text(110 * sx, 88 * sy, traits.join(' | '), {
        ...TEXT_STYLE_LIGHT,
        fontSize: this.fontPx(11, ch),
        wordWrap: { width: Math.max(90, bounds.w - 120 * sx) },
      })
      .setOrigin(0, 0);
    overlay.add(traitText);

    // Ability text
    const abilityText = this.add
      .text(24 * sx, 112 * sy, ability.description, {
        ...TEXT_STYLE_LIGHT,
        fontSize: this.fontPx(12, ch),
        wordWrap: { width: Math.max(120, bounds.w - 36) },
      })
      .setOrigin(0, 0);
    overlay.add(abilityText);

    // Slide up animation
    this.tweens.add({
      targets: overlay,
      y: bounds.y,
      alpha: { from: 0, to: 1 },
      duration: ANIMATION.INFO_PANEL_REVEAL_MS,
      ease: 'Cubic.easeOut',
    });

    // Full-screen invisible hit area for dismiss
    const dismissArea = this.add
      .rectangle(0, 0, cw, ch)
      .setOrigin(0)
      .setAlpha(0.001)
      .setInteractive()
      .setDepth(-1);

    dismissArea.on('pointerdown', () => {
      this.dismissInfoPanel(overlay, dismissArea);
    });

    this.infoPanelOverlay = overlay;
    this.infoPanelDismissArea = dismissArea;
  }

  private dismissInfoPanel(
    overlay: Phaser.GameObjects.Container,
    dismissArea: Phaser.GameObjects.Rectangle,
  ): void {
    const { ch } = this.getCanvasSize();
    this.tweens.add({
      targets: overlay,
      y: ch,
      alpha: 0,
      duration: ANIMATION.INFO_PANEL_DISMISS_MS,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        overlay.destroy();
        dismissArea.destroy();
        this.infoPanelOverlay = null;
        this.infoPanelDismissArea = null;
        this.showActionBar();
      },
    });
  }

  // === Peek UI ===

  private showPeekUI(session: GameSession): void {
    const night = session.currentNight;
    if (!night?.pendingDecision || night.pendingDecision.kind !== 'peek') return;

    const { cw, ch } = this.getCanvasSize();
    this.hideActionBar();
    const decision = night.pendingDecision;
    const previewCard = decision.previewCard;
    const animalDef = getAnimalDef(previewCard.animalId);
    const slotRect = getDynamicSlotRects(session.capacity, cw, ch)[0];
    const previewW = slotRect?.w ?? 96;
    const previewH = slotRect?.h ?? 104;

    const overlay = this.add.container(0, 0);

    // Preview card centered above action bar
    const cx = cw / 2;
    const buttonLayout = getActionBarPosition(session.capacity, true, cw, ch);
    const secondaryButtonRect = buttonLayout.secondary ?? buttonLayout.primary;
    const cy = Math.max(
      Math.round(ch * 0.42),
      buttonLayout.primary.y - previewH - Math.round(ch * 0.06),
    );

    let cardBgTexture: string;
    if (animalDef.tier === 'legendary') {
      cardBgTexture = TEXTURES.CARD_LEGENDARY;
    } else if (animalDef.noisy) {
      cardBgTexture = TEXTURES.CARD_NOISY;
    } else {
      cardBgTexture = TEXTURES.CARD_PARCHMENT;
    }

    const cardBg = this.add
      .image(cx - previewW / 2, cy - previewH / 2, cardBgTexture)
      .setOrigin(0)
      .setDisplaySize(previewW, previewH);
    overlay.add(cardBg);

    const sprite = this.add
      .sprite(cx, cy, 'animals', previewCard.animalId)
      .setOrigin(0.5)
      .setScale(Math.max(1.8, previewH / 40));
    overlay.add(sprite);

    const nameText = this.add
      .text(cx, cy + previewH / 2 - 10, animalDef.name, {
        ...TEXT_STYLE_LIGHT,
        fontSize: this.fontPx(14, ch),
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    overlay.add(nameText);

    const infoText = this.add
      .text(cx, cy + previewH / 2 + 8, `M:${animalDef.mischief} H:${animalDef.hay}`, {
        ...TEXT_STYLE_LIGHT,
        fontSize: this.fontPx(12, ch),
      })
      .setOrigin(0.5);
    overlay.add(infoText);

    // Accept button (green)
    const acceptBtn = this.add
      .image(buttonLayout.primary.x, buttonLayout.primary.y, TEXTURES.BUTTON_PRIMARY)
      .setOrigin(0)
      .setDisplaySize(buttonLayout.primary.w, buttonLayout.primary.h)
      .setInteractive();
    overlay.add(acceptBtn);

    const acceptLabel = this.add
      .text(
        buttonLayout.primary.x + buttonLayout.primary.w / 2,
        buttonLayout.primary.y + buttonLayout.primary.h / 2,
        'ACCEPT',
        {
          ...TEXT_STYLE_LIGHT,
          fontSize: this.fontPx(16, ch),
          fontStyle: 'bold',
        },
      )
      .setOrigin(0.5);
    overlay.add(acceptLabel);

    // Reject button (red)
    const rejectBtn = this.add
      .image(secondaryButtonRect.x, secondaryButtonRect.y, TEXTURES.BUTTON_DANGER)
      .setOrigin(0)
      .setDisplaySize(secondaryButtonRect.w, secondaryButtonRect.h)
      .setInteractive();
    overlay.add(rejectBtn);

    const rejectLabel = this.add
      .text(
        secondaryButtonRect.x + secondaryButtonRect.w / 2,
        secondaryButtonRect.y + secondaryButtonRect.h / 2,
        'REJECT',
        {
          ...TEXT_STYLE_LIGHT,
          fontSize: this.fontPx(16, ch),
          fontStyle: 'bold',
        },
      )
      .setOrigin(0.5);
    overlay.add(rejectLabel);

    acceptBtn.on('pointerdown', () => {
      overlay.destroy();
      this.abilityOverlay = null;
      const currentSession = gameStore.getState();
      const result = acceptPeekInSession(currentSession);
      gameStore.setState(result.session);
      this.showActionBar();
      this.rebuildBarnDisplay(result.session);
      this.updateHud(result.session);
      this.updateDomPhase(result.session);
      this.handlePostAbilityState(result.session, result.events);
    });

    rejectBtn.on('pointerdown', () => {
      overlay.destroy();
      this.abilityOverlay = null;
      const currentSession = gameStore.getState();
      const result = rejectPeekInSession(currentSession);
      gameStore.setState(result.session);
      this.showActionBar();
      this.updateHud(result.session);
      this.updateDomPhase(result.session);
      this.enableButtons();
    });

    overlay.setData('baseW', cw);
    overlay.setData('baseH', ch);
    this.abilityOverlay = overlay;
  }

  // === Boot UI ===

  private showBootUI(session: GameSession): void {
    const night = session.currentNight;
    if (!night?.pendingDecision || night.pendingDecision.kind !== 'boot') return;

    const { cw, ch } = this.getCanvasSize();
    this.hideActionBar();
    const decision = night.pendingDecision;
    const validTargetIds = new Set(decision.validTargetCardIds);

    const overlay = this.add.container(0, 0);

    const actionBar = getActionBarPosition(session.capacity, false, cw, ch).primary;
    const instructionY =
      actionBar.y - Math.max(42, Math.round((46 / LAYOUT.CANVAS.REF_HEIGHT) * ch));

    // Instructional text
    const instrText = this.add
      .text(cw / 2, instructionY, 'Tap an animal to remove', {
        ...TEXT_STYLE_LIGHT,
        fontSize: this.fontPx(14, ch),
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    overlay.add(instrText);

    // Highlight valid targets
    const slotRects = getDynamicSlotRects(session.capacity, cw, ch);
    for (let i = 0; i < night.barn.length; i++) {
      const card = night.barn[i];
      const slot = slotRects[i];
      if (!slot) continue;

      if (validTargetIds.has(card.id)) {
        const highlight = this.add
          .rectangle(slot.x + slot.w / 2, slot.y + slot.h / 2, slot.w + 4, slot.h + 4)
          .setStrokeStyle(3, PALETTE.BUST, 0.8);
        overlay.add(highlight);
        this.tweens.add({
          targets: highlight,
          alpha: { from: 0.4, to: 1 },
          duration: ANIMATION.BOOT_HIGHLIGHT_MS,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        // Make targetable
        const hitArea = this.add
          .rectangle(slot.x, slot.y, slot.w, slot.h)
          .setOrigin(0)
          .setAlpha(0.001)
          .setInteractive();
        overlay.add(hitArea);

        hitArea.on('pointerdown', () => {
          this.executeBootTarget(card.id, overlay);
        });
      }
    }

    // Cancel/forfeit button
    const cancelW = Math.max(140, Math.round(cw * 0.4));
    const cancelH = 48;
    const cancelX = (cw - cancelW) / 2;
    const cancelBtn = this.add
      .image(cancelX, actionBar.y, TEXTURES.BUTTON_SECONDARY)
      .setOrigin(0)
      .setDisplaySize(cancelW, cancelH)
      .setInteractive();
    overlay.add(cancelBtn);

    const cancelLabel = this.add
      .text(cw / 2, actionBar.y + cancelH / 2, 'CANCEL', {
        ...TEXT_STYLE_LIGHT,
        fontSize: this.fontPx(16, ch),
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    overlay.add(cancelLabel);

    cancelBtn.on('pointerdown', () => {
      // Boot self = forfeit
      this.executeBootTarget(decision.sourceCardId, overlay);
    });

    overlay.setData('baseW', cw);
    overlay.setData('baseH', ch);
    this.abilityOverlay = overlay;
  }

  private executeBootTarget(targetCardId: string, overlay: Phaser.GameObjects.Container): void {
    overlay.destroy();
    this.abilityOverlay = null;

    const currentSession = gameStore.getState();
    const result = executeBootInSession(currentSession, targetCardId);
    gameStore.setState(result.session);

    this.showActionBar();
    this.rebuildBarnDisplay(result.session);
    this.updateHud(result.session);
    this.updateDomPhase(result.session);
    this.enableButtons();
  }

  // === Fetch UI ===

  private showFetchUI(session: GameSession): void {
    const night = session.currentNight;
    if (!night?.pendingDecision || night.pendingDecision.kind !== 'fetch') return;

    const { cw, ch } = this.getCanvasSize();
    this.hideActionBar();
    const decision = night.pendingDecision;

    const overlay = this.add.container(0, 0);

    // Semi-transparent background
    const bg = this.add.rectangle(0, 0, cw, ch, 0x000000, 0.6).setOrigin(0).setInteractive();
    overlay.add(bg);

    // Title
    const titleY = Math.round(ch * 0.46);
    const listWidth = Math.min(360, cw - 60);
    const itemHeight = Math.max(44, Math.round((44 / LAYOUT.CANVAS.REF_HEIGHT) * ch));
    const startY = titleY + Math.max(26, Math.round((32 / LAYOUT.CANVAS.REF_HEIGHT) * ch));
    const titleText = this.add
      .text(cw / 2, titleY, 'Choose an animal to fetch', {
        ...TEXT_STYLE_LIGHT,
        fontSize: this.fontPx(16, ch),
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    overlay.add(titleText);

    // Candidate list
    decision.validAnimalIds.forEach((animalId: AnimalId, index: number) => {
      const def = getAnimalDef(animalId);
      const y = startY + index * itemHeight;

      const itemBg = this.add
        .rectangle(cw / 2, y + itemHeight / 2, listWidth, itemHeight - 4, 0x333333, 0.8)
        .setInteractive();
      overlay.add(itemBg);

      const itemText = this.add
        .text(cw / 2, y + itemHeight / 2, def.name, {
          ...TEXT_STYLE_LIGHT,
          fontSize: this.fontPx(14, ch),
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      overlay.add(itemText);

      itemBg.on('pointerdown', () => {
        this.executeFetchChoice(animalId, overlay);
      });
    });

    // Cancel button
    const cancelY =
      startY +
      decision.validAnimalIds.length * itemHeight +
      Math.max(12, Math.round((16 / LAYOUT.CANVAS.REF_HEIGHT) * ch));
    const cancelW = Math.max(160, Math.round(cw * 0.42));
    const cancelBtn = this.add
      .rectangle(cw / 2, cancelY + 24, cancelW, 40, 0x555555, 0.9)
      .setInteractive();
    overlay.add(cancelBtn);

    const cancelLabel = this.add
      .text(cw / 2, cancelY + 24, 'CANCEL', {
        ...TEXT_STYLE_LIGHT,
        fontSize: this.fontPx(14, ch),
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    overlay.add(cancelLabel);

    cancelBtn.on('pointerdown', () => {
      overlay.destroy();
      this.abilityOverlay = null;
      // Skip fetch by clearing the pending decision manually
      const currentSession = gameStore.getState();
      const pendingDecision = currentSession.currentNight?.pendingDecision;
      if (currentSession.currentNight && pendingDecision) {
        const night = currentSession.currentNight;
        const sourceCardId = pendingDecision.kind === 'fetch' ? pendingDecision.sourceCardId : '';
        const updatedNight = {
          ...night,
          pendingDecision: null,
          phase: night.warning ? GamePhase.Warning : GamePhase.PlayerDecision,
          barn: night.barn.map((c) => (c.id === sourceCardId ? { ...c, abilityUsed: true } : c)),
        };
        gameStore.setState({ ...currentSession, currentNight: updatedNight });
      }
      this.showActionBar();
      this.updateHud(gameStore.getState());
      this.updateDomPhase(gameStore.getState());
      this.enableButtons();
    });

    overlay.setData('baseW', cw);
    overlay.setData('baseH', ch);
    this.abilityOverlay = overlay;
  }

  private executeFetchChoice(
    selectedAnimalId: AnimalId,
    overlay: Phaser.GameObjects.Container,
  ): void {
    overlay.destroy();
    this.abilityOverlay = null;

    const currentSession = gameStore.getState();
    const result = executeFetchInSession(currentSession, selectedAnimalId);
    gameStore.setState(result.session);

    this.showActionBar();
    this.rebuildBarnDisplay(result.session);
    this.updateHud(result.session);
    this.updateDomPhase(result.session);
    this.handlePostAbilityState(result.session, result.events);
  }

  private handlePostAbilityState(session: GameSession, events: NightEvent[]): void {
    const night = session.currentNight;
    const nightScored = events.find((e) => e.type === 'night_scored');
    const winTriggered = events.find((e) => e.type === 'win_triggered');

    if (night?.bust) {
      const summary =
        nightScored && nightScored.type === 'night_scored' ? nightScored.summary : null;
      if (summary) {
        this.bustOverlaySummary = summary;
      }
      const bustMessage = night.bust.type === 'farmer' ? 'FARMER WOKE UP!' : 'BARN OVERWHELMED!';
      this.showBustOverlay(bustMessage);
    } else if (winTriggered || night?.wonThisNight) {
      this.showWinOverlay(session);
    } else if (night?.complete && nightScored && nightScored.type === 'night_scored') {
      this.showNightSummaryOverlay(nightScored.summary, session);
    } else {
      this.enableButtons();
    }
  }

  // === Refresh pulse animation ===

  private animateRefreshPulse(cardIds: string[]): void {
    const session = gameStore.getState();
    const night = session.currentNight;
    if (!night) return;

    const cardIdSet = new Set(cardIds);
    for (let i = 0; i < night.barn.length && i < this.cardContainers.length; i++) {
      if (cardIdSet.has(night.barn[i].id)) {
        const container = this.cardContainers[i];
        this.tweens.add({
          targets: container,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: ANIMATION.REFRESH_PULSE_MS / 2,
          yoyo: true,
          ease: 'Quad.easeOut',
        });
      }
    }
  }

  // === Rebuild barn display (after ability execution) ===

  private rebuildBarnDisplay(session: GameSession): void {
    // Destroy existing card containers
    for (const container of this.cardContainers) {
      container.destroy();
    }
    this.cardContainers = [];

    const night = session.currentNight;
    if (!night) return;

    for (let i = 0; i < night.barn.length; i++) {
      this.renderCardInSlot(night.barn[i], i, false);
    }
    this.updateNoiseMeter(night.noisyCount);
    if (night.warning) {
      this.startWindowGlow();
    } else {
      this.stopWindowGlow();
    }
  }

  // === Animations ===

  private animateCardReveal(card: CardInstance, slotIndex: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const state = gameStore.getState();
      const { cw, ch } = this.getCanvasSize();
      const slotRects = getDynamicSlotRects(state.capacity, cw, ch);
      const slot = slotRects[slotIndex];
      if (!slot) {
        resolve();
        return;
      }

      const deckPos = getDeckStackPosition(state.capacity, cw, ch);

      const container = this.renderCardInSlot(card, slotIndex, true);
      container.setPosition(deckPos.x, deckPos.y);
      container.setAlpha(1);
      container.setScale(0.5);

      this.tweens.add({
        targets: container,
        x: slot.x,
        y: slot.y,
        scale: 1,
        duration: ANIMATION.DRAW_SLIDE_MS,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: container,
            scale: 1.08,
            duration: ANIMATION.STAT_POP_MS / 2,
            yoyo: true,
            ease: 'Quad.easeInOut',
            onComplete: () => {
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
    this.legendaryText.setText(`Legendary: ${night?.legendaryCount ?? 0}/3`);
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
    // Array-based penned-up display
    if (session.activePennedUpCardIds.length > 0) {
      const names = session.activePennedUpCardIds
        .map((id) => {
          const card = session.herd.find((c) => c.id === id);
          return card ? getAnimalDef(card.animalId).name : '';
        })
        .filter(Boolean);
      this.pennedUpText.setText(`Penned: ${names.join(', ')}`);
    } else {
      // Fall back to legacy
      const night = session.currentNight;
      if (night?.pennedUpCard) {
        const def = getAnimalDef(night.pennedUpCard.animalId);
        this.pennedUpText.setText(`Penned: ${def.name}`);
      } else {
        this.pennedUpText.setText('');
      }
    }
  }

  // === Bust overlay ===

  private showBustOverlay(message: string): void {
    if (this.bustOverlay) return;

    const state = gameStore.getState();
    const { cw, ch } = this.getCanvasSize();
    const bounds = getOverlayBounds(state.capacity, cw, ch);
    const overlay = this.add.container(bounds.x, bounds.y);
    overlay.setData('baseW', bounds.w);
    overlay.setData('baseH', bounds.h);

    const bg = this.add.rectangle(0, 0, bounds.w, bounds.h, 0x000000, 0.75).setOrigin(0);
    overlay.add(bg);

    const bustText = this.add
      .text(bounds.w / 2, bounds.h / 2 - 40, message, {
        fontFamily: 'monospace',
        fontSize: this.fontPx(28, ch),
        fontStyle: 'bold',
        color: '#d94b3d',
        align: 'center',
      })
      .setOrigin(0.5);
    overlay.add(bustText);

    const btnW = Math.min(260, Math.round(bounds.w * 0.58));
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
        fontSize: this.fontPx(18, ch),
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

    overlay.setAlpha(0);
    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: ANIMATION.BUST_OVERLAY_MS,
    });

    this.bustOverlay = overlay;
  }

  // === Win overlay ===

  private showWinOverlay(session: GameSession): void {
    if (this.winOverlay) return;

    const { cw, ch } = this.getCanvasSize();

    // Camera zoom burst
    this.cameras.main.zoomTo(
      1.04,
      ANIMATION.WIN_BURST_MS / 2,
      'Expo.easeOut',
      false,
      (_cam: unknown, progress: number) => {
        if (progress >= 1) {
          this.cameras.main.zoomTo(1.0, ANIMATION.WIN_BURST_MS / 2, 'Expo.easeIn');
        }
      },
    );

    const overlay = this.add.container(0, ch);
    overlay.setData('baseW', cw);
    overlay.setData('baseH', ch);
    overlay.setData('raised', false);

    const bg = this.add.rectangle(0, 0, cw, ch, 0x000000, 0.85).setOrigin(0);
    overlay.add(bg);

    // YOU WIN! text
    const winText = this.add
      .text(cw / 2, Math.round((200 / LAYOUT.CANVAS.REF_HEIGHT) * ch), 'YOU WIN!', {
        fontFamily: 'monospace',
        fontSize: this.fontPx(32, ch),
        fontStyle: 'bold',
        color: '#ffd700',
      })
      .setOrigin(0.5);
    overlay.add(winText);

    // Display Legendary sprites
    const night = session.currentNight;
    if (night) {
      const legendaryCards = night.barn.filter(
        (c) => getAnimalDef(c.animalId).tier === 'legendary',
      );
      const spacing = Math.round((120 / LAYOUT.CANVAS.REF_WIDTH) * cw);
      const startX = cw / 2 - ((legendaryCards.length - 1) * spacing) / 2;
      legendaryCards.forEach((card, i) => {
        const x = startX + i * spacing;
        const sprite = this.add
          .sprite(x, Math.round((340 / LAYOUT.CANVAS.REF_HEIGHT) * ch), 'animals', card.animalId)
          .setOrigin(0.5)
          .setScale(Math.max(2.2, (3 * ch) / LAYOUT.CANVAS.REF_HEIGHT));
        overlay.add(sprite);
        const name = this.add
          .text(
            x,
            Math.round((390 / LAYOUT.CANVAS.REF_HEIGHT) * ch),
            getAnimalDef(card.animalId).name,
            {
              ...TEXT_STYLE_LIGHT,
              fontSize: this.fontPx(11, ch),
              fontStyle: 'bold',
            },
          )
          .setOrigin(0.5);
        overlay.add(name);
      });
    }

    // Final score
    const scoreText = this.add
      .text(
        cw / 2,
        Math.round((460 / LAYOUT.CANVAS.REF_HEIGHT) * ch),
        `Final Mischief: ${session.mischief}\nTotal Hay: ${session.hay}\nNights: ${session.nightNumber - 1}`,
        {
          ...TEXT_STYLE_LIGHT,
          fontSize: this.fontPx(14, ch),
          align: 'center',
        },
      )
      .setOrigin(0.5, 0);
    overlay.add(scoreText);

    // Play Again button
    const actionBar = getActionBarPosition(session.capacity, false, cw, ch).primary;
    const btnW = Math.min(280, Math.round(cw * 0.52));
    const btnH = 56;
    const btnX = (cw - btnW) / 2;
    const btnY = actionBar.y;

    const playAgainBtn = this.add
      .image(btnX, btnY, TEXTURES.BUTTON_PRIMARY)
      .setOrigin(0)
      .setDisplaySize(btnW, btnH)
      .setInteractive();
    overlay.add(playAgainBtn);

    const playAgainText = this.add
      .text(btnX + btnW / 2, btnY + btnH / 2, 'Play Again', {
        ...TEXT_STYLE_LIGHT,
        fontSize: this.fontPx(18, ch),
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    overlay.add(playAgainText);

    playAgainBtn.on('pointerdown', () => {
      gameStore.reset();
      this.scene.start(SceneKey.Barn);
    });

    // Rise animation
    this.tweens.add({
      targets: overlay,
      y: 0,
      duration: ANIMATION.WIN_OVERLAY_RISE_MS,
      ease: 'Back.easeOut',
      onComplete: () => {
        overlay.setData('raised', true);
      },
    });

    this.winOverlay = overlay;
  }

  // === Night Summary overlay ===

  private showNightSummaryOverlay(summary: NightScoreSummary, session: GameSession): void {
    if (this.summaryOverlay) return;

    const { cw, ch } = this.getCanvasSize();
    const bounds = getOverlayBounds(session.capacity, cw, ch);
    const overlay = this.add.container(bounds.x, bounds.y);
    overlay.setData('baseW', bounds.w);
    overlay.setData('baseH', bounds.h);

    const bg = this.add.rectangle(0, 0, bounds.w, bounds.h, 0x000000, 0.85).setOrigin(0);
    overlay.add(bg);

    const titleStr = summary.reason === 'bust' ? 'Night Summary (Bust!)' : 'Night Summary';
    const title = this.add
      .text(bounds.w / 2, 20, titleStr, {
        ...TEXT_STYLE_LIGHT,
        fontSize: this.fontPx(20, ch),
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0);
    overlay.add(title);

    const lineY = 60;
    const lineHeight = 24;

    summary.lines.forEach((line: NightScoreLine, index: number) => {
      const y = lineY + index * lineHeight;
      const mStr = line.mischief + (line.bonusMischief > 0 ? `+${line.bonusMischief}` : '');
      const lineText = this.add
        .text(20, y, `${line.name}  M:${mStr}  H:${line.hay}`, {
          ...TEXT_STYLE_LIGHT,
          fontSize: this.fontPx(12, ch),
        })
        .setOrigin(0);
      overlay.add(lineText);

      lineText.setAlpha(0);
      this.tweens.add({
        targets: lineText,
        alpha: 1,
        duration: ANIMATION.SCORE_LINE_MS,
        delay: index * ANIMATION.SCORE_STAGGER_MS,
      });
    });

    const totalsY = lineY + summary.lines.length * lineHeight + 16;

    const baseLine = this.add
      .text(20, totalsY, `Base Mischief: ${summary.baseMischief}`, {
        ...TEXT_STYLE_LIGHT,
        fontSize: this.fontPx(13, ch),
      })
      .setOrigin(0);
    overlay.add(baseLine);

    if (summary.bonusMischief > 0) {
      const bonusLine = this.add
        .text(20, totalsY + 20, `Bonus Mischief: +${summary.bonusMischief}`, {
          ...TEXT_STYLE_LIGHT,
          fontSize: this.fontPx(13, ch),
        })
        .setOrigin(0);
      overlay.add(bonusLine);
    }

    if (summary.penaltyMischief < 0) {
      const penaltyLine = this.add
        .text(20, totalsY + 40, `Penalty: ${summary.penaltyMischief}`, {
          fontFamily: 'monospace',
          fontSize: this.fontPx(13, ch),
          color: '#d94b3d',
        })
        .setOrigin(0);
      overlay.add(penaltyLine);
    }

    const totalMischiefY = totalsY + 64;
    const totalLine = this.add
      .text(20, totalMischiefY, `Total Mischief: ${summary.totalMischief}`, {
        ...TEXT_STYLE_LIGHT,
        fontSize: this.fontPx(15, ch),
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
          fontSize: this.fontPx(12, ch),
        },
      )
      .setOrigin(0);
    overlay.add(hayLine);

    if (summary.hayUnpaid > 0) {
      const unpaidLine = this.add
        .text(20, totalMischiefY + 44, `Hay unpaid: ${summary.hayUnpaid}`, {
          fontFamily: 'monospace',
          fontSize: this.fontPx(12, ch),
          color: '#ffbe4d',
        })
        .setOrigin(0);
      overlay.add(unpaidLine);
    }

    // Penned up notifications
    const pennedUpCardIds = session.pendingPennedUpCardIds;
    if (pennedUpCardIds.length > 0) {
      let pennedY = totalMischiefY + 72;
      for (const cardId of pennedUpCardIds) {
        const card = session.herd.find((c) => c.id === cardId);
        if (card) {
          const pennedDef = getAnimalDef(card.animalId);
          const lockImg = this.add
            .image(20, pennedY, TEXTURES.LOCK_ICON)
            .setOrigin(0)
            .setScale(0.5);
          overlay.add(lockImg);
          const pennedText = this.add
            .text(44, pennedY, `${pennedDef.name} penned up next night`, {
              fontFamily: 'monospace',
              fontSize: this.fontPx(12, ch),
              color: '#ffbe4d',
            })
            .setOrigin(0);
          overlay.add(pennedText);
          pennedY += 20;
        }
      }
    } else if (session.currentNight?.bust) {
      // Legacy fallback
      const bustCard = session.currentNight.bust.card;
      const pennedDef = getAnimalDef(bustCard.animalId);
      const pennedY = totalMischiefY + 72;
      const lockImg = this.add.image(20, pennedY, TEXTURES.LOCK_ICON).setOrigin(0).setScale(0.5);
      overlay.add(lockImg);
      const pennedText = this.add
        .text(44, pennedY, `${pennedDef.name} penned up next night`, {
          fontFamily: 'monospace',
          fontSize: this.fontPx(12, ch),
          color: '#ffbe4d',
        })
        .setOrigin(0);
      overlay.add(pennedText);
    }

    const btnW = Math.min(320, bounds.w - 40);
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
        fontSize: this.fontPx(16, ch),
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
