import type { Mode } from '@/engine/types';

export const RATING_POOLS = ['classic', 'ck'] as const;
export type RatingPool = (typeof RATING_POOLS)[number];
export const MODE_LABEL: Record<RatingPool, string> = { classic: 'Classic', ck: 'Cities & Knights' };
export const ratingPoolFor = (mode: Mode): RatingPool => mode;
export const isRatingPool = (value: unknown): value is RatingPool => value === 'classic' || value === 'ck';
export interface ModeRating {
  pool: RatingPool;
  rating: number;
  ratedGames: number;
  ratedWins: number;
  peakRating: number;
  place: number | null;
}
export const emptyRatings = (): ModeRating[] => RATING_POOLS.map((pool) => ({ pool, rating: 1000, ratedGames: 0, ratedWins: 0, peakRating: 1000, place: null }));
