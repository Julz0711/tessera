'use client';

import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { Plane, Raycaster, Vector2, Vector3, type Group } from 'three';
import { useCursors } from '@/client/cursorStore';
import { motionReduced, sendCursor, sendCursorClick, useSeeCursorsOn, useShareCursorOn } from '@/client/cursors';
import { useGame } from '@/client/store';
import { PLAYER_COLORS } from '@/shared/colors';
import { CURSOR_SHOW_MS, RIPPLE_MS } from '@/shared/cursors';

/** Pointers hover just above the tiles (world y; the island itself sits a little above the sea). */
const CURSOR_HEIGHT = 0.2;

/** Sends where the viewer's mouse is on the board, in board units: the ray under it meets the board plane. */
export function CursorTracker3D({ cx, cz, reach }: { cx: number; cz: number; reach: number }) {
  const on = useShareCursorOn();
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    if (!on) return;
    const el = gl.domElement;
    const ray = new Raycaster();
    const plane = new Plane(new Vector3(0, 1, 0), -CURSOR_HEIGHT);
    const ndc = new Vector2();
    const hit = new Vector3();
    const at = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
      ray.setFromCamera(ndc, camera);
      const p = ray.ray.intersectPlane(plane, hit);
      // Looking at the sky or the far horizon is not "over the board".
      return p && Math.hypot(p.x, p.z) <= reach ? { x: p.x + cx, y: p.z + cz } : null;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      sendCursor(at(e));
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.button !== 0) return;
      const p = at(e);
      if (p) sendCursorClick(p);
    };
    el.addEventListener('pointerdown', down, true);
    const leave = () => sendCursor(null);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointerdown', down, true);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      sendCursor(null);
    };
  }, [on, gl, camera, cx, cz, reach]);
  return null;
}

function Mark({ id }: { id: string }) {
  const seat = useGame((s) => s.room?.seats.find((p) => p.playerId === id));
  const group = useRef<Group>(null);
  const label = useRef<HTMLDivElement>(null);
  const placed = useRef(false);
  // Glides toward the latest position and fades on its own, without re-rendering anything.
  useFrame((_, dt) => {
    const c = useCursors.getState().cursors[id];
    const g = group.current;
    if (!c || !g) return;
    if (!placed.current) {
      g.position.set(c.x, CURSOR_HEIGHT - 0.08, c.y);
      placed.current = true;
    } else {
      const k = 1 - Math.exp(-dt * 18);
      g.position.x += (c.x - g.position.x) * k;
      g.position.z += (c.y - g.position.z) * k;
    }
    if (label.current) label.current.style.opacity = Date.now() - c.at < CURSOR_SHOW_MS ? '1' : '0';
  });
  if (!seat) return null;
  const col = PLAYER_COLORS[seat.color];
  return (
    <group ref={group}>
      <Html zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div ref={label} style={{ opacity: 0, transition: 'opacity 400ms', pointerEvents: 'none', userSelect: 'none', whiteSpace: 'nowrap' }}>
          <svg width="20" height="30" viewBox="0 0 20 30" style={{ display: 'block', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.4))' }}>
            <path d="M1 1 L1 25 L7.5 19.5 L12 30 L16.5 28 L12 18 L20 18 Z" fill={col.hex} stroke="#131a1d" strokeWidth="2" strokeLinejoin="round" />
          </svg>
          <span
            // A paper name tag like the player cards: ink line, tight corners, a hard shadow and the colour stripe.
            style={{ position: 'absolute', left: 16, top: 24, padding: '1px 7px 1px 10px', borderRadius: 4, border: '2px solid #131a1d', background: '#fbfcfc', boxShadow: `inset 4px 0 0 ${col.hex}, 0 2px 0 #131a1d`, color: '#131a1d', font: '800 12px/1.3 var(--font-sans)' }}
          >
            {seat.name.slice(0, 14)}
          </span>
        </div>
      </Html>
    </group>
  );
}

/** A click by another player: a ring in their colour on the board that grows and fades (a still dot with reduced motion). */
function Ripple({ id, x, y }: { id: string; x: number; y: number }) {
  const seat = useGame((s) => s.room?.seats.find((p) => p.playerId === id));
  const [still] = useState(motionReduced);
  if (!seat) return null;
  const col = PLAYER_COLORS[seat.color].hex;
  const size = still ? 14 : 56;
  return (
    <group position={[x, CURSOR_HEIGHT, y]}>
      <Html zIndexRange={[19, 0]} style={{ pointerEvents: 'none' }}>
        <div
          className={still ? undefined : 'cursor-ripple-3d'}
          style={{
            animationDuration: `${RIPPLE_MS}ms`,
            width: size,
            height: size,
            borderRadius: '50%',
            boxSizing: 'border-box',
            border: still ? '2px solid #131a1d' : `4px solid ${col}`,
            background: still ? col : 'transparent',
            boxShadow: still ? 'none' : '0 0 0 2px #131a1d, inset 0 0 0 2px #131a1d',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />
      </Html>
    </group>
  );
}

/** Other players' mouse pointers on the board (put inside the island's group: positions are board units). */
export function CursorLayer3D() {
  const on = useSeeCursorsOn();
  const ids = useCursors((s) => Object.keys(s.cursors).join('|'));
  const ripples = useCursors((s) => s.ripples);
  if (!on || (!ids && !ripples.length)) return null;
  return (
    <>
      {ripples.map((r) => (
        <Ripple key={r.id} id={r.playerId} x={r.x} y={r.y} />
      ))}
      {ids && ids.split('|').map((id) => (
        <Mark key={id} id={id} />
      ))}
    </>
  );
}
