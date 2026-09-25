'use client';

import { X } from 'lucide-react';
import { useState } from 'react';
import { CARDS, COMMODITIES, RESOURCES, TRACKS, handTotal, type Card, type PartialHand, type Prompt } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { PROGRESS_NAMES } from '@/client/describe';
import { progressPickSpec } from '@/client/interaction';
import { PROGRESS_TEXT, TRACK_STYLE } from '@/client/progressText';
import { api } from '@/client/store';
import { useUi } from '@/client/ui';
import { Modal } from '@/components/ui/Modal';
import { CardPicker, ResourceCard } from '../cards';

/** Dialogs for C&K decisions that aren't made by clicking the board. */
export function CkPromptDialog({ view, prompt }: { view: PlayerView; prompt: Prompt }) {
  const me = view.viewer!;
  const hand = view.players[me].hand;
  const [sel, setSel] = useState<PartialHand>({});
  const name = (seat: number) => view.players[seat]?.name ?? '?';

  switch (prompt.kind) {
    case 'rewardDeck':
      return (
        <Modal open dismissable={false} title="Defender's reward">
          <p className="mb-3 text-sm text-ink-soft">You tied for the strongest defense. Draw a progress card from a deck of your choice:</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {TRACKS.map((t) => (
              <button
                key={t}
                type="button"
                className="btn py-3"
                style={{ ['--btn-bg' as string]: TRACK_STYLE[t].color, ['--btn-fg' as string]: TRACK_STYLE[t].ink }}
                onClick={() => api.act({ type: 'chooseDeck', track: t })}
              >
                {TRACK_STYLE[t].label}
              </button>
            ))}
          </div>
        </Modal>
      );
    case 'aqueduct':
      return (
        // A quick pick: the board and your hand stay in full view behind it.
        <Modal open dismissable={false} dim={false} title="Aqueduct">
          <p className="mb-3 text-sm text-ink-soft">The roll gave you nothing — take one resource of your choice.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {RESOURCES.map((r) => (
              <ResourceCard key={r} card={r} count={0} onClick={() => api.act({ type: 'aqueduct', resource: r })} />
            ))}
          </div>
        </Modal>
      );
    case 'discardProgress':
      return (
        <Modal open dismissable={false} title="Too many progress cards">
          <p className="mb-3 text-sm text-ink-soft">You may hold 4. Pick one to return to its deck:</p>
          <div className="grid gap-2">
            {view.players[me].progress.map((c) => (
              <button key={c.id} type="button" className="btn justify-start px-3 py-2 text-left" onClick={() => api.act({ type: 'discardProgress', card: c.id })}>
                <span className="h-6 w-4 rounded border border-ink" style={{ background: TRACK_STYLE[c.track].color }} />
                <span>
                  <b>{PROGRESS_NAMES[c.type]}</b> <span className="text-xs font-normal text-ink-soft">{PROGRESS_TEXT[c.type]}</span>
                </span>
              </button>
            ))}
          </div>
        </Modal>
      );
    case 'giveCards':
      return (
        <Modal open dismissable={false} title={`A gift for ${name(prompt.to)}`}>
          <p className="mb-3 text-sm text-ink-soft">
            {name(prompt.to)} played a card: give them {prompt.count} card{prompt.count === 1 ? '' : 's'} of your choice.
          </p>
          <CardPicker cards={CARDS} value={sel} onChange={setSel} max={hand} limitTotal={prompt.count} />
          <div className="mt-4 flex justify-end">
            <button type="button" className="btn btn-primary px-5 py-2" disabled={handTotal(sel) !== prompt.count} onClick={() => api.act({ type: 'giveCards', cards: sel })}>
              Give
            </button>
          </div>
        </Modal>
      );
    case 'commercialHarbor': {
      const options = COMMODITIES.filter((c) => hand[c] > 0);
      return (
        <Modal open dismissable={false} title="Commercial Harbor">
          <p className="mb-3 text-sm text-ink-soft">{name(prompt.from)} gave you a resource. Give back one commodity of your choice:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {options.map((c) => (
              <ResourceCard key={c} card={c} count={hand[c]} onClick={() => api.act({ type: 'giveCards', cards: { [c]: 1 } })} />
            ))}
          </div>
        </Modal>
      );
    }
    case 'spy':
      return (
        <Modal open dismissable={false} title={`Spying on ${name(prompt.victim)}`}>
          <p className="mb-3 text-sm text-ink-soft">Take one of their progress cards:</p>
          <div className="grid gap-2">
            {prompt.cards.map((c) => (
              <button key={c.id} type="button" className="btn justify-start px-3 py-2 text-left" onClick={() => api.act({ type: 'takeProgress', card: c.id })}>
                <span className="h-6 w-4 rounded border border-ink" style={{ background: TRACK_STYLE[c.track].color }} />
                <b>{PROGRESS_NAMES[c.type]}</b>
              </button>
            ))}
          </div>
        </Modal>
      );
    case 'masterMerchant':
      return (
        <Modal open dismissable={false} title={`${name(prompt.victim)}'s hand`}>
          <p className="mb-3 text-sm text-ink-soft">Take {prompt.count} card{prompt.count === 1 ? '' : 's'}:</p>
          <CardPicker cards={CARDS.filter((c) => prompt.hand[c] > 0) as Card[]} value={sel} onChange={setSel} max={prompt.hand} limitTotal={prompt.count} />
          <div className="mt-4 flex justify-end">
            <button type="button" className="btn btn-primary px-5 py-2" disabled={handTotal(sel) !== prompt.count} onClick={() => api.act({ type: 'takeCards', cards: sel })}>
              Take
            </button>
          </div>
        </Modal>
      );
    default:
      return null;
  }
}

