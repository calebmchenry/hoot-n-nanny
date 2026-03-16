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
  | 'HoneyBee';

export type ShopAnimalId =
  | 'Bunny'
  | 'Hen'
  | 'WildBoar'
  | 'HermitCrab'
  | 'DraftPony'
  | 'StruttingPeacock'
  | 'MilkmaidGoat'
  | 'HoneyBee';

export interface AnimalDef {
  id: AnimalId;
  name: string;
  costMischief: number | null;
  mischief: number;
  hay: number;
  noisy: boolean;
  noisyMitigation: number;
  givesHermitCrabBonus: boolean;
  givesDraftPonyBonus: boolean;
  inShop: boolean;
}

export interface CardInstance {
  id: string;
  animalId: AnimalId;
}

export type BustType = 'farmer' | 'barn';

export enum GamePhase {
  ReadyToDraw = 'ready_to_draw',
  AnimatingDraw = 'animating_draw',
  PlayerDecision = 'player_decision',
  Warning = 'warning',
  Bust = 'bust',
  NightSummary = 'night_summary',
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
  activePennedUpCardId: string | null;
  pendingPennedUpCardId: string | null;
  pendingPennedUpTurns: number;
  lastSummary: NightScoreSummary | null;
}

export type NightEvent =
  | { type: 'card_draw_started' }
  | { type: 'card_revealed'; card: CardInstance; slotIndex: number }
  | { type: 'warning_state_changed'; noisyCount: number; warning: boolean }
  | { type: 'bust_triggered'; bustType: BustType; card: CardInstance }
  | { type: 'night_scored'; summary: NightScoreSummary }
  | { type: 'animal_penned_up'; card: CardInstance }
  | { type: 'purchase_completed'; animalId: ShopAnimalId; card: CardInstance }
  | { type: 'capacity_upgraded'; capacity: number };

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
