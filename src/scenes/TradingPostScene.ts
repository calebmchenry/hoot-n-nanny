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
import {
  getShopGridPositions,
  getCapacityUpgradePosition,
  getStartNightButtonPosition,
  getCurrencyHeaderPosition,
  getPennedUpPosition,
  getTabButtonPositions,
} from './tradingPostLayout';

const TEXT_STYLE_BASE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  color: PALETTE.TEXT_LIGHT,
};

interface ShopCardView {
  container: Phaser.GameObjects.Container;
  item: MarketItem;
}

type ShopTab = 'animals' | 'legendary';

export class TradingPostScene extends Phaser.Scene {
  private shopCards: ShopCardView[] = [];
  private mischiefText!: Phaser.GameObjects.Text;
  private hayText!: Phaser.GameObjects.Text;
  private pennedUpContainer!: Phaser.GameObjects.Container;
  private capacityButton!: Phaser.GameObjects.Container;
  private capacityBtnBg!: Phaser.GameObjects.Image;
  private capacityBtnText!: Phaser.GameObjects.Text;
  private activeTab: ShopTab = 'animals';
  private animalsTabBtn!: Phaser.GameObjects.Container;
  private legendaryTabBtn!: Phaser.GameObjects.Container;
  private animalsTabBg!: Phaser.GameObjects.Image;
  private legendaryTabBg!: Phaser.GameObjects.Image;

  constructor() {
    super(SceneKey.TradingPost);
  }

  create(): void {
    this.activeTab = 'animals';

    // Background
    this.add.rectangle(195, 422, 390, 844, PALETTE.SHOP_BG).setOrigin(0.5);

    this.createHeader();
    this.createCurrencyDisplay();
    this.createPennedUpDisplay();
    this.createTabs();
    this.createShopGrid();
    this.createCapacityUpgrade();
    this.createStartNightButton();
    this.setDomAttributes();
  }

