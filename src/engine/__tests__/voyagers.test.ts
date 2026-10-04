import { describe, expect, it } from 'vitest';
import { generateBoard } from '../board/generate';
import { canHoldRoad, canHoldSettlement, canHoldShip, islandsOf } from '../board/sea';
import { getTopology } from '../board/topology';
import { HARBOR_KINDS, TREASURE_DECK } from '../constants';
import { MAPS } from '../maps';
import { legalSettlementSpots, legalShipSpots, movableShips, pirateBorders, shipDestinations } from '../queries';
import { knightReach, legalKnightSpots, openRoutes, routeMoveTargets } from '../ck/queries';
import { createGame } from '../state';
import type { GameState, MapId, Mode, PlayerColor, TreasureKind } from '../types';
import { viewFor } from '../view';
import { foreignIslands, victoryPoints } from '../vp';
import { act, autoSetup, reject } from './kit';

const seeds = Array.from({ length: 25 }, (_, i) => i * 7919 + 3);
const COLORS: PlayerColor[] = ['red', 'blue', 'orange', 'white'];

function game(map: MapId, mode: Mode = 'classic', seed = 1, players = 3): GameState {
  return createGame({
    seed,
    mode,
    settings: { map },
    players: Array.from({ length: players }, (_, i) => ({ id: `p${i}`, name: `P${i}`, color: COLORS[i], isBot: false })),
  });
}

const count = (s: GameState, terrain: string) => s.board.hexes.filter((h) => h.terrain === terrain).length;

