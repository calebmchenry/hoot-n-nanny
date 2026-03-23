import type { AnimalId } from '../game/types';

interface SpriteSpec {
  body: string;
  accent: string;
  ears: 'round' | 'pointy' | 'floppy' | 'horned' | 'winged' | 'unicorn';
  snout: 'muzzle' | 'beak' | 'none';
  mark?: 'spots' | 'stripe' | 'mane' | 'fluff' | 'crest';
  blueRibbon?: boolean;
}

const OUTLINE = '#2a180d';
const EYE = '#150e08';

const SPRITES: Record<AnimalId, SpriteSpec> = {
  goat: { body: '#d9c2a0', accent: '#8c6239', ears: 'horned', snout: 'muzzle' },
  bull: { body: '#6f3e2b', accent: '#d8b080', ears: 'horned', snout: 'muzzle', mark: 'stripe' },
  goose: { body: '#f7f1e3', accent: '#d88b2a', ears: 'round', snout: 'beak' },
  chicken: { body: '#f3dfaa', accent: '#be3a2d', ears: 'round', snout: 'beak', mark: 'crest' },
  pig: { body: '#f0a9b2', accent: '#d6707f', ears: 'round', snout: 'muzzle' },
  cow: { body: '#f4efe6', accent: '#2f2c2a', ears: 'horned', snout: 'muzzle', mark: 'spots' },
  mouse: { body: '#9f9ea7', accent: '#dcb4c0', ears: 'round', snout: 'muzzle' },
  owl: { body: '#8a6543', accent: '#e1b85f', ears: 'pointy', snout: 'beak' },
  'barn-cat': { body: '#c18e53', accent: '#4d3520', ears: 'pointy', snout: 'muzzle', mark: 'stripe' },
  sheep: { body: '#ece7df', accent: '#b8b0a5', ears: 'floppy', snout: 'muzzle', mark: 'fluff' },
  swan: { body: '#fffdf8', accent: '#c79b32', ears: 'floppy', snout: 'beak' },
  bunny: { body: '#f3e8dd', accent: '#d7a9b0', ears: 'floppy', snout: 'muzzle' },
  'border-collie': { body: '#2b2b2e', accent: '#f1ebe2', ears: 'pointy', snout: 'muzzle', mark: 'spots' },
  donkey: { body: '#8f928f', accent: '#6a6d69', ears: 'floppy', snout: 'muzzle' },
  chimera: { body: '#6e5e48', accent: '#c47f46', ears: 'winged', snout: 'muzzle', mark: 'mane', blueRibbon: true },
  jackalope: { body: '#8f6f4a', accent: '#e2c17f', ears: 'horned', snout: 'muzzle', blueRibbon: true },
  unicorn: { body: '#f2f5ff', accent: '#7dc8ff', ears: 'unicorn', snout: 'muzzle', blueRibbon: true },
  griffin: { body: '#9a774f', accent: '#e8c671', ears: 'winged', snout: 'beak', blueRibbon: true },
  dragon: { body: '#4b8f56', accent: '#2c5a31', ears: 'winged', snout: 'none', mark: 'mane', blueRibbon: true }
};

interface AnimalSpriteProps {
  animalId: AnimalId;
  className?: string;
}

const EarShape = ({ spec }: { spec: SpriteSpec }) => {
  if (spec.ears === 'round') {
    return (
      <>
        <rect x="3" y="2" width="2" height="2" fill={spec.body} />
        <rect x="11" y="2" width="2" height="2" fill={spec.body} />
      </>
    );
  }

  if (spec.ears === 'pointy') {
    return (
      <>
        <rect x="3" y="1" width="2" height="3" fill={spec.body} />
        <rect x="11" y="1" width="2" height="3" fill={spec.body} />
      </>
    );
  }

  if (spec.ears === 'floppy') {
    return (
      <>
        <rect x="2" y="2" width="2" height="4" fill={spec.body} />
        <rect x="12" y="2" width="2" height="4" fill={spec.body} />
      </>
    );
  }

  if (spec.ears === 'horned') {
    return (
      <>
        <rect x="3" y="2" width="2" height="2" fill={spec.body} />
        <rect x="11" y="2" width="2" height="2" fill={spec.body} />
        <rect x="4" y="0" width="1" height="2" fill={spec.accent} />
        <rect x="11" y="0" width="1" height="2" fill={spec.accent} />
      </>
    );
  }

  if (spec.ears === 'winged') {
    return (
      <>
        <rect x="3" y="1" width="2" height="2" fill={spec.body} />
        <rect x="11" y="1" width="2" height="2" fill={spec.body} />
        <rect x="1" y="7" width="2" height="4" fill={spec.accent} />
        <rect x="13" y="7" width="2" height="4" fill={spec.accent} />
      </>
    );
  }

  return (
    <>
      <rect x="3" y="1" width="2" height="2" fill={spec.body} />
      <rect x="11" y="1" width="2" height="2" fill={spec.body} />
      <rect x="7" y="0" width="2" height="3" fill={spec.accent} />
    </>
  );
};

