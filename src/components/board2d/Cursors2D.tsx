'use client';

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useCursors } from '@/client/cursorStore';
import { motionReduced, sendCursor, sendCursorClick, useSeeCursorsOn, useShareCursorOn } from '@/client/cursors';
import { useGame } from '@/client/store';
import { PLAYER_COLORS } from '@/shared/colors';
import { CURSOR_SHOW_MS, RIPPLE_MS } from '@/shared/cursors';

/** Sends where the viewer's mouse is over the board, in board units (svg units / `unit`); nothing happens while sharing is off. */
export function useCursorTracking2D(svgRef: RefObject<SVGSVGElement | null>, unit: number, enabled: boolean): void {
  const on = useShareCursorOn() && enabled;
  useEffect(() => {
    const svg = svgRef.current;
    if (!on || !svg) return;
    const move = (e: PointerEvent) => {
      const ctm = svg.getScreenCTM();
      if (!ctm || e.pointerType === 'touch') return;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      sendCursor({ x: p.x / unit, y: p.y / unit });
    };
    const leave = () => sendCursor(null);
    const down = (e: PointerEvent) => {
      const ctm = svg.getScreenCTM();
      if (!ctm || e.pointerType === 'touch' || e.button !== 0) return;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      sendCursorClick({ x: p.x / unit, y: p.y / unit });
    };
    svg.addEventListener('pointerdown', down, true);
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerleave', leave);
    return () => {
      svg.removeEventListener('pointerdown', down, true);
      svg.removeEventListener('pointermove', move);
      svg.removeEventListener('pointerleave', leave);
      sendCursor(null);
    };
  }, [on, svgRef, unit]);
}

function Mark({ id, unit }: { id: string; unit: number }) {
  const c = useCursors((s) => s.cursors[id]);
  const seat = useGame((s) => s.room?.seats.find((p) => p.playerId === id));
  const [now, setNow] = useState(() => Date.now());
  // The tag fits the name as drawn (measured once it renders), with even padding either side.
  const text = useRef<SVGTextElement>(null);
  const [textWidth, setTextWidth] = useState(0);
  useLayoutEffect(() => {
    if (text.current) setTextWidth(text.current.getComputedTextLength());
  }, [seat?.name, !!c]);
  // Fades out when it hasn't moved for a few seconds.
  useEffect(() => {
    if (!c) return;
    setNow(Date.now());
    const t = setTimeout(() => setNow(Date.now()), CURSOR_SHOW_MS + 50);
    return () => clearTimeout(t);
  }, [c]);
  if (!c || !seat) return null;
  const col = PLAYER_COLORS[seat.color];
  const shown = now - c.at < CURSOR_SHOW_MS;
  const name = seat.name.slice(0, 14);
  return (
    <g pointerEvents="none" style={{ transform: `translate(${c.x * unit}px, ${c.y * unit}px)`, opacity: shown ? 1 : 0, transition: 'transform 110ms linear, opacity 400ms' }}>
      <path d="M0 0 L0 24 L6.5 18.5 L11 29 L15.5 27 L11 17 L19.5 17 Z" fill={col.hex} stroke="#131a1d" strokeWidth="2" strokeLinejoin="round" />
      {/* A paper name tag like the player cards: ink line, tight corners, a hard shadow and the colour stripe. */}
      <g transform="translate(16 26)">
        <rect y="2" width={Math.ceil(textWidth) + 19} height="22" rx="4" fill="#131a1d" />
        <rect width={Math.ceil(textWidth) + 19} height="22" rx="4" fill="#fbfcfc" stroke="#131a1d" strokeWidth="2" />
        <rect x="1" y="1" width="5" height="20" rx="2" fill={col.hex} />
        <text ref={text} x="11" y="15.5" fontSize="13" fontWeight="800" fill="#131a1d" style={{ fontFamily: 'var(--font-sans)' }}>{name}</text>
      </g>
    </g>
  );
}

/** A click by another player: a ring in their colour that grows and fades (a still dot with reduced motion). */
function Ripple({ id, x, y }: { id: string; x: number; y: number }) {
  const seat = useGame((s) => s.room?.seats.find((p) => p.playerId === id));
  const [still] = useState(motionReduced);
  if (!seat) return null;
  const col = PLAYER_COLORS[seat.color].hex;
  const dur = `${RIPPLE_MS}ms`;
  return (
    <g pointerEvents="none" transform={`translate(${x} ${y})`}>
      {still ? (
        <circle r="7" fill={col} stroke="#131a1d" strokeWidth="2" />
      ) : (
        // A CSS animation, not SVG <animate>: one added after the svg loaded runs on the document's clock and is already over.
        <g className="cursor-ripple-2d" style={{ animationDuration: dur }}>
          <circle r="34" fill="none" stroke="#131a1d" strokeWidth="7" vectorEffect="non-scaling-stroke" />
          <circle r="34" fill="none" stroke={col} strokeWidth="3.5" vectorEffect="non-scaling-stroke" />
        </g>
      )}
    </g>
  );
}

/** Other players' mouse pointers, inside the board's own svg so they pan and zoom with it. */
export function CursorLayer2D({ unit, enabled }: { unit: number; enabled: boolean }) {
  const on = useSeeCursorsOn() && enabled;
  const ids = useCursors((s) => Object.keys(s.cursors).join('|'));
  const ripples = useCursors((s) => s.ripples);
  if (!on || (!ids && !ripples.length)) return null;
  return (
    <g>
      {ripples.map((r) => (
        <Ripple key={r.id} id={r.playerId} x={r.x * unit} y={r.y * unit} />
      ))}
      {ids && ids.split('|').map((id) => (
        <Mark key={id} id={id} unit={unit} />
      ))}
    </g>
  );
}
