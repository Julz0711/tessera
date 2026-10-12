'use client';

import { useEffect, useState } from 'react';
import type { PlayerColor } from '@/engine/types';
import type { Slot } from '@/shared/progression';
import type { ProgressData } from '@/shared/protocol';
import { HexSpinner } from '@/components/ui/HexSpinner';
import { Modal } from '@/components/ui/Modal';
import { fetchProgress, Wardrobe, wearLoadout } from './ProgressPage';

/** The wardrobe in a dialog, so the lobby can change your look without leaving the room. */
export function WardrobeDialog({ open, onClose, color }: { open: boolean; onClose: () => void; color: PlayerColor }) {
  const [data, setData] = useState<ProgressData | null>(null);
  const [failed, setFailed] = useState(false);
  const [slot, setSlot] = useState<Slot>('character');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFailed(false);
    fetchProgress().then((d) => (d ? setData(d) : setFailed(true))).catch(() => setFailed(true));
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Your look" wide top>
      {failed && <p role="alert">Couldn&apos;t load your wardrobe. Try again in a moment.</p>}
      {!data && !failed && <div role="status" className="flex items-center gap-2 text-sm text-ink-faint"><HexSpinner size={16} decorative /> Loading…</div>}
      {data && (
        <Wardrobe data={data} color={color} slot={slot} onSlot={setSlot} saving={saving}
          onWear={async (loadout) => {
            setSaving(true);
            const fresh = await wearLoadout(loadout);
            if (fresh) setData(fresh);
            setSaving(false);
          }} />
      )}
      <p className="mt-4 text-xs text-ink-faint">Placeholders while the real characters and banners are made.</p>
    </Modal>
  );
}
