'use client';

import { ArrowLeft, Crown, Database, LogOut, Pencil, Save, Swords, Trophy } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { signOut, startSignIn } from '@/client/auth';
import { usePrefs } from '@/client/prefs';
import { ensureSession } from '@/client/session';
import type { ProfileData } from '@/shared/protocol';
import { PLAYER_COLORS } from '@/shared/colors';
import { DEFAULT_KNIGHT } from '@/shared/knight';
import { PlayerPortrait, TitleTag } from './Cosmetics';
import { FriendsPanel } from '@/components/social/FriendsPanel';
import { DiscordMark, GoogleMark } from '@/components/ui/Glyphs';
import { Logomark } from '@/components/ui/Logomark';
import { Modal } from '@/components/ui/Modal';

const KnightPreview3D = dynamic(() => import('@/components/knight/KnightPreview3D'), { ssr: false });

export async function fetchProfile(): Promise<ProfileData | null> {
  await ensureSession();
  const res = await fetch('/api/profile', { credentials: 'same-origin' });
  return res.ok ? ((await res.json()) as ProfileData) : null;
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink/10 py-2 last:border-0">
      <span className="text-sm font-bold text-ink-soft">{label}</span>
      <span className="display text-2xl font-black tabular">{value}</span>
    </div>
  );
}

export function SignInChoices({ data }: { data: ProfileData }) {
  const { google, discord } = data.session.auth;
  if (!google && !discord) {
    return <p className="text-sm text-ink-soft">Sign-in isn&apos;t configured on this server yet. You can keep playing as a guest.</p>;
  }
  return (
    <div className="grid gap-2">
      {google && (
        <button type="button" className="btn justify-start px-4 py-3" onClick={() => startSignIn('google')}>
          <GoogleMark size={20} /> Continue with Google
        </button>
      )}
      {discord && (
        <button type="button" className="btn justify-start px-4 py-3" onClick={() => startSignIn('discord')}>
          <DiscordMark size={20} /> Continue with Discord
        </button>
      )}
    </div>
  );
}

