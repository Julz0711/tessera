'use client';

import { Home, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { usePrefs } from '@/client/prefs';
import { api, useGame } from '@/client/store';
import { ERR_NEEDS_PROFILE } from '@/shared/protocol';
import { GameScreen } from '@/components/game/GameScreen';
import { JoinCard } from './JoinCard';
import { Lobby } from './Lobby';

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-dvh place-items-center px-4">{children}</div>;
}

export function RoomScreen({ code: rawCode }: { code: string }) {
  const code = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const prefsLoad = usePrefs((s) => s.load);
  const room = useGame((s) => s.room);
  const notice = useGame((s) => s.notice);
  const conn = useGame((s) => s.conn);
  const [state, setState] = useState<'joining' | 'profile' | 'in' | 'error'>('joining');
  const [error, setError] = useState<string | null>(null);

  const attempt = useCallback(async () => {
    setState('joining');
    setError(null);
    const r = await api.joinRoom(code);
    if (r.ok) setState('in');
    else if (r.error === ERR_NEEDS_PROFILE) setState('profile');
    else {
      setError(r.error);
      setState('error');
    }
  }, [code]);

  useEffect(() => {
    prefsLoad();
    if (useGame.getState().room?.code !== code) useGame.setState({ room: null, view: null, chat: [], notice: null });
    void attempt();
  }, [attempt, code, prefsLoad]);

  if (notice) {
    return (
      <Centered>
        <div className="paper max-w-md p-6 text-center">
          <h1 className="display text-3xl font-black">Left the room</h1>
          <p className="mt-2 text-ink-soft">{notice}</p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href="/" className="btn px-4 py-2">
              <Home size={16} /> Home
            </Link>
            <button type="button" className="btn btn-primary px-4 py-2" onClick={() => void attempt()}>
              <RefreshCw size={16} /> Rejoin
            </button>
          </div>
        </div>
      </Centered>
    );
  }

  if (state === 'error') {
    return (
      <Centered>
        <div className="paper max-w-md p-6 text-center">
          <h1 className="display text-3xl font-black">Hmm.</h1>
          <p className="mt-2 text-ink-soft">{error}</p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href="/" className="btn px-4 py-2">
              <Home size={16} /> Home
            </Link>
            <button type="button" className="btn btn-primary px-4 py-2" onClick={() => void attempt()}>
              <RefreshCw size={16} /> Try again
            </button>
          </div>
        </div>
      </Centered>
    );
  }

  if (state === 'profile') return <JoinCard code={code} onJoined={() => setState('in')} />;

  if (state === 'joining' || !room) {
    return (
      <Centered>
        <div className="flex items-center gap-3 text-foam/70">
          <Loader2 className="animate-spin" />
          <span className="font-bold">{conn === 'reconnecting' ? 'Reconnecting…' : 'Joining the table…'}</span>
        </div>
      </Centered>
    );
  }

  return room.status === 'lobby' ? <Lobby room={room} /> : <GameScreen />;
}