describe('Voyagers maps', () => {
  it('Far Shores: the base island plus 13 small-isle slots with two gold fields', () => {
    for (const seed of seeds) {
      const s = game('farShores', 'classic', seed);
      expect(s.board.hexes.filter((h) => h.start)).toHaveLength(19);
      expect(count(s, 'gold')).toBe(2);
      expect(s.pirate).not.toBeNull();
      expect(s.board.hexes[s.pirate!].terrain).toBe('sea');
      expect(s.board.hexes[s.robber].terrain).toBe('desert');
      expect(s.board.harbors).toHaveLength(9);
      expect(s.settings.vpToWin).toBe(14);
      const islands = islandsOf(s.board, getTopology(s.board.hexes));
      expect(new Set(islands.filter((i) => i >= 0)).size).toBeGreaterThan(1);
    }
  });

  it('Four Realms: four islands, no desert, robber on the 12', () => {
    for (const seed of seeds) {
      const s = game('fourRealms', 'classic', seed);
      const islands = islandsOf(s.board, getTopology(s.board.hexes));
      expect(new Set(islands.filter((i) => i >= 0)).size).toBe(4);
      expect(count(s, 'desert')).toBe(0);
      expect(s.board.hexes[s.robber].token).toBe(12);
      expect(s.settings.vpToWin).toBe(13);
      expect(s.board.harbors).toHaveLength(9);
    }
  });

  it('starts Far Shores on the main island only, and scores 2 per foreign island', () => {
    const s = autoSetup(game('farShores'));
    const t = getTopology(s.board.hexes);
    const islands = islandsOf(s.board, t);
    const main = islands[s.board.hexes.find((h) => h.start)!.id];
    expect(s.homeIslands!.every((home) => home.length === 1 && home[0] === main)).toBe(true);
    const base = victoryPoints(s, 0);
    // Put a settlement on a small island and score it.
    const small = t.vertices.find((v) => v.hexes.some((h) => islands[h] >= 0 && islands[h] !== main) && !v.hexes.some((h) => islands[h] === main))!;
    s.buildings[small.id] = { owner: 0, city: false, wall: false, metropolis: null };
    expect(foreignIslands(s, 0)).toHaveLength(1);
    expect(victoryPoints(s, 0)).toBe(base + 1 + 2);
  });

  it('Veiled Isles needs Knights & Barbarians', () => {
    expect(() => game('veiledIsles', 'classic')).toThrow(/not compatible/);
    expect(game('veiledIsles', 'ck').settings.vpToWin).toBe(MAPS.veiledIsles.vpToWin!.ck);
  });

  it('The Citadel is a four-ring island of gold, wood, ponds, fog, desert and an ore rim, with six fair isles around it', () => {
    expect(() => game('citadel', 'classic')).toThrow(/not compatible/);
    expect(MAPS.citadel.maxPlayers).toBe(6);
    const ring = (h: { q: number; r: number }) => Math.max(Math.abs(h.q), Math.abs(h.r), Math.abs(h.q + h.r));
    const straight = (h: { q: number; r: number }) => h.q === 0 || h.r === 0 || h.q + h.r === 0;
    for (const seed of seeds) {
      const s = game('citadel', 'ck', seed, 6);
      const t = getTopology(s.board.hexes);
      const hexes = s.board.hexes;
      const centre = hexes.filter((h) => ring(h) <= 4);
      const ponds = centre.filter((h) => h.terrain === 'sea');
      expect(centre).toHaveLength(61);
      expect(ponds).toHaveLength(6);
      expect(ponds.every((h) => ring(h) === 2 && straight(h))).toBe(true);
      const gold = hexes.find((h) => ring(h) === 0)!;
      expect(gold.terrain).toBe('gold');
      expect([6, 8]).toContain(gold.token);
      expect(hexes.filter((h) => ring(h) === 1).every((h) => h.terrain === 'forest' && !h.fog)).toBe(true);
      // The rim is all ore, numbered 3 to 11, three of each.
      const rim = hexes.filter((h) => ring(h) === 4);
      expect(rim).toHaveLength(24);
      expect(rim.every((h) => h.terrain === 'mountains' && !h.fog)).toBe(true);
      expect(rim.map((h) => h.token!).sort((x, y) => x - y)).toEqual([3, 4, 5, 6, 8, 9, 10, 11].flatMap((n) => [n, n, n]));
      expect(hexes.filter((h) => h.fog)).toHaveLength(18);
      expect(hexes.filter((h) => h.fog).every((h) => (ring(h) === 2 || ring(h) === 3) && !straight(h) && h.terrain !== 'desert' && h.terrain !== 'mountains')).toBe(true);
      const desert = hexes.filter((h) => h.terrain === 'desert');
      expect(desert).toHaveLength(6);
      expect(desert.every((h) => ring(h) === 3 && straight(h))).toBe(true);
      expect(hexes[s.robber].terrain).toBe('desert');
      // Six isles of five hexes, each with every resource, one 6 or 8 and a 4, 5, 9 and 10.
      const isleOf = islandsOf(s.board, t);
      expect(new Set(isleOf.filter((i) => i >= 0)).size).toBe(7);
      const start = hexes.filter((h) => h.start);
      expect(start).toHaveLength(30);
      const isles = [...new Set(start.map((h) => isleOf[h.id]))].map((i) => start.filter((h) => isleOf[h.id] === i));
      expect(isles).toHaveLength(6);
      for (const isle of isles) {
        expect(isle).toHaveLength(5);
        expect(isle.some((h) => h.terrain === 'mountains')).toBe(false);
        expect(new Set(isle.map((h) => h.terrain))).toEqual(new Set(['fields', 'forest', 'hills', 'pasture']));
        const nums = isle.map((h) => h.token!).sort((x, y) => x - y);
        expect([4, 5, 9, 10].every((n) => nums.includes(n))).toBe(true);
        expect(nums.filter((n) => n === 6 || n === 8)).toHaveLength(1);
        expect(isle.every((h) => ring(h) >= 6)).toBe(true);
      }
      // Turned copies of one another: the same distances from the middle.
      const profiles = new Set(isles.map((isle) => isle.map((h) => ring(h)).sort((x, y) => x - y).join()));
      expect(profiles.size).toBe(1);
      expect(isles.filter((isle) => isle.some((h) => h.token === 6))).toHaveLength(3);
      for (const h of start) expect(t.hexes[h.id].neighbors.every((n) => hexes[n].start || hexes[n].terrain === 'sea')).toBe(true);
      // A 2:1 lumber harbor on each pond, facing the forest beside it.
      const lumber = s.board.harbors.filter((h) => h.kind === 'lumber');
      expect(lumber).toHaveLength(6);
      for (const h of lumber) {
        const sides = t.edges[h.edge].hexes.map((id) => hexes[id].terrain).sort();
        expect(sides).toEqual(['forest', 'sea']);
        // The forest is the one in ring 1, not a fogged forest in ring 2.
        expect(ring(hexes[t.edges[h.edge].hexes.find((id) => hexes[id].terrain === 'forest')!])).toBe(1);
      }
      expect(new Set(lumber.map((h) => t.edges[h.edge].hexes.find((id) => hexes[id].terrain === 'sea'))).size).toBe(6);
      // Three 3:1 harbors per isle, only on sides facing away from the mainland.
      expect(s.board.harbors).toHaveLength(24);
      expect(s.board.harbors.every((h) => canHoldShip(s.board, t, h.edge))).toBe(true);
      const harborCorners = s.board.harbors.flatMap((h) => [t.edges[h.edge].a, t.edges[h.edge].b]);
      expect(new Set(harborCorners).size).toBe(harborCorners.length);
      for (const h of s.board.harbors.filter((x) => x.kind === 'any')) {
        const own = t.edges[h.edge].hexes.find((id) => hexes[id].start)!;
        expect(own).toBeDefined();
        const [dx, dy] = [t.edges[h.edge].x - t.hexes[own].x, t.edges[h.edge].y - t.hexes[own].y];
        expect(dx * t.hexes[own].x + dy * t.hexes[own].y).toBeGreaterThan(0);
      }
      expect(hexes[s.pirate!].terrain).toBe('sea');
      // Out in open water: no land touches the pirate or its neighbours, so no early settlement or ship is next to it.
      for (const h of hexes) if (h.terrain !== 'sea') expect(ring({ q: h.q - hexes[s.pirate!].q, r: h.r - hexes[s.pirate!].r })).toBeGreaterThanOrEqual(2);
      expect(s.settings.vpToWin).toBe(16);
      expect(legalSettlementSpots(s, 0, true).every((v) => t.vertices[v].hexes.some((h) => hexes[h].start))).toBe(true);
    }
  });
});

