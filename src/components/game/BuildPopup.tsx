'use client';

import { BrickWall } from 'lucide-react';
import { piecesLeft } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { confirmBuild } from '@/client/interaction';
import type { Armed, BuildWhat } from '@/client/ui';
import { PLAYER_COLORS } from '@/shared/colors';
import { KnightGlyph } from '@/components/ui/Glyphs';
import { CardList } from './cards';
import { Kbd } from '@/components/ui/Kbd';

const LABEL: Record<BuildWhat, string> = { road: 'Road', ship: 'Ship', settlement: 'Settlement', city: 'City', knight: 'Knight', wall: 'City wall' };

const SHAPE: Partial<Record<BuildWhat, string>> = {
  road: 'M11 3h6v22h-6Z',
  ship: 'M3 17h22l-4 7H7ZM13 3v14h2V3ZM15 4q7 5 0 11Z',
  settlement: 'M4 25V13l10-9 10 9v12Z',
  city: 'M2 25V14l7-6 7 6V6h4V3h4v3h2v19Z',
};

/** The piece itself, in the player's colour. */
function Piece({ what, fill, stroke }: { what: BuildWhat; fill: string; stroke: string }) {
  const d = SHAPE[what];
  if (!d) return <span style={{ color: stroke }}>{what === 'knight' ? <KnightGlyph size={28} /> : <BrickWall size={28} />}</span>;
  return (
    <svg width={28} height={28} viewBox="0 0 28 28" aria-hidden>
      <path d={d} fill={fill} stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

/** Colonist-style build confirmation, anchored on the board above the clicked spot. */
export function BuildPopup({ view, armed }: { view: PlayerView; armed: Armed }) {
  const me = view.viewer;
  if (me === null) return null;
  const color = PLAYER_COLORS[view.players[me].color];
  const left = piecesLeft(view, me);
  const count: Record<BuildWhat, number> = { road: left.roads, ship: left.ships, settlement: left.settlements, city: left.cities, knight: left.knights[1], wall: left.walls };
  return (
    <div className="flex gap-2">
      {armed.options.map((o, i) => (
        <button
          key={o.what}
          type="button"
          onClick={() => void confirmBuild(i)}
          title={`Build: ${LABEL[o.what]}`}
          className="relative flex w-20 flex-col items-center gap-1 rounded-lg border-2 border-ink bg-paper px-1.5 pb-1.5 pt-1 text-ink transition hover:bg-white"
        >
          <span className="grid min-h-5 place-items-center text-[11px]">{o.cost ? <CardList cards={o.cost} /> : <b className="font-black uppercase tracking-caps text-ink-soft">Free</b>}</span>
          <Piece what={o.what} fill={color.hex} stroke={color.dark} />
          <span className="flex items-center gap-1 text-[11px] font-bold leading-none">
            {LABEL[o.what]}
            {armed.options.length === 1 && <Kbd k="↵" />}
          </span>
          <span className="hex-badge -right-2 -top-2.5 w-6 text-[11px]" title={`${count[o.what]} left`}>
            {count[o.what]}
          </span>
        </button>
      ))}
    </div>
  );
}
