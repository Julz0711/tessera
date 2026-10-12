/**
 * Game analysis ("accuracy"): every real decision a seat made is compared with a few alternatives by
 * Monte Carlo. Each candidate is applied, then the bots play on until the turn it was made in is over
 * (hidden randomness — RNG and deck order — re-drawn per rollout, the same draws for every candidate),
 * and the static evaluation turns the position reached into win chances. The win% the move played gave
 * up against the best candidate is its loss; the average loss becomes the 1–100 accuracy (accuracy.ts).
 *
 * The win chances are "levelled": every candidate of a decision is judged as if the decider had an even
 * chance (1 in n) before it (half way down for a seat ahead; evaluate.ts, `levelling`). Raw win chances
 * squash differences once a seat is behind — a seat at 3% lost under 4 points for not building a city it
 * could afford, so a player who skipped half their builds all game still scored ~90. Levelled, that
 * skipped city costs 20–45 points (a blunder) wherever the seat stands, and a missed win is still one.
 *
 * Why only to the end of the turn: rollouts through a whole round (tried first) let the next players'
 * dice decide, and two rollouts then differed by up to 30 win% for the same move (a win or a loss near
 * the end) — noise that swamped the moves' real differences. Finishing the turn still plays out what
 * the move leads to (the builds after a trade, the steal after the robber, the rest of the setup) and
 * finds a missed win, while costing ~10 simulated actions per candidate.
 *
 * Built to be cheap: a hard budget of simulated actions and wall time. Over budget it first drops to
 * one rollout per candidate, then to three candidates, then stops (`partial`). Decisions are taken in
 * an interleaved order (every 8th, then every 4th, …), priority seats (humans) first, so a cut-off
 * analysis still covers the whole game. Deterministic for a given game and work budget.
 */
import {
  PIPS,
  applyAction,
  hasCards,
  legalSettlementSpots,
  publicVictoryPoints,
  robberTargets,
  robberVictims,
  handTotal,
  topo,
  viewFor,
  type Action,
  type GameState,
} from '@/engine';
import type { ReplayData } from '@/engine/replay';
import { normalizeSeed, shuffle } from '@/engine/rng';
import { goals as ckGoals } from '../ck';
import { goals as classicGoals } from '../classic';
import { resourceWeights, vertexScore } from '../eval';
import { botAction } from '../index';
import { seatsToAsk } from '../simulate';
import { LOSS_THRESHOLDS, accuracyFromLoss, classify } from './accuracy';
import { describeAction } from './describeAction';
import { devCardValue, levelling, winChances } from './evaluate';
import type { FlaggedMove, GameAnalysis, PlayerAccuracy } from './types';

export interface AnalysisOptions {
  /** Candidates per decision, the move played included (K). */
  candidates?: number;
  /** Rollouts per candidate (R). */
  rollouts?: number;
  /** Turns a rollout plays past the decision's own (0: it stops when that turn ends) … */
  horizonTurns?: number;
  /** … and the most actions it plays. */
  horizonActions?: number;
  /** Budget in simulated actions (deterministic) … */
  maxWork?: number;
  /** … and in wall time (a safety net on a slow machine). */
  maxMs?: number;
  /** Seats analysed first (the humans): bots only get what budget is left. */
  prioritySeats?: number[];
  now?: () => number;
  /**
   * Called after each decision with the time it took; may block to give the CPU back (the worker
   * idles so on a one-core server the game rooms keep most of it). Idle time isn't budgeted.
   */
  pause?: (busyMs: number) => void;
}

/**
 * Defaults sized for a free hosting tier. A whole game is usually 2k–8k simulated actions (1–10 s on a
 * laptop core, sea maps the slowest); 25k leaves room for long games, and the wall-time cap stops a
 * slow (shared, 0.1-CPU) server from going on much longer than half a minute of its own CPU time.
 */
export const ANALYSIS_DEFAULTS = { candidates: 5, rollouts: 2, horizonTurns: 0, horizonActions: 60, maxWork: 25_000, maxMs: 30_000 } as const;

/** Action types that are never a decision worth grading (or have no alternative to compare). */
const NOT_DECISIONS = new Set<Action['type']>(['rollDice', 'cancelTrade', 'embargo', 'cancelEndTurn']);

/** A move that may have been a choice; its candidates are looked for only when its turn comes. */
interface Decision {
  index: number;
  seat: number;
  action: Action;
  /** The state before the move (log and stats dropped: no rule or bot reads them, and they are the bulk). */
  state: GameState;
}

