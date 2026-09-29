import { describe, expect, it } from 'vitest';
import { applyAction } from '../apply';
import { checkProgressLimit } from '../ck/events';
import { relocationSpots, roadMoveTargets } from '../ck/queries';
import { handLimit, topo } from '../queries';
import type { GameState, ProgressCardType } from '../types';
import { makeCtx } from '../state';
import { victoryPoints } from '../vp';
import { act, autoSetup, clearBoard, newGame, reject, rollTotal, setHand } from './kit';

/** A C&K game after setup with an empty board; player 0 to act, already rolled. */
function ck(players = 3): GameState {
  const s = autoSetup(newGame(players, 11, 'ck'));
  clearBoard(s);
  s.players.forEach((_, i) => setHand(s, i, {}));
  s.turn.rolled = true;
  s.turn.dice = { red: 2, yellow: 3, event: 'ship' };
  s.longestRoad = null;
  return s;
}

function city(s: GameState, seat: number, v: number, extra: Partial<{ wall: boolean; metropolis: 'trade' | 'politics' | 'science' | null }> = {}) {
  s.buildings[v] = { owner: seat, city: true, wall: false, metropolis: null, ...extra };
}

function giveCard(s: GameState, seat: number, type: ProgressCardType, id = 900 + Math.floor(Math.random() * 1000)) {
  const track = (['alchemist', 'crane', 'engineer', 'inventor', 'irrigation', 'medicine', 'mining', 'printer', 'roadBuilding', 'smith'] as string[]).includes(type)
    ? 'science'
    : (['commercialHarbor', 'masterMerchant', 'merchant', 'merchantFleet', 'resourceMonopoly', 'tradeMonopoly'] as string[]).includes(type)
      ? 'trade'
      : 'politics';
  s.players[seat].progress.push({ id, type, track });
  return id;
}

describe('C&K setup and production', () => {
  it('places a city in the second setup round and stocks commodities', () => {
    const s = autoSetup(newGame(3, 11, 'ck'));
    const cities = s.buildings.filter((b) => b?.city);
    expect(cities).toHaveLength(3);
    expect(s.bank).toMatchObject({ paper: 12, cloth: 12, coin: 12 });
    expect(s.settings.vpToWin).toBe(13);
    expect(s.progressDecks.science).toHaveLength(18);
  });

  it('pays a resource and a commodity for cities on forest/pasture/mountains', () => {
    const s = ck();
    s.turn.rolled = false;
    const forest = s.board.hexes.find((h) => h.terrain === 'forest' && h.id !== s.robber)!;
    for (const h of s.board.hexes) if (h.id !== forest.id && h.token === forest.token) h.token = forest.token === 12 ? 2 : 12;
    city(s, 1, topo(s).hexes[forest.id].vertices[0]);
    const after = rollTotal(s, forest.token!);
    const total = after.turn.dice!.red + after.turn.dice!.yellow;
    expect(total).toBe(forest.token);
    if (after.turn.dice!.event === 'ship' && after.barbarian.attacks > 0) return; // an attack could reduce the city first
    expect(after.players[1].hand).toMatchObject({ lumber: 1, paper: 1 });
  });
});

