'use client';

import type { PlayerView } from '@/engine/view';
import { confirmRobber, robberPickVictims } from '@/client/interaction';
import type { RobberPick } from '@/client/ui';
import { PLAYER_COLORS } from '@/shared/colors';
import { RobberGlyph } from '@/components/ui/Glyphs';

/** Confirms the robber's new hex, anchored on the board above it: pick who to rob, or just move it there. */
export function RobberPopup({ view, pick }: { view: PlayerView; pick: RobberPick }) {
  const victims = robberPickVictims(view, pick.hex);
  if (!victims.length) {
    return (
      <button type="button" className="btn btn-primary whitespace-nowrap px-4 py-2" onClick={() => void confirmRobber(view)}>
        <RobberGlyph size={18} /> Move robber here
      </button>
    );
  }
  return (
    <div className="paper grid min-w-48 gap-1.5 p-2">
      <span className="label px-1">Steal from</span>
      {victims.map((seat) => {
        const p = view.players[seat];
        const c = PLAYER_COLORS[p.color];
        return (
          <button
            key={seat}
            type="button"
            className="btn justify-between gap-3 px-3 py-2"
            style={{ ['--btn-bg' as string]: c.hex, ['--btn-fg' as string]: c.ink }}
            onClick={() => void confirmRobber(view, seat)}
          >
            <span className="max-w-40 truncate">{p.name}</span>
            <span className="text-xs">{p.handCount} cards</span>
          </button>
        );
      })}
    </div>
  );
}
