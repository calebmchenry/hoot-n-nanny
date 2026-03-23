export type GamePhase = 'night' | 'night-summary' | 'shop' | 'win';

export type AnimalPowerId =
  | 'none'
  | 'noisy'
  | 'stacks'
  | 'calm'
  | 'fetch'
  | 'kick'
  | 'peek'
  | 'flock'
  | 'sneak'
  | 'encore'
  | 'rowdy'
  | 'upkeep';

export type PowerType = 'passive' | 'immediate' | 'activate' | 'end-of-night' | 'none';

export type AnimalId =
  | 'goat'
  | 'bull'
  | 'goose'
  | 'chicken'
  | 'pig'
  | 'cow'
  | 'mouse'
  | 'owl'
  | 'barn-cat'
  | 'sheep'
  | 'swan'
  | 'bunny'
  | 'border-collie'
  | 'donkey'
  | 'chimera'
  | 'jackalope'
  | 'unicorn'
  | 'griffin'
  | 'dragon';

export interface CurrencyYield {
  pop: number;
  cash: number;
}

export interface AnimalDefinition {
  id: AnimalId;
  name: string;
  costPop: number;
  currencies: CurrencyYield;
  power: AnimalPowerId;
  powerType: PowerType;
  blueRibbon: boolean;
  description: string;
}

export interface OwnedAnimal {
  instanceId: string;
  animalId: AnimalId;
  encorePop: number;
}

export type NightOutcome = 'bust-to-shop' | 'score-to-shop' | 'score-to-win';

export type TargetingKind = 'fetch' | 'kick' | 'pin';

export interface TargetingState {
  kind: TargetingKind;
  sourceId: string | null;
}

export interface NightState {
  drawPileIds: string[];
  barnResidentIds: string[];
  usedAbilityIds: string[];
  peekedNextId: string | null;
  bust: boolean;
  pinnedForNextNight: string | null;
  resolutionLog: string[];
  targeting: TargetingState | null;
  calledItNight: boolean;
  autoEnded: boolean;
}

export interface NightSummary {
  outcome: NightOutcome;
  title: string;
  resolutionLog: string[];
  popAfter: number;
  cashAfter: number;
  pinnedForNextNight: string | null;
  winningBlueRibbonIds: string[];
}

export interface ShopOffer {
  offerId: string;
  animalId: AnimalId;
  costPop: number;
  stock: number;
  infiniteStock: boolean;
  soldOut: boolean;
}

export interface ShopState {
  regularOffers: ShopOffer[];
  blueRibbonOffers: ShopOffer[];
}

export interface GameState {
  phase: GamePhase;
  nightNumber: number;
  pop: number;
  cash: number;
  barnCapacity: number;
  capacityUpgradeCount: number;
  nextInstanceNumber: number;
  ownedAnimals: OwnedAnimal[];
  pinnedAnimalInstanceId: string | null;
  night: NightState;
  shopState: ShopState | null;
  lastNightSummary: NightSummary | null;
}

export type NightIntent =
  | { type: 'INVITE_FROM_DOOR' }
  | { type: 'CALL_IT_A_NIGHT' }
  | { type: 'USE_ABILITY'; sourceId: string }
  | { type: 'SELECT_TARGET'; targetId: string }
  | { type: 'CANCEL_TARGETING' };

export type AppIntent =
  | NightIntent
  | { type: 'CONTINUE_FROM_SUMMARY' }
  | { type: 'SHOP_BUY_OFFER'; offerId: string }
  | { type: 'SHOP_BUY_CAPACITY' }
  | { type: 'SHOP_START_HOOTENANNY' }
  | { type: 'PLAY_AGAIN' };

export interface BarnSlotView {
  slotIndex: number;
  kind: 'window' | 'door' | 'locked' | 'animal' | 'empty';
  guestGroup: GuestGroupView | null;
}

export interface GuestGroupView {
  displayId: string;
  animalId: AnimalId;
  instanceIds: string[];
  stackCount: number;
}
