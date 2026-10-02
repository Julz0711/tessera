'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { Mode } from '@/engine';
import { MODE_LABEL, ratingPoolFor } from '@/shared/ratings';

type Tab = 'games' | 'users' | 'guests';
interface Paged<T> { total: number; page: number; pages: number; entries: T[] }
interface Overview { users: number; guests: number; games: number; finished: number; liveRooms: number; livePlaying: number }
interface GameRow { id: string; code: string; mode: Mode; map: string | null; status: string; turns: number; startedAt: string; endedAt: string | null; live: boolean;
  players: { name: string; kind: 'bot' | 'user' | 'guest' | 'gone'; won: boolean; vp: number | null }[] }
interface UserRow { id: string; email: string | null; name: string; createdAt: string; gamesPlayed: number; gamesWon: number; rating: number | null;
  providers: string[]; sessionExpires: string | null; liveRoom: string | null }
interface GuestRow { id: string; displayName: string | null; gamesPlayed: number; gamesWon: number; createdAt: string; lastSeenAt: string; expiresAt: string;
  migratedToUserId: string | null; liveRoom: string | null }

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const input = 'min-w-0 rounded-lg border border-ink/20 bg-paper p-2 text-sm';

async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, body === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? `Request failed (${res.status})`), { status: res.status });
  return data as T;
}

function closedNote(rooms: string[]) {
  return rooms.length ? ` Closed live room${rooms.length > 1 ? 's' : ''} ${rooms.join(', ')}.` : '';
}

function Pager({ data, onPage }: { data: Paged<unknown>; onPage: (p: number) => void }) {
  if (data.pages <= 1) return null;
  return <div className="flex items-center justify-between gap-2 text-sm">
    <button className="btn px-3 py-2" disabled={data.page === 1} onClick={() => onPage(data.page - 1)}>Previous</button>
    <span>{data.page} / {data.pages}</span>
    <button className="btn px-3 py-2" disabled={data.page === data.pages} onClick={() => onPage(data.page + 1)}>Next</button>
  </div>;
}

