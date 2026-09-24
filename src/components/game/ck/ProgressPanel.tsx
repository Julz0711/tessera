'use client';

import { Play } from 'lucide-react';
import { useState } from 'react';
import { CARDS, COMMODITIES, RESOURCES, robberActive, type Card, type ProgressCard, type ProgressParams, type Resource } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { PROGRESS_NAMES } from '@/client/describe';
import { progressPickSpec } from '@/client/interaction';
import { PROGRESS_TEXT, TRACK_STYLE } from '@/client/progressText';
import { api } from '@/client/store';
import { useUi } from '@/client/ui';
import { PLAYER_COLORS } from '@/shared/colors';
import { Modal } from '@/components/ui/Modal';
import { ResourceCard } from '../cards';

type Chooser = 'player' | 'card' | 'resource' | 'commodity' | 'dice' | 'offers' | null;

function chooserFor(card: ProgressCard): Chooser {
  switch (card.type) {
    case 'deserter':
    case 'spy':
    case 'masterMerchant':
      return 'player';
    case 'merchantFleet':
      return 'card';
    case 'resourceMonopoly':
      return 'resource';
    case 'tradeMonopoly':
      return 'commodity';
    case 'alchemist':
      return 'dice';
    case 'commercialHarbor':
      return 'offers';
    default:
      return null;
  }
}

function CardFace({ card }: { card: ProgressCard }) {
  const style = TRACK_STYLE[card.track];
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 h-10 w-7 shrink-0 rounded border-2 border-ink" style={{ background: style.color }} />
      <div>
        <div className="font-extrabold">{PROGRESS_NAMES[card.type]}</div>
        <p className="text-xs text-ink-soft">{PROGRESS_TEXT[card.type]}</p>
      </div>
    </div>
  );
}

export function ProgressPanel({ view }: { view: PlayerView }) {
  const ui = useUi();
  const me = view.viewer!;
  const p = view.players[me];
  const [active, setActive] = useState<ProgressCard | null>(null);
  const [dice, setDice] = useState({ red: 3, yellow: 4 });
  const [offers, setOffers] = useState<Partial<Record<number, Resource>>>({});
  const myTurn = view.phase === 'play' && view.turn.seat === me && view.pending.length === 0;

  const canPlay = (card: ProgressCard) => {
    if (!myTurn) return false;
    if (card.type === 'alchemist') return !view.turn.rolled && !view.turn.alchemist;
    if (!view.turn.rolled) return false;
    if (card.type === 'bishop') return robberActive(view);
    return true;
  };

  const play = async (card: ProgressCard, params: ProgressParams = {}) => {
    const r = await api.act({ type: 'playProgress', card: card.id, params });
    if (r.ok) {
      setActive(null);
      ui.setPanel(null);
    }
  };

  const start = (card: ProgressCard) => {
    const spec = progressPickSpec(view, card.type);
    if (spec) {
      ui.setMode({ t: 'progress', card: card.id, cardType: card.type, picked: [] });
      return;
    }
    if (chooserFor(card)) {
      setActive(card);
      return;
    }
    void play(card);
  };

  const opponents = view.players.map((_, i) => i).filter((i) => i !== me);
  const chooser = active ? chooserFor(active) : null;

  return (
    <Modal open onClose={() => ui.setPanel(null)} title="Progress cards" wide>
      {p.progress.length === 0 && (
        <p className="text-ink-soft">No progress cards yet. They come from the city gates on the event die once you have improvements.</p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {p.progress.map((card) => (
          <div key={card.id} className="paper-flat flex flex-col gap-2 p-3">
            <CardFace card={card} />
            <button type="button" className="btn btn-primary mt-auto py-1.5 text-sm" disabled={!canPlay(card)} onClick={() => start(card)}>
              <Play size={14} /> Play
            </button>
          </div>
        ))}
      </div>
      {p.progress.length > 0 && !myTurn && <p className="mt-3 text-sm text-ink-soft">Progress cards are played on your turn.</p>}

      <Modal open={!!active} onClose={() => setActive(null)} title={active ? PROGRESS_NAMES[active.type] : ''}>
        {active && chooser === 'player' && (
          <div className="grid gap-2">
            <p className="text-sm text-ink-soft">{PROGRESS_TEXT[active.type]}</p>
            {opponents.map((seat) => {
              const pl = view.players[seat];
              const c = PLAYER_COLORS[pl.color];
              return (
                <button
                  key={seat}
                  type="button"
                  className="btn justify-between px-4 py-2.5"
                  style={{ ['--btn-bg' as string]: c.hex, ['--btn-fg' as string]: c.ink }}
                  onClick={() => play(active, { victim: seat })}
                >
                  <span>{pl.name}</span>
                  <span className="text-xs">
                    {pl.publicVP} VP · {pl.handCount} cards · {pl.progressCount} progress
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {active && (chooser === 'card' || chooser === 'resource' || chooser === 'commodity') && (
          <div className="flex flex-wrap justify-center gap-2">
            {(chooser === 'card' ? CARDS : chooser === 'resource' ? RESOURCES : COMMODITIES).map((c) => (
              <ResourceCard key={c} card={c as Card} count={0} onClick={() => play(active, { card: c as Card })} />
            ))}
          </div>
        )}
        {active && chooser === 'dice' && (
          <div className="grid gap-3">
            {(['red', 'yellow'] as const).map((die) => (
              <div key={die} className="flex items-center gap-2">
                <span className="label w-14">{die}</span>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button key={n} type="button" className={`btn h-9 w-9 p-0 ${dice[die] === n ? 'btn-primary' : ''}`} onClick={() => setDice((d) => ({ ...d, [die]: n }))}>
                    {n}
                  </button>
                ))}
              </div>
            ))}
            <p className="text-sm font-bold">Total: {dice.red + dice.yellow}{dice.red + dice.yellow === 7 ? ' — careful, that moves the robber!' : ''}</p>
            <button type="button" className="btn btn-primary py-2" onClick={() => play(active, dice)}>
              Set the dice
            </button>
          </div>
        )}
        {active && chooser === 'offers' && (
          <div className="grid gap-3">
            <p className="text-sm text-ink-soft">Choose a resource to give each opponent (players without commodities are skipped).</p>
            {opponents.map((seat) => (
              <div key={seat} className="flex flex-wrap items-center gap-1.5">
                <span className="w-24 truncate text-sm font-bold">{view.players[seat].name}</span>
                {RESOURCES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={p.hand[r] === 0}
                    className={`rounded-md border-2 px-2 py-0.5 text-xs font-bold capitalize ${offers[seat] === r ? 'border-ink bg-ink text-paper' : 'border-ink/25'}`}
                    onClick={() => setOffers((o) => ({ ...o, [seat]: o[seat] === r ? undefined : r }))}
                  >
                    {r}
                  </button>
                ))}
              </div>
            ))}
            <button type="button" className="btn btn-primary py-2" disabled={!Object.values(offers).some(Boolean)} onClick={() => play(active, { offers })}>
              Make the trades
            </button>
          </div>
        )}
      </Modal>
    </Modal>
  );
}
