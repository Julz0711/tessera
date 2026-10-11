'use client';

import { useEffect, useState } from 'react';
import { api } from './store';
import { useCursors } from './cursorStore';
import { usePrefs } from './prefs';
import type { BoardPoint } from '@/shared/cursors';

/** A mouse on a wide screen: touch devices and phones never share or show pointers. */
const MOUSE_QUERY = '(hover: hover) and (pointer: fine) and (min-width: 1024px)';

export function useMouseScreen(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(MOUSE_QUERY);
    const update = () => setOk(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return ok;
}

/** Whether my pointer is sent to the others right now: switched on, on a screen with a mouse. */
export function useShareCursorOn(): boolean {
  const pref = usePrefs((s) => s.shareCursor);
  const mouse = useMouseScreen();
  const on = pref && mouse;
  useEffect(() => {
    if (!on) sendCursor(null);
  }, [on]);
  return on;
}

/** Whether the others' pointers are drawn right now: not switched off, on a screen with a mouse. */
export function useSeeCursorsOn(): boolean {
  const pref = usePrefs((s) => s.seeCursors);
  const mouse = useMouseScreen();
  const on = pref && mouse;
  useEffect(() => {
    if (!on) useCursors.getState().clear();
  }, [on]);
  return on;
}

/** The Animations preference, falling back to the system setting. */
export function motionReduced(): boolean {
  if (typeof document === 'undefined') return false;
  const m = document.documentElement.dataset.motion;
  if (m === 'reduced') return true;
  if (m === 'full') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const MIN_GAP_MS = 90;
const MIN_MOVE = 0.03;
let lastAt = 0;
let lastSent: BoardPoint | null = null;
let pending: BoardPoint | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

function flush(p: BoardPoint | null, click = false) {
  lastAt = Date.now();
  lastSent = p;
  api.cursor(p, click);
}

/** Sends a click at the pointer's spot right away (the server caps pings at a few a second). */
export function sendCursorClick(p: BoardPoint): void {
  if (timer) clearTimeout(timer);
  timer = undefined;
  pending = null;
  flush(p, true);
}

/** Sends the viewer's pointer (board units; `null`: it left the board), about ten times a second and only when it moved. */
export function sendCursor(p: BoardPoint | null): void {
  if (timer) clearTimeout(timer);
  timer = undefined;
  pending = null;
  if (!p) {
    if (lastSent) flush(null);
    return;
  }
  if (lastSent && Math.hypot(p.x - lastSent.x, p.y - lastSent.y) < MIN_MOVE) return;
  const wait = lastAt + MIN_GAP_MS - Date.now();
  if (wait <= 0) return flush(p);
  // Too soon: the latest position goes out when the gap is over, so the pointer never stops short.
  pending = p;
  timer = setTimeout(() => {
    timer = undefined;
    if (pending) flush(pending);
    pending = null;
  }, wait);
}