function Live({ code }: { code: string }) {
  return <span className="rounded bg-terracotta/15 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-terracotta">Live · {code}</span>;
}

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('games');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [overview, setOverview] = useState<Overview | null>(null);
  // Tagged with its tab so a stale page of another tab's rows is never rendered against this tab's columns.
  const [loaded, setLoaded] = useState<(Paged<GameRow | UserRow | GuestRow> & { tab: Tab }) | null>(null);
  const data = loaded?.tab === tab ? loaded : null;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [state, setState] = useState<'loading' | 'ready' | 'denied' | 'error'>('loading');
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  const query = new URLSearchParams({ q, page: String(page), ...(tab === 'games' && status ? { status } : {}) }).toString();
  useEffect(() => {
    let cancelled = false;
    setLoaded(null);
    const timer = setTimeout(() => {
      Promise.all([api<Overview>('/api/admin/overview'), api<Paged<GameRow | UserRow | GuestRow>>(`/api/admin/${tab}?${query}`)])
        .then(([o, d]) => { if (!cancelled) { setOverview(o); setLoaded({ ...d, tab }); setState('ready'); } })
        .catch((err: { status?: number }) => { if (!cancelled) setState(err.status === 404 ? 'denied' : 'error'); });
    }, 150);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [tab, query, reload]);

  const switchTab = (next: Tab) => { setTab(next); setQ(''); setStatus(''); setPage(1); setSelected(new Set()); setMessage(null); };
  const refresh = () => { setSelected(new Set()); setReload((n) => n + 1); };

  const run = useCallback(async (confirmText: string, action: () => Promise<string>) => {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    setMessage(null);
    try {
      setMessage({ text: await action() });
      refresh();
    } catch (err) {
      setMessage({ text: (err as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  }, []);

  const deleteGames = (ids: string[]) => {
    const rows = (data?.entries as GameRow[] | undefined)?.filter((g) => ids.includes(g.id)) ?? [];
    const live = rows.filter((g) => g.live).length;
    return run(
      `Delete ${ids.length} game${ids.length > 1 ? 's' : ''} with all moves, snapshots and reports?`
        + `\nFinished games give back the wins and games played they counted (ratings stay).`
        + (live ? `\n\n${live} of them ${live > 1 ? 'are' : 'is'} being played right now: those tables close for everyone.` : '')
        + '\n\nThis cannot be undone.',
      async () => {
        const r = await api<{ deleted: number; closedRooms: string[] }>('/api/admin/games/delete', { ids });
        return `Deleted ${r.deleted} game${r.deleted === 1 ? '' : 's'}.${closedNote(r.closedRooms)}`;
      },
    );
  };
  const deleteUser = (u: UserRow) => run(
    `Delete the account "${u.name}"${u.email ? ` (${u.email})` : ''}?`
      + '\nRemoves sign-ins, profile, ratings and friendships. Their seats in past games stay as "Deleted player".'
      + (u.liveRoom ? `\n\nThey're at table ${u.liveRoom} right now: it closes for everyone.` : '')
      + '\n\nThis cannot be undone.',
    async () => `Deleted ${u.name}.${closedNote((await api<{ closedRooms: string[] }>('/api/admin/users/delete', { id: u.id })).closedRooms)}`,
  );
  const deleteGuest = (g: GuestRow) => run(
    `Delete guest "${g.displayName ?? g.id.slice(0, 8)}"? Their seats in past games stay as "Deleted player".`
      + (g.liveRoom ? `\n\nThey're at table ${g.liveRoom} right now: it closes for everyone.` : '')
      + '\n\nThis cannot be undone.',
    async () => `Deleted the guest.${closedNote((await api<{ closedRooms: string[] }>('/api/admin/guests/delete', { id: g.id })).closedRooms)}`,
  );

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const games = tab === 'games' ? (data?.entries as GameRow[] | undefined) : undefined;
  const allSelected = !!games?.length && games.every((g) => selected.has(g.id));

  if (state === 'denied') {
    return <main className="page-safe-top grid min-h-dvh place-items-center bg-[radial-gradient(ellipse_at_top,_#0f2f3b_0%,_#061419_60%)] p-4">
      <div className="paper grid max-w-sm gap-3 p-6 text-center"><h1 className="display text-3xl font-black">Not found</h1>
        <p className="text-sm text-ink-soft">This page is only for server admins. <Link className="font-bold underline" href="/profile">Sign in</Link> with an admin account.</p></div>
    </main>;
  }

  return <main className="page-safe-top min-h-dvh bg-[radial-gradient(ellipse_at_top,_#0f2f3b_0%,_#061419_60%)] px-4 py-8">
    <div className="mx-auto grid max-w-5xl gap-5"><Link className="text-sm font-bold text-foam/70 hover:text-paper" href="/">← Home</Link>
      <section className="paper grid gap-5 p-5 sm:p-7">
        <div><h1 className="display text-4xl font-black">Admin</h1>
          <p className="mt-2 text-sm text-ink-soft">Changes apply to the live database straight away. For a formal personal-data erasure request, use <code>npm run privacy:delete</code> instead.</p></div>
        {overview && <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([['Users', overview.users], ['Guests', overview.guests], ['Games', `${overview.games} (${overview.finished} finished)`], ['Live tables', `${overview.liveRooms} (${overview.livePlaying} playing)`]] as const)
            .map(([k, v]) => <div key={k} className="rounded-xl bg-paper-2/70 p-3"><dt className="label">{k}</dt><dd className="text-lg font-black tabular">{v}</dd></div>)}
        </dl>}
        <div role="tablist" aria-label="Tables" className="flex gap-1.5">
          {(['games', 'users', 'guests'] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} className={`btn px-3 py-2 text-sm capitalize ${tab === t ? 'btn-primary' : ''}`} onClick={() => switchTab(t)}>{t}</button>)}
        </div>
        <div className="flex flex-wrap gap-2">
          <input aria-label="Search" className={`${input} basis-full sm:basis-0 sm:flex-1`} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder={tab === 'games' ? 'Room code, player name or game id' : tab === 'users' ? 'Name, email or user id' : 'Name or guest id'} />
          {tab === 'games' && <select aria-label="Status" className={input} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option><option value="playing">Unfinished</option><option value="finished">Finished</option></select>}
          {tab === 'games' && <button className="btn btn-danger px-3 py-2 text-sm" disabled={busy || !selected.size} onClick={() => deleteGames([...selected])}>Delete selected ({selected.size})</button>}
        </div>
        {message && <p role={message.error ? 'alert' : 'status'} className={`rounded-lg p-3 text-sm font-bold ${message.error ? 'bg-terracotta/15 text-terracotta' : 'bg-moss/15 text-moss'}`}>{message.text}</p>}
        {state === 'error' && <div role="alert" className="text-sm">Couldn&apos;t load admin data. <button className="font-bold underline" onClick={refresh}>Try again</button></div>}
        {!data && state !== 'error' && <p role="status" className="text-sm text-ink-faint">Loading…</p>}
        {data && <>
          <p className="label">{data.total} matching</p>
          {!data.entries.length && <p className="text-sm text-ink-soft">Nothing matches.</p>}

          {games && games.length > 0 && <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
            <thead className="label"><tr>
              <th className="p-2"><input type="checkbox" aria-label="Select all on this page" checked={allSelected}
                onChange={() => setSelected(allSelected ? new Set() : new Set(games.map((g) => g.id)))} /></th>
              <th className="p-2">Game</th><th className="p-2">Players</th><th className="p-2">Started</th><th className="p-2" /></tr></thead>
            <tbody>{games.map((g) => <tr key={g.id} className="border-t border-ink/10 align-top">
              <td className="p-2"><input type="checkbox" aria-label={`Select game ${g.code}`} checked={selected.has(g.id)} onChange={() => toggle(g.id)} /></td>
              <td className="p-2"><p className="font-extrabold">{MODE_LABEL[ratingPoolFor(g.mode, g.map ?? undefined)] ?? g.mode} <span className="font-mono text-xs text-ink-faint">{g.code}</span></p>
                <p className="text-xs text-ink-faint">{g.status === 'finished' ? `Finished · ${g.turns} turns` : 'Unfinished'} {g.live && <Live code={g.code} />}</p></td>
              <td className="p-2 text-xs">{g.players.map((p, i) => <span key={i} className={`mr-2 inline-block ${p.won ? 'font-black' : ''}`}>
                {p.won && '★ '}{p.name}<span className="text-ink-faint"> {p.kind === 'user' ? '' : `(${p.kind})`}{p.vp !== null ? ` ${p.vp}VP` : ''}</span></span>)}</td>
              <td className="p-2 text-xs whitespace-nowrap">{date(g.startedAt)}</td>
              <td className="p-2 text-right"><button className="btn btn-danger px-2 py-1 text-xs" disabled={busy} onClick={() => deleteGames([g.id])}>Delete</button></td>
            </tr>)}</tbody></table></div>}

          {tab === 'users' && data.entries.length > 0 && <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
            <thead className="label"><tr><th className="p-2">User</th><th className="p-2">Games</th><th className="p-2">Joined</th><th className="p-2" /></tr></thead>
            <tbody>{(data.entries as UserRow[]).map((u) => <tr key={u.id} className="border-t border-ink/10 align-top">
              <td className="p-2"><p className="font-extrabold">{u.name} {u.liveRoom && <Live code={u.liveRoom} />}</p>
                <p className="text-xs text-ink-faint">{u.email ?? 'no email'} · {u.providers.join(', ') || 'no sign-in'}</p>
                <p className="font-mono text-[10px] text-ink-faint">{u.id}</p></td>
              <td className="p-2 text-xs">{u.gamesPlayed} played · {u.gamesWon} won{u.rating ? ` · best ${u.rating}` : ''}</td>
              <td className="p-2 text-xs whitespace-nowrap">{date(u.createdAt)}</td>
              <td className="p-2 text-right"><button className="btn btn-danger px-2 py-1 text-xs" disabled={busy} onClick={() => deleteUser(u)}>Delete</button></td>
            </tr>)}</tbody></table></div>}

          {tab === 'guests' && data.entries.length > 0 && <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
            <thead className="label"><tr><th className="p-2">Guest</th><th className="p-2">Games</th><th className="p-2">Last seen</th><th className="p-2" /></tr></thead>
            <tbody>{(data.entries as GuestRow[]).map((g) => <tr key={g.id} className="border-t border-ink/10 align-top">
              <td className="p-2"><p className="font-extrabold">{g.displayName ?? <span className="text-ink-faint">(no name)</span>} {g.liveRoom && <Live code={g.liveRoom} />}</p>
                <p className="font-mono text-[10px] text-ink-faint">{g.id}</p></td>
              <td className="p-2 text-xs">{g.gamesPlayed} played · {g.gamesWon} won</td>
              <td className="p-2 text-xs whitespace-nowrap">{date(g.lastSeenAt)}</td>
              <td className="p-2 text-right"><button className="btn btn-danger px-2 py-1 text-xs" disabled={busy} onClick={() => deleteGuest(g)}>Delete</button></td>
            </tr>)}</tbody></table></div>}

          <Pager data={data} onPage={(p) => { setPage(p); setSelected(new Set()); }} />
        </>}
      </section>
    </div>
  </main>;
}
