import { describe, expect, it } from 'vitest';
import { applyAction } from '../apply';
import { DEV_DECK } from '../constants';
import { handTotal } from '../hand';
import { bankRatio, canPlaceRoad, legalSettlementSpots, topo } from '../queries';
import type { GameState } from '../types';
import { viewFor } from '../view';
import { victoryPoints } from '../vp';
import { act, autoSetup, clearBoard, newGame, reject, rollTotal, setHand } from './kit';

/** A game after setup with an empty board, player 0 to move and already rolled (non-7). */
function playing(players = 3): GameState {
  const s = autoSetup(newGame(players, 7));
  clearBoard(s);
  s.players.forEach((_, i) => setHand(s, i, {}));
  s.turn.rolled = true;
  s.turn.dice = { red: 2, yellow: 3 };
  s.longestRoad = null;
  return s;
}

describe('createGame', () => {
  it('starts in setup with a full bank, a 25-card deck and the robber on the desert', () => {
    const s = newGame(4);
    expect(s.phase).toBe('setup');
    expect(s.setup!.order).toEqual([0, 1, 2, 3, 3, 2, 1, 0]);
    expect(s.bank).toMatchObject({ brick: 19, lumber: 19, wool: 19, grain: 19, ore: 19, paper: 0 });
    expect(s.devDeck).toHaveLength(25);
    for (const [type, n] of Object.entries(DEV_DECK)) expect(s.devDeck.filter((c) => c === type)).toHaveLength(n);
    expect(s.board.hexes[s.robber].terrain).toBe('desert');
  });
});

describe('setup phase', () => {
  it('enforces turn order, the distance rule and road adjacency', () => {
    let s = newGame(3);
    const t = topo(s);
    expect(reject(s, 1, { type: 'buildSettlement', vertex: 0 })).toMatch(/not your turn/);
    s = act(s, 0, { type: 'buildSettlement', vertex: 0 });
    expect(reject(s, 0, { type: 'buildSettlement', vertex: 5 })).toMatch(/road first/);
    const farEdge = t.edges.find((e) => e.a !== 0 && e.b !== 0)!.id;
    expect(reject(s, 0, { type: 'buildRoad', edge: farEdge })).toMatch(/must touch/);
    s = act(s, 0, { type: 'buildRoad', edge: t.vertices[0].edges[0] });
    const neighbour = t.vertices[0].vertices[0];
    expect(reject(s, 1, { type: 'buildSettlement', vertex: neighbour })).toMatch(/cannot build/);
  });

  it('runs the snake order and pays out the second settlement', () => {
    let s = newGame(3);
    const seats: number[] = [];
    let secondVertex = -1;
    while (s.phase === 'setup') {
      const seat = s.setup!.order[s.setup!.index];
      seats.push(seat);
      const v = legalSettlementSpots(s, seat, true)[0];
      if (s.setup!.index === 5) secondVertex = v;
      s = act(s, seat, { type: 'buildSettlement', vertex: v });
      s = act(s, seat, { type: 'buildRoad', edge: topo(s).vertices[v].edges.find((e) => s.roads[e] === null)! });
    }
    expect(seats).toEqual([0, 1, 2, 2, 1, 0]);
    const producing = topo(s).vertices[secondVertex].hexes.filter((h) => s.board.hexes[h].terrain !== 'desert').length;
    expect(handTotal(s.players[0].hand)).toBe(producing);
    expect(s.phase).toBe('play');
    expect(s.turn).toMatchObject({ seat: 0, n: 1, rolled: false });
  });
});