export function ProfilePage() {
  const prefs = usePrefs();
  const [data, setData] = useState<ProfileData | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    prefs.load();
    fetchProfile()
      .then((d) => (d ? setData(d) : setFailed(true)))
      .catch(() => setFailed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = data?.session;
  const user = s?.kind === 'user';
  const name = s?.displayName || prefs.name || 'Guest';
  const color = s?.color ?? prefs.color;
  const knight = s?.knight ?? prefs.knight ?? DEFAULT_KNIGHT;
  const cosmetics = s?.cosmetics ?? prefs.cosmetics;
  const stats = s?.stats ?? { gamesPlayed: 0, gamesWon: 0 };
  const winRate = stats.gamesPlayed ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

  return (
    <main className="min-h-dvh bg-[radial-gradient(ellipse_at_top,_#0f2f3b_0%,_#061419_60%)] px-4 py-6 sm:py-10">
      <div className="mx-auto grid max-w-3xl gap-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-foam/70 hover:text-paper">
            <ArrowLeft size={16} /> Home
          </Link>
          <Logomark size={28} />
        </div>

        {failed && <p className="paper p-5">Couldn&apos;t load your profile. Is the server running?</p>}

        {data && (
          <section className="paper animate-rise grid gap-6 p-5 sm:grid-cols-[1fr_auto] sm:p-7">
            <div className="grid content-start gap-4">
              <div className="flex items-center gap-4">
                <PlayerPortrait knight={knight} color={color} avatarUrl={user ? s?.avatarUrl : null} frame={cosmetics.frame} size={92} />
                <div className="min-w-0">
                  <h1 className="display truncate text-4xl font-black">{name}</h1>
                  <TitleTag title={cosmetics.title} className="mb-1" />
                  <p className="text-sm font-bold text-ink-faint">
                    {user ? `Signed in with ${data.providers.map((p) => p[0].toUpperCase() + p.slice(1)).join(' & ') || 'your account'}` : 'Guest'}
                  </p>
                </div>
              </div>
              <div>
                <Stat label="Games played" value={stats.gamesPlayed} />
                <Stat label="Games won" value={stats.gamesWon} />
                <Stat label="Win rate" value={`${winRate}%`} />
                <Stat label="Favorite mode" value={data.favoriteMode === 'ck' ? 'C&K' : data.favoriteMode === 'classic' ? 'Classic' : '—'} />
                {data.rating && (
                  <Stat
                    label="Rating"
                    value={
                      <span className="flex items-baseline gap-2">
                        {data.rating.place && <span className="text-sm font-bold text-ink-faint">#{data.rating.place}</span>}
                        {data.rating.rating}
                      </span>
                    }
                  />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/settings" className="btn px-4 py-2">
                  <Pencil size={16} /> Edit profile
                </Link>
                <Link href="/leaderboard" className="btn px-4 py-2">
                  <Trophy size={16} /> Leaderboard
                </Link>
                {user ? (
                  <button type="button" className="btn btn-ghost px-4 py-2" onClick={() => void signOut()}>
                    <LogOut size={16} /> Sign out
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary px-4 py-2" onClick={() => setSaving(true)}>
                    <Save size={16} /> Save my profile
                  </button>
                )}
              </div>
              {!data.session.persistence && (
                <p className="flex items-start gap-2 rounded-xl bg-paper-2 p-3 text-xs font-semibold text-ink-soft">
                  <Database size={14} className="mt-0.5 shrink-0" />
                  This server runs without a database, so stats and history aren&apos;t kept between visits. Everything else works.
                </p>
              )}
            </div>
            <div className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-paper-2 p-3">
              <KnightPreview3D knight={knight} color={color} size={200} />
              <span className="label">Your knight</span>
            </div>
          </section>
        )}

        {data && user && (
          <section className="paper grid gap-3 p-5 sm:p-7">
            <h2 className="display text-2xl font-black">Friends</h2>
            <FriendsPanel />
          </section>
        )}

        {data && (
          <section className="grid gap-3">
            <h2 className="display text-2xl font-black text-paper">Game history</h2>
            {data.history.length === 0 && <p className="text-foam/60">No finished games yet — go win one!</p>}
            {data.history.map((g) => (
              <article key={g.gameId} className="paper-flat flex flex-wrap items-center gap-3 p-3">
                <span className={`grid h-10 w-10 place-items-center rounded-xl border-2 border-ink ${g.won ? 'bg-amber' : 'bg-paper-2'}`}>
                  {g.won ? <Trophy size={18} /> : <span className="display text-lg font-black">{g.rank ?? '–'}</span>}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-extrabold">
                    {g.won ? 'Victory' : g.rank ? `Finished #${g.rank}` : 'Played'}
                    <span className="flex items-center gap-1 rounded bg-ink px-1.5 text-[10px] font-black uppercase tracking-wider text-paper">
                      {g.mode === 'ck' ? <Crown size={10} /> : <Swords size={10} />} {g.mode === 'ck' ? 'C&K' : 'Classic'}
                    </span>
                  </div>
                  <p className="text-xs text-ink-faint">
                    {new Date(g.endedAt ?? g.startedAt).toLocaleString()}
                    {g.ratingDelta !== null && (
                      <span className={`ml-2 font-black ${g.ratingDelta >= 0 ? 'text-moss' : 'text-danger'}`}>
                        {g.ratingDelta >= 0 ? '+' : ''}
                        {g.ratingDelta} rating
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.players.map((p, i) => (
                    <span
                      key={i}
                      className={`rounded-md px-2 py-0.5 text-xs font-bold ${p.isYou ? 'ring-2 ring-ink' : ''}`}
                      style={{ background: PLAYER_COLORS[p.color].hex, color: PLAYER_COLORS[p.color].ink }}
                    >
                      {p.name} · {p.vp ?? '?'}
                      {p.won ? ' 🏆' : ''}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </section>
        )}
      </div>

      {data && (
        <Modal open={saving} onClose={() => setSaving(false)} title="Save your profile">
          <p className="mb-4 text-sm text-ink-soft">
            Keep your stats ({stats.gamesPlayed} games, {stats.gamesWon} wins), history and knight across devices. Choose how to sign in:
          </p>
          <SignInChoices data={data} />
        </Modal>
      )}
    </main>
  );
}
