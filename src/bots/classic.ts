/**
 * Heuristic bot for the base game. Stateless: every call looks at the current view and returns
 * the single next action for `seat` (or null when it is waiting on someone else).
 */
import {
  CARDS,
  COSTS,
  PIPS,
  RESOURCES,
  distanceRuleOk,
  handTotal,
  hasCards,
  legalCitySpots,
  legalRoadSpots,
  legalSettlementSpots,
  legalSetupRoads,
  legalSetupShips,
  longestRoadLength,
  piecesLeft,
  robberTargets,
  robberVictims,
  topo,
  tradesAwaiting,
  type Action,
  type Card,
  type PartialHand,
  type PlayerView,
  type Prompt,
  type Resource,
  type TradeOffer,
} from '@/engine';
import { bankTradeToward, deficit, productionOf, resourceWeights, vertexScore } from './eval';
import { bestShip, islandBonus, settleable } from './voyage';

export interface BotOptions {
  /** Set by the runner when the bot's own trade offer has been open for a while. */
  tradeTimedOut?: boolean;
}

export interface Goal {
  action: Action;
  cost: PartialHand;
  value: number;
}

const argmax = <T>(items: T[], score: (t: T) => number): T | undefined => {
  let best: T | undefined;
  let bestScore = -Infinity;
  for (const item of items) {
    const s = score(item);
    if (s > bestScore) {
      bestScore = s;
      best = item;
    }
  }
  return best;
};

export function classicBotAction(view: PlayerView, seat: number, opts: BotOptions = {}): Action | null {
  const prompt = view.pending.find((p) => p.seat === seat);
  if (prompt) return resolvePrompt(view, seat, prompt);
  if (view.pending.length) return null;

  const awaiting = tradesAwaiting(view, seat);
  if (awaiting.length) {
    const offer = view.trades.find((t) => t.id === awaiting[0])!;
    // An open ("?") offer can't be accepted; the bot passes rather than haggling.
    return { type: 'respondTrade', id: offer.id, accept: !offer.open && shouldAcceptTrade(view, seat, offer) };
  }

  if (view.phase === 'setup') {
    return view.setup && view.setup.order[view.setup.index] === seat ? setupMove(view, seat) : null;
  }
  if (view.phase !== 'play' || view.turn.seat !== seat) return null;

  if (!view.turn.rolled) {
    if (canPlayDev(view, seat, 'knight') && knightIsUseful(view, seat)) return { type: 'playKnight' };
    return { type: 'rollDice' };
  }

  for (const offer of view.trades.filter((t) => t.from === seat)) {
    if (offer.accepted.length) return { type: 'confirmTrade', id: offer.id, partner: offer.accepted[0] };
    if (opts.tradeTimedOut || offer.declined.length >= offer.to.length) return { type: 'cancelTrade', id: offer.id };
    return null;
  }

  return playDevCard(view, seat) ?? buildOrTrade(view, seat) ?? { type: 'endTurn' };
}

// ── Prompts ─────────────────────────────────────────────────────────────────

function resolvePrompt(view: PlayerView, seat: number, prompt: Prompt): Action | null {
  switch (prompt.kind) {
    case 'discard':
      return { type: 'discard', cards: chooseDiscard(view, seat, prompt.count) };
    case 'robber':
      return { type: 'moveRobber', ...chooseRobber(view, seat, prompt.reason !== 'bishop') };
    case 'freeRoads': {
      const route = bestRoute(view, seat);
      return route ? route.action : { type: 'skipFreeRoads' };
    }
    case 'goldPick':
      return { type: 'pickGold', cards: chooseGold(view, seat, prompt.count) };
    default:
      return null;
  }
}

/** Gold: what the next build is missing first, then the scarcest resources (only what the bank has). */
export function chooseGold(view: PlayerView, seat: number, count: number): PartialHand {
  const hand = { ...view.players[seat].hand };
  const bank = { ...view.bank };
  const goal = primaryGoal(view, seat);
  const weights = resourceWeights(view);
  const out: PartialHand = {};
  for (let i = 0; i < count; i++) {
    const r = argmax(
      RESOURCES.filter((x) => bank[x] > 0),
      (x) => ((goal?.cost[x] ?? 0) - hand[x]) * 10 + weights[x],
    );
    if (!r) break;
    hand[r]++;
    bank[r]--;
    out[r] = (out[r] ?? 0) + 1;
  }
  return out;
}

