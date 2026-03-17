import Phaser from 'phaser';
import { ANIMATION, PALETTE, TEXTURES } from '../config/constants';
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

const TEXT_STYLE_BASE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  color: PALETTE.TEXT_LIGHT,
};

interface ShopCardView {
  container: Phaser.GameObjects.Container;
  item: MarketItem;
  bg: Phaser.GameObjects.Image;
  sprite: Phaser.GameObjects.Image;
  nameText: Phaser.GameObjects.Text;
  costBadge: Phaser.GameObjects.Image;
  costText: Phaser.GameObjects.Text;
  mischiefLabel: Phaser.GameObjects.Text;
  hayLabel: Phaser.GameObjects.Text;
  stockText: Phaser.GameObjects.Text;
  abilityLabel: Phaser.GameObjects.Text | null;
  star: Phaser.GameObjects.Image | null;
}

type ShopTab = 'animals' | 'legendary';

export class TradingPostScene extends Phaser.Scene {
  private shopCards: ShopCardView[] = [];
  private background!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private nightText!: Phaser.GameObjects.Text;
  private mischiefIcon!: Phaser.GameObjects.Image;
  private hayIcon!: Phaser.GameObjects.Image;
  private mischiefText!: Phaser.GameObjects.Text;
  private hayText!: Phaser.GameObjects.Text;
  private pennedUpContainer!: Phaser.GameObjects.Container;
  private pennedUpIcon!: Phaser.GameObjects.Image;
  private pennedUpLabel!: Phaser.GameObjects.Text;
  private capacityButton!: Phaser.GameObjects.Container;
  private capacityBtnBg!: Phaser.GameObjects.Image;
  private capacityBtnText!: Phaser.GameObjects.Text;
  private startNightButton!: Phaser.GameObjects.Container;
  private startNightBtnBg!: Phaser.GameObjects.Image;
  private startNightBtnText!: Phaser.GameObjects.Text;
  private activeTab: ShopTab = 'animals';
  private animalsTabBtn!: Phaser.GameObjects.Container;
  private legendaryTabBtn!: Phaser.GameObjects.Container;
  private animalsTabBg!: Phaser.GameObjects.Image;
  private legendaryTabBg!: Phaser.GameObjects.Image;
  private animalsTabLabel!: Phaser.GameObjects.Text;
  private legendaryTabLabel!: Phaser.GameObjects.Text;

  constructor() {
    super(SceneKey.TradingPost);
  }

  private getCanvasSize(): { cw: number; ch: number } {
    return {
      cw: Math.round(this.scale.width),
      ch: Math.round(this.scale.height),
    };
  }

  private fontPx(base: number, ch: number): string {
    return `${scaledShopFont(base, ch)}px`;
  }

  create(): void {
    this.activeTab = 'animals';
    const { cw, ch } = this.getCanvasSize();

    this.background = this.add.rectangle(cw / 2, ch / 2, cw, ch, PALETTE.SHOP_BG).setOrigin(0.5);

    this.createHeader(cw, ch);
    this.createCurrencyDisplay(cw, ch);
    this.createPennedUpDisplay(cw, ch);
    this.createTabs(cw, ch);
    this.createShopGrid(cw, ch);
    this.createCapacityUpgrade(cw, ch);
    this.createStartNightButton(cw, ch);
    this.setDomAttributes();

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.applyLayout(cw, ch);
  }

