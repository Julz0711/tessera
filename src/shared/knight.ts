/** Cosmetic knight customization — shared by the lobby, profiles and the 3D/2D renderers. */

export const HELMETS = ['bascinet', 'greathelm', 'crowned', 'horned', 'plumed'] as const;
export const ARMORS = ['steel', 'bronze', 'gold', 'obsidian'] as const;
export const EMBLEMS = ['lion', 'eagle', 'tower', 'star', 'cross', 'wolf', 'rose', 'sun'] as const;
export const WEAPONS = ['sword', 'lance', 'axe', 'mace'] as const;
export const CREST_COLORS = ['#d9483b', '#f2c14e', '#3a74d8', '#3f9b4f', '#f2ede2', '#8b5bc9', '#1f1f24', '#e8792f'] as const;

export type Helmet = (typeof HELMETS)[number];
export type Armor = (typeof ARMORS)[number];
export type Emblem = (typeof EMBLEMS)[number];
export type Weapon = (typeof WEAPONS)[number];

export interface KnightCustomization {
  helmet: Helmet;
  armor: Armor;
  emblem: Emblem;
  weapon: Weapon;
  /** Plume / crest color (one of CREST_COLORS). */
  crest: string;
  /** Cape in the player's color. */
  cape: boolean;
}

export const DEFAULT_KNIGHT: KnightCustomization = {
  helmet: 'plumed',
  armor: 'steel',
  emblem: 'lion',
  weapon: 'sword',
  crest: CREST_COLORS[0],
  cape: true,
};

export const ARMOR_COLORS: Record<Armor, { base: string; trim: string }> = {
  steel: { base: '#b9c2cc', trim: '#6f7b87' },
  bronze: { base: '#c28a4e', trim: '#7a4f25' },
  gold: { base: '#e3b94a', trim: '#9b7420' },
  obsidian: { base: '#3b3a44', trim: '#16151b' },
};

export const LABELS = {
  helmet: { bascinet: 'Bascinet', greathelm: 'Great helm', crowned: 'Crowned', horned: 'Horned', plumed: 'Plumed' },
  armor: { steel: 'Steel', bronze: 'Bronze', gold: 'Gold', obsidian: 'Obsidian' },
  emblem: {
    lion: 'Lion',
    eagle: 'Eagle',
    tower: 'Tower',
    star: 'Star',
    cross: 'Cross',
    wolf: 'Wolf',
    rose: 'Rose',
    sun: 'Sun',
  },
  weapon: { sword: 'Sword', lance: 'Lance', axe: 'Axe', mace: 'Mace' },
} as const;

function pick<T extends string>(options: readonly T[], value: unknown, fallback: T): T {
  return typeof value === 'string' && (options as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Coerces untrusted input into a valid customization (unknown values fall back to defaults). */
export function sanitizeKnight(input: unknown): KnightCustomization {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  return {
    helmet: pick(HELMETS, src.helmet, DEFAULT_KNIGHT.helmet),
    armor: pick(ARMORS, src.armor, DEFAULT_KNIGHT.armor),
    emblem: pick(EMBLEMS, src.emblem, DEFAULT_KNIGHT.emblem),
    weapon: pick(WEAPONS, src.weapon, DEFAULT_KNIGHT.weapon),
    crest: pick(CREST_COLORS, src.crest, DEFAULT_KNIGHT.crest),
    cape: typeof src.cape === 'boolean' ? src.cape : DEFAULT_KNIGHT.cape,
  };
}

export function randomKnight(random: () => number = Math.random): KnightCustomization {
  const any = <T>(xs: readonly T[]) => xs[Math.floor(random() * xs.length)];
  return {
    helmet: any(HELMETS),
    armor: any(ARMORS),
    emblem: any(EMBLEMS),
    weapon: any(WEAPONS),
    crest: any(CREST_COLORS),
    cape: random() > 0.3,
  };
}
