import { MAX_OPEN_TRADES } from '../constants';
import { assertRule, RuleError } from '../errors';
import { commodityTotal, handTotal, hasCards, parseHand, sameCardTypes, transfer } from '../hand';
import { bankRatio, exchangeValue } from '../queries';
import { emit, nextId, type Ctx } from '../state';
import { isCard, isCommodity, type Card, type GameState, type PartialHand, type TradeOffer } from '../types';
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

/** Several bank trades at once, e.g. 4 lumber + 2 brick (at 2:1) for 1 ore + 1 grain. All or nothing. */
export function bankExchange(ctx: Ctx, giveIn: unknown, getIn: unknown): void {
  requireRolled(ctx);
  const s = ctx.s;
  const give = parseHand(giveIn, 40);
  const get = parseHand(getIn, 20);
  const kinds = [...Object.keys(give), ...Object.keys(get)] as Card[];
  if (s.mode === 'classic') assertRule(kinds.every((c) => !isCommodity(c)), 'Unknown card');
  assertRule(handTotal(give) > 0 && handTotal(get) > 0, 'Pick cards on both sides');
  assertRule(Object.keys(give).every((c) => !(c in get)), "Don't give and ask for the same card");
  const value = exchangeValue(s, ctx.seat, give);
  if ('error' in value) throw new RuleError(value.error);
  const buys = value.cards;
  assertRule(handTotal(get) === buys, `That buys ${buys} card${buys === 1 ? '' : 's'}, not ${handTotal(get)}`);
  for (const [c, n] of Object.entries(get) as [Card, number][]) assertRule(s.bank[c] >= n, `The bank doesn't have enough ${c}`);
  transfer(s.players[ctx.seat].hand, s.bank, give, "You don't have those cards");
  transfer(s.bank, s.players[ctx.seat].hand, get);
  emit(ctx, { type: 'bankTrade', seat: ctx.seat, give, get });
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
 * counter-offer to the active player. No gifts and no like-for-like swaps. An `open` offer (the
 * active player's only) asks "?" in return: nobody can accept it, they answer with a counter-offer.
 */
export function offerTrade(ctx: Ctx, giveIn: PartialHand, wantIn: PartialHand, toIn: number[], openIn?: unknown): void {
  const s = ctx.s;
  assertRule(s.phase === 'play', 'The game is not in progress');
  assertRule(s.turn.rolled, 'Trading starts after the roll');
  const open = openIn === true;
  assertRule(!open || ctx.seat === s.turn.seat, 'Only the player on turn can ask what others offer');
  const give = parseHand(giveIn, 20);
  const want = open ? {} : parseHand(wantIn, 20);
  assertRule(handTotal(give) > 0 && (open || handTotal(want) > 0), 'A trade needs cards on both sides');
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
  const offer: TradeOffer = { id: nextId(s), from: ctx.seat, to, give, want, accepted: [], declined: [], ...(open ? { open: true } : {}) };
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
  assertRule(!offer.open, "Say what you'd give: send a counter-offer");
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

/** Whether `seat` has an embargo on `from`: no offers from them. */
export function embargoes(s: GameState, seat: number, from: number): boolean {
  return s.players[seat].embargo?.includes(from) ?? false;
}

/** Starts or ends an embargo on `seat`; open offers from them are turned down on the spot (see `sweepTrades`). */
export function setEmbargo(ctx: Ctx, seat: number, on: boolean): void {
  const s = ctx.s;
  assertRule(Number.isInteger(seat) && seat >= 0 && seat < s.players.length && seat !== ctx.seat, 'Unknown player');
  const p = s.players[ctx.seat];
  p.embargo = (p.embargo ?? []).filter((x) => x !== seat);
  if (on) p.embargo.push(seat);
}

/**
 * Tidies the open offers after every action: whoever has an embargo on the sender declines (openly);
 * whoever accepted but no longer holds what the offer asks for goes back to undecided; an offer
 * everyone has declined closes. An offer a player can't afford stays theirs to answer: they can
 * decline it, or their client declines it for them after a few seconds (a setting).
 */
export function sweepTrades(ctx: Ctx): void {
  const s = ctx.s;
  for (const offer of [...s.trades]) {
    // Saves from before the setting declined unaffordable offers on the spot, hidden from everyone
    // else (`auto`): those players simply haven't answered yet.
    if (offer.auto) {
      offer.declined = offer.declined.filter((seat) => !offer.auto!.includes(seat));
      delete offer.auto;
    }
    for (const seat of offer.to) {
      if (offer.declined.includes(seat)) continue;
      if (embargoes(s, seat, offer.from)) {
        offer.accepted = offer.accepted.filter((i) => i !== seat);
        offer.declined.push(seat);
      } else if (offer.accepted.includes(seat) && !hasCards(s.players[seat].hand, offer.want)) {
        offer.accepted = offer.accepted.filter((i) => i !== seat);
      }
    }
    if (offer.to.every((seat) => offer.declined.includes(seat))) {
      s.trades = s.trades.filter((t) => t.id !== offer.id);
      emit(ctx, { type: 'tradeClosed', seat: offer.from, id: offer.id });
    }
  }
}

export function cancelTrade(ctx: Ctx, id: number): void {
  const offer = findOffer(ctx, id);
  assertRule(offer.from === ctx.seat, 'That is not your offer');
  ctx.s.trades = ctx.s.trades.filter((t) => t.id !== id);
}
