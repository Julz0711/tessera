'use client';

import { ArrowDown, ArrowLeftRight, ArrowUp, Check, ChevronDown, ChevronUp, Hourglass, Landmark, Pencil, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CARDS, RESOURCES, exchangeValue, handTotal, hasCards, type Card, type PartialHand, type TradeOffer } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { api, useGame } from '@/client/store';
import { openTrade, useTradeDraft, type TradeSide } from '@/client/trade';
import { useUi } from '@/client/ui';
import { PLAYER_COLORS } from '@/shared/colors';
import { KnightBadge } from '@/components/knight/KnightBadge';
import { CardStack, ResourceCard } from './cards';

type Answer = 'yes' | 'no' | 'wait';

/** How long a turned-down offer lingers before it goes away. */
const DISMISS_MS = 1800;

function answerOf(offer: TradeOffer, seat: number): Answer {
  return offer.accepted.includes(seat) ? 'yes' : offer.declined.includes(seat) ? 'no' : 'wait';
}

/** A player's knight, with their answer to an offer as a small badge. */
function Avatar({ view, seat, size = 30, answer }: { view: PlayerView; seat: number; size?: number; answer?: Answer }) {
  const knight = useGame((s) => s.room?.seats[seat]?.knight);
  const p = view.players[seat];
  return (
    <span className="relative inline-block shrink-0" title={seat === view.viewer ? 'You' : p.name}>
      {knight ? (
        <KnightBadge knight={knight} color={p.color} size={size} />
      ) : (
        <span className="block rounded-full border-2 border-ink" style={{ width: size, height: size, background: PLAYER_COLORS[p.color].hex }} />
      )}
      {answer && answer !== 'wait' && (
        <span className={`absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full border-2 border-paper text-paper ${answer === 'yes' ? 'bg-moss' : 'bg-danger'}`}>
          {answer === 'yes' ? <Check size={9} strokeWidth={4} /> : <X size={9} strokeWidth={4} />}
        </span>
      )}
    </span>
  );
}

/** One side of a deal: who, which way the cards go, the cards, and whatever sits at the end of the row. */
function DealRow({
  side,
  who,
  cards,
  onCard,
  hint,
}: {
  side: TradeSide;
  who: React.ReactNode;
  cards: PartialHand;
  /** Clicking a card (the draft takes one back). */
  onCard?: (c: Card) => void;
  /** Shown while the row is empty. */
  hint?: string;
}) {
  const held = CARDS.filter((c) => (cards[c] ?? 0) > 0);
  return (
    <div className="flex min-h-13 items-center gap-1.5 py-1">
      <div className="flex w-16 shrink-0 flex-col items-start gap-0.5">
        <div className="flex items-center">
          {who}
          {side === 'want' ? <ArrowDown size={15} strokeWidth={3} className="text-moss" /> : <ArrowUp size={15} strokeWidth={3} className="text-danger" />}
        </div>
        <span className="text-[10px] font-bold uppercase leading-none tracking-[0.1em] text-ink-soft">{side === 'want' ? 'You get' : 'You give'}</span>
      </div>
      {/* the box widens for a deal with many kinds of card; only at the screen edge does a row wrap */}
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 pt-1">
        {held.map((c) => (
          // A card arrives from where it came from: up from the hand, down from the picker.
          <span key={c} className={side === 'give' ? 'animate-slide-up' : 'animate-slide-down'}>
            <CardStack card={c} count={cards[c]!} size="xs" onClick={onCard ? () => onCard(c) : undefined} />
          </span>
        ))}
        {!held.length && hint && <span className="text-xs font-bold text-ink-faint">{hint}</span>}
      </div>
    </div>
  );
}

