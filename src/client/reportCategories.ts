import { DEV_NAMES, PROGRESS_NAMES, TRACK_NAMES } from '@/client/describe';
import { CARD_COLORS } from '@/client/palette';
import { PROGRESS_DECKS } from '@/engine/constants';
import { handTotal } from '@/engine/hand';
import type { GameReport } from '@/engine/report';
import { CARDS, RESOURCES, type Card, type DevCardType, type ProgressCardType, type Track } from '@/engine/types';

export type StatFormat = 'int' | 'dec' | 'pct' | 'signed' | 'turn';
export interface StatRow {
  label: string;
  hint?: string;
  values: (number | null)[];
  /** Which end of the row gets the leader highlight; omitted rows are neutral. */
  better?: 'high' | 'low';
  format?: StatFormat;
  /** Resource/commodity swatch shown next to the label. */
  card?: Card;
  /** False hides the in-cell bar where length means nothing (places, turn numbers). */
  bar?: boolean;
  /** Shown even when every player has 0. */
  always?: boolean;
  /** Overview award for the player with the highest value. */
  award?: string;
}
export interface StatGroup { title: string; rows: StatRow[] }
/** Who-did-what-to-whom counts: `cells[actor][target]`. */
export interface StatMatrix { title: string; hint: string; cells: number[][] }
export type CategoryId = 'overview' | 'dice' | 'production' | 'trading' | 'robber' | 'building' | 'dev' | 'progress' | 'knights' | 'exploration';
export interface StatCategory { id: CategoryId; label: string; groups: StatGroup[]; matrices: StatMatrix[] }

const INCOME_LABELS: Record<string, string> = {
  gold: 'Gold field picks', discovery: 'Discovery', treasure: 'Treasures', yearOfPlenty: 'Year of Plenty',
  aqueduct: 'Aqueduct', masterMerchant: 'Master Merchant', knight: 'Knight rewards', bishop: 'Bishop', seven: 'Seven rewards', saboteur: 'Saboteur',
};
const SPENDING_LABELS: Record<string, string> = {
  road: 'Roads', ship: 'Ships', settlement: 'Settlements', city: 'Cities', wall: 'Walls', 'development card': 'Development cards',
  'promote knight': 'Knight promotions',
};
const PIECES = [['road', 'Roads'], ['ship', 'Ships'], ['settlement', 'Settlements'], ['city', 'Cities'], ['wall', 'City walls']] as const;
const TRACKS: Track[] = ['science', 'trade', 'politics'];
const TREASURE_LABELS: Record<string, string> = { resource: 'Resource', roadBuilding: 'Road building', bundle: 'Bundle', devCard: 'Card' };
const titleCase = (text: string) => text.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