/** Stable key for comparing actions (field order differs between the bots and stored JSON). */
function key(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(key).join(',')}]`;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj).filter((k) => obj[k] !== undefined).sort().map((k) => `${k}:${key(obj[k])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

function hash(a: number, b: number): number {
  let h = (a ^ Math.imul(b + 0x9e3779b9, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Every 2^k-th index first, then the gaps: any prefix is spread over the whole game. */
export function interleave<T>(items: T[]): T[] {
  const out: T[] = [];
  const seen = new Set<number>();
  let stride = 1;
  while (stride * 2 <= items.length) stride *= 2;
  for (; stride >= 1; stride /= 2) {
    for (let i = 0; i < items.length; i += stride) {
      if (seen.has(i)) continue;
      seen.add(i);
      out.push(items[i]);
    }
  }
  return out;
}

class Budget {
  work = 0;
  constructor(readonly maxWork: number) {}
  spend(n = 1) {
    this.work += n;
  }
}

// ── Candidates ──────────────────────────────────────────────────────────────

/** Robber spots that hurt the others most (and the seat itself least), with the richest victim. */
function robberCandidates(s: GameState, seat: number, pirate: boolean): Action[] {
  const t = topo(s);
  const targets = robberTargets(s, seat, (o) => publicVictoryPoints(s, o), pirate);
  const score = (h: number) => {
    const tile = s.board.hexes[h];
    if (tile.terrain === 'sea') return robberVictims(s, seat, h).length ? 3 : 0;
    const pips = tile.token ? PIPS[tile.token] : 0;
    let n = robberVictims(s, seat, h).length ? 3 : 0;
    for (const v of t.hexes[h].vertices) {
      const b = s.buildings[v];
      if (b) n += (b.owner === seat ? -25 : pips * (b.city ? 2 : 1) * (1 + publicVictoryPoints(s, b.owner) / 4));
    }
    return n;
  };
  return targets
    .map((h) => ({ h, v: score(h) }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 3)
    .map(({ h }) => {
      const victims = robberVictims(s, seat, h).sort((a, b) => publicVictoryPoints(s, b) * 10 + handTotal(s.players[b].hand) - (publicVictoryPoints(s, a) * 10 + handTotal(s.players[a].hand)));
      return { type: 'moveRobber', hex: h, victim: victims[0] ?? null } as Action;
    });
}

/**
 * The move played plus up to `max - 1` legal alternatives: the bot's own choice first, then what the
 * situation offers (ending the turn, affordable builds, other robber spots or starting corners, the
 * other answer to a trade). Null when there is nothing to choose between.
 */
export function candidatesFor(s: GameState, seat: number, taken: Action, max: number, budget?: Budget): Action[] | null {
  if (s.phase === 'ended' || NOT_DECISIONS.has(taken.type)) return null;
  const quiet: GameState = { ...s, log: [] };
  const view = viewFor(quiet, seat);
  const options: Action[] = [taken];
  const add = (a: Action | null | undefined) => {
    if (a) options.push(a);
  };
  try {
    add(botAction(view, seat, { tradeTimedOut: true }));
  } catch {
    // A bot that can't read this position just offers no alternative.
  }
  const prompt = s.pending.find((p) => p.seat === seat);
  if (taken.type === 'respondTrade') add({ ...taken, accept: !taken.accept });
  else if (taken.type === 'confirmTrade') add({ type: 'cancelTrade', id: taken.id });
  else if (taken.type === 'moveRobber' && prompt?.kind === 'robber') robberCandidates(s, seat, prompt.reason !== 'bishop').forEach(add);
  else if (taken.type === 'buildSettlement' && s.phase === 'setup') {
    const weights = resourceWeights(view);
    legalSettlementSpots(s, seat, true)
      .map((v) => ({ v, score: vertexScore(view, seat, v, weights) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .forEach(({ v }) => add({ type: 'buildSettlement', vertex: v }));
  }
  const ownTurn = s.phase === 'play' && s.turn.seat === seat && !s.pending.length;
  if (ownTurn && !s.turn.rolled && taken.type !== 'rollDice') add({ type: 'rollDice' });
  if (ownTurn && s.turn.rolled && !s.trades.some((t) => t.from === seat)) {
    add({ type: 'endTurn' });
    const hand = s.players[seat].hand;
    try {
      // A development card only when the bot would buy one (its own choice, above) or it was bought: its worth
      // is in later plays the evaluation can't see, and offering it everywhere flagged every bot that saved
      // its ore and grain for a city.
      for (const g of (s.mode === 'ck' ? ckGoals : classicGoals)(view, seat)) if (g.action.type !== 'buyDevCard' && hasCards(hand, g.cost)) add(g.action);
    } catch {
      // As above: no alternatives from a bot that fails here.
    }
  }

  const seen = new Set<string>();
  const out: Action[] = [];
  for (const a of options) {
    if (out.length >= max) break;
    // An offer to the other players is never an alternative: whether they take it isn't up to the decider,
    // so "you should have offered" can't be held against a move (bank and port trades are certain and stay).
    if (a !== taken && a.type === 'offerTrade') continue;
    const k = key(a);
    if (seen.has(k)) continue;
    seen.add(k);
    // The move played is legal (it was played); the others are checked.
    if (out.length) {
      budget?.spend();
      if (!applyAction(quiet, seat, a).ok) continue;
    }
    out.push(a);
  }
  return out.length >= 2 ? out : null;
}

/** Would one more knight played now take (or tie into) the Largest Army? */
function takesLargestArmy(s: GameState, seat: number): boolean {
  const knights = s.players[seat].knightsPlayed + 1;
  const holder = s.largestArmy;
  return knights >= 3 && holder !== seat && (holder === null || holder === undefined || knights > s.players[holder].knightsPlayed);
}

// ── Rollouts ────────────────────────────────────────────────────────────────

/** One bot move for whoever should act next, or null when nobody can (or a bot fails). */
function botStep(s: GameState): GameState | null {
  for (const seat of seatsToAsk(s)) {
    let action: Action | null;
    try {
      action = botAction(viewFor(s, seat), seat, { tradeTimedOut: true });
    } catch {
      return null;
    }
    if (!action) continue;
    const r = applyAction(s, seat, action);
    return r.ok ? r.state : null;
  }
  return null;
}

function rollout(s: GameState, stopTurn: number, cap: number, budget: Budget): GameState {
  for (let n = 0; n < cap && s.phase !== 'ended' && s.turn.n < stopTurn; n++) {
    const next = botStep(s);
    budget.spend();
    if (!next) break;
    s = next;
  }
  return s;
}

/** The decision's state with the hidden randomness re-drawn: RNG (dice, steals) and deck order. */
function reseeded(s: GameState, seed: number): GameState {
  const holder = { rng: seed };
  return {
    ...s,
    log: [],
    nextRoll: null,
    devDeck: shuffle(holder, s.devDeck.slice()),
    progressDecks: {
      trade: shuffle(holder, s.progressDecks.trade.slice()),
      politics: shuffle(holder, s.progressDecks.politics.slice()),
      science: shuffle(holder, s.progressDecks.science.slice()),
    },
    rng: holder.rng,
  };
}

// ── The analysis ────────────────────────────────────────────────────────────

const round1 = (x: number) => Math.round(x * 10) / 10;

export function analyseGame(data: Pick<ReplayData, 'initial' | 'steps' | 'incomplete'>, options: AnalysisOptions = {}): GameAnalysis {
  const opts = { ...ANALYSIS_DEFAULTS, ...options };
  const now = options.now ?? (() => performance.now());
  const started = now();
  let paused = 0;
  const elapsed = () => now() - started - paused;
  const budget = new Budget(opts.maxWork);
  const outOfTime = () => budget.work >= opts.maxWork || elapsed() >= opts.maxMs;

  // Walk the game once, keeping the state before every move that may have been a choice. Finding the
  // candidates waits for the analysis proper, so a cut-off still spreads over the whole game.
  let state: GameState = structuredClone(data.initial);
  state.ships ??= state.roads.map(() => null);
  state.turn.shipsBuilt ??= [];
  state.turn.shipsMoved ??= false;
  const baseSeed = normalizeSeed(state.rng ?? 1);
  const decisions: Decision[] = [];
  let stopped = !!data.incomplete;
  for (let i = 0; i < data.steps.length; i++) {
    const { seat, action } = data.steps[i];
    if (state.phase !== 'ended' && !NOT_DECISIONS.has(action.type)) {
      decisions.push({ index: i, seat, action, state: { ...state, log: [], stats: undefined as unknown as GameState['stats'] } });
    }
    const r = applyAction(state, seat, action);
    if (!r.ok) {
      stopped = true;
      break;
    }
    state = r.state;
  }
  if (state.phase !== 'ended') stopped = true;

  const priority = new Set(opts.prioritySeats ?? []);
  const order = [...interleave(decisions.filter((d) => priority.has(d.seat))), ...interleave(decisions.filter((d) => !priority.has(d.seat)))];

  const players: PlayerAccuracy[] = state.players.map((_, seat) => ({
    seat,
    accuracy: null,
    decisions: decisions.filter((d) => d.seat === seat).length,
    analysed: 0,
    averageLoss: 0,
    inaccuracies: 0,
    mistakes: 0,
    blunders: 0,
    complete: false,
  }));
  const lossSum = players.map(() => 0);
  const moves: FlaggedMove[] = [];
  let level = 0;
  let rollouts: number = opts.rollouts;
  let candidates: number = opts.candidates;
  const workStart = budget.work;
  const msStart = elapsed();
  let done = 0;

  for (const d of order) {
    if (outOfTime()) break;
    const decisionStart = now();
    const s = d.state;
    done++;
    const found = candidatesFor(s, d.seat, d.action, candidates, budget);
    if (!found) {
      // Nothing else was on offer: not a decision after all.
      players[d.seat].decisions--;
      continue;
    }
    // Setup counts as turn 0: its rollouts play the rest of the setup.
    const stopTurn = (s.phase === 'setup' ? 0 : s.turn.n) + opts.horizonTurns + 1;
    const options = found;
    const wins = options.map(() => 0);
    // Every candidate is judged as if the decider had an even chance here (see `levelling`), with newly
    // bought development cards at the deck's average.
    const shift = levelling(s, d.seat);
    const fresh = { from: s.turn.n, value: devCardValue(s) };
    const valid = options.map(() => true);
    for (let r = 0; r < rollouts; r++) {
      const base = reseeded(s, hash(hash(baseSeed, d.index), r));
      options.forEach((action, c) => {
        if (!valid[c]) return;
        budget.spend();
        const applied = applyAction(base, d.seat, action);
        if (!applied.ok) {
          valid[c] = false;
          return;
        }
        // The rest of the rollout draws from the same RNG for every candidate.
        const end = rollout({ ...applied.state, rng: base.rng }, stopTurn, opts.horizonActions, budget);
        wins[c] += winChances(end, shift, fresh)[d.seat];
      });
    }
    if (valid[0]) {
      const pct = wins.map((w, c) => (valid[c] ? (100 * w) / rollouts : -Infinity));
      let best = 0;
      pct.forEach((p, c) => {
        if (p > pct[best]) best = c;
      });
      let loss = round1(Math.max(0, pct[best] - pct[0]));
      // Holding a knight keeps its worth (the robber may be on the opponent already, a later 7 or a
      // blocked builder may need it), which the end-of-turn evaluation can't see: not playing one that
      // doesn't win the Largest Army is at most an inaccuracy, however the rollouts fell.
      if (options[best].type === 'playKnight' && options[0].type !== 'playKnight' && !takesLargestArmy(s, d.seat)) {
        loss = Math.min(loss, LOSS_THRESHOLDS.mistake - 0.1);
      }
      const p = players[d.seat];
      p.analysed++;
      lossSum[d.seat] += loss;
      const verdict = classify(loss);
      if (verdict) {
        if (verdict === 'blunder') p.blunders++;
        else if (verdict === 'mistake') p.mistakes++;
        else p.inaccuracies++;
        // Two knights (or walls) told apart by where they go.
        let played = describeAction(s, options[0]);
        let bestText = describeAction(s, options[best]);
        if (played === bestText) {
          played = describeAction(s, options[0], true);
          bestText = describeAction(s, options[best], true);
        }
        moves.push({
          step: d.index,
          seat: d.seat,
          verdict,
          loss,
          winPlayed: round1(pct[0]),
          winBest: round1(pct[best]),
          played,
          best: bestText,
        });
      }
    } else {
      // The move played can't be re-applied (it shouldn't happen): it isn't graded.
      players[d.seat].decisions--;
    }

    // Projected over budget: fewer rollouts first, then fewer candidates.
    if (done >= 6 && level < 2) {
      const left = order.length - done;
      const workPer = (budget.work - workStart) / done;
      const msPer = (elapsed() - msStart) / done;
      const over = budget.work + workPer * left > opts.maxWork || elapsed() + msPer * left > opts.maxMs;
      if (over) {
        level++;
        if (level === 1 && rollouts > 1) rollouts = 1;
        else {
          level = 2;
          rollouts = 1;
          candidates = Math.min(candidates, 3);
        }
      }
    }
    if (opts.pause) {
      const idleFrom = now();
      opts.pause(idleFrom - decisionStart);
      paused += now() - idleFrom;
    }
  }

  for (const p of players) {
    if (p.analysed) {
      p.averageLoss = round1(lossSum[p.seat] / p.analysed);
      p.accuracy = accuracyFromLoss(lossSum[p.seat] / p.analysed);
    }
    p.complete = !stopped && p.analysed === p.decisions;
  }
  moves.sort((a, b) => a.step - b.step);
  return {
    version: 1,
    players,
    moves,
    partial: stopped || done < order.length,
    search: { candidates, rollouts, horizonTurns: opts.horizonTurns, level },
    work: budget.work,
    ms: Math.round(elapsed()),
  };
}
