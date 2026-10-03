'use client';
import { Crown, Info } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import type { GameReport } from '@/engine/report';
import { reportMapName } from '@/engine/report';
import { reportCsv } from '@/engine/reportMetrics';
import { handTotal } from '@/engine/hand';
import { CARDS, RESOURCES } from '@/engine/types';
import { CARD_COLORS } from '@/client/palette';
import { formatStat, leaders, reportCategories, visibleRows, type StatCategory, type StatMatrix, type StatRow } from '@/client/reportCategories';
import { PLAYER_COLORS } from '@/shared/colors';
import { MODE_LABEL, ratingPoolFor } from '@/shared/ratings';
import { DiceHistogram } from './DiceStats';

function download(report: GameReport, format: 'csv' | 'json') {
  const blob = new Blob([format === 'csv' ? reportCsv(report) : JSON.stringify(report, null, 2)], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = `tessera-${report.mode}-report.${format}`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** `#rrggbb` → `rgba(…, alpha)` for leader tints. */
const tint = (hex: string, alpha: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};
const color = (report: GameReport, seat: number) => PLAYER_COLORS[report.players[seat].color];
/** Fill for bars and lines: very light player colours (white) would vanish on paper. */
const fill = (report: GameReport, seat: number) => report.players[seat].color === 'white' ? color(report, seat).dark : color(report, seat).hex;

function PlayerName({ report, seat, you }: { report: GameReport; seat: number; you?: boolean }) {
  const c = color(report, seat);
  return <span className="inline-flex min-w-0 items-center gap-1.5">
    <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.hex, boxShadow: `inset 0 0 0 1.5px ${c.dark}` }} />
    <span className="truncate">{report.players[seat].name}</span>{you && <span className="text-[10px] font-bold text-ink-faint">(you)</span>}
  </span>;
}

/** Metrics down the side, players across the top; each cell carries a bar scaled to the row. */
function CompareTable({ report, seats, category, viewer }: { report: GameReport; seats: number[]; category: StatCategory; viewer?: number | null }) {
  const [hint, setHint] = useState<string | null>(null);
  const groups = category.groups.map((g) => ({ ...g, rows: visibleRows(g.rows) })).filter((g) => g.rows.length);
  if (!groups.length) return null;
  const cell = (row: StatRow, seat: number, lead: number[], max: number) => {
    const v = row.values[seat] ?? null, c = color(report, seat), isLead = lead.includes(seat);
    return <td key={seat} className={`px-2 py-1.5 align-middle ${isLead ? 'bg-amber/20' : ''}`}>
      <div className="flex items-center justify-end gap-1">
        {isLead && <Crown size={12} className="shrink-0 text-amber-deep" aria-label="Best" />}
        <span className={`text-sm font-extrabold tabular ${v !== null && v < 0 ? 'text-danger' : ''} ${v === null ? 'text-ink-faint' : ''}`}>{formatStat(v, row.format)}</span>
      </div>
      {row.bar !== false && <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/8">
        {v !== null && max > 0 && <div className="h-full rounded-full" style={{ width: `${Math.abs(v) / max * 100}%`, background: fill(report, seat), boxShadow: `inset 0 0 0 1px ${c.dark}` }} />}
      </div>}
    </td>;
  };
  return <div className="scroll-thin overflow-x-auto rounded-xl border-2 border-ink/15 bg-paper">
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">{category.label}: players compared side by side. The best value in each row is marked.</caption>
      <thead><tr className="bg-paper-2">
        <th scope="col" className="sticky left-0 z-10 min-w-32 bg-paper-2 px-3 py-2 text-left sm:min-w-40"><span className="label">{category.label}</span></th>
        {seats.map((seat) => <th key={seat} scope="col" className="min-w-20 max-w-36 px-2 py-2 text-right font-extrabold sm:min-w-24" style={{ boxShadow: `inset 0 -3px 0 ${fill(report, seat)}` }}>
          <span className="flex justify-end"><PlayerName report={report} seat={seat} you={seat === viewer} /></span>
        </th>)}
      </tr></thead>
      <tbody>{groups.map((group) => <Fragment key={group.title}>
        <tr><th colSpan={seats.length + 1} scope="colgroup" className="bg-paper-2/50 px-3 pt-3 pb-1 text-left"><span className="label">{group.title}</span></th></tr>
        {group.rows.map((row) => {
          const key = `${group.title}/${row.label}`;
          const known = seats.map((s) => row.values[s]).filter((v): v is number => v !== null && v !== undefined);
          const max = Math.max(0, ...known.map(Math.abs));
          const lead = leaders(row, seats);
          return <tr key={key} className="border-t border-ink/10">
            <th scope="row" className="sticky left-0 z-10 bg-paper px-3 py-1.5 text-left font-semibold">
              <span className="flex items-center gap-1.5">
                {row.card && <span aria-hidden className="h-3 w-3 shrink-0 rounded-sm" style={{ background: CARD_COLORS[row.card].bg, boxShadow: `inset 0 0 0 1px ${CARD_COLORS[row.card].deep}` }} />}
                {row.label}
                {row.hint && <button type="button" className="text-ink-faint hover:text-ink" aria-expanded={hint === key} aria-label={`About ${row.label}`} title={row.hint} onClick={() => setHint(hint === key ? null : key)}><Info size={13} /></button>}
              </span>
              {hint === key && <p className="max-w-64 pt-1 text-xs font-normal text-ink-soft">{row.hint}</p>}
            </th>
            {seats.map((seat) => cell(row, seat, lead, max))}
          </tr>;
        })}
      </Fragment>)}</tbody>
    </table>
  </div>;
}