describe('Zealand', () => {
  const ring = (h: { q: number; r: number }) => Math.max(Math.abs(h.q), Math.abs(h.r), Math.abs(h.q + h.r));

  it('starts on a ring of sheep around a lake, two sea hexes from six fogged isles', () => {
    for (const seed of seeds) {
      const s = game('zealand', 'classic', seed, 4);
      const t = getTopology(s.board.hexes);
      const start = s.board.hexes.filter((h) => h.start);
      expect(start).toHaveLength(18);
      expect(start.every((h) => h.terrain === 'pasture' && ring(h) >= 1 && ring(h) <= 2)).toBe(true);
      expect(s.board.hexes.find((h) => ring(h) === 0)!.terrain).toBe('sea');
      const fog = s.board.hexes.filter((h) => h.fog);
      expect(fog).toHaveLength(60);
      expect(fog.every((h) => h.terrain !== 'sea' && h.terrain !== 'desert' && h.token !== null && ring(h) >= 4)).toBe(true);
      const gold = fog.filter((h) => h.terrain === 'gold');
      expect(gold).toHaveLength(2);
      for (const h of gold) expect([6, 8]).toContain(h.token);
      expect(gold.some((h) => t.hexes[h.id].neighbors.includes(gold.find((o) => o.id !== h.id)!.id))).toBe(false);
      // One desert: a lone, unfogged isle in open water, where the robber starts.
      const desert = s.board.hexes.filter((h) => h.terrain === 'desert');
      expect(desert).toHaveLength(1);
      expect(desert[0].fog).toBeUndefined();
      expect(t.hexes[desert[0].id].neighbors.every((n) => s.board.hexes[n].terrain === 'sea')).toBe(true);
      expect(s.robber).toBe(desert[0].id);
      // Far out: at least three sea hexes from the nearest fogged isle.
      const apart = (a: { q: number; r: number }, b: { q: number; r: number }) => ring({ q: a.q - b.q, r: a.r - b.r });
      expect(ring(desert[0])).toBeGreaterThanOrEqual(9);
      expect(Math.min(...fog.map((h) => apart(h, desert[0])))).toBeGreaterThanOrEqual(4);
      expect(new Set(islandsOf(s.board, t).filter((i) => i >= 0)).size).toBe(8);
      // The six isles are the same shape turned about the middle: the same number of hexes at each distance.
      const profile = (ids: number[]) => ids.map((id) => ring(s.board.hexes[id])).sort((a, b) => a - b).join();
      const isles = new Map<number, number[]>();
      islandsOf(s.board, t).forEach((i, id) => { if (i >= 0 && s.board.hexes[id].fog) isles.set(i, [...(isles.get(i) ?? []), id]); });
      expect([...isles.values()].every((ids) => ids.length === 10 && profile(ids) === profile([...isles.values()][0]))).toBe(true);
    }
  });

  it('has no gold with the gold toggle off', () => {
    for (const seed of seeds.slice(0, 10)) {
      const board = generateBoard({ rng: seed }, 'zealand', { gold: false });
      expect(board.hexes.filter((h) => h.terrain === 'gold')).toHaveLength(0);
      expect(board.hexes.filter((h) => h.fog)).toHaveLength(60);
    }
  });

  it('has twelve wool harbors on the sheep island, twelve more outside the isles, two on each, and a pirate in open water', () => {
    for (const seed of seeds) {
      const s = game('zealand', 'classic', seed, 4);
      const t = getTopology(s.board.hexes);
      expect(s.board.harbors).toHaveLength(24);
      const onStart = (h: { edge: number }) => t.edges[h.edge].hexes.some((id) => s.board.hexes[id].start);
      const home = s.board.harbors.filter(onStart);
      expect(home).toHaveLength(12);
      // Between two tiles: one corner of each is where two sheep tiles meet; two on each of the six sides.
      for (const h of home) {
        const { a, b } = t.edges[h.edge];
        expect([a, b].some((v) => t.vertices[v].hexes.filter((id) => s.board.hexes[id].start).length === 2)).toBe(true);
      }
      const sideOf = (h: { edge: number }) => Math.floor(((Math.atan2(t.edges[h.edge].x, -t.edges[h.edge].y) + 2 * Math.PI + Math.PI / 6) % (2 * Math.PI)) / (Math.PI / 3));
      expect([0, 1, 2, 3, 4, 5].map((side) => home.filter((h) => sideOf(h) === side).length)).toEqual([2, 2, 2, 2, 2, 2]);
      expect(home.every((h) => h.kind === 'wool')).toBe(true);
      const outer = s.board.harbors.filter((h) => !onStart(h));
      expect(outer).toHaveLength(12);
      // Each sits between two tiles: one of its corners is where two land hexes meet.
      for (const h of outer) {
        const { a, b } = t.edges[h.edge];
        expect([a, b].some((v) => t.vertices[v].hexes.filter((id) => s.board.hexes[id].terrain !== 'sea').length === 2)).toBe(true);
      }
      expect(outer.filter((h) => h.kind === 'any')).toHaveLength(6);
      expect(new Set(outer.filter((h) => h.kind !== 'any').map((h) => h.kind))).toEqual(new Set(['brick', 'lumber', 'wool', 'grain', 'ore']));
      // Two on every isle: one 3:1 and one 2:1.
      const isleOf = islandsOf(s.board, t);
      for (const i of new Set(outer.map((h) => isleOf[t.edges[h.edge].hexes.find((id) => s.board.hexes[id].fog)!]))) {
        const here = outer.filter((h) => isleOf[t.edges[h.edge].hexes.find((id) => s.board.hexes[id].fog)!] === i);
        expect(here.map((h) => h.kind === 'any')).toHaveLength(2);
        expect(here.filter((h) => h.kind === 'any')).toHaveLength(1);
      }
      for (const h of outer) {
        const own = t.edges[h.edge].hexes.find((id) => s.board.hexes[id].fog)!;
        expect(own).toBeDefined();
        const [dx, dy] = [t.edges[h.edge].x - t.hexes[own].x, t.edges[h.edge].y - t.hexes[own].y];
        expect(dx * t.hexes[own].x + dy * t.hexes[own].y).toBeGreaterThan(0);
      }
      const corners = s.board.harbors.flatMap((h) => [t.edges[h.edge].a, t.edges[h.edge].b]);
      expect(new Set(corners).size).toBe(corners.length);
      expect(s.board.harbors.every((h) => canHoldShip(s.board, t, h.edge))).toBe(true);
      // The pirate starts in the water right beside the desert island, on its outer side.
      const desert = s.board.hexes.find((h) => h.terrain === 'desert')!;
      expect(t.hexes[s.pirate!].neighbors).toContain(desert.id);
      expect(s.board.hexes[s.pirate!].terrain).toBe('sea');
      expect(ring(s.board.hexes[s.pirate!])).toBeGreaterThanOrEqual(ring(desert));
      expect(s.settings.vpToWin).toBe(16);
    }
  });

  it('has 3 treasures on every isle (1 inner, 2 outer) and 3 on the desert island, all of random kinds', () => {
    const kinds = new Set<string>();
    for (const seed of seeds) {
      const board = generateBoard({ rng: seed }, 'zealand');
      const t = getTopology(board.hexes);
      expect(board.treasures).toHaveLength(21);
      for (const x of board.treasures!) kinds.add(x.kind!);
      const spots = new Set(board.treasures!.map((x) => x.vertex));
      for (const x of board.treasures!) {
        expect(t.vertices[x.vertex].vertices.some((n) => spots.has(n))).toBe(false);
        expect(t.vertices[x.vertex].hexes.some((h) => board.hexes[h].start)).toBe(false);
        // On the coast of land, where a ship can reach it.
        expect(t.vertices[x.vertex].hexes.some((h) => board.hexes[h].terrain !== 'sea')).toBe(true);
        expect(t.vertices[x.vertex].hexes.some((h) => board.hexes[h].terrain === 'sea')).toBe(true);
      }
      const desert = board.hexes.find((h) => h.terrain === 'desert')!;
      expect(board.treasures!.filter((x) => t.vertices[x.vertex].hexes.includes(desert.id))).toHaveLength(3);
      const isleOf = islandsOf(board, t);
      const perIsle = new Map<number, number>();
      for (const x of board.treasures!) {
        const land = t.vertices[x.vertex].hexes.find((h) => board.hexes[h].fog);
        if (land !== undefined) perIsle.set(isleOf[land], (perIsle.get(isleOf[land]) ?? 0) + 1);
      }
      expect([...perIsle.values()]).toEqual([3, 3, 3, 3, 3, 3]);
      // On each isle, one corner faces the sheep island and two face away from it.
      const toward = new Map<number, number[]>();
      for (const x of board.treasures!) {
        const land = t.vertices[x.vertex].hexes.find((h) => board.hexes[h].fog);
        if (land === undefined) continue;
        const ids = islandsOf(board, t).flatMap((i, id) => (i === isleOf[land] ? [id] : []));
        const [cx, cy] = [ids.reduce((n, id) => n + t.hexes[id].x, 0) / ids.length, ids.reduce((n, id) => n + t.hexes[id].y, 0) / ids.length];
        const side = ((t.vertices[x.vertex].x - cx) * cx + (t.vertices[x.vertex].y - cy) * cy) > 0 ? 1 : 0;
        toward.set(isleOf[land], [...(toward.get(isleOf[land]) ?? []), side]);
      }
      for (const sides of toward.values()) expect(sides.sort()).toEqual([0, 1, 1]);
    }
    expect(kinds.size).toBe(4);
  });

  it('fits eight starting settlements', () => {
    for (const seed of seeds) expect(autoSetup(game('zealand', 'classic', seed, 4)).phase, `seed ${seed}`).not.toBe('setup');
  });
});

