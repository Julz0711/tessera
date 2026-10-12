'use client';

import { useState } from 'react';
import type { PlayerColor } from '@/engine/types';
import { PLAYER_COLORS } from '@/shared/colors';
import { itemById } from '@/shared/progression';
import type { ProgressData } from '@/shared/protocol';
import { KnightBadge } from '@/components/knight/KnightBadge';
import { ItemArt, LevelBadge, SurroundFrame } from '@/components/progression/ItemArt';
import { WardrobeDialog } from '@/components/progression/WardrobeDialog';
import { Pad } from '@/components/room/LobbyRoom';

/**
 * Your character on the quay: the lobby's pad, figure and nameplate, bottom left of the main menu.
 * The whole thing opens the wardrobe. Shown on large screens only (see .landing-quay).
 */
export function Quay({ data, name, color, onChanged }: { data: ProgressData; name: string; color: PlayerColor; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const { loadout } = data;
  const title = loadout.title ? itemById(loadout.title)?.name : null;
  return (
    <div className="landing-quay absolute bottom-14 left-5 z-10 sm:left-10">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-60 text-left"
        aria-label="Change your character, banner, title and surround"
      >
        <span className="relative block h-40">
          <Pad color={PLAYER_COLORS[color].hex} />
          <span className="absolute bottom-7 left-1/2 -translate-x-[62%]">
            <ItemArt id={loadout.character} color={color} size={120} />
          </span>
          {loadout.banner && (
            <span className="absolute bottom-10 left-[60%]">
              <ItemArt id={loadout.banner} color={color} size={84} />
            </span>
          )}
        </span>
        <span className="paper-flat flex items-center gap-2 p-2">
          <SurroundFrame id={loadout.surround} size={40}>
            <KnightBadge color={color} size={40} />
          </SurroundFrame>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-bold leading-tight">{name}</span>
            <span className="mt-0.5 flex min-w-0 items-center gap-1.5">
              <LevelBadge level={data.level.level} size={20} />
              {title && <span className="truncate text-xs font-bold text-ink-soft">{title}</span>}
            </span>
          </span>
        </span>
      </button>
      <WardrobeDialog open={open} onClose={() => { setOpen(false); onChanged(); }} color={color} />
    </div>
  );
}
