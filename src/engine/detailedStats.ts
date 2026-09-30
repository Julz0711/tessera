import { getTopology } from './board/topology';
import { TERRAIN_COMMODITY, TERRAIN_RESOURCE } from './constants';
import { BAG_REFILL_AT, REPEAT_WEIGHT } from './dice';
import { emptyHand, handTotal } from './hand';
import { bankRatio } from './queries';
import { victoryPoints } from './vp';
import { CARDS, type Action, type DetailedStats, type GameEvent, type GameState, type PartialHand } from './types';

export function newDetails(fromTurn = 0, complete = true): DetailedStats {
  return { version: 2, fromTurn, complete, counters: {}, hands: {}, red: Array(7).fill(0), yellow: Array(7).fill(0), eventDie: {},
    drought: Array(13).fill(0), longestDrought: Array(13).fill(0), expectedDice: Array(13).fill(0), timeline: [], milestones: [] };
}
export function detailsFor(s: GameState): DetailedStats {
  return s.stats.details ??= newDetails(s.turn.n, false);
}
export function countStat(s: GameState, key: string, seat: number, amount = 1): void {
  const d = detailsFor(s);
  (d.counters[key] ??= s.players.map(() => 0))[seat] += amount;
}
export function handStat(s: GameState, key: string, seat: number, cards: PartialHand): void {
  const bucket = (detailsFor(s).hands[key] ??= s.players.map(() => emptyHand()))[seat];
  for (const c of CARDS) bucket[c] += cards[c] ?? 0;
}
export function recordSpend(s: GameState, seat: number, cost: PartialHand, category: string): void {
  handStat(s, 'spent', seat, cost);
  countStat(s, `spending:${category}`, seat, handTotal(cost));
}
const peak = (s: GameState, key: string, seat: number, value: number) => {
  const counters = detailsFor(s).counters;
  const values = counters[key] ??= s.players.map(() => 0);
  values[seat] = Math.max(values[seat], value);
};
function milestone(s: GameState, seat: number | null, label: string) {
  const list = detailsFor(s).milestones;
  if (list.length < 1000) list.push({ turn: s.turn.n, seat, label });
}

