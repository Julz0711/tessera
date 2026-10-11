'use client';

import { useEffect, useState } from 'react';
import type { AnalysisStatus } from '@/bots/analysis/types';
import type { GameReport } from '@/engine/report';
import { PLAYER_COLORS } from '@/shared/colors';
import { HexSpinner } from '@/components/ui/HexSpinner';

/** How long the end screen keeps asking while the analysis runs (it usually takes well under a minute). */
const POLL_MS = 4000;
const POLL_LIMIT = 60;

/**
 * Asks the server for the game's move analysis until it's ready. Null: nothing to show (no history on
 * this server, the game isn't stored, or it won't be analysed).
 */
export function useGameAnalysis(gameId: string | null | undefined, enabled: boolean): AnalysisStatus | null {
  const [status, setStatus] = useState<AnalysisStatus | null>(null);
  useEffect(() => {
    if (!gameId || !enabled) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let tries = 0;
    async function read() {
      try {
        const response = await fetch(`/api/games/${gameId}/analysis`, { signal: controller.signal });
        if (!response.ok) return;
        const body = (await response.json()) as AnalysisStatus;
        if (controller.signal.aborted) return;
        setStatus(body.status === 'unavailable' ? null : body);
        if (body.status !== 'pending') return;
      } catch {
        if (controller.signal.aborted) return;
      }
      if (++tries < POLL_LIMIT) timer = setTimeout(read, POLL_MS);
    }
    void read();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [gameId, enabled]);
  return status;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Each player's accuracy (1–100) and their flagged moves, chess-style; "Analysing…" while it runs. */
export function AccuracyPanel({ status, report, order, viewer }: { status: AnalysisStatus; report: GameReport; order: number[]; viewer: number | null }) {
  return (
    <section className="mt-5" aria-label="Accuracy">
      <div className="mb-2.5 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-ink/15" />
        <span className="label text-ink-faint">Accuracy</span>
        <span className="h-px flex-1 bg-ink/15" />
      </div>
      {status.status !== 'ready' ? (
        <p className="flex items-center justify-center gap-2 text-sm font-bold text-ink-soft">
          <HexSpinner size={18} decorative /> Analysing every move…
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {order.map((seat) => {
              const a = status.analysis.players[seat];
              const p = report.players[seat];
              if (!a || !p) return null;
              const elo = status.elo[seat];
              return (
                <li key={seat} className="flex min-w-0 items-center gap-2.5 rounded-xl border-2 border-ink bg-paper-2 py-1.5 pr-2.5 pl-1.5">
                  <span
                    className="display grid h-10 w-12 shrink-0 place-items-center rounded-lg border-2 border-ink bg-paper text-xl font-black tabular"
                    style={{ boxShadow: `inset 0 -4px 0 ${PLAYER_COLORS[p.color].hex}` }}
                    title="Accuracy, 1–100: how close the moves came to the best ones found"
                  >
                    {a.accuracy === null ? '—' : Math.round(a.accuracy)}
                  </span>
                  <span className="grid min-w-0 flex-1 leading-tight">
                    <b className="truncate text-[13px] font-bold">
                      {p.name}
                      {seat === viewer && <span className="ml-1 text-xs text-ink-soft">(you)</span>}
                    </b>
                    <span className="flex flex-wrap gap-x-2 text-xs font-semibold text-ink-soft">
                      {a.blunders > 0 && <span className="text-danger">{plural(a.blunders, 'blunder')}</span>}
                      {a.mistakes > 0 && <span className="text-amber-deep">{plural(a.mistakes, 'mistake')}</span>}
                      {a.inaccuracies > 0 && <span>{plural(a.inaccuracies, 'inaccuracy').replace('inaccuracys', 'inaccuracies')}</span>}
                      {!a.blunders && !a.mistakes && !a.inaccuracies && <span>{a.analysed ? 'No slips found' : 'No choices to grade'}</span>}
                    </span>
                  </span>
                  {elo != null && elo !== 0 && (
                    <span className={`shrink-0 text-[11px] font-bold ${elo > 0 ? 'text-moss' : 'text-ink-soft'}`} title="Rated games: accuracy adjusts the Elo change a little (at most 3 points)">
                      {elo > 0 ? '+' : ''}
                      {elo} Elo
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-1.5 text-center text-[11px] text-ink-faint">
            {status.analysis.partial ? 'Partly analysed (time ran short), so these are estimates. ' : ''}Mistakes and blunders are marked in the replay.
          </p>
        </>
      )}
    </section>
  );
}
