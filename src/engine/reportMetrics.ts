import { handTotal } from './hand';
import { CARDS } from './types';
import type { GameReport } from './report';

export type ReportSection = 'Overview' | 'Economy' | 'Trades' | 'Building' | 'Cards' | 'Knights & Barbarians' | 'Exploration';
export interface ReportMetric { section: ReportSection; label: string; definition: string; values: (number | null)[] }
export const humanize = (text: string) => text.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/:/g, ' · ').replace(/^./, (c) => c.toUpperCase());
const DEFINITIONS: Record<string, string> = {
  expectedProduction: 'Pre-roll production baseline using the board, bank and actual next-roll distribution, including balanced bag weights and Alchemist. Excludes gold choices, aqueduct and subsequent event-die effects; not a measure of deserved wins.',
  blockedProduction: 'Cards or gold picks prevented by the robber on matching rolls.', shortageLoss: 'Ordinary production cards denied by bank shortages.',
  longestRoadTurns: 'Completed player turns holding longest route, not full table rounds.', largestArmyTurns: 'Completed player turns holding largest army.',
  offersClosed: 'Offers closed when every recipient declined or embargoed them.', responsesAccepted: 'Explicit accept responses, including changed responses; not necessarily completed trades.',
  responsesDeclined: 'Explicit decline responses; automatic declines for lack of cards are excluded.',
  offersExpired: 'Open offers removed at the end of a turn.', firstCityTurn: 'Turn of the first city built after setup. Zero means none recorded.',
  bestProduction: 'Most cards gained from ordinary hex production on a single roll.',
};
export function reportMetrics(report: GameReport): ReportMetric[] {
  const out: ReportMetric[] = [];
  const add = (section: ReportSection, label: string, values: (number | null)[], definition = label) => out.push({ section, label, definition, values });
  const players = report.players, stats = report.stats, d = stats?.details;
  add('Overview', 'Final VP', players.map((p) => p.vp), 'Total victory points including revealed VP cards.');
  add('Overview', 'Place', players.map((p) => p.rank), 'Winner first, then final victory points. Equal points share a place.');
  add('Overview', 'Cards remaining', players.map((p) => p.remaining));
  for (const key of [...new Set(players.flatMap((p) => Object.keys(p.points)))]) add('Overview', `${key} VP`, players.map((p) => p.points[key] ?? 0));
  if (!stats) return out;
  const rolls = stats.dice.reduce((a, b) => a + b, 0);
  const produced = stats.produced.map(handTotal), total = produced.reduce((a, b) => a + b, 0);
  add('Economy', 'Production', produced, 'Resources and commodities from ordinary hex production, excluding setup and chosen gold rewards.');
  add('Economy', 'Production per roll', produced.map((n) => rolls ? n / rolls : null));
  add('Economy', 'Production share (%)', produced.map((n) => total ? n / total * 100 : null));
  add('Economy', 'Other income', stats.otherGain, 'Non-trade card effects, discovery, gold, monopoly and aqueduct. Setup and robber steals are excluded.');
  add('Economy', 'Cards stolen', stats.stolen); add('Economy', 'Cards lost to steals', stats.lost);
  add('Economy', 'Discarded cards', stats.discarded, 'All forced resource/commodity discards, including sevens and Saboteur.');
  add('Economy', 'Discard share (%)', produced.map((n, i) => { const income = n + stats.otherGain[i] + stats.stolen[i]; return income ? stats.discarded[i] / income * 100 : null; }), 'Discarded cards divided by non-trade income excluding setup; may exceed 100% if cards came from trades.');
  add('Trades', 'Bank exchanges', stats.bankTrades); add('Trades', 'Player transfers', stats.playerTrades, 'Completed trades and forced gifts, counted once for each participant.');
  add('Cards', 'Development cards bought', stats.devBought); add('Cards', 'Knights played', stats.knightsPlayed);
  add('Cards', 'Unused development cards', players.map((p) => p.unusedDev));
  if (report.mode === 'ck') {
    add('Knights & Barbarians', 'Progress cards played', stats.progressPlayed);
    add('Knights & Barbarians', 'Unused progress cards', players.map((p) => p.unusedProgress));
    for (const track of ['science', 'trade', 'politics']) add('Knights & Barbarians', `${humanize(track)} level`, players.map((p) => p.improvements[track] ?? 0));
  }
  const cards = report.mode === 'ck' ? CARDS : CARDS.slice(0, 5);
  for (const card of cards) add('Economy', `Produced · ${card}`, stats.produced.map((h) => h[card]));
  if (!d) return out;
  for (const [key, values] of Object.entries(d.counters)) {
    let section: ReportSection = 'Economy';
    if (/^(bankRatio|partner|offers|responses)/.test(key)) section = 'Trades';
    else if (/^(built|setup|free|firstCity|longest|largest|roadsLost)/.test(key)) section = 'Building';
    else if (/^(devBought|devPlayed)/.test(key)) section = 'Cards';
    else if (/^(progress|knight|improvements|metropol|cityLost|barbarian|defen|merchant)/.test(key)) section = 'Knights & Barbarians';
    else if (/^(shipMoved|hexes|treasure|island)/.test(key)) section = 'Exploration';
    const label = key.startsWith('partner:') ? `Transfers with ${players[Number(key.split(':')[1])]?.name}` : key.startsWith('robbed:') ? `Steals from ${players[Number(key.split(':')[1])]?.name}` : humanize(key);
    add(section, label, values, DEFINITIONS[key] ?? `${label}. Accumulated since turn ${d.fromTurn}; quantities are counts unless labeled as spending or income.`);
  }
  for (const [key, hands] of Object.entries(d.hands)) {
    const section = /^(trade|bank)/.test(key) ? 'Trades' : 'Economy';
    add(section, `${humanize(key)} · total`, hands.map(handTotal), `${humanize(key)} resources and commodities. Card counts, not subjective trade value.`);
    for (const card of cards) add(section, `${humanize(key)} · ${card}`, hands.map((h) => h[card]));
  }
  if (d.hands.tradeGiven || d.hands.tradeReceived) add('Trades', 'Net player trade flow', players.map((_, i) => handTotal(d.hands.tradeReceived?.[i] ?? {}) - handTotal(d.hands.tradeGiven?.[i] ?? {})), 'Received cards minus given cards. More cards does not necessarily mean a better trade.');
  return out;
}
export function reportCsv(report: GameReport): string {
  const cell = (value: unknown) => {
    let s = String(value ?? 'Not recorded');
    if (/^[=+\-@\t\r]/.test(s) && typeof value !== 'number') s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const rows: unknown[][] = [['Report version', report.version], ['Stats coverage', report.stats?.details?.complete ? 'Complete' : 'Partial / historical'],
    ['Section', 'Metric', 'Definition', ...report.players.map((p) => p.name)],
    ...reportMetrics(report).map((m) => [m.section, m.label, m.definition, ...m.values])];
  return rows.map((row) => row.map(cell).join(',')).join('\r\n');
}