  private createHeader(cw: number, ch: number): void {
    const session = gameStore.getState();

    this.titleText = this.add
      .text(cw / 2, Math.round((80 / 844) * ch), 'Trading Post', {
        ...TEXT_STYLE_BASE,
        fontSize: this.fontPx(22, ch),
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.nightText = this.add
      .text(cw / 2, Math.round((106 / 844) * ch), `Night ${session.nightNumber}`, {
        ...TEXT_STYLE_BASE,
        fontSize: this.fontPx(14, ch),
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
  }

  private createCurrencyDisplay(cw: number, ch: number): void {
    const session = gameStore.getState();
    const pos = getCurrencyHeaderPosition(cw, ch);

    this.mischiefIcon = this.add
      .image(pos.x, pos.y + pos.h / 2, TEXTURES.BADGE_MISCHIEF)
      .setOrigin(0, 0.5);
    this.mischiefText = this.add
      .text(pos.x + 30, pos.y + pos.h / 2, String(session.mischief), {
        ...TEXT_STYLE_BASE,
        fontSize: this.fontPx(18, ch),
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    this.hayIcon = this.add
      .image(pos.x + 120, pos.y + pos.h / 2, TEXTURES.BADGE_HAY)
      .setOrigin(0, 0.5);
    this.hayText = this.add
      .text(pos.x + 150, pos.y + pos.h / 2, String(session.hay), {
        ...TEXT_STYLE_BASE,
        fontSize: this.fontPx(18, ch),
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
  }

  private createPennedUpDisplay(cw: number, ch: number): void {
    const pos = getPennedUpPosition(cw, ch);
    this.pennedUpContainer = this.add.container(pos.x, pos.y);

    this.pennedUpIcon = this.add.image(0, pos.h / 2, TEXTURES.LOCK_ICON).setOrigin(0, 0.5);
    this.pennedUpLabel = this.add
      .text(26, pos.h / 2, '', {
        ...TEXT_STYLE_BASE,
        fontSize: this.fontPx(13, ch),
      })
      .setOrigin(0, 0.5);

    this.pennedUpContainer.add([this.pennedUpIcon, this.pennedUpLabel]);
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
      .setInteractive();
    this.animalsTabLabel = this.add
      .text(tabPos.animals.w / 2, tabPos.animals.h / 2, 'Animals', {
        ...TEXT_STYLE_BASE,
        fontSize: this.fontPx(14, ch),
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.animalsTabBtn.add([this.animalsTabBg, this.animalsTabLabel]);
    this.animalsTabBg.on('pointerdown', () => this.switchTab('animals'));

    this.legendaryTabBtn = this.add.container(tabPos.legendary.x, tabPos.legendary.y);
    this.legendaryTabBg = this.add
      .image(0, 0, TEXTURES.BUTTON_SECONDARY)
      .setOrigin(0)
      .setDisplaySize(tabPos.legendary.w, tabPos.legendary.h)
      .setInteractive();
    this.legendaryTabLabel = this.add
      .text(tabPos.legendary.w / 2, tabPos.legendary.h / 2, 'Legendary', {
        ...TEXT_STYLE_BASE,
        fontSize: this.fontPx(14, ch),
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.legendaryTabBtn.add([this.legendaryTabBg, this.legendaryTabLabel]);
    this.legendaryTabBg.on('pointerdown', () => this.switchTab('legendary'));

    this.updateTabHighlight(cw, ch);
  }

  private switchTab(tab: ShopTab): void {
    this.activeTab = tab;
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
    const sprite = this.add.image(0, 0, 'animals', item.animalId).setOrigin(0.5);
    const nameText = this.add
      .text(0, 0, item.name, {
        fontFamily: 'monospace',
        fontSize: this.fontPx(11, ch),
        fontStyle: 'bold',
        color: PALETTE.TEXT_DARK,
        wordWrap: { width: Math.max(36, pos.w - 8) },
      })
      .setOrigin(0.5, 0);

    const costBadge = this.add.image(0, 0, TEXTURES.BADGE_MISCHIEF).setOrigin(0, 0.5);
    const costText = this.add
      .text(0, 0, String(item.costMischief), {
        fontFamily: 'monospace',
        fontSize: this.fontPx(11, ch),
        fontStyle: 'bold',
        color: PALETTE.TEXT_DARK,
      })
      .setOrigin(0, 0.5);

    const mischiefLabel = this.add
      .text(0, 0, `+${item.mischief}M`, {
        fontFamily: 'monospace',
        fontSize: this.fontPx(10, ch),
        color: PALETTE.TEXT_DARK,
      })
      .setOrigin(1, 0.5);

    const hayLabel = this.add
      .text(0, 0, `+${item.hay}H`, {
        fontFamily: 'monospace',
        fontSize: this.fontPx(10, ch),
        color: PALETTE.TEXT_DARK,
      })
      .setOrigin(1, 0.5);

    const stockText = this.add
      .text(0, 0, `x${item.remainingStock}`, {
        fontFamily: 'monospace',
        fontSize: this.fontPx(10, ch),
        color: PALETTE.TEXT_DARK,
      })
      .setOrigin(0.5, 0.5);

    let abilityLabel: Phaser.GameObjects.Text | null = null;
    if (ability.kind !== 'none' && ability.label) {
      abilityLabel = this.add
        .text(0, 0, ability.label, {
          fontFamily: 'monospace',
          fontSize: this.fontPx(9, ch),
          fontStyle: 'bold',
          color:
            ability.trigger === 'on_enter' || ability.trigger === 'manual'
              ? '#4d8fbf'
              : ability.trigger === 'passive'
                ? '#6aad7e'
                : '#c4982a',
        })
        .setOrigin(0.5, 0);
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
    const compact = pos.h < 72;

    cardView.container.setPosition(pos.x, pos.y);
    cardView.bg.setDisplaySize(pos.w, pos.h);

    const badgeSize = compact ? 14 : 18;
    const spriteY = compact ? Math.round(pos.h * 0.34) : Math.round(pos.h * 0.28);
    const spriteScale = compact
      ? Math.max(1.0, Math.min(1.6, pos.h / 30))
      : Math.max(1.4, Math.min(2.2, pos.h / 42));

    cardView.sprite.setPosition(pos.w / 2, spriteY).setScale(spriteScale);

    const nameY = compact ? Math.round(pos.h * 0.48) : Math.round(pos.h * 0.5);
    cardView.nameText.setPosition(pos.w / 2, nameY).setStyle({
      fontSize: this.fontPx(compact ? 10 : 11, ch),
      wordWrap: { width: Math.max(36, pos.w - 8) },
    });

    const costY = pos.h - (compact ? 10 : 22);
    cardView.costBadge.setPosition(6, costY).setDisplaySize(badgeSize, badgeSize);
    cardView.costText
      .setPosition(6 + badgeSize + 4, costY)
      .setStyle({ fontSize: this.fontPx(compact ? 9 : 11, ch) });

    if (compact) {
      cardView.mischiefLabel
        .setText(`M${cardView.item.mischief}/H${cardView.item.hay}`)
        .setPosition(pos.w - 6, 8)
        .setStyle({ fontSize: this.fontPx(9, ch) });
      cardView.hayLabel.setVisible(false);
      cardView.stockText
        .setPosition(pos.w - 22, pos.h - 9)
        .setOrigin(1, 0.5)
        .setStyle({ fontSize: this.fontPx(9, ch) });
      if (cardView.abilityLabel) {
        cardView.abilityLabel.setVisible(false);
      }
    } else {
      cardView.mischiefLabel
        .setVisible(true)
        .setText(`+${cardView.item.mischief}M`)
        .setPosition(pos.w - 8, pos.h - 34)
        .setStyle({ fontSize: this.fontPx(10, ch) });
      cardView.hayLabel
        .setVisible(true)
        .setText(`+${cardView.item.hay}H`)
        .setPosition(pos.w - 8, pos.h - 20)
        .setStyle({ fontSize: this.fontPx(10, ch) });
      cardView.stockText
        .setPosition(pos.w / 2, pos.h - 8)
        .setOrigin(0.5, 0.5)
        .setStyle({ fontSize: this.fontPx(10, ch) });
      if (cardView.abilityLabel) {
        cardView.abilityLabel
          .setVisible(true)
          .setPosition(pos.w / 2, Math.round(pos.h * 0.7))
          .setStyle({ fontSize: this.fontPx(9, ch) });
      }
    }

    if (cardView.star) {
      const starSize = compact ? 10 : 14;
      cardView.star.setPosition(pos.w - 12, 4).setDisplaySize(starSize, starSize);
    }

    this.refreshShopCardInteractivity(cardView, pos);
  }

  private refreshShopCardInteractivity(cardView: ShopCardView, pos: Rect): void {
    cardView.bg.removeInteractive();
    cardView.bg.removeAllListeners();

    if (cardView.item.affordable) {
      cardView.container.setAlpha(1.0);
      cardView.bg.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, pos.w, pos.h),
        Phaser.Geom.Rectangle.Contains,
      );
      cardView.bg.on(
        'pointerdown',
        () => this.onPurchase(cardView.item.animalId, cardView.container),
        this,
      );
    } else {
      cardView.container.setAlpha(0.4);
    }
  }

  private onPurchase(animalId: ShopAnimalId, container: Phaser.GameObjects.Container): void {
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
    this.capacityButton = this.add.container(pos.x, pos.y);

    this.capacityBtnBg = this.add
      .image(0, 0, TEXTURES.BUTTON_SECONDARY)
      .setOrigin(0)
      .setDisplaySize(pos.w, pos.h);

    this.capacityBtnText = this.add
      .text(pos.w / 2, pos.h / 2 - 3, '', {
        ...TEXT_STYLE_BASE,
        fontSize: this.fontPx(14, ch),
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.capacityButton.add([this.capacityBtnBg, this.capacityBtnText]);
    this.refreshCapacityButton(cw, ch);
  }

  private refreshCapacityButton(cw: number, ch: number): void {
    const session = gameStore.getState();
    const pos = getCapacityUpgradePosition(cw, ch);
    const cost = getCapacityUpgradeCost(session.capacity);

    this.capacityButton.setPosition(pos.x, pos.y);
    this.capacityBtnBg.setDisplaySize(pos.w, pos.h);
    this.capacityBtnText
      .setPosition(pos.w / 2, pos.h / 2 - 3)
      .setStyle({ fontSize: this.fontPx(14, ch) });

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
    } else {
      this.capacityBtnBg.setTexture(TEXTURES.BUTTON_SECONDARY).setDisplaySize(pos.w, pos.h);
      this.capacityButton.setAlpha(0.4);
    }
  }

  private onUpgradeCapacity(): void {
    const session = gameStore.getState();
    const result = upgradeCapacityInSession(session);
    gameStore.setState(result.session);
    this.refreshDisplay();
  }

  private createStartNightButton(cw: number, ch: number): void {
    const pos = getStartNightButtonPosition(cw, ch);
    this.startNightButton = this.add.container(pos.x, pos.y);

    this.startNightBtnBg = this.add
      .image(0, 0, TEXTURES.BUTTON_PRIMARY)
      .setOrigin(0)
      .setDisplaySize(pos.w, pos.h);

    this.startNightBtnText = this.add
      .text(pos.w / 2, pos.h / 2 - 3, 'Start Next Night', {
        ...TEXT_STYLE_BASE,
        fontSize: this.fontPx(16, ch),
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.startNightButton.add([this.startNightBtnBg, this.startNightBtnText]);

    this.startNightBtnBg.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, pos.w, pos.h),
      Phaser.Geom.Rectangle.Contains,
    );
    this.startNightBtnBg.on('pointerdown', this.onStartNight, this);
  }

  private onStartNight(): void {
    const session = gameStore.getState();
    const nextSession = startNextNight(session);
    gameStore.setState(nextSession);
    this.scene.start(SceneKey.Barn);
  }

  private applyLayout(cw: number, ch: number): void {
    this.background.setPosition(cw / 2, ch / 2).setSize(cw, ch);

    const session = gameStore.getState();
    this.titleText
      .setPosition(cw / 2, Math.round((80 / 844) * ch))
      .setStyle({ fontSize: this.fontPx(22, ch) });
    this.nightText
      .setPosition(cw / 2, Math.round((106 / 844) * ch))
      .setText(`Night ${session.nightNumber}`)
      .setStyle({ fontSize: this.fontPx(14, ch) });

    const currencyPos = getCurrencyHeaderPosition(cw, ch);
    const badgeSize = Math.max(20, Math.round((24 / 844) * ch));
    const hayIconOffset = Math.round((120 / 390) * cw);
    const hayTextOffset = Math.round((150 / 390) * cw);

    this.mischiefIcon
      .setPosition(currencyPos.x, currencyPos.y + currencyPos.h / 2)
      .setDisplaySize(badgeSize, badgeSize);
    this.mischiefText
      .setPosition(currencyPos.x + badgeSize + 6, currencyPos.y + currencyPos.h / 2)
      .setStyle({ fontSize: this.fontPx(18, ch) });

    this.hayIcon
      .setPosition(currencyPos.x + hayIconOffset, currencyPos.y + currencyPos.h / 2)
      .setDisplaySize(badgeSize, badgeSize);
    this.hayText
      .setPosition(currencyPos.x + hayTextOffset, currencyPos.y + currencyPos.h / 2)
      .setStyle({ fontSize: this.fontPx(18, ch) });

    const pennedPos = getPennedUpPosition(cw, ch);
    this.pennedUpContainer.setPosition(pennedPos.x, pennedPos.y);
    this.pennedUpIcon.setPosition(0, pennedPos.h / 2).setDisplaySize(20, 20);
    this.pennedUpLabel
      .setPosition(Math.round((26 / 40) * pennedPos.h), pennedPos.h / 2)
      .setStyle({ fontSize: this.fontPx(13, ch) });

    const tabPos = getTabButtonPositions(cw, ch);
    this.animalsTabBtn.setPosition(tabPos.animals.x, tabPos.animals.y);
    this.legendaryTabBtn.setPosition(tabPos.legendary.x, tabPos.legendary.y);
    this.animalsTabBg.setDisplaySize(tabPos.animals.w, tabPos.animals.h);
    this.legendaryTabBg.setDisplaySize(tabPos.legendary.w, tabPos.legendary.h);
    this.animalsTabLabel
      .setPosition(tabPos.animals.w / 2, tabPos.animals.h / 2)
      .setStyle({ fontSize: this.fontPx(14, ch) });
    this.legendaryTabLabel
      .setPosition(tabPos.legendary.w / 2, tabPos.legendary.h / 2)
      .setStyle({ fontSize: this.fontPx(14, ch) });
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
      .setStyle({ fontSize: this.fontPx(16, ch) });

    this.startNightBtnBg.removeInteractive();
    this.startNightBtnBg.removeAllListeners();
    this.startNightBtnBg.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, startNightPos.w, startNightPos.h),
      Phaser.Geom.Rectangle.Contains,
    );
    this.startNightBtnBg.on('pointerdown', this.onStartNight, this);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const cw = Math.round(gameSize.width);
    const ch = Math.round(gameSize.height);
    this.applyLayout(cw, ch);
  }

  private shutdown(): void {
    this.scale.off('resize', this.handleResize, this);
  }

  private refreshDisplay(): void {
    const session = gameStore.getState();

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
