'use client';

import { ArrowLeft, Check, Lock } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePrefs } from '@/client/prefs';
import { ensureSession } from '@/client/session';
import { api, toast, useGame } from '@/client/store';
import { useUrlFilters } from '@/client/urlFilters';
import type { PlayerColor } from '@/engine/types';
import { featById, SLOTS, unlockText, type Loadout, type Slot } from '@/shared/progression';
import type { ProgressData } from '@/shared/protocol';
import { HexSpinner } from '@/components/ui/HexSpinner';
import { Logomark } from '@/components/ui/Logomark';
import { Segmented } from '@/components/ui/Segmented';
import { ItemArt, LevelBadge } from './ItemArt';

const FILTERS = { tab: 'progress', slot: 'character' };
const SLOT_LABEL: Record<Slot, string> = { character: 'Characters', banner: 'Banners', title: 'Titles', surround: 'Surrounds' };
type ItemRow = ProgressData['items'][number];

export async function fetchProgress(): Promise<ProgressData | null> {
  await ensureSession();
  const res = await fetch('/api/progress', { credentials: 'same-origin' });
  return res.ok ? ((await res.json()) as ProgressData) : null;
}

const requirement = (i: ItemRow) => unlockText(i.unlock, (id) => featById(id)?.description ?? id);

