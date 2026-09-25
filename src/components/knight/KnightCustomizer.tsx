'use client';

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ImagePlus, Loader2, Move, RotateCcw, UserRound } from 'lucide-react';
import { useRef, useState } from 'react';
import type { PlayerColor } from '@/engine/types';
import { uploadFace } from '@/client/face';
import { FACE_OFFSET_RANGE, FACE_ZOOM_MAX, FACE_ZOOM_MIN, faceFrame, faceUrl, type KnightCustomization } from '@/shared/knight';
import { KnightBadge } from './KnightBadge';

const NUDGE_STEP = 0.04;
// Same width:height ratio as the visor's face opening (the ellipse in KnightBadge), so what the
// player frames here matches what actually shows in the helmet.
const FRAME_W = 132;
const FRAME_H = Math.round((FRAME_W * 37) / 32);

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Drag-to-pan, slider-to-zoom control for placing the uploaded photo inside the round visor. */
function FaceFramer({
  knight,
  onChange,
  onDone,
}: {
  knight: KnightCustomization;
  onChange: (patch: Partial<KnightCustomization>) => void;
  onDone: () => void;
}) {
  const frame = faceFrame(knight);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; x0: number; y0: number; fx: number; fy: number } | null>(null);

  const nudge = (dx: number, dy: number) =>
    onChange({
      faceX: clamp(frame.x + dx, -FACE_OFFSET_RANGE, FACE_OFFSET_RANGE),
      faceY: clamp(frame.y + dy, -FACE_OFFSET_RANGE, FACE_OFFSET_RANGE),
    });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { pointerId: e.pointerId, x0: e.clientX, y0: e.clientY, fx: frame.x, fy: frame.y };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const box = boxRef.current;
    if (!d || !box || d.pointerId !== e.pointerId) return;
    const dx = (e.clientX - d.x0) / box.clientWidth;
    const dy = (e.clientY - d.y0) / box.clientHeight;
    onChange({
      faceX: clamp(d.fx + dx, -FACE_OFFSET_RANGE, FACE_OFFSET_RANGE),
      faceY: clamp(d.fy + dy, -FACE_OFFSET_RANGE, FACE_OFFSET_RANGE),
    });
  };
  const endDrag = () => {
    drag.current = null;
  };

  return (
    <div className="grid gap-2">
      <div
        ref={boxRef}
        className="relative cursor-grab touch-none select-none overflow-hidden rounded-full border-2 border-ink/60 bg-paper-2 active:cursor-grabbing"
        style={{ width: FRAME_W, height: FRAME_H }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        aria-label="Drag to reposition the face"
      >
        {knight.face && (
          <img
            src={faceUrl(knight.face)}
            alt=""
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            style={{ transform: `translate(${frame.x * 100}%, ${frame.y * 100}%) scale(${frame.zoom})`, transformOrigin: 'center' }}
          />
        )}
      </div>
      <label className="flex items-center gap-2 text-xs font-bold text-ink-faint">
        Zoom
        <input
          type="range"
          min={FACE_ZOOM_MIN}
          max={FACE_ZOOM_MAX}
          step={0.05}
          value={frame.zoom}
          onChange={(e) => onChange({ faceZoom: clamp(Number(e.target.value), FACE_ZOOM_MIN, FACE_ZOOM_MAX) })}
          className="w-24 accent-ink"
          aria-label="Zoom"
        />
      </label>
      <div className="grid w-fit grid-cols-3 gap-1">
        <span />
        <button type="button" className="btn btn-ghost h-7 w-7 p-0" onClick={() => nudge(0, -NUDGE_STEP)} aria-label="Move face up">
          <ArrowUp size={14} />
        </button>
        <span />
        <button type="button" className="btn btn-ghost h-7 w-7 p-0" onClick={() => nudge(-NUDGE_STEP, 0)} aria-label="Move face left">
          <ArrowLeft size={14} />
        </button>
        <button
          type="button"
          className="btn btn-ghost h-7 w-7 p-0"
          onClick={() => onChange({ faceX: 0, faceY: 0, faceZoom: 1 })}
          aria-label="Reset face position and zoom"
          title="Reset"
        >
          <RotateCcw size={13} />
        </button>
        <button type="button" className="btn btn-ghost h-7 w-7 p-0" onClick={() => nudge(NUDGE_STEP, 0)} aria-label="Move face right">
          <ArrowRight size={14} />
        </button>
        <span />
        <button type="button" className="btn btn-ghost h-7 w-7 p-0" onClick={() => nudge(0, NUDGE_STEP)} aria-label="Move face down">
          <ArrowDown size={14} />
        </button>
        <span />
      </div>
      <button type="button" className="btn btn-primary w-fit px-3 py-1.5 text-sm" onClick={onDone}>
        <Check size={15} /> Done
      </button>
    </div>
  );
}

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
  // The zoom/pan controls stay tucked away until there's a reason to see them: right after a fresh
  // upload, or when the player explicitly asks to fine-tune an existing photo.
  const [adjusting, setAdjusting] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      // A fresh photo starts centred at zoom 1 — any earlier framing was tuned for the old picture.
      onChange({ face: await uploadFace(file) });
      setAdjusting(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const removeFace = () => {
    onChange({ face: null });
    setAdjusting(false);
  };

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="animate-bob">
        <KnightBadge knight={value} color={color} size={112} />
      </div>
      {value.face && adjusting && (
        <FaceFramer knight={value} onChange={(patch) => onChange({ ...value, ...patch })} onDone={() => setAdjusting(false)} />
      )}
      <div className="grid gap-2">
        <p className="max-w-xs text-sm text-ink-soft">
          Your knight wears your color. Upload a photo to give it your face — or keep the classic visor.
          {value.face && adjusting && ' Drag the photo above, or use the arrows, to place it.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn px-3 py-1.5 text-sm" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
            {value.face ? 'Change face' : 'Upload a face'}
          </button>
          {value.face && !adjusting && (
            <button type="button" className="btn btn-ghost px-3 py-1.5 text-sm" onClick={() => setAdjusting(true)} disabled={busy}>
              <Move size={15} /> Adjust photo
            </button>
          )}
          {value.face && (
            <button type="button" className="btn btn-ghost px-3 py-1.5 text-sm" onClick={removeFace} disabled={busy}>
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
