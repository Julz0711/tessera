'use client';

import { useMemo, useState } from 'react';
import { ACCURACY_ELO, LOSS_THRESHOLDS, MIN_RATED_DECISIONS, VERDICT_LABEL, accuracyEloNudge, type Verdict } from '@/bots/analysis/accuracy';
import type { AnalysisStatus, FlaggedMove, PlayerAccuracy } from '@/bots/analysis/types';
import type { GameReport } from '@/engine/report';
import { PLAYER_COLORS } from '@/shared/colors';
import { HexSpinner } from '@/components/ui/HexSpinner';

const VERDICT_CLASS: Record<Verdict, string> = { blunder: 'text-danger', mistake: 'text-amber-deep', inaccuracy: 'text-ink-soft' };
const VERDICTS: Verdict[] = ['blunder', 'mistake', 'inaccuracy'];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const pct = (n: number) => `${n >= 10 ? Math.round(n) : n.toFixed(1)}%`;

/** A word for an accuracy score, matching the bands the numbers come from (formula in accuracy.ts). */
function grade(accuracy: number | null): string {
  if (accuracy === null) return 'Nothing to grade';
  if (accuracy >= 90) return 'Excellent';
  if (accuracy >= 80) return 'Strong';
  if (accuracy >= 65) return 'Solid';
  if (accuracy >= 45) return 'Shaky';
  return 'Rough';
}

function fill(report: GameReport, seat: number): string {
  const c = PLAYER_COLORS[report.players[seat].color];
  return report.players[seat].color === 'white' ? c.dark : c.hex;
}

function Name({ report, seat, viewer }: { report: GameReport; seat: number; viewer: number | null }) {
  const c = PLAYER_COLORS[report.players[seat].color];
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.hex, boxShadow: `inset 0 0 0 1.5px ${c.dark}` }} />
      <span className="truncate font-bold">{report.players[seat].name}</span>
      {seat === viewer && <span className="text-[10px] font-bold text-ink-faint">(you)</span>}
    </span>
  );
}

/** The share of a player's analysed decisions that were clean, with the slips stacked after it. */
function SlipBar({ a }: { a: PlayerAccuracy }) {
  const total = Math.max(a.analysed, 1);
  const clean = Math.max(0, a.analysed - a.inaccuracies - a.mistakes - a.blunders);
  const parts: [string, number, string][] = [
    ['Clean', clean, 'bg-sea-500'],
    ['Inaccuracies', a.inaccuracies, 'bg-ink/30'],
    ['Mistakes', a.mistakes, 'bg-amber'],
    ['Blunders', a.blunders, 'bg-danger'],
  ];
  return (
    <div
      className="flex h-2.5 w-full min-w-24 overflow-hidden rounded-[2px] border-2 border-ink bg-paper"
      role="img"
      aria-label={parts.map(([label, n]) => `${label}: ${n}`).join(', ')}
    >
      {parts.map(([label, n, cls]) => n > 0 && <span key={label} className={cls} style={{ width: `${(100 * n) / total}%` }} title={`${label}: ${n}`} />)}
    </div>
  );
}