describe('Veiled Isles', () => {
  it('hides exactly 2 sea and 2 gold under fog, with an even spread of 3–11 numbers', () => {
    const seaSpots = new Set<string>();
    for (const seed of seeds) {
      const board = generateBoard({ rng: seed }, 'veiledIsles');
      const fog = board.hexes.filter((h) => h.fog);
      expect(fog).toHaveLength(15);
      const seas = fog.filter((h) => h.terrain === 'sea');
      expect(seas, `seed ${seed}`).toHaveLength(2);
      seaSpots.add(seas.map((h) => h.id).join());
      expect(fog.filter((h) => h.terrain === 'gold'), `seed ${seed}`).toHaveLength(2);
      expect(fog.filter((h) => h.terrain === 'desert')).toHaveLength(0);
      for (const h of fog) {
        if (h.terrain === 'sea') expect(h.token).toBeNull();
        else expect([3, 4, 5, 6, 8, 9, 10, 11]).toContain(h.token);
      }
      // One each of 3, 11, 4 and 10, two each of 5, 9, 6 and 8, and one more at random.
      const tokens = fog.filter((h) => h.terrain !== 'sea').map((h) => h.token!);
      const base = [3, 11, 4, 10, 5, 5, 9, 9, 6, 6, 8, 8];
      const rest = [...tokens];
      for (const n of base) {
        expect(rest, `seed ${seed}`).toContain(n);
        rest.splice(rest.indexOf(n), 1);
      }
      expect(rest, `seed ${seed}`).toHaveLength(1);
      // No 6s or 8s side by side.
      const t = getTopology(board.hexes);
      for (const h of fog) if (h.token === 6 || h.token === 8) {
        expect(t.hexes[h.id].neighbors.some((n) => board.hexes[n].token === 6 || board.hexes[n].token === 8), `seed ${seed}`).toBe(false);
      }
    }
    // Where the two seas hide still changes from game to game.
    expect(seaSpots.size).toBeGreaterThan(1);
  });

  it('places exactly 15 treasures with the 5/4/3/3 mix, apart and off the home island', () => {
    for (const seed of seeds) {
      const board = generateBoard({ rng: seed }, 'veiledIsles');
      const t = getTopology(board.hexes);
      expect(board.treasures).toHaveLength(15);
      expect(board.treasures!.map((x) => x.kind).sort()).toEqual([...TREASURE_DECK].sort());
      const spots = new Set(board.treasures!.map((x) => x.vertex));
      for (const x of board.treasures!) {
        expect(t.vertices[x.vertex].vertices.some((n) => spots.has(n))).toBe(false);
        expect(t.vertices[x.vertex].hexes.some((h) => board.hexes[h].start)).toBe(false);
      }
    }
  });

  it('puts the 9 harbors in the same spots on the home coast every game, kinds shuffled', () => {
    const spots = (seed: number) => generateBoard({ rng: seed }, 'veiledIsles').harbors.map((h) => h.edge).sort((a, b) => a - b);
    const first = spots(seeds[0]);
    const kinds = new Set<string>();
    for (const seed of seeds) {
      const board = generateBoard({ rng: seed }, 'veiledIsles');
      const t = getTopology(board.hexes);
      expect(spots(seed)).toEqual(first);
      expect(board.harbors.map((h) => h.kind).sort()).toEqual([...HARBOR_KINDS].sort());
      for (const h of board.harbors) {
        const [a, b] = t.edges[h.edge].hexes.map((x) => board.hexes[x]);
        expect([a.start, b.start].filter(Boolean)).toHaveLength(1);
        expect([a.terrain, b.terrain]).toContain('sea');
      }
      kinds.add(board.harbors.map((h) => h.kind).join());
    }
    expect(kinds.size).toBeGreaterThan(1);
  });

  it('keeps treasure contents and fog secret in views', () => {
    const s = game('veiledIsles', 'ck');
    const view = viewFor(s, 0);
    expect(view.board.treasures!.every((x) => x.kind === null)).toBe(true);
    expect(view.board.hexes.filter((h) => h.fog).every((h) => h.terrain === 'desert' && h.token === null)).toBe(true);
  });

  it('collects a treasure when a ship reaches its corner', () => {
    let s = autoSetup(game('veiledIsles', 'ck', 5));
    const t = getTopology(s.board.hexes);
    s.turn.seat = 0;
    s.turn.rolled = true;
    s.pending = [];
    s.steps = [];
    for (const c of ['lumber', 'wool'] as const) s.players[0].hand[c] = 20;
    // Sail towards the nearest treasure, one ship at a time, until one is taken.
    const target = s.board.treasures!;
    for (let i = 0; i < 15 && target.every((x) => x.takenBy === undefined); i++) {
      const spots = legalShipSpots(s, 0);
      if (!spots.length) break;
      const dist = (e: number) =>
        Math.min(...target.map((x) => Math.hypot(t.edges[e].x - t.vertices[x.vertex].x, t.edges[e].y - t.vertices[x.vertex].y)));
      const best = spots.reduce((a, b) => (dist(b) < dist(a) ? b : a));
      s = act(s, 0, { type: 'buildShip', edge: best });
      s.pending = [];
      s.turn.shipsBuilt = [];
    }
    const taken = s.board.treasures!.filter((x) => x.takenBy === 0);
    expect(taken.length).toBeGreaterThan(0);
    expect(s.log.some((e) => e.type === 'treasure')).toBe(true);
    expect(legalSettlementSpots(s, 0).length).toBeGreaterThanOrEqual(0);
  });
});

