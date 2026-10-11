/** Cities & Knights actions and prompt resolution. */
import { COSTS, KNIGHTS_PER_LEVEL, MAX_PROGRESS_IN_HAND, TRACK_COMMODITY } from '../constants';
import { recordSpend } from '../detailedStats';
import { RuleError, assertRule } from '../errors';
import { cardList, handTotal, hasCards, parseHand, removeCards, transfer } from '../hand';
import { isHex, isVertex, piecesLeft, topo } from '../queries';
import { removePrompt, requireMode, requireRolled } from '../rules/common';
import { revealAround } from '../rules/fog';
import { collectTreasures } from '../rules/treasure';
import { endTurn } from '../rules/flow';
import { relocateRobber } from '../rules/robber';
import { emit, nextId, type Ctx } from '../state';
import { COMMODITIES, TRACKS, isCommodity, isResource, type Action, type Knight, type KnightLevel, type PartialHand, type Prompt, type Track } from '../types';
import { checkProgressLimit, drawProgress, loseCity } from './events';
import { buildWallAt, displaceKnight, promoteKnightAt } from './pieces';
import { playProgress } from './progress';
import {
  canKnightAct,
  chasePirateKnights,
  chaseRobberKnights,
  improvementBlocker,
  improvementCost,
  knightMoveTargets,
  legalKnightSpots,
  ownKnightAt,
  promotableKnights,
  relocationSpots,
  routeMoveTargets,
  robberActive,
  wallSpots,
  wouldGainMetropolis,
} from './queries';

const CK_ACTIONS = new Set<Action['type']>([
  'buildKnight',
  'activateKnight',
  'promoteKnight',
  'moveKnight',
  'chaseRobber',
  'buildWall',
  'improveCity',
  'playProgress',
]);

export function isCkAction(action: Action): boolean {
  return CK_ACTIONS.has(action.type);
}

function pay(ctx: Ctx, cost: PartialHand, what: string): void {
  transfer(ctx.s.players[ctx.seat].hand, ctx.s.bank, cost, `Not enough resources to ${what}`);
  recordSpend(ctx.s, ctx.seat, cost, what);
}

// ── Knights ─────────────────────────────────────────────────────────────────

function buildKnight(ctx: Ctx, vertex: number): void {
  requireRolled(ctx);
  const s = ctx.s;
  assertRule(piecesLeft(s, ctx.seat).knights[1] > 0, 'No basic knights left in your supply');
  assertRule(isVertex(s, vertex) && legalKnightSpots(s, ctx.seat).includes(vertex), 'Knights go on an empty spot next to your roads');
  pay(ctx, COSTS.knight, 'recruit a knight');
  s.knights[vertex] = { id: nextId(s), owner: ctx.seat, level: 1, active: false, activatedOn: -1, promotedOn: -1 };
  emit(ctx, { type: 'knightBuilt', seat: ctx.seat, at: vertex });
}

function activateKnight(ctx: Ctx, vertex: number): void {
  requireRolled(ctx);
  const k = ownKnightAt(ctx.s, ctx.seat, vertex);
  assertRule(k, 'That is not your knight');
  assertRule(!k.active, 'That knight is already active');
  pay(ctx, COSTS.activate, 'activate a knight');
  k.active = true;
  k.activatedOn = ctx.s.turn.n;
  emit(ctx, { type: 'knightActivated', seat: ctx.seat, at: vertex });
}

function promoteKnight(ctx: Ctx, vertex: number): void {
  requireRolled(ctx);
  promoteKnightAt(ctx, vertex);
}

function moveKnight(ctx: Ctx, from: number, to: number): void {
  requireRolled(ctx);
  const s = ctx.s;
  assertRule(isVertex(s, from) && isVertex(s, to), 'Unknown intersection');
  assertRule(canKnightAct(s, ctx.seat, from), 'Only an active knight (not activated this turn) can move');
  const { moves, displaces } = knightMoveTargets(s, ctx.seat, from);
  assertRule(moves.includes(to) || displaces.includes(to), 'Your knight cannot reach that spot');
  const mine = s.knights[from]!;
  const victim = s.knights[to];
  s.knights[from] = null;
  s.knights[to] = { ...mine, active: false };
  if (victim) {
    emit(ctx, { type: 'knightDisplaced', seat: ctx.seat, victim: victim.owner, at: to });
    displaceKnight(ctx, to, victim);
  } else {
    emit(ctx, { type: 'knightMoved', seat: ctx.seat, from, to });
  }
}