export function recordDetailedEvent(s: GameState, ev: GameEvent): void {
  const d = detailsFor(s);
  switch (ev.type) {
    case 'diceRolled': {
      d.red[ev.dice.red]++; d.yellow[ev.dice.yellow]++;
      if (ev.dice.event) d.eventDie[ev.dice.event] = (d.eventDie[ev.dice.event] ?? 0) + 1;
      countStat(s, 'rolls', ev.seat);
      if (ev.dice.red + ev.dice.yellow === 7) countStat(s, 'sevens', ev.seat);
      for (let n = 2; n <= 12; n++) {
        d.drought[n] = n === ev.dice.red + ev.dice.yellow ? 0 : d.drought[n] + 1;
        d.longestDrought[n] = Math.max(d.longestDrought[n], d.drought[n]);
      }
      break;
    }
    case 'produced': ev.gains.forEach((gain, seat) => peak(s, 'bestProduction', seat, handTotal(gain))); break;
    case 'received': handStat(s, `income:${ev.reason}`, ev.seat, ev.cards); break;
    case 'monopoly': countStat(s, 'monopolyIncome', ev.seat, ev.total); break;
    case 'discarded': handStat(s, 'discarded', ev.seat, ev.cards); break;
    case 'bankTrade':
      handStat(s, 'bankGiven', ev.seat, ev.give); handStat(s, 'bankReceived', ev.seat, ev.get);
      for (const c of CARDS) if (ev.give[c]) countStat(s, `bankRatio:${bankRatio(s, ev.seat, c)}`, ev.seat, ev.give[c]! / bankRatio(s, ev.seat, c));
      break;
    case 'trade':
      for (const [seat, partner, give, get] of [[ev.seat, ev.partner, ev.give, ev.get], [ev.partner, ev.seat, ev.get, ev.give]] as const) {
        handStat(s, 'tradeGiven', seat, give); handStat(s, 'tradeReceived', seat, get); countStat(s, `partner:${partner}`, seat);
      }
      break;
    case 'stole': countStat(s, `robbed:${ev.victim}`, ev.seat); break;
    case 'tradeOffered': countStat(s, 'offers', ev.seat); break;
    case 'tradeClosed': countStat(s, 'offersClosed', ev.seat); break;
    case 'built':
      countStat(s, `${s.phase === 'setup' ? 'setup' : 'built'}:${ev.piece}`, ev.seat);
      if (ev.free && s.phase !== 'setup') countStat(s, `free:${ev.piece}`, ev.seat);
      if (ev.piece === 'city' && s.phase !== 'setup') {
        const first = d.counters.firstCityTurn ??= s.players.map(() => 0);
        if (!first[ev.seat]) first[ev.seat] = s.turn.n;
        milestone(s, ev.seat, 'Built a city');
      }
      break;
    case 'devPlayed': countStat(s, `devPlayed:${ev.card}`, ev.seat); break;
    case 'progressPlayed': countStat(s, `progressPlayed:${ev.card}`, ev.seat); break;
    case 'progressDrawn': countStat(s, `progressDrawn:${ev.track}`, ev.seat); break;
    case 'progressDiscarded': countStat(s, 'progressDiscarded', ev.seat); break;
    case 'barbarianAttack':
      ev.contributions.forEach((n, seat) => countStat(s, 'barbarianContribution', seat, n));
      ev.defenders.forEach((seat) => countStat(s, 'defenses', seat));
      milestone(s, null, ev.won ? 'Barbarians defeated' : 'Barbarians won'); break;
    case 'improved': countStat(s, `improvements:${ev.track}`, ev.seat); milestone(s, ev.seat, `${ev.track} level ${ev.level}`); break;
    case 'metropolis': countStat(s, 'metropolisesGained', ev.seat); if (ev.from !== null) countStat(s, 'metropolisesLost', ev.from); milestone(s, ev.seat, `${ev.track} metropolis`); break;
    case 'cityLost': case 'knightBuilt': case 'knightActivated': case 'knightPromoted': case 'knightMoved': case 'knightRemoved': case 'defenderAwarded': case 'merchantPlaced': case 'shipMoved':
      countStat(s, ev.type, ev.seat); break;
    case 'roadRemoved': countStat(s, 'roadsLost', ev.owner); break;
    case 'revealed': countStat(s, 'hexesDiscovered', ev.seat, ev.hexes.length); break;
    case 'treasure': countStat(s, `treasure:${ev.kind}`, ev.seat); break;
    case 'islandSettled': countStat(s, 'islandsSettled', ev.seat); countStat(s, 'islandVP', ev.seat, ev.vp); milestone(s, ev.seat, 'Settled a new island'); break;
    case 'longestRoad': case 'largestArmy':
      if (ev.seat !== null) countStat(s, `${ev.type}Gained`, ev.seat);
      milestone(s, ev.seat, ev.type === 'longestRoad' ? 'Longest route changed' : 'Largest army changed'); break;
  }
}

