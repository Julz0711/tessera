/** Cities & Knights event-die handlers: the barbarian ship and progress-card draws. */
import { BARBARIAN_DISTANCE, MAX_PROGRESS_IN_HAND, VP_PROGRESS } from '../constants';
import { emit, type Ctx } from '../state';
import type { Prompt, Track } from '../types';
import { barbarianStrength, knightStrength } from './queries';

/** Reduces a city to a settlement (its wall is lost with it). */
export function loseCity(ctx: Ctx, seat: number, vertex: number): void {
  const b = ctx.s.buildings[vertex];
  if (!b || b.owner !== seat || !b.city || b.metropolis) return;
  b.city = false;
  b.wall = false;
  emit(ctx, { type: 'cityLost', seat, at: vertex });
}

function losableCities(ctx: Ctx, seat: number): number[] {
  const out: number[] = [];
  ctx.s.buildings.forEach((b, v) => {
    if (b && b.owner === seat && b.city && !b.metropolis) out.push(v);
  });
  return out;
}

export function runBarbarians(ctx: Ctx): void {
  const s = ctx.s;
  s.barbarian.position++;
  emit(ctx, { type: 'barbarianAdvanced', position: s.barbarian.position });
  if (s.barbarian.position < BARBARIAN_DISTANCE) return;

  const strength = barbarianStrength(s);
  const contributions = s.players.map((_, seat) => knightStrength(s, seat));
  const defense = contributions.reduce((a, b) => a + b, 0);
  const won = defense >= strength;
  const prompts: Prompt[] = [];
  let losers: number[] = [];
  let defenders: number[] = [];

  if (won) {
    const max = Math.max(...contributions);
    if (max > 0) defenders = contributions.flatMap((c, seat) => (c === max ? [seat] : []));
  } else {
    // Only players with a city the barbarians can take are considered; the weakest of them lose one.
    const candidates = s.players.map((_, seat) => seat).filter((seat) => losableCities(ctx, seat).length > 0);
    if (candidates.length) {
      const min = Math.min(...candidates.map((c) => contributions[c]));
      losers = candidates.filter((c) => contributions[c] === min);
    }
  }
  emit(ctx, { type: 'barbarianAttack', strength, defense, won, contributions, losers, defenders });

  if (defenders.length === 1) {
    s.players[defenders[0]].defender++;
    emit(ctx, { type: 'defenderAwarded', seat: defenders[0] });
  } else {
    for (const seat of defenders) prompts.push({ kind: 'rewardDeck', seat });
  }
  for (const seat of losers) {
    const cities = losableCities(ctx, seat);
    if (cities.length === 1) loseCity(ctx, seat, cities[0]);
    else prompts.push({ kind: 'loseCity', seat });
  }

  // Every knight goes home after the battle; the ship sails back to the start.
  for (const k of s.knights) if (k) k.active = false;
  s.barbarian.position = 0;
  s.barbarian.attacks++;
  s.pending.push(...prompts);
}

/** Queues a discard prompt when a player holds more than 4 (non-VP) progress cards. */
export function checkProgressLimit(ctx: Ctx, seat: number): void {
  const s = ctx.s;
  if (s.players[seat].progress.length <= MAX_PROGRESS_IN_HAND) return;
  // On your own turn the extra card may still be played; the limit is checked when the turn ends.
  if (s.phase === 'play' && s.turn.seat === seat) return;
  if (s.pending.some((p) => p.kind === 'discardProgress' && p.seat === seat)) return;
  s.pending.push({ kind: 'discardProgress', seat });
}

export function drawProgress(ctx: Ctx, seat: number, track: Track): void {
  const s = ctx.s;
  const card = s.progressDecks[track].shift();
  if (!card) return;
  const p = s.players[seat];
  if (VP_PROGRESS.includes(card.type)) {
    // Victory point cards are revealed immediately and stay in front of the player.
    p.progressVP++;
    emit(ctx, { type: 'progressPlayed', seat, card: card.type });
    return;
  }
  p.progress.push(card);
  emit(ctx, { type: 'progressDrawn', seat, track }, { data: { card: card.type }, to: [seat] });
  checkProgressLimit(ctx, seat);
}

/** City gate on the event die: everyone whose improvement covers the red die draws a card. */
export function runProgressDraw(ctx: Ctx, track: Track): void {
  const s = ctx.s;
  const red = s.turn.dice?.red ?? 0;
  const n = s.players.length;
  for (let i = 0; i < n; i++) {
    const seat = (s.turn.seat + i) % n;
    const level = s.players[seat].improvements[track];
    if (level >= 1 && red <= level + 1) drawProgress(ctx, seat, track);
  }
}