/** A square action button at the end of a deal row, with a check when it can go. */
function DealButton({
  label,
  icon,
  onClick,
  disabled,
  ok,
  primary,
  danger,
  tint,
  status,
}: {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  ok?: boolean;
  primary?: boolean;
  /** Red: backing out (withdraw, decline, close). */
  danger?: boolean;
  /** A player's colour (per-player answers on your own offer). */
  tint?: string;
  /** Only shows a state (a player's answer): looks like a button, isn't greyed out, doesn't click. */
  status?: boolean;
}) {
  return (
    <button
      type="button"
      className={`btn relative h-9 w-9 rounded-[10px] p-0 ${primary ? 'btn-primary' : danger ? 'btn-danger' : ''} ${status ? 'pointer-events-none' : ''}`}
      style={tint ? ({ '--btn-bg': `color-mix(in srgb, ${tint} 45%, var(--color-paper))` } as React.CSSProperties) : undefined}
      disabled={disabled}
      tabIndex={status ? -1 : undefined}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {icon}
      {ok && (
        <span className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full border-2 border-ink bg-moss text-paper">
          <Check size={9} strokeWidth={4} />
        </span>
      )}
    </button>
  );
}

/** The card frame shared by offers and the trade panel: a header strip of players over the two rows of the deal. */
function DealCard({
  header,
  footer,
  collapsed,
  onToggle,
  children,
  className = '',
}: {
  header: React.ReactNode;
  /** The action bar under the deal: status on the left, buttons on the right. */
  footer?: React.ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`paper overflow-hidden p-0 ${className}`}>
      <div className="relative flex min-h-10 items-center justify-center gap-1 bg-paper-2 px-9 py-1">
        {header}
        {onToggle && (
          <button type="button" className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md hover:bg-ink/10" onClick={onToggle} aria-label={collapsed ? 'Show offer' : 'Hide offer'}>
            {collapsed ? <ChevronDown size={17} strokeWidth={3} /> : <ChevronUp size={17} strokeWidth={3} />}
          </button>
        )}
      </div>
      {!collapsed && <div className="grid divide-y divide-ink/10 px-2">{children}</div>}
      {!collapsed && footer && <div className="flex flex-wrap items-center justify-end gap-1 border-t-2 border-ink/10 bg-paper-2/60 px-2 py-1.5">{footer}</div>}
    </div>
  );
}

/** True once `on` has held for `ms` (and false again as soon as it doesn't). */
function useAfter(on: boolean, ms: number): boolean {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!on) return setDone(false);
    const t = setTimeout(() => setDone(true), ms);
    return () => clearTimeout(t);
  }, [on, ms]);
  return done;
}