/** Row player acted on column player, e.g. trades or steals. */
function Matrix({ report, seats, matrix }: { report: GameReport; seats: number[]; matrix: StatMatrix }) {
  const max = Math.max(1, ...seats.flatMap((i) => seats.map((j) => matrix.cells[i][j])));
  if (!seats.some((i) => seats.some((j) => matrix.cells[i][j]))) return null;
  return <div className="paper-flat p-3">
    <p className="label">{matrix.title}</p><p className="mb-2 text-xs text-ink-soft">{matrix.hint}</p>
    <div className="scroll-thin overflow-x-auto"><table className="border-collapse text-sm">
      <thead><tr><th />{seats.map((j) => <th key={j} scope="col" className="max-w-28 px-2 pb-1 text-center text-xs font-bold"><PlayerName report={report} seat={j} /></th>)}</tr></thead>
      <tbody>{seats.map((i) => <tr key={i}>
        <th scope="row" className="max-w-36 py-0.5 pr-3 text-left text-xs font-bold"><PlayerName report={report} seat={i} /></th>
        {seats.map((j) => {
          const v = matrix.cells[i][j];
          return <td key={j} className="p-0.5">{i === j ? <div className="grid h-9 min-w-12 place-items-center rounded-md bg-ink/5 text-ink-faint">·</div>
            : <div className="grid h-9 min-w-12 place-items-center rounded-md font-extrabold tabular" style={{ background: v ? tint('#1d5a6b', 0.12 + 0.78 * v / max) : 'rgba(31,26,20,.04)', color: v / max > 0.5 ? '#f6eddb' : undefined }}>{v || ''}</div>}</td>;
        })}
      </tr>)}</tbody>
    </table></div>
  </div>;
}

/** Each player's production as a resource-coloured bar; lengths are comparable across players. */
function ProductionMix({ report, seats }: { report: GameReport; seats: number[] }) {
  const produced = report.stats!.produced;
  const cards = report.mode === 'ck' ? CARDS : RESOURCES;
  const max = Math.max(1, ...seats.map((s) => handTotal(produced[s])));
  return <div className="paper-flat grid gap-2 p-3">
    <p className="label">Production mix</p>
    {seats.map((seat) => <div key={seat} className="grid grid-cols-[minmax(0,8rem)_1fr_2.5rem] items-center gap-2 text-sm">
      <span className="font-bold"><PlayerName report={report} seat={seat} /></span>
      <div className="flex h-5 overflow-hidden rounded-md bg-ink/6">
        {cards.map((c) => produced[seat][c] ? <div key={c} title={`${CARD_COLORS[c].label}: ${produced[seat][c]}`} style={{ width: `${produced[seat][c] / max * 100}%`, background: CARD_COLORS[c].bg }} /> : null)}
      </div>
      <span className="text-right font-extrabold tabular">{handTotal(produced[seat])}</span>
    </div>)}
    <ul className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs text-ink-soft">{cards.map((c) => <li key={c} className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: CARD_COLORS[c].bg }} />{CARD_COLORS[c].label}</li>)}</ul>
  </div>;
}

