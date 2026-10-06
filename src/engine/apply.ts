import { applyCkAction, isCkAction, resolveCkPrompt } from './ck/actions';
import { pickGold } from './rules/fog';
import { RuleError, assertRule } from './errors';
import { checkWinner, updateLongestRoad } from './rules/awards';
import { buildCity, buildRoad, buildSettlement, buildShip, moveShip, placeFreeRoad, placeFreeShip } from './rules/build';
import { removePrompt } from './rules/common';
import { buyDevCard, playKnight, playMonopoly, playRoadBuilding, playYearOfPlenty } from './rules/dev';
import { advance, endTurn, rollDice } from './rules/flow';
import { discard, moveRobber } from './rules/robber';
import { setupRoad, setupSettlement, setupShip } from './rules/setup';
import { bankExchange, bankTrade, cancelTrade, confirmTrade, offerTrade, respondTrade, setEmbargo, sweepTrades } from './rules/trade';
import { makeCtx, type Ctx } from './state';
import { newDetails, recordActionStats } from './detailedStats';
import { cloneStats, newStats } from './stats';
import type { Action, ActionType, ApplyResult, GameState, Prompt, PromptKind } from './types';

/** Which prompt kinds each action can answer. */
const PROMPT_ACTIONS: Partial<Record<ActionType, PromptKind[]>> = {
  discard: ['discard'],
  moveRobber: ['robber'],
  buildRoad: ['freeRoads', 'moveRoad'],
  buildShip: ['freeRoads', 'moveRoad'],
  skipFreeRoads: ['freeRoads', 'moveRoad'],
  loseCity: ['loseCity'],
  relocateKnight: ['relocateKnight'],
  chooseDeck: ['rewardDeck'],
  aqueduct: ['aqueduct'],
  pickGold: ['goldPick'],
  discardProgress: ['discardProgress'],
  cancelEndTurn: ['discardProgress'],
  giveCards: ['giveCards', 'commercialHarbor'],
  removeKnight: ['deserterRemove'],
  placeKnight: ['deserterPlace'],
  takeProgress: ['spy'],
  takeCards: ['masterMerchant'],
  placeMetropolis: ['placeMetropolis'],
};

/**
 * Applies one action for `seat`. Never mutates `state`; returns the next state and the events
 * produced, or an error message when the action is illegal.
 */
export function applyAction(state: GameState, seat: number, action: Action): ApplyResult {
  if (!action || typeof action !== 'object' || typeof (action as { type?: unknown }).type !== 'string') {
    return { ok: false, error: 'Invalid action' };
  }
  // Events are immutable once emitted, so the log is copied shallowly (it is the bulk of the state).
  const { log, stats, ...rest } = state;
  const s: GameState = { ...structuredClone(rest), stats: stats ? cloneStats(stats) : undefined!, log: log.slice() };
  if (!s.stats) { s.stats = newStats(s.players.length); s.stats.partial = true; s.stats.details = newDetails(s.turn.n, false); }
  const ctx = makeCtx(s, seat);
  try {
    assertRule(Number.isInteger(seat) && seat >= 0 && seat < s.players.length, 'Unknown player');
    assertRule(s.phase !== 'ended', 'The game is over');
    dispatch(ctx, action);
    if (s.trades.length) sweepTrades(ctx);
    advance(ctx);
    updateLongestRoad(ctx);
    checkWinner(ctx);
    recordActionStats(state, s, seat, action, ctx.events);
    return { ok: true, state: s, events: ctx.events };
  } catch (err) {
    if (err instanceof RuleError) return { ok: false, error: err.message };
    throw err;
  }
}

function dispatch(ctx: Ctx, action: Action): void {
  const s = ctx.s;
  // An embargo is a standing choice, not a move: it can be set at any time, prompts or not.
  if (action.type === 'embargo') return setEmbargo(ctx, action.seat, action.on);
  const kinds = PROMPT_ACTIONS[action.type];
  if (kinds) {
    const prompt = s.pending.find((p) => p.seat === ctx.seat && kinds.includes(p.kind));
    if (prompt) return resolvePrompt(ctx, prompt, action);
  }
  if (s.pending.length) {
    const waiting = s.pending.some((p) => p.seat === ctx.seat);
    throw new RuleError(waiting ? 'Finish your current decision first' : 'Waiting for other players');
  }

  if (s.phase === 'setup') {
    if (action.type === 'buildSettlement') return setupSettlement(ctx, action.vertex);
    if (action.type === 'buildRoad') return setupRoad(ctx, action.edge);
    if (action.type === 'buildShip') return setupShip(ctx, action.edge);
    throw new RuleError('Place your starting pieces first');
  }

  switch (action.type) {
    case 'rollDice':
      return rollDice(ctx);
    case 'endTurn':
      return endTurn(ctx);
    case 'buildRoad':
      return buildRoad(ctx, action.edge);
    case 'buildShip':
      return buildShip(ctx, action.edge);
    case 'moveShip':
      return moveShip(ctx, action.from, action.to);
    case 'buildSettlement':
      return buildSettlement(ctx, action.vertex);
    case 'buildCity':
      return buildCity(ctx, action.vertex);
    case 'buyDevCard':
      return buyDevCard(ctx);
    case 'playKnight':
      return playKnight(ctx);
    case 'playRoadBuilding':
      return playRoadBuilding(ctx);
    case 'playYearOfPlenty':
      return playYearOfPlenty(ctx, action.resources);
    case 'playMonopoly':
      return playMonopoly(ctx, action.resource);
    case 'bankTrade':
      return bankTrade(ctx, action.give, action.get, action.count);
    case 'bankExchange':
      return bankExchange(ctx, action.give, action.get);
    case 'offerTrade':
      return offerTrade(ctx, action.give, action.want, action.to, action.open);
    case 'respondTrade':
      return respondTrade(ctx, action.id, action.accept);
    case 'confirmTrade':
      return confirmTrade(ctx, action.id, action.partner);
    case 'cancelTrade':
      return cancelTrade(ctx, action.id);
    default:
      if (isCkAction(action)) return applyCkAction(ctx, action);
      throw new RuleError('That move is not possible right now');
  }
}

function resolvePrompt(ctx: Ctx, prompt: Prompt, action: Action): void {
  switch (prompt.kind) {
    case 'discard':
      if (action.type === 'discard') return discard(ctx, prompt, action.cards);
      break;
    case 'robber':
      if (action.type === 'moveRobber') return moveRobber(ctx, prompt, action.hex, action.victim);
      break;
    case 'freeRoads':
      if (action.type === 'buildRoad') return placeFreeRoad(ctx, prompt, action.edge);
      if (action.type === 'buildShip') return placeFreeShip(ctx, prompt, action.edge);
      if (action.type === 'skipFreeRoads') return removePrompt(ctx, prompt);
      break;
    case 'goldPick':
      if (action.type === 'pickGold') return pickGold(ctx, prompt, action.cards);
      break;
    default:
      return resolveCkPrompt(ctx, prompt, action);
  }
  throw new RuleError('That move is not possible right now');
}
