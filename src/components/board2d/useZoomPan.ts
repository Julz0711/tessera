'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';

// Deliberately NOT using Element.setPointerCapture(): once a pointer is captured, Chromium
// retargets the eventual `click` to the capturing element (the <svg>) instead of the hex/vertex/
// edge <g> the user actually pressed, so it never reaches that element's onClick — silently
// breaking every placement click. Tracking the drag via window-level listeners instead gets the
// same "keep receiving move/up even if the pointer leaves the board" behaviour without that trap.

export type ZoomBounds = { minX: number; minY: number; w: number; h: number };

const MIN_ZOOM = 1;
const MAX_ZOOM = 3.5;
/** Screen px of movement before a drag stops counting as a click on release. */
const DRAG_THRESHOLD = 5;
const WHEEL_SENSITIVITY = 0.0018;
const BUTTON_STEP = 1.4;
/** How far past each edge of the board the view may be dragged, as a share of the board's size, so it
 * can also be panned when fully zoomed out (e.g. out from under the side panels). */
const PAN_SLACK = 0.35;
/** After the last wheel step, how long before the zoom is drawn afresh at its new scale. */
const WHEEL_SETTLE_MS = 120;

type Point = { x: number; y: number };
type ViewState = { zoom: number; center: Point };

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Clamps a candidate zoom/center so the visible window strays at most PAN_SLACK past the board's bounds rect. */
function clampView(zoom: number, cx: number, cy: number, bounds: ZoomBounds): ViewState {
  const z = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  const vw = bounds.w / z;
  const vh = bounds.h / z;
  const sx = bounds.w * PAN_SLACK;
  const sy = bounds.h * PAN_SLACK;
  return {
    zoom: z,
    center: {
      x: clamp(cx, bounds.minX + vw / 2 - sx, bounds.minX + bounds.w - vw / 2 + sx),
      y: clamp(cy, bounds.minY + vh / 2 - sy, bounds.minY + bounds.h - vh / 2 + sy),
    },
  };
}

/** Maps a client (screen) point to SVG user-space using the element's current screen CTM. */
function toSvgPoint(ctm: DOMMatrix, clientX: number, clientY: number): Point {
  return new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
}

type PanGesture = {
  kind: 'pan';
  ctm: DOMMatrix;
  startClient: Point;
  startSvg: Point;
  startCenter: Point;
  zoom: number;
  moved: number;
};
type PinchGesture = { kind: 'pinch'; lastDist: number; moved: number };

/**
 * Zoom (wheel + touch pinch) and drag-to-pan for the interactive 2D board.
 *
 * The current view is mirrored into a ref (`viewRef`) alongside React state so that rapid
 * wheel/pointermove events — which can fire faster than React re-renders — always read the
 * latest committed value instead of a stale closure. `enabled` gates all of it off for
 * non-interactive boards (landing/lobby previews), which keep the original static fit.
 */
