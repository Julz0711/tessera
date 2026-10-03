'use client';

import { RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { GameReport } from '@/engine/report';
import type { PlayerView } from '@/engine/view';
import { api } from '@/client/store';
import { useGameDialog } from '@/client/ui';
import { Modal } from '@/components/ui/Modal';
import { GameReportView } from './GameReportView';

/** How often, at most, the open stats ask the server for a fresh report while the game moves. */
const REFRESH_MS = 2000;

/**
 * The match report while the game is running (Menu → Live stats, or the dice tab): the same views
 * as the end-of-game stats, with only public information in them. It refreshes as the game moves.
 */
export function LiveStatsDialog({ view }: { view: PlayerView }) {
  const open = useGameDialog((s) => s.open === 'stats');
  const hide = useGameDialog((s) => s.hide);
  const [report, setReport] = useState<GameReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const last = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = async () => {
    last.current = Date.now();
    setLoading(true);
    const r = await api.stats();
    if (!mounted.current) return;
    setLoading(false);
    if (r.ok) {
      setReport(r.report);
      setError(null);
    } else setError(r.error);
  };

  // Every change to the game asks again, but no more often than REFRESH_MS.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(load, Math.max(0, last.current + REFRESH_MS - Date.now()));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, view.seq]);

  if (!open) return null;
  return (
    <Modal open onClose={hide} title="Live stats" wide expansive top>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft">
        <span>Updates as the game goes on. Only public information: cards in hand and unplayed cards stay hidden.</span>
        <button type="button" className="btn px-2.5 py-1 text-xs" onClick={() => void load()} disabled={loading} aria-label="Refresh the stats">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>
      {report ? (
        <GameReportView report={report} initialSeat={view.viewer} />
      ) : error ? (
        <p role="alert" className="text-sm font-bold text-danger">
          {error}
        </p>
      ) : (
        <p role="status" className="text-sm text-ink-faint">
          Loading the stats…
        </p>
      )}
    </Modal>
  );
}
