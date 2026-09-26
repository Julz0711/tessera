'use client';

import { ArrowLeft, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CARDS, COMMODITIES, RESOURCES, robberActive, type Card, type ProgressCard, type ProgressParams, type Resource } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { PROGRESS_NAMES } from '@/client/describe';
import { progressPickSpec } from '@/client/interaction';
import { PROGRESS_TEXT, TRACK_STYLE } from '@/client/progressText';
import { api } from '@/client/store';
import { useUi } from '@/client/ui';
import { PLAYER_COLORS } from '@/shared/colors';
import { Modal } from '@/components/ui/Modal';
import { ProgressCardFace, ResourceCard } from '../cards';

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

/** Whether the viewer can play this progress card right now. */
export function canPlayProgress(view: PlayerView, card: ProgressCard): boolean {
  if (view.viewer === null || view.phase !== 'play' || view.turn.seat !== view.viewer || view.pending.length > 0) return false;
  if (card.type === 'alchemist') return !view.turn.rolled && !view.turn.alchemist;
  if (!view.turn.rolled) return false;
  if (card.type === 'bishop') return robberActive(view);
  return true;
}

/** Why the card can't be played right now (null when it can). */
function blocker(view: PlayerView, card: ProgressCard): string | null {
  if (canPlayProgress(view, card)) return null;
  if (view.phase !== 'play' || view.turn.seat !== view.viewer) return 'Progress cards are played on your turn.';
  if (view.pending.length) return 'Finish the current step first.';
  if (card.type === 'alchemist') return view.turn.rolled ? 'The Alchemist is played before you roll.' : 'You already set the dice this turn.';
  if (!view.turn.rolled) return 'Roll the dice first.';
  if (card.type === 'bishop') return 'The robber joins the game after the first barbarian attack.';
  return null;
}

/** One progress card from the hand: what it does, and playing it (with any choices it needs). */
export function ProgressCardDialog({ view, id }: { view: PlayerView; id: number }) {
  const ui = useUi();
  const me = view.viewer!;
  const p = view.players[me];
  const card = p.progress.find((c) => c.id === id) ?? null;
  const [choosing, setChoosing] = useState(false);
  const [dice, setDice] = useState({ red: 3, yellow: 4 });
  const [offers, setOffers] = useState<Partial<Record<number, Resource>>>({});
  useEffect(() => {
    if (!card) useUi.getState().openCard(null);
  }, [card]);
  if (!card) return null;

  const close = () => ui.openCard(null);
  const chooser = chooserFor(card);
  const why = blocker(view, card);
  const style = TRACK_STYLE[card.track];
  const opponents = view.players.map((_, i) => i).filter((i) => i !== me);

  const play = async (params: ProgressParams = {}) => {
    const r = await api.act({ type: 'playProgress', card: card.id, params });
    if (r.ok) close();
  };

  const start = () => {
    if (progressPickSpec(view, card.type)) {
      // Picks happen on the board; this closes the dialog and shows the pick banner.
      ui.setMode({ t: 'progress', card: card.id, cardType: card.type, picked: [] });
      return;
    }
    if (chooser) {
      setChoosing(true);
      return;
    }
    void play();
  };

  return (
    <Modal open onClose={close} title={PROGRESS_NAMES[card.type]}>
      {!choosing ? (
        <div className="flex gap-4">
          <ProgressCardFace card={card} size="lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-ink-soft">
              <span className="h-2.5 w-2.5 rounded-full border border-ink" style={{ background: style.color }} />
              {style.label}
            </span>
            <p className="text-sm text-ink-soft">{PROGRESS_TEXT[card.type]}</p>
            <button type="button" className="btn btn-primary mt-auto py-2" disabled={!!why} onClick={start}>
              <Play size={15} /> Play
            </button>
            {why && <p className="text-xs font-bold text-ink-faint">{why}</p>}
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          <p className="text-sm text-ink-soft">{PROGRESS_TEXT[card.type]}</p>
          {chooser === 'player' && (
            <div className="grid gap-2">
              {opponents.map((seat) => {
                const pl = view.players[seat];
                const c = PLAYER_COLORS[pl.color];
                return (
                  <button
                    key={seat}
                    type="button"
                    className="btn justify-between px-4 py-2.5"
                    style={{ ['--btn-bg' as string]: c.hex, ['--btn-fg' as string]: c.ink }}
                    onClick={() => play({ victim: seat })}
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
          {(chooser === 'card' || chooser === 'resource' || chooser === 'commodity') && (
            <div className="flex flex-wrap justify-center gap-2">
              {(chooser === 'card' ? CARDS : chooser === 'resource' ? RESOURCES : COMMODITIES).map((c) => (
                <ResourceCard key={c} card={c as Card} count={0} onClick={() => play({ card: c as Card })} />
              ))}
            </div>
          )}
          {chooser === 'dice' && (
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
              <p className="text-sm font-bold">
                Total: {dice.red + dice.yellow}
                {dice.red + dice.yellow === 7 ? ', careful, that moves the robber!' : ''}
              </p>
              <button type="button" className="btn btn-primary py-2" onClick={() => play(dice)}>
                Set the dice
              </button>
            </div>
          )}
          {chooser === 'offers' && (
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
              <button type="button" className="btn btn-primary py-2" disabled={!Object.values(offers).some(Boolean)} onClick={() => play({ offers })}>
                Make the trades
              </button>
            </div>
          )}
          <button type="button" className="btn btn-ghost justify-self-start px-2 py-2 text-sm" onClick={() => setChoosing(false)}>
            <ArrowLeft size={15} /> Back
          </button>
        </div>
      )}
    </Modal>
  );
}