describe('knights', () => {
  function withRoads(s: GameState) {
    const t = topo(s);
    // Player 0 owns a chain of 4 coastal roads; player 1 one road touching its end.
    for (let i = 0; i < 4; i++) s.roads[t.coast[i]] = 0;
    s.roads[t.coast[4]] = 1;
    const vs = [0, 1, 2, 3, 4].map((i) => {
      const e1 = t.edges[t.coast[i]];
      const e2 = t.edges[t.coast[i + 1]];
      return [e1.a, e1.b].find((v) => v === e2.a || v === e2.b)!;
    });
    return vs;
  }

  it('recruits next to own roads, activates with grain and acts only on a later turn', () => {
    let s = ck();
    const vs = withRoads(s);
    setHand(s, 0, { wool: 1, ore: 1, grain: 1 });
    const far = s.buildings.findIndex((_, v) => !topo(s).vertices[v].edges.some((e) => s.roads[e] === 0));
    expect(reject(s, 0, { type: 'buildKnight', vertex: far })).toMatch(/next to your roads/);
    s = act(s, 0, { type: 'buildKnight', vertex: vs[0] });
    expect(s.knights[vs[0]]).toMatchObject({ owner: 0, level: 1, active: false });
    s = act(s, 0, { type: 'activateKnight', vertex: vs[0] });
    expect(s.knights[vs[0]]!.active).toBe(true);
    expect(reject(s, 0, { type: 'moveKnight', from: vs[0], to: vs[2] })).toMatch(/not activated this turn/);
    s.turn.n++;
    s = act(s, 0, { type: 'moveKnight', from: vs[0], to: vs[2] });
    expect(s.knights[vs[2]]).toMatchObject({ owner: 0, active: false });
    expect(s.knights[vs[0]]).toBeNull();
  });

  it('displaces weaker knights, whose owner must relocate them', () => {
    let s = ck();
    const vs = withRoads(s);
    s.knights[vs[1]] = { id: 1, owner: 0, level: 2, active: true, activatedOn: 0, promotedOn: -1 };
    s.knights[vs[3]] = { id: 2, owner: 1, level: 1, active: true, activatedOn: 0, promotedOn: -1 };
    s = act(s, 0, { type: 'moveKnight', from: vs[1], to: vs[3] });
    expect(s.knights[vs[3]]!.owner).toBe(0);
    expect(s.pending[0]).toMatchObject({ kind: 'relocateKnight', seat: 1 });
    const spot = topo(s).edges[topo(s).coast[4]];
    const dest = [spot.a, spot.b].find((v) => v !== vs[3])!;
    s = act(s, 1, { type: 'relocateKnight', vertex: dest });
    expect(s.knights[dest]).toMatchObject({ owner: 1, level: 1, active: true });
    // Equal strength can't be displaced.
    s.knights[vs[0]] = { id: 3, owner: 0, level: 1, active: true, activatedOn: 0, promotedOn: -1 };
    s.knights[vs[2]] = { id: 4, owner: 1, level: 2, active: true, activatedOn: 0, promotedOn: -1 };
    expect(reject(s, 0, { type: 'moveKnight', from: vs[0], to: vs[2] })).toMatch(/cannot reach/);
  });

  it('Intrigue clears the spot: the displaced knight cannot go back there', () => {
    let s = ck();
    const vs = withRoads(s);
    // Player 1's knight stands on player 0's road; player 0 needs no knight of their own.
    s.knights[vs[3]] = { id: 2, owner: 1, level: 2, active: true, activatedOn: 0, promotedOn: -1 };
    s = act(s, 0, { type: 'playProgress', card: giveCard(s, 0, 'intrigue', 1), params: { vertex: vs[3] } });
    expect(s.knights[vs[3]]).toBeNull();
    expect(s.pending[0]).toMatchObject({ kind: 'relocateKnight', seat: 1, from: vs[3] });
    expect(reject(s, 1, { type: 'relocateKnight', vertex: vs[3] })).toMatch(/along your roads/);
    s = act(s, 1, { type: 'relocateKnight', vertex: vs[4] });
    expect(s.knights[vs[4]]).toMatchObject({ owner: 1, level: 2, active: true });
    expect(s.knights[vs[3]]).toBeNull();
  });

  it('relocates a displaced knight only along its own roads, or loses it', () => {
    const s = ck();
    const vs = withRoads(s);
    const t = topo(s);
    const far = t.edges[t.coast[10]];
    s.roads[t.coast[10]] = 1; // player 1's other road, not connected to vs[3]
    s.knights[vs[1]] = { id: 1, owner: 0, level: 2, active: true, activatedOn: 0, promotedOn: -1 };
    s.knights[vs[3]] = { id: 2, owner: 1, level: 1, active: true, activatedOn: 0, promotedOn: -1 };
    const moved = act(s, 0, { type: 'moveKnight', from: vs[1], to: vs[3] });
    expect(relocationSpots(moved, 1, vs[3])).toEqual([vs[4]]);
    expect(reject(moved, 1, { type: 'relocateKnight', vertex: far.a })).toMatch(/along your roads/);
    // With the only connected spot taken, the knight is lost although far.a and far.b are free.
    s.buildings[vs[4]] = { owner: 2, city: false, wall: false, metropolis: null };
    const lost = act(s, 0, { type: 'moveKnight', from: vs[1], to: vs[3] });
    expect(lost.pending).toEqual([]);
    expect(lost.knights.some((k) => k?.owner === 1)).toBe(false);
    expect(lost.log).toContainEqual(expect.objectContaining({ type: 'knightRemoved', seat: 1, at: vs[3] }));
  });

  it('needs a Fortress (politics 3) for mighty knights', () => {
    let s = ck();
    const vs = withRoads(s);
    s.knights[vs[0]] = { id: 1, owner: 0, level: 2, active: false, activatedOn: -1, promotedOn: -1 };
    setHand(s, 0, { wool: 2, ore: 2 });
    expect(reject(s, 0, { type: 'promoteKnight', vertex: vs[0] })).toMatch(/cannot be promoted/);
    s.players[0].improvements.politics = 3;
    s = act(s, 0, { type: 'promoteKnight', vertex: vs[0] });
    expect(s.knights[vs[0]]!.level).toBe(3);
  });
});