const Marking = ({ spec }: { spec: SpriteSpec }) => {
  if (spec.mark === 'spots') {
    return (
      <>
        <rect x="5" y="8" width="2" height="2" fill={spec.accent} />
        <rect x="10" y="10" width="2" height="2" fill={spec.accent} />
      </>
    );
  }

  if (spec.mark === 'stripe') {
    return <rect x="7" y="6" width="2" height="7" fill={spec.accent} />;
  }

  if (spec.mark === 'mane') {
    return (
      <>
        <rect x="3" y="5" width="1" height="8" fill={spec.accent} />
        <rect x="12" y="5" width="1" height="8" fill={spec.accent} />
      </>
    );
  }

  if (spec.mark === 'fluff') {
    return (
      <>
        <rect x="2" y="6" width="1" height="5" fill={spec.accent} />
        <rect x="13" y="6" width="1" height="5" fill={spec.accent} />
      </>
    );
  }

  if (spec.mark === 'crest') {
    return (
      <>
        <rect x="7" y="1" width="2" height="1" fill={spec.accent} />
        <rect x="6" y="2" width="4" height="1" fill={spec.accent} />
      </>
    );
  }

  return null;
};

const Snout = ({ spec }: { spec: SpriteSpec }) => {
  if (spec.snout === 'muzzle') {
    return (
      <>
        <rect x="6" y="7" width="4" height="2" fill={spec.accent} />
        <rect x="7" y="8" width="1" height="1" fill={OUTLINE} />
        <rect x="8" y="8" width="1" height="1" fill={OUTLINE} />
      </>
    );
  }

  if (spec.snout === 'beak') {
    return (
      <>
        <rect x="7" y="7" width="3" height="1" fill={spec.accent} />
        <rect x="10" y="7" width="1" height="1" fill={spec.accent} />
      </>
    );
  }

  return null;
};

export const AnimalSprite = ({ animalId, className }: AnimalSpriteProps) => {
  const spec = SPRITES[animalId];

  return (
    <span className={`animal-sprite${className ? ` ${className}` : ''}`} aria-hidden="true">
      <svg viewBox="0 0 16 16" role="presentation" preserveAspectRatio="xMidYMid meet">
        <rect x="2" y="6" width="12" height="8" fill={OUTLINE} />
        <rect x="3" y="6" width="10" height="7" fill={spec.body} />
        <rect x="4" y="3" width="8" height="4" fill={spec.body} />
        <EarShape spec={spec} />
        <Marking spec={spec} />
        <Snout spec={spec} />
        <rect x="6" y="5" width="1" height="1" fill={EYE} />
        <rect x="9" y="5" width="1" height="1" fill={EYE} />
        <rect x="4" y="13" width="1" height="2" fill={OUTLINE} />
        <rect x="7" y="13" width="1" height="2" fill={OUTLINE} />
        <rect x="10" y="13" width="1" height="2" fill={OUTLINE} />
        <rect x="12" y="13" width="1" height="2" fill={OUTLINE} />
        {spec.blueRibbon ? (
          <>
            <rect x="12" y="0" width="4" height="4" fill="#2a6ac0" />
            <rect x="13" y="1" width="2" height="2" fill="#d8ebff" />
          </>
        ) : null}
      </svg>
    </span>
  );
};
