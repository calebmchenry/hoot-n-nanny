import { STARTING_HERD } from './animals';
import type { AnimalId, CardInstance } from './types';

const VERIFICATION_SEED_PATTERNS: Record<string, AnimalId[]> = {
  'sprint2-warning': ['FeralGoat', 'FeralGoat', 'BarnCat', 'PotBelliedPig', 'BarnCat'],
  'sprint2-farmer-bust': ['FeralGoat', 'FeralGoat', 'FeralGoat', 'BarnCat'],
  'sprint2-barn-bust': [
    'BarnCat',
    'BarnCat',
    'PotBelliedPig',
    'BarnCat',
    'PotBelliedPig',
    'BarnCat',
  ],
  'sprint2-score-shop': ['PotBelliedPig', 'BarnCat', 'PotBelliedPig', 'BarnCat', 'BarnCat'],
};

const MAX_SEED_LENGTH = 64;
const SAFE_SEED_PATTERN = /^[a-zA-Z0-9_-]+$/;

export const VERIFICATION_SEEDS = [
  'sprint2-opening',
  'sprint2-warning',
  'sprint2-farmer-bust',
  'sprint2-barn-bust',
  'sprint2-score-shop',
] as const;

export const createCardInstance = (animalId: AnimalId, serial: number): CardInstance => {
  return {
    id: `card-${serial.toString().padStart(4, '0')}-${animalId}`,
    animalId,
    abilityUsed: false,
  };
};

export const buildStartingDeck = (
  startSerial = 1,
): {
  cards: CardInstance[];
  nextSerial: number;
} => {
  const cards: CardInstance[] = [];
  let serial = startSerial;

  for (const entry of STARTING_HERD) {
    for (let i = 0; i < entry.quantity; i += 1) {
      cards.push(createCardInstance(entry.animalId, serial));
      serial += 1;
    }
  }

  return {
    cards,
    nextSerial: serial,
  };
};

const hashSeed = (seed: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const applyVerificationPattern = (cards: CardInstance[], seed: string): CardInstance[] => {
  const pattern = VERIFICATION_SEED_PATTERNS[seed];

  if (!pattern) {
    return cards;
  }

  const remaining = [...cards];
  const ordered: CardInstance[] = [];

  for (const animalId of pattern) {
    const index = remaining.findIndex((card) => card.animalId === animalId);
    if (index !== -1) {
      ordered.push(remaining.splice(index, 1)[0]);
    }
  }

  const rng = mulberry32(hashSeed(`${seed}-remaining`));
  for (let i = remaining.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }

  return [...ordered, ...remaining];
};

export const shuffleDeck = (cards: CardInstance[], seed = 'default'): CardInstance[] => {
  const seededDeck = applyVerificationPattern(cards, seed);

  if (seededDeck !== cards) {
    return seededDeck;
  }

  const deck = [...cards];
  const rng = mulberry32(hashSeed(seed));

  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
};

export const drawCard = (
  deck: CardInstance[],
): {
  card: CardInstance | null;
  deck: CardInstance[];
} => {
  if (deck.length === 0) {
    return {
      card: null,
      deck: [],
    };
  }

  return {
    card: deck[0],
    deck: deck.slice(1),
  };
};

export const parseSeedFromSearch = (search: string): string | null => {
  const searchParams = new URLSearchParams(search);
  const rawSeed = searchParams.get('seed');

  if (!rawSeed) {
    return null;
  }

  const trimmedSeed = rawSeed.trim();
  if (trimmedSeed.length === 0 || trimmedSeed.length > MAX_SEED_LENGTH) {
    return null;
  }

  if (!SAFE_SEED_PATTERN.test(trimmedSeed)) {
    return null;
  }

  return trimmedSeed;
};
