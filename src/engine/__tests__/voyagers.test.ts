import { describe, expect, it } from 'vitest';
import { generateBoard } from '../board/generate';
import { islandsOf } from '../board/sea';
import { getTopology } from '../board/topology';
import { TREASURE_DECK } from '../constants';
import { MAPS } from '../maps';
import { legalSettlementSpots, legalShipSpots } from '../queries';
import { createGame } from '../state';
import type { GameState, MapId, Mode, PlayerColor } from '../types';
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
});

describe('Veiled Isles', () => {
  it('hides 0–2 sea and 0–1 gold under fog, numbered 3–11 without 7', () => {
    for (const seed of seeds) {
      const board = generateBoard({ rng: seed }, 'veiledIsles');
      const fog = board.hexes.filter((h) => h.fog);
      expect(fog).toHaveLength(12);
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
