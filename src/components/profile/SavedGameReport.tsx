'use client';
import { ArrowLeft, Clapperboard } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { GameReport } from '@/engine/report';
import { GameReportView } from '@/components/game/GameReportView';
import { HexSpinner } from '@/components/ui/HexSpinner';

export function SavedGameReport({ gameId }: { gameId: string }) {
  const [report, setReport] = useState<GameReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setError(null);
    void fetch(`/api/games/${encodeURIComponent(gameId)}/report`, { signal: controller.signal }).then(async (response) => {
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? 'Could not load this report.');
      if (!controller.signal.aborted) setReport(body);
    }).catch((err) => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [gameId, attempt]);
  return <main className="page-safe-top min-h-dvh bg-[radial-gradient(ellipse_at_top,_#0f2f3b_0%,_#061419_60%)] px-3 py-6 sm:px-6"><div className="mx-auto grid max-w-6xl gap-5">
    <div className="flex items-center justify-between gap-3">
      <Link className="inline-flex items-center gap-1.5 text-sm font-bold text-foam/70 hover:text-paper" href="/profile?tab=history"><ArrowLeft size={15} /> Game history</Link>
      {report && <Link className="btn px-3 py-1.5 text-sm" href={`/games/${encodeURIComponent(gameId)}/replay`}><Clapperboard size={15} /> Watch replay</Link>}
    </div>
    <section className="paper min-w-0 p-4 sm:p-7">{report ? <GameReportView report={report} /> : error ? <div role="alert"><p>{error}</p><button className="btn mt-3 px-4 py-2" onClick={() => setAttempt((n) => n + 1)}>Try again</button></div> : <div role="status" className="grid place-items-center gap-3 py-8 text-center font-bold"><HexSpinner size={48} decorative />Loading match report…</div>}</section>
  </div></main>;
}