describe('dice and production', () => {
  function withBuildingOnToken(): { s: GameState; hex: number; vertex: number; token: number } {
    const s = playing();
    s.turn.rolled = false;
    const hex = s.board.hexes.find((h) => h.token !== null && h.id !== s.robber)!;
    const vertex = topo(s).hexes[hex.id].vertices[0];
    s.buildings[vertex] = { owner: 1, city: false, wall: false, metropolis: null };
    return { s, hex: hex.id, vertex, token: hex.token! };
  }

  it('pays 1 per settlement and 2 per city', () => {
    const { s, hex, vertex, token } = withBuildingOnToken();
    const res = { forest: 'lumber', hills: 'brick', pasture: 'wool', fields: 'grain', mountains: 'ore' }[
      s.board.hexes[hex].terrain as 'forest'
    ] as 'lumber';
    const before = s.players[1].hand[res];
    const after = rollTotal(s, token);
    expect(after.players[1].hand[res]).toBeGreaterThanOrEqual(before + 1);

    s.buildings[vertex]!.city = true;
    const afterCity = rollTotal(s, token);
    expect(afterCity.players[1].hand[res] - before).toBeGreaterThanOrEqual(2);
  });

  it('pays nothing from the hex under the robber', () => {
    const { s, hex, token } = withBuildingOnToken();
    s.robber = hex;
    // Remove any other hex with the same token so only the robbed hex could pay.
    for (const h of s.board.hexes) if (h.id !== hex && h.token === token) h.token = 12 === token ? 2 : 12;
    const after = rollTotal(s, token);
    expect(handTotal(after.players[1].hand)).toBe(0);
  });

  it('applies the bank shortage rule', () => {
    const { s, hex, token } = withBuildingOnToken();
    for (const h of s.board.hexes) if (h.id !== hex && h.token === token) h.token = token === 12 ? 2 : 12;
    const res = { forest: 'lumber', hills: 'brick', pasture: 'wool', fields: 'grain', mountains: 'ore' }[
      s.board.hexes[hex].terrain as 'forest'
    ] as 'lumber';
    // A second claimant on the same hex: with too little in the bank nobody gets anything.
    const other = topo(s).hexes[hex].vertices[3];
    s.buildings[other] = { owner: 2, city: true, wall: false, metropolis: null };
    s.bank[res] = 2;
    const shared = rollTotal(s, token);
    expect(shared.players[1].hand[res] + shared.players[2].hand[res]).toBe(0);
    // A single claimant gets whatever is left.
    s.buildings[other] = null;
    s.buildings[topo(s).hexes[hex].vertices[0]]!.city = true;
    s.bank[res] = 1;
    const single = rollTotal(s, token);
    expect(single.players[1].hand[res]).toBe(1);
  });
});

describe('building', () => {
  it('requires rolling first and the right resources', () => {
    const s = playing();
    s.turn.rolled = false;
    expect(reject(s, 0, { type: 'buildRoad', edge: 0 })).toMatch(/Roll the dice/);
    s.turn.rolled = true;
    s.buildings[0] = { owner: 0, city: false, wall: false, metropolis: null };
    const edge = topo(s).vertices[0].edges[0];
    expect(reject(s, 0, { type: 'buildRoad', edge })).toMatch(/Not enough resources/);
    setHand(s, 0, { brick: 1, lumber: 1 });
    const after = act(s, 0, { type: 'buildRoad', edge });
    expect(after.roads[edge]).toBe(0);
    expect(handTotal(after.players[0].hand)).toBe(0);
    expect(after.bank.brick).toBe(s.bank.brick + 1);
  });

  it('cannot extend a road through an opponent settlement', () => {
    const s = playing();
    const t = topo(s);
    const [e1, e2] = [t.coast[0], t.coast[1]];
    const shared = [t.edges[e1].a, t.edges[e1].b].find((v) => v === t.edges[e2].a || v === t.edges[e2].b)!;
    s.roads[e1] = 0;
    expect(canPlaceRoad(s, 0, e2)).toBe(true);
    s.buildings[shared] = { owner: 1, city: false, wall: false, metropolis: null };
    expect(canPlaceRoad(s, 0, e2)).toBe(false);
  });

  it('places settlements on own roads respecting distance, and upgrades to cities', () => {
    let s = playing();
    const t = topo(s);
    const e = t.coast[0];
    s.roads[e] = 0;
    const v = t.edges[e].a;
    setHand(s, 0, { brick: 1, lumber: 1, wool: 1, grain: 3, ore: 3 });
    const far = t.vertices.find((x) => !x.edges.some((ed) => s.roads[ed] === 0))!.id;
    expect(reject(s, 0, { type: 'buildSettlement', vertex: far })).toMatch(/cannot build/);
    s = act(s, 0, { type: 'buildSettlement', vertex: v });
    expect(reject(s, 0, { type: 'buildCity', vertex: far })).toMatch(/your settlements/);
    s = act(s, 0, { type: 'buildCity', vertex: v });
    expect(s.buildings[v]).toMatchObject({ owner: 0, city: true });
    expect(victoryPoints(s, 0)).toBe(2);
  });

  it('enforces piece limits', () => {
    const s = playing();
    let placed = 0;
    for (let e = 0; e < s.roads.length && placed < 15; e++) {
      s.roads[e] = 0;
      placed++;
    }
    s.buildings[topo(s).edges[0].a] = { owner: 0, city: false, wall: false, metropolis: null };
    setHand(s, 0, { brick: 5, lumber: 5 });
    const free = s.roads.findIndex((r, e) => r === null && canPlaceRoad(s, 0, e));
    expect(reject(s, 0, { type: 'buildRoad', edge: free })).toMatch(/No roads left/);
  });
});

