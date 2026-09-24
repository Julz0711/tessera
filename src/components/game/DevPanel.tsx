'use client';

import { useState } from 'react';
import { RESOURCES, type DevCardType, type Resource } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { DEV_NAMES } from '@/client/describe';
import { api } from '@/client/store';
import { useUi } from '@/client/ui';
import { Modal } from '@/components/ui/Modal';
import { ResourceCard } from './cards';

const DEV_TEXT: Record<DevCardType, string> = {
  knight: 'Move the robber and steal a card. Three knights earn the Largest Army.',
  victoryPoint: 'Worth 1 victory point. Counted automatically — keep it secret!',
  roadBuilding: 'Place two roads for free.',
  yearOfPlenty: 'Take any two resources from the bank.',
  monopoly: 'Name a resource — every other player gives you all of theirs.',
};

const ORDER: DevCardType[] = ['knight', 'roadBuilding', 'yearOfPlenty', 'monopoly', 'victoryPoint'];

export function DevPanel({ view }: { view: PlayerView }) {
  const ui = useUi();
  const me = view.viewer!;
  const p = view.players[me];
  const [choose, setChoose] = useState<null | 'yearOfPlenty' | 'monopoly'>(null);
  const [picked, setPicked] = useState<Resource[]>([]);
  const myTurn = view.phase === 'play' && view.turn.seat === me && view.pending.length === 0;
  const canPlay = (type: DevCardType) =>
    myTurn && !view.turn.devPlayed && type !== 'victoryPoint' && p.devCards.some((c) => c.type === type && c.boughtOn < view.turn.n);

  const playCard = async (type: DevCardType) => {
    if (type === 'yearOfPlenty' || type === 'monopoly') {
      setPicked([]);
      setChoose(type);
      return;
    }
    const r = await api.act(type === 'knight' ? { type: 'playKnight' } : { type: 'playRoadBuilding' });
    if (r.ok) ui.setPanel(null);
  };

  return (
    <Modal open onClose={() => ui.setPanel(null)} title="Development cards" wide>
      {p.devCards.length === 0 && <p className="text-ink-soft">No cards yet. Buy one for 1 wool, 1 grain and 1 ore.</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {ORDER.map((type) => {
          const owned = p.devCards.filter((c) => c.type === type);
          if (!owned.length) return null;
          const fresh = owned.filter((c) => c.boughtOn >= view.turn.n).length;
          return (
            <div key={type} className="paper-flat flex flex-col gap-2 p-3">
              <div className="flex items-center justify-between">
                <span className="display text-xl font-black">{DEV_NAMES[type]}</span>
                <span className="rounded-full bg-ink px-2 text-sm font-black text-paper">×{owned.length}</span>
              </div>
              <p className="text-sm text-ink-soft">{DEV_TEXT[type]}</p>
              {type !== 'victoryPoint' && (
                <button type="button" className="btn btn-primary mt-auto py-1.5 text-sm" disabled={!canPlay(type)} onClick={() => playCard(type)}>
                  Play
                </button>
              )}
              {fresh > 0 && type !== 'victoryPoint' && <p className="text-xs text-ink-faint">{fresh} bought this turn — playable next turn.</p>}
            </div>
          );
        })}
      </div>
      {view.turn.devPlayed && myTurn && <p className="mt-3 text-sm font-bold text-ink-soft">You already played a card this turn.</p>}

      <Modal open={choose !== null} onClose={() => setChoose(null)} title={choose === 'monopoly' ? 'Monopoly: pick a resource' : 'Year of Plenty: pick two'}>
        <div className="flex flex-wrap justify-center gap-2">
          {RESOURCES.map((r) => (
            <ResourceCard
              key={r}
              card={r}
              count={picked.filter((x) => x === r).length}
              selected={picked.includes(r)}
              onClick={() => {
                if (choose === 'monopoly') setPicked([r]);
                else setPicked((prev) => (prev.length >= 2 ? [r] : [...prev, r]));
              }}
            />
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          {choose === 'yearOfPlenty' && (
            <button type="button" className="btn px-3 py-2 text-sm" onClick={() => setPicked([])}>
              Clear
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary px-5 py-2"
            disabled={choose === 'monopoly' ? picked.length !== 1 : picked.length !== 2}
            onClick={async () => {
              const r = await api.act(choose === 'monopoly' ? { type: 'playMonopoly', resource: picked[0] } : { type: 'playYearOfPlenty', resources: picked });
              if (r.ok) {
                setChoose(null);
                ui.setPanel(null);
              }
            }}
          >
            Play
          </button>
        </div>
      </Modal>
    </Modal>
  );
}