export function chooseDiscard(view: PlayerView, seat: number, count: number, cards: readonly Card[] = RESOURCES): PartialHand {
  const hand = { ...view.players[seat].hand };
  const keep = primaryGoal(view, seat)?.cost ?? {};
  const weights = resourceWeights(view);
  const out: PartialHand = {};
  for (let i = 0; i < count; i++) {
    const card = argmax(
      cards.filter((c) => hand[c] > 0),
      (c) => (hand[c] - (keep[c] ?? 0)) * 10 - ((weights as Record<string, number>)[c] ?? 1),
    );
    if (!card) break;
    hand[card]--;
    out[card] = (out[card] ?? 0) + 1;
  }
  return out;
}

export function chooseRobber(view: PlayerView, seat: number, pirate = true): { hex: number; victim: number | null } {
  const t = topo(view);
  const targets = robberTargets(view, seat, (s) => view.players[s].publicVP, pirate);
  const hex =
    argmax(targets, (h) => {
      const tile = view.board.hexes[h];
      // The pirate only robs ships (and blocks them); it never stops production.
      if (tile.terrain === 'sea') {
        const theirs = t.hexes[h].edges.filter((e) => view.ships[e] !== null && view.ships[e] !== seat).length;
        const mine = t.hexes[h].edges.filter((e) => view.ships[e] === seat).length;
        return (robberVictims(view, seat, h).length ? 3 : 0) + theirs - 3 * mine;
      }
      const pips = tile.token ? PIPS[tile.token] : 0;
      let score = 0;
      for (const v of t.hexes[h].vertices) {
        const b = view.buildings[v];
        if (!b) continue;
        if (b.owner === seat) score -= 25;
        else score += pips * (b.city ? 2 : 1) * (1 + view.players[b.owner].publicVP / 4);
      }
      if (robberVictims(view, seat, h).length) score += 3;
      return score;
    }) ?? targets[0];
  const victims = robberVictims(view, seat, hex);
  const victim = argmax(victims, (v) => view.players[v].publicVP * 10 + view.players[v].handCount) ?? null;
  return { hex, victim };
}

// ── Setup ───────────────────────────────────────────────────────────────────

/**
 * Black Forest opening, a preference rather than a rule: the first settlement on a lake harbor,
 * where the forest's lumber trades 2:1, and the second placement (a city in C&K) further out
 * towards the fog; the starting roads lead outward to discover it.
 */
function blackForestSetupBonus(view: PlayerView): (v: number) => number {
  if (view.settings.map !== 'blackForest') return () => 0;
  const t = topo(view);
  if (view.setup!.index < view.players.length) {
    const harborCorners = new Set(view.board.harbors.flatMap((h) => [t.edges[h.edge].a, t.edges[h.edge].b]));
    return (v) => (harborCorners.has(v) ? 8 : 0);
  }
  const far = Math.max(...t.vertices.map((x) => Math.hypot(x.x, x.y)));
  return (v) => 8 * (Math.hypot(t.vertices[v].x, t.vertices[v].y) / far);
}

export function setupMove(view: PlayerView, seat: number): Action {
  const t = topo(view);
  if (view.setup!.placing === 'settlement') {
    const weights = resourceWeights(view);
    const spots = legalSettlementSpots(view, seat, true);
    const bonus = blackForestSetupBonus(view);
    return { type: 'buildSettlement', vertex: argmax(spots, (v) => vertexScore(view, seat, v, weights) + bonus(v))! };
  }
  const edges = legalSetupRoads(view);
  const from = view.setup!.lastVertex!;
  // Voyagers: a settlement with no land edge left launches a ship instead.
  if (!edges.length) return { type: 'buildShip', edge: legalSetupShips(view)[0] };
  const weights = resourceWeights(view);
  const dist = (v: number) => Math.hypot(t.vertices[v].x, t.vertices[v].y);
  const edge = argmax(edges, (e) => {
    const edgeInfo = t.edges[e];
    const w = edgeInfo.a === from ? edgeInfo.b : edgeInfo.a;
    const next = t.vertices[w].vertices.filter((x) => x !== from && distanceRuleOk(view, x));
    const outward = view.settings.map === 'blackForest' && dist(w) > dist(from) ? 4 : 0;
    return Math.max(0, ...next.map((x) => vertexScore(view, seat, x, weights))) + outward;
  })!;
  return { type: 'buildRoad', edge };
}

// ── Trading ─────────────────────────────────────────────────────────────────

export function afterTrade(hand: Record<Card, number>, lose: PartialHand, gain: PartialHand): Record<Card, number> {
  const out = { ...hand };
  for (const c of CARDS) out[c] += (gain[c] ?? 0) - (lose[c] ?? 0);
  return out;
}

