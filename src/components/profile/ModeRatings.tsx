import Link from 'next/link';
import { MODE_LABEL, type ModeRating } from '@/shared/ratings';

export function ModeRatings({ ratings }: { ratings: ModeRating[] }) {
  return <div className="grid gap-3 sm:grid-cols-2">{ratings.map((r) => (
    <div key={r.pool} className="rounded-xl bg-paper-2 p-4">
      <Link href={`/leaderboard?mode=${r.pool}`} className="text-sm font-extrabold hover:underline">{MODE_LABEL[r.pool]}</Link>
      <p className="display my-1 text-3xl font-black tabular">{r.ratedGames ? r.rating : 'Unrated'} <span className="font-sans text-xs font-semibold text-ink-faint">{r.ratedGames > 0 && r.ratedGames < 10 ? 'Provisional' : r.ratedGames > 0 ? 'Elo' : ''}</span></p>
      <p className="text-xs font-semibold text-ink-soft">{r.ratedGames} rated {r.ratedGames === 1 ? 'game' : 'games'} · {r.ratedWins} {r.ratedWins === 1 ? 'win' : 'wins'}{r.ratedGames > 0 ? ` · ${Math.round(r.ratedWins / r.ratedGames * 100)}%` : ''}</p>
      {r.place !== null && <p className="mt-1 text-xs text-ink-faint">World #{r.place} · Peak {r.peakRating}</p>}
    </div>
  ))}</div>;
}
