'use client';

import { ArrowLeft, Database, ShieldCheck, LogOut, Pencil, Save, Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { signOut } from '@/client/auth';
import { usePrefs } from '@/client/prefs';
import { ensureSession } from '@/client/session';
import type { ProfileData, ProgressData } from '@/shared/protocol';
import { itemById } from '@/shared/progression';
import { fetchProgress } from '@/components/progression/ProgressPage';
import { PlayerPortrait } from './PlayerPortrait';
import { GameHistory } from './GameHistory';
import { MODE_LABEL } from '@/shared/ratings';
import { ModeRatings } from './ModeRatings';
import { useUrlFilters } from '@/client/urlFilters';
const PROFILE_FILTERS = { tab: 'overview' };
import { SignInChoices } from '@/components/auth/SignInChoices';
import { FriendsPanel } from '@/components/social/FriendsPanel';
import { Logomark } from '@/components/ui/Logomark';
import { Modal } from '@/components/ui/Modal';

const KnightPreview3D = dynamic(() => import('@/components/knight/KnightPreview3D'), { ssr: false });

export async function fetchProfile(): Promise<ProfileData | null> {
  await ensureSession();
  const res = await fetch('/api/profile', { credentials: 'same-origin' });
  return res.ok ? ((await res.json()) as ProfileData) : null;
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  // Figures stand in the display face; a word (a mode's name) in the UI face, so it doesn't outweigh them.
  const word = typeof value === 'string' && /[a-z]{2}/i.test(value);
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink/10 py-2 last:border-0">
      <span className="text-sm font-bold text-ink-soft">{label}</span>
      <span className={`min-w-0 text-right ${word ? 'text-base font-black' : 'display text-2xl font-black'}`}>{value}</span>
    </div>
  );
}

