'use client';

import { ImagePlus, Loader2, UserRound } from 'lucide-react';
import { useRef, useState } from 'react';
import type { PlayerColor } from '@/engine/types';
import { uploadFace } from '@/client/face';
import type { KnightCustomization } from '@/shared/knight';
import { KnightBadge } from './KnightBadge';

/** The knight is the same basic figure for everyone; players can give it their own face. */
export function KnightCustomizer({
  value,
  color,
  onChange,
}: {
  value: KnightCustomization;
  color: PlayerColor;
  onChange: (k: KnightCustomization) => void;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange({ face: await uploadFace(file) });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="animate-bob">
        <KnightBadge knight={value} color={color} size={112} />
      </div>
      <div className="grid gap-2">
        <p className="max-w-xs text-sm text-ink-soft">
          Your knight wears your color. Upload a photo to give it your face — or keep the classic visor.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn px-3 py-1.5 text-sm" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
            {value.face ? 'Change face' : 'Upload a face'}
          </button>
          {value.face && (
            <button type="button" className="btn btn-ghost px-3 py-1.5 text-sm" onClick={() => onChange({ face: null })} disabled={busy}>
              <UserRound size={15} /> Use the visor
            </button>
          )}
        </div>
        {error && <p className="text-xs font-bold text-danger">{error}</p>}
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      </div>
    </div>
  );
}