describe('rolling a 7', () => {
  it('makes big hands discard half, then the roller moves the robber and steals', () => {
    let s = playing();
    s.turn.rolled = false;
    setHand(s, 0, { brick: 2 });
    setHand(s, 1, { wool: 9 });
    setHand(s, 2, { ore: 7 });
    s = rollTotal(s, 7);
    expect(s.pending).toEqual([{ kind: 'discard', seat: 1, count: 4, reason: 'seven' }]);
    expect(reject(s, 0, { type: 'endTurn' })).toMatch(/Waiting/);
    expect(reject(s, 1, { type: 'discard', cards: { wool: 3 } })).toMatch(/exactly 4/);
    s = act(s, 1, { type: 'discard', cards: { wool: 4 } });
    expect(s.players[1].hand.wool).toBe(5);
    expect(s.pending).toEqual([{ kind: 'robber', seat: 0, reason: 'seven' }]);

    const hex = s.board.hexes.find((h) => h.id !== s.robber)!.id;
    const vertex = topo(s).hexes[hex].vertices[0];
    s.buildings[vertex] = { owner: 1, city: false, wall: false, metropolis: null };
    expect(reject(s, 0, { type: 'moveRobber', hex: s.robber, victim: null })).toMatch(/different hex/);
    expect(reject(s, 0, { type: 'moveRobber', hex, victim: null })).toMatch(/Choose a player/);
    s = act(s, 0, { type: 'moveRobber', hex, victim: 1 });
    expect(s.robber).toBe(hex);
    expect(s.players[1].hand.wool).toBe(4);
    expect(s.players[0].hand.wool).toBe(1);
    expect(s.pending).toHaveLength(0);
  });
});

describe('development cards', () => {
  it('cannot be played the turn they are bought, and only one per turn', () => {
    let s = playing();
    setHand(s, 0, { wool: 2, grain: 2, ore: 2 });
    s.devDeck.push('monopoly', 'yearOfPlenty');
    s = act(s, 0, { type: 'buyDevCard' });
    expect(s.players[0].devCards).toEqual([{ type: 'yearOfPlenty', boughtOn: s.turn.n }]);
    expect(reject(s, 0, { type: 'playYearOfPlenty', resources: ['ore', 'ore'] })).toMatch(/turn you bought/);
    s.players[0].devCards.push({ type: 'monopoly', boughtOn: 0 });
    s.players[0].devCards[0].boughtOn = 0;
    s = act(s, 0, { type: 'playYearOfPlenty', resources: ['ore', 'brick'] });
    expect(s.players[0].hand).toMatchObject({ ore: 2, brick: 1 });
    expect(reject(s, 0, { type: 'playMonopoly', resource: 'ore' })).toMatch(/already played/);
  });

  it('knight can be played before rolling and builds the largest army', () => {
    let s = playing();
    s.turn.rolled = false;
    s.players[0].knightsPlayed = 2;
    s.players[0].devCards.push({ type: 'knight', boughtOn: 0 });
    s = act(s, 0, { type: 'playKnight' });
    expect(s.largestArmy).toBe(0);
    expect(s.pending[0]).toMatchObject({ kind: 'robber', seat: 0, reason: 'knight' });
    const hex = s.board.hexes.find((h) => h.id !== s.robber)!.id;
    s = act(s, 0, { type: 'moveRobber', hex, victim: null });
    expect(s.turn.rolled).toBe(false);
    // Another player needs strictly more knights to take it.
    s.players[1].knightsPlayed = 3;
    expect(s.largestArmy).toBe(0);
  });

  it('monopoly takes every card of a type; road building gives two free roads', () => {
    let s = playing();
    setHand(s, 1, { ore: 3 });
    setHand(s, 2, { ore: 2, wool: 1 });
    s.players[0].devCards.push({ type: 'monopoly', boughtOn: 0 }, { type: 'roadBuilding', boughtOn: 0 });
    s = act(s, 0, { type: 'playMonopoly', resource: 'ore' });
    expect(s.players[0].hand.ore).toBe(5);
    expect(s.players[2].hand).toMatchObject({ ore: 0, wool: 1 });

    s.turn.devPlayed = false;
    const t = topo(s);
    s.buildings[t.edges[t.coast[0]].a] = { owner: 0, city: false, wall: false, metropolis: null };
    s = act(s, 0, { type: 'playRoadBuilding' });
    expect(s.pending[0]).toMatchObject({ kind: 'freeRoads', count: 2 });
    const e1 = s.roads.findIndex((r, e) => r === null && canPlaceRoad(s, 0, e));
    s = act(s, 0, { type: 'buildRoad', edge: e1 });
    const e2 = s.roads.findIndex((r, e) => r === null && canPlaceRoad(s, 0, e));
    s = act(s, 0, { type: 'buildRoad', edge: e2 });
    expect(s.pending).toHaveLength(0);
    expect(handTotal(s.players[0].hand)).toBe(5);
  });
});

