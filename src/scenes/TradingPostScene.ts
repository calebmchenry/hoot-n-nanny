import Phaser from 'phaser';
import { ANIMATION, PALETTE, TEXTURES, DEPTH } from '../config/constants';
import * as gameStore from '../game/gameStore';
import { getAnimalDef } from '../game/animals';
import { ABILITY_REGISTRY } from '../game/abilities';
import {
  purchaseAnimalInSession,
  upgradeCapacityInSession,
  startNextNight,
  getCapacityUpgradeCost,
} from '../game/session';
import { generateMarket, generateLegendaryMarket } from '../game/shop';
import { SceneKey } from '../types';
import type { MarketItem, ShopAnimalId } from '../game/types';
import type { Rect } from './barnLayout';
import {
  getShopGridPositions,
  getCapacityUpgradePosition,
  getStartNightButtonPosition,
  getCurrencyHeaderPosition,
  getPennedUpPosition,
  getTabButtonPositions,
  scaledShopFont,
} from './tradingPostLayout';
import { showAbilityTooltip, hideAbilityTooltip as dismissAbilityTooltip } from './tooltipHelper';

const TEXT_LIGHT_TINT = 0xf8f3e5;
const TEXT_DARK_TINT = 0x241611;
const TOOLTIP_HOVER_DELAY_MS = 150;

interface ShopCardView {
  container: Phaser.GameObjects.Container;
  item: MarketItem;
  bg: Phaser.GameObjects.Image;
  sprite: Phaser.GameObjects.Image;
  nameText: Phaser.GameObjects.BitmapText;
  costBadge: Phaser.GameObjects.Image;
  costText: Phaser.GameObjects.BitmapText;
  mischiefLabel: Phaser.GameObjects.BitmapText;
  hayLabel: Phaser.GameObjects.BitmapText;
  stockText: Phaser.GameObjects.BitmapText;
  abilityLabel: Phaser.GameObjects.BitmapText | null;
  star: Phaser.GameObjects.Image | null;
}

type ShopTab = 'animals' | 'legendary';

export class TradingPostScene extends Phaser.Scene {
  private shopCards: ShopCardView[] = [];
  private background!: Phaser.GameObjects.TileSprite;
  private titleText!: Phaser.GameObjects.BitmapText;
  private nightText!: Phaser.GameObjects.BitmapText;
  private counterStrip!: Phaser.GameObjects.Rectangle;
  private shelfShadow!: Phaser.GameObjects.Rectangle;
  private mischiefIcon!: Phaser.GameObjects.Image;
  private hayIcon!: Phaser.GameObjects.Image;
  private mischiefText!: Phaser.GameObjects.BitmapText;
  private hayText!: Phaser.GameObjects.BitmapText;
  private pennedUpContainer!: Phaser.GameObjects.Container;
  private pennedUpIcon!: Phaser.GameObjects.Image;
  private pennedUpLabel!: Phaser.GameObjects.BitmapText;
  private capacityButton!: Phaser.GameObjects.Container;
  private capacityBtnBg!: Phaser.GameObjects.Image;
  private capacityBtnText!: Phaser.GameObjects.BitmapText;
  private startNightButton!: Phaser.GameObjects.Container;
  private startNightBtnBg!: Phaser.GameObjects.Image;
  private startNightBtnText!: Phaser.GameObjects.BitmapText;
  private activeTab: ShopTab = 'animals';
  private animalsTabBtn!: Phaser.GameObjects.Container;
  private legendaryTabBtn!: Phaser.GameObjects.Container;
  private animalsTabBg!: Phaser.GameObjects.Image;
  private legendaryTabBg!: Phaser.GameObjects.Image;
  private animalsTabLabel!: Phaser.GameObjects.BitmapText;
  private legendaryTabLabel!: Phaser.GameObjects.BitmapText;
  private abilityTooltip: Phaser.GameObjects.Container | null = null;
  private tooltipDelayTimer: Phaser.Time.TimerEvent | null = null;
  private tooltipAnimalId: ShopAnimalId | null = null;
  private mobilePreviewAnimalId: ShopAnimalId | null = null;

  constructor() {
    super(SceneKey.TradingPost);
  }

  private getCanvasSize(): { cw: number; ch: number } {
    return {
      cw: Math.round(this.scale.width),
      ch: Math.round(this.scale.height),
    };
  }

  private fontPx(base: number, ch: number): number {
    return scaledShopFont(base, ch);
  }

  private fontCss(base: number, ch: number): string {
    return `${this.fontPx(base, ch)}px`;
  }