describe('Knights and ships', () => {
  it('recruits and moves knights along ships, and a knight holds its ship in place', () => {
    const s = autoSetup(game('veiledIsles', 'ck', 4));
    const t = getTopology(s.board.hexes);
    // A lone ship route of seat 0: building → e0 → e1, open at the far end.
    for (const e0 of t.edges.filter((e) => canHoldShip(s.board, t, e.id)).map((e) => e.id)) {
      const [home, mid] = [t.edges[e0].a, t.edges[e0].b];
      const e1 = t.vertices[mid].edges.find((e) => e !== e0 && canHoldShip(s.board, t, e) && s.roads[e] === null);
      if (e1 === undefined || s.buildings[home] || s.buildings[mid]) continue;
      const end = t.edges[e1].a === mid ? t.edges[e1].b : t.edges[e1].a;
      if (s.buildings[end] || [home, mid, end].some((v) => t.vertices[v].edges.some((e) => s.roads[e] !== null || s.ships[e] !== null))) continue;
      s.buildings[home] = { owner: 0, city: false, wall: false, metropolis: null };
      s.ships[e0] = 0;
      s.ships[e1] = 0;
      expect(legalKnightSpots(s, 0)).toEqual(expect.arrayContaining([mid, end]));
      s.knights[mid] = { id: 1, owner: 0, level: 1, active: true, activatedOn: 0, promotedOn: 0 };
      expect(knightReach(s, 0, mid).has(end)).toBe(true);
      expect(movableShips(s, 0)).toContain(e1);
      s.knights[end] = s.knights[mid];
      s.knights[mid] = null;
      expect(movableShips(s, 0)).not.toContain(e1);
      return;
    }
    throw new Error('no free spot for a two-ship route');
  });

  it('Diplomat removes an open ship of an opponent and moves one of your own, as a ship', () => {
    let s = autoSetup(game('fourRealms', 'ck', 3));
    const t = getTopology(s.board.hexes);
    s.buildings = s.buildings.map(() => null);
    s.roads = s.roads.map(() => null);
    s.ships = s.ships.map(() => null);
    s.knights = s.knights.map(() => null);
    s.turn.rolled = true;
    // Two lone ships, each from its owner's settlement, open at the far end.
    const sea = t.edges.filter((e) => canHoldShip(s.board, t, e.id) && !pirateBorders(s, e.id)).map((e) => e.id);
    const ends = (e: number) => [t.edges[e].a, t.edges[e].b];
    const mine = sea[0];
    // The opponent's ship keeps clear of mine: none of its corners on or next to my ship's.
    const near = new Set(ends(mine).flatMap((v) => t.vertices[v].edges.flatMap(ends)));
    const theirs = sea.find((e) => ends(e).every((v) => !near.has(v)))!;
    s.buildings[t.edges[mine].a] = { owner: 0, city: false, wall: false, metropolis: null };
    s.ships[mine] = 0;
    s.buildings[t.edges[theirs].a] = { owner: 1, city: false, wall: false, metropolis: null };
    s.ships[theirs] = 1;
    expect(openRoutes(s)).toEqual(expect.arrayContaining([mine, theirs]));

    s.players[0].progress.push({ id: 1, type: 'diplomat', track: 'politics' });
    s = act(s, 0, { type: 'playProgress', card: 1, params: { edge: theirs } });
    expect(s.ships[theirs]).toBeNull();

    s.players[0].progress.push({ id: 2, type: 'diplomat', track: 'politics' });
    s = act(s, 0, { type: 'playProgress', card: 2, params: { edge: mine } });
    expect(s.pending[0]).toEqual({ kind: 'moveRoad', seat: 0, from: mine });
    const to = shipDestinations(s, 0, mine)[0];
    expect(to).toBeDefined();
    expect(routeMoveTargets(s, 0, mine)).toEqual(shipDestinations(s, 0, mine));
    expect(reject(s, 0, { type: 'buildRoad', edge: to })).toBeTruthy();
    s = act(s, 0, { type: 'buildShip', edge: to });
    expect(s.ships[mine]).toBeNull();
    expect(s.ships[to]).toBe(0);
    expect(s.roads[to]).toBeNull();
    expect(s.pending).toHaveLength(0);
  });
});

