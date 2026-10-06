'use client';

import { Check, ImagePlus, Link2, Loader2, Move, RotateCcw, UserRound, ZoomIn, ZoomOut } from 'lucide-react';
import { useRef, useState } from 'react';
import type { PlayerColor } from '@/engine/types';
import { uploadFace } from '@/client/face';
import {
  FACE_OFFSET_RANGE,
  FACE_ZOOM_MAX,
  FACE_ZOOM_MIN,
  KNIGHT_SLOTS,
  KNIGHT_SLOT_NAMES,
  faceFrame,
  faceUrl,
  hasOwnLook,
  knightLook,
  withKnightLook,
  type KnightCustomization,
  type KnightLook,
  type KnightSlot,
} from '@/shared/knight';
import { KnightBadge } from './KnightBadge';

// Same width:height ratio as the visor's face opening (the ellipse in KnightBadge), so what the
// player frames here matches what actually shows in the helmet.
const FRAME_W = 120;
const FRAME_H = Math.round((FRAME_W * 37) / 32);

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** How far one arrow-key press moves the photo (Shift: four times as far). */
const NUDGE_STEP = 0.02;

/** The photo inside a visor-shaped window; drag it to pan, or focus it and use the arrow keys. */
function FaceWindow({ look, onChange }: { look: KnightLook; onChange: (patch: Partial<KnightLook>) => void }) {
  const frame = faceFrame(look);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; x0: number; y0: number; fx: number; fy: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { pointerId: e.pointerId, x0: e.clientX, y0: e.clientY, fx: frame.x, fy: frame.y };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const box = boxRef.current;
    if (!d || !box || d.pointerId !== e.pointerId) return;
    onChange({
      faceX: clamp(d.fx + (e.clientX - d.x0) / box.clientWidth, -FACE_OFFSET_RANGE, FACE_OFFSET_RANGE),
      faceY: clamp(d.fy + (e.clientY - d.y0) / box.clientHeight, -FACE_OFFSET_RANGE, FACE_OFFSET_RANGE),
    });
  };
  const endDrag = () => {
    drag.current = null;
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!dir) return;
    e.preventDefault();
    const step = e.shiftKey ? NUDGE_STEP * 4 : NUDGE_STEP;
    onChange({
      faceX: clamp(frame.x + dir[0] * step, -FACE_OFFSET_RANGE, FACE_OFFSET_RANGE),
      faceY: clamp(frame.y + dir[1] * step, -FACE_OFFSET_RANGE, FACE_OFFSET_RANGE),
    });
  };

  return (
    <div
      ref={boxRef}
      className="relative shrink-0 cursor-grab touch-none select-none overflow-hidden rounded-full border-2 border-ink bg-paper-2 outline-none focus-visible:ring-4 focus-visible:ring-amber active:cursor-grabbing"
      style={{ width: FRAME_W, height: FRAME_H }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="group"
      aria-label="Face photo: drag it, or use the arrow keys, to move it"
      title="Drag to move the photo (or use the arrow keys)"
    >
      {look.face && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={faceUrl(look.face)}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{ transform: `translate(${frame.x * 100}%, ${frame.y * 100}%) scale(${frame.zoom})`, transformOrigin: 'center' }}
        />
      )}
      <span className="pointer-events-none absolute inset-x-0 bottom-1.5 flex justify-center">
        <Move size={14} className="rounded-full bg-ink/55 p-0.5 text-paper" />
      </span>
    </div>
  );
}

/** Zoom and reset for the photo in the face window, in one row (the photo itself is dragged into place). */
function FaceControls({ look, onChange, onDone }: { look: KnightLook; onChange: (patch: Partial<KnightLook>) => void; onDone: () => void }) {
  const frame = faceFrame(look);
  const zoomTo = (z: number) => onChange({ faceZoom: clamp(z, FACE_ZOOM_MIN, FACE_ZOOM_MAX) });
  const zoomButton = (label: string, onClick: () => void, icon: React.ReactNode) => (
    <button
      type="button"
      className="grid h-8 w-8 shrink-0 place-items-center rounded-md border-2 border-ink bg-paper hover:bg-paper-2 active:bg-paper-3"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="label">Zoom</span>
      {zoomButton('Zoom out', () => zoomTo(frame.zoom - 0.25), <ZoomOut size={15} />)}
      <input
        type="range"
        min={FACE_ZOOM_MIN}
        max={FACE_ZOOM_MAX}
        step={0.05}
        value={frame.zoom}
        onChange={(e) => zoomTo(Number(e.target.value))}
        className="range w-28 min-w-0 shrink"
        aria-label="Zoom"
      />
      {zoomButton('Zoom in', () => zoomTo(frame.zoom + 0.25), <ZoomIn size={15} />)}
      <div className="ml-auto flex items-center gap-2">
        <button type="button" className="btn h-9 px-3 text-sm" onClick={() => onChange({ faceX: 0, faceY: 0, faceZoom: 1 })}>
          <RotateCcw size={14} /> Reset
        </button>
        <button type="button" className="btn btn-primary h-9 px-4 text-sm" onClick={onDone}>
          <Check size={15} /> Done
        </button>
      </div>
    </div>
  );
}