  private addBitmapText(
    x: number,
    y: number,
    text: string,
    size: number,
    tint = TEXT_LIGHT_TINT,
  ): Phaser.GameObjects.BitmapText {
    return this.add.bitmapText(x, y, 'pixel-font', text, size).setTint(tint);
  }

  private addButtonPressFeedback(
    button: Phaser.GameObjects.Image,
    label: Phaser.GameObjects.BitmapText,
  ): void {
    if (button.getData('feedback-bound') === true) {
      return;
    }
    button.setData('feedback-bound', true);
    button.setData('baseY', button.y);
    label.setData('baseY', label.y);

    button.on('pointerdown', () => {
      if (!button.input?.enabled) {
        return;
      }
      this.tweens.killTweensOf([button, label]);
      const baseY = Number(button.getData('baseY')) || button.y;
      const labelBaseY = Number(label.getData('baseY')) || label.y;
      this.tweens.add({
        targets: [button, label],
        scaleX: 0.97,
        scaleY: 0.97,
        duration: 70,
        ease: 'Quad.Out',
      });
      this.tweens.add({ targets: button, y: baseY + 2, duration: 70, ease: 'Quad.Out' });
      this.tweens.add({ targets: label, y: labelBaseY + 2, duration: 70, ease: 'Quad.Out' });
    });

    const release = (): void => {
      this.tweens.killTweensOf([button, label]);
      const baseY = Number(button.getData('baseY')) || button.y;
      const labelBaseY = Number(label.getData('baseY')) || label.y;
      this.tweens.add({
        targets: [button, label],
        scaleX: 1,
        scaleY: 1,
        duration: 110,
        ease: 'Back.Out',
      });
      this.tweens.add({ targets: button, y: baseY, duration: 110, ease: 'Back.Out' });
      this.tweens.add({ targets: label, y: labelBaseY, duration: 110, ease: 'Back.Out' });
    };

    button.on('pointerup', release);
    button.on('pointerout', release);
  }

  private isTouchPointer(pointer: Phaser.Input.Pointer): boolean {
    const sourceEvent = pointer.event;
    return (
      pointer.wasTouch ||
      (sourceEvent instanceof PointerEvent &&
        (sourceEvent.pointerType === 'touch' || sourceEvent.pointerType === 'pen'))
    );
  }

  private clearTooltipDelay(): void {
    this.tooltipDelayTimer?.destroy();
    this.tooltipDelayTimer = null;
  }

  private hideShopTooltip(): void {
    this.clearTooltipDelay();
    if (!this.abilityTooltip) {
      this.tooltipAnimalId = null;
      return;
    }
    const tooltip = this.abilityTooltip;
    this.abilityTooltip = null;
    this.tooltipAnimalId = null;
    dismissAbilityTooltip(this, tooltip);
  }

  private isPointerOverShopCard(currentlyOver: Phaser.GameObjects.GameObject[]): boolean {
    return currentlyOver.some((entry) => entry.getData('shop-card-hit-area') === true);
  }

  private getShopCardTooltipAnchor(cardView: ShopCardView): { x: number; y: number } {
    const bounds = cardView.container.getBounds();
    return { x: bounds.centerX, y: bounds.top };
  }

  private showShopCardTooltip(cardView: ShopCardView): boolean {
    const animalDef = getAnimalDef(cardView.item.animalId);
    const ability = ABILITY_REGISTRY[animalDef.abilityKind];
    if (ability.kind === 'none') {
      this.hideShopTooltip();
      return false;
    }

    if (this.tooltipAnimalId === cardView.item.animalId && this.abilityTooltip?.active) {
      return true;
    }

    const { cw, ch } = this.getCanvasSize();
    const anchor = this.getShopCardTooltipAnchor(cardView);
    this.hideShopTooltip();
    this.abilityTooltip = showAbilityTooltip(this, anchor.x, anchor.y, animalDef, ability, cw, ch);
    this.tooltipAnimalId = cardView.item.animalId;
    return true;
  }

  private scheduleDesktopTooltip(cardView: ShopCardView): void {
    this.clearTooltipDelay();
    this.tooltipDelayTimer = this.time.delayedCall(TOOLTIP_HOVER_DELAY_MS, () => {
      this.showShopCardTooltip(cardView);
    });
  }