/** Totals 2–12 rolled by each player, in their colour. */
function PlayerDice({ report, seats }: { report: GameReport; seats: number[] }) {
  const counters = report.stats?.details?.counters ?? {};
  const totals = Array.from({ length: 11 }, (_, i) => i + 2);
  const counts = (seat: number) => totals.map((t) => counters[`rolled:${t}`]?.[seat] ?? 0);
  if (!seats.some((s) => counts(s).some(Boolean))) return null;
  const max = Math.max(1, ...seats.flatMap(counts));
  return <div className="grid gap-3 sm:grid-cols-2">{seats.map((seat) => {
    const c = color(report, seat), row = counts(seat);
    return <div key={seat} className="paper-flat p-3">
      <div className="mb-2 flex items-baseline justify-between text-sm font-bold"><PlayerName report={report} seat={seat} /><span className="text-xs text-ink-faint">{row.reduce((a, b) => a + b, 0)} rolls</span></div>
      <div className="grid grid-cols-11 items-end gap-1">{totals.map((t, i) => <div key={t} className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] font-black tabular">{row[i] || ''}</span>
        <div className="flex h-14 w-full items-end rounded-sm bg-ink/6"><div className="w-full rounded-t-sm" style={{ height: `${row[i] / max * 100}%`, background: t === 7 ? 'var(--color-ink-soft)' : fill(report, seat), boxShadow: `inset 0 0 0 1px ${t === 7 ? 'transparent' : c.dark}` }} /></div>
        <span className="text-[10px] font-bold text-ink-faint">{t}</span>
      </div>)}</div>
    </div>;
  })}</div>;
}

type TimelineKey = 'vp' | 'production' | 'spent' | 'hand' | 'improvements';
const TIMELINE_LABEL: Record<TimelineKey, string> = { vp: 'Victory points', production: 'Cards produced', spent: 'Cards spent', hand: 'Cards in hand', improvements: 'Improvement levels' };

