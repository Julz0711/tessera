import { describe, expect, it } from 'vitest';
import { canHoldRoad, canHoldShip, edgeKind } from '../board/sea';
import { getTopology } from '../board/topology';
import { canPlaceRoad, legalRoadSpots, legalSettlementSpots, robberTargets } from '../queries';
import { newGame } from './kit';

/** A standard game whose outer ring is flooded: 7 land hexes in the middle, 12 sea hexes around them. */
function floodedGame() {
  const s = newGame(3, 7);
  const flooded = s.board.hexes.filter((h) => Math.max(Math.abs(h.q), Math.abs(h.r), Math.abs(h.q + h.r)) === 2);
  for (const h of flooded) {
    h.terrain = 'sea';
    h.token = null;
  }
  return { s, sea: new Set(flooded.map((h) => h.id)) };
}

describe('sea terrain', () => {
  it('classifies edges as land, coast or sea', () => {
    const { s, sea } = floodedGame();
    const t = getTopology(s.board.hexes);
    const kinds = new Set(t.edges.map((_, e) => edgeKind(s.board, t, e)));
    expect(kinds).toEqual(new Set(['land', 'coast', 'sea']));
    for (const e of t.edges) {
      const allSea = e.hexes.every((h) => sea.has(h));
      expect(edgeKind(s.board, t, e.id) === 'sea').toBe(allSea);
      expect(canHoldRoad(s.board, t, e.id)).toBe(!allSea);
      expect(canHoldShip(s.board, t, e.id)).toBe(edgeKind(s.board, t, e.id) !== 'land');
    }
  });

  it('never allows a settlement that touches only water', () => {
    const { s, sea } = floodedGame();
    const t = getTopology(s.board.hexes);
    const spots = legalSettlementSpots(s, 0, true);
    expect(spots.length).toBeGreaterThan(0);
    for (const v of spots) expect(t.vertices[v].hexes.some((h) => !sea.has(h))).toBe(true);
    const water = t.vertices.find((v) => v.hexes.every((h) => sea.has(h)))!;
    expect(spots).not.toContain(water.id);
  });

  it('keeps roads off open water and the robber out of the sea', () => {
    const { s, sea } = floodedGame();
    const t = getTopology(s.board.hexes);
    s.buildings[t.vertices.find((v) => v.hexes.every((h) => sea.has(h)))!.id] = { owner: 0, city: false, wall: false, metropolis: null };
    for (const e of t.edges.filter((e) => e.hexes.every((h) => sea.has(h)))) expect(canPlaceRoad(s, 0, e.id)).toBe(false);
    expect(legalRoadSpots(s, 0).every((e) => canHoldRoad(s.board, t, e))).toBe(true);
    for (const h of robberTargets(s, 0, () => 0)) expect(sea.has(h)).toBe(false);
  });
});
