'use client';

import { Box, Copy, Grid2x2, LogOut, Menu, Settings, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { statusLine } from '@/client/describe';
import { usePrefs } from '@/client/prefs';
import { useSettingsUI } from '@/client/settingsUI';
import { setVolume, setSfxVolumes } from '@/client/sound';
import { api, toast, useGame } from '@/client/store';
import type { PlayerView } from '@/engine/view';
import type { RoomDTO } from '@/shared/protocol';
import { formatCode } from '@/components/room/Lobby';
import { DiceBox } from './DiceBox';
import { LeaveDialog } from './LeaveDialog';
import { MobileSide } from './MobileSide';
import { ReactionPicker } from './Reactions';

export function TopBar({ view, room }: { view: PlayerView; room: RoomDTO }) {
  const router = useRouter();
  const conn = useGame((s) => s.conn);
  const prefs = usePrefs();
  const [menu, setMenu] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const status = statusLine(view);

  useEffect(() => setVolume(prefs.volume), [prefs.volume]);
  useEffect(() => setSfxVolumes(prefs.sfxVolume), [prefs.sfxVolume]);

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
    <div className="game-toolbar pointer-events-none flex items-start justify-between gap-2 p-2 sm:p-3">
      <div className="pointer-events-auto flex items-center gap-2">
        <div className="relative">
          <button type="button" className="btn btn-dark h-10 w-10 p-0" onClick={() => setMenu((m) => !m)} aria-label="Menu" aria-expanded={menu}>
            <Menu size={18} />
          </button>
          {menu && (
            <div className="paper animate-pop absolute left-0 top-12 z-40 grid w-56 gap-1.5 p-3">
              <button type="button" className="btn py-1.5 text-sm lg:hidden" onClick={() => { setMenu(false); useSettingsUI.getState().show(); }}>
                <Settings size={15} /> Settings
              </button>
              <button type="button" className="btn py-1.5 text-sm lg:hidden" onClick={() => { setMenu(false); prefs.set({ view: prefs.view === '3d' ? '2d' : '3d' }); }}>
                {prefs.view === '3d' ? <Grid2x2 size={15} /> : <Box size={15} />} {prefs.view === '3d' ? '2D board' : '3D board'}
              </button>
              <button type="button" className="btn py-1.5 text-sm" onClick={() => prefs.set({ volume: prefs.volume > 0 ? 0 : 0.6 })}>
                {prefs.volume > 0 ? <Volume2 size={15} /> : <VolumeX size={15} />} {prefs.volume > 0 ? 'Mute' : 'Unmute'}
              </button>
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
        <button type="button" className="btn btn-dark h-10 w-10 p-0 max-lg:hidden" onClick={() => useSettingsUI.getState().show()} aria-label="Settings" title="Settings">
          <Settings size={18} />
        </button>
        <button type="button" onClick={copy} className="game-code glass hidden items-center gap-2 px-3 py-2 lg:flex" title="Copy invite link">
          <span className="font-mono text-sm font-black tracking-[0.18em] text-paper">{formatCode(room.code)}</span>
        </button>
        <span className={`game-connection glass flex h-10 items-center px-2.5 ${conn === 'online' ? 'text-moss max-lg:hidden' : 'text-terracotta'}`} title={conn} role="status" aria-label={conn === 'online' ? 'Connected' : 'Reconnecting to your table'}>
          {conn === 'online' ? <Wifi size={16} /> : <WifiOff size={16} className="animate-pulse" />}
        </span>
        <div className="flex items-center gap-1.5 lg:hidden">{room.you.seat !== null && <MobileSide view={view} />}</div>
      </div>

      <div
        className={`game-status pointer-events-auto max-w-[min(560px,55vw)] rounded-xl border-2 px-3 py-2 text-center text-sm font-extrabold shadow-[0_3px_0_0_#000] sm:px-4 sm:text-base ${
          status.mine ? 'attention border-ink bg-amber text-ink' : 'border-black bg-sea-900/90 text-paper'
        }`}
        aria-live="polite"
      >
        {status.text}
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        {room.you.seat !== null && <ReactionPicker />}
        <div className="lg:hidden">
          <DiceBox view={view} size={28} compact />
        </div>
        <button
          type="button"
          className="btn btn-dark h-10 px-3 text-sm max-lg:hidden"
          onClick={() => prefs.set({ view: prefs.view === '3d' ? '2d' : '3d' })}
          title="Switch between 3D and 2D board"
          aria-label={`Switch to ${prefs.view === '3d' ? '2D' : '3D'} board`}
        >
          {prefs.view === '3d' ? <Grid2x2 size={16} /> : <Box size={16} />}
          <span className="hidden sm:inline">{prefs.view === '3d' ? '2D' : '3D'}</span>
        </button>
      </div>
    </div>
  );
}
