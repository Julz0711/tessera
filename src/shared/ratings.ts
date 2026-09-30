import { GAME_TYPES, MAPS, gameTypeOf, type GameType } from '@/engine/maps';
import type { MapId, Mode } from '@/engine/types';

export const RATING_POOLS = GAME_TYPES.map(({ id }) => id);
export type RatingPool = GameType;
export const MODE_LABEL = Object.fromEntries(GAME_TYPES.map(({ id, label }) => [id, label])) as Record<RatingPool, string>;
/** Match the lobby's mode classification, including map-based Voyagers and Special modes. */
export const ratingPoolFor = (mode: Mode, map: string | undefined): RatingPool =>
  gameTypeOf(map && Object.hasOwn(MAPS, map) ? map as MapId : 'standard', mode);
export const isRatingPool = (value: unknown): value is RatingPool => GAME_TYPES.some(({ id }) => id === value);
export interface ModeRating {
  pool: RatingPool;
  rating: number;
  ratedGames: number;
  ratedWins: number;
  peakRating: number;
  place: number | null;
}
export const emptyRatings = (): ModeRating[] => RATING_POOLS.map((pool) => ({ pool, rating: 1000, ratedGames: 0, ratedWins: 0, peakRating: 1000, place: null }));
