import { ABILITY_LEVEL, EVENT_DIE, TERRAIN_COMMODITY, TERRAIN_RESOURCE } from '../constants';
import { runBarbarians, runProgressDraw } from '../ck/events';
import { assertRule } from '../errors';
import { compactHand, emptyHand, handTotal } from '../hand';
import { handLimit } from '../queries';
import { randomInt, rollDie } from '../rng';
import { emit, type Ctx } from '../state';
import { CARDS, type Hand, type Prompt, type Step } from '../types';
import { checkWinner } from './awards';
import { requireActive } from './common';

/** Runs queued steps while no prompt is pending. */
export function advance(ctx: Ctx): void {
  const s = ctx.s;
  let guard = 0;
  while (s.phase === 'play' && s.pending.length === 0 && s.steps.length > 0) {
    if (++guard > 200) throw new Error('advance(): runaway step loop');
    runStep(ctx, s.steps.shift()!);
  }
}

function runStep(ctx: Ctx, step: Step): void {
  switch (step.kind) {
    case 'produce':
      produce(ctx);
      break;
    case 'seven':
      seven(ctx);
      break;
    case 'barbarians':
      runBarbarians(ctx);
      break;
    case 'progressDraw':
      runProgressDraw(ctx, step.track);
      break;
    case 'prompts':
      ctx.s.pending.push(...step.prompts);
      break;
  }
}

export function rollDice(ctx: Ctx): void {
  requireActive(ctx);
  const s = ctx.s;
  assertRule(!s.turn.rolled, 'You already rolled this turn');
  const preset = s.turn.alchemist;
  const red = preset ? preset.red : rollDie(s);
  const yellow = preset ? preset.yellow : rollDie(s);
  const event = s.mode === 'ck' ? EVENT_DIE[randomInt(s, EVENT_DIE.length)] : undefined;
  s.turn.alchemist = null;
  s.turn.rolled = true;
  s.turn.dice = event ? { red, yellow, event } : { red, yellow };
  emit(ctx, { type: 'diceRolled', seat: ctx.seat, dice: s.turn.dice });

  if (event) s.steps.push(event === 'ship' ? { kind: 'barbarians' } : { kind: 'progressDraw', track: event });
  s.steps.push(red + yellow === 7 ? { kind: 'seven' } : { kind: 'produce' });
}

/** Distributes production for the current roll, applying the bank-shortage rule. */
export function produce(ctx: Ctx): void {
  const s = ctx.s;
  const dice = s.turn.dice;
  if (!dice) return;
  const total = dice.red + dice.yellow;
  const demand: Hand[] = s.players.map(() => emptyHand());
  // Gold (Black Forest): a free pick per settlement, two per city.
  const goldPicks = s.players.map(() => 0);

  for (const hex of s.board.hexes) {
    if (hex.token !== total || hex.id === s.robber || hex.fog) continue;
    if (hex.terrain === 'gold') {
      for (const v of ctx.topo.hexes[hex.id].vertices) {
        const b = s.buildings[v];
        if (b) goldPicks[b.owner] += b.city ? 2 : 1;
      }
      continue;
    }
    const res = TERRAIN_RESOURCE[hex.terrain];
    if (!res) continue;
    for (const v of ctx.topo.hexes[hex.id].vertices) {
      const b = s.buildings[v];
      if (!b) continue;
      if (!b.city) demand[b.owner][res] += 1;
      else if (s.mode === 'ck' && TERRAIN_COMMODITY[hex.terrain]) {
        demand[b.owner][res] += 1;
        demand[b.owner][TERRAIN_COMMODITY[hex.terrain]!] += 1;
      } else demand[b.owner][res] += 2;
    }
  }

  const gains: Hand[] = s.players.map(() => emptyHand());
  for (const card of CARDS) {
    const wanted = demand.reduce((n, h) => n + h[card], 0);
    if (!wanted) continue;
    if (wanted <= s.bank[card]) {
      demand.forEach((h, seat) => (gains[seat][card] = h[card]));
    } else {
      const claimants = demand.flatMap((h, seat) => (h[card] > 0 ? [seat] : []));
      if (claimants.length === 1) gains[claimants[0]][card] = s.bank[card];
      emit(ctx, { type: 'shortage', card });
    }
  }
  gains.forEach((g, seat) => {
    for (const card of CARDS) {
      s.bank[card] -= g[card];
      s.players[seat].hand[card] += g[card];
    }
  });
  if (gains.some((g) => handTotal(g) > 0)) emit(ctx, { type: 'produced', gains: gains.map(compactHand) });
  goldPicks.forEach((count, seat) => {
    if (count) s.pending.push({ kind: 'goldPick', seat, count });
  });

  // C&K Aqueduct: players with Science ≥ 3 who got nothing from a production roll pick a resource.
  if (s.mode === 'ck') {
    const prompts: Prompt[] = [];
    s.players.forEach((p, seat) => {
      if (p.improvements.science >= ABILITY_LEVEL && handTotal(gains[seat]) === 0 && !goldPicks[seat]) prompts.push({ kind: 'aqueduct', seat });
    });
    s.pending.push(...prompts);
  }
}

/** A 7: everyone above their hand limit discards half, then the roller moves the robber. */
export function seven(ctx: Ctx): void {
  const s = ctx.s;
  const discards: Prompt[] = [];
  s.players.forEach((p, seat) => {
    const count = handTotal(p.hand);
    if (count > handLimit(s, seat)) discards.push({ kind: 'discard', seat, count: Math.floor(count / 2), reason: 'seven' });
  });
  s.pending.push(...discards);
  // In C&K the robber only becomes active after the first barbarian attack.
  if (s.mode === 'classic' || s.barbarian.attacks > 0) {
    s.steps.unshift({ kind: 'prompts', prompts: [{ kind: 'robber', seat: s.turn.seat, reason: 'seven' }] });
  }
}

export function endTurn(ctx: Ctx): void {
  requireActive(ctx);
  const s = ctx.s;
  assertRule(s.turn.rolled, 'Roll the dice first');
  s.trades = [];
  const next = (s.turn.seat + 1) % s.players.length;
  s.turn = {
    seat: next,
    n: s.turn.n + 1,
    rolled: false,
    dice: null,
    devPlayed: false,
    crane: false,
    merchantFleet: [],
    alchemist: null,
  };
  emit(ctx, { type: 'turnStarted', seat: next, n: s.turn.n });
  checkWinner(ctx);
}