export function shouldAcceptTrade(view: PlayerView, seat: number, offer: TradeOffer): boolean {
  const me = view.players[seat];
  if (!hasCards(me.hand, offer.want)) return false;
  // Never feed a player who is close to winning.
  if (view.players[offer.from].publicVP >= view.settings.vpToWin - 2) return false;
  const goal = primaryGoal(view, seat);
  if (!goal) return false;
  const before = deficit(me.hand, goal.cost);
  const after = deficit(afterTrade(me.hand, offer.want, offer.give), goal.cost);
  const giving = handTotal(offer.want);
  const getting = handTotal(offer.give);
  if (after < before) return getting + (before - after) >= giving;
  return after === before && getting > giving;
}

// ── Development cards ───────────────────────────────────────────────────────

function canPlayDev(view: PlayerView, seat: number, type: string): boolean {
  if (view.turn.devPlayed) return false;
  return view.players[seat].devCards.some((c) => c.type === type && c.boughtOn < view.turn.n);
}

function knightIsUseful(view: PlayerView, seat: number): boolean {
  const t = topo(view);
  const robberHex = view.board.hexes[view.robber];
  const blocked = robberHex.token !== null && t.hexes[view.robber].vertices.some((v) => view.buildings[v]?.owner === seat);
  if (blocked) return true;
  const knights = view.players[seat].knightsPlayed + 1;
  const holder = view.largestArmy;
  return knights >= 3 && holder !== seat && (holder === null || knights > view.players[holder].knightsPlayed);
}

function playDevCard(view: PlayerView, seat: number): Action | null {
  if (view.turn.devPlayed) return null;
  const me = view.players[seat];
  if (canPlayDev(view, seat, 'knight') && knightIsUseful(view, seat)) return { type: 'playKnight' };

  const goal = primaryGoal(view, seat);
  if (canPlayDev(view, seat, 'yearOfPlenty') && goal) {
    const missing: Resource[] = [];
    for (const r of RESOURCES) for (let i = me.hand[r]; i < (goal.cost[r as Card] ?? 0); i++) missing.push(r);
    if (missing.length && missing.length <= 2) {
      const weights = resourceWeights(view);
      while (missing.length < 2) missing.push(argmax([...RESOURCES], (r) => weights[r])!);
      if (missing.every((r, i) => view.bank[r] >= missing.slice(0, i + 1).filter((x) => x === r).length)) {
        return { type: 'playYearOfPlenty', resources: missing };
      }
    }
  }
  if (canPlayDev(view, seat, 'monopoly')) {
    const others = view.players.reduce((n, p, i) => (i === seat ? n : n + p.resourceCount), 0);
    if (others >= 7) {
      const want = goal
        ? argmax([...RESOURCES], (r) => Math.max(0, (goal.cost[r as Card] ?? 0) - me.hand[r]) * 3 + (r === 'ore' || r === 'grain' ? 1 : 0))!
        : 'ore';
      return { type: 'playMonopoly', resource: want };
    }
  }
  if (canPlayDev(view, seat, 'roadBuilding')) {
    const route = bestRoute(view, seat);
    if (route && route.value >= 3) return { type: 'playRoadBuilding' };
  }
  return null;
}

// ── Building ────────────────────────────────────────────────────────────────

export function cityValue(view: PlayerView, seat: number, v: number): number {
  const t = topo(view);
  let pips = 0;
  for (const h of t.vertices[v].hexes) {
    const hex = view.board.hexes[h];
    if (hex.token) pips += PIPS[hex.token];
  }
  return pips;
}

/** Best road to build: toward a good settlement spot, or to take/keep the longest road. */
export function bestRoad(view: PlayerView, seat: number): { edge: number; value: number } | null {
  if (piecesLeft(view, seat).roads <= 0) return null;
  const t = topo(view);
  const edges = legalRoadSpots(view, seat);
  if (!edges.length) return null;
  const weights = resourceWeights(view);
  const openSpots = legalSettlementSpots(view, seat).length;
  const currentLen = view.players[seat].roadLength;
  const otherBest = Math.max(0, ...view.players.map((p, i) => (i === seat ? 0 : p.roadLength)));
  let best: { edge: number; value: number } | null = null;
  for (const e of edges) {
    const edge = t.edges[e];
    let value = 0;
    for (const w of [edge.a, edge.b]) {
      const ownHere = view.buildings[w]?.owner === seat || t.vertices[w].edges.some((x) => x !== e && view.roads[x] === seat);
      if (ownHere) continue;
      if (settleable(view, w)) value = Math.max(value, vertexScore(view, seat, w, weights) + islandBonus(view, seat, w));
      for (const x of t.vertices[w].vertices) {
        if (settleable(view, x)) value = Math.max(value, 0.7 * (vertexScore(view, seat, x, weights) + islandBonus(view, seat, x)));
      }
    }
    value = openSpots > 0 ? value * 0.25 : value * 0.6;
    // Black Forest: each tile the road uncovers pays a card straight away.
    const uncovered = new Set([edge.a, edge.b].flatMap((w) => t.vertices[w].hexes).filter((h) => view.board.hexes[h].fog));
    value += 1.5 * uncovered.size;
    // A road reaching a treasure's corner collects it.
    if ((view.board.treasures ?? []).some((tr) => tr.takenBy === undefined && (tr.vertex === edge.a || tr.vertex === edge.b))) value += 3;
    // Longest-road pressure.
    const roads = [...view.roads];
    roads[e] = seat;
    const len = longestRoadLength({ ...view, roads }, t, seat);
    if (len > currentLen && len >= 4 && len > otherBest && view.longestRoad !== seat) value += len >= 5 ? 6 : 2;
    if (!best || value > best.value) best = { edge: e, value };
  }
  return best;
}

