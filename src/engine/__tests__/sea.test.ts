import { describe, expect, it } from 'vitest';
import { COSTS } from '../constants';
import { canHoldRoad, canHoldShip, edgeKind } from '../board/sea';
import { getTopology } from '../board/topology';
import { canPlaceRoad, legalRoadSpots, legalSettlementSpots, legalShipSpots, movableShips, piecesLeft, robberTargets } from '../queries';
import { act, autoSetup, newGame, reject } from './kit';

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

describe('ships', () => {
  /** Flooded board, setup done; seat 0 to act with plenty of cards. Returns a coastal vertex owned by seat 0. */
  function ready() {
    const { s } = floodedGame();
    const g = autoSetup(s);
    g.turn.seat = 0;
    g.turn.rolled = true;
    g.pending = [];
    for (const c of ['lumber', 'wool', 'brick', 'grain'] as const) g.players[0].hand[c] = 10;
    const t = getTopology(g.board.hexes);
    const port = t.vertices.findIndex((v, i) => g.buildings[i]?.owner === 0 && t.vertices[i].edges.some((e) => canHoldShip(g.board, t, e)));
    return { g, t, port };
  }

  it('builds from a coastal settlement, extends, and refuses land edges', () => {
    const { g, t, port } = ready();
    expect(port).toBeGreaterThanOrEqual(0);
    const landEdge = t.edges.find((e) => edgeKind(g.board, t, e.id) === 'land')!.id;
    expect(reject(g, 0, { type: 'buildShip', edge: landEdge })).toMatch(/cannot build a ship/);
    const first = t.vertices[port].edges.find((e) => canHoldShip(g.board, t, e) && g.roads[e] === null)!;
    const a = act(g, 0, { type: 'buildShip', edge: first });
    expect(a.ships[first]).toBe(0);
    expect(a.players[0].hand.wool).toBe(9);
    // Every legal ship spot touches an own settlement or an own ship.
    for (const e of legalShipSpots(a, 0)) {
      const touches = [t.edges[e].a, t.edges[e].b].some((v) => a.buildings[v]?.owner === 0 || t.vertices[v].edges.some((o) => a.ships[o] === 0));
      expect(touches).toBe(true);
    }
  });

  it('keeps roads off ship edges and never links them through a ship', () => {
    const { g, t, port } = ready();
    const e = t.vertices[port].edges.find((x) => edgeKind(g.board, t, x) === 'coast' && g.roads[x] === null)!;
    const a = act(g, 0, { type: 'buildShip', edge: e });
    expect(canPlaceRoad(a, 0, e)).toBe(false);
    // Roads never connect through a ship: a road at the far end is illegal unless a road or building of its own supports it.
    const far = t.edges[e].a === port ? t.edges[e].b : t.edges[e].a;
    for (const r of t.vertices[far].edges) {
      if (r === e || !canHoldRoad(a.board, t, r)) continue;
      const supported = [t.edges[r].a, t.edges[r].b].some((v) => a.buildings[v]?.owner === 0 || t.vertices[v].edges.some((o) => o !== r && a.roads[o] === 0));
      expect(canPlaceRoad(a, 0, r)).toBe(supported);
    }
  });

  it('moves only the open end of a route, once a turn, never a fresh ship', () => {
    const { g, t, port } = ready();
    const e1 = t.vertices[port].edges.find((x) => canHoldShip(g.board, t, x) && g.roads[x] === null)!;
    let a = act(g, 0, { type: 'buildShip', edge: e1 });
    const far = t.edges[e1].a === port ? t.edges[e1].b : t.edges[e1].a;
    const e2 = legalShipSpots(a, 0).find((x) => t.vertices[far].edges.includes(x))!;
    a = act(a, 0, { type: 'buildShip', edge: e2 });
    expect(movableShips(a, 0)).toEqual([e2]); // e1 touches the settlement and e2
    expect(reject(a, 0, { type: 'moveShip', from: e2, to: e1 })).toMatch(/new ship cannot sail/);
    a.turn.shipsBuilt = []; // a later turn
    const dest = legalShipSpots({ ...a, ships: a.ships.map((o, i) => (i === e2 ? null : o)) }, 0).find((x) => x !== e2)!;
    expect(reject(a, 0, { type: 'moveShip', from: e1, to: dest })).toMatch(/connected route/);
    const moved = act(a, 0, { type: 'moveShip', from: e2, to: dest });
    expect(moved.ships[e2]).toBeNull();
    expect(moved.ships[dest]).toBe(0);
    expect(reject(moved, 0, { type: 'moveShip', from: dest, to: e2 })).toMatch(/already moved|new ship/);
  });

  it('caps ships at 15 and charges wool and lumber', () => {
    const { g } = ready();
    expect(piecesLeft(g, 0).ships).toBe(15);
    expect(COSTS.ship).toEqual({ wool: 1, lumber: 1 });
  });
});
