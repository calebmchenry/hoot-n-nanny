import type { AbilityKind } from './abilities';

export type AnimalTier = 'common' | 'legendary';

export type AnimalId =
  | 'BarnCat'
  | 'FeralGoat'
  | 'PotBelliedPig'
  | 'Bunny'
  | 'Hen'
  | 'WildBoar'
  | 'HermitCrab'
  | 'DraftPony'
  | 'StruttingPeacock'
  | 'MilkmaidGoat'
  | 'HoneyBee'
  // Sprint 003: active-ability animals
  | 'Sheepdog'
  | 'StableHand'
  | 'BorderCollie'
  | 'CheerfulLamb'
  // Sprint 003: all 8 Legendaries
  | 'GoldenGoose'
  | 'GiantOx'
  | 'Jackalope'
  | 'Thunderbird'
  | 'SilverMare'
  | 'LuckyToad'
  | 'GreatStag'
  | 'BarnDragon';

export type ShopAnimalId =
  | 'Bunny'
  | 'Hen'
  | 'WildBoar'
  | 'HermitCrab'
  | 'DraftPony'
  | 'StruttingPeacock'
  | 'MilkmaidGoat'
  | 'HoneyBee'
  // Sprint 003
  | 'Sheepdog'
  | 'StableHand'
  | 'BorderCollie'
  | 'CheerfulLamb'
  | 'GoldenGoose'
  | 'GiantOx'
  | 'Jackalope'
  | 'Thunderbird'
  | 'SilverMare'
  | 'LuckyToad'
  | 'GreatStag'
  | 'BarnDragon';

export interface AnimalDef {
  id: AnimalId;
  name: string;
  costMischief: number | null;
  mischief: number;
  hay: number;
  noisy: boolean;
  // Existing boolean fields — preserved this sprint, removed in Sprint 004
  noisyMitigation: number;
  givesHermitCrabBonus: boolean;
  givesDraftPonyBonus: boolean;
  inShop: boolean;
  // Sprint 003 additions
  abilityKind: AbilityKind;
  tier: AnimalTier;
}

export interface CardInstance {
  id: string;
  animalId: AnimalId;
  abilityUsed: boolean;
}

export type BustType = 'farmer' | 'barn';

export type PendingDecision =
  | { kind: 'peek'; sourceCardId: string; previewCard: CardInstance }
  | { kind: 'boot'; sourceCardId: string; validTargetCardIds: string[] }
  | { kind: 'fetch'; sourceCardId: string; validAnimalIds: AnimalId[] };

export interface WinState {
  achieved: boolean;
  legendaryCount: number;
  requiredLegendaryCount: 3;
  achievedAtNight: number | null;
}

export enum GamePhase {
  ReadyToDraw = 'ready_to_draw',
  AnimatingDraw = 'animating_draw',
  PlayerDecision = 'player_decision',
  Warning = 'warning',
  AbilityDecision = 'ability_decision',
  Bust = 'bust',
  NightSummary = 'night_summary',
  Win = 'win',
  Shop = 'shop',
}

export interface NightScoreLine {
  cardId: string;
  animalId: AnimalId;
  name: string;
  mischief: number;
  hay: number;
  bonusMischief: number;
}

export interface NightScoreSummary {
  reason: 'called' | 'deck_exhausted' | 'bust';
  bustType: BustType | null;
  lines: NightScoreLine[];
  baseMischief: number;
  bonusMischief: number;
  penaltyMischief: number;
  totalMischief: number;
  hayEarned: number;
  hayCost: number;
  hayPaid: number;
  hayUnpaid: number;
  totalHay: number;
}

export interface NightBustState {
  type: BustType;
  card: CardInstance;
}

export interface NightState {
  phase: GamePhase;
  nightNumber: number;
  deck: CardInstance[];
  barn: CardInstance[];
  capacity: number;
  noisyCount: number;
  hasDrawn: boolean;
  warning: boolean;
  autoScored: boolean;
  complete: boolean;
  bust: NightBustState | null;
  summary: NightScoreSummary | null;
  pennedUpCard: CardInstance | null;
  // Sprint 003 additions
  pendingDecision: PendingDecision | null;
  legendaryCount: number;
  wonThisNight: boolean;
}

export type ShopStock = Record<ShopAnimalId, number>;

export interface GameSession {
  seed: string;
  herd: CardInstance[];
  nextCardSerial: number;
  capacity: number;
  mischief: number;
  hay: number;
  nightNumber: number;
  shopStock: ShopStock;
  currentNight: NightState | null;
  lastSummary: NightScoreSummary | null;
  // Sprint 002 singular penned-up fields (kept for backward compat)
  activePennedUpCardId: string | null;
  pendingPennedUpCardId: string | null;
  pendingPennedUpTurns: number;
  // Sprint 003: array-based penned-up tracking
  activePennedUpCardIds: string[];
  pendingPennedUpCardIds: string[];
  // Sprint 003: win state
  winState: WinState;
}

export type NightEvent =
  | { type: 'card_draw_started' }
  | { type: 'card_revealed'; card: CardInstance; slotIndex: number }
  | { type: 'warning_state_changed'; noisyCount: number; warning: boolean }
  | { type: 'bust_triggered'; bustType: BustType; card: CardInstance }
  | { type: 'night_scored'; summary: NightScoreSummary }
  | { type: 'animal_penned_up'; card: CardInstance }
  | { type: 'purchase_completed'; animalId: ShopAnimalId; card: CardInstance }
  | { type: 'capacity_upgraded'; capacity: number }
  // Sprint 003 additions
  | { type: 'ability_triggered'; cardId: string; abilityKind: AbilityKind }
  | { type: 'peek_offered'; sourceCardId: string; previewCard: CardInstance }
  | { type: 'peek_accepted'; card: CardInstance; slotIndex: number }
  | { type: 'peek_rejected'; card: CardInstance }
  | { type: 'boot_requested'; sourceCardId: string; validTargetCardIds: string[] }
  | { type: 'boot_executed'; sourceCardId: string; bootedCard: CardInstance }
  | { type: 'fetch_requested'; sourceCardId: string; validAnimalIds: AnimalId[] }
  | {
      type: 'fetch_executed';
      sourceCardId: string;
      fetchedCard: CardInstance;
      slotIndex: number;
    }
  | { type: 'abilities_refreshed'; sourceCardId: string; refreshedCardIds: string[] }
  | { type: 'legendary_count_changed'; count: number; required: 3 }
  | { type: 'win_triggered'; legendaryCardIds: string[]; nightNumber: number };

export interface SessionMutation {
  session: GameSession;
  events: NightEvent[];
}

export interface MarketItem {
  animalId: ShopAnimalId;
  name: string;
  costMischief: number;
  mischief: number;
  hay: number;
  noisy: boolean;
  remainingStock: number;
  affordable: boolean;
}