function chaseRobber(ctx: Ctx, vertex: number, hex: number, victim: number | null): void {
  requireRolled(ctx);
  const s = ctx.s;
  assertRule(robberActive(s), 'The robber only appears after the first barbarian attack');
  assertRule(canKnightAct(s, ctx.seat, vertex), 'Only an active knight (not activated this turn) can chase the robber or pirate');
  assertRule(isHex(s, hex), 'Unknown hex');
  // A knight chases the piece it stands beside: the robber over land, the pirate over sea.
  if (s.board.hexes[hex].terrain === 'sea') {
    assertRule(chasePirateKnights(s, ctx.seat).includes(vertex), 'Your knight must stand next to the pirate to chase it');
  } else {
    assertRule(chaseRobberKnights(s, ctx.seat).includes(vertex), 'Your knight must stand next to the robber to chase it');
  }
  s.knights[vertex]!.active = false;
  relocateRobber(ctx, hex, victim, false, true);
}

// ── Walls & improvements ────────────────────────────────────────────────────

function placeMetropolisAt(ctx: Ctx, seat: number, track: Track, vertex: number, from: number | null): void {
  const b = ctx.s.buildings[vertex];
  assertRule(b && b.owner === seat && b.city && !b.metropolis, 'Pick one of your cities without a metropolis');
  b.metropolis = track;
  emit(ctx, { type: 'metropolis', seat, track, at: vertex, from });
}

function improveCity(ctx: Ctx, track: Track): void {
  requireRolled(ctx);
  const s = ctx.s;
  assertRule(TRACKS.includes(track), 'Unknown improvement');
  const blocker = improvementBlocker(s, ctx.seat, track);
  assertRule(!blocker, blocker ?? '');
  const cost = improvementCost(s, ctx.seat, track);
  const gainsMetropolis = wouldGainMetropolis(s, ctx.seat, track);
  if (cost > 0) pay(ctx, { [TRACK_COMMODITY[track]]: cost }, 'build that improvement');
  s.turn.crane = false;
  const p = s.players[ctx.seat];
  p.improvements[track]++;
  emit(ctx, { type: 'improved', seat: ctx.seat, track, level: p.improvements[track] });

  if (gainsMetropolis) {
    const previous = s.metropolis[track];
    if (previous !== null) {
      s.buildings.forEach((b) => {
        if (b && b.owner === previous && b.metropolis === track) b.metropolis = null;
      });
    }
    s.metropolis[track] = ctx.seat;
    // Always the player's pick (even with a single city), so the placement is a moment of its own.
    s.pending.push({ kind: 'placeMetropolis', seat: ctx.seat, track, from: previous });
  }
}

export function applyCkAction(ctx: Ctx, action: Action): void {
  requireMode(ctx, 'ck');
  switch (action.type) {
    case 'buildKnight':
      return buildKnight(ctx, action.vertex);
    case 'activateKnight':
      return activateKnight(ctx, action.vertex);
    case 'promoteKnight':
      return promoteKnight(ctx, action.vertex);
    case 'moveKnight':
      return moveKnight(ctx, action.from, action.to);
    case 'chaseRobber':
      return chaseRobber(ctx, action.vertex, action.hex, action.victim);
    case 'buildWall':
      requireRolled(ctx);
      return buildWallAt(ctx, action.vertex);
    case 'improveCity':
      return improveCity(ctx, action.track);
    case 'playProgress':
      return playProgress(ctx, action.card, action.params ?? {});
    default:
      throw new RuleError('That move is not possible right now');
  }
}

// ── Prompts ─────────────────────────────────────────────────────────────────