function TimelineChart({ report, seats, metric }: { report: GameReport; seats: number[]; metric: TimelineKey }) {
  const timeline = report.stats?.details?.timeline ?? [];
  if (!timeline.length) return <p className="text-sm text-ink-soft">No turn timeline was recorded for this game.</p>;
  const maxY = Math.max(1, ...timeline.flatMap((sample) => seats.map((seat) => sample[metric][seat])));
  const maxTurn = Math.max(1, timeline.at(-1)!.turn);
  const x = (turn: number) => 40 + turn / maxTurn * 580, y = (v: number) => 210 - v / maxY * 190;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxY * f)).filter((v, i, a) => a.indexOf(v) === i);
  return <div className="paper-flat grid gap-2 p-3">
    <svg viewBox="0 0 640 240" className="w-full" role="img" aria-label={`${TIMELINE_LABEL[metric]} over player turns`}>
      {ticks.map((v) => <g key={v}><line x1="40" x2="620" y1={y(v)} y2={y(v)} stroke="currentColor" opacity=".12" /><text x="32" y={y(v) + 4} fontSize="11" textAnchor="end" opacity=".6">{v}</text></g>)}
      <text x="40" y="232" fontSize="11" opacity=".6">Turn 0</text><text x="620" y="232" fontSize="11" textAnchor="end" opacity=".6">{maxTurn}</text>
      {seats.map((seat) => <polyline key={seat} points={timeline.map((s) => `${x(s.turn)},${y(s[metric][seat])}`).join(' ')} fill="none" stroke={fill(report, seat)} strokeWidth="3" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 0.6px ${color(report, seat).dark})` }} />)}
    </svg>
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold">{seats.map((seat) => <li key={seat} className="flex items-center gap-1.5"><PlayerName report={report} seat={seat} /><span className="tabular text-ink-faint">{timeline.at(-1)![metric][seat]}</span></li>)}</ul>
  </div>;
}

export function GameReportView({ report, initialSeat }: { report: GameReport; initialSeat?: number | null }) {
  const categories = useMemo(() => reportCategories(report), [report]);
  const [tab, setTab] = useState<string>('overview');
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [timelineMetric, setTimelineMetric] = useState<TimelineKey>('vp');
  const stats = report.stats, d = stats?.details;
  const order = report.players.map((_, i) => i).sort((a, b) => report.players[a].rank - report.players[b].rank);
  const seats = order.filter((s) => !hidden.has(s));
  const tabs = [...categories.map((c) => ({ id: c.id as string, label: c.label })), ...(d?.timeline.length ? [{ id: 'timeline', label: 'Timeline' }] : [])];
  const category = categories.find((c) => c.id === tab);
  const elapsed = report.startedAt && report.endedAt ? Math.max(0, Math.round((Date.parse(report.endedAt) - Date.parse(report.startedAt)) / 60000)) : null;
  const toggle = (seat: number) => setHidden((prev) => {
    const next = new Set(prev);
    if (next.has(seat)) next.delete(seat); else if (report.players.length - next.size > 1) next.add(seat);
    return next;
  });
  const awards = useMemo(() => categories.flatMap((c) => c.groups.flatMap((g) => g.rows)).filter((r) => r.award).flatMap((row) => {
    const known = row.values.map((v, seat) => ({ v, seat })).filter((e): e is { v: number; seat: number } => e.v !== null);
    const best = Math.max(...known.map((e) => e.v));
    if (!known.length || best <= 0) return [];
    return [{ title: row.award!, stat: row.label, value: formatStat(best, row.format), seats: known.filter((e) => e.v === best).map((e) => e.seat) }];
  }), [categories]);

  return <div className="grid min-w-0 gap-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="label">{MODE_LABEL[ratingPoolFor(report.mode, report.map)]} · {reportMapName(report)}</p><h2 className="display mt-1 text-3xl font-black">{report.live ? 'So far' : 'Match report'}</h2>
        <p className="mt-1 text-xs text-ink-faint">{report.turns} player turns · Target {report.target} VP · {report.diceMode} dice{elapsed !== null ? ` · ${elapsed} min` : ''}</p></div>
      <div className="flex gap-2"><button className="btn px-3 py-2 text-xs" onClick={() => download(report, 'csv')}>Export CSV</button><button className="btn px-3 py-2 text-xs" onClick={() => download(report, 'json')}>Export JSON</button></div>
    </div>
    {(!d?.complete || stats?.partial) && <p className="rounded-xl bg-amber/20 p-3 text-sm">{!stats ? 'Stats were not recorded for this game.' : d ? `Detailed tracking started at turn ${d.fromTurn}, so some numbers cover only part of the game.` : 'Older game: only the basic counters were recorded. Dashes mark stats that are unavailable.'}</p>}

    <div role="group" aria-label="Players to compare" className="flex flex-wrap gap-2">
      {order.map((seat) => {
        const p = report.players[seat], c = PLAYER_COLORS[p.color], on = !hidden.has(seat);
        return <button key={seat} type="button" aria-pressed={on} onClick={() => toggle(seat)} title={on ? 'Hide from comparison' : 'Add to comparison'}
          className={`flex min-w-0 items-center gap-2 rounded-xl border-2 py-1.5 pr-3 pl-1.5 text-left text-sm transition ${on ? 'border-ink bg-paper' : 'border-ink/15 bg-transparent opacity-50'}`}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg font-black" style={{ background: c.hex, color: c.ink, boxShadow: `inset 0 0 0 2px ${c.dark}` }}>{seat === report.winner ? <Crown size={16} /> : `#${p.rank}`}</span>
          <span className="min-w-0"><span className="block truncate font-extrabold">{p.name}{seat === initialSeat ? ' (you)' : ''}</span><span className="block text-xs font-bold text-ink-soft">{p.vp} VP{p.rating?.delta != null ? ` · ${p.rating.delta > 0 ? '+' : ''}${p.rating.delta}` : ''}{p.isBot ? ' · Bot' : ''}</span></span>
        </button>;
      })}
      {report.players.length > 2 && <span className="self-center text-xs text-ink-faint">Tap players to narrow the comparison.</span>}
    </div>

    <div role="tablist" aria-label="Stat categories" className="scroll-thin -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {tabs.map((t) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
        className={`shrink-0 rounded-full border-2 px-3.5 py-1.5 text-sm font-bold whitespace-nowrap transition ${tab === t.id ? 'border-ink bg-ink text-paper' : 'border-ink/20 hover:border-ink/60'}`}>{t.label}</button>)}
    </div>

    <div role="tabpanel" className="grid min-w-0 gap-4">
      {tab === 'overview' && <>
        {awards.length > 0 && <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{awards.map((a) => {
          return <li key={a.title} className="rounded-xl border-2 border-ink/15 bg-paper-2 py-3 pr-3 pl-4" style={{ boxShadow: `inset 5px 0 0 ${fill(report, a.seats[0])}` }}>
            <p className="label">{a.title}</p>
            <p className="mt-1 flex min-w-0 flex-wrap gap-x-2 font-extrabold">{a.seats.map((s) => <PlayerName key={s} report={report} seat={s} />)}</p>
            <p className="text-xs text-ink-soft">{a.stat}: <b className="tabular text-ink">{a.value}</b></p>
          </li>;
        })}</ul>}
        {!!d?.timeline.length && <><p className="label -mb-2">Victory point race</p><TimelineChart report={report} seats={seats} metric="vp" /></>}
      </>}
      {tab === 'dice' && stats && <>
        <DiceHistogram dice={stats.dice} expectedCounts={d?.complete ? d.expectedDice : null} />
        <PlayerDice report={report} seats={seats} />
      </>}
      {tab === 'production' && stats && <ProductionMix report={report} seats={seats} />}
      {category && <CompareTable report={report} seats={seats} category={category} viewer={initialSeat} />}
      {category?.matrices.map((m) => <Matrix key={m.title} report={report} seats={seats} matrix={m} />)}
      {tab === 'dice' && stats && <details className="paper-flat p-3">
        <summary className="cursor-pointer text-sm font-bold">Dice details</summary>
        <div className="scroll-thin mt-2 overflow-x-auto"><table className="w-full text-sm"><thead><tr>{['Total', 'Rolled', 'Expected', 'Longest drought'].map((text) => <th className="p-1.5 text-right" key={text}>{text}</th>)}</tr></thead>
          <tbody>{Array.from({ length: 11 }, (_, i) => i + 2).map((n) => <tr key={n} className="border-t border-ink/10"><th className="p-1.5 text-right">{n}</th><td className="p-1.5 text-right tabular">{stats.dice[n]}</td><td className="p-1.5 text-right tabular">{d?.complete ? d.expectedDice[n].toFixed(1) : '—'}</td><td className="p-1.5 text-right tabular">{d?.longestDrought[n] ?? '—'}</td></tr>)}</tbody></table></div>
        {d && <p className="mt-2 text-xs text-ink-soft">Red die faces 1–6: {d.red.slice(1).join(' · ')}<br />Yellow die faces 1–6: {d.yellow.slice(1).join(' · ')}{report.mode === 'ck' && <><br />Event die: {Object.entries(d.eventDie).map(([face, n]) => `${face} ${n}`).join(' · ')}</>}</p>}
      </details>}
      {tab === 'timeline' && <>
        <div role="group" aria-label="Timeline metric" className="flex flex-wrap gap-1.5">{(Object.keys(TIMELINE_LABEL) as TimelineKey[]).filter((k) => k !== 'improvements' || report.mode === 'ck').map((k) =>
          <button key={k} type="button" aria-pressed={timelineMetric === k} onClick={() => setTimelineMetric(k)} className={`rounded-lg border-2 px-2.5 py-1 text-xs font-bold ${timelineMetric === k ? 'border-ink bg-ink text-paper' : 'border-ink/20 hover:border-ink/60'}`}>{TIMELINE_LABEL[k]}</button>)}</div>
        <TimelineChart report={report} seats={seats} metric={timelineMetric} />
        {!!d?.milestones.length && <details className="paper-flat p-3"><summary className="cursor-pointer text-sm font-bold">Milestones ({d.milestones.length})</summary>
          <ol className="scroll-thin mt-2 max-h-80 space-y-1.5 overflow-y-auto text-xs">{d.milestones.map((event, i) => <li key={i} className="flex gap-2"><span className="w-10 shrink-0 font-bold tabular text-ink-faint">T{event.turn}</span>{event.seat === null ? <span className="font-bold">Table</span> : <span className="font-bold"><PlayerName report={report} seat={event.seat} /></span>}<span>{event.label}</span></li>)}</ol></details>}
      </>}
    </div>
  </div>;
}
