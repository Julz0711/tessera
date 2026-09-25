'use client';

import { ArrowLeftRight, Check, Clock, CornerUpLeft, Landmark, X } from 'lucide-react';
import { useState } from 'react';
import { CARDS, RESOURCES, bankRatio, handTotal, hasCards, type Card, type PartialHand, type TradeOffer } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { api } from '@/client/store';
import { useUi } from '@/client/ui';
import { PLAYER_COLORS } from '@/shared/colors';
import { Modal } from '@/components/ui/Modal';
import { CardList, CardPicker } from './cards';

function Name({ view, seat }: { view: PlayerView; seat: number }) {
  const p = view.players[seat];
  const c = PLAYER_COLORS[p.color];
  return (
    <span className="rounded px-1.5 font-extrabold" style={{ background: c.hex, color: c.ink }}>
      {seat === view.viewer ? 'You' : p.name}
    </span>
  );
}

/** One offer, from the viewer's perspective. */
export function OfferRow({ view, offer, onCounter }: { view: PlayerView; offer: TradeOffer; onCounter?: (o: TradeOffer) => void }) {
  const me = view.viewer!;
  const mine = offer.from === me;
  const forMe = offer.to.includes(me) && !mine;
  const canAfford = hasCards(view.players[me].hand, offer.want);
  const responded = offer.accepted.includes(me) ? 'accepted' : offer.declined.includes(me) ? 'declined' : null;
  const isActive = view.turn.seat === me;
  return (
    <div className="paper-flat grid gap-2 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        <Name view={view} seat={offer.from} />
        <span>{mine ? 'offer' : 'offers'}</span>
        <CardList cards={offer.give} />
        <span className="font-bold">for</span>
        <CardList cards={offer.want} />
        {!mine && offer.to.length === 1 && offer.to[0] === me && <span className="text-xs text-ink-faint">(to you)</span>}
      </div>
      {mine ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {offer.to.map((seat) => {
            const state = offer.accepted.includes(seat) ? 'yes' : offer.declined.includes(seat) ? 'no' : 'wait';
            return state === 'yes' && isActive ? (
              <button key={seat} type="button" className="btn btn-primary px-2.5 py-1 text-xs" onClick={() => api.act({ type: 'confirmTrade', id: offer.id, partner: seat })}>
                <Check size={13} /> Trade with {view.players[seat].name}
              </button>
            ) : (
              <span key={seat} className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-bold ${state === 'no' ? 'border-ink/20 text-ink-faint line-through' : 'border-ink/30'}`}>
                {state === 'wait' ? <Clock size={11} /> : state === 'yes' ? <Check size={11} /> : <X size={11} />} {view.players[seat].name}
              </span>
            );
          })}
          <button type="button" className="btn btn-ghost ml-auto px-2 py-1 text-xs" onClick={() => api.act({ type: 'cancelTrade', id: offer.id })}>
            Cancel
          </button>
        </div>
      ) : forMe ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className="btn btn-primary px-3 py-1 text-xs" disabled={!canAfford || responded === 'accepted'} onClick={() => api.act({ type: 'respondTrade', id: offer.id, accept: true })}>
            <Check size={13} /> {responded === 'accepted' ? 'Accepted' : 'Accept'}
          </button>
          <button type="button" className="btn px-3 py-1 text-xs" disabled={responded === 'declined'} onClick={() => api.act({ type: 'respondTrade', id: offer.id, accept: false })}>
            <X size={13} /> {responded === 'declined' ? 'Declined' : 'Decline'}
          </button>
          {onCounter && (
            <button type="button" className="btn btn-ghost px-2 py-1 text-xs" onClick={() => onCounter(offer)}>
              <CornerUpLeft size={13} /> Counter
            </button>
          )}
          {!canAfford && <span className="text-xs text-ink-faint">You don&apos;t have those cards.</span>}
        </div>
      ) : null}
    </div>
  );
}

/** The draft as a bank trade at the viewer's rate (one card type given, a multiple of the rate, for one type), or null. */
function asBankTrade(view: PlayerView, me: number, give: PartialHand, want: PartialHand) {
  const g = CARDS.filter((c) => (give[c] ?? 0) > 0);
  const w = CARDS.filter((c) => (want[c] ?? 0) > 0);
  if (g.length !== 1 || w.length !== 1 || g[0] === w[0]) return null;
  const ratio = bankRatio(view, me, g[0]);
  const count = want[w[0]]!;
  if (give[g[0]] !== ratio * count || view.bank[w[0]] < count) return null;
  return { give: g[0] as Card, get: w[0] as Card, count, ratio };
}

export function TradePanel({ view }: { view: PlayerView }) {
  const ui = useUi();
  const me = view.viewer!;
  const isActive = view.turn.seat === me;
  const cards = view.mode === 'ck' ? CARDS : RESOURCES;
  // Opened by clicking a card in the hand: that card starts on the give side.
  const [give, setGive] = useState<PartialHand>(() => ({ ...ui.tradeGive }));
  const [want, setWant] = useState<PartialHand>({});
  const others = view.players.map((_, i) => i).filter((i) => i !== me);
  const [targets, setTargets] = useState<number[]>(others);
  const relevant = view.trades.filter((t) => t.from === me || t.to.includes(me));

  const counter = (o: TradeOffer) => {
    setGive({ ...o.want });
    setWant({ ...o.give });
  };
  const send = async () => {
    const r = await api.act({ type: 'offerTrade', give, want, to: isActive ? targets : [view.turn.seat] });
    if (r.ok) {
      setGive({});
      setWant({});
    }
  };
  const ready = handTotal(give) > 0 && handTotal(want) > 0;
  const bank = isActive && view.turn.rolled && view.pending.length === 0 ? asBankTrade(view, me, give, want) : null;
  const tradeBank = async () => {
    if (!bank) return;
    const r = await api.act({ type: 'bankTrade', give: bank.give, get: bank.get, count: bank.count });
    if (r.ok) {
      setGive({});
      setWant({});
    }
  };

  return (
    <Modal open onClose={() => ui.setPanel(null)} title={isActive ? 'Trade with players' : `Counter-offer to ${view.players[view.turn.seat].name}`} wide>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <span className="label">You give</span>
          <CardPicker cards={cards} value={give} onChange={setGive} max={view.players[me].hand} />
        </div>
        <div className="grid gap-1.5">
          <span className="label">You want</span>
          <CardPicker cards={cards} value={want} onChange={setWant} />
        </div>
        {isActive && (
          <div className="grid gap-1.5">
            <span className="label">Offer to</span>
            <div className="flex flex-wrap gap-1.5">
              {others.map((seat) => {
                const on = targets.includes(seat);
                const c = PLAYER_COLORS[view.players[seat].color];
                return (
                  <button
                    key={seat}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setTargets((t) => (on ? t.filter((x) => x !== seat) : [...t, seat]))}
                    className={`rounded-lg border-2 px-3 py-1 text-sm font-bold transition ${on ? 'border-ink' : 'border-ink/20 opacity-50'}`}
                    style={{ background: on ? c.hex : undefined, color: on ? c.ink : undefined }}
                  >
                    {view.players[seat].name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          {bank && (
            <button type="button" className="btn px-4 py-2" onClick={tradeBank} title={`Trade ${bank.ratio}:1 with the bank`}>
              <Landmark size={16} /> Bank {bank.ratio}:1
            </button>
          )}
          <button type="button" className="btn btn-primary px-5 py-2" disabled={!ready || (isActive && targets.length === 0)} onClick={send}>
            <ArrowLeftRight size={16} /> {isActive ? 'Send offer' : 'Send counter-offer'}
          </button>
        </div>
        {relevant.length > 0 && (
          <div className="grid gap-2">
            <span className="label">Open offers</span>
            {relevant.map((o) => (
              <OfferRow key={o.id} view={view} offer={o} onCounter={counter} />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

/** Floating list of offers that involve the viewer, visible without opening the trade panel. */
export function OffersTray({ view, className = '' }: { view: PlayerView; className?: string }) {
  const ui = useUi();
  const me = view.viewer;
  if (me === null || ui.panel === 'trade') return null;
  const offers = view.trades.filter((t) => t.from === me || t.to.includes(me));
  if (!offers.length) return null;
  return (
    <div className={`grid max-h-[40vh] gap-2 overflow-y-auto scroll-thin ${className}`}>
      {offers.map((o) => (
        <div key={o.id} className="animate-pop">
          <OfferRow
            view={view}
            offer={o}
            onCounter={() => {
              ui.setPanel('trade');
            }}
          />
        </div>
      ))}
    </div>
  );
}
