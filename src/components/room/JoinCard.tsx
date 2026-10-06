'use client';

import { Eye, Loader2, LogIn } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePrefs } from '@/client/prefs';
import { api, useGame } from '@/client/store';
import { sanitizeName } from '@/shared/text';
import { ProfileFields, type ProfileDraft } from '@/components/profile/ProfileFields';

/** Shown to someone opening an invite link who isn't seated yet. */
export function JoinCard({ code, onJoined }: { code: string; onJoined: () => void }) {
  const prefs = usePrefs();
  const session = useGame((s) => s.session);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [busy, setBusy] = useState<'play' | 'watch' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    prefs.load();
  }, [prefs]);
  useEffect(() => {
    if (!prefs.loaded || draft) return;
    const user = session?.kind === 'user' ? session : null;
    setDraft({ name: prefs.name || user?.displayName || '', color: user?.color ?? prefs.color, knight: user?.knight ?? prefs.knight });
  }, [prefs.loaded, session, draft, prefs.name, prefs.color, prefs.knight]);

  const join = async (spectate: boolean) => {
    if (!draft) return;
    const name = sanitizeName(draft.name, '');
    if (!spectate && !name) {
      setError('Pick a display name first');
      return;
    }
    setBusy(spectate ? 'watch' : 'play');
    setError(null);
    if (name) prefs.set({ name, color: draft.color, knight: draft.knight });
    const r = await api.joinRoom(code, { name: name || 'Spectator', color: draft.color, knight: draft.knight }, spectate);
    setBusy(null);
    if (r.ok) onJoined();
    else setError(r.error);
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="paper animate-rise p-5 sm:p-7">
        <p className="label">You&apos;re invited</p>
        <h1 className="display mt-1 text-4xl font-black">
          Room <span className="whitespace-nowrap tabular tracking-label">{code.slice(0, 4)}-{code.slice(4)}</span>
        </h1>
        <p className="mt-1 text-ink-soft">Choose how you&apos;ll appear at the table.</p>
        <div className="mt-6">{draft ? <ProfileFields value={draft} onChange={setDraft} autoFocus={!draft.name} /> : <div className="h-64 animate-pulse rounded-xl bg-paper-2" />}</div>
        {error && <p className="mt-4 rounded-lg bg-terracotta/15 px-3 py-2 text-sm font-bold text-danger">{error}</p>}
        <div className="mt-7 flex flex-wrap justify-end gap-3">
          <button type="button" className="btn px-5 py-3" onClick={() => join(true)} disabled={!!busy}>
            {busy === 'watch' ? <Loader2 size={18} className="animate-spin" /> : <Eye size={18} />} Just watch
          </button>
          <button type="button" className="btn btn-primary px-7 py-3 text-lg" onClick={() => join(false)} disabled={!!busy || !draft}>
            {busy === 'play' ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={20} />} Join game
          </button>
        </div>
      </div>
    </div>
  );
}