export function resolveCkPrompt(ctx: Ctx, prompt: Prompt, action: Action): void {
  const s = ctx.s;
  const me = s.players[ctx.seat];
  switch (prompt.kind) {
    case 'loseCity': {
      if (action.type !== 'loseCity') break;
      const b = s.buildings[action.vertex];
      assertRule(b && b.owner === ctx.seat && b.city && !b.metropolis, 'Pick one of your cities (metropolises are safe)');
      loseCity(ctx, ctx.seat, action.vertex);
      return removePrompt(ctx, prompt);
    }
    case 'relocateKnight': {
      if (action.type !== 'relocateKnight') break;
      if (action.vertex === null) {
        emit(ctx, { type: 'knightRemoved', seat: ctx.seat, at: prompt.from });
      } else {
        assertRule(relocationSpots(s, ctx.seat, prompt.from).includes(action.vertex), 'Move it along your roads to another empty spot');
        s.knights[action.vertex] = { ...prompt.knight };
        emit(ctx, { type: 'knightMoved', seat: ctx.seat, from: prompt.from, to: action.vertex });
      }
      return removePrompt(ctx, prompt);
    }
    case 'rewardDeck': {
      if (action.type !== 'chooseDeck') break;
      assertRule(TRACKS.includes(action.track), 'Pick a deck');
      removePrompt(ctx, prompt);
      return drawProgress(ctx, ctx.seat, action.track);
    }
    case 'aqueduct': {
      if (action.type !== 'aqueduct') break;
      assertRule(isResource(action.resource), 'Pick a resource');
      if (s.bank[action.resource] > 0) {
        s.bank[action.resource]--;
        me.hand[action.resource]++;
        emit(ctx, { type: 'received', seat: ctx.seat, cards: { [action.resource]: 1 }, reason: 'aqueduct' });
      }
      return removePrompt(ctx, prompt);
    }
    case 'discardProgress': {
      // Over the limit on the way out of your turn: you may go back and play a card instead.
      if (action.type === 'cancelEndTurn') {
        assertRule(!!prompt.endTurn, 'You have to discard down to 4 progress cards');
        return removePrompt(ctx, prompt);
      }
      if (action.type !== 'discardProgress') break;
      const i = me.progress.findIndex((c) => c.id === action.card);
      assertRule(i >= 0, 'Pick one of your progress cards');
      const [card] = me.progress.splice(i, 1);
      s.progressDecks[card.track].push(card);
      emit(ctx, { type: 'progressDiscarded', seat: ctx.seat, track: card.track });
      if (me.progress.length > MAX_PROGRESS_IN_HAND) return;
      removePrompt(ctx, prompt);
      // Asked on the way out of the turn: finish ending it.
      if (prompt.endTurn) endTurn(ctx);
      return;
    }
    case 'giveCards': {
      if (action.type !== 'giveCards') break;
      const cards = parseHand(action.cards);
      assertRule(handTotal(cards) === prompt.count, `Give exactly ${prompt.count} cards`);
      transfer(me.hand, s.players[prompt.to].hand, cards, "You don't have those cards");
      emit(ctx, { type: 'trade', seat: ctx.seat, partner: prompt.to, give: cards, get: {} });
      return removePrompt(ctx, prompt);
    }
    case 'commercialHarbor': {
      if (action.type !== 'giveCards') break;
      const cards = parseHand(action.cards);
      const entries = Object.entries(cards);
      assertRule(entries.length === 1 && entries[0][1] === 1 && isCommodity(entries[0][0]), 'Give one commodity');
      transfer(me.hand, s.players[prompt.from].hand, cards, "You don't have that commodity");
      emit(ctx, { type: 'trade', seat: ctx.seat, partner: prompt.from, give: cards, get: {} });
      return removePrompt(ctx, prompt);
    }
    case 'deserterRemove': {
      if (action.type !== 'removeKnight') break;
      const k = ownKnightAt(s, ctx.seat, action.vertex);
      assertRule(k, 'Pick one of your knights');
      s.knights[action.vertex] = null;
      emit(ctx, { type: 'knightRemoved', seat: ctx.seat, at: action.vertex });
      removePrompt(ctx, prompt);
      // The thief places a knight of the same strength, or failing that the strongest weaker one they have left,
      // with the same status (active or inactive) as the knight that deserted.
      const thief = prompt.to;
      const left = piecesLeft(s, thief).knights;
      const level = ([3, 2, 1] as KnightLevel[]).find((l) => l <= k.level && left[l] > 0 && KNIGHTS_PER_LEVEL[l] > 0);
      if (level && legalKnightSpots(s, thief).length) s.pending.push({ kind: 'deserterPlace', seat: thief, level, active: k.active });
      return;
    }
    case 'moveRoad': {
      if (action.type === 'skipFreeRoads') return removePrompt(ctx, prompt);
      // A ship moves on as a ship, a road as a road.
      const ship = s.ships[prompt.from] === ctx.seat;
      if (action.type !== (ship ? 'buildShip' : 'buildRoad')) break;
      assertRule(routeMoveTargets(s, ctx.seat, prompt.from).includes(action.edge), `Your ${ship ? 'ship' : 'road'} cannot go there`);
      if (ship) {
        s.ships[prompt.from] = null;
        s.ships[action.edge] = ctx.seat;
        emit(ctx, { type: 'shipMoved', seat: ctx.seat, from: prompt.from, to: action.edge });
      } else {
        s.roads[prompt.from] = null;
        s.roads[action.edge] = ctx.seat;
        emit(ctx, { type: 'roadRemoved', seat: ctx.seat, owner: ctx.seat, at: prompt.from });
        emit(ctx, { type: 'built', seat: ctx.seat, piece: 'road', at: action.edge, free: true });
      }
      revealAround(ctx, [topo(s).edges[action.edge].a, topo(s).edges[action.edge].b]);
      removePrompt(ctx, prompt);
      return collectTreasures(ctx, action.edge);
    }
    case 'deserterPlace': {
      if (action.type !== 'placeKnight') break;
      if (action.vertex !== null) {
        assertRule(legalKnightSpots(s, ctx.seat).includes(action.vertex), 'Place it on an empty spot next to your roads');
        assertRule(piecesLeft(s, ctx.seat).knights[prompt.level] > 0 && KNIGHTS_PER_LEVEL[prompt.level] > 0, 'No knight of that strength left');
        // An active deserter arrives ready for the barbarians, but counts as activated this turn (it can't act yet).
        const active = prompt.active === true;
        s.knights[action.vertex] = { id: nextId(s), owner: ctx.seat, level: prompt.level, active, activatedOn: active ? s.turn.n : -1, promotedOn: -1 };
        emit(ctx, { type: 'knightBuilt', seat: ctx.seat, at: action.vertex });
      }
      return removePrompt(ctx, prompt);
    }
    case 'spy': {
      if (action.type !== 'takeProgress') break;
      const victim = s.players[prompt.victim];
      const i = victim.progress.findIndex((c) => c.id === action.card);
      assertRule(i >= 0, 'Pick one of their cards');
      const [card] = victim.progress.splice(i, 1);
      me.progress.push(card);
      emit(ctx, { type: 'progressDrawn', seat: ctx.seat, track: card.track, from: prompt.victim }, { data: { card: card.type }, to: [ctx.seat, prompt.victim] });
      removePrompt(ctx, prompt);
      return checkProgressLimit(ctx, ctx.seat);
    }
    case 'masterMerchant': {
      if (action.type !== 'takeCards') break;
      const cards = parseHand(action.cards);
      assertRule(handTotal(cards) === prompt.count, `Take exactly ${prompt.count} cards`);
      const victim = s.players[prompt.victim].hand;
      assertRule(hasCards(victim, cards), 'They do not have those cards');
      removeCards(victim, cards);
      for (const c of cardList(cards)) me.hand[c]++;
      emit(ctx, { type: 'received', seat: ctx.seat, cards, reason: 'masterMerchant', from: prompt.victim });
      return removePrompt(ctx, prompt);
    }
    case 'placeMetropolis': {
      if (action.type !== 'placeMetropolis') break;
      placeMetropolisAt(ctx, ctx.seat, prompt.track, action.vertex, prompt.from ?? null);
      return removePrompt(ctx, prompt);
    }
    default:
      break;
  }
  throw new RuleError('That move is not possible right now');
}