describe('longest road', () => {
  it('needs 5 segments, keeps the holder on ties and is lost when cut', () => {
    let s = playing();
    const t = topo(s);
    for (let i = 0; i < 4; i++) s.roads[t.coast[i]] = 0;
    setHand(s, 0, { brick: 3, lumber: 3 });
    s = act(s, 0, { type: 'buildRoad', edge: t.coast[4] });
    expect(s.longestRoad).toBe(0);
    expect(s.roadLengths[0]).toBe(5);
    expect(victoryPoints(s, 0)).toBe(2);
  });
});

describe('longest road awards', () => {
  it('ties keep the holder; a cut road hands it to a unique leader', () => {
    let s = playing();
    const t = topo(s);
    for (let i = 0; i < 5; i++) s.roads[t.coast[i]] = 0;
    for (let i = 10; i < 15; i++) s.roads[t.coast[i]] = 1;
    s.longestRoad = 0;
    setHand(s, 0, { brick: 1, lumber: 1 });
    // Any action recomputes: tie → holder keeps.
    s = act(s, 0, { type: 'offerTrade', give: { brick: 1 }, want: { ore: 1 }, to: [] });
    expect(s.longestRoad).toBe(0);

    // Player 2 cuts player 0's road in the middle with a settlement.
    const e2 = t.edges[t.coast[2]];
    const e3 = t.edges[t.coast[3]];
    const cut = [e2.a, e2.b].find((v) => v === e3.a || v === e3.b)!;
    s.buildings[cut] = { owner: 2, city: false, wall: false, metropolis: null };
    s = act(s, 0, { type: 'offerTrade', give: { lumber: 1 }, want: { ore: 1 }, to: [] });
    expect(s.roadLengths[0]).toBe(3);
    expect(s.longestRoad).toBe(1);
  });

  it('is set aside when the holder is cut and others tie', () => {
    let s = playing(4);
    const t = topo(s);
    for (let i = 0; i < 6; i++) s.roads[t.coast[i]] = 0;
    for (let i = 10; i < 15; i++) s.roads[t.coast[i]] = 1;
    for (let i = 20; i < 25; i++) s.roads[t.coast[i]] = 2;
    s.longestRoad = 0;
    const e2 = t.edges[t.coast[2]];
    const e3 = t.edges[t.coast[3]];
    s.buildings[[e2.a, e2.b].find((v) => v === e3.a || v === e3.b)!] = { owner: 3, city: false, wall: false, metropolis: null };
    setHand(s, 0, { brick: 1 });
    s = act(s, 0, { type: 'offerTrade', give: { brick: 1 }, want: { ore: 1 }, to: [] });
    expect(s.longestRoad).toBeNull();
  });
});