const PROMPT_HINT: Partial<Record<Prompt['kind'], string>> = {
  loseCity: 'The barbarians won — pick a city to lose',
  relocateKnight: 'Your knight was displaced — pick where it goes',
  deserterRemove: 'A deserter! Pick one of your knights to leave',
  deserterPlace: 'Place the deserting knight next to your roads',
  placeMetropolis: 'Pick a city for your metropolis',
};

/** Instruction strip for board picks, with cancel/done/give-up buttons where they make sense. */
export function PickBanner({ view }: { view: PlayerView }) {
  const ui = useUi();
  const me = view.viewer;
  if (me === null) return null;
  const prompt = view.pending.find((p) => p.seat === me);
  let text: string | null = null;
  let extra: React.ReactNode = null;

  if (prompt && PROMPT_HINT[prompt.kind]) {
    text = PROMPT_HINT[prompt.kind]!;
    if (prompt.kind === 'relocateKnight') {
      extra = (
        <button type="button" className="btn btn-ghost px-2 py-1 text-xs" onClick={() => api.act({ type: 'relocateKnight', vertex: null })}>
          Give it up
        </button>
      );
    }
    if (prompt.kind === 'deserterPlace') {
      extra = (
        <button type="button" className="btn btn-ghost px-2 py-1 text-xs" onClick={() => api.act({ type: 'placeKnight', vertex: null })}>
          Skip
        </button>
      );
    }
  } else if (!prompt && ui.mode) {
    const m = ui.mode;
    if (m.t === 'build') text = { road: 'Pick where to build the road', settlement: 'Pick a spot for the settlement', city: 'Pick a settlement to upgrade', knight: 'Pick an empty spot next to your roads', wall: 'Pick a city to protect' }[m.what];
    if (m.t === 'knightMove') text = 'Pick where your knight goes (a weaker enemy knight gets displaced)';
    if (m.t === 'knightChase') text = 'Pick where to send the robber';
    if (m.t === 'progress') {
      const spec = progressPickSpec(view, m.cardType);
      text = `${PROGRESS_NAMES[m.cardType]}: ${spec?.hint ?? ''}${spec && spec.need > 1 ? ` (${m.picked.length}/${spec.need})` : ''}`;
      if (spec?.upTo && m.picked.length > 0) {
        extra = (
          <button
            type="button"
            className="btn btn-primary px-2 py-1 text-xs"
            onClick={() => api.act({ type: 'playProgress', card: m.card, params: { vertices: m.picked } }).then((r) => r.ok && ui.setMode(null))}
          >
            Done
          </button>
        );
      }
    }
    extra = (
      <>
        {extra}
        <button type="button" className="btn btn-ghost px-2 py-1 text-xs" onClick={() => ui.setMode(null)} aria-label="Cancel">
          <X size={14} /> Cancel
        </button>
      </>
    );
  }
  if (!text) return null;
  return (
    <div className="paper animate-pop flex items-center gap-2 px-4 py-2 text-sm font-extrabold">
      <span>{text}</span>
      {extra}
    </div>
  );
}
