'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { GameReport } from '@/engine/report';
import { GameReportView } from '@/components/game/GameReportView';

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
    <Link className="text-sm font-bold text-foam/70 hover:text-paper" href="/profile?tab=history">← Game history</Link>
    <section className="paper min-w-0 p-4 sm:p-7">{report ? <GameReportView report={report} /> : error ? <div role="alert"><p>{error}</p><button className="btn mt-3 px-4 py-2" onClick={() => setAttempt((n) => n + 1)}>Try again</button></div> : <p role="status">Loading match report…</p>}</section>
  </div></main>;
}
