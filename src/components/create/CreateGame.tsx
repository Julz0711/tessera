'use client';

import { ArrowLeft, ArrowRight, Bot, Castle, Crown, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FEATURES } from '@/config/features';
import { usePrefs } from '@/client/prefs';
import { api, startConnection, useGame } from '@/client/store';
import type { Mode } from '@/engine/types';
import { sanitizeName } from '@/shared/text';
import { Logomark } from '@/components/ui/Logomark';
import { ProfileFields, type ProfileDraft } from '@/components/profile/ProfileFields';

export function CreateGame() {
  const router = useRouter();
  const prefs = usePrefs();
  const session = useGame((s) => s.session);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [mode, setMode] = useState<Mode>('classic');
  const [bots, setBots] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    prefs.load();
    startConnection().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Profile defaults win for signed-in players; otherwise last-used local preferences.
  useEffect(() => {
    if (!prefs.loaded || draft) return;
    const user = session?.kind === 'user' ? session : null;
    setDraft({
      name: prefs.name || user?.displayName || '',
      color: user?.color ?? prefs.color,
      knight: user?.knight ?? prefs.knight,
    });
  }, [prefs.loaded, session, draft, prefs.name, prefs.color, prefs.knight]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const name = sanitizeName(draft.name, '');
    if (!name) {
      setError('Pick a display name first');
      return;
    }
    setBusy(true);
    setError(null);
    prefs.set({ name, color: draft.color, knight: draft.knight });
    const r = await api.createRoom({ name, color: draft.color, knight: draft.knight }, { mode });
    if (!r.ok) {
      setError(r.error);
      setBusy(false);
      return;
    }
    for (let i = 0; i < bots; i++) await api.addBot();
    router.push(`/r/${r.code}`);
  };

  return (
    <main className="min-h-dvh bg-sea-950 bg-[radial-gradient(ellipse_at_top,_#0f2f3b_0%,_#061419_60%)] px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-foam/70 hover:text-paper">
            <ArrowLeft size={16} /> Back
          </Link>
          <Logomark size={28} />
        </div>
        <form onSubmit={create} className="paper animate-rise p-5 sm:p-7">
          <h1 className="display text-4xl font-black">New game</h1>
          <p className="mt-1 text-ink-soft">Pick how you&apos;ll look at the table. You can change it in the lobby.</p>
          <div className="mt-6">
            {draft ? (
              <ProfileFields value={draft} onChange={setDraft} autoFocus={!draft.name} />
            ) : (
              <div className="h-64 animate-pulse rounded-xl bg-paper-2" />
            )}
          </div>

          <div className="mt-6 grid gap-1.5">
            <span className="label">Game mode</span>
            <div className="grid gap-2 sm:grid-cols-2">
              <ModeCard
                active={mode === 'classic'}
                onClick={() => setMode('classic')}
                icon={<Castle size={22} />}
                title="Classic"
                text="Roads, settlements, cities and development cards. First to 10."
              />
              <ModeCard
                active={mode === 'ck'}
                disabled={!FEATURES.citiesAndKnights}
                onClick={() => setMode('ck')}
                icon={<Crown size={22} />}
                title="Knights & Barbarians"
                text={FEATURES.citiesAndKnights ? 'Knights, barbarians, commodities and city improvements. First to 13.' : 'Coming soon.'}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-1.5">
            <span className="label">Fill seats with bots</span>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setBots(n)}
                  aria-pressed={bots === n}
                  className={`flex items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-sm font-bold transition ${
                    bots === n ? 'border-ink bg-ink text-paper' : 'border-ink/25 bg-white/50 hover:border-ink/60'
                  }`}
                >
                  {n === 0 ? 'Friends only' : (
                    <>
                      <Bot size={15} /> {n}
                    </>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-faint">You can add or remove bots in the lobby too.</p>
          </div>

          {error && <p className="mt-4 rounded-lg bg-terracotta/15 px-3 py-2 text-sm font-bold text-danger">{error}</p>}
          <div className="mt-7 flex justify-end">
            <button type="submit" className="btn btn-primary px-7 py-3 text-lg" disabled={busy || !draft}>
              {busy ? <Loader2 className="animate-spin" size={20} /> : null}
              Create room <ArrowRight size={20} strokeWidth={3} />
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function ModeCard({
  active,
  disabled,
  onClick,
  icon,
  title,
  text,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={`flex gap-3 rounded-xl border-2 p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
        active ? 'border-ink bg-amber/40 shadow-[0_3px_0_0_#1f1a14]' : 'border-ink/25 bg-white/40 hover:border-ink/60'
      }`}
    >
      <span className="mt-0.5">{icon}</span>
      <span>
        <span className="block font-extrabold">{title}</span>
        <span className="block text-sm text-ink-soft">{text}</span>
      </span>
    </button>
  );
}