describe('barbarians', () => {
  function atTheGates(s: GameState) {
    s.barbarian.position = 6;
    s.turn.rolled = false;
    return s;
  }

  function attack(s: GameState): GameState {
    for (let attempt = 0; attempt < 5000; attempt++) {
      const trial = structuredClone(s);
      trial.rng = (s.rng + attempt * 2654435761) >>> 0;
      const r = applyAction(trial, trial.turn.seat, { type: 'rollDice' });
      if (r.ok && r.state.turn.dice?.event === 'ship' && r.state.turn.dice.red + r.state.turn.dice.yellow !== 7) return r.state;
    }
    throw new Error('no ship roll found');
  }

  it('rewards the single strongest defender when the island holds', () => {
    const s = atTheGates(ck());
    const t = topo(s);
    city(s, 1, t.edges[t.coast[0]].a);
    s.knights[t.edges[t.coast[10]].a] = { id: 1, owner: 2, level: 2, active: true, activatedOn: 0, promotedOn: -1 };
    const after = attack(s);
    const ev = after.log.find((e) => e.type === 'barbarianAttack')!;
    expect(ev).toMatchObject({ strength: 1, defense: 2, won: true, defenders: [2] });
    expect(after.players[2].defender).toBe(1);
    expect(after.knights[t.edges[t.coast[10]].a]!.active).toBe(false);
    expect(after.barbarian).toEqual({ position: 0, attacks: 1 });
  });

  it('takes a city from the weakest defender and spares metropolises', () => {
    const s = atTheGates(ck());
    const t = topo(s);
    const c1 = t.edges[t.coast[0]].a;
    const c2 = t.edges[t.coast[10]].a;
    city(s, 1, c1);
    city(s, 2, c2, { metropolis: 'trade' });
    const after = attack(s);
    expect(after.buildings[c1]).toMatchObject({ owner: 1, city: false });
    expect(after.buildings[c2]).toMatchObject({ owner: 2, city: true });
    expect(victoryPoints(after, 1)).toBe(1);
  });

  it('lets a player with several cities choose which one the barbarians take', () => {
    const s = atTheGates(ck());
    const t = topo(s);
    const c1 = t.edges[t.coast[0]].a;
    const c2 = t.edges[t.coast[10]].a;
    city(s, 1, c1);
    city(s, 1, c2, { wall: true });
    let after = attack(s);
    expect(after.pending).toContainEqual({ kind: 'loseCity', seat: 1 });
    expect(after.buildings[c1]).toMatchObject({ city: true });
    expect(reject(after, 1, { type: 'loseCity', vertex: t.edges[t.coast[20]].a })).toBeTruthy();
    after = act(after, 1, { type: 'loseCity', vertex: c2 });
    expect(after.buildings[c2]).toMatchObject({ owner: 1, city: false, wall: false });
    expect(after.buildings[c1]).toMatchObject({ owner: 1, city: true });
    expect(after.pending.some((p) => p.kind === 'loseCity')).toBe(false);
  });

  it('keeps the robber away until the first attack', () => {
    let s = ck();
    s.turn.rolled = false;
    setHand(s, 1, { wool: 8 });
    s = rollTotal(s, 7);
    const kinds = s.pending.map((p) => p.kind);
    expect(kinds).toEqual(['discard']);
    s = act(s, 1, { type: 'discard', cards: { wool: 4 } });
    expect(s.pending).toHaveLength(0);
  });
});

