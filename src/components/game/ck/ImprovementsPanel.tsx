'use client';

import { Crown, Hammer } from 'lucide-react';
import { TRACKS, improvementBlocker, improvementCost, type Track } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { TRACK_STYLE } from '@/client/progressText';
import { api } from '@/client/store';
import { useUi } from '@/client/ui';
import { Modal } from '@/components/ui/Modal';
import { CardChip } from '../cards';

function TrackColumn({ view, track }: { view: PlayerView; track: Track }) {
  const me = view.viewer!;
  const style = TRACK_STYLE[track];
  const level = view.players[me].improvements[track];
  const blocker = improvementBlocker(view, me, track);
  const cost = improvementCost(view, me, track);
  const holder = view.metropolis[track];
  const myTurn = view.turn.seat === me && view.turn.rolled && view.pending.length === 0;
  return (
    <div className="grid content-start gap-2 rounded-xl border-2 border-ink p-3" style={{ background: `${style.color}33` }}>
      <div className="flex items-center justify-between">
        <span className="display text-xl font-black">{style.label}</span>
        <CardChip card={style.commodity} />
      </div>
      <ol className="grid gap-1">
        {[5, 4, 3, 2, 1].map((n) => (
          <li
            key={n}
            className={`flex items-center justify-between rounded-md border px-2 py-1 text-xs font-bold ${
              n <= level ? 'border-ink' : 'border-ink/20 text-ink-faint'
            }`}
            style={n <= level ? { background: style.color, color: style.ink } : undefined}
          >
            <span>Level {n}</span>
            <span>{n === 3 ? '★ ability' : n >= 4 ? 'metropolis' : `${n} ${style.commodity}`}</span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-ink-soft">{style.ability}</p>
      {holder !== null && (
        <p className="flex items-center gap-1 text-xs font-bold">
          <Crown size={13} className="text-amber-deep" /> Metropolis: {holder === me ? 'you' : view.players[holder].name}
        </p>
      )}
      {level < 5 && (
        <button
          type="button"
          className="btn btn-primary py-1.5 text-sm"
          disabled={!myTurn || !!blocker}
          title={blocker ?? undefined}
          onClick={() => api.act({ type: 'improveCity', track })}
        >
          <Hammer size={14} /> Level {level + 1} · {cost} {style.commodity}
        </button>
      )}
      {blocker && level < 5 && <p className="text-[11px] font-semibold text-ink-faint">{blocker}</p>}
    </div>
  );
}

export function ImprovementsPanel({ view }: { view: PlayerView }) {
  const ui = useUi();
  return (
    <Modal open onClose={() => ui.setPanel(null)} title="City improvements" wide>
      <p className="mb-3 text-sm text-ink-soft">
        Spend commodities from your cities. Level 3 unlocks an ability; the first to level 4 founds a metropolis (+2 VP), and level 5 can take it
        from its holder.{view.turn.crane && view.turn.seat === view.viewer ? ' Your Crane makes the next improvement 1 cheaper.' : ''}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {TRACKS.map((t) => (
          <TrackColumn key={t} view={view} track={t} />
        ))}
      </div>
    </Modal>
  );
}