export function useZoomPan(bounds: ZoomBounds, enabled: boolean) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const initial = (): ViewState => ({ zoom: MIN_ZOOM, center: { x: bounds.minX + bounds.w / 2, y: bounds.minY + bounds.h / 2 } });
  const [viewState, setViewStateRaw] = useState<ViewState>(initial);
  const viewRef = useRef(viewState);
  /** The view the board is drawn at (its viewBox), and its screen px per board unit (read once per gesture). */
  const drawn = useRef<{ view: ViewState; unit: number | null }>({ view: viewState, unit: null });
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  function commit(next: ViewState) {
    viewRef.current = next;
    setViewStateRaw(next);
  }

  /**
   * Mid-gesture (drag, pinch, wheel): moves the picture already drawn with a CSS transform instead of
   * redrawing the board at a new viewBox for every pointer event. The browser only shifts and scales
   * a finished image, so panning stays smooth however much of the screen the board covers; `commit`
   * redraws it properly once the gesture ends.
   */
  function preview(next: ViewState) {
    viewRef.current = next;
    const svg = svgRef.current;
    if (!svg) return commit(next);
    const d = drawn.current;
    if (d.unit === null) {
      const ctm = svg.getScreenCTM();
      if (!ctm) return commit(next);
      d.unit = ctm.a;
      svg.style.willChange = 'transform';
      svg.style.transformOrigin = '50% 50%';
    }
    const k = next.zoom / d.view.zoom;
    const tx = (d.view.center.x - next.center.x) * d.unit * k;
    const ty = (d.view.center.y - next.center.y) * d.unit * k;
    svg.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
  }

  /** Ends a gesture: draws the board at the view it was previewing. */
  function settleView() {
    if (settle.current) clearTimeout(settle.current);
    settle.current = null;
    if (drawn.current.unit !== null) commit({ ...viewRef.current });
  }

  // Once the board is drawn at the new viewBox, drop the preview transform in the same frame.
  useLayoutEffect(() => {
    drawn.current = { view: viewState, unit: null };
    const svg = svgRef.current;
    if (svg) {
      svg.style.transform = '';
      svg.style.willChange = '';
    }
  }, [viewState]);
  useEffect(() => () => {
    if (settle.current) clearTimeout(settle.current);
  }, []);

  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<PanGesture | PinchGesture | null>(null);
  const suppressClick = useRef(false);

  // Wheel zoom, centred on the cursor. Attached as a native listener (not React's onWheel) so
  // preventDefault actually stops page scroll/zoom — React registers wheel as passive by default.
  useEffect(() => {
    if (!enabled) return;
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const anchor = toSvgPoint(ctm, e.clientX, e.clientY);
      const prev = viewRef.current;
      const factor = Math.exp(-e.deltaY * WHEEL_SENSITIVITY);
      const newZoom = clamp(prev.zoom * factor, MIN_ZOOM, MAX_ZOOM);
      const ratio = prev.zoom / newZoom;
      preview(clampView(newZoom, anchor.x + (prev.center.x - anchor.x) * ratio, anchor.y + (prev.center.y - anchor.y) * ratio, bounds));
      if (settle.current) clearTimeout(settle.current);
      settle.current = setTimeout(settleView, WHEEL_SETTLE_MS);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [enabled, bounds]);

  function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (!enabled) return;
    // Left or middle button; the middle one pans without the browser's autoscroll.
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return;
    if (e.button === 1) e.preventDefault();
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      suppressClick.current = false;
      gesture.current = {
        kind: 'pan',
        ctm,
        startClient: { x: e.clientX, y: e.clientY },
        startSvg: toSvgPoint(ctm, e.clientX, e.clientY),
        startCenter: viewRef.current.center,
        zoom: viewRef.current.zoom,
        moved: 0,
      };
    } else if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      gesture.current = { kind: 'pinch', lastDist: Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)), moved: 0 };
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (!enabled || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'pan') {
      const moved = Math.hypot(e.clientX - g.startClient.x, e.clientY - g.startClient.y);
      g.moved = Math.max(g.moved, moved);
      if (g.moved > DRAG_THRESHOLD) suppressClick.current = true;
      const p = toSvgPoint(g.ctm, e.clientX, e.clientY);
      preview(clampView(g.zoom, g.startCenter.x - (p.x - g.startSvg.x), g.startCenter.y - (p.y - g.startSvg.y), bounds));
    } else if (g.kind === 'pinch' && pointers.current.size >= 2) {
      const svg = svgRef.current;
      const ctm = svg?.getScreenCTM();
      if (!ctm) return;
      const pts = [...pointers.current.values()];
      const dist = Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y));
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      g.moved = Math.max(g.moved, Math.abs(dist - g.lastDist));
      if (g.moved > DRAG_THRESHOLD) suppressClick.current = true;
      const anchor = toSvgPoint(ctm, midX, midY);
      const prev = viewRef.current;
      const newZoom = clamp(prev.zoom * (dist / g.lastDist), MIN_ZOOM, MAX_ZOOM);
      const ratio = prev.zoom / newZoom;
      preview(clampView(newZoom, anchor.x + (prev.center.x - anchor.x) * ratio, anchor.y + (prev.center.y - anchor.y) * ratio, bounds));
      g.lastDist = dist;
    }
  }

  function endPointer(e: PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      gesture.current = null;
      settleView();
      return;
    }
    // Dropped from two pointers to one (pinch → pan): resume panning from the remaining finger.
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    const remaining = [...pointers.current.values()][0];
    if (!ctm || !remaining) {
      gesture.current = null;
      return;
    }
    gesture.current = {
      kind: 'pan',
      ctm,
      startClient: { x: remaining.x, y: remaining.y },
      startSvg: toSvgPoint(ctm, remaining.x, remaining.y),
      startCenter: viewRef.current.center,
      zoom: viewRef.current.zoom,
      moved: 0,
    };
  }

  // Track the rest of the gesture on window (not the svg) so it keeps working if the pointer
  // strays outside the board while dragging — without the retargeting that setPointerCapture causes.
  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endPointer);
    window.addEventListener('pointercancel', endPointer);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endPointer);
      window.removeEventListener('pointercancel', endPointer);
    };
  }, [enabled, bounds]);

  function onClickCapture(e: ReactMouseEvent) {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.stopPropagation();
      e.preventDefault();
    }
  }

  function zoomBy(factor: number) {
    const prev = viewRef.current;
    commit(clampView(prev.zoom * factor, prev.center.x, prev.center.y, bounds));
  }

  const vw = bounds.w / viewState.zoom;
  const vh = bounds.h / viewState.zoom;

  return {
    svgRef,
    viewBox: `${viewState.center.x - vw / 2} ${viewState.center.y - vh / 2} ${vw} ${vh}`,
    zoom: viewState.zoom,
    /** Fully zoomed out and centred: nothing for the reset button to undo. */
    atHome:
      viewState.zoom <= MIN_ZOOM + 1e-6 &&
      Math.abs(viewState.center.x - (bounds.minX + bounds.w / 2)) < 1 &&
      Math.abs(viewState.center.y - (bounds.minY + bounds.h / 2)) < 1,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    zoomIn: () => zoomBy(BUTTON_STEP),
    zoomOut: () => zoomBy(1 / BUTTON_STEP),
    reset: () => commit(initial()),
    svgHandlers: enabled
      ? {
          onPointerDown,
          onClickCapture,
          style: { touchAction: 'none' as const },
        }
      : {},
  };
}
