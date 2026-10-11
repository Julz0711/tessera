'use client';

import { DEV_NAMES, PROGRESS_NAMES } from '@/client/describe';
import { TRACK_STYLE } from '@/client/progressText';
import { PLAYER_COLORS } from '@/shared/colors';
import type { PlayerView } from '@/engine/view';
import { CardList } from '../cards';

/** A held card that is not a resource: a small labelled pill on its colour. */
function Pill({ label, bg, ink }: { label: string; bg: string; ink: string }) {
  return (
    <span className="mx-0.5 inline-block rounded-md border border-black/30 px-1 align-middle text-[11px] font-bold leading-4.5" style={{ background: bg, color: ink }}>
      {label}
    </span>
  );
}

/** Every player's hand in the replay, opened: resources and commodities, then development or progress cards. */
export function ReplayHands({ view }: { view: PlayerView }) {
  return (
    <ul className="scroll-thin min-h-0 flex-1 space-y-2.5 overflow-y-auto text-sm">
      {view.players.map((p, seat) => (
        <li key={seat}>
          <div className="mb-0.5 flex items-center gap-1.5 font-bold text-paper">
            <span className="size-2.5 rounded-full border border-black/40" style={{ background: PLAYER_COLORS[p.color].hex }} />
            {p.name}
            <span className="text-xs font-normal text-foam/60">{p.handCount} cards</span>
          </div>
          <div className="leading-6 text-paper">
            <CardList cards={p.hand} />
            {p.devCards.map((c, i) => (
              <Pill key={`d${i}`} label={DEV_NAMES[c.type]} bg="#0f2f3b" ink="#f4ecd8" />
            ))}
            {p.progress.map((c) => (
              <Pill key={c.id} label={PROGRESS_NAMES[c.type]} bg={TRACK_STYLE[c.track].color} ink={TRACK_STYLE[c.track].ink} />
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