/** An offer that involves the viewer, as they see it: what they get on top, what they give below. */
function OfferCard({ view, offer }: { view: PlayerView; offer: TradeOffer }) {
  const me = view.viewer!;
  const mine = offer.from === me;
  const [collapsed, setCollapsed] = useState(false);
  const myAnswer = answerOf(offer, me);
  // An offer you turned down (or couldn't take) goes away after a moment. Your own closes for
  // everyone once all have declined; the server does that.
  const gone = useAfter(!mine && myAnswer === 'no', DISMISS_MS);
  if (gone) return null;

  if (mine) {
    const isActive = view.turn.seat === me;
    return (
      <DealCard
        header={offer.to.map((s) => (
          <Avatar key={s} view={view} seat={s} answer={answerOf(offer, s)} />
        ))}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        footer={
          <>
            {offer.to.map((s) => {
              const a = answerOf(offer, s);
              const name = view.players[s].name;
              return (
                <DealButton
                  key={s}
                  label={a === 'yes' ? `Trade with ${name}` : a === 'no' ? `${name} declined` : `Waiting for ${name}`}
                  icon={a === 'yes' ? <Check size={17} strokeWidth={3} /> : a === 'no' ? <X size={17} strokeWidth={3} /> : <Hourglass size={14} />}
                  tint={PLAYER_COLORS[view.players[s].color].hex}
                  status={a !== 'yes' || !isActive}
                  onClick={() => api.act({ type: 'confirmTrade', id: offer.id, partner: s })}
                />
              );
            })}
            <span className="mx-0.5 h-6 w-px bg-ink/15" />
            <DealButton label="Withdraw the offer" danger icon={<X size={17} strokeWidth={3} />} onClick={() => api.act({ type: 'cancelTrade', id: offer.id })} />
          </>
        }
      >
        <DealRow side="want" who={<Users size={22} className="text-ink-soft" />} cards={offer.want} />
        <DealRow side="give" who={<Avatar view={view} seat={me} size={26} />} cards={offer.give} />
      </DealCard>
    );
  }

  const canAfford = hasCards(view.players[me].hand, offer.want);
  const others = offer.to.filter((s) => s !== me);
  return (
    <DealCard
      header={<Avatar view={view} seat={offer.from} />}
      collapsed={collapsed}
      onToggle={() => setCollapsed(!collapsed)}
      footer={
        <>
          {/* how the other players answered */}
          <span className="mr-auto flex items-center gap-1">
            {others.map((s) => (
              <Avatar key={s} view={view} seat={s} size={24} answer={answerOf(offer, s)} />
            ))}
          </span>
          <DealButton label="Counter-offer" icon={<Pencil size={14} />} onClick={() => openTrade(offer.want, offer.give)} />
          <DealButton label="Decline" danger icon={<X size={17} strokeWidth={3} />} disabled={myAnswer === 'no'} onClick={() => api.act({ type: 'respondTrade', id: offer.id, accept: false })} />
          <DealButton
            label={canAfford ? (myAnswer === 'yes' ? 'Accepted' : 'Accept') : "You don't have those cards"}
            icon={<Check size={17} strokeWidth={3} />}
            primary
            ok={myAnswer === 'yes'}
            disabled={!canAfford || myAnswer === 'yes'}
            onClick={() => api.act({ type: 'respondTrade', id: offer.id, accept: true })}
          />
        </>
      }
    >
      <DealRow side="want" who={<Avatar view={view} seat={offer.from} size={26} />} cards={offer.give} />
      <DealRow side="give" who={<Avatar view={view} seat={me} size={26} />} cards={offer.want} />
    </DealCard>
  );
}

/**
 * The draft as a trade with the bank: every kind given in whole multiples of the viewer's rate for it,
 * buying exactly the cards asked for (any mix, e.g. 2 lumber at 2:1 + 4 brick for 2 ore). Why not, if it isn't.
 */
function asBankExchange(view: PlayerView, me: number, give: PartialHand, want: PartialHand): { ok: true } | { ok: false; why: string } {
  const asked = handTotal(want);
  if (!handTotal(give) || !asked) return { ok: false, why: 'Put up cards and pick what you want' };
  if (CARDS.some((c) => (give[c] ?? 0) > 0 && (want[c] ?? 0) > 0)) return { ok: false, why: "Don't give and ask for the same card" };
  const value = exchangeValue(view, me, give);
  if ('error' in value) return { ok: false, why: value.error };
  if (value.cards !== asked) return { ok: false, why: `That buys ${value.cards} card${value.cards === 1 ? '' : 's'}, not ${asked}` };
  const short = CARDS.find((c) => view.bank[c] < (want[c] ?? 0));
  if (short) return { ok: false, why: `The bank doesn't have enough ${short}` };
  return { ok: true };
}

/**
 * The trade panel, docked above the hand: pick what you want from the top row, click cards in your
 * hand to put them on the give side, then trade with the bank or offer it to the players on top.
 */
