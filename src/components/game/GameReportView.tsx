'use client';
import { useMemo, useState } from 'react';
import type { GameReport } from '@/engine/report';
import { reportMapName } from '@/engine/report';
import { reportCsv, reportMetrics, type ReportMetric } from '@/engine/reportMetrics';
import { PLAYER_COLORS } from '@/shared/colors';
import { MODE_LABEL } from '@/shared/ratings';
import { DiceHistogram } from './DiceStats';

const format = (n: number | null) => n === null ? '—' : Number.isInteger(n) ? String(n) : n.toFixed(1);
function download(report: GameReport, format: 'csv' | 'json') {
  const blob = new Blob([format === 'csv' ? reportCsv(report) : JSON.stringify(report, null, 2)], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = `tessera-${report.mode}-report.${format}`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function GameReportView({ report, initialSeat }: { report: GameReport; initialSeat?: number | null }) {
  const [section, setSection] = useState('Overview');
  const [selected, setSelected] = useState(initialSeat == null ? 'all' : String(initialSeat));
  const [compare, setCompare] = useState('average');
  const [timelineMetric, setTimelineMetric] = useState<'vp' | 'production' | 'spent' | 'hand' | 'improvements'>('vp');
  const metrics = useMemo(() => reportMetrics(report), [report]);
  const stats = report.stats, d = stats?.details;
  const sections = ['Overview', 'Economy', 'Trades', 'Building', ...(report.mode === 'classic' ? ['Cards'] : ['Cities & Knights']),
    ...(metrics.some((m) => m.section === 'Exploration') ? ['Exploration'] : []), 'Dice', 'Timeline'];
  const seats = selected === 'all' ? report.players.map((_, i) => i) : [Number(selected), ...(compare !== 'none' && compare !== 'average' && compare !== selected ? [Number(compare)] : [])];
  const tableAverage = selected !== 'all' && compare === 'average';
  const average = (values: (number | null)[]) => { const known = values.filter((v): v is number => v !== null); return known.length ? known.reduce((a, b) => a + b, 0) / known.length : null; };
  function table(rows: ReportMetric[]) {
    return <div className="overflow-x-auto rounded-xl border border-ink/10"><table className="w-full border-collapse text-sm"><caption className="sr-only">{section} comparison. Select a metric to read its definition.</caption>
      <thead className="bg-paper-2"><tr><th scope="col" className="min-w-40 px-3 py-3 text-left">Metric</th>{seats.map((seat) => <th scope="col" className="min-w-24 px-3 py-3 text-right" key={seat}>{report.players[seat].name}</th>)}{tableAverage && <th scope="col" className="min-w-24 px-3 py-3 text-right">Table avg.</th>}</tr></thead>
      <tbody>{rows.map((row, i) => <tr key={`${row.label}-${i}`} className="border-t border-ink/10"><th scope="row" className="px-3 py-2 text-left font-semibold"><details><summary className="cursor-pointer">{row.label}</summary><p className="max-w-80 pt-1 text-xs font-normal text-ink-soft">{row.definition}</p></details></th>{seats.map((seat) => <td key={seat} className="px-3 py-2 text-right font-bold tabular">{format(row.values[seat] ?? null)}</td>)}{tableAverage && <td className="px-3 py-2 text-right tabular text-ink-soft">{format(average(row.values))}</td>}</tr>)}</tbody>
    </table></div>;
  }
  const timeline = d?.timeline ?? [];
  const maxY = Math.max(1, ...timeline.flatMap((sample) => seats.map((seat) => sample[timelineMetric][seat])));
  const maxTurn = Math.max(1, timeline.at(-1)?.turn ?? 1);
  const elapsed = report.startedAt && report.endedAt ? Math.max(0, Math.round((Date.parse(report.endedAt) - Date.parse(report.startedAt)) / 60000)) : null;
  const highlight = (label: string, values: number[], minimize = false) => {
    const best = (minimize ? Math.min : Math.max)(...values);
    return `${label}: ${report.players.filter((_, i) => values[i] === best).map((p) => p.name).join(', ')} (${format(best)})`;
  };
  return <div className="grid min-w-0 gap-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="label">{MODE_LABEL[report.mode]} · {reportMapName(report)}</p><h2 className="display mt-1 text-3xl font-black">Match report</h2><p className="mt-1 text-xs text-ink-faint">{report.turns} player turns · Target {report.target} VP · {report.diceMode} dice{elapsed !== null ? ` · ${elapsed} min elapsed` : ''}</p></div>
      <div className="flex gap-2"><button className="btn px-3 py-2 text-xs" onClick={() => download(report, 'csv')}>Export CSV</button><button className="btn px-3 py-2 text-xs" onClick={() => download(report, 'json')}>Export JSON</button></div></div>
    {(!d?.complete || stats?.partial) && <p className="rounded-xl bg-amber/20 p-3 text-sm">{!stats ? 'Stats were not recorded for this game.' : d ? `Detailed tracking started at turn ${d.fromTurn}. These counters cover only part of the game.` : 'Historical report: detailed counters and timeline were not recorded.'}</p>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <label className="grid gap-1 text-xs font-bold">Section<select className="min-w-0 rounded-lg border border-ink/20 bg-paper p-2 text-sm" value={section} onChange={(e) => setSection(e.target.value)}>{sections.map((name) => <option key={name}>{name}</option>)}</select></label>
      <label className="grid gap-1 text-xs font-bold">Player<select className="min-w-0 rounded-lg border border-ink/20 bg-paper p-2 text-sm" value={selected} onChange={(e) => setSelected(e.target.value)}><option value="all">All players</option>{report.players.map((p, i) => <option key={i} value={i}>{p.name}</option>)}</select></label>
      {selected !== 'all' && <label className="grid gap-1 text-xs font-bold">Compare with<select className="min-w-0 rounded-lg border border-ink/20 bg-paper p-2 text-sm" value={compare} onChange={(e) => setCompare(e.target.value)}><option value="none">No comparison</option><option value="average">Table average</option>{report.players.map((p, i) => <option key={i} value={i} disabled={String(i) === selected}>{p.name}</option>)}</select></label>}
    </div>
    {section === 'Overview' && <>
      <ol className="grid gap-2 sm:grid-cols-2">{report.players.map((p, seat) => ({ p, seat })).sort((a, b) => a.p.rank - b.p.rank).map(({ p, seat }) => <li key={seat} className={`rounded-xl p-3 ${seat === report.winner ? 'bg-amber/25' : 'bg-paper-2'}`}><p className="font-extrabold">#{p.rank} {p.name}{p.isBot ? ' · Bot' : ''}<span className="float-right">{p.vp} VP</span></p><p className="mt-1 text-xs text-ink-soft">{p.rating?.delta != null ? `${p.rating.before} → ${p.rating.after} · ${p.rating.delta > 0 ? '+' : ''}${p.rating.delta} Elo` : p.rating?.reason ?? 'Rating updates appear in saved history.'}</p></li>)}</ol>
      {stats && d?.complete && <div className="rounded-xl bg-paper-2 p-3 text-xs text-ink-soft"><p>{highlight('Most production', stats.produced.map((h) => Object.values(h).reduce((a, b) => a + b, 0)))}</p><p>{highlight('Most player transfers', stats.playerTrades)}</p><p>{highlight('Fewest discarded cards', stats.discarded, true)}</p>{timeline.length > 0 && report.winner !== null && <p>Winner&apos;s largest VP deficit at turn boundaries: {Math.max(0, ...timeline.map((sample) => Math.max(...sample.vp) - sample.vp[report.winner!]))}</p>}</div>}
    </>}
    {section !== 'Dice' && section !== 'Timeline' && (metrics.some((m) => m.section === section) ? table(metrics.filter((m) => m.section === section)) : <p className="text-sm text-ink-soft">No recorded events in this section{d ? ' for this game' : ' in this historical report'}.</p>)}
    {section === 'Dice' && stats && <>
      <DiceHistogram dice={stats.dice} expectedCounts={d?.complete ? d.expectedDice : null} />
      <p className="text-xs text-ink-soft">{d?.complete ? 'Dashed marks sum the actual pre-roll probabilities, including balanced-bag weighting and Alchemist. This is a distribution comparison, not a skill score.' : 'Expected counts are unavailable for this historical game.'}</p>
      <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Dice frequencies and droughts</caption><thead><tr>{['Total', 'Rolled', 'Expected', 'Longest drought'].map((text) => <th className="p-2 text-right" key={text}>{text}</th>)}</tr></thead><tbody>{Array.from({ length: 11 }, (_, i) => i + 2).map((n) => <tr key={n} className="border-t border-ink/10"><th className="p-2 text-right">{n}</th><td className="p-2 text-right">{stats.dice[n]}</td><td className="p-2 text-right">{d?.complete ? d.expectedDice[n].toFixed(1) : '—'}</td><td className="p-2 text-right">{d?.longestDrought[n] ?? '—'}</td></tr>)}</tbody></table></div>
      {d && <><p className="text-xs text-ink-soft">Red faces 1–6: {d.red.slice(1).join(' · ')}<br />Yellow faces 1–6: {d.yellow.slice(1).join(' · ')}</p>{report.mode === 'ck' && <p className="text-xs text-ink-soft">Event die: {Object.entries(d.eventDie).map(([face, n]) => `${face}: ${n}`).join(' · ')}</p>}</>}
    </>}
    {section === 'Timeline' && <>
      {!timeline.length ? <p className="text-sm text-ink-soft">No turn timeline was recorded.</p> : <>
        <label className="flex flex-wrap items-center gap-2 text-sm font-bold">Track<select className="rounded-lg border border-ink/20 bg-paper p-2" value={timelineMetric} onChange={(e) => setTimelineMetric(e.target.value as typeof timelineMetric)}>{(['vp', 'production', 'spent', 'hand', 'improvements'] as const).map((key) => <option value={key} key={key}>{({ vp: 'Victory points', production: 'Cumulative production', spent: 'Cumulative spending', hand: 'Cards in hand', improvements: 'Improvement levels' })[key]}</option>)}</select></label>
        <svg viewBox="0 0 640 240" className="w-full rounded-xl bg-paper-2" role="img" aria-label={`${timelineMetric} over player turns; exact values in the table below`}><path d="M40 15V210H620" fill="none" stroke="currentColor" opacity=".3" /><text x="5" y="25" fontSize="12">{Math.ceil(maxY)}</text><text x="16" y="210" fontSize="12">0</text><text x="40" y="232" fontSize="12">Turn 0</text><text x="565" y="232" fontSize="12">{maxTurn}</text>{seats.map((seat) => <polyline key={seat} points={timeline.map((sample) => `${40 + sample.turn / maxTurn * 575},${210 - sample[timelineMetric][seat] / maxY * 190}`).join(' ')} fill="none" stroke={PLAYER_COLORS[report.players[seat].color].hex} strokeWidth="3" strokeDasharray={seat % 2 ? '7 3' : undefined} />)}</svg>
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-soft" aria-label="Chart legend">{seats.map((seat) => <li key={seat} className="flex items-center gap-2"><span aria-hidden="true" className="w-6 border-t-[3px]" style={{ borderColor: PLAYER_COLORS[report.players[seat].color].hex, borderStyle: seat % 2 ? 'dashed' : 'solid' }} />{report.players[seat].name}</li>)}</ul>
        <p className="text-xs text-ink-soft">End of each player turn. Latest 2,000 samples retained, including the first.</p>
        <details><summary className="cursor-pointer text-sm font-bold">View exact timeline values</summary><div className="mt-2 max-h-80 overflow-auto"><table className="w-full text-xs"><thead><tr><th className="p-2">Turn</th>{seats.map((seat) => <th key={seat} className="p-2">{report.players[seat].name}</th>)}</tr></thead><tbody>{timeline.map((sample) => <tr key={sample.turn}><th className="p-2">{sample.turn}</th>{seats.map((seat) => <td className="p-2 text-center" key={seat}>{sample[timelineMetric][seat]}</td>)}</tr>)}</tbody></table></div></details>
      </>}
      {!!d?.milestones.length && <details><summary className="cursor-pointer text-sm font-bold">Milestones ({d.milestones.length})</summary><ol className="mt-2 max-h-80 space-y-2 overflow-y-auto text-xs">{d.milestones.map((event, i) => <li key={i}>Turn {event.turn} · {event.seat === null ? 'Table' : report.players[event.seat].name} · {event.label}</li>)}</ol></details>}
    </>}
    <p className="text-xs text-ink-faint">Select a metric for its definition. A dash means unavailable. Counts cover recorded play; starting pieces and resources are labeled separately.</p>
  </div>;
}