export function ProfilePage() {
  const prefs = usePrefs();
  const { get, change } = useUrlFilters(PROFILE_FILTERS);
  const tab = ['overview', 'history', 'friends'].includes(get('tab')) ? get('tab') : 'overview';
  const [data, setData] = useState<ProfileData | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    prefs.load();
    fetchProfile()
      .then((d) => (d ? setData(d) : setFailed(true)))
      .catch(() => setFailed(true));
    // Surround and title come from the wardrobe; the portrait shows plain until they arrive.
    fetchProgress().then(setProgress).catch(() => {});
    // Auth.js lands failed sign-ins here with ?error=...; show it once, then drop it from the URL.
    const error = new URLSearchParams(window.location.search).get('error');
    if (error) {
      setAuthError(error);
      window.history.replaceState(null, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = data?.session;
  const user = s?.kind === 'user';
  const name = s?.displayName || prefs.name || 'Guest';
  const color = s?.color ?? prefs.color;
  const loadout = progress?.loadout;
  const title = loadout?.title ? itemById(loadout.title)?.name : null;
  const stats = s?.stats ?? { gamesPlayed: 0, gamesWon: 0 };
  const winRate = stats.gamesPlayed ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

  return (
    <main className="page-safe-top min-h-dvh bg-[radial-gradient(ellipse_at_top,_#0f2f3b_0%,_#061419_60%)] px-4 py-6 sm:py-10">
      <div className="mx-auto grid max-w-3xl gap-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-foam/70 hover:text-paper">
            <ArrowLeft size={16} /> Home
          </Link>
          <div className="flex items-center gap-3">
            {data?.isAdmin && <Link href="/admin" className="btn btn-dark px-3 py-1.5 text-sm"><ShieldCheck size={16} /> Admin</Link>}
            <Logomark size={28} />
          </div>
        </div>

        {failed && <p className="paper p-5">Couldn&apos;t load your profile. Is the server running?</p>}
        {authError && <p className="paper-flat p-3 text-sm font-semibold text-terracotta">Sign-in didn&apos;t go through. Give it another try.</p>}

        {data && <nav aria-label="Profile sections" role="radiogroup" className="seg">{['overview', 'history', 'friends'].map((name) => (
          <button key={name} type="button" role="radio" aria-checked={tab === name} onClick={() => change({ tab: name })} className="seg-opt px-4 capitalize">{name}</button>
        ))}</nav>}
        {data && tab === 'overview' && (
          <section className="paper animate-rise grid grid-cols-[minmax(0,1fr)] gap-6 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-7">
            <div className="grid min-w-0 content-start gap-4">
              <div className="flex items-start gap-4">
                <PlayerPortrait color={color} avatarUrl={user ? s?.avatarUrl : null} surround={loadout?.surround} size={92} />
                <div className="min-w-0 flex-1">
                  <h1 className="display truncate text-4xl font-black">{name}</h1>
                  {title && <p className="mb-1 text-sm font-black text-ink-soft">{title}</p>}
                  <p className="text-sm font-bold text-ink-faint">
                    {user ? `Signed in with ${data.providers.map((p) => p[0].toUpperCase() + p.slice(1)).join(' & ') || 'your account'}` : 'Guest'}
                  </p>
                </div>
                <Link href="/progress" className="btn shrink-0 px-3 py-2" aria-label="Progress" title="Progress">
                  <Sparkles size={16} /> <span className="hidden sm:inline">Progress</span>
                </Link>
                <Link href="/profile/edit" className="btn shrink-0 px-3 py-2" aria-label="Edit profile" title="Edit profile">
                  <Pencil size={16} /> <span className="hidden sm:inline">Edit profile</span>
                </Link>
              </div>
              <div>
                <Stat label="Games played" value={stats.gamesPlayed} />
                <Stat label="Games won" value={stats.gamesWon} />
                <Stat label="Win rate" value={`${winRate}%`} />
                <Stat label="Recent favorite mode" value={data.favoriteMode ? MODE_LABEL[data.favoriteMode] : '—'} />
                {data.session.persistence && (
                  <Stat
                    label={data.accuracy?.games ? `Accuracy (last ${data.accuracy.games} game${data.accuracy.games === 1 ? '' : 's'})` : 'Accuracy'}
                    value={data.accuracy?.average != null ? Math.round(data.accuracy.average) : '—'}
                  />
                )}

              </div>
              <div className="flex flex-wrap gap-2 empty:hidden">
                {user ? (
                  <button type="button" className="btn btn-ghost px-4 py-2" onClick={() => void signOut()}>
                    <LogOut size={16} /> Sign out
                  </button>
                ) : (
                  // Saving a guest profile means signing in; hidden when this server has no sign-in set up.
                  (data.session.auth.google || data.session.auth.discord) && (
                    <button type="button" className="btn btn-primary px-4 py-2" onClick={() => setSaving(true)}>
                      <Save size={16} /> Save my profile
                    </button>
                  )
                )}
              </div>
              {!data.session.persistence && (
                <p className="flex items-start gap-2 rounded-xl border-2 border-ink bg-paper-2 p-3 text-xs font-semibold text-ink-soft">
                  <Database size={14} className="mt-0.5 shrink-0" />
                  This server runs without a database, so stats and history aren&apos;t kept between visits. Everything else works.
                </p>
              )}
            </div>
            <div className="flex min-w-0 flex-col items-center gap-1 overflow-hidden rounded-2xl border-2 border-ink bg-paper-2 p-3">
              {/* The knight stands in the middle of the card; its caption sits on the bottom edge. */}
              <div className="grid flex-1 place-items-center">
                <KnightPreview3D color={color} size={200} />
              </div>
              <span className="label">Your knight</span>
            </div>
          </section>
        )}

        {data && tab === 'overview' && user && <section className="paper grid gap-3 p-5"><h2 className="display text-2xl font-black">Ratings by mode</h2><ModeRatings ratings={data.ratings} /><p className="text-xs text-ink-faint">Each mode has its own ladder. Classic, Knights &amp; Barbarians, Voyagers and Special are rated separately; your first 10 rated games are provisional.</p>{!!data.rating?.ratedGames && <p className="text-xs text-ink-faint">Legacy shared rating: {data.rating.rating} &middot; {data.rating.ratedGames} games before mode ladders.</p>}</section>}
        {data && tab === 'friends' && (
          <section className="paper grid gap-3 p-5 sm:p-7">
            <h2 className="display text-2xl font-black">Friends</h2>
            <FriendsPanel />
          </section>
        )}

        {data && tab === 'history' && <GameHistory />}
      </div>

      {data && (
        <Modal open={saving} onClose={() => setSaving(false)} title="Save your profile">
          <p className="mb-4 text-sm text-ink-soft">
            Keep your stats ({stats.gamesPlayed} games, {stats.gamesWon} wins), history and knight across devices. Choose how to sign in:
          </p>
          <SignInChoices auth={data.session.auth} />
        </Modal>
      )}
    </main>
  );
}
