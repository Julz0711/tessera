/**
 * Heuristic bot for Cities & Knights. Stateless like the classic bot: every call returns the one
 * next action for `seat`. Priorities: survive the barbarians, grow cities, race improvements.
 */
import {
  ABILITY_LEVEL,
  BARBARIAN_DISTANCE,
  CARDS,
  COMMODITIES,
  COSTS,
  PIPS,
  RESOURCES,
  TERRAIN_RESOURCE,
  TRACKS,
  TRACK_COMMODITY,
  activatableKnights,
  barbarianStrength,
  chaseKnights,
  handTotal,
  hasCards,
  improvementBlocker,
  improvementCost,
  inventorHexes,
  knightStrength,
  legalCitySpots,
  legalKnightSpots,
  legalSettlementSpots,
  masterMerchantVictims,
  merchantHexes,
  metropolisSpots,
  ownsCity,
  wouldGainMetropolis,
  piecesLeft,
  promotableKnights,
  relocationSpots,
  robberActive,
  robberVictims,
  topo,
  tradesAwaiting,
  wallSpots,
  type Action,
  type Card,
  type PartialHand,
  type PlayerView,
  type ProgressCard,
  type ProgressCardType,
  type Prompt,
  type Resource,
  type Track,
} from '@/engine';
import {
  afterTrade,
  bestRoute,
  chooseDiscard,
  chooseRobber,
  cityValue,
  setupMove,
  shouldAcceptTrade,
  type BotOptions,
  chooseGold,
} from './classic';
import { islandBonus } from './voyage';
import { bankTradeToward, deficit, resourceWeights, vertexScore } from './eval';

