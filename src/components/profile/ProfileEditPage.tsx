'use client';

import { ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePrefs } from '@/client/prefs';
import { toast } from '@/client/store';
import type { PlayerColor } from '@/engine/types';
import { clampCosmetics, DEFAULT_COSMETICS, NO_UNLOCKS, type Cosmetics } from '@/shared/cosmetics';
import type { KnightCustomization } from '@/shared/knight';
import type { ProfileData, ProfileUpdate } from '@/shared/protocol';
import { NAME_MAX, sanitizeName } from '@/shared/text';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { KnightCustomizer } from '@/components/knight/KnightCustomizer';
import { CosmeticsPicker } from './Cosmetics';
import { Logomark } from '@/components/ui/Logomark';
import { fetchProfile } from './ProfilePage';
import { HexSpinner } from '@/components/ui/HexSpinner';

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="grid gap-2 border-b border-ink/10 py-5 first:pt-0 last:border-0">
      <span className="label">{title}</span>
      {children}
      {hint && <p className="text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

/** Identity editing: display name, avatar, color, knight, frame & title. Game settings live in the settings overlay. */
export function ProfileEditPage() {
  const prefs = usePrefs();
  const [data, setData] = useState<ProfileData | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState<PlayerColor>('red');
  const [knight, setKnight] = useState<KnightCustomization>({ face: null });
  const [cosmetics, setCosmetics] = useState<Cosmetics>(DEFAULT_COSMETICS);
  const [useProviderAvatar, setUseProviderAvatar] = useState(true);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    prefs.load();
    fetchProfile()
      .then((d) => {
        const p = usePrefs.getState();
        const s = d?.session;
        setData(d);
        setName(s?.displayName || p.name);
        setColor(s?.color ?? p.color);
        setKnight(s?.knight ?? p.knight);
        setCosmetics(clampCosmetics(s?.cosmetics ?? p.cosmetics, s?.unlocks ?? NO_UNLOCKS));
        setUseProviderAvatar(d?.preferences.useProviderAvatar ?? true);
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
    prefs.set({ name: clean, color, knight, cosmetics });
    if (data?.session.persistence) {
      const body: ProfileUpdate = { displayName: clean, color, knight, cosmetics, preferences: { useProviderAvatar } };
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
    toast('Profile saved', 'good');
  };

  return (
    <main className="page-safe-top min-h-dvh bg-[radial-gradient(ellipse_at_top,_#0f2f3b_0%,_#061419_60%)] px-4 py-6 sm:py-10">
      <div className="mx-auto grid max-w-2xl gap-5">
        <div className="flex items-center justify-between">
          <Link href="/profile" className="flex items-center gap-2 text-sm font-bold text-foam/70 hover:text-paper">
            <ArrowLeft size={16} /> Profile
          </Link>
          <Logomark size={28} />
        </div>
        <section className="paper animate-rise p-5 sm:p-7">
          <h1 className="display text-4xl font-black">Edit profile</h1>
          <p className="mb-6 mt-1 text-ink-soft">
            {user ? 'Saved to your profile and used on every device.' : 'Saved in this browser. Sign in to keep it everywhere.'}
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
              <div className="flex justify-end pt-2">
                <button type="button" className="btn btn-primary px-6 py-2.5" onClick={save} disabled={busy}>
                  {busy ? <HexSpinner size={16} decorative /> : <Check size={16} />} Save profile
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
