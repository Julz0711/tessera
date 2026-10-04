import { MiniArt } from '@/components/game/cardArt';
import { TRACK_STYLE } from '@/client/progressText';
import { Crown, Star } from './art-ck';

const TRACKS = ['trade', 'politics', 'science'] as const;
const LEVELS = [5, 4, 3, 2, 1];

/** Rulebook figure: the three improvement tracks as stacks of five levels, star at 3, crown at 4 and 5. */
export function ImprovementsFigure() {
  return (
    <div className="flex items-end justify-center gap-4">
      {TRACKS.map((t) => {
        const s = TRACK_STYLE[t];
        return (
          <div key={t} className="flex w-[84px] flex-col items-center gap-1">
            <MiniArt card={s.commodity} size={34} />
            {LEVELS.map((l) => (
              <div
                key={l}
                className="relative flex h-[22px] items-center justify-center rounded-md border-2 border-ink"
                style={{ background: s.color, color: s.ink, width: 52 + l * 6, opacity: l >= 3 ? 1 : 0.6 }}
              >
                <span className="display text-xs font-black leading-none">{l}</span>
                {l === 3 && (
                  <span className="absolute -right-3 -top-2">
                    <Star size={18} />
                  </span>
                )}
                {l >= 4 && (
                  <span className="absolute -right-3 -top-2">
                    <Crown size={18} />
                  </span>
                )}
              </div>
            ))}
            <span className="label text-ink-soft">{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}
