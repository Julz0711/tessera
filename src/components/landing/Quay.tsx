'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { PlayerColor } from '@/engine/types';
import { PLAYER_COLORS } from '@/shared/colors';
import type { ProgressData } from '@/shared/protocol';
import { MODE_LABEL, type ModeRating } from '@/shared/ratings';
import { ItemArt } from '@/components/progression/ItemArt';
import { WardrobeDialog } from '@/components/progression/WardrobeDialog';
import { Pad } from '@/components/room/LobbyRoom';

/**
 * Your character on the quay with your rating below it, bottom right of the main menu. The
 * character opens the wardrobe; the arrows step through every mode you have a rating in.
 * Shown on large screens only (see .landing-dock).
 */
export function Quay({ data, color, ratings, onChanged }: { data: ProgressData; color: PlayerColor; ratings: ModeRating[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const { loadout } = data;
  const shown = ratings.filter((r) => r.ratedGames > 0);
  const cur = shown.length ? shown[Math.min(i, shown.length - 1)] : null;
  const step = (d: number) => setI((n) => (n + d + shown.length) % shown.length);
  return (
    <div className="w-60">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block h-40 w-full"
        aria-label="Change your character, banner, title and surround"
      >
        <Pad color={PLAYER_COLORS[color].hex} />
        <span className="absolute bottom-7 left-1/2 -translate-x-[62%]">
          <ItemArt id={loadout.character} color={color} size={120} />
        </span>
        {loadout.banner && (
          <span className="absolute bottom-10 left-[60%]">
            <ItemArt id={loadout.banner} color={color} size={84} />
          </span>
        )}
      </button>
      <div className="paper-flat flex items-center gap-2 p-3">
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="text-xs font-bold uppercase tracking-label text-ink-soft">Your rating{cur ? ` · ${MODE_LABEL[cur.pool]}` : ''}</p>
          {cur ? (
            <>
              <p className="display text-3xl font-black leading-tight tabular">{cur.rating.toLocaleString()}</p>
              <p className="text-xs font-bold text-ink-soft">{cur.ratedGames} rated {cur.ratedGames === 1 ? 'game' : 'games'}{cur.place ? ` · #${cur.place}` : ''}</p>
            </>
          ) : (
            <p className="mt-1 text-sm font-bold text-ink-soft">No rated games yet</p>
          )}
        </div>
        {shown.length > 1 && (
          <div className="flex shrink-0 gap-1">
            <button type="button" className="btn h-8 w-8 p-0" aria-label="Previous mode" onClick={() => step(-1)}><ChevronLeft size={16} /></button>
            <button type="button" className="btn h-8 w-8 p-0" aria-label="Next mode" onClick={() => step(1)}><ChevronRight size={16} /></button>
          </div>
        )}
      </div>
      <WardrobeDialog open={open} onClose={() => { setOpen(false); onChanged(); }} color={color} />
    </div>
  );
}
