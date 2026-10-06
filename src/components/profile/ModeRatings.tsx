import Link from 'next/link';
import { MODE_LABEL, type ModeRating } from '@/shared/ratings';

export function ModeRatings({ ratings }: { ratings: ModeRating[] }) {
  return <div className="grid gap-3 sm:grid-cols-2">{ratings.map((r) => (
    <div key={r.pool} className="rounded-xl border-2 border-ink bg-paper-2 p-4">
      <Link href={`/leaderboard?mode=${r.pool}`} className="text-sm font-bold hover:underline">{MODE_LABEL[r.pool]}</Link>
      <p className="my-1">{r.ratedGames ? <span className="display text-3xl font-black">{r.rating}</span> : <span className="inline-block py-1 text-xl font-black">Unrated</span>} <span className="font-sans text-xs font-semibold text-ink-faint">{r.ratedGames > 0 && r.ratedGames < 10 ? 'Provisional' : r.ratedGames > 0 ? 'Elo' : ''}</span></p>
      <p className="text-xs font-semibold text-ink-soft">{r.ratedGames} rated {r.ratedGames === 1 ? 'game' : 'games'} · {r.ratedWins} {r.ratedWins === 1 ? 'win' : 'wins'}{r.ratedGames > 0 ? ` · ${Math.round(r.ratedWins / r.ratedGames * 100)}%` : ''}</p>
      {r.place !== null && <p className="mt-1 text-xs text-ink-faint">World #{r.place} · Peak {r.peakRating}</p>}
    </div>
  ))}</div>;
}