/** End-of-turn samples contain hidden VP/hand totals; details are redacted during play. */
export function sampleStats(s: GameState, turn = s.turn.n): void {
  const d = detailsFor(s);
  const sample = { turn, vp: s.players.map((_, i) => victoryPoints(s, i)), production: s.stats.produced.map(handTotal),
    spent: s.players.map((_, i) => handTotal(d.hands.spent?.[i] ?? {})), hand: s.players.map((p) => handTotal(p.hand)),
    improvements: s.players.map((p) => Object.values(p.improvements).reduce((a, b) => a + b, 0)) };
  if (d.timeline.at(-1)?.turn === turn) d.timeline[d.timeline.length - 1] = sample;
  else d.timeline.push(sample);
  // Bound pathological games without losing the first or most recent sample.
  if (d.timeline.length > 2000) d.timeline.splice(1, 1);
}
export function recordActionStats(before: GameState, s: GameState, seat: number, action: Action, events: GameEvent[]): void {
  const d = detailsFor(s);
  s.roadLengths.forEach((n, i) => peak(s, 'longestRoutePeak', i, n));
  if (action.type === 'respondTrade') countStat(s, action.accept ? 'responsesAccepted' : 'responsesDeclined', seat);
  if (action.type === 'cancelTrade') countStat(s, 'offersCancelled', seat);
  if (s.turn.n !== before.turn.n) {
    before.trades.forEach((offer) => countStat(s, 'offersExpired', offer.from));
    if (before.longestRoad !== null) countStat(s, 'longestRoadTurns', before.longestRoad);
    if (before.largestArmy !== null) countStat(s, 'largestArmyTurns', before.largestArmy);
    sampleStats(s, before.turn.n);
  }
  if (s.phase === 'ended') sampleStats(s);
  // These effects move cards without an ordinary trade event. Count losses, not identities.
  if (events.some((e) => e.type === 'monopoly') || action.type === 'takeCards') {
    before.players.forEach((p, i) => {
      const lost = handTotal(p.hand) - handTotal(s.players[i].hand);
      if (i !== seat && lost > 0) countStat(s, 'effectLosses', i, lost);
    });
  }
  // Keep purchase types secret until the report is revealed.
  if (action.type === 'buyDevCard') {
    const card = s.players[seat].devCards.at(-1);
    if (card) countStat(s, `devBought:${card.type}`, seat);
  }
  if (before.longestRoad !== null && s.longestRoad !== before.longestRoad) countStat(s, 'longestRoadLost', before.longestRoad);
  if (before.largestArmy !== null && s.largestArmy !== before.largestArmy) countStat(s, 'largestArmyLost', before.largestArmy);
  void d;
}

/** Exact next-roll distribution, including balanced bag weighting and Alchemist. Server-only. */
export function rollProbabilities(s: GameState): number[] {
  const probabilities = Array<number>(13).fill(0);
  if (s.turn.alchemist) { probabilities[s.turn.alchemist.red + s.turn.alchemist.yellow] = 1; return probabilities; }
  const cards = s.settings.dice === 'balanced' && s.diceBag && s.diceBag.cards.length > BAG_REFILL_AT ? s.diceBag.cards : Array.from({ length: 36 }, (_, i) => i);
  let sum = 0;
  for (const card of cards) {
    const total = Math.floor(card / 6) + card % 6 + 2;
    const weight = s.settings.dice === 'balanced' && total === s.diceBag?.last ? REPEAT_WEIGHT : 1;
    probabilities[total] += weight; sum += weight;
  }
  return probabilities.map((n) => n / sum);
}

/** Expected ordinary hex production before the roll. Excludes gold choices and card/event effects. */
export function recordExpectedProduction(s: GameState): void {
  const probabilities = rollProbabilities(s);
  const d = detailsFor(s);
  probabilities.forEach((p, n) => d.expectedDice[n] += p);
  const topo = getTopology(s.board.hexes);
  for (let total = 2; total <= 12; total++) {
    if (total === 7 || !probabilities[total]) continue;
    const demand = s.players.map(() => emptyHand());
    for (const h of s.board.hexes) {
      if (h.fog || h.id === s.robber || h.token !== total) continue;
      const resource = TERRAIN_RESOURCE[h.terrain];
      if (!resource) continue;
      for (const v of topo.hexes[h.id].vertices) {
        const b = s.buildings[v]; if (!b) continue;
        const commodity = s.mode === 'ck' && b.city ? TERRAIN_COMMODITY[h.terrain] : undefined;
        demand[b.owner][resource] += b.city && !commodity ? 2 : 1;
        if (commodity) demand[b.owner][commodity]++;
      }
    }
    for (const c of CARDS) {
      const wanted = demand.reduce((n, h) => n + h[c], 0);
      const claimants = demand.filter((h) => h[c] > 0).length;
      demand.forEach((h, seat) => {
        const gain = wanted <= s.bank[c] ? h[c] : claimants === 1 ? Math.min(h[c], s.bank[c]) : 0;
        countStat(s, 'expectedProduction', seat, gain * probabilities[total]);
      });
    }
  }
}
