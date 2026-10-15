import { KnightBadge } from '@/components/knight/KnightBadge';
import { SurroundFrame } from '@/components/progression/ItemArt';
import type { PlayerColor } from '@/engine/types';

/** A player's portrait — photo or knight — inside their surround when we know it. */
export function PlayerPortrait({
  color,
  avatarUrl,
  surround,
  size,
}: {
  color: PlayerColor;
  avatarUrl?: string | null;
  /** Worn surround item id; leave out where the player's loadout isn't known. */
  surround?: string | null;
  size: number;
}) {
  const face = avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarUrl} alt="" width={size} height={size} className="shrink-0 rounded-full border-2 border-ink object-cover" style={{ width: size, height: size }} referrerPolicy="no-referrer" />
  ) : (
    <KnightBadge color={color} size={size} />
  );
  if (surround === undefined) return face;
  return (
    <SurroundFrame id={surround} size={size}>
      {face}
    </SurroundFrame>
  );
}
