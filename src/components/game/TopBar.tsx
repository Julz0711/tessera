'use client';

import { Box, Clock, Copy, Grid2x2, LogOut, Menu, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { statusLine } from '@/client/describe';
import { usePrefs } from '@/client/prefs';
import { setVolume } from '@/client/sound';
import { api, toast, useGame } from '@/client/store';
import type { PlayerView } from '@/engine/view';
import type { RoomDTO } from '@/shared/protocol';
import { formatCode } from '@/components/room/Lobby';
import { LeaveDialog } from './LeaveDialog';
import { ReactionPicker } from './Reactions';

function useCountdown(deadline: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [deadline]);
  return deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;
}

export function TopBar({ view, room }: { view: PlayerView; room: RoomDTO }) {
  const router = useRouter();
  const conn = useGame((s) => s.conn);
  const prefs = usePrefs();
  const [menu, setMenu] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const status = statusLine(view);
  const seconds = useCountdown(room.deadline);

  useEffect(() => setVolume(prefs.volume), [prefs.volume]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/r/${room.code}`);
      toast('Invite link copied', 'good');
    } catch {
      toast(`${window.location.origin}/r/${room.code}`);
    }
  };
  const leave = async () => {
    await api.leaveRoom();
    router.push('/');
  };
  // Walking away from a running game asks first; watching, or a finished game, just leaves.
  const askLeave = () => {
    setMenu(false);
    if (view.phase !== 'ended' && room.you.seat !== null) setConfirmLeave(true);
    else void leave();
  };

  return (
    <div className="pointer-events-none flex items-start justify-between gap-2 p-2 sm:p-3">
      <div className="pointer-events-auto flex items-center gap-2">
        <div className="relative">
          <button type="button" className="btn btn-dark h-10 w-10 p-0" onClick={() => setMenu((m) => !m)} aria-label="Menu" aria-expanded={menu}>
            <Menu size={18} />
          </button>
          {menu && (
            <div className="paper animate-pop absolute left-0 top-12 z-40 grid w-64 gap-3 p-3">
              <div className="grid gap-1.5">
                <span className="label">Board</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button type="button" className={`btn py-1.5 text-sm ${prefs.view === '3d' ? 'btn-primary' : ''}`} onClick={() => prefs.set({ view: '3d' })}>
                    <Box size={15} /> 3D
                  </button>
                  <button type="button" className={`btn py-1.5 text-sm ${prefs.view === '2d' ? 'btn-primary' : ''}`} onClick={() => prefs.set({ view: '2d' })}>
                    <Grid2x2 size={15} /> 2D
                  </button>
                </div>
              </div>
              {prefs.view === '3d' && (
                <div className="grid gap-1.5">
                  <span className="label">3D quality</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['high', 'low'] as const).map((q) => (
                      <button key={q} type="button" className={`btn py-1 text-sm capitalize ${prefs.graphics === q ? 'btn-primary' : ''}`} onClick={() => prefs.set({ graphics: q })}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid gap-1.5">
                <span className="label">Board size</span>
                <div className="grid grid-cols-3 gap-1.5" title="Size of the pieces, number tokens and harbors">
                  {(['small', 'medium', 'large'] as const).map((sz) => (
                    <button key={sz} type="button" className={`btn px-1 py-1 text-sm ${prefs.boardScale === sz ? 'btn-primary' : ''}`} onClick={() => prefs.set({ boardScale: sz })}>
                      {sz === 'small' ? 'S' : sz === 'medium' ? 'M' : 'L'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-1.5">
                <span className="label">Build hints</span>
                <div className="grid grid-cols-2 gap-1.5" title="Hovering a spot you can afford to build on previews the piece; click it to build">
                  {([true, false] as const).map((on) => (
                    <button key={String(on)} type="button" className={`btn py-1 text-sm ${prefs.buildHints === on ? 'btn-primary' : ''}`} onClick={() => prefs.set({ buildHints: on })}>
                      {on ? 'On' : 'Off'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-1.5">
                <span className="label">Confirm builds</span>
                <div className="grid grid-cols-2 gap-1.5" title="Placing a piece asks first: pick it in the popup, or click the spot again">
                  {([true, false] as const).map((on) => (
                    <button key={String(on)} type="button" className={`btn py-1 text-sm ${prefs.confirmBuilds === on ? 'btn-primary' : ''}`} onClick={() => prefs.set({ confirmBuilds: on })}>
                      {on ? 'On' : 'Off'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-1.5">
                <span className="label">Sound</span>
                <div className="flex items-center gap-2">
                  <button type="button" className="btn btn-ghost h-8 w-8 p-0" onClick={() => prefs.set({ volume: prefs.volume > 0 ? 0 : 0.6 })} aria-label="Toggle sound">
                    {prefs.volume > 0 ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  </button>
                  <input type="range" min={0} max={1} step={0.05} value={prefs.volume} onChange={(e) => prefs.set({ volume: Number(e.target.value) })} className="flex-1 accent-ink" aria-label="Volume" />
                </div>
              </div>
              <button type="button" className="btn py-1.5 text-sm" onClick={copy}>
                <Copy size={15} /> Copy invite link
              </button>
              <button type="button" className="btn btn-danger py-1.5 text-sm" onClick={askLeave}>
                <LogOut size={15} /> Leave game
              </button>
            </div>
          )}
          {confirmLeave && <LeaveDialog view={view} room={room} onStay={() => setConfirmLeave(false)} onLeave={leave} />}
        </div>
        <button type="button" onClick={copy} className="glass hidden items-center gap-2 px-3 py-2 sm:flex" title="Copy invite link">
          <span className="font-mono text-sm font-black tracking-[0.18em] text-paper">{formatCode(room.code)}</span>
        </button>
        <span className={`glass flex h-10 items-center px-2.5 ${conn === 'online' ? 'text-moss' : 'text-terracotta'}`} title={conn}>
          {conn === 'online' ? <Wifi size={16} /> : <WifiOff size={16} className="animate-pulse" />}
        </span>
      </div>

      <div
        className={`pointer-events-auto max-w-[min(560px,55vw)] rounded-xl border-2 px-3 py-2 text-center text-sm font-extrabold shadow-[0_3px_0_0_#000] sm:px-4 sm:text-base ${
          status.mine ? 'animate-pulse-ring border-ink bg-amber text-ink' : 'border-black bg-sea-900/90 text-paper'
        }`}
        aria-live="polite"
      >
        {status.text}
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        {room.you.seat !== null && <ReactionPicker />}
        {seconds !== null && (
          <span className={`glass flex h-10 items-center gap-1.5 px-3 font-black tabular ${seconds <= 10 ? 'text-terracotta' : 'text-paper'}`} title="Time left">
            <Clock size={16} /> {seconds}s
          </span>
        )}
        <button
          type="button"
          className="btn btn-dark h-10 px-3 text-sm"
          onClick={() => prefs.set({ view: prefs.view === '3d' ? '2d' : '3d' })}
          title="Switch between 3D and 2D board"
        >
          {prefs.view === '3d' ? <Grid2x2 size={16} /> : <Box size={16} />}
          <span className="hidden sm:inline">{prefs.view === '3d' ? '2D' : '3D'}</span>
        </button>
      </div>
    </div>
  );
}
