import Phaser from 'phaser';
import { ANIMATION, PALETTE, TEXTURES } from '../config/constants';
import * as gameStore from '../game/gameStore';
import { getAnimalDef } from '../game/animals';
import {
  purchaseAnimalInSession,
  upgradeCapacityInSession,
  startNextNight,
  getCapacityUpgradeCost,
} from '../game/session';
import { generateMarket } from '../game/shop';
import { SceneKey } from '../types';
import type { MarketItem, ShopAnimalId } from '../game/types';
import {
  getShopGridPositions,
  getCapacityUpgradePosition,
  getStartNightButtonPosition,
  getCurrencyHeaderPosition,
  getPennedUpPosition,
} from './tradingPostLayout';

const TEXT_STYLE_BASE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  color: PALETTE.TEXT_LIGHT,
};

interface ShopCardView {
  container: Phaser.GameObjects.Container;
  item: MarketItem;
}

export class TradingPostScene extends Phaser.Scene {
  private shopCards: ShopCardView[] = [];
  private mischiefText!: Phaser.GameObjects.Text;
  private hayText!: Phaser.GameObjects.Text;
  private pennedUpContainer!: Phaser.GameObjects.Container;
  private capacityButton!: Phaser.GameObjects.Container;
  private capacityBtnBg!: Phaser.GameObjects.Image;
  private capacityBtnText!: Phaser.GameObjects.Text;

  constructor() {
    super(SceneKey.TradingPost);
  }

  create(): void {
    // Background
    this.add.rectangle(195, 422, 390, 844, PALETTE.SHOP_BG).setOrigin(0.5);

    this.createHeader();
    this.createCurrencyDisplay();
    this.createPennedUpDisplay();
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

    // Mischief badge + value
    this.add.image(pos.x, pos.y + pos.h / 2, TEXTURES.BADGE_MISCHIEF).setOrigin(0, 0.5);
    this.mischiefText = this.add
      .text(pos.x + 30, pos.y + pos.h / 2, String(session.mischief), {
        ...TEXT_STYLE_BASE,
        fontSize: '18px',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    // Hay badge + value
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

    if (!session.activePennedUpCardId) {
      return;
    }

    const card = session.herd.find((c) => c.id === session.activePennedUpCardId);
    if (!card) {
      return;
    }

    const def = getAnimalDef(card.animalId);
    const pos = getPennedUpPosition();

    const lockIcon = this.add.image(0, pos.h / 2, TEXTURES.LOCK_ICON).setOrigin(0, 0.5);
    const label = this.add
      .text(26, pos.h / 2, `Penned: ${def.name}`, {
        ...TEXT_STYLE_BASE,
        fontSize: '13px',
      })
      .setOrigin(0, 0.5);

    this.pennedUpContainer.add([lockIcon, label]);
  }

  private createShopGrid(): void {
    const session = gameStore.getState();
    const market = generateMarket(session.shopStock, session.mischief);
    const positions = getShopGridPositions(market.length);

    this.shopCards = [];

    market.forEach((item, index) => {
      const pos = positions[index];
      const container = this.add.container(pos.x, pos.y);

      // Card background
      const cardBg = this.add
        .image(0, 0, item.noisy ? TEXTURES.CARD_NOISY : TEXTURES.CARD_PARCHMENT)
        .setOrigin(0)
        .setDisplaySize(pos.w, pos.h);

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

      // Resource values: mischief earned, hay earned
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

      container.add([
        cardBg,
        sprite,
        nameText,
        costBadge,
        costText,
        mischiefLabel,
        hayLabel,
        stockText,
      ]);

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

    // Purchase feedback tween
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

    // Remove old interactivity
    this.capacityBtnBg.removeInteractive();
    this.capacityBtnBg.removeAllListeners();

    if (cost === null) {
      // Max capacity reached
      this.capacityBtnBg.setTexture(TEXTURES.BUTTON_DISABLED).setDisplaySize(pos.w, pos.h);
      this.capacityBtnText.setText('Max Capacity');
      this.capacityButton.setAlpha(0.6);
      return;
    }

    const canAfford = session.hay >= cost;
    const label = `Expand Barn (${session.capacity}→${session.capacity + 1}): ${cost} Hay`;
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

    // Update currency
    this.mischiefText.setText(String(session.mischief));
    this.hayText.setText(String(session.hay));

    // Refresh penned up
    this.refreshPennedUp();

    // Rebuild shop grid
    this.shopCards.forEach(({ container }) => container.destroy());
    this.shopCards = [];
    this.createShopGrid();

    // Refresh capacity button
    this.refreshCapacityButton();

    // Update DOM attributes
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
