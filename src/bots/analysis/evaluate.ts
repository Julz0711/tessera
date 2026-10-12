/**
 * Static evaluation for the game analysis: how strong each seat's position is, in victory-point
 * equivalents, and from that a win chance per seat. It reads the full state (the game is over, so the
 * analysis may look at every hand and deck, like a chess engine).
 */
import {
  CARDS,
  COSTS,
  PIPS,
  RESOURCES,
  TERRAIN_RESOURCE,
  TRACKS,
  handLimit,
  harborKinds,
  isCommodity,
  legalSettlementSpots,
  piecesLeft,
  topo,
  victoryPoints,
  type Card,
  type GameState,
  type Resource,
} from '@/engine';

/** Value of one production pip (weighted by scarcity) early in the game; it fades as someone nears the win. */
const PIP_VALUE = 0.11;
const CARD_VALUE = 0.04;
const OVER_LIMIT_CARD = 0.02;
const COMMODITY_VALUE = 0.06;
const DEV_CARD_VALUE = 0.3;
const PROGRESS_CARD_VALUE = 0.12;
const ROAD_VALUE = 0.04;
/**
 * Cards already gathered towards the next settlement or city, per card of its cost: saving up is a plan,
 * not idleness. Without it a road (two cards for a little reach) always beat holding the brick and lumber
 * of a settlement one card away. Well under what the finished piece is worth, so skipping an affordable
 * build still costs (a held full set is 0.5 or 0.7 against 1+ for the piece).
 */
const SAVING_VALUE = { settlement: 0.5, city: 0.7 } as const;
/** C&K: a knight per level, more once active; a city wall. */
const KNIGHT_VALUE = { idle: 0.2, active: 0.3 } as const;
const WALL_VALUE = 0.2;
/**
 * Softmax sharpness per VP-equivalent at a 10-point game; grows as the leader closes in, so a two-point
 * lead decides more at 8 points than at 3.
 */
const BETA = 0.75;

/** Scarcer resources are worth more (clamped like the bots' own weights). */
function scarcity(s: GameState): Record<Resource, number> {
  const pips: Record<Resource, number> = { brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0 };
  for (const h of s.board.hexes) {
    const res = TERRAIN_RESOURCE[h.terrain];
    if (res && h.token && !h.fog) pips[res] += PIPS[h.token];
  }
  const avg = RESOURCES.reduce((n, r) => n + pips[r], 0) / RESOURCES.length;
  const out = { brick: 1, lumber: 1, wool: 0.85, grain: 1, ore: 1 };
  for (const r of RESOURCES) out[r] *= Math.min(1.4, Math.max(0.75, avg / Math.max(1, pips[r])));
  return out;
}

/**
 * Development cards bought from turn `from` on are valued at `value` (the deck's average), not by what was
 * drawn: otherwise a rollout that happened to draw a victory point decided the comparison.
 */
export interface Fresh {
  from: number;
  value: number;
}

/** What a development card from this deck is worth on average (a victory point card is one point). */
export function devCardValue(s: GameState): number {
  if (!s.devDeck.length) return DEV_CARD_VALUE;
  const vp = s.devDeck.filter((c) => c === 'victoryPoint').length;
  return (vp + (s.devDeck.length - vp) * DEV_CARD_VALUE) / s.devDeck.length;
}