/** The better of the best road and (Voyagers) the best ship, as a buildable goal. */
export function bestRoute(view: PlayerView, seat: number): Goal | null {
  const road = bestRoad(view, seat);
  const ship = bestShip(view, seat);
  // Ships are scored against the same settlement values as roads, scaled the same way.
  const openSpots = legalSettlementSpots(view, seat).length;
  const shipValue = ship ? ship.value * (openSpots > 0 ? 0.25 : 0.6) : -Infinity;
  if (ship && (!road || shipValue > road.value)) return { action: { type: 'buildShip', edge: ship.edge }, cost: COSTS.ship, value: shipValue };
  return road ? { action: { type: 'buildRoad', edge: road.edge }, cost: COSTS.road, value: road.value } : null;
}

function goals(view: PlayerView, seat: number): Goal[] {
  const out: Goal[] = [];
  const left = piecesLeft(view, seat);
  const weights = resourceWeights(view);
  if (left.cities > 0) {
    const v = argmax(legalCitySpots(view, seat), (x) => cityValue(view, seat, x));
    if (v !== undefined) out.push({ action: { type: 'buildCity', vertex: v }, cost: COSTS.city, value: 10 + cityValue(view, seat, v) / 3 });
  }
  if (left.settlements > 0) {
    const score = (x: number) => vertexScore(view, seat, x, weights) + islandBonus(view, seat, x);
    const v = argmax(legalSettlementSpots(view, seat), score);
    if (v !== undefined) {
      out.push({ action: { type: 'buildSettlement', vertex: v }, cost: COSTS.settlement, value: 9 + score(v) / 4 });
    }
  }
  const route = bestRoute(view, seat);
  if (route && route.value > 0.5) out.push(route);
  if (view.devDeckCount > 0) out.push({ action: { type: 'buyDevCard' }, cost: COSTS.devCard, value: 3.5 });
  return out.sort((a, b) => b.value - a.value);
}

export function primaryGoal(view: PlayerView, seat: number): Goal | undefined {
  const all = goals(view, seat).filter((g) => g.action.type !== 'buildRoad' || g.value >= 3);
  if (all.length) return all[0];
  // Fall back to a settlement's cost profile so trades still make sense.
  return { action: { type: 'endTurn' }, cost: COSTS.settlement, value: 0 };
}

function buildOrTrade(view: PlayerView, seat: number): Action | null {
  const hand = view.players[seat].hand;
  const all = goals(view, seat);
  const top = all[0];
  // Build the most valuable thing we can afford — unless it eats cards a nearly-affordable,
  // more valuable goal still needs.
  for (const g of all) {
    if (!hasCards(hand, g.cost)) continue;
    if (g !== top && deficit(hand, top.cost) <= 2) {
      const rest = afterTrade(hand, g.cost, {});
      if (deficit(rest, top.cost) > deficit(hand, top.cost)) continue;
    }
    return g.action;
  }
  // Otherwise trade with the bank toward the most valuable goal that trading can reach.
  for (const g of all) {
    const need = deficit(hand, g.cost);
    if (need > 3) continue;
    const trade = bankTradeToward(view, seat, hand, g.cost);
    if (trade) return { type: 'bankTrade', give: trade.give, get: trade.get, count: 1 };
  }
  // Avoid losing half a big hand to a 7: dump surplus into anything useful.
  if (handTotal(hand) > 7) {
    for (const g of all) {
      const trade = bankTradeToward(view, seat, hand, g.cost);
      if (trade) return { type: 'bankTrade', give: trade.give, get: trade.get, count: 1 };
    }
  }
  return null;
}

export { productionOf };