describe('improvements and progress cards', () => {
  it('charges n commodities for level n, needs a city, and grants the metropolis at level 4', () => {
    let s = ck();
    const t = topo(s);
    setHand(s, 0, { cloth: 10 });
    expect(reject(s, 0, { type: 'improveCity', track: 'trade' })).toMatch(/need a city/);
    city(s, 0, t.edges[t.coast[0]].a);
    for (let level = 1; level <= 4; level++) s = act(s, 0, { type: 'improveCity', track: 'trade' });
    expect(s.players[0].improvements.trade).toBe(4);
    expect(s.players[0].hand.cloth).toBe(0);
    expect(s.metropolis.trade).toBe(0);
    expect(s.buildings[t.edges[t.coast[0]].a]!.metropolis).toBe('trade');
    expect(victoryPoints(s, 0)).toBe(4);
  });

  it('steals the metropolis by reaching level 5 first', () => {
    let s = ck();
    const t = topo(s);
    city(s, 1, t.edges[t.coast[10]].a, { metropolis: 'science' });
    s.metropolis.science = 1;
    s.players[1].improvements.science = 4;
    city(s, 0, t.edges[t.coast[0]].a);
    s.players[0].improvements.science = 4;
    setHand(s, 0, { paper: 5 });
    s = act(s, 0, { type: 'improveCity', track: 'science' });
    expect(s.metropolis.science).toBe(0);
    expect(s.buildings[t.edges[t.coast[10]].a]!.metropolis).toBeNull();
    expect(s.buildings[t.edges[t.coast[0]].a]!.metropolis).toBe('science');
  });

  it('draws progress cards when the red die is within level + 1', () => {
    const s = ck();
    s.turn.rolled = false;
    s.players[1].improvements.politics = 2;
    for (let attempt = 0; attempt < 5000; attempt++) {
      const trial = structuredClone(s);
      trial.rng = (s.rng + attempt * 2654435761) >>> 0;
      const r = applyAction(trial, 0, { type: 'rollDice' });
      if (!r.ok || r.state.turn.dice?.event !== 'politics' || r.state.turn.dice.red + r.state.turn.dice.yellow === 7) continue;
      const drew = r.state.players[1].progress.length + r.state.players[1].progressVP;
      expect(drew).toBe(r.state.turn.dice.red <= 3 ? 1 : 0);
      if (r.state.turn.dice.red <= 3) return;
    }
    throw new Error('no qualifying roll');
  });

  it('Trading House gives 2:1 commodities; walls add 2 to the hand limit', () => {
    let s = ck();
    const t = topo(s);
    const harborCorners = new Set(s.board.harbors.flatMap((h) => [t.edges[h.edge].a, t.edges[h.edge].b]));
    const c = t.vertices.find((v) => !harborCorners.has(v.id))!.id;
    city(s, 0, c);
    setHand(s, 0, { coin: 2, brick: 2 });
    expect(reject(s, 0, { type: 'bankTrade', give: 'coin', get: 'ore', count: 1 })).toMatch(/You need 4 coin/);
    s.players[0].improvements.trade = 3;
    s = act(s, 0, { type: 'bankTrade', give: 'coin', get: 'ore', count: 1 });
    expect(s.players[0].hand.ore).toBe(1);
    expect(handLimit(s, 0)).toBe(7);
    s = act(s, 0, { type: 'buildWall', vertex: c });
    expect(handLimit(s, 0)).toBe(9);
  });

  it('rolls the chosen dice as soon as the Alchemist is played', () => {
    const s = ck();
    s.turn.rolled = false;
    s.turn.dice = null;
    const after = act(s, 0, { type: 'playProgress', card: giveCard(s, 0, 'alchemist', 1), params: { red: 2, yellow: 4 } });
    expect(after.turn.rolled).toBe(true);
    expect(after.turn.dice).toMatchObject({ red: 2, yellow: 4 });
    expect(after.turn.alchemist).toBeNull();
    expect(after.log.some((e) => e.type === 'diceRolled')).toBe(true);
  });

  it('plays a selection of progress cards', () => {
    let s = ck();
    const t = topo(s);
    const c = t.edges[t.coast[0]].a;
    city(s, 0, c);
    s.roads[t.coast[0]] = 0;
    // Merchant: +1 VP while held.
    const hex = t.vertices[c].hexes.find((h) => s.board.hexes[h].terrain !== 'desert')!;
    s = act(s, 0, { type: 'playProgress', card: giveCard(s, 0, 'merchant', 1), params: { hex } });
    expect(s.merchant).toEqual({ hex, owner: 0 });
    expect(victoryPoints(s, 0)).toBe(3);
    // Resource Monopoly: up to 2 from each opponent.
    setHand(s, 1, { ore: 5 });
    setHand(s, 2, { ore: 1 });
    s = act(s, 0, { type: 'playProgress', card: giveCard(s, 0, 'resourceMonopoly', 2), params: { card: 'ore' } });
    expect(s.players[0].hand.ore).toBe(3);
    // Wedding: richer opponents each give 2 cards of their choice.
    s.buildings[t.edges[t.coast[10]].a] = { owner: 1, city: true, wall: false, metropolis: 'trade' };
    s = act(s, 0, { type: 'playProgress', card: giveCard(s, 0, 'wedding', 3) });
    expect(s.pending).toEqual([{ kind: 'giveCards', seat: 1, to: 0, count: 2 }]);
    s = act(s, 1, { type: 'giveCards', cards: { ore: 2 } });
    expect(s.players[0].hand.ore).toBe(5);
    // Engineer: a free wall.
    s = act(s, 0, { type: 'playProgress', card: giveCard(s, 0, 'engineer', 4), params: { vertex: c } });
    expect(s.buildings[c]!.wall).toBe(true);
    // Spy: see and take a card; the victim's cards stay hidden from others.
    giveCard(s, 2, 'warlord', 50);
    s = act(s, 0, { type: 'playProgress', card: giveCard(s, 0, 'spy', 5), params: { victim: 2 } });
    expect(s.pending[0]).toMatchObject({ kind: 'spy', seat: 0, victim: 2 });
    s = act(s, 0, { type: 'takeProgress', card: 50 });
    expect(s.players[0].progress.map((p) => p.type)).toContain('warlord');
    // Diplomat on my own open road moves it: it stays until I pick the new spot, and only a road will do.
    s = act(s, 0, { type: 'playProgress', card: giveCard(s, 0, 'diplomat', 6), params: { edge: t.coast[0] } });
    expect(s.roads[t.coast[0]]).toBe(0);
    expect(s.pending[0]).toEqual({ kind: 'moveRoad', seat: 0, from: t.coast[0] });
    const to = roadMoveTargets(s, 0, t.coast[0])[0];
    expect(to).toBeDefined();
    expect(reject(s, 0, { type: 'buildRoad', edge: t.coast[0] })).toMatch(/cannot go there/);
    s = act(s, 0, { type: 'buildRoad', edge: to });
    expect(s.roads[t.coast[0]]).toBeNull();
    expect(s.roads[to]).toBe(0);
    expect(s.pending).toHaveLength(0);
  });

  it('lets a 5th progress card be played on your own turn; the limit applies when the turn ends', () => {
    let s = ck();
    (['warlord', 'wedding', 'saboteur', 'crane', 'bishop'] as const).forEach((type, i) => giveCard(s, 0, type, 10 + i));
    checkProgressLimit(makeCtx(s, 0), 0);
    expect(s.pending).toHaveLength(0);
    // Still five at the end of the turn: discard one, then the turn passes on its own.
    s = act(s, 0, { type: 'endTurn' });
    expect(s.pending).toEqual([{ kind: 'discardProgress', seat: 0, endTurn: true }]);
    expect(s.turn.seat).toBe(0);
    s = act(s, 0, { type: 'discardProgress', card: 10 });
    expect(s.pending).toHaveLength(0);
    expect(s.players[0].progress).toHaveLength(4);
    expect(s.turn.seat).toBe(1);
  });

  it('ends the turn straight away once the 5th progress card has been played', () => {
    let s = ck();
    (['warlord', 'wedding', 'saboteur', 'crane', 'bishop'] as const).forEach((type, i) => giveCard(s, 0, type, 10 + i));
    s = act(s, 0, { type: 'playProgress', card: 13 });
    s = act(s, 0, { type: 'endTurn' });
    expect(s.pending).toHaveLength(0);
    expect(s.turn.seat).toBe(1);
  });

  it('asks for a discard at once when a 5th progress card arrives on someone else’s turn', () => {
    const s = ck();
    (['warlord', 'wedding', 'saboteur', 'crane', 'bishop'] as const).forEach((type, i) => giveCard(s, 1, type, 10 + i));
    checkProgressLimit(makeCtx(s, 0), 1);
    expect(s.pending).toEqual([{ kind: 'discardProgress', seat: 1 }]);
  });

  it('Diplomat can keep your own road where it is', () => {
    let s = ck();
    const t = topo(s);
    city(s, 0, t.edges[t.coast[0]].a);
    s.roads[t.coast[0]] = 0;
    s = act(s, 0, { type: 'playProgress', card: giveCard(s, 0, 'diplomat', 1), params: { edge: t.coast[0] } });
    s = act(s, 0, { type: 'skipFreeRoads' });
    expect(s.roads[t.coast[0]]).toBe(0);
    expect(s.pending).toHaveLength(0);
  });

  it('Deserter gives a weaker knight when none of the same strength is left', () => {
    let s = ck();
    const t = topo(s);
    // Seat 0: both strong knights and one basic knight already out, plus a road with room for more.
    const home = t.edges[t.coast[0]].a;
    city(s, 0, home);
    s.roads[t.coast[0]] = 0;
    const spare = t.coast.slice(6, 9).map((e) => t.edges[e].a);
    spare.forEach((v, i) => (s.knights[v] = { id: 100 + i, owner: 0, level: i < 2 ? 2 : 1, active: false, activatedOn: -1, promotedOn: -1 }));
    // Seat 1: one strong knight.
    const theirs = t.edges[t.coast[12]].a;
    s.knights[theirs] = { id: 200, owner: 1, level: 2, active: true, activatedOn: -1, promotedOn: -1 };
    s = act(s, 0, { type: 'playProgress', card: giveCard(s, 0, 'deserter', 1), params: { victim: 1 } });
    s = act(s, 1, { type: 'removeKnight', vertex: theirs });
    expect(s.pending).toEqual([{ kind: 'deserterPlace', seat: 0, level: 1 }]);
    const spot = t.edges[t.coast[0]].b;
    s = act(s, 0, { type: 'placeKnight', vertex: spot });
    expect(s.knights[spot]).toMatchObject({ owner: 0, level: 1 });
  });
});