  private createHeader(): void {
    const session = gameStore.getState();

    this.add
      .text(195, 80, 'Trading Post', {
        ...TEXT_STYLE_BASE,
        fontSize: '22px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(195, 106, `Night ${session.nightNumber}`, {
        ...TEXT_STYLE_BASE,
        fontSize: '14px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
  }

  private createCurrencyDisplay(): void {
    const session = gameStore.getState();
    const pos = getCurrencyHeaderPosition();

    this.add.image(pos.x, pos.y + pos.h / 2, TEXTURES.BADGE_MISCHIEF).setOrigin(0, 0.5);
    this.mischiefText = this.add
      .text(pos.x + 30, pos.y + pos.h / 2, String(session.mischief), {
        ...TEXT_STYLE_BASE,
        fontSize: '18px',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    this.add.image(pos.x + 120, pos.y + pos.h / 2, TEXTURES.BADGE_HAY).setOrigin(0, 0.5);
    this.hayText = this.add
      .text(pos.x + 150, pos.y + pos.h / 2, String(session.hay), {
        ...TEXT_STYLE_BASE,
        fontSize: '18px',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
  }

  private createPennedUpDisplay(): void {
    const pos = getPennedUpPosition();
    this.pennedUpContainer = this.add.container(pos.x, pos.y);
    this.refreshPennedUp();
  }

  private refreshPennedUp(): void {
    this.pennedUpContainer.removeAll(true);
    const session = gameStore.getState();

    // Array-based penned-up display
    const pennedIds =
      session.activePennedUpCardIds.length > 0
        ? session.activePennedUpCardIds
        : session.activePennedUpCardId
          ? [session.activePennedUpCardId]
          : [];

    if (pennedIds.length === 0) return;

    const pos = getPennedUpPosition();
    const names = pennedIds
      .map((id) => {
        const card = session.herd.find((c) => c.id === id);
        return card ? getAnimalDef(card.animalId).name : '';
      })
      .filter(Boolean);

    if (names.length === 0) return;

    const lockIcon = this.add.image(0, pos.h / 2, TEXTURES.LOCK_ICON).setOrigin(0, 0.5);
    const label = this.add
      .text(26, pos.h / 2, `Penned: ${names.join(', ')}`, {
        ...TEXT_STYLE_BASE,
        fontSize: '13px',
      })
      .setOrigin(0, 0.5);

    this.pennedUpContainer.add([lockIcon, label]);
  }

  private createTabs(): void {
    const tabPos = getTabButtonPositions();

    // Animals tab
    this.animalsTabBtn = this.add.container(tabPos.animals.x, tabPos.animals.y);
    this.animalsTabBg = this.add
      .image(0, 0, TEXTURES.BUTTON_PRIMARY)
      .setOrigin(0)
      .setDisplaySize(tabPos.animals.w, tabPos.animals.h)
      .setInteractive();
    const animalsLabel = this.add
      .text(tabPos.animals.w / 2, tabPos.animals.h / 2, 'Animals', {
        ...TEXT_STYLE_BASE,
        fontSize: '14px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.animalsTabBtn.add([this.animalsTabBg, animalsLabel]);
    this.animalsTabBg.on('pointerdown', () => this.switchTab('animals'));

    // Legendary tab
    this.legendaryTabBtn = this.add.container(tabPos.legendary.x, tabPos.legendary.y);
    this.legendaryTabBg = this.add
      .image(0, 0, TEXTURES.BUTTON_SECONDARY)
      .setOrigin(0)
      .setDisplaySize(tabPos.legendary.w, tabPos.legendary.h)
      .setInteractive();
    const legendaryLabel = this.add
      .text(tabPos.legendary.w / 2, tabPos.legendary.h / 2, 'Legendary', {
        ...TEXT_STYLE_BASE,
        fontSize: '14px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.legendaryTabBtn.add([this.legendaryTabBg, legendaryLabel]);
    this.legendaryTabBg.on('pointerdown', () => this.switchTab('legendary'));

    this.updateTabHighlight();
  }

  private switchTab(tab: ShopTab): void {
    this.activeTab = tab;
    this.updateTabHighlight();
    this.shopCards.forEach(({ container }) => container.destroy());
    this.shopCards = [];
    this.createShopGrid();
  }

  private updateTabHighlight(): void {
    const tabPos = getTabButtonPositions();
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

  private createShopGrid(): void {
    const session = gameStore.getState();

    const market =
      this.activeTab === 'animals'
        ? generateMarket(session.shopStock, session.mischief)
        : generateLegendaryMarket(session.shopStock, session.mischief);

    const positions = getShopGridPositions(market.length);

    this.shopCards = [];

    market.forEach((item, index) => {
      const pos = positions[index];
      const container = this.add.container(pos.x, pos.y);
      const animalDef = getAnimalDef(item.animalId);
      const ability = ABILITY_REGISTRY[animalDef.abilityKind];

      // Card background
      let bgTexture: string;
      if (animalDef.tier === 'legendary') {
        bgTexture = TEXTURES.CARD_LEGENDARY;
      } else if (item.noisy) {
        bgTexture = TEXTURES.CARD_NOISY;
      } else {
        bgTexture = TEXTURES.CARD_PARCHMENT;
      }

      const cardBg = this.add.image(0, 0, bgTexture).setOrigin(0).setDisplaySize(pos.w, pos.h);

      // Animal sprite
      const sprite = this.add
        .image(pos.w / 2, 30, 'animals', item.animalId)
        .setOrigin(0.5)
        .setScale(2);

      // Animal name
      const nameText = this.add
        .text(pos.w / 2, 58, item.name, {
          fontFamily: 'monospace',
          fontSize: '11px',
          fontStyle: 'bold',
          color: PALETTE.TEXT_DARK,
        })
        .setOrigin(0.5, 0);

      // Cost: mischief badge + number
      const costBadge = this.add
        .image(8, pos.h - 22, TEXTURES.BADGE_MISCHIEF)
        .setOrigin(0, 0.5)
        .setScale(0.75);
      const costText = this.add
        .text(28, pos.h - 22, String(item.costMischief), {
          fontFamily: 'monospace',
          fontSize: '11px',
          fontStyle: 'bold',
          color: PALETTE.TEXT_DARK,
        })
        .setOrigin(0, 0.5);

      // Resource values
      const mischiefLabel = this.add
        .text(pos.w - 8, pos.h - 34, `+${item.mischief}M`, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: PALETTE.TEXT_DARK,
        })
        .setOrigin(1, 0.5);

      const hayLabel = this.add
        .text(pos.w - 8, pos.h - 20, `+${item.hay}H`, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: PALETTE.TEXT_DARK,
        })
        .setOrigin(1, 0.5);

      // Stock remaining
      const stockText = this.add
        .text(pos.w / 2, pos.h - 8, `x${item.remainingStock}`, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: PALETTE.TEXT_DARK,
        })
        .setOrigin(0.5, 0.5);

      const children: Phaser.GameObjects.GameObject[] = [
        cardBg,
        sprite,
        nameText,
        costBadge,
        costText,
        mischiefLabel,
        hayLabel,
        stockText,
      ];

      // Ability keyword chip on shop cards
      if (ability.kind !== 'none' && ability.label) {
        const abilityLabel = this.add
          .text(pos.w / 2, 76, ability.label, {
            fontFamily: 'monospace',
            fontSize: '9px',
            fontStyle: 'bold',
            color:
              ability.trigger === 'on_enter' || ability.trigger === 'manual'
                ? '#4d8fbf'
                : ability.trigger === 'passive'
                  ? '#6aad7e'
                  : '#c4982a',
          })
          .setOrigin(0.5, 0);
        children.push(abilityLabel);
      }

      // Legendary star icon
      if (animalDef.tier === 'legendary') {
        const star = this.add.image(pos.w - 14, 6, TEXTURES.BADGE_STAR).setOrigin(0.5, 0);
        children.push(star);
      }

      container.add(children);

      // Affordability / interactivity
      if (item.affordable) {
        container.setAlpha(1.0);
        cardBg.setInteractive(
          new Phaser.Geom.Rectangle(0, 0, pos.w, pos.h),
          Phaser.Geom.Rectangle.Contains,
        );
        cardBg.on('pointerdown', () => this.onPurchase(item.animalId, container), this);
      } else {
        container.setAlpha(0.4);
      }

      this.shopCards.push({ container, item });
    });
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

  private createCapacityUpgrade(): void {
    const pos = getCapacityUpgradePosition();
    this.capacityButton = this.add.container(pos.x, pos.y);

    this.capacityBtnBg = this.add
      .image(0, 0, TEXTURES.BUTTON_SECONDARY)
      .setOrigin(0)
      .setDisplaySize(pos.w, pos.h);

    this.capacityBtnText = this.add
      .text(pos.w / 2, pos.h / 2 - 3, '', {
        ...TEXT_STYLE_BASE,
        fontSize: '14px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.capacityButton.add([this.capacityBtnBg, this.capacityBtnText]);
    this.refreshCapacityButton();
  }

  private refreshCapacityButton(): void {
    const session = gameStore.getState();
    const pos = getCapacityUpgradePosition();
    const cost = getCapacityUpgradeCost(session.capacity);

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

  private createStartNightButton(): void {
    const pos = getStartNightButtonPosition();
    const container = this.add.container(pos.x, pos.y);

    const bg = this.add
      .image(0, 0, TEXTURES.BUTTON_PRIMARY)
      .setOrigin(0)
      .setDisplaySize(pos.w, pos.h);

    const label = this.add
      .text(pos.w / 2, pos.h / 2 - 3, 'Start Next Night', {
        ...TEXT_STYLE_BASE,
        fontSize: '16px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    container.add([bg, label]);

    bg.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, pos.w, pos.h),
      Phaser.Geom.Rectangle.Contains,
    );
    bg.on('pointerdown', this.onStartNight, this);
  }

  private onStartNight(): void {
    const session = gameStore.getState();
    const nextSession = startNextNight(session);
    gameStore.setState(nextSession);
    this.scene.start(SceneKey.Barn);
  }

  private refreshDisplay(): void {
    const session = gameStore.getState();

    this.mischiefText.setText(String(session.mischief));
    this.hayText.setText(String(session.hay));

    this.refreshPennedUp();

    this.shopCards.forEach(({ container }) => container.destroy());
    this.shopCards = [];
    this.createShopGrid();

    this.refreshCapacityButton();

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