function Bar({ value, max, tone = 'sea' }: { value: number; max: number; tone?: 'sea' | 'amber' }) {
  return (
    <div className="h-3 overflow-hidden rounded-[4px] border-2 border-ink bg-paper-2" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className={`h-full ${tone === 'amber' ? 'bg-amber' : 'bg-sea-500'}`} style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%` }} />
    </div>
  );
}

function Overview({ data, color }: { data: ProgressData; color: PlayerColor }) {
  const { level } = data;
  const next = data.items
    .filter((i) => !i.unlocked && i.unlock.kind === 'level')
    .sort((a, b) => (a.unlock.kind === 'level' && b.unlock.kind === 'level' ? a.unlock.n - b.unlock.n : 0))
    .slice(0, 6);
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <LevelBadge level={level.level} size={60} />
        <div className="min-w-[220px] flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="display text-2xl font-black">Level {level.level}</h2>
            <span className="text-sm font-bold text-ink-soft tabular">{level.into.toLocaleString()} / {level.need.toLocaleString()} XP to level {level.level + 1}</span>
          </div>
          <div className="mt-2"><Bar value={level.into} max={level.need} tone="amber" /></div>
          <p className="mt-1 text-xs text-ink-faint tabular">{level.xp.toLocaleString()} XP in total</p>
        </div>
      </div>

      <section className="grid gap-2">
        <h3 className="label">Next rewards</h3>
        {next.length ? (
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {next.map((i) => (
              <li key={i.id} className="paper-flat flex w-28 shrink-0 flex-col items-center gap-1 p-2 text-center">
                <div className="flex h-16 items-center justify-center"><ItemArt id={i.id} color={color} size={56} /></div>
                <span className="text-xs font-black">{i.slot === 'title' ? 'Title' : i.name}</span>
                <span className="text-[11px] font-bold text-ink-faint">{requirement(i)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">Every level reward is yours. Feats still have more.</p>
        )}
      </section>

      <section className="grid gap-2">
        <h3 className="label">Collection</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {SLOTS.map((slot) => {
            const all = data.items.filter((i) => i.slot === slot);
            const have = all.filter((i) => i.unlocked).length;
            return (
              <div key={slot} className="grid gap-1">
                <div className="flex justify-between text-sm font-bold"><span>{SLOT_LABEL[slot]}</span><span className="tabular">{have} / {all.length}</span></div>
                <Bar value={have} max={all.length} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-2">
        <h3 className="label">Feats</h3>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.feats.map((f) => (
            <li key={f.id} className={`flex flex-col gap-1.5 rounded-[6px] border-2 border-ink p-3 ${f.doneAt ? 'bg-pick' : 'bg-paper'}`}>
              <span className="flex items-center gap-1.5 font-black">{f.doneAt && <Check size={16} strokeWidth={3} />}{f.name}</span>
              <span className="text-sm text-ink-soft">{f.description}</span>
              <Bar value={f.n} max={f.target} />
              <span className="flex justify-between text-xs font-bold"><span className="tabular text-ink-soft">{f.n} / {f.target}</span><span className="text-sea-600">+{f.xp} XP</span></span>
            </li>
          ))}
        </ul>
      </section>

      {data.recent.length > 0 && (
        <section className="grid gap-2">
          <h3 className="label">Recent games</h3>
          <ul className="grid gap-1 text-sm">
            {data.recent.map((r) => (
              <li key={r.gameId} className="flex justify-between gap-2 border-b border-ink/10 py-1 last:border-0">
                <span className="text-ink-soft">{r.endedAt ? new Date(r.endedAt).toLocaleDateString() : 'Game'} · {r.won ? 'Won' : 'Played'}</span>
                <span className="font-black tabular">+{r.xp} XP</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Wardrobe({ data, color, slot, onSlot, onWear, saving }: {
  data: ProgressData; color: PlayerColor; slot: Slot; onSlot: (s: Slot) => void; onWear: (l: Loadout) => void; saving: boolean;
}) {
  const worn = data.loadout;
  const items = data.items.filter((i) => i.slot === slot);
  return (
    <div className="grid gap-5 md:grid-cols-[220px_1fr]">
      <div className="paper-flat flex flex-col items-center gap-3 p-4">
        <ItemArt id={worn.character} color={color} size={120} />
        <ItemArt id={worn.banner} color={color} size={60} />
        <ItemArt id={worn.surround} color={color} size={56} />
        {worn.title ? <ItemArt id={worn.title} color={color} /> : <span className="text-xs text-ink-faint">No title</span>}
      </div>
      <div className="grid content-start gap-3">
        <Segmented label="Category" className="flex-wrap" value={slot} options={SLOTS.map((s) => ({ value: s, label: SLOT_LABEL[s] }))} onChange={onSlot} />
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2">
          {slot === 'title' && (
            <li>
              <button type="button" disabled={saving} aria-pressed={worn.title === null} onClick={() => onWear({ ...worn, title: null })}
                className={`flex h-full w-full flex-col items-center justify-center gap-1 rounded-[6px] border-2 border-ink p-2 ${worn.title === null ? 'bg-pick' : 'bg-paper'}`}>
                <span className="text-sm font-black">No title</span>
              </button>
            </li>
          )}
          {items.map((i) => {
            const on = worn[slot] === i.id;
            return (
              <li key={i.id}>
                <button type="button" disabled={!i.unlocked || saving} aria-pressed={on} onClick={() => onWear({ ...worn, [slot]: i.id })}
                  className={`relative flex h-full w-full flex-col items-center gap-1 rounded-[6px] border-2 border-ink p-2 ${on ? 'bg-pick' : 'bg-paper'} disabled:cursor-not-allowed`}>
                  {!i.unlocked && <Lock size={14} strokeWidth={3} className="absolute right-1.5 top-1.5" aria-label="Locked" />}
                  <span className={`flex h-16 items-center justify-center ${i.unlocked ? '' : 'opacity-35 grayscale'}`}><ItemArt id={i.id} color={color} size={56} /></span>
                  {slot !== 'title' && <span className="text-xs font-black">{i.name}</span>}
                  <span className="text-[11px] font-bold leading-tight text-ink-faint">{i.unlocked ? 'Unlocked' : requirement(i)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function ProgressPage() {
  const prefs = usePrefs();
  const { get, change } = useUrlFilters(FILTERS);
  const tab = get('tab') === 'wardrobe' ? 'wardrobe' : 'progress';
  const slot = (SLOTS as readonly string[]).includes(get('slot')) ? (get('slot') as Slot) : 'character';
  const [data, setData] = useState<ProgressData | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sessionColor, setSessionColor] = useState<PlayerColor | null>(null);
  const color: PlayerColor = sessionColor ?? prefs.color;

  useEffect(() => {
    prefs.load();
    ensureSession().then((s) => setSessionColor(s.color)).catch(() => {});
    fetchProgress().then((d) => (d ? setData(d) : setFailed(true))).catch(() => setFailed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wear = async (loadout: Loadout) => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch('/api/profile', { method: 'PATCH', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ loadout }) });
      if (!res.ok) throw new Error();
      const fresh = await fetchProgress();
      if (fresh) setData(fresh);
      // Sitting in a lobby: show the new look on your seat too.
      if (useGame.getState().room?.status === 'lobby') void api.crew();
    } catch {
      toast("Couldn't save that. Try again in a moment.", 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page-safe-top min-h-dvh bg-[radial-gradient(ellipse_at_top,_#0f2f3b_0%,_#061419_60%)] px-4 py-8">
      <div className="mx-auto grid max-w-4xl gap-5">
        <div className="flex items-center justify-between">
          <Link href="/profile" className="flex items-center gap-2 text-sm font-bold text-foam/70 hover:text-paper">
            <ArrowLeft size={16} /> Profile
          </Link>
          <Logomark size={28} />
        </div>
        <section className="paper grid gap-5 p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="display text-4xl font-black">Progress</h1>
              <p className="mt-2 text-sm text-ink-soft">Play and win games to level up. Feats and levels unlock what you can wear.</p>
            </div>
            <Segmented label="View" value={tab} options={[{ value: 'progress', label: 'Progress' }, { value: 'wardrobe', label: 'Wardrobe' }]} onChange={(v) => change({ tab: v })} />
          </div>
          {failed && <p role="alert">Couldn&apos;t load your progress. Reload the page to try again.</p>}
          {!data && !failed && <div role="status" className="flex items-center gap-2 text-sm text-ink-faint"><HexSpinner size={16} decorative /> Loading…</div>}
          {data && !data.enabled && <p className="text-sm text-ink-soft">Progress isn&apos;t saved on this server (no database), so everyone stays at level 1.</p>}
          {data && tab === 'progress' && <Overview data={data} color={color} />}
          {data && tab === 'wardrobe' && <Wardrobe data={data} color={color} slot={slot} onSlot={(s) => change({ slot: s })} onWear={wear} saving={saving} />}
          <p className="text-xs text-ink-faint">Characters, banners, titles and surrounds shown here are placeholders while the real art is made.</p>
        </section>
      </div>
    </main>
  );
}
