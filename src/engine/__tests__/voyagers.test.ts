import { describe, expect, it } from 'vitest';
import { generateBoard } from '../board/generate';
import { canHoldShip, islandsOf } from '../board/sea';
import { getTopology } from '../board/topology';
import { HARBOR_KINDS, TREASURE_DECK } from '../constants';
import { MAPS } from '../maps';
import { legalSettlementSpots, legalShipSpots, movableShips } from '../queries';
import { knightReach, legalKnightSpots } from '../ck/queries';
import { createGame } from '../state';
import type { GameState, MapId, Mode, PlayerColor, TreasureKind } from '../types';
import { viewFor } from '../view';
import { foreignIslands, victoryPoints } from '../vp';
import { act, autoSetup } from './kit';

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

  it('The Citadel has four fair home islands and an ore-rich island across the sea', () => {
    expect(() => game('citadel', 'classic')).toThrow(/not compatible/);
    for (const seed of seeds) {
      const s = game('citadel', 'ck', seed, 4);
      const t = getTopology(s.board.hexes);
      const islands = islandsOf(s.board, t);
      expect(new Set(islands.filter((i) => i >= 0)).size).toBe(5);
      expect(s.board.hexes.filter((h) => h.start)).toHaveLength(28);
      const center = s.board.hexes.filter((h) => Math.max(Math.abs(h.q), Math.abs(h.r), Math.abs(h.q + h.r)) <= 1);
      expect(center).toHaveLength(7);
      expect(center.filter((h) => h.terrain === 'mountains')).toHaveLength(3);
      expect(center.filter((h) => h.terrain === 'gold')).toHaveLength(1);
      expect(center.every((h) => !h.start)).toBe(true);
      expect(s.board.harbors).toHaveLength(12);
      const harborCorners = s.board.harbors.flatMap((h) => [t.edges[h.edge].a, t.edges[h.edge].b]);
      expect(new Set(harborCorners).size).toBe(harborCorners.length);
      expect(s.board.harbors.every((h) => canHoldShip(s.board, t, h.edge) && t.edges[h.edge].hexes.some((id) => s.board.hexes[id].terrain !== 'sea'))).toBe(true);
      expect(s.board.hexes[s.pirate!].terrain).toBe('sea');
      expect(s.settings.vpToWin).toBe(16);
      expect(legalSettlementSpots(s, 0, true).every((v) => t.vertices[v].hexes.some((h) => s.board.hexes[h].start))).toBe(true);
    }
  });
});

describe('Veiled Isles', () => {
  it('hides 0–2 sea and 0–1 gold under fog, numbered 3–11 without 7', () => {
    for (const seed of seeds) {
      const board = generateBoard({ rng: seed }, 'veiledIsles');
      const fog = board.hexes.filter((h) => h.fog);
      expect(fog).toHaveLength(15);
      expect(fog.filter((h) => h.terrain === 'sea').length).toBeLessThanOrEqual(2);
      expect(fog.filter((h) => h.terrain === 'gold').length).toBeLessThanOrEqual(1);
      expect(fog.filter((h) => h.terrain === 'desert')).toHaveLength(0);
      for (const h of fog) {
        if (h.terrain === 'sea') expect(h.token).toBeNull();
        else expect([3, 4, 5, 6, 8, 9, 10, 11]).toContain(h.token);
      }
    }
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