/** A seat's position in victory-point equivalents. `fade` (0.25–1) scales what only pays off later. */
export function strength(s: GameState, seat: number, fade = 1, weights = scarcity(s), fresh?: Fresh): number {
  const t = topo(s);
  const p = s.players[seat];
  let value = victoryPoints(s, seat);

  // Production: pips on the tiles around each building (cities twice), the robber's tile at a discount.
  const produced: Record<Resource, number> = { brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0 };
  let other = 0;
  s.buildings.forEach((b, v) => {
    if (!b || b.owner !== seat) return;
    for (const h of t.vertices[v].hexes) {
      const hex = s.board.hexes[h];
      if (!hex.token) {
        if (hex.fog) other += 1;
        continue;
      }
      const pips = PIPS[hex.token] * (b.city ? 2 : 1) * (h === s.robber ? 0.4 : 1);
      const res = TERRAIN_RESOURCE[hex.terrain];
      if (res) produced[res] += pips;
      else if (hex.terrain === 'gold') other += pips * 1.2;
    }
  });
  let production = other;
  for (const r of RESOURCES) production += produced[r] * weights[r];
  value += fade * PIP_VALUE * production;
  value += fade * 0.15 * RESOURCES.filter((r) => produced[r] > 0).length;

  // Harbors: a 3:1 always helps; a 2:1 more so with the resource behind it.
  for (const kind of harborKinds(s, seat)) value += fade * (kind === 'any' ? 0.25 : 0.12 + 0.02 * produced[kind]);

  // Cards in hand: worth something up to the hand limit, little beyond it (a 7 halves them). Kept low: what
  // cards buy is worth more than the cards, so a skipped build or a trade towards one is not "saved" value.
  const limit = handLimit(s, seat);
  let held = 0;
  for (const c of CARDS) {
    for (let i = 0; i < p.hand[c]; i++) {
      held++;
      value += held > limit ? OVER_LIMIT_CARD : isCommodity(c) ? COMMODITY_VALUE : CARD_VALUE;
    }
  }
  // Savings towards a settlement (when there is room for one) or a city (when there is a settlement to upgrade).
  const have = (cost: Partial<Record<Card, number>>) => {
    let n = 0;
    let total = 0;
    for (const c of CARDS) {
      const need = cost[c] ?? 0;
      n += Math.min(need, p.hand[c]);
      total += need;
    }
    // A set that is already complete is a skipped build, not savings.
    return n < total ? n / total : 0;
  };
  const piecesFree = piecesLeft(s, seat);
  if (piecesFree.settlements > 0 && legalSettlementSpots(s, seat).length) value += fade * SAVING_VALUE.settlement * have(COSTS.settlement);
  if (piecesFree.cities > 0 && s.buildings.some((b) => b && b.owner === seat && !b.city)) value += fade * SAVING_VALUE.city * have(COSTS.city);

  // Development cards (a victory point card is already counted above), the ones just bought at the deck's average.
  for (const c of p.devCards) {
    if (fresh && c.boughtOn >= fresh.from) value += fresh.value - (c.type === 'victoryPoint' ? 1 : 0);
    else if (c.type !== 'victoryPoint') value += DEV_CARD_VALUE;
  }
  value += 0.08 * p.knightsPlayed;
  value += PROGRESS_CARD_VALUE * p.progress.length;

  // Room to grow: open settlement spots on the network, and the road towards Longest Road.
  const left = piecesLeft(s, seat);
  if (left.settlements > 0) value += fade * 0.25 * Math.min(2, legalSettlementSpots(s, seat).length);
  value += ROAD_VALUE * (s.roadLengths[seat] ?? 0);

  if (s.mode === 'ck') {
    for (const track of TRACKS) {
      const level = p.improvements[track];
      value += 0.3 * level + (level >= 3 ? 0.2 : 0);
    }
    for (const k of s.knights) if (k && k.owner === seat) value += k.level * (k.active ? KNIGHT_VALUE.active : KNIGHT_VALUE.idle);
    for (const b of s.buildings) if (b && b.owner === seat && b.wall) value += WALL_VALUE;
  }
  return value;
}

/** The fade, resource weights and softmax sharpness a position is judged with. */
function context(s: GameState) {
  const target = Math.max(3, s.settings.vpToWin);
  const vps = s.players.map((_, i) => victoryPoints(s, i));
  const lead = Math.min(1, Math.max(...vps) / target);
  return { fade: Math.max(0.25, 1 - lead), weights: scarcity(s), beta: BETA * (10 / target) * (1 + lead) };
}

/** VP equivalents added to one seat's strength before the softmax (see `levelling`). */
export interface Shift {
  seat: number;
  by: number;
}

/**
 * Each seat's chance to win (sums to 1). A finished game is certain. `shift` moves one seat's strength
 * first; `fresh` values newly bought development cards at the deck's average.
 */
export function winChances(s: GameState, shift?: Shift, fresh?: Fresh): number[] {
  const n = s.players.length;
  if (s.phase === 'ended' && s.winner !== null) return s.players.map((_, i) => (i === s.winner ? 1 : 0));
  const { fade, weights, beta } = context(s);
  const scores = s.players.map((_, i) => beta * (strength(s, i, fade, weights, fresh) + (shift?.seat === i ? shift.by : 0)));
  const top = Math.max(...scores);
  const exps = scores.map((x) => Math.exp(x - top));
  const sum = exps.reduce((a, b) => a + b, 0);
  return n ? exps.map((e) => e / sum) : [];
}

/**
 * A seat ahead of the field is brought only half way down to it. Fully levelled, a leader's every swing
 * read as if the game were open: a C&K leader at 8 of 13 points was given a 37-point blunder for settling
 * instead of activating a knight (the bot's line after the knight took the Longest Road this turn, while
 * the settlement line kept its Road Building card for later). Not at all, and a leading player who skips
 * builds goes unnoticed again (89 instead of 69 in one test game).
 */
const LEADER_LEVELLING = 0.5;

/**
 * The shift that gives `seat` an even chance (1 in n) in this position: its strength moved to the
 * others' soft average (log-mean-exp at the softmax's sharpness), half way only when it is ahead. The
 * analysis judges every candidate with it, so a seat far behind still sees its moves' differences:
 * unlevelled, a seat at 3% lost under 4 points for skipping a city, at 1% almost nothing for anything.
 */
export function levelling(s: GameState, seat: number): Shift {
  const { fade, weights, beta } = context(s);
  const all = s.players.map((_, i) => strength(s, i, fade, weights));
  const others = all.filter((_, i) => i !== seat);
  if (!others.length) return { seat, by: 0 };
  const top = Math.max(...others);
  const soft = top + Math.log(others.reduce((a, o) => a + Math.exp(beta * (o - top)), 0) / others.length) / beta;
  const by = soft - all[seat];
  return { seat, by: by < 0 ? by * LEADER_LEVELLING : by };
}
