'use client';

import { ArrowLeft, Box, Check, Grid2x2, Loader2, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePrefs } from '@/client/prefs';
import { BOARD_THEMES } from '@/client/themes';
import { ThemeSwatch } from '@/components/ui/ThemeSwatch';
import { play, setVolume, type Sfx } from '@/client/sound';
import { toast } from '@/client/store';
import type { PlayerColor } from '@/engine/types';
import { clampCosmetics, DEFAULT_COSMETICS, NO_UNLOCKS, type Cosmetics } from '@/shared/cosmetics';
import type { KnightCustomization } from '@/shared/knight';
import type { ProfileData, ProfilePreferences, ProfileUpdate } from '@/shared/protocol';
import { NAME_MAX, sanitizeName } from '@/shared/text';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { KnightCustomizer } from '@/components/knight/KnightCustomizer';
import { CosmeticsPicker } from './Cosmetics';
import { Logomark } from '@/components/ui/Logomark';
import { fetchProfile } from './ProfilePage';

const SOUND_SAMPLES: [string, Sfx][] = [
  ['Dice', 'dice'],
  ['City', 'city'],
  ['Your turn', 'turn'],
  ['Trade offer', 'offer'],
  ['Robber', 'robber'],
  ['Barbarians', 'barbarianAttack'],
  ['Award', 'award'],
  ['Metropolis', 'metropolis'],
  ['Victory', 'win'],
];

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="grid gap-2 border-b border-ink/10 py-5 first:pt-0 last:border-0">
      <span className="label">{title}</span>
      {children}
      {hint && <p className="text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

export function SettingsPage() {
  const prefs = usePrefs();
  const [data, setData] = useState<ProfileData | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState<PlayerColor>('red');
  const [knight, setKnight] = useState<KnightCustomization>({ face: null });
  const [cosmetics, setCosmetics] = useState<Cosmetics>(DEFAULT_COSMETICS);
  const [view, setView] = useState<'3d' | '2d'>('3d');
  const [graphics, setGraphics] = useState<'high' | 'low'>('high');
  const [volume, setVol] = useState(0.6);
  const [useProviderAvatar, setUseProviderAvatar] = useState(true);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    prefs.load();
    fetchProfile()
      .then((d) => {
        const p = usePrefs.getState();
        const s = d?.session;
        const pr: ProfilePreferences = d?.preferences ?? {};
        setData(d);
        setName(s?.displayName || p.name);
        setColor(s?.color ?? p.color);
        setKnight(s?.knight ?? p.knight);
        setCosmetics(clampCosmetics(s?.cosmetics ?? p.cosmetics, s?.unlocks ?? NO_UNLOCKS));
        setView(pr.view ?? p.view);
        setGraphics(pr.graphics ?? p.graphics);
        setVol(pr.volume ?? p.volume);
        setUseProviderAvatar(pr.useProviderAvatar ?? true);
      })
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const user = data?.session.kind === 'user';

  const save = async () => {
    const clean = sanitizeName(name, '');
    if (!clean) {
      toast('Pick a display name', 'error');
      return;
    }
    setBusy(true);
    prefs.set({ name: clean, color, knight, cosmetics, view, graphics, volume });
    setVolume(volume);
    if (data?.session.persistence) {
      const body: ProfileUpdate = { displayName: clean, color, knight, cosmetics, preferences: { view, graphics, volume, language: 'en', useProviderAvatar } };
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setBusy(false);
        toast('Could not save your profile', 'error');
        return;
      }
      setData((await res.json()) as ProfileData);
    }
    setBusy(false);
    toast('Settings saved', 'good');
  };

  return (
    <main className="min-h-dvh bg-[radial-gradient(ellipse_at_top,_#0f2f3b_0%,_#061419_60%)] px-4 py-6 sm:py-10">
      <div className="mx-auto grid max-w-2xl gap-5">
        <div className="flex items-center justify-between">
          <Link href="/profile" className="flex items-center gap-2 text-sm font-bold text-foam/70 hover:text-paper">
            <ArrowLeft size={16} /> Profile
          </Link>
          <Logomark size={28} />
        </div>
        <section className="paper animate-rise p-5 sm:p-7">
          <h1 className="display text-4xl font-black">Settings</h1>
          <p className="mb-6 mt-1 text-ink-soft">
            {user ? 'Saved to your profile and used on every device.' : 'Saved in this browser. Sign in to keep them everywhere.'}
          </p>
          {!ready ? (
            <div className="h-72 animate-pulse rounded-xl bg-paper-2" />
          ) : (
            <>
              <Section title="Display name">
                <input className="input" value={name} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)} />
              </Section>
              {user && data?.session && (
                <Section title="Avatar" hint="Other players see your avatar in lobbies.">
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input type="checkbox" className="accent-ink" checked={useProviderAvatar} onChange={(e) => setUseProviderAvatar(e.target.checked)} />
                    Use my {data.providers.includes('discord') ? 'Discord' : 'Google'} picture (otherwise your knight)
                  </label>
                </Section>
              )}
              <Section title="Default player color">
                <ColorPicker value={color} onChange={setColor} />
              </Section>
              <Section title="Knight">
                <KnightCustomizer value={knight} color={color} onChange={setKnight} />
              </Section>
              <Section
                title="Frame & title"
                hint={
                  data?.session.persistence
                    ? 'Shown next to your name in lobbies, games and on the leaderboard. Play and win to unlock more.'
                    : 'Play and win to unlock more. Progress is only kept when the server has a database.'
                }
              >
                <CosmeticsPicker value={cosmetics} onChange={setCosmetics} stats={data?.session.unlocks ?? NO_UNLOCKS} knight={knight} color={color} />
              </Section>
              <Section title="Sound">
                <div className="flex items-center gap-3">
                  <Volume2 size={18} />
                  <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVol(Number(e.target.value))} className="flex-1 accent-ink" aria-label="Volume" />
                  <span className="w-10 text-right text-sm font-bold tabular">{Math.round(volume * 100)}%</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs font-bold text-ink-faint">Try:</span>
                  {SOUND_SAMPLES.map(([label, sfx]) => (
                    <button
                      key={sfx}
                      type="button"
                      className="btn px-2.5 py-1 text-xs"
                      onClick={() => {
                        setVolume(volume);
                        play(sfx);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Section>
              <Section title="Graphics" hint="The 2D board is lighter on older phones and laptops. You can switch any time during a game.">
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={`btn px-4 py-2 ${view === '3d' ? 'btn-primary' : ''}`} onClick={() => setView('3d')}>
                    <Box size={16} /> 3D board
                  </button>
                  <button type="button" className={`btn px-4 py-2 ${view === '2d' ? 'btn-primary' : ''}`} onClick={() => setView('2d')}>
                    <Grid2x2 size={16} /> 2D board
                  </button>
                  <span className="mx-1 w-px self-stretch bg-ink/10" />
                  {(['high', 'low'] as const).map((q) => (
                    <button key={q} type="button" className={`btn px-4 py-2 capitalize ${graphics === q ? 'btn-primary' : ''}`} onClick={() => setGraphics(q)}>
                      {q} quality
                    </button>
                  ))}
                </div>
              </Section>
              <Section title="Board theme" hint="How the island looks, on the 3D and the 2D board. Only your screen changes; you can switch any time during a game.">
                <div className="grid gap-2 sm:grid-cols-2">
                  {BOARD_THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`btn justify-start gap-3 px-3 py-2 text-left ${prefs.boardTheme === t.id ? 'btn-primary' : ''}`}
                      onClick={() => prefs.set({ boardTheme: t.id })}
                    >
                      <ThemeSwatch theme={t.id} size={44} />
                      <span className="grid min-w-0">
                        <span className="font-extrabold">{t.name}</span>
                        <span className="truncate text-xs font-semibold opacity-75">{t.blurb}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </Section>
              <Section title="Board size" hint="Size of the pieces, number tokens and harbors on the board.">
                <div className="flex flex-wrap gap-2">
                  {(['small', 'medium', 'large'] as const).map((s) => (
                    <button key={s} type="button" className={`btn px-4 py-2 capitalize ${prefs.boardScale === s ? 'btn-primary' : ''}`} onClick={() => prefs.set({ boardScale: s })}>
                      {s}
                    </button>
                  ))}
                </div>
              </Section>
              <Section title="Animations" hint="Cards flying to whoever gets them. System follows your device's reduce-motion setting; Reduced shows cards where they land instead.">
                <div className="flex flex-wrap gap-2">
                  {(['system', 'full', 'reduced'] as const).map((m) => (
                    <button key={m} type="button" className={`btn px-4 py-2 capitalize ${prefs.motion === m ? 'btn-primary' : ''}`} onClick={() => prefs.set({ motion: m })}>
                      {m}
                    </button>
                  ))}
                </div>
              </Section>
              <Section title="Language" hint="More languages are planned.">
                <select className="input max-w-xs" value="en" disabled aria-label="Language">
                  <option value="en">English</option>
                </select>
              </Section>
              <div className="flex justify-end pt-2">
                <button type="button" className="btn btn-primary px-6 py-2.5" onClick={save} disabled={busy}>
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save settings
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
