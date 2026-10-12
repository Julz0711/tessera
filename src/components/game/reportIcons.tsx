import {
  Archive,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Ban,
  Check,
  ChevronsUp,
  Coins,
  Compass,
  Crown,
  Dices,
  Flag,
  Flame,
  Footprints,
  Gem,
  Gift,
  Hand,
  Hammer,
  Handshake,
  Hourglass,
  Landmark,
  Layers,
  LineChart,
  Magnet,
  Medal,
  MessageSquare,
  MessageSquareX,
  Percent,
  Sailboat,
  Scale,
  ScrollText,
  Shield,
  ShieldOff,
  Skull,
  Sparkles,
  Sprout,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  UserRound,
  VenetianMask,
  X,
  Zap,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { CARD_COLORS } from '@/client/palette';
import { TRACK_STYLE } from '@/client/progressText';
import type { StatRow } from '@/client/reportCategories';
import { TRACK_COMMODITY } from '@/engine/constants';
import { CityGlyph, DevCardGlyph, KnightGlyph, RoadGlyph, RobberGlyph, SettlementGlyph } from '@/components/ui/Glyphs';
import { MiniArt } from './cardArt';

const I = 15;

/** An icon per stat category tab. */
export const TAB_ICONS: Record<string, ReactNode> = {
  overview: <Trophy size={I} />,
  dice: <Dices size={I} />,
  production: <Sprout size={I} />,
  trading: <ArrowLeftRight size={I} />,
  robber: <RobberGlyph size={I} />,
  building: <SettlementGlyph size={I} />,
  dev: <DevCardGlyph size={I} />,
  progress: <ScrollText size={I} />,
  knights: <KnightGlyph size={I} />,
  exploration: <Compass size={I} />,
  timeline: <LineChart size={I} />,
  accuracy: <Target size={I} />,
};

/** An icon per stat row label (rows about one card or track draw that card's art instead). */
const ROW_ICONS: Record<string, ReactNode> = {
  'Victory points': <Trophy size={I} />,
  Place: <Medal size={I} />,
  'Rating change': <TrendingUp size={I} />,
  'Cards left in hand': <Hand size={I} />,
  'Rolls made': <Dices size={I} />,
  'Sevens rolled': <RobberGlyph size={I} />,
  'Seven rate': <Percent size={I} />,
  'Average roll': <Dices size={I} />,
  'Production vs. expected': <Sparkles size={I} />,
  'Production / expected': <Percent size={I} />,
  'Cards produced': <Sprout size={I} />,
  'Expected production': <Target size={I} />,
  'Cards per roll': <Layers size={I} />,
  'Best single roll': <Zap size={I} />,
  'Monopoly haul': <Magnet size={I} />,
  'Blocked by the robber': <RobberGlyph size={I} />,
  'Lost to bank shortage': <Landmark size={I} />,
  'Trades completed': <Handshake size={I} />,
  'Cards given': <ArrowUpRight size={I} />,
  'Cards received': <ArrowDownLeft size={I} />,
  'Net cards': <Scale size={I} />,
  'Offers made': <MessageSquare size={I} />,
  'Offers nobody took': <MessageSquareX size={I} />,
  'Offers expired': <Hourglass size={I} />,
  'Offers cancelled': <X size={I} />,
  'Offers accepted': <Check size={I} />,
  'Offers declined': <Ban size={I} />,
  'Bank trades': <Landmark size={I} />,
  'Cards given to bank': <Landmark size={I} />,
  'Cards from bank': <Landmark size={I} />,
  'Cards stolen': <VenetianMask size={I} />,
  'Cards lost to steals': <ShieldOff size={I} />,
  'Lost to card effects': <Flame size={I} />,
  'Cards discarded': <Trash2 size={I} />,
  Roads: <RoadGlyph size={I} />,
  Ships: <Sailboat size={I} />,
  Settlements: <SettlementGlyph size={I} />,
  Cities: <CityGlyph size={I} />,
  'City walls': <Shield size={I} />,
  Walls: <Shield size={I} />,
  'Free pieces': <Gift size={I} />,
  'First city on turn': <CityGlyph size={I} />,
  'Longest route': <RoadGlyph size={I} />,
  'Turns holding longest route': <RoadGlyph size={I} />,
  'Times taken longest route': <RoadGlyph size={I} />,
  'Roads lost': <RoadGlyph size={I} />,
  'Cards spent': <Coins size={I} />,
  'Development cards': <DevCardGlyph size={I} />,
  'Knight promotions': <ChevronsUp size={I} />,
  'Recruit a knight': <KnightGlyph size={I} />,
  'Activate a knight': <Zap size={I} />,
  'Build that improvement': <Hammer size={I} />,
  'Cards bought': <DevCardGlyph size={I} />,
  'Cards played': <DevCardGlyph size={I} />,
  'Unused at the end': <Archive size={I} />,
  'Knights played': <KnightGlyph size={I} />,
  'Turns holding largest army': <KnightGlyph size={I} />,
  'Times taken largest army': <KnightGlyph size={I} />,
  'Cards drawn': <ScrollText size={I} />,
  'Discarded over the limit': <Trash2 size={I} />,
  'Metropolises gained': <Crown size={I} />,
  'Metropolises lost': <Crown size={I} />,
  'Knights recruited': <KnightGlyph size={I} />,
  Promotions: <ChevronsUp size={I} />,
  Activations: <Zap size={I} />,
  Moves: <Footprints size={I} />,
  'Knights lost': <Skull size={I} />,
  'Knight strength sent': <Shield size={I} />,
  'Top defender': <Shield size={I} />,
  'Cities pillaged': <Flame size={I} />,
  'Merchant placed': <UserRound size={I} />,
  'Ships moved': <Sailboat size={I} />,
  'Hexes discovered': <Compass size={I} />,
  'Islands settled': <Flag size={I} />,
  'Island points': <Flag size={I} />,
  'Treasures found': <Gem size={I} />,
};

/** A card's art on its colour, at row-icon size. */
function CardTile({ card, bg }: { card: Parameters<typeof MiniArt>[0]['card']; bg: string }) {
  return (
    <span className="grid h-5 w-5 place-items-center rounded-md border border-black/30" style={{ background: bg }}>
      <MiniArt card={card} size={15} />
    </span>
  );
}

/** The picture in front of a stat row: the card it counts, its track's commodity, or an icon for the stat. */
export function RowIcon({ row }: { row: StatRow }) {
  const icon = row.card ? (
    <CardTile card={row.card} bg={CARD_COLORS[row.card].bg} />
  ) : row.dev ? (
    <CardTile card={row.dev} bg="#1d5a6b" />
  ) : row.track ? (
    <CardTile card={TRACK_COMMODITY[row.track]} bg={TRACK_STYLE[row.track].color} />
  ) : (
    ROW_ICONS[row.label] ?? null
  );
  return <span aria-hidden className="grid w-5 shrink-0 place-items-center text-ink-soft">{icon}</span>;
}
