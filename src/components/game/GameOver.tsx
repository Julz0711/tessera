'use client';

import { Home, RotateCcw, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { buildReport, type GameReport } from '@/engine/report';
import { GameReportView } from './GameReportView';
import type { PlayerView } from '@/engine/view';
import { api } from '@/client/store';
import type { RoomDTO } from '@/shared/protocol';
import { PLAYER_COLORS } from '@/shared/colors';
import { AwardBadges } from './endgame/AwardBadges';
import { PlayerBadge, Podium } from './endgame/Podium';
import { PointIcons } from './endgame/PointIcons';
import { Modal } from '@/components/ui/Modal';


function Confetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        dur: 2.4 + Math.random() * 1.8,
        color: ['#f2b33d', '#d9483b', '#3a74d8', '#3f9b4f', '#f6eddb', '#8b5bc9'][i % 6],
        rot: Math.random() * 360,
      })),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-[55] overflow-hidden" aria-hidden>
      {bits.map((b, i) => (
        <span
          key={i}
          className="absolute top-[-20px] h-3 w-2 rounded-sm"
          style={{ left: `${b.left}%`, background: b.color, transform: `rotate(${b.rot}deg)`, animation: `confetti ${b.dur}s ${b.delay}s cubic-bezier(.2,.6,.4,1) forwards` }}
        />
      ))}
      <style>{`@keyframes confetti { to { transform: translateY(110vh) rotate(720deg); opacity: .9 } }`}</style>
    </div>
  );
}

export function GameOver({ view, room, onClose }: { view: PlayerView; room: RoomDTO; onClose: () => void }) {
  const router = useRouter();
  const [tab, setTab] = useState<'standings' | 'stats'>('standings');
  const localReport = useMemo(() => buildReport(view), [view]);
  const [savedReport, setSavedReport] = useState<GameReport | null>(null);
  useEffect(() => {
    if (!room.gameId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let tries = 0;
    async function read() {
      try {
        const response = await fetch(`/api/games/${room.gameId}/report`, { signal: controller.signal });
        if (response.ok) { const body = await response.json(); if (!controller.signal.aborted) setSavedReport(body); return; }
      } catch { /* Completion is queued; a short retry gives persistence time to finish. */ }
      if (!controller.signal.aborted && ++tries < 5) timer = setTimeout(read, 1500);
    }
    void read();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [room.gameId]);
  const report = savedReport ?? localReport;
  const order = view.players.map((_, i) => i).sort((a, b) => report.players[a].rank - report.players[b].rank);
  const winner = view.winner;
  const iWon = winner !== null && winner === view.viewer;
  return (
    <>
      {iWon && <Confetti />}
      <Modal open onClose={onClose} title={winner !== null ? (iWon ? 'Victory!' : `${view.players[winner].name} wins`) : 'Game over'} wide expansive={tab === 'stats'} top>
        <div className="mb-3 flex gap-1.5">
          {(['standings', 'stats'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={`flex-1 rounded-lg border-2 px-3 py-1.5 text-sm font-bold transition ${
                tab === t ? 'border-ink bg-ink text-paper' : 'border-ink/20 bg-white/40 hover:border-ink/60'
              }`}
            >
              {t === 'standings' ? 'Standings' : 'Explore stats'}
            </button>
          ))}
        </div>
        {tab === 'standings' ? (
          <>
            <Podium order={order} view={view} room={room} report={report} />
            <AwardBadges report={report} />
            {order.length > 3 && (
              <ol className="mt-4 grid gap-1.5">
                {order.slice(3).map((seat) => {
                  const p = view.players[seat];
                  return (
                    <li key={seat} className="paper-flat flex items-center gap-2 p-1.5" style={{ boxShadow: `inset 5px 0 0 ${PLAYER_COLORS[p.color].hex}` }}>
                      <span className="display w-5 text-center text-lg font-black text-ink-faint">{report.players[seat].rank}</span>
                      <PlayerBadge seat={seat} view={view} room={room} size={34} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-extrabold">{p.name}{seat === view.viewer && <span className="ml-1 text-xs font-bold text-ink-soft">(you)</span>}</div>
                        <PointIcons points={report.players[seat].points} color={p.color} />
                      </div>
                      <div className="text-right"><span className="display text-2xl font-black tabular">{p.vp}</span>{report.players[seat].rating?.delta != null && <p className="text-[11px] font-bold">{report.players[seat].rating!.delta! > 0 ? '+' : ''}{report.players[seat].rating!.delta} Elo</p>}</div>
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        ) : (
          <GameReportView report={report} initialSeat={view.viewer} />
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn px-4 py-2"
            onClick={async () => {
              await api.leaveRoom();
              router.push('/');
            }}
          >
            <Home size={16} /> Home
          </button>
          {room.you.isHost ? (
            <>
              <button type="button" className="btn px-4 py-2" onClick={() => api.backToLobby()} title="Change settings or players, then start again">
                <Users size={16} /> Back to lobby
              </button>
              <button type="button" className="btn btn-primary px-5 py-2" onClick={() => api.rematch()} title="Same players and settings, new board">
                <RotateCcw size={16} /> Rematch
              </button>
            </>
          ) : (
            <span className="self-center text-sm font-bold text-ink-soft">Waiting for the host: rematch or back to the lobby.</span>
          )}
        </div>
      </Modal>
    </>
  );
}
