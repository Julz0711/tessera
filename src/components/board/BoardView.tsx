'use client';

import dynamic from 'next/dynamic';
import { Component, type ReactNode } from 'react';
import type { BoardProps } from './types';

function BoardLoading() {
  return (
    <div className="grid h-full w-full place-items-center">
      <div className="label-light animate-pulse">Raising the island…</div>
    </div>
  );
}

const Board3D = dynamic(() => import('@/components/board3d/Board3D'), { ssr: false, loading: BoardLoading });
const Board2D = dynamic(() => import('@/components/board2d/Board2D'), { ssr: false, loading: BoardLoading });

let webglSupport: boolean | null = null;

/** Probes WebGL once per page and releases the probe context (browsers cap live contexts at ~16). */
function webglAvailable(): boolean {
  if (typeof window === 'undefined') return true;
  if (webglSupport !== null) return webglSupport;
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    webglSupport = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

/** If the 3D renderer throws (no WebGL, driver issue…), fall back to the 2D board. */
class Fallback3D extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn('3D board failed, using 2D', err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function BoardView({ mode, ...props }: BoardProps & { mode: '2d' | '3d' }) {
  const use3d = mode === '3d' && webglAvailable();
  if (!use3d) return <Board2D {...props} />;
  return (
    <Fallback3D fallback={<Board2D {...props} />}>
      <Board3D {...props} />
    </Fallback3D>
  );
}