/** Curated head-to-head categories for the match report. Unknown values (historical games) are null. */
export function reportCategories(report: GameReport): StatCategory[] {
  const players = report.players, n = players.length, stats = report.stats, d = stats?.details;
  const zeros = () => Array<number>(n).fill(0);
  const unknown = () => Array<number | null>(n).fill(null);
  const ck = report.mode === 'ck';
  /** A detailed counter; missing keys mean nobody triggered it, missing details mean unknown. */
  const counter = (key: string): (number | null)[] => d ? (d.counters[key] ?? zeros()).slice() : unknown();
  const hand = (key: string): (number | null)[] => d ? (d.hands[key]?.map(handTotal) ?? zeros()) : unknown();
  const sumKeys = (prefix: string): (number | null)[] => {
    if (!d) return unknown();
    const out = zeros();
    for (const [key, values] of Object.entries(d.counters)) if (key.startsWith(prefix)) values.forEach((v, i) => out[i] += v);
    return out;
  };
  const keysWith = (prefix: string) => d ? Object.keys(d.counters).filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length)) : [];
  const ratio = (a: (number | null)[], b: (number | null)[], scale = 1) => a.map((v, i) => v !== null && b[i] ? v / b[i]! * scale : null);
  const matrix = (prefix: string) => players.map((_, i) => players.map((_, j) => d?.counters[`${prefix}${j}`]?.[i] ?? 0));
  const cards = ck ? CARDS : RESOURCES;
  const produced = stats ? stats.produced.map(handTotal) : unknown();
  const expected = d?.counters.expectedProduction ? d.counters.expectedProduction.slice() : unknown();
  const out: StatCategory[] = [];

  // ── Overview ────────────────────────────────────────────────────────────
  const pointKeys = [...new Set(players.flatMap((p) => Object.keys(p.points)))];
  const ratings = players.map((p) => p.rating?.delta ?? null);
  out.push({ id: 'overview', label: 'Overview', matrices: [], groups: [
    { title: 'Result', rows: [
      { label: 'Victory points', values: players.map((p) => p.vp), better: 'high', always: true },
      { label: 'Place', values: players.map((p) => p.rank), better: 'low', always: true, bar: false },
      ...(ratings.some((r) => r !== null) ? [{ label: 'Rating change', values: ratings, format: 'signed' as const, better: 'high' as const, always: true, bar: false }] : []),
      { label: 'Cards left in hand', values: players.map((p) => p.remaining) },
    ] },
    { title: 'Where the points came from', rows: pointKeys.map((key) => ({ label: key, values: players.map((p) => p.points[key] ?? 0), better: 'high' as const })) },
  ] });
  if (!stats) return out;

  // ── Dice ────────────────────────────────────────────────────────────────
  const rolls = counter('rolls'), sevens = counter('sevens');
  const rolledTotals = players.map((_, seat) => Array.from({ length: 13 }, (_, t) => d?.counters[`rolled:${t}`]?.[seat] ?? 0));
  const hasPerSeat = rolledTotals.some((h) => h.some((v) => v > 0));
  const avgRoll = hasPerSeat ? rolledTotals.map((h) => { const c = h.reduce((a, b) => a + b, 0); return c ? h.reduce((a, v, t) => a + v * t, 0) / c : null; }) : unknown();
  const luck = produced.map((v, i) => v !== null && expected[i] !== null ? v - expected[i]! : null);
  out.push({ id: 'dice', label: 'Dice', matrices: [], groups: [
    { title: 'Rolling', rows: [
      { label: 'Rolls made', values: rolls, always: true },
      { label: 'Sevens rolled', values: sevens, always: true },
      { label: 'Seven rate', values: ratio(sevens, rolls, 100), format: 'pct', hint: 'Share of their own rolls that were a 7. About 16.7% is expected.' },
      { label: 'Average roll', values: avgRoll, format: 'dec', hint: 'Mean total of their own rolls. 7.0 is expected.' },
    ] },
    { title: 'Luck', rows: [
      { label: 'Production vs. expected', values: luck, format: 'signed', better: 'high', always: true, award: 'Luckiest dice',
        hint: 'Cards actually produced minus the pre-roll expectation for their buildings. Positive means the dice favoured them.' },
      { label: 'Production / expected', values: ratio(produced, expected, 100), format: 'pct', better: 'high' },
    ] },
  ] });

  // ── Production ──────────────────────────────────────────────────────────
  const incomeKeys = d ? Object.keys(d.hands).filter((k) => k.startsWith('income:') && k !== 'income:setup') : [];
  const gameRolls = stats.dice.reduce((a, b) => a + b, 0);
  out.push({ id: 'production', label: 'Production', matrices: [], groups: [
    { title: 'From the board', rows: [
      { label: 'Cards produced', values: produced, better: 'high', always: true, award: 'Top producer', hint: 'Resources and commodities from hex production, excluding setup and gold choices.' },
      { label: 'Expected production', values: expected, format: 'dec', hint: 'What their buildings should have produced given the dice odds, robber and bank.' },
      { label: 'Cards per roll', values: produced.map((v) => v !== null && gameRolls ? v / gameRolls : null), format: 'dec', better: 'high' },
      { label: 'Best single roll', values: counter('bestProduction'), better: 'high', hint: 'Most cards produced for them by one roll.' },
    ] },
    { title: 'By card', rows: cards.map((c) => ({ label: CARD_COLORS[c].label, card: c, values: stats.produced.map((h) => h[c]), better: 'high' as const })) },
    { title: 'Other income', rows: [
      { label: 'Other income', values: stats.otherGain, better: 'high', hint: 'Cards from anything but production, trades and steals.' },
      ...incomeKeys.map((k) => ({ label: INCOME_LABELS[k.slice(7)] ?? titleCase(k.slice(7)), values: hand(k), better: 'high' as const })),
      { label: 'Monopoly haul', values: counter('monopolyIncome'), better: 'high' },
    ] },
    { title: 'Missed out', rows: [
      { label: 'Blocked by the robber', values: counter('blockedProduction'), better: 'low', hint: 'Cards the robber stopped them producing.' },
      { label: 'Lost to bank shortage', values: counter('shortageLoss'), better: 'low' },
    ] },
  ] });

  // ── Trading ─────────────────────────────────────────────────────────────
  const tradeGiven = hand('tradeGiven'), tradeReceived = hand('tradeReceived');
  out.push({ id: 'trading', label: 'Trading', matrices: d ? [{ title: 'Trades between players', hint: 'Completed trades, row player with column player.', cells: matrix('partner:') }] : [], groups: [
    { title: 'With players', rows: [
      { label: 'Trades completed', values: stats.playerTrades, better: 'high', always: true, award: 'Trade master' },
      { label: 'Cards given', values: tradeGiven },
      { label: 'Cards received', values: tradeReceived },
      { label: 'Net cards', values: tradeGiven.map((g, i) => g !== null && tradeReceived[i] !== null ? tradeReceived[i]! - g : null), format: 'signed', hint: 'Received minus given. More cards is not always the better deal.' },
      { label: 'Offers made', values: counter('offers') },
      { label: 'Offers nobody took', values: counter('offersClosed'), hint: 'Every recipient declined.' },
      { label: 'Offers expired', values: counter('offersExpired') },
      { label: 'Offers cancelled', values: counter('offersCancelled') },
      { label: 'Offers accepted', values: counter('responsesAccepted'), hint: 'Accepts they gave to other players\' offers.' },
      { label: 'Offers declined', values: counter('responsesDeclined') },
    ] },
    { title: 'With the bank', rows: [
      { label: 'Bank trades', values: stats.bankTrades, always: true },
      { label: 'Cards given to bank', values: hand('bankGiven') },
      { label: 'Cards from bank', values: hand('bankReceived') },
      ...[4, 3, 2].map((r) => ({ label: `${r}:1 trades`, values: counter(`bankRatio:${r}`) })),
    ] },
  ] });

  // ── Robber & losses ─────────────────────────────────────────────────────
  out.push({ id: 'robber', label: 'Robber & losses', matrices: d ? [{ title: 'Who robbed whom', hint: 'Cards stolen by the row player from the column player.', cells: matrix('robbed:') }] : [], groups: [
    { title: 'Steals', rows: [
      { label: 'Cards stolen', values: stats.stolen, better: 'high', always: true, award: 'Robber baron' },
      { label: 'Cards lost to steals', values: stats.lost, better: 'low', always: true, award: 'Favourite target' },
      { label: 'Lost to card effects', values: counter('effectLosses'), hint: 'Taken by Monopoly and similar cards.' },
    ] },
    { title: 'Discards', rows: [
      { label: 'Cards discarded', values: stats.discarded, better: 'low', always: true },
      ...(d?.hands.discarded ? cards.map((c) => ({ label: CARD_COLORS[c].label, card: c, values: d.hands.discarded.map((h) => h[c]) })) : []),
    ] },
  ] });

  // ── Building ────────────────────────────────────────────────────────────
  const spendKeys = keysWith('spending:');
  const firstCity = counter('firstCityTurn').map((v) => v === 0 ? null : v);
  out.push({ id: 'building', label: 'Building', matrices: [], groups: [
    { title: 'Pieces built', rows: [
      ...PIECES.map(([piece, label]) => ({ label, values: counter(`built:${piece}`), better: 'high' as const, always: piece !== 'ship' && piece !== 'wall' })),
      { label: 'Free pieces', values: sumKeys('free:'), hint: 'From Road Building, Engineer, treasures and similar.' },
      { label: 'First city on turn', values: firstCity, format: 'turn', better: 'low', always: true, bar: false },
    ] },
    { title: 'Routes', rows: [
      { label: 'Longest route', values: counter('longestRoutePeak'), better: 'high', always: true, award: 'Master builder', hint: 'Their longest route at its peak.' },
      { label: 'Turns holding longest route', values: counter('longestRoadTurns'), better: 'high' },
      { label: 'Times taken longest route', values: counter('longestRoadGained') },
      { label: 'Roads lost', values: counter('roadsLost'), better: 'low' },
    ] },
    { title: 'Spending', rows: [
      { label: 'Cards spent', values: hand('spent'), better: 'high', always: true },
      ...spendKeys.map((k) => ({ label: SPENDING_LABELS[k] ?? titleCase(k), values: counter(`spending:${k}`) })),
    ] },
  ] });

  // ── Cards ───────────────────────────────────────────────────────────────
  if (!ck) {
    const devTypes: DevCardType[] = ['knight', 'victoryPoint', 'roadBuilding', 'yearOfPlenty', 'monopoly'];
    out.push({ id: 'dev', label: 'Development cards', matrices: [], groups: [
      { title: 'Deck', rows: [
        { label: 'Cards bought', values: stats.devBought, better: 'high', always: true },
        { label: 'Cards played', values: sumKeys('devPlayed:'), always: true },
        { label: 'Unused at the end', values: players.map((p) => p.unusedDev), always: true },
      ] },
      { title: 'Bought', rows: devTypes.map((t) => ({ label: DEV_NAMES[t], values: counter(`devBought:${t}`) })) },
      { title: 'Played', rows: devTypes.filter((t) => t !== 'victoryPoint').map((t) => ({ label: DEV_NAMES[t], values: counter(`devPlayed:${t}`) })) },
      { title: 'Army', rows: [
        { label: 'Knights played', values: stats.knightsPlayed, better: 'high', always: true, award: 'Warlord' },
        { label: 'Turns holding largest army', values: counter('largestArmyTurns'), better: 'high' },
        { label: 'Times taken largest army', values: counter('largestArmyGained') },
      ] },
    ] });
  } else {
    const played = new Set(keysWith('progressPlayed:') as ProgressCardType[]);
    out.push({ id: 'progress', label: 'Progress cards', matrices: [], groups: [
      { title: 'Deck', rows: [
        { label: 'Cards drawn', values: sumKeys('progressDrawn:'), better: 'high', always: true },
        ...TRACKS.map((t) => ({ label: `${TRACK_NAMES[t]} drawn`, values: counter(`progressDrawn:${t}`) })),
        { label: 'Cards played', values: stats.progressPlayed, better: 'high', always: true, award: 'Card shark' },
        { label: 'Discarded over the limit', values: counter('progressDiscarded'), better: 'low' },
        { label: 'Unused at the end', values: players.map((p) => p.unusedProgress) },
      ] },
      ...TRACKS.map((t) => ({ title: `${TRACK_NAMES[t]} cards played`, rows: PROGRESS_DECKS[t].map(([c]) => c).filter((c) => played.has(c))
        .sort((a, b) => PROGRESS_NAMES[a].localeCompare(PROGRESS_NAMES[b])).map((c) => ({ label: PROGRESS_NAMES[c], values: counter(`progressPlayed:${c}`) })) })),
    ] });
    out.push({ id: 'knights', label: 'Knights & barbarians', matrices: [], groups: [
      { title: 'City improvements', rows: [
        ...TRACKS.map((t) => ({ label: `${TRACK_NAMES[t]} level`, values: players.map((p) => p.improvements[t] ?? 0), better: 'high' as const, always: true })),
        { label: 'Metropolises gained', values: counter('metropolisesGained'), better: 'high' },
        { label: 'Metropolises lost', values: counter('metropolisesLost'), better: 'low' },
      ] },
      { title: 'Knights', rows: [
        { label: 'Knights recruited', values: counter('knightBuilt'), better: 'high', always: true },
        { label: 'Promotions', values: counter('knightPromoted') },
        { label: 'Activations', values: counter('knightActivated') },
        { label: 'Moves', values: counter('knightMoved') },
        { label: 'Knights lost', values: counter('knightRemoved'), better: 'low' },
      ] },
      { title: 'Barbarians', rows: [
        { label: 'Knight strength sent', values: counter('barbarianContribution'), better: 'high', always: true, award: 'Defender of Catan', hint: 'Total active knight strength at barbarian attacks.' },
        { label: 'Top defender', values: counter('defenses'), better: 'high' },
        { label: 'Cities pillaged', values: counter('cityLost'), better: 'low', always: true },
        { label: 'Merchant placed', values: counter('merchantPlaced') },
      ] },
    ] });
  }

  // ── Exploration ─────────────────────────────────────────────────────────
  const treasureKinds = keysWith('treasure:');
  const exploration: StatRow[] = [
    { label: 'Ships moved', values: counter('shipMoved') },
    { label: 'Hexes discovered', values: counter('hexesDiscovered'), better: 'high', award: 'Explorer' },
    { label: 'Islands settled', values: counter('islandsSettled'), better: 'high' },
    { label: 'Island points', values: counter('islandVP'), better: 'high' },
    { label: 'Treasures found', values: sumKeys('treasure:'), better: 'high' },
    ...treasureKinds.map((k) => ({ label: `${TREASURE_LABELS[k] ?? titleCase(k)} treasures`, values: counter(`treasure:${k}`) })),
  ];
  if (exploration.some((r) => r.values.some((v) => v))) out.push({ id: 'exploration', label: 'Exploration', matrices: [], groups: [{ title: 'Seafaring', rows: exploration }] });

  return out;
}

/** Rows with nothing to compare are noise; keep the headline ones. */
export const visibleRows = (rows: StatRow[]) => rows.filter((r) => r.always || r.values.some((v) => v !== null && v !== 0));

/** Seats sharing the best value, or none when the row is neutral or everyone ties. */
export function leaders(row: StatRow, seats: number[]): number[] {
  if (!row.better) return [];
  const known = seats.filter((s) => row.values[s] !== null && row.values[s] !== undefined);
  if (known.length < 2) return [];
  const vals = known.map((s) => row.values[s]!);
  const best = row.better === 'high' ? Math.max(...vals) : Math.min(...vals);
  if (vals.every((v) => v === best)) return [];
  return known.filter((s) => row.values[s] === best);
}

export function formatStat(value: number | null | undefined, format: StatFormat = 'int'): string {
  if (value === null || value === undefined) return '—';
  switch (format) {
    case 'pct': return `${Math.round(value)}%`;
    case 'dec': return value.toFixed(1);
    case 'signed': { const r = Math.round(value * 10) / 10; return `${r > 0 ? '+' : ''}${Number.isInteger(r) ? r : r.toFixed(1)}`; }
    case 'turn': return `T${value}`;
    default: return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
}