export function TradePanel({ view }: { view: PlayerView }) {
  const ui = useUi();
  const draft = useTradeDraft();
  const me = view.viewer!;
  const p = view.players[me];
  const isActive = view.turn.seat === me;
  const cards = view.mode === 'ck' ? CARDS : RESOURCES;
  // Never more than the hand holds (a card may have been stolen since it was put up).
  const give: PartialHand = {};
  for (const c of CARDS) {
    const n = Math.min(draft.give[c] ?? 0, p.hand[c]);
    if (n > 0) give[c] = n;
  }
  const want = draft.want;
  const others = view.players.map((_, i) => i).filter((i) => i !== me);
  // Players with an embargo on you would only decline, so they start deselected.
  const blocksMe = (seat: number) => view.players[seat].embargo?.includes(me) ?? false;
  const [targets, setTargets] = useState<number[]>(() => others.filter((s) => !blocksMe(s)));

  const ready = handTotal(give) > 0 && handTotal(want) > 0 && (!isActive || targets.length > 0);
  const exchange = isActive && view.turn.rolled && view.pending.length === 0 ? asBankExchange(view, me, give, want) : null;
  const send = async () => {
    // The offer then waits in the offers list, where the answers come in.
    const r = await api.act({ type: 'offerTrade', give, want, to: isActive ? targets : [view.turn.seat] });
    if (r.ok) ui.setPanel(null);
  };
  const tradeBank = async () => {
    if (!exchange?.ok) return;
    const r = await api.act({ type: 'bankExchange', give, get: want });
    if (r.ok) draft.clear();
  };

  return (
    // As wide as the deal needs to keep each row of cards on one line, within the screen.
    <div className="grid w-max min-w-[min(420px,calc(100vw-16px))] max-w-[calc(100vw-16px)] animate-rise gap-1.5">
      {/* everything you can ask for */}
      <div className="paper flex flex-wrap items-center justify-center gap-1.5 p-1.5">
        {cards.map((c) => (
          <ResourceCard key={c} card={c} count={0} size="xs" onClick={() => draft.add('want', c)} />
        ))}
      </div>
      <DealCard
        header={(isActive ? others : [view.turn.seat]).map((seat) => {
          const on = !isActive || targets.includes(seat);
          return (
            <button
              key={seat}
              type="button"
              aria-pressed={on}
              disabled={!isActive}
              title={blocksMe(seat) ? `${view.players[seat].name} has an embargo on you` : `${on ? 'Offer to' : 'Not offering to'} ${view.players[seat].name}`}
              onClick={() => setTargets((t) => (on ? t.filter((x) => x !== seat) : [...t, seat]))}
              className={`rounded-full transition ${on ? '' : 'opacity-35 grayscale'}`}
            >
              <Avatar view={view} seat={seat} answer={blocksMe(seat) ? 'no' : undefined} />
            </button>
          );
        })}
        footer={
          <>
            {isActive && (
              <DealButton
                label={
                  exchange?.ok
                    ? `Trade ${handTotal(give)} for ${handTotal(want)} with the bank`
                    : (exchange?.why ?? 'Trade with the bank on your turn, after rolling')
                }
                icon={<Landmark size={16} />}
                onClick={tradeBank}
                disabled={!exchange?.ok}
                ok={!!exchange?.ok}
              />
            )}
            <DealButton label={isActive ? 'Offer to players' : 'Send counter-offer'} icon={<ArrowLeftRight size={16} />} onClick={send} disabled={!ready} ok={ready} primary />
            <DealButton label="Close (Esc)" danger icon={<X size={17} strokeWidth={3} />} onClick={() => ui.setPanel(null)} />
          </>
        }
      >
        <DealRow side="want" who={<Users size={22} className="text-ink-soft" />} cards={want} onCard={(c) => draft.remove('want', c)} hint="Tap a card above to add it" />
        <DealRow side="give" who={<Avatar view={view} seat={me} size={26} />} cards={give} onCard={(c) => draft.remove('give', c)} hint="Tap a card in your hand to add it" />
      </DealCard>
    </div>
  );
}

/** Offers that involve the viewer, stacked in the top-left corner; each goes away once it's settled or turned down. */
export function OffersTray({ view, className = '' }: { view: PlayerView; className?: string }) {
  const me = view.viewer;
  if (me === null) return null;
  const offers = view.trades.filter((t) => t.from === me || t.to.includes(me));
  if (!offers.length) return null;
  return (
    <div className={`grid max-h-[calc(100dvh-240px)] content-start gap-2 overflow-y-auto scroll-thin p-1 ${className}`}>
      {offers.map((o) => (
        <div key={o.id} className="animate-pop">
          <OfferCard view={view} offer={o} />
        </div>
      ))}
    </div>
  );
}
