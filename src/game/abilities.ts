export type AbilityTrigger = 'on_enter' | 'on_score' | 'passive' | 'manual';

export type AbilityKind =
  | 'none'
  | 'noisy_mitigation'
  | 'bonus_per_empty_slot'
  | 'bonus_per_barn_cat'
  | 'peek'
  | 'boot'
  | 'fetch'
  | 'refresh';

export interface AbilityDef {
  kind: AbilityKind;
  trigger: AbilityTrigger;
  label: string;
  description: string;
  params: Record<string, number>;
}

export const ABILITY_REGISTRY: Record<AbilityKind, AbilityDef> = {
  none: {
    kind: 'none',
    trigger: 'passive',
    label: '',
    description: 'No special ability.',
    params: {},
  },
  noisy_mitigation: {
    kind: 'noisy_mitigation',
    trigger: 'passive',
    label: 'Quiet',
    description: 'Cancels NOISY! from one other animal in the barn.',
    params: { count: 1 },
  },
  bonus_per_empty_slot: {
    kind: 'bonus_per_empty_slot',
    trigger: 'on_score',
    label: 'Hermit',
    description: '+1 Mischief per empty barn slot at scoring.',
    params: { perSlot: 1 },
  },
  bonus_per_barn_cat: {
    kind: 'bonus_per_barn_cat',
    trigger: 'on_score',
    label: 'Herder',
    description: '+1 Mischief per Barn Cat in the barn at scoring.',
    params: { perCat: 1 },
  },
  peek: {
    kind: 'peek',
    trigger: 'on_enter',
    label: 'Peek',
    description:
      'Reveal the next card. Accept it into the barn or reject it to the bottom of the deck.',
    params: {},
  },
  boot: {
    kind: 'boot',
    trigger: 'manual',
    label: 'Boot',
    description: 'Remove one non-Legendary animal from the barn. It is Penned Up next Night.',
    params: { count: 1 },
  },
  fetch: {
    kind: 'fetch',
    trigger: 'on_enter',
    label: 'Fetch',
    description: 'Pull a specific animal type from the remaining deck directly into the barn.',
    params: {},
  },
  refresh: {
    kind: 'refresh',
    trigger: 'on_enter',
    label: 'Refresh',
    description: 'Reset all used active abilities of other animals currently in the barn.',
    params: {},
  },
};