interface Goal {
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

/** How much a bot values keeping a progress card (higher = keep). */
const CARD_VALUE: Partial<Record<ProgressCardType, number>> = {
  alchemist: 6,
  warlord: 8,
  smith: 7,
  medicine: 7,
  engineer: 5,
  irrigation: 6,
  mining: 7,
  crane: 6,
  roadBuilding: 5,
  merchant: 7,
  merchantFleet: 4,
  resourceMonopoly: 6,
  tradeMonopoly: 6,
  wedding: 6,
  masterMerchant: 6,
  saboteur: 5,
  spy: 4,
  bishop: 4,
  deserter: 5,
  commercialHarbor: 3,
  diplomat: 2,
  intrigue: 2,
  inventor: 1,
};

function others(view: PlayerView, seat: number): number[] {
  return view.players.map((_, i) => i).filter((i) => i !== seat);
}

function pv(view: PlayerView, seat: number): number {
  return view.players[seat].publicVP;
}

/** Barbarians are coming and this seat would be among those losing a city. */
function underThreat(view: PlayerView, seat: number): boolean {
  if (view.barbarian.position < BARBARIAN_DISTANCE - 3) return false;
  const hasCity = view.buildings.some((b) => b && b.owner === seat && b.city && !b.metropolis);
  if (!hasCity) return false;
  const strength = barbarianStrength(view);
  const defense = view.players.reduce((n, _, s) => n + knightStrength(view, s), 0);
  const mine = knightStrength(view, seat);
  const lowest = Math.min(...view.players.map((_, s) => knightStrength(view, s)));
  return defense < strength || mine <= lowest;
}

function bestCityTarget(view: PlayerView, seat: number, vertices: number[]): number | undefined {
  return argmax(vertices, (v) => cityValue(view, seat, v));
}

// ── Prompts ─────────────────────────────────────────────────────────────────

function resolvePrompt(view: PlayerView, seat: number, prompt: Prompt): Action | null {
  const me = view.players[seat];
  switch (prompt.kind) {
    case 'discard':
      return { type: 'discard', cards: chooseDiscard(view, seat, prompt.count, CARDS) };
    case 'robber':
      return { type: 'moveRobber', ...chooseRobber(view, seat, prompt.reason !== 'bishop') };
    case 'freeRoads': {
      const route = bestRoute(view, seat);
      return route ? route.action : { type: 'skipFreeRoads' };
    }
    case 'loseCity': {
      const cities = view.buildings.flatMap((b, v) => (b && b.owner === seat && b.city && !b.metropolis ? [v] : []));
      return { type: 'loseCity', vertex: argmax(cities, (v) => -cityValue(view, seat, v))! };
    }
    case 'relocateKnight': {
      const spots = relocationSpots(view, seat, prompt.from);
      return { type: 'relocateKnight', vertex: spots[0] ?? null };
    }
    case 'rewardDeck':
      return { type: 'chooseDeck', track: argmax([...TRACKS], (t) => me.improvements[t] + (t === 'science' ? 0.5 : 0))! };
    case 'goldPick':
      return { type: 'pickGold', cards: chooseGold(view, seat, prompt.count) };
    case 'aqueduct': {
      const goal = primaryGoal(view, seat);
      const weights = resourceWeights(view);
      const r = argmax([...RESOURCES], (x) => ((goal?.cost[x] ?? 0) - me.hand[x]) * 10 + weights[x])!;
      return { type: 'aqueduct', resource: r };
    }
    case 'discardProgress': {
      const card = argmax(me.progress, (c) => -(CARD_VALUE[c.type] ?? 3))!;
      return { type: 'discardProgress', card: card.id };
    }
    case 'giveCards':
      return { type: 'giveCards', cards: chooseDiscard(view, seat, prompt.count, CARDS) };
    case 'commercialHarbor': {
      const c = argmax(COMMODITIES.filter((x) => me.hand[x] > 0), (x) => me.hand[x])!;
      return { type: 'giveCards', cards: { [c]: 1 } };
    }
    case 'deserterRemove': {
      const mine = view.knights.flatMap((k, v) => (k && k.owner === seat ? [v] : []));
      return { type: 'removeKnight', vertex: argmax(mine, (v) => -(view.knights[v]!.level * 2 + (view.knights[v]!.active ? 1 : 0)))! };
    }
    case 'deserterPlace': {
      const spots = legalKnightSpots(view, seat);
      return { type: 'placeKnight', vertex: spots[0] ?? null };
    }
    case 'moveRoad':
      // Bots don't aim the Diplomat at their own roads; if one ever does, the road stays.
      return { type: 'skipFreeRoads' };
    case 'spy': {
      const card = argmax(prompt.cards, (c) => CARD_VALUE[c.type] ?? 3);
      return card ? { type: 'takeProgress', card: card.id } : null;
    }
    case 'masterMerchant': {
      const pool = [...CARDS].flatMap((c) => Array.from({ length: prompt.hand[c] }, () => c));
      const ranked = pool.sort((a, b) => cardWorth(b) - cardWorth(a)).slice(0, prompt.count);
      const cards: PartialHand = {};
      for (const c of ranked) cards[c] = (cards[c] ?? 0) + 1;
      return { type: 'takeCards', cards };
    }
    case 'placeMetropolis':
      return { type: 'placeMetropolis', vertex: bestCityTarget(view, seat, metropolisSpots(view, seat))! };
    default:
      return null;
  }
}

function cardWorth(c: Card): number {
  return ({ ore: 5, grain: 5, coin: 6, paper: 6, cloth: 6, wool: 3, brick: 4, lumber: 4 } as Record<Card, number>)[c];
}

// ── Goals ───────────────────────────────────────────────────────────────────

/** Improvable apart from (tradeable) commodities: has a city, not maxed, metropolis has a home. */
function canEverImprove(view: PlayerView, seat: number, track: Track): boolean {
  if (view.players[seat].improvements[track] >= 5 || !ownsCity(view, seat)) return false;
  return !(wouldGainMetropolis(view, seat, track) && metropolisSpots(view, seat).length === 0);
}

function preferredTrack(view: PlayerView, seat: number): Track {
  const me = view.players[seat];
  return argmax([...TRACKS], (t) => me.hand[TRACK_COMMODITY[t]] * 2 + me.improvements[t] * 1.5 + (t === 'science' ? 0.4 : 0) + (t === 'politics' ? 0.2 : 0))!;
}

function goals(view: PlayerView, seat: number): Goal[] {
  const out: Goal[] = [];
  const me = view.players[seat];
  const left = piecesLeft(view, seat);
  const weights = resourceWeights(view);
  const threat = underThreat(view, seat);

  if (left.cities > 0) {
    const v = bestCityTarget(view, seat, legalCitySpots(view, seat));
    if (v !== undefined) out.push({ action: { type: 'buildCity', vertex: v }, cost: COSTS.city, value: 12 + cityValue(view, seat, v) / 3 });
  }
  for (const track of TRACKS) {
    if (!canEverImprove(view, seat, track)) continue;
    const level = me.improvements[track];
    const cost = improvementCost(view, seat, track);
    const preferred = preferredTrack(view, seat) === track;
    out.push({
      action: { type: 'improveCity', track },
      cost: { [TRACK_COMMODITY[track]]: cost },
      value: 9 + level + (preferred ? 2 : 0) + (level + 1 >= ABILITY_LEVEL ? 1 : 0),
    });
  }
  if (left.settlements > 0) {
    const score = (x: number) => vertexScore(view, seat, x, weights) + islandBonus(view, seat, x);
    const v = argmax(legalSettlementSpots(view, seat), score);
    if (v !== undefined) out.push({ action: { type: 'buildSettlement', vertex: v }, cost: COSTS.settlement, value: 9 + score(v) / 4 });
  }
  const knights = view.knights.filter((k) => k?.owner === seat).length;
  if (left.knights[1] > 0) {
    const spot = argmax(legalKnightSpots(view, seat), (v) => topo(view).vertices[v].hexes.length);
    if (spot !== undefined) {
      out.push({ action: { type: 'buildKnight', vertex: spot }, cost: COSTS.knight, value: threat ? 13 : knights < 2 ? 6 : 3 });
    }
  }
  const inactive = activatableKnights(view, seat);
  if (inactive.length) {
    out.push({ action: { type: 'activateKnight', vertex: inactive[0] }, cost: COSTS.activate, value: threat ? 14 : view.barbarian.position >= 3 ? 5 : 1.5 });
  }
  const promotable = promotableKnights(view, seat);
  if (promotable.length) out.push({ action: { type: 'promoteKnight', vertex: promotable[0] }, cost: COSTS.promote, value: threat ? 10 : 2.5 });
  const walls = wallSpots(view, seat);
  if (walls.length && handTotal(me.hand) >= 7) out.push({ action: { type: 'buildWall', vertex: walls[0] }, cost: COSTS.wall, value: 4 });
  const route = bestRoute(view, seat);
  if (route && route.value > 0.5) out.push(route);
  return out.sort((a, b) => b.value - a.value);
}

function primaryGoal(view: PlayerView, seat: number): Goal | undefined {
  return goals(view, seat)[0];
}

function buildOrTrade(view: PlayerView, seat: number): Action | null {
  const hand = view.players[seat].hand;
  const all = goals(view, seat);
  const top = all[0];
  for (const g of all) {
    if (!hasCards(hand, g.cost)) continue;
    if (top && g !== top && deficit(hand, top.cost) <= 2) {
      if (deficit(afterTrade(hand, g.cost, {}), top.cost) > deficit(hand, top.cost)) continue;
    }
    return g.action;
  }
  for (const g of all.slice(0, 3)) {
    if (deficit(hand, g.cost) > 3) continue;
    const trade = bankTradeToward(view, seat, hand, g.cost, CARDS);
    if (trade) return { type: 'bankTrade', give: trade.give, get: trade.get, count: 1 };
  }
  if (handTotal(hand) > 7 + 2 * view.buildings.filter((b) => b?.owner === seat && b.wall).length) {
    for (const g of all) {
      const trade = bankTradeToward(view, seat, hand, g.cost, CARDS);
      if (trade) return { type: 'bankTrade', give: trade.give, get: trade.get, count: 1 };
    }
  }
  return null;
}

// ── Progress cards ──────────────────────────────────────────────────────────

function adjacentTerrainCount(view: PlayerView, seat: number, terrain: 'fields' | 'mountains'): number {
  const t = topo(view);
  return view.board.hexes.filter((h) => h.terrain === terrain && t.hexes[h.id].vertices.some((v) => view.buildings[v]?.owner === seat)).length;
}

function progressAction(view: PlayerView, seat: number, card: ProgressCard): Action | null {
  const me = view.players[seat];
  const play = (params: object = {}): Action => ({ type: 'playProgress', card: card.id, params });
  const rich = others(view, seat).filter((o) => pv(view, o) > pv(view, seat));
  switch (card.type) {
    case 'irrigation':
      return adjacentTerrainCount(view, seat, 'fields') >= 1 ? play() : null;
    case 'mining':
      return adjacentTerrainCount(view, seat, 'mountains') >= 1 ? play() : null;
    case 'warlord':
      return activatableKnights(view, seat).length >= 1 && view.barbarian.position >= 3 ? play() : null;
    case 'smith': {
      // Up to two promotions, respecting how many knights of each level are left in the supply.
      const supply = { ...piecesLeft(view, seat).knights };
      const picks: number[] = [];
      for (const v of promotableKnights(view, seat).sort((a, b) => view.knights[b]!.level - view.knights[a]!.level)) {
        const next = (view.knights[v]!.level + 1) as 2 | 3;
        if (picks.length < 2 && supply[next] > 0) {
          supply[next]--;
          picks.push(v);
        }
      }
      return picks.length ? play({ vertices: picks }) : null;
    }
    case 'engineer': {
      const spot = wallSpots(view, seat)[0];
      return spot !== undefined ? play({ vertex: spot }) : null;
    }
    case 'medicine': {
      const spots = legalCitySpots(view, seat);
      return spots.length && piecesLeft(view, seat).cities > 0 && hasCards(me.hand, COSTS.medicineCity)
        ? play({ vertex: bestCityTarget(view, seat, spots) })
        : null;
    }
    case 'crane': {
      if (view.turn.crane) return null;
      const track = TRACKS.find(
        (t) =>
          canEverImprove(view, seat, t) &&
          improvementBlocker(view, seat, t) !== null &&
          me.hand[TRACK_COMMODITY[t]] >= improvementCost(view, seat, t) - 1,
      );
      return track ? play() : null;
    }
    case 'merchant': {
      if (view.merchant?.owner === seat) return null;
      const t = topo(view);
      const hex = argmax(merchantHexes(view, seat), (h) => {
        const tile = view.board.hexes[h];
        const own = t.hexes[h].vertices.filter((v) => view.buildings[v]?.owner === seat).length;
        return (tile.token ? PIPS[tile.token] : 0) + own * 2;
      });
      return hex !== undefined ? play({ hex }) : null;
    }
    case 'merchantFleet': {
      const surplus = argmax([...CARDS], (c) => me.hand[c]);
      return surplus && me.hand[surplus] >= 4 ? play({ card: surplus }) : null;
    }
    case 'resourceMonopoly': {
      const total = others(view, seat).reduce((n, o) => n + view.players[o].resourceCount, 0);
      if (total < 5) return null;
      const goal = primaryGoal(view, seat);
      const r = argmax([...RESOURCES], (x) => (goal?.cost[x] ?? 0) - me.hand[x] + (x === 'ore' || x === 'grain' ? 0.5 : 0))!;
      return play({ card: r });
    }
    case 'tradeMonopoly': {
      const total = others(view, seat).reduce((n, o) => n + view.players[o].commodityCount, 0);
      return total >= 2 ? play({ card: TRACK_COMMODITY[preferredTrack(view, seat)] }) : null;
    }
    case 'wedding':
      return rich.some((o) => view.players[o].handCount > 0) ? play() : null;
    case 'saboteur':
      return others(view, seat).some((o) => pv(view, o) >= pv(view, seat) && view.players[o].handCount >= 8) ? play() : null;
    case 'spy': {
      const victim = argmax(others(view, seat).filter((o) => view.players[o].progressCount > 0), (o) => view.players[o].progressCount);
      return victim !== undefined && me.progress.length <= 4 ? play({ victim }) : null;
    }
    case 'masterMerchant': {
      const victim = argmax(masterMerchantVictims(view, seat).filter((o) => view.players[o].handCount > 0), (o) => view.players[o].handCount);
      return victim !== undefined ? play({ victim }) : null;
    }
    case 'deserter': {
      const victim = argmax(others(view, seat).filter((o) => view.knights.some((k) => k?.owner === o)), (o) => knightStrength(view, o) + 1);
      return victim !== undefined && legalKnightSpots(view, seat).length ? play({ victim }) : null;
    }
    case 'bishop':
      return robberActive(view) ? play() : null;
    case 'roadBuilding': {
      const route = bestRoute(view, seat);
      return route && route.value >= 3 ? play() : null;
    }
    case 'inventor': {
      // Swap one of my low tokens with a better one elsewhere.
      const t = topo(view);
      const hexes = inventorHexes(view);
      const mineHexes = hexes.filter((h) => t.hexes[h].vertices.some((v) => view.buildings[v]?.owner === seat));
      const a = argmax(mineHexes, (h) => -PIPS[view.board.hexes[h].token!]);
      const b = argmax(hexes.filter((h) => !mineHexes.includes(h)), (h) => PIPS[view.board.hexes[h].token!]);
      if (a === undefined || b === undefined) return null;
      return PIPS[view.board.hexes[b].token!] > PIPS[view.board.hexes[a].token!] ? play({ hexes: [a, b] }) : null;
    }
    default:
      return null;
  }
}

function alchemistBeforeRoll(view: PlayerView, seat: number): Action | null {
  const card = view.players[seat].progress.find((c) => c.type === 'alchemist');
  if (!card) return null;
  const t = topo(view);
  const production = (total: number) => {
    let n = 0;
    for (const h of view.board.hexes) {
      if (h.token !== total || h.id === view.robber || !TERRAIN_RESOURCE[h.terrain]) continue;
      for (const v of t.hexes[h.id].vertices) {
        const b = view.buildings[v];
        if (b?.owner === seat) n += b.city ? 2 : 1;
        else if (b) n -= 0.3;
      }
    }
    return n;
  };
  const totals = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];
  const best = argmax(totals, production)!;
  if (production(best) < 2) return null;
  const red = Math.max(1, best - 6);
  return { type: 'playProgress', card: card.id, params: { red, yellow: best - red } };
}