/**
 * The knight is the same figure for everyone, in the player's color. In C&K a player's knights come
 * in three levels, and each one (knight 1, 2 and 3) can get its own face — or keep the visor.
 */
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
  const [slot, setSlot] = useState<KnightSlot>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The zoom/pan controls stay tucked away until there's a reason to see them: right after a fresh
  // upload, or when the player explicitly asks to fine-tune an existing photo.
  const [adjusting, setAdjusting] = useState(false);

  const look = knightLook(value, slot);
  const own = hasOwnLook(value, slot);
  const setLook = (next: KnightLook | null) => onChange(withKnightLook(value, slot, next));

  const choose = (next: KnightSlot) => {
    setSlot(next);
    setAdjusting(false);
    setError(null);
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      // A fresh photo starts centred at zoom 1 — any earlier framing was tuned for the old picture.
      setLook({ face: await uploadFace(file) });
      setAdjusting(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    // min-w-0: this sits in a single-column grid (the profile form); without it, the "adjusting"
    // row below — a flex-wrap row that never shrinks past its children's natural width — pushes
    // that whole grid track (and so the page) wider than the viewport instead of wrapping.
    <div className="grid min-w-0 gap-3">
      {/* knight 1, 2, 3 */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Knights">
        {KNIGHT_SLOTS.map((n) => {
          const on = n === slot;
          return (
            <button
              key={n}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => choose(n)}
              className={`flex items-center gap-2 rounded-lg border-2 py-1 pl-1 pr-3 text-left transition ${
                on ? 'border-ink bg-pick' : 'border-ink bg-white hover:bg-paper-2'
              }`}
            >
              <KnightBadge knight={knightLook(value, n)} color={color} size={44} />
              <span className="grid leading-tight">
                <span className="text-sm font-black">Knight {n}</span>
                <span className={`text-[11px] font-bold ${on ? 'text-ink-soft' : 'text-ink-faint'}`}>
                  {KNIGHT_SLOT_NAMES[n]}
                  {!hasOwnLook(value, n) && ' · same look as knight 1'}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* the selected knight */}
      <div className="grid gap-4 rounded-2xl border-2 border-ink bg-paper-2 p-4">
        {look.face && adjusting ? (
          <>
            <div className="flex flex-wrap items-center gap-5">
              <div className="grid justify-items-center gap-1.5">
                <FaceWindow look={look} onChange={(patch) => setLook({ ...look, ...patch })} />
                <span className="label">Photo</span>
              </div>
              <div className="grid justify-items-center gap-1.5">
                <div className="grid place-items-center" style={{ height: FRAME_H }}>
                  <KnightBadge knight={look} color={color} size={96} />
                </div>
                <span className="label">Knight {slot}</span>
              </div>
              <p className="min-w-40 flex-1 text-sm text-ink-soft">Drag the photo until the face sits in the helmet. Zoom in to fill the visor.</p>
            </div>
            <div className="border-t-2 border-ink/10 pt-4">
              <FaceControls look={look} onChange={(patch) => setLook({ ...look, ...patch })} onDone={() => setAdjusting(false)} />
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-5">
            <div className="grid shrink-0 place-items-center" style={{ width: FRAME_W, height: FRAME_H }}>
              <div className="animate-bob">
                <KnightBadge knight={look} color={color} size={FRAME_W} />
              </div>
            </div>
            <div className="grid min-w-52 flex-1 content-center gap-3">
              <p className="text-sm text-ink-soft">
                {slot === 1
                  ? 'Your knights wear your color. Upload a photo to give knight 1 your face, or keep the visor.'
                  : own
                    ? `Knight ${slot} has its own look.`
                    : `Knight ${slot} looks like knight 1 until you give it its own face.`}
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn h-9 px-3 text-sm" onClick={() => input.current?.click()} disabled={busy}>
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
                  {look.face && own ? 'New photo' : 'Upload a photo'}
                </button>
                {look.face && own && (
                  <button type="button" className="btn h-9 px-3 text-sm" onClick={() => setAdjusting(true)} disabled={busy}>
                    <Move size={15} /> Adjust
                  </button>
                )}
                {look.face && (
                  <button type="button" className="btn h-9 px-3 text-sm" onClick={() => setLook({ face: null })} disabled={busy}>
                    <UserRound size={15} /> Use the visor
                  </button>
                )}
                {slot !== 1 && own && (
                  <button type="button" className="btn h-9 px-3 text-sm" onClick={() => setLook(null)} disabled={busy}>
                    <Link2 size={15} /> Same as knight 1
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        {error && <p className="text-xs font-bold text-danger">{error}</p>}
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      </div>
    </div>
  );
}