function PlayerRow({ a, report, viewer, elo, rated, bestSlip }: { a: PlayerAccuracy; report: GameReport; viewer: number | null; elo: number | null | undefined; rated: boolean; bestSlip: FlaggedMove | undefined }) {
  const slips = a.inaccuracies + a.mistakes + a.blunders;
  return (
    <li className="grid gap-2 rounded-[6px] border-2 border-ink bg-paper-2 p-2.5 sm:grid-cols-[auto_1fr] sm:gap-3">
      <div className="flex items-center gap-3 sm:block sm:text-center">
        <span
          className="display grid h-14 w-16 shrink-0 place-items-center rounded-[4px] border-2 border-ink bg-paper text-3xl font-black tabular"
          style={{ boxShadow: `inset 0 -5px 0 ${fill(report, a.seat)}` }}
          title="Accuracy, 1–100: how close the moves came to the best ones found"
        >
          {a.accuracy === null ? '—' : Math.round(a.accuracy)}
        </span>
        <span className="block text-xs font-bold text-ink-soft sm:mt-1">{grade(a.accuracy)}</span>
      </div>
      <div className="grid min-w-0 content-center gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 text-sm">
          <Name report={report} seat={a.seat} viewer={viewer} />
          {elo != null && elo !== 0 ? (
            <span className={`text-xs font-bold ${elo > 0 ? 'text-moss' : 'text-ink-soft'}`} title={`Rated games: accuracy adds ${(a.accuracy ?? 0) >= ACCURACY_ELO.pivot ? 'to' : 'from'} the Elo change (at most ${ACCURACY_ELO.cap} points)`}>
              {elo > 0 ? '+' : ''}
              {elo} Elo from accuracy
            </span>
          ) : rated && a.accuracy !== null && a.analysed >= MIN_RATED_DECISIONS ? (
            <span className="text-xs font-bold text-ink-faint">No Elo change from accuracy</span>
          ) : null}
        </div>
        <SlipBar a={a} />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-ink-faint">Decisions graded</dt>
            <dd className="font-bold tabular">
              {a.analysed}
              {a.analysed !== a.decisions ? ` of ${a.decisions}` : ''}
            </dd>
          </div>
          <div>
            <dt className="text-ink-faint">Win chance lost per move</dt>
            <dd className="font-bold tabular">{pct(a.averageLoss)}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">Slips</dt>
            <dd className="font-bold">
              {slips ? (
                <>
                  {a.blunders > 0 && <span className="block text-danger">{plural(a.blunders, 'blunder')}</span>}
                  {a.mistakes > 0 && <span className="block text-amber-deep">{plural(a.mistakes, 'mistake')}</span>}
                  {a.inaccuracies > 0 && <span className="block text-ink-soft">{plural(a.inaccuracies, 'inaccuracy').replace('inaccuracys', 'inaccuracies')}</span>}
                </>
              ) : (
                'None'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-ink-faint">Biggest slip</dt>
            <dd className="font-bold tabular">{bestSlip ? `−${pct(bestSlip.loss)}` : '—'}</dd>
          </div>
        </dl>
        {!a.complete && a.accuracy !== null && <p className="text-[11px] text-ink-faint">Some of this player’s decisions were not graded (time budget), so the score is an estimate.</p>}
      </div>
    </li>
  );
}

/**
 * The Accuracy tab of the stats: every player's score with how it came about, the way it is worked
 * out, and every flagged move (what was played, what was better, and what it cost in win chance).
 */
export function AccuracyDetails({ status, report, seats, viewer }: { status: AnalysisStatus; report: GameReport; seats: number[]; viewer: number | null }) {
  const [verdictFilter, setVerdictFilter] = useState<Verdict | 'all'>('all');
  const [seatFilter, setSeatFilter] = useState<number | 'all'>('all');
  const analysis = status.status === 'ready' ? status.analysis : null;
  const elo = status.status === 'ready' ? status.elo : [];
  const rated = report.players.some((p) => p.rating?.delta != null);

  const bySeat = useMemo(() => {
    const out = new Map<number, FlaggedMove>();
    for (const m of analysis?.moves ?? []) {
      const best = out.get(m.seat);
      if (!best || m.loss > best.loss) out.set(m.seat, m);
    }
    return out;
  }, [analysis]);

  if (!analysis) {
    return (
      <p role="status" className="flex items-center justify-center gap-2 py-8 text-sm font-bold text-ink-soft">
        <HexSpinner size={18} decorative /> Analysing every move… this usually takes under a minute.
      </p>
    );
  }

  const players = seats.map((s) => analysis.players[s]).filter((a): a is PlayerAccuracy => !!a);
  const moves = analysis.moves.filter((m) => seats.includes(m.seat) && (verdictFilter === 'all' || m.verdict === verdictFilter) && (seatFilter === 'all' || m.seat === seatFilter));
  const sorted = [...moves].sort((a, b) => b.loss - a.loss);
  const counts = VERDICTS.map((v) => [v, analysis.moves.filter((m) => seats.includes(m.seat) && m.verdict === v).length] as const);
  const graded = analysis.players.reduce((n, p) => n + p.analysed, 0);

  return (
    <div className="grid min-w-0 gap-4">
      {analysis.partial && <p className="rounded-xl bg-amber/20 p-3 text-sm">Partly analysed: time ran short, so some decisions were left out and the scores are estimates.</p>}

      <ul className="grid gap-2" aria-label="Accuracy by player">
        {players.map((a) => (
          <PlayerRow key={a.seat} a={a} report={report} viewer={viewer} elo={elo[a.seat]} rated={rated} bestSlip={bySeat.get(a.seat)} />
        ))}
      </ul>

      <details className="paper-flat p-3">
        <summary className="cursor-pointer text-sm font-bold">How accuracy is worked out</summary>
        <div className="mt-2 grid gap-1.5 text-xs text-ink-soft">
          <p>
            At every real choice (a build, a trade, a dev card, ending the turn) the game plays the moves the bot would consider out to the end of the turn, a few times each, and compares the win
            chances. {plural(analysis.search.candidates, 'candidate')} and {plural(analysis.search.rollouts, 'rollout')} per decision were used here; {graded} decisions were graded in total.
          </p>
          <p>
            A move that gives up {LOSS_THRESHOLDS.inaccuracy}+ percentage points of win chance against the best candidate is an inaccuracy, {LOSS_THRESHOLDS.mistake}+ a mistake and{' '}
            {LOSS_THRESHOLDS.blunder}+ a blunder. The accuracy (1–100) comes from the average win chance lost per decision, on the same curve chess sites use.
          </p>
          <p>
            In rated games the accuracy adds a small Elo adjustment on top of the result: {ACCURACY_ELO.pivot} is neutral, every {ACCURACY_ELO.per} points of accuracy above or below it is one Elo point, at most ±{ACCURACY_ELO.cap},
            and only for players with at least {MIN_RATED_DECISIONS} graded decisions. A score of 90 would give {accuracyEloNudge(90) > 0 ? '+' : ''}
            {accuracyEloNudge(90)}, a score of 50 gives {accuracyEloNudge(50)}.
          </p>
          <p>Dice luck is not judged: the same dice are replayed for every candidate, so only your choices are compared.</p>
        </div>
      </details>

      <section aria-label="Flagged moves" className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="label">Flagged moves ({sorted.length})</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter moves">
            {(['all', ...VERDICTS] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={verdictFilter === v}
                onClick={() => setVerdictFilter(v)}
                className={`rounded-[4px] border-2 px-2.5 py-1 text-xs font-bold ${verdictFilter === v ? 'border-ink bg-pick' : 'border-ink/20 hover:border-ink/60'}`}
              >
                {v === 'all' ? 'All' : v === 'inaccuracy' ? 'Inaccuracies' : `${VERDICT_LABEL[v]}s`}
                {v !== 'all' && <span className="ml-1 tabular text-ink-faint">{counts.find(([x]) => x === v)![1]}</span>}
              </button>
            ))}
            {seats.length > 1 && (
              <select
                aria-label="Filter by player"
                value={seatFilter}
                onChange={(e) => setSeatFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="rounded-[4px] border-2 border-ink/20 bg-white px-2 py-1 text-xs font-bold"
              >
                <option value="all">Everyone</option>
                {seats.map((s) => (
                  <option key={s} value={s}>
                    {report.players[s].name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        {sorted.length === 0 ? (
          <p className="paper-flat p-3 text-sm text-ink-soft">{analysis.moves.length ? 'No moves match this filter.' : 'No slips found: every graded move was close to the best one.'}</p>
        ) : (
          <ol className="scroll-thin grid max-h-[28rem] gap-1.5 overflow-y-auto pr-1">
            {sorted.map((m) => (
              <li key={`${m.step}-${m.seat}`} className="grid gap-0.5 rounded-[6px] border-2 border-ink/20 bg-white p-2 text-sm" style={{ boxShadow: `inset 4px 0 0 ${fill(report, m.seat)}` }}>
                <div className="flex flex-wrap items-center justify-between gap-x-3 pl-1.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={`text-xs font-black uppercase tracking-wide ${VERDICT_CLASS[m.verdict]}`}>{VERDICT_LABEL[m.verdict]}</span>
                    <Name report={report} seat={m.seat} viewer={viewer} />
                  </span>
                  <span className="text-xs font-bold tabular text-ink-soft" title="Win chance given up against the best move found">
                    −{pct(m.loss)}
                  </span>
                </div>
                <p className="pl-1.5 text-xs">
                  <span className="text-ink-faint">Played</span> <b>{m.played}</b> <span className="tabular text-ink-faint">({pct(m.winPlayed)} to win)</span>
                </p>
                <p className="pl-1.5 text-xs">
                  <span className="text-ink-faint">Better</span> <b>{m.best}</b> <span className="tabular text-ink-faint">({pct(m.winBest)} to win)</span>
                </p>
              </li>
            ))}
          </ol>
        )}
        <p className="text-[11px] text-ink-faint">Win chances are levelled: each decision is judged as if the player had an even chance beforehand. Mistakes and blunders are marked in the replay.</p>
      </section>
    </div>
  );
}