describe('trading', () => {
  it('uses 4:1, 3:1 and 2:1 harbor rates', () => {
    const s = playing();
    const t = topo(s);
    expect(bankRatio(s, 0, 'wool')).toBe(4);
    const any = s.board.harbors.find((h) => h.kind === 'any')!;
    s.buildings[t.edges[any.edge].a] = { owner: 0, city: false, wall: false, metropolis: null };
    expect(bankRatio(s, 0, 'wool')).toBe(3);
    const special = s.board.harbors.find((h) => h.kind !== 'any')!;
    s.buildings[t.edges[special.edge].a] = { owner: 0, city: false, wall: false, metropolis: null };
    expect(bankRatio(s, 0, special.kind as 'wool')).toBe(2);

    setHand(s, 0, { [special.kind]: 2 });
    const r = act(s, 0, { type: 'bankTrade', give: special.kind as 'wool', get: 'grain', count: 1 });
    expect(r.players[0].hand.grain).toBe(1);
    expect(reject(s, 0, { type: 'bankTrade', give: 'grain', get: 'grain', count: 1 })).toMatch(/different/);
  });

  it('runs offer → accept → confirm, and supports counter-offers', () => {
    let s = playing();
    setHand(s, 0, { brick: 2 });
    setHand(s, 1, { ore: 1 });
    setHand(s, 2, { wool: 1 });
    expect(reject(s, 0, { type: 'offerTrade', give: { brick: 1 }, want: {}, to: [] })).toMatch(/both sides/);
    expect(reject(s, 0, { type: 'offerTrade', give: { brick: 1 }, want: { brick: 1 }, to: [] })).toMatch(/same card/);
    s = act(s, 0, { type: 'offerTrade', give: { brick: 1 }, want: { ore: 1 }, to: [] });
    const id = s.trades[0].id;
    expect(reject(s, 2, { type: 'respondTrade', id, accept: true })).toMatch(/don't have/);
    s = act(s, 1, { type: 'respondTrade', id, accept: true });
    expect(reject(s, 0, { type: 'confirmTrade', id, partner: 2 })).toMatch(/not accepted/);
    s = act(s, 0, { type: 'confirmTrade', id, partner: 1 });
    expect(s.players[0].hand).toMatchObject({ brick: 1, ore: 1 });
    expect(s.players[1].hand).toMatchObject({ brick: 1, ore: 0 });

    // Counter-offer from player 2 to the active player, accepted immediately.
    s = act(s, 2, { type: 'offerTrade', give: { wool: 1 }, want: { brick: 1 }, to: [1] });
    expect(s.trades.at(-1)!.to).toEqual([0]);
    s = act(s, 0, { type: 'respondTrade', id: s.trades.at(-1)!.id, accept: true });
    expect(s.players[0].hand).toMatchObject({ brick: 0, wool: 1, ore: 1 });
    expect(s.players[2].hand).toMatchObject({ brick: 1, wool: 0 });

    // Offers are cleared at the end of the turn.
    s = act(s, 0, { type: 'offerTrade', give: { ore: 1 }, want: { grain: 1 }, to: [] });
    s = act(s, 0, { type: 'endTurn' });
    expect(s.trades).toHaveLength(0);
  });
});

describe('victory', () => {
  it('lets a player who reached the target off-turn win when their turn starts', () => {
    let s = playing();
    s.settings.vpToWin = 4;
    const t = topo(s);
    for (const i of [0, 10, 20]) s.buildings[t.edges[t.coast[i]].a] = { owner: 1, city: false, wall: false, metropolis: null };
    s.players[1].devCards.push({ type: 'victoryPoint', boughtOn: 0 });
    expect(s.phase).toBe('play');
    s = act(s, 0, { type: 'endTurn' });
    expect(s.phase).toBe('ended');
    expect(s.winner).toBe(1);
  });

  it('declares the active player the winner as soon as they hit the target', () => {
    let s = playing();
    s.settings.vpToWin = 3;
    const t = topo(s);
    s.buildings[t.edges[t.coast[0]].a] = { owner: 0, city: true, wall: false, metropolis: null };
    s.roads[t.coast[0]] = 0;
    s.roads[t.coast[1]] = 0;
    const [v] = legalSettlementSpots(s, 0);
    expect(v).toBeTypeOf('number');
    expect(reject(s, 0, { type: 'buildSettlement', vertex: undefined as unknown as number })).toMatch(/cannot build/);
    setHand(s, 0, { brick: 1, lumber: 1, wool: 1, grain: 1 });
    s = act(s, 0, { type: 'buildSettlement', vertex: v });
    expect(s.phase).toBe('ended');
    expect(s.winner).toBe(0);
    expect(applyAction(s, 0, { type: 'endTurn' }).ok).toBe(false);
  });
});

describe('player views', () => {
  it('hide opponents cards, decks and the RNG', () => {
    let s = playing();
    setHand(s, 1, { ore: 3 });
    s.players[1].devCards.push({ type: 'victoryPoint', boughtOn: 0 });
    setHand(s, 0, { wool: 1, grain: 1, ore: 1 });
    s = act(s, 0, { type: 'buyDevCard' });
    const v = viewFor(s, 0);
    expect(v.players[1].hand.ore).toBe(0);
    expect(v.players[1].handCount).toBe(3);
    expect(v.players[1].devCards).toEqual([]);
    expect(v.players[1].devCount).toBe(1);
    expect(v.players[1].vp).toBeNull();
    expect(v.players[0].devCards).toHaveLength(1);
    expect(JSON.stringify(v)).not.toContain('"rng"');
    expect((v as unknown as Record<string, unknown>).devDeck).toBeUndefined();
    const bought = v.log.at(-1)!;
    expect(bought.secret).toBeDefined();
    const other = viewFor(s, 1).log.at(-1)!;
    expect(other.type).toBe('devBought');
    expect(other.secret).toBeUndefined();
    expect(viewFor(s, null).players[0].devCards).toEqual([]);
  });
});
