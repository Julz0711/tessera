/**
 * Everything a player can wear: a character (lobby, profile, podium), a banner (flown on their
 * pieces), a title (under the name) and a surround (around the portrait). Each item unlocks by
 * level, by finishing a feat, or by rating; a few are free.
 *
 * PLACEHOLDERS: the items below are dummies so the system can be built and tested before the art
 * exists. Real items replace them here; nothing else needs to change. `art` is the key the client
 * draws an item by.
 */

export const SLOTS = ['character', 'banner', 'title', 'surround'] as const;
export type Slot = (typeof SLOTS)[number];

export type Unlock = { kind: 'free' } | { kind: 'level'; n: number } | { kind: 'feat'; id: string } | { kind: 'rating'; n: number };

export interface Item {
  id: string;
  slot: Slot;
  name: string;
  unlock: Unlock;
  /** Drawing key for the client (placeholder art for now). */
  art: string;
}

const item = (slot: Slot, id: string, name: string, unlock: Unlock, art = id): Item => ({ id: `${slot}.${id}`, slot, name, unlock, art });
const free = { kind: 'free' } as const;
const level = (n: number) => ({ kind: 'level', n }) as const;
const feat = (id: string) => ({ kind: 'feat', id }) as const;
const rating = (n: number) => ({ kind: 'rating', n }) as const;

export const ITEMS: readonly Item[] = [
  item('character', 'a', 'Character A', free),
  item('character', 'b', 'Character B', free),
  item('character', 'c', 'Character C', level(4)),
  item('character', 'd', 'Character D', level(8)),
  item('character', 'e', 'Character E', level(12)),
  item('character', 'f', 'Character F', feat('all-hands')),

  item('banner', 'a', 'Banner A', free),
  item('banner', 'b', 'Banner B', level(2)),
  item('banner', 'c', 'Banner C', level(5)),
  item('banner', 'd', 'Banner D', level(9)),
  item('banner', 'e', 'Banner E', feat('pathfinder')),
  item('banner', 'f', 'Banner F', feat('island-hopper')),

  item('title', 'a', 'Title A', free),
  item('title', 'b', 'Title B', level(3)),
  item('title', 'c', 'Title C', level(6)),
  item('title', 'd', 'Title D', feat('knighted')),
  item('title', 'e', 'Title E', feat('baron')),
  item('title', 'f', 'Title F', rating(1150)),

  item('surround', 'a', 'Surround A', free),
  item('surround', 'b', 'Surround B', level(5)),
  item('surround', 'c', 'Surround C', level(10)),
  item('surround', 'd', 'Surround D', level(20)),
  item('surround', 'e', 'Surround E', rating(1100)),
];

const byId = new Map(ITEMS.map((i) => [i.id, i]));
export const itemById = (id: string): Item | undefined => byId.get(id);
export const itemsIn = (slot: Slot): Item[] => ITEMS.filter((i) => i.slot === slot);

/** What counts towards unlocking: level, finished feats and best rating (null: never rated). */
export interface UnlockState {
  level: number;
  feats: ReadonlySet<string>;
  rating: number | null;
}

export const START_STATE: UnlockState = { level: 1, feats: new Set(), rating: null };

export function isUnlocked(unlock: Unlock, state: UnlockState): boolean {
  switch (unlock.kind) {
    case 'free':
      return true;
    case 'level':
      return state.level >= unlock.n;
    case 'feat':
      return state.feats.has(unlock.id);
    case 'rating':
      return state.rating !== null && state.rating >= unlock.n;
  }
}

/** What a player wears: one item id per slot, or null for none (title) / the default. */
export type Loadout = Record<Slot, string | null>;

/** The first free item of each slot; a title is optional, so it defaults to none. */
export const DEFAULT_LOADOUT: Loadout = {
  character: itemsIn('character').find((i) => i.unlock.kind === 'free')!.id,
  banner: itemsIn('banner').find((i) => i.unlock.kind === 'free')!.id,
  title: null,
  surround: itemsIn('surround').find((i) => i.unlock.kind === 'free')!.id,
};

/** Coerces untrusted input to a loadout of known items in the right slots (anything else: default). */
export function sanitizeLoadout(input: unknown): Loadout {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const out = { ...DEFAULT_LOADOUT };
  for (const slot of SLOTS) {
    const v = src[slot];
    if (typeof v === 'string' && itemById(v)?.slot === slot) out[slot] = v;
    else if (v === null && slot === 'title') out.title = null;
  }
  return out;
}

/** Keeps only unlocked items; anything else falls back to the default. The server's last word on a loadout. */
export function clampLoadout(input: unknown, state: UnlockState): Loadout {
  const l = sanitizeLoadout(input);
  for (const slot of SLOTS) {
    const id = l[slot];
    if (id && !isUnlocked(itemById(id)!.unlock, state)) l[slot] = DEFAULT_LOADOUT[slot];
  }
  return l;
}

export function unlockText(u: Unlock, featName: (id: string) => string = (id) => id): string {
  switch (u.kind) {
    case 'free':
      return 'Free';
    case 'level':
      return `Level ${u.n}`;
    case 'feat':
      return featName(u.id);
    case 'rating':
      return `Reach ${u.n} rating`;
  }
}