describe('Veiled Isles rewards', () => {
  /** Setup done, seat 0 to act, with a ship next to treasure `i` ready to be finished off. */
  function nearTreasure(kind: TreasureKind) {
    const s = autoSetup(game('veiledIsles', 'ck', 9));
    const t = getTopology(s.board.hexes);
    s.turn.seat = 0;
    s.turn.rolled = true;
    s.pending = [];
    s.steps = [];
    s.players[0].hand.lumber = 5;
    s.players[0].hand.wool = 5;
    // Lift the fog so the ship pays only its treasure, not a discovery too.
    for (const h of s.board.hexes) delete h.fog;
    // A lone settlement of seat 0 two edges from a treasure corner, with a ship on the first edge.
    for (const tr of s.board.treasures!) {
      for (const e1 of t.vertices[tr.vertex].edges) {
        if (!canHoldShip(s.board, t, e1)) continue;
        const mid = t.edges[e1].a === tr.vertex ? t.edges[e1].b : t.edges[e1].a;
        const e0 = t.vertices[mid].edges.find((e) => e !== e1 && canHoldShip(s.board, t, e));
        if (e0 === undefined) continue;
        const home = t.edges[e0].a === mid ? t.edges[e0].b : t.edges[e0].a;
        if (s.buildings[home] || t.vertices[home].hexes.every((h) => s.board.hexes[h].terrain === 'sea')) continue;
        s.buildings[home] = { owner: 0, city: false, wall: false, metropolis: null };
        s.ships[e0] = 0;
        tr.kind = kind;
        return { s, e1, tr };
      }
    }
    throw new Error('no treasure reachable in two edges');
  }

  it.each([
    ['resource', 'goldPick'],
    ['devCard', 'rewardDeck'],
    ['roadBuilding', 'freeRoads'],
  ] as const)('a %s treasure asks for %s', (kind, prompt) => {
    const { s, e1, tr } = nearTreasure(kind);
    const after = act(s, 0, { type: 'buildShip', edge: e1 });
    expect(after.board.treasures!.find((x) => x.vertex === tr.vertex)!.takenBy).toBe(0);
    expect(after.pending.some((p) => p.kind === prompt && p.seat === 0)).toBe(true);
    expect(after.log.some((ev) => ev.type === 'treasure' && ev.kind === kind)).toBe(true);
  });

  it('a road reaching a treasure corner collects it too', () => {
    const s = autoSetup(game('veiledIsles', 'ck', 9));
    const t = getTopology(s.board.hexes);
    s.turn.seat = 0;
    s.turn.rolled = true;
    s.pending = [];
    s.steps = [];
    s.players[0].hand.lumber = 5;
    s.players[0].hand.brick = 5;
    for (const h of s.board.hexes) delete h.fog;
    // A lone settlement of seat 0 with a road on the first of two land edges leading to a treasure.
    for (const tr of s.board.treasures!) {
      for (const e1 of t.vertices[tr.vertex].edges) {
        if (!canHoldRoad(s.board, t, e1)) continue;
        const mid = t.edges[e1].a === tr.vertex ? t.edges[e1].b : t.edges[e1].a;
        const e0 = t.vertices[mid].edges.find((e) => e !== e1 && canHoldRoad(s.board, t, e));
        if (e0 === undefined || s.buildings[mid] || s.knights[mid]) continue;
        const home = t.edges[e0].a === mid ? t.edges[e0].b : t.edges[e0].a;
        if (s.buildings[home] || !canHoldSettlement(s.board, t, home)) continue;
        s.buildings[home] = { owner: 0, city: false, wall: false, metropolis: null };
        s.roads[e0] = 0;
        tr.kind = 'bundle';
        const after = act(s, 0, { type: 'buildRoad', edge: e1 });
        expect(after.board.treasures!.find((x) => x.vertex === tr.vertex)!.takenBy).toBe(0);
        expect(after.log.some((ev) => ev.type === 'treasure' && ev.kind === 'bundle' && ev.at === tr.vertex)).toBe(true);
        expect(after.players[0].hand.grain).toBe(s.players[0].hand.grain + 1);
        return;
      }
    }
    throw new Error('no treasure reachable by road in two edges');
  });

  it('a three-resource treasure pays wool, grain and brick', () => {
    const { s, e1 } = nearTreasure('bundle');
    const before = { ...s.players[0].hand };
    const after = act(s, 0, { type: 'buildShip', edge: e1 });
    expect(after.players[0].hand.wool).toBe(before.wool - 1 + 1);
    expect(after.players[0].hand.grain).toBe(before.grain + 1);
    expect(after.players[0].hand.brick).toBe(before.brick + 1);
  });

  it('shows a treasure only once collected', () => {
    const { s, e1, tr } = nearTreasure('bundle');
    const after = act(s, 0, { type: 'buildShip', edge: e1 });
    const seen = viewFor(after, 1).board.treasures!;
    expect(seen.find((x) => x.vertex === tr.vertex)!.kind).toBe('bundle');
    expect(seen.filter((x) => x.takenBy === undefined).every((x) => x.kind === null)).toBe(true);
  });

  it('pays a random bonus treasure for revealing hidden sea, without touching the placed ones', () => {
    const s = autoSetup(game('veiledIsles', 'ck', 21));
    const t = getTopology(s.board.hexes);
    s.turn.seat = 0;
    s.turn.rolled = true;
    s.pending = [];
    s.steps = [];
    s.players[0].hand.lumber = 5;
    s.players[0].hand.wool = 5;
    // Make one fog hex hidden sea and give seat 0 a ship route ending next to it.
    const fog = s.board.hexes.find((h) => h.fog && t.hexes[h.id].neighbors.some((n) => s.board.hexes[n].terrain === 'sea' && !s.board.hexes[n].fog))!;
    fog.terrain = 'sea';
    fog.token = null;
    const edge = t.hexes[fog.id].edges.find((e) => t.edges[e].hexes.some((h) => h !== fog.id && s.board.hexes[h].terrain === 'sea' && !s.board.hexes[h].fog))!;
    const v = t.edges[edge].a;
    const e0 = t.vertices[v].edges.find((e) => e !== edge && canHoldShip(s.board, t, e) && !t.edges[e].hexes.includes(fog.id))!;
    const home = t.edges[e0].a === v ? t.edges[e0].b : t.edges[e0].a;
    s.buildings[home] = { owner: 0, city: false, wall: false, metropolis: null };
    s.ships[e0] = 0;
    const kinds = s.board.treasures!.map((x) => x.kind);
    const after = act(s, 0, { type: 'buildShip', edge });
    expect(after.log.some((ev) => ev.type === 'treasure' && ev.at === null)).toBe(true);
    expect(after.board.treasures!.map((x) => x.kind)).toEqual(kinds);
  });

  it('scores 1 point per foreign island', () => {
    const s = autoSetup(game('veiledIsles', 'ck', 3));
    const t = getTopology(s.board.hexes);
    // Every isle starts under the fog: uncover one land hex and settle next to it.
    const found = s.board.hexes.find((h) => h.fog && h.terrain !== 'sea')!;
    found.fog = false;
    const islands = islandsOf(s.board, t);
    const home = s.homeIslands![0];
    const base = victoryPoints(s, 0);
    const v = t.vertices.find((vx) => vx.hexes.includes(found.id) && !vx.hexes.some((h) => home.includes(islands[h])))!;
    s.buildings[v.id] = { owner: 0, city: false, wall: false, metropolis: null };
    expect(victoryPoints(s, 0)).toBe(base + 1 + 1);
  });
});