  private handleMobileCardTap(cardView: ShopCardView): void {
    const isSecondTap = this.mobilePreviewAnimalId === cardView.item.animalId;
    if (isSecondTap && cardView.item.affordable) {
      this.mobilePreviewAnimalId = null;
      this.hideShopTooltip();
      this.onPurchase(cardView.item.animalId, cardView.container);
      return;
    }

    this.mobilePreviewAnimalId = cardView.item.animalId;
    const didShowTooltip = this.showShopCardTooltip(cardView);
    if (!didShowTooltip) {
      this.tweens.add({
        targets: cardView.container,
        scaleX: 1.04,
        scaleY: 1.04,
        duration: 80,
        yoyo: true,
        ease: 'Quad.Out',
      });
    }
  }

  private handleGlobalPointerDown(
    pointer: Phaser.Input.Pointer,
    currentlyOver: Phaser.GameObjects.GameObject[] = [],
  ): void {
    if (!this.isTouchPointer(pointer)) {
      return;
    }
    if (this.isPointerOverShopCard(currentlyOver)) {
      return;
    }
    this.mobilePreviewAnimalId = null;
    this.hideShopTooltip();
  }

  private transitionToBarn(): void {
    if (this.cameras.main.fadeEffect?.isRunning) {
      return;
    }
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SceneKey.Barn);
    });
    this.cameras.main.fadeOut(ANIMATION.SCENE_FADE_MS, 0, 0, 0);
  }

  create(): void {
    this.activeTab = 'animals';
    this.mobilePreviewAnimalId = null;
    this.tooltipAnimalId = null;
    this.abilityTooltip = null;
    this.tooltipDelayTimer = null;
    const { cw, ch } = this.getCanvasSize();

    this.background = this.add
      .tileSprite(0, 0, cw, ch, TEXTURES.TRADING_POST_BG)
      .setOrigin(0)
      .setDepth(DEPTH.WALL);
    this.shelfShadow = this.add
      .rectangle(cw / 2, ch * 0.38, cw * 0.9, ch * 0.26, 0x000000, 0.2)
      .setDepth(DEPTH.RAFTER);
    this.counterStrip = this.add
      .rectangle(cw / 2, ch * 0.76, cw, ch * 0.36, PALETTE.WARM_SHADOW, 0.36)
      .setDepth(DEPTH.FLOOR);

    this.createHeader(cw, ch);
    this.createCurrencyDisplay(cw, ch);
    this.createPennedUpDisplay(cw, ch);
    this.createTabs(cw, ch);
    this.createShopGrid(cw, ch);
    this.createCapacityUpgrade(cw, ch);
    this.createStartNightButton(cw, ch);
    this.setDomAttributes();

    this.input.on('pointerdown', this.handleGlobalPointerDown, this);
    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.applyLayout(cw, ch);
    this.cameras.main.fadeIn(ANIMATION.SCENE_FADE_MS, 0, 0, 0);
  }

  private createHeader(cw: number, ch: number): void {
    const session = gameStore.getState();

    this.titleText = this.addBitmapText(
      cw / 2,
      Math.round((80 / 844) * ch),
      'Trading Post',
      this.fontPx(14, ch),
    )
      .setOrigin(0.5)
      .setDepth(DEPTH.HUD);

    this.nightText = this.addBitmapText(
      cw / 2,
      Math.round((106 / 844) * ch),
      `Night ${session.nightNumber}`,
      this.fontPx(12, ch),
    )
      .setOrigin(0.5)
      .setDepth(DEPTH.HUD);
  }

  private createCurrencyDisplay(cw: number, ch: number): void {
    const session = gameStore.getState();
    const pos = getCurrencyHeaderPosition(cw, ch);

    this.mischiefIcon = this.add
      .image(pos.x, pos.y + pos.h / 2, TEXTURES.BADGE_MISCHIEF)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.HUD);
    this.mischiefText = this.addBitmapText(
      pos.x + 30,
      pos.y + pos.h / 2,
      String(session.mischief),
      this.fontPx(14, ch),
    )
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.HUD);

    this.hayIcon = this.add
      .image(pos.x + 120, pos.y + pos.h / 2, TEXTURES.BADGE_HAY)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.HUD);
    this.hayText = this.addBitmapText(
      pos.x + 150,
      pos.y + pos.h / 2,
      String(session.hay),
      this.fontPx(14, ch),
    )
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.HUD);
  }

  private createPennedUpDisplay(cw: number, ch: number): void {
    const pos = getPennedUpPosition(cw, ch);
    this.pennedUpContainer = this.add.container(pos.x, pos.y);

    this.pennedUpIcon = this.add.image(0, pos.h / 2, TEXTURES.LOCK_ICON).setOrigin(0, 0.5);
    this.pennedUpLabel = this.addBitmapText(26, pos.h / 2, '', this.fontPx(10, ch)).setOrigin(
      0,
      0.5,
    );

    this.pennedUpContainer.add([this.pennedUpIcon, this.pennedUpLabel]);
    this.pennedUpContainer.setDepth(DEPTH.HUD);
    this.refreshPennedUp();
  }

  private refreshPennedUp(): void {
    const session = gameStore.getState();

    const pennedIds =
      session.activePennedUpCardIds.length > 0
        ? session.activePennedUpCardIds
        : session.activePennedUpCardId
          ? [session.activePennedUpCardId]
          : [];

    if (pennedIds.length === 0) {
      this.pennedUpContainer.setVisible(false);
      this.pennedUpLabel.setText('');
      return;
    }

    const names = pennedIds
      .map((id) => {
        const card = session.herd.find((c) => c.id === id);
        return card ? getAnimalDef(card.animalId).name : '';
      })
      .filter(Boolean);

    if (names.length === 0) {
      this.pennedUpContainer.setVisible(false);
      this.pennedUpLabel.setText('');
      return;
    }

    this.pennedUpContainer.setVisible(true);
    this.pennedUpLabel.setText(`Penned: ${names.join(', ')}`);
  }

  private createTabs(cw: number, ch: number): void {
    const tabPos = getTabButtonPositions(cw, ch);

    this.animalsTabBtn = this.add.container(tabPos.animals.x, tabPos.animals.y);
    this.animalsTabBg = this.add
      .image(0, 0, TEXTURES.BUTTON_PRIMARY)
      .setOrigin(0)
      .setDisplaySize(tabPos.animals.w, tabPos.animals.h)
      .setInteractive()
      .setDepth(DEPTH.BUTTONS);
    this.animalsTabLabel = this.addBitmapText(
      tabPos.animals.w / 2,
      tabPos.animals.h / 2,
      'Animals',
      this.fontPx(12, ch),
    ).setOrigin(0.5);
    this.animalsTabBtn.add([this.animalsTabBg, this.animalsTabLabel]);
    this.animalsTabBtn.setDepth(DEPTH.BUTTONS);
    this.animalsTabBg.on('pointerdown', () => this.switchTab('animals'));
    this.addButtonPressFeedback(this.animalsTabBg, this.animalsTabLabel);

    this.legendaryTabBtn = this.add.container(tabPos.legendary.x, tabPos.legendary.y);
    this.legendaryTabBg = this.add
      .image(0, 0, TEXTURES.BUTTON_SECONDARY)
      .setOrigin(0)
      .setDisplaySize(tabPos.legendary.w, tabPos.legendary.h)
      .setInteractive()
      .setDepth(DEPTH.BUTTONS);
    this.legendaryTabLabel = this.addBitmapText(
      tabPos.legendary.w / 2,
      tabPos.legendary.h / 2,
      'Legendary',
      this.fontPx(12, ch),
    ).setOrigin(0.5);
    this.legendaryTabBtn.add([this.legendaryTabBg, this.legendaryTabLabel]);
    this.legendaryTabBtn.setDepth(DEPTH.BUTTONS);
    this.legendaryTabBg.on('pointerdown', () => this.switchTab('legendary'));
    this.addButtonPressFeedback(this.legendaryTabBg, this.legendaryTabLabel);

    this.updateTabHighlight(cw, ch);
  }

  private switchTab(tab: ShopTab): void {
    this.activeTab = tab;
    this.mobilePreviewAnimalId = null;
    this.hideShopTooltip();
    const { cw, ch } = this.getCanvasSize();
    this.updateTabHighlight(cw, ch);
    this.shopCards.forEach(({ container }) => container.destroy());
    this.shopCards = [];
    this.createShopGrid(cw, ch);
    this.applyLayout(cw, ch);
  }

  private updateTabHighlight(cw: number, ch: number): void {
    const tabPos = getTabButtonPositions(cw, ch);
    if (this.activeTab === 'animals') {
      this.animalsTabBg
        .setTexture(TEXTURES.BUTTON_PRIMARY)
        .setDisplaySize(tabPos.animals.w, tabPos.animals.h);
      this.legendaryTabBg
        .setTexture(TEXTURES.BUTTON_SECONDARY)
        .setDisplaySize(tabPos.legendary.w, tabPos.legendary.h);
    } else {
      this.animalsTabBg
        .setTexture(TEXTURES.BUTTON_SECONDARY)
        .setDisplaySize(tabPos.animals.w, tabPos.animals.h);
      this.legendaryTabBg
        .setTexture(TEXTURES.BUTTON_PRIMARY)
        .setDisplaySize(tabPos.legendary.w, tabPos.legendary.h);
    }
  }

  private createShopGrid(cw: number, ch: number): void {
    const session = gameStore.getState();

    const market =
      this.activeTab === 'animals'
        ? generateMarket(session.shopStock, session.mischief)
        : generateLegendaryMarket(session.shopStock, session.mischief);

    const positions = getShopGridPositions(market.length, cw, ch);

    this.shopCards = [];

    market.forEach((item, index) => {
      const pos = positions[index];
      const cardView = this.createShopCard(item, pos, ch);
      this.shopCards.push(cardView);
    });
  }

  private createShopCard(item: MarketItem, pos: Rect, ch: number): ShopCardView {
    const container = this.add.container(pos.x, pos.y);
    const animalDef = getAnimalDef(item.animalId);
    const ability = ABILITY_REGISTRY[animalDef.abilityKind];

    let bgTexture: string;
    if (animalDef.tier === 'legendary') {
      bgTexture = TEXTURES.CARD_LEGENDARY;
    } else if (item.noisy) {
      bgTexture = TEXTURES.CARD_NOISY;
    } else {
      bgTexture = TEXTURES.CARD_PARCHMENT;
    }

    const bg = this.add.image(0, 0, bgTexture).setOrigin(0);
    const sprite = this.add.image(0, 0, item.animalId).setOrigin(0.5);
    const nameText = this.addBitmapText(0, 0, item.name, this.fontPx(10, ch), TEXT_DARK_TINT)
      .setOrigin(0.5, 0)
      .setMaxWidth(Math.max(36, pos.w - 8));

    const costBadge = this.add.image(0, 0, TEXTURES.BADGE_MISCHIEF).setOrigin(0, 0.5);
    const costText = this.addBitmapText(
      0,
      0,
      String(item.costMischief),
      this.fontPx(10, ch),
      TEXT_DARK_TINT,
    ).setOrigin(0, 0.5);

    const mischiefLabel = this.addBitmapText(
      0,
      0,
      `+${item.mischief}M`,
      this.fontPx(9, ch),
      TEXT_DARK_TINT,
    ).setOrigin(1, 0.5);

    const hayLabel = this.addBitmapText(
      0,
      0,
      `+${item.hay}H`,
      this.fontPx(9, ch),
      TEXT_DARK_TINT,
    ).setOrigin(1, 0.5);

    const stockText = this.addBitmapText(
      0,
      0,
      `x${item.remainingStock}`,
      this.fontPx(9, ch),
      TEXT_DARK_TINT,
    ).setOrigin(0.5, 0.5);

    let abilityLabel: Phaser.GameObjects.BitmapText | null = null;
    if (ability.kind !== 'none' && ability.label) {
      abilityLabel = this.addBitmapText(
        0,
        0,
        ability.label,
        this.fontPx(8, ch),
        ability.trigger === 'on_enter' || ability.trigger === 'manual'
          ? 0x4d8fbf
          : ability.trigger === 'passive'
            ? 0x6aad7e
            : 0xc4982a,
      ).setOrigin(0.5, 0);
    }

    let star: Phaser.GameObjects.Image | null = null;
    if (animalDef.tier === 'legendary') {
      star = this.add.image(0, 0, TEXTURES.BADGE_STAR).setOrigin(0.5, 0);
    }

    const children: Phaser.GameObjects.GameObject[] = [
      bg,
      sprite,
      nameText,
      costBadge,
      costText,
      mischiefLabel,
      hayLabel,
      stockText,
    ];

    if (abilityLabel) {
      children.push(abilityLabel);
    }
    if (star) {
      children.push(star);
    }

    container.add(children);
    container.setDepth(DEPTH.CARDS);

    const cardView: ShopCardView = {
      container,
      item,
      bg,
      sprite,
      nameText,
      costBadge,
      costText,
      mischiefLabel,
      hayLabel,
      stockText,
      abilityLabel,
      star,
    };

    this.layoutShopCard(cardView, pos);
    return cardView;
  }

  private layoutShopCard(cardView: ShopCardView, pos: Rect): void {
    const { ch } = this.getCanvasSize();

    cardView.container.setPosition(pos.x, pos.y);
    cardView.bg.setDisplaySize(pos.w, pos.h);

    const badgeSize = Math.max(16, Math.round((18 / 108) * pos.h));
    const spriteY = Math.round(pos.h * 0.3);
    const spriteScale = Math.max(1.4, Math.min(2.4, pos.h / 44));

    cardView.sprite.setPosition(pos.w / 2, spriteY).setScale(spriteScale);

    const nameY = Math.round(pos.h * 0.5);
    cardView.nameText
      .setPosition(pos.w / 2, nameY)
      .setFontSize(this.fontPx(10, ch))
      .setMaxWidth(Math.max(36, pos.w - 8));

    const costY = pos.h - 22;
    cardView.costBadge.setPosition(6, costY).setDisplaySize(badgeSize, badgeSize);
    cardView.costText.setPosition(6 + badgeSize + 4, costY).setFontSize(this.fontPx(10, ch));

    cardView.mischiefLabel
      .setVisible(true)
      .setText(`+${cardView.item.mischief}M`)
      .setPosition(pos.w - 8, pos.h - 34)
      .setFontSize(this.fontPx(9, ch));
    cardView.hayLabel
      .setVisible(true)
      .setText(`+${cardView.item.hay}H`)
      .setPosition(pos.w - 8, pos.h - 20)
      .setFontSize(this.fontPx(9, ch));
    cardView.stockText
      .setPosition(pos.w / 2, pos.h - 8)
      .setOrigin(0.5, 0.5)
      .setFontSize(this.fontPx(9, ch));
    if (cardView.abilityLabel) {
      cardView.abilityLabel
        .setVisible(true)
        .setPosition(pos.w / 2, Math.round(pos.h * 0.7))
        .setFontSize(this.fontPx(8, ch));
    }

    if (cardView.star) {
      const starSize = Math.max(12, Math.round((14 / 108) * pos.h));
      cardView.star.setPosition(pos.w - 12, 4).setDisplaySize(starSize, starSize);
    }

    this.refreshShopCardInteractivity(cardView, pos);
  }

  private refreshShopCardInteractivity(cardView: ShopCardView, pos: Rect): void {
    cardView.bg.removeInteractive();
    cardView.bg.removeAllListeners();
    cardView.bg.setData('shop-card-hit-area', true);

    cardView.container.setAlpha(cardView.item.affordable ? 1.0 : 0.4);
    cardView.bg.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, pos.w, pos.h),
      Phaser.Geom.Rectangle.Contains,
    );

    cardView.bg.on('pointerover', (pointer: Phaser.Input.Pointer) => {
      if (this.isTouchPointer(pointer)) {
        return;
      }
      this.scheduleDesktopTooltip(cardView);
    });

    cardView.bg.on('pointerout', () => {
      this.clearTooltipDelay();
      if (this.tooltipAnimalId === cardView.item.animalId) {
        this.hideShopTooltip();
      }
    });

    cardView.bg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isTouchPointer(pointer)) {
        this.handleMobileCardTap(cardView);
        return;
      }

      this.mobilePreviewAnimalId = null;
      this.clearTooltipDelay();
      this.hideShopTooltip();
      if (cardView.item.affordable) {
        this.onPurchase(cardView.item.animalId, cardView.container);
      }
    });
  }

  private onPurchase(animalId: ShopAnimalId, container: Phaser.GameObjects.Container): void {
    this.mobilePreviewAnimalId = null;
    this.hideShopTooltip();
    const session = gameStore.getState();
    const result = purchaseAnimalInSession(session, animalId);
    gameStore.setState(result.session);

    this.tweens.add({
      targets: container,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: ANIMATION.PURCHASE_FEEDBACK_MS / 2,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.refreshDisplay();
      },
    });
  }

  private createCapacityUpgrade(cw: number, ch: number): void {
    const pos = getCapacityUpgradePosition(cw, ch);
    this.capacityButton = this.add.container(pos.x, pos.y).setDepth(DEPTH.BUTTONS);

    this.capacityBtnBg = this.add
      .image(0, 0, TEXTURES.BUTTON_SECONDARY)
      .setOrigin(0)
      .setDisplaySize(pos.w, pos.h);

    this.capacityBtnText = this.addBitmapText(
      pos.w / 2,
      pos.h / 2 - 3,
      '',
      this.fontPx(12, ch),
    ).setOrigin(0.5);

    this.capacityButton.add([this.capacityBtnBg, this.capacityBtnText]);
    this.refreshCapacityButton(cw, ch);
  }

  private refreshCapacityButton(cw: number, ch: number): void {
    const session = gameStore.getState();
    const pos = getCapacityUpgradePosition(cw, ch);
    const cost = getCapacityUpgradeCost(session.capacity);

    this.capacityButton.setPosition(pos.x, pos.y);
    this.capacityBtnBg.setDisplaySize(pos.w, pos.h);
    this.capacityBtnText.setPosition(pos.w / 2, pos.h / 2 - 3).setFontSize(this.fontPx(12, ch));

    this.capacityBtnBg.removeInteractive();
    this.capacityBtnBg.removeAllListeners();

    if (cost === null) {
      this.capacityBtnBg.setTexture(TEXTURES.BUTTON_DISABLED).setDisplaySize(pos.w, pos.h);
      this.capacityBtnText.setText('Max Capacity');
      this.capacityButton.setAlpha(0.6);
      return;
    }

    const canAfford = session.hay >= cost;
    const label = `Expand Barn (${session.capacity}\u2192${session.capacity + 1}): ${cost} Hay`;
    this.capacityBtnText.setText(label);

    if (canAfford) {
      this.capacityBtnBg.setTexture(TEXTURES.BUTTON_SECONDARY).setDisplaySize(pos.w, pos.h);
      this.capacityButton.setAlpha(1.0);
      this.capacityBtnBg.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, pos.w, pos.h),
        Phaser.Geom.Rectangle.Contains,
      );
      this.capacityBtnBg.on('pointerdown', this.onUpgradeCapacity, this);
      this.addButtonPressFeedback(this.capacityBtnBg, this.capacityBtnText);
    } else {
      this.capacityBtnBg.setTexture(TEXTURES.BUTTON_SECONDARY).setDisplaySize(pos.w, pos.h);
      this.capacityButton.setAlpha(0.4);
    }
  }

  private onUpgradeCapacity(): void {
    this.mobilePreviewAnimalId = null;
    this.hideShopTooltip();
    const session = gameStore.getState();
    const result = upgradeCapacityInSession(session);
    gameStore.setState(result.session);
    this.refreshDisplay();
  }

  private createStartNightButton(cw: number, ch: number): void {
    const pos = getStartNightButtonPosition(cw, ch);
    this.startNightButton = this.add.container(pos.x, pos.y).setDepth(DEPTH.BUTTONS);

    this.startNightBtnBg = this.add
      .image(0, 0, TEXTURES.BUTTON_PRIMARY)
      .setOrigin(0)
      .setDisplaySize(pos.w, pos.h);

    this.startNightBtnText = this.addBitmapText(
      pos.w / 2,
      pos.h / 2 - 3,
      'Start Next Night',
      this.fontPx(12, ch),
    ).setOrigin(0.5);

    this.startNightButton.add([this.startNightBtnBg, this.startNightBtnText]);

    this.startNightBtnBg.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, pos.w, pos.h),
      Phaser.Geom.Rectangle.Contains,
    );
    this.startNightBtnBg.on('pointerdown', this.onStartNight, this);
    this.addButtonPressFeedback(this.startNightBtnBg, this.startNightBtnText);
  }

  private onStartNight(): void {
    this.mobilePreviewAnimalId = null;
    this.hideShopTooltip();
    const session = gameStore.getState();
    const nextSession = startNextNight(session);
    gameStore.setState(nextSession);
    this.transitionToBarn();
  }

  private applyLayout(cw: number, ch: number): void {
    this.background.setPosition(0, 0).setSize(cw, ch);
    this.shelfShadow.setPosition(cw / 2, ch * 0.38).setSize(cw * 0.9, ch * 0.26);
    this.counterStrip.setPosition(cw / 2, ch * 0.76).setSize(cw, ch * 0.36);

    const session = gameStore.getState();
    this.titleText
      .setPosition(cw / 2, Math.round((80 / 844) * ch))
      .setFontSize(this.fontPx(14, ch));
    this.nightText
      .setPosition(cw / 2, Math.round((106 / 844) * ch))
      .setText(`Night ${session.nightNumber}`)
      .setFontSize(this.fontPx(12, ch));

    const currencyPos = getCurrencyHeaderPosition(cw, ch);
    const badgeSize = Math.max(20, Math.round((24 / 844) * ch));
    const hayIconOffset = Math.round((120 / 390) * cw);
    const hayTextOffset = Math.round((150 / 390) * cw);

    this.mischiefIcon
      .setPosition(currencyPos.x, currencyPos.y + currencyPos.h / 2)
      .setDisplaySize(badgeSize, badgeSize);
    this.mischiefText
      .setPosition(currencyPos.x + badgeSize + 6, currencyPos.y + currencyPos.h / 2)
      .setFontSize(this.fontPx(14, ch));

    this.hayIcon
      .setPosition(currencyPos.x + hayIconOffset, currencyPos.y + currencyPos.h / 2)
      .setDisplaySize(badgeSize, badgeSize);
    this.hayText
      .setPosition(currencyPos.x + hayTextOffset, currencyPos.y + currencyPos.h / 2)
      .setFontSize(this.fontPx(14, ch));

    const pennedPos = getPennedUpPosition(cw, ch);
    this.pennedUpContainer.setPosition(pennedPos.x, pennedPos.y);
    this.pennedUpIcon.setPosition(0, pennedPos.h / 2).setDisplaySize(20, 20);
    this.pennedUpLabel
      .setPosition(Math.round((26 / 40) * pennedPos.h), pennedPos.h / 2)
      .setFontSize(this.fontPx(10, ch));

    const tabPos = getTabButtonPositions(cw, ch);
    this.animalsTabBtn.setPosition(tabPos.animals.x, tabPos.animals.y);
    this.legendaryTabBtn.setPosition(tabPos.legendary.x, tabPos.legendary.y);
    this.animalsTabBg.setDisplaySize(tabPos.animals.w, tabPos.animals.h);
    this.legendaryTabBg.setDisplaySize(tabPos.legendary.w, tabPos.legendary.h);
    this.animalsTabLabel
      .setPosition(tabPos.animals.w / 2, tabPos.animals.h / 2)
      .setFontSize(this.fontPx(12, ch));
    this.legendaryTabLabel
      .setPosition(tabPos.legendary.w / 2, tabPos.legendary.h / 2)
      .setFontSize(this.fontPx(12, ch));
    this.updateTabHighlight(cw, ch);

    const cardPositions = getShopGridPositions(this.shopCards.length, cw, ch);
    this.shopCards.forEach((card, index) => {
      const pos = cardPositions[index];
      if (pos) {
        this.layoutShopCard(card, pos);
      }
    });

    this.refreshCapacityButton(cw, ch);

    const startNightPos = getStartNightButtonPosition(cw, ch);
    this.startNightButton.setPosition(startNightPos.x, startNightPos.y);
    this.startNightBtnBg.setDisplaySize(startNightPos.w, startNightPos.h);
    this.startNightBtnText
      .setPosition(startNightPos.w / 2, startNightPos.h / 2 - 3)
      .setFontSize(this.fontPx(12, ch));
    this.startNightBtnBg.setData('baseY', 0);
    this.startNightBtnText.setData('baseY', startNightPos.h / 2 - 3);

    this.startNightBtnBg.removeInteractive();
    this.startNightBtnBg.removeAllListeners();
    this.startNightBtnBg.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, startNightPos.w, startNightPos.h),
      Phaser.Geom.Rectangle.Contains,
    );
    this.startNightBtnBg.on('pointerdown', this.onStartNight, this);
    this.addButtonPressFeedback(this.startNightBtnBg, this.startNightBtnText);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const cw = Math.round(gameSize.width);
    const ch = Math.round(gameSize.height);
    this.hideShopTooltip();
    this.mobilePreviewAnimalId = null;
    this.applyLayout(cw, ch);
  }

  private shutdown(): void {
    this.input.off('pointerdown', this.handleGlobalPointerDown, this);
    this.scale.off('resize', this.handleResize, this);
    this.clearTooltipDelay();
    this.abilityTooltip?.destroy();
    this.abilityTooltip = null;
    this.mobilePreviewAnimalId = null;
    this.tooltipAnimalId = null;
  }

  private refreshDisplay(): void {
    const session = gameStore.getState();
    this.mobilePreviewAnimalId = null;
    this.hideShopTooltip();

    this.mischiefText.setText(String(session.mischief));
    this.hayText.setText(String(session.hay));

    this.refreshPennedUp();

    this.shopCards.forEach(({ container }) => container.destroy());
    this.shopCards = [];

    const { cw, ch } = this.getCanvasSize();
    this.createShopGrid(cw, ch);
    this.refreshCapacityButton(cw, ch);
    this.applyLayout(cw, ch);

    this.setDomAttributes();
  }

  private setDomAttributes(): void {
    const session = gameStore.getState();
    const container = document.getElementById('game-container');
    if (container) {
      container.setAttribute('data-scene', 'TradingPost');
      container.setAttribute('data-phase', 'shop');
      container.setAttribute('data-capacity', String(session.capacity));
    }
  }
}
