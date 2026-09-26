'use client';

import { ArrowLeft, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { RESOURCES, type DevCardType, type Resource } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { DEV_NAMES, DEV_TEXT } from '@/client/describe';
import { api } from '@/client/store';
import { useUi } from '@/client/ui';
import { Modal } from '@/components/ui/Modal';
import { DevCardFace, ResourceCard } from './cards';

function myFreeTurn(view: PlayerView): boolean {
  return view.viewer !== null && view.phase === 'play' && view.turn.seat === view.viewer && view.pending.length === 0;
}

/** Whether the viewer can play a development card of this type right now. */
export function canPlayDev(view: PlayerView, type: DevCardType): boolean {
  if (view.viewer === null || type === 'victoryPoint' || !myFreeTurn(view) || view.turn.devPlayed) return false;
  return view.players[view.viewer].devCards.some((c) => c.type === type && c.boughtOn < view.turn.n);
}

/** Why the card can't be played right now (null when it can, or when it is never played). */
function blocker(view: PlayerView, type: DevCardType): string | null {
  if (type === 'victoryPoint' || canPlayDev(view, type)) return null;
  if (view.phase !== 'play' || view.turn.seat !== view.viewer) return 'Development cards are played on your turn.';
  if (view.pending.length) return 'Finish the current step first.';
  if (view.turn.devPlayed) return 'You already played a development card this turn.';
  return 'Bought this turn, playable from your next turn.';
}

/** One development card from the hand: what it does, and playing it. */
export function DevCardDialog({ view, type }: { view: PlayerView; type: DevCardType }) {
  const ui = useUi();
  const owned = view.players[view.viewer!].devCards.filter((c) => c.type === type);
  /** Resources picked for Year of Plenty / Monopoly; null until the card is played. */
  const [picked, setPicked] = useState<Resource[] | null>(null);
  const gone = owned.length === 0;
  useEffect(() => {
    if (gone) useUi.getState().openCard(null);
  }, [gone]);
  if (gone) return null;

  const close = () => ui.openCard(null);
  const playable = canPlayDev(view, type);
  const why = blocker(view, type);

  const play = async () => {
    if (type === 'yearOfPlenty' || type === 'monopoly') {
      setPicked([]);
      return;
    }
    const r = await api.act(type === 'knight' ? { type: 'playKnight' } : { type: 'playRoadBuilding' });
    if (r.ok) close();
  };

  const confirm = async () => {
    if (!picked) return;
    const r = await api.act(type === 'monopoly' ? { type: 'playMonopoly', resource: picked[0] } : { type: 'playYearOfPlenty', resources: picked });
    if (r.ok) close();
  };

  return (
    <Modal open onClose={close} title={DEV_NAMES[type]}>
      {picked === null ? (
        <div className="flex gap-4">
          <DevCardFace type={type} size="lg" count={owned.length > 1 ? owned.length : undefined} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="text-sm text-ink-soft">{DEV_TEXT[type]}</p>
            {type !== 'victoryPoint' && (
              <button type="button" className="btn btn-primary mt-auto py-2" disabled={!playable} onClick={play}>
                <Play size={15} /> Play
              </button>
            )}
            {why && <p className="text-xs font-bold text-ink-faint">{why}</p>}
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <p className="text-sm text-ink-soft">{type === 'monopoly' ? 'Pick the resource everyone hands over.' : 'Pick two resources to take from the bank.'}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {RESOURCES.map((r) => (
              <ResourceCard
                key={r}
                card={r}
                count={picked.filter((x) => x === r).length}
                selected={picked.includes(r)}
                onClick={() => setPicked((prev) => (type === 'monopoly' ? [r] : prev && prev.length < 2 ? [...prev, r] : [r]))}
              />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <button type="button" className="btn btn-ghost px-2 py-2 text-sm" onClick={() => setPicked(null)}>
              <ArrowLeft size={15} /> Back
            </button>
            <div className="flex gap-2">
              {type === 'yearOfPlenty' && (
                <button type="button" className="btn px-3 py-2 text-sm" disabled={picked.length === 0} onClick={() => setPicked([])}>
                  Clear
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary px-5 py-2"
                disabled={type === 'monopoly' ? picked.length !== 1 : picked.length !== 2}
                onClick={confirm}
              >
                <Play size={15} /> Play
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