// ── Entry point ─────────────────────────────────────────────────────────────

export function ckBotAction(view: PlayerView, seat: number, opts: BotOptions = {}): Action | null {
  const prompt = view.pending.find((p) => p.seat === seat);
  if (prompt) return resolvePrompt(view, seat, prompt);
  if (view.pending.length) return null;

  const awaiting = tradesAwaiting(view, seat);
  if (awaiting.length) {
    const offer = view.trades.find((t) => t.id === awaiting[0])!;
    return { type: 'respondTrade', id: offer.id, accept: shouldAcceptTrade(view, seat, offer) };
  }

  if (view.phase === 'setup') {
    return view.setup && view.setup.order[view.setup.index] === seat ? setupMove(view, seat) : null;
  }
  if (view.phase !== 'play' || view.turn.seat !== seat) return null;

  if (!view.turn.rolled) {
    if (!view.turn.alchemist) {
      const alchemist = alchemistBeforeRoll(view, seat);
      if (alchemist) return alchemist;
    }
    return { type: 'rollDice' };
  }

  for (const offer of view.trades.filter((t) => t.from === seat)) {
    if (offer.accepted.length) return { type: 'confirmTrade', id: offer.id, partner: offer.accepted[0] };
    if (opts.tradeTimedOut || offer.declined.length >= offer.to.length) return { type: 'cancelTrade', id: offer.id };
    return null;
  }

  // Knights next to the robber chase it away when it sits on our land.
  const chasers = chaseKnights(view, seat);
  if (chasers.length) {
    const t = topo(view);
    const robbed = t.hexes[view.robber].vertices.some((v) => view.buildings[v]?.owner === seat);
    if (robbed) {
      const { hex, victim } = chooseRobber(view, seat, false);
      if (hex !== view.robber) return { type: 'chaseRobber', vertex: chasers[0], hex, victim: robberVictims(view, seat, hex).length ? victim : null };
    }
  }

  const cards = [...view.players[seat].progress].sort((a, b) => (CARD_VALUE[b.type] ?? 3) - (CARD_VALUE[a.type] ?? 3));
  for (const card of cards) {
    const action = progressAction(view, seat, card);
    if (action) return action;
  }

  return buildOrTrade(view, seat) ?? { type: 'endTurn' };
}

