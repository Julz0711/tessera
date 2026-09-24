import { MAX_OPEN_TRADES } from '../constants';
import { assertRule } from '../errors';
import { commodityTotal, handTotal, hasCards, parseHand, sameCardTypes, transfer } from '../hand';
import { bankRatio } from '../queries';
import { emit, nextId, type Ctx } from '../state';
import { isCard, isCommodity, type Card, type PartialHand, type TradeOffer } from '../types';
import { isInt, requireActive, requireRolled } from './common';

export function bankTrade(ctx: Ctx, give: Card, get: Card, count: number): void {
  requireRolled(ctx);
  const s = ctx.s;
  assertRule(isCard(give) && isCard(get), 'Unknown card');
  assertRule(give !== get, 'Pick two different cards');
  assertRule(isInt(count, 1, 20), 'Invalid amount');
  if (s.mode === 'classic') assertRule(!isCommodity(give) && !isCommodity(get), 'Unknown card');
  const ratio = bankRatio(s, ctx.seat, give);
  const pay = { [give]: ratio * count } as PartialHand;
  const receive = { [get]: count } as PartialHand;
  assertRule(s.bank[get] >= count, `The bank doesn't have enough ${get}`);
  transfer(s.players[ctx.seat].hand, s.bank, pay, `You need ${ratio * count} ${give}`);
  transfer(s.bank, s.players[ctx.seat].hand, receive);
  emit(ctx, { type: 'bankTrade', seat: ctx.seat, give: pay, get: receive });
}

function findOffer(ctx: Ctx, id: number): TradeOffer {
  const offer = ctx.s.trades.find((t) => t.id === id);
  assertRule(offer, 'That offer is no longer available');
  return offer;
}

function execute(ctx: Ctx, offer: TradeOffer, partner: number): void {
  const s = ctx.s;
  const from = s.players[offer.from].hand;
  const to = s.players[partner].hand;
  assertRule(hasCards(from, offer.give), `${s.players[offer.from].name} no longer has those cards`);
  assertRule(hasCards(to, offer.want), `${s.players[partner].name} no longer has those cards`);
  transfer(from, to, offer.give);
  transfer(to, from, offer.want);
  s.trades = s.trades.filter((t) => t.id !== offer.id);
  emit(ctx, { type: 'trade', seat: offer.from, partner, give: offer.give, get: offer.want });
}

/**
 * The active player offers to everyone (or chosen players); anyone else may only send a
 * counter-offer to the active player. No gifts and no like-for-like swaps.
 */
export function offerTrade(ctx: Ctx, giveIn: PartialHand, wantIn: PartialHand, toIn: number[]): void {
  const s = ctx.s;
  assertRule(s.phase === 'play', 'The game is not in progress');
  assertRule(s.turn.rolled, 'Trading starts after the roll');
  const give = parseHand(giveIn, 20);
  const want = parseHand(wantIn, 20);
  assertRule(handTotal(give) > 0 && handTotal(want) > 0, 'A trade needs cards on both sides');
  assertRule(!sameCardTypes(give, want), "You can't trade a card for the same card");
  if (s.mode === 'classic') assertRule(commodityTotal(give) + commodityTotal(want) === 0, 'Unknown card');
  assertRule(hasCards(s.players[ctx.seat].hand, give), "You don't have those cards");
  assertRule(s.trades.filter((t) => t.from === ctx.seat).length < MAX_OPEN_TRADES, 'Too many open offers');

  let to: number[];
  if (ctx.seat === s.turn.seat) {
    const others = s.players.map((_, i) => i).filter((i) => i !== ctx.seat);
    to = Array.isArray(toIn) && toIn.length ? [...new Set(toIn)].filter((i) => others.includes(i)) : others;
    assertRule(to.length > 0, 'Choose who to trade with');
  } else {
    to = [s.turn.seat];
  }
  const offer: TradeOffer = { id: nextId(s), from: ctx.seat, to, give, want, accepted: [], declined: [] };
  s.trades.push(offer);
  emit(ctx, { type: 'tradeOffered', seat: ctx.seat, id: offer.id });
}

export function respondTrade(ctx: Ctx, id: number, accept: boolean): void {
  const s = ctx.s;
  const offer = findOffer(ctx, id);
  assertRule(offer.to.includes(ctx.seat) && offer.from !== ctx.seat, 'That offer is not for you');
  offer.accepted = offer.accepted.filter((i) => i !== ctx.seat);
  offer.declined = offer.declined.filter((i) => i !== ctx.seat);
  if (!accept) {
    // The active player turning down a counter-offer removes it.
    if (ctx.seat === s.turn.seat) s.trades = s.trades.filter((t) => t.id !== id);
    else offer.declined.push(ctx.seat);
    return;
  }
  assertRule(hasCards(s.players[ctx.seat].hand, offer.want), "You don't have the cards they want");
  // A counter-offer accepted by the active player executes immediately.
  if (ctx.seat === s.turn.seat) execute(ctx, offer, ctx.seat);
  else offer.accepted.push(ctx.seat);
}

export function confirmTrade(ctx: Ctx, id: number, partner: number): void {
  requireActive(ctx);
  const offer = findOffer(ctx, id);
  assertRule(offer.from === ctx.seat, 'That is not your offer');
  assertRule(offer.accepted.includes(partner), 'That player has not accepted');
  execute(ctx, offer, partner);
}

export function cancelTrade(ctx: Ctx, id: number): void {
  const offer = findOffer(ctx, id);
  assertRule(offer.from === ctx.seat, 'That is not your offer');
  ctx.s.trades = ctx.s.trades.filter((t) => t.id !== id);
}
