"use client";

import { ArrowLeft, ArrowRight, BookOpen, Bot, LogIn, Menu, ScrollText, Settings, Sparkles, Trophy } from "lucide-react";
import { RulebookDialog } from "@/components/rules/RulebookDialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { APP_WORDMARK } from "@/config/app";
import { LATEST_PATCH, PATCH_SEEN_KEY } from "@/config/patchNotes";
import { usePrefs } from "@/client/prefs";
import { useSettingsUI } from "@/client/settingsUI";
import { cachedSession, fetchSession } from "@/client/session";
import { MAPS } from "@/engine/maps";
import type { ActiveRoom, ProgressData, SessionInfo } from "@/shared/protocol";
import { MODE_LABEL, ratingPoolFor } from "@/shared/ratings";
import { SignInChoices } from "@/components/auth/SignInChoices";
import { KnightBadge } from "@/components/knight/KnightBadge";
import { LevelBadge } from "@/components/progression/ItemArt";
import { fetchProgress } from "@/components/progression/ProgressPage";
import { Quay } from "@/components/landing/Quay";
import { Logomark } from "@/components/ui/Logomark";
import { BetaBadge } from "@/components/ui/BetaBadge";
import { Modal } from "@/components/ui/Modal";

/** Accepts "ABCD-EFGH", "abcdefgh" or a pasted invite link. */
export function extractCode(input: string): string | null {
  const fromUrl = input.match(/\/r\/([A-Za-z0-9-]+)/)?.[1] ?? input;
  const code = fromUrl.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return code.length === 8 ? code : null;
}

const roomStatus = (r: ActiveRoom) =>
  r.status === "lobby"
    ? `Lobby · ${r.players}/${r.maxPlayers} players`
    : r.yourTurn
      ? `Your turn${r.turn ? ` · turn ${r.turn}` : ""}`
      : r.autopilot
        ? `Autopilot is playing for you${r.turn ? ` · turn ${r.turn}` : ""}`
        : r.turn
          ? `In progress · turn ${r.turn}`
          : "In progress";

/** Tables you still hold a seat at, right above the main actions. */
function ResumeTables({ rooms, onAbandon }: { rooms: ActiveRoom[]; onAbandon: (room: ActiveRoom) => void }) {
  return (
    <div className="animate-rise mt-8 grid max-w-md gap-2 [animation-delay:80ms]">
      <p className="label-light">{rooms.length > 1 ? "Your tables" : "Your table"}</p>
      {rooms.map((r) => (
        <div key={r.code} className="paper-flat group flex items-center gap-2 p-3 pl-4 transition hover:brightness-105">
          <Link
            href={`/r/${r.code}`}
            className="flex min-w-0 flex-1 items-center gap-3"
            aria-label={`Rejoin ${MODE_LABEL[ratingPoolFor(r.mode, r.map)]} table ${r.code}: ${roomStatus(r)}`}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-ink">
                {MODE_LABEL[ratingPoolFor(r.mode, r.map)]}
                {r.map !== "standard" && <span className="font-semibold text-ink-soft"> · {MAPS[r.map]?.name ?? r.map}</span>}
              </p>
              <p className={`mt-0.5 flex items-center gap-1.5 text-sm ${r.yourTurn ? "font-bold text-terracotta" : "text-ink-soft"}`}>
                {r.yourTurn && <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-terracotta" aria-hidden />}
                {r.autopilot && <Bot size={14} className="shrink-0" aria-hidden />}
                <span className="truncate">{roomStatus(r)}</span>
                <span className="ml-auto shrink-0 pl-1 text-xs font-bold tabular tracking-label text-ink-faint">
                  {r.code.slice(0, 4)}-{r.code.slice(4)}
                </span>
              </p>
            </div>
            <span className="btn btn-primary shrink-0 px-4 py-2 text-sm group-hover:brightness-105" aria-hidden>
              Rejoin <ArrowRight size={16} strokeWidth={3} />
            </span>
          </Link>
          <button
            type="button"
            className="btn btn-danger ml-1 shrink-0 px-2.5 py-2"
            onClick={() => onAbandon(r)}
            aria-label={`Abandon table ${r.code}`}
            title={r.status === "lobby" ? "Leave this table" : "Abandon this game: a bot takes your seat"}
          >
            <ArrowLeft size={18} strokeWidth={2.75} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}

/** Where you stand, in a line: level, XP bar and the next level unlock. Shown where the quay doesn't fit. */
function ProgressCard({ data }: { data: ProgressData }) {
  const { level } = data;
  const next = data.items
    .filter((i) => !i.unlocked && i.unlock.kind === "level")
    .sort((a, b) => (a.unlock.kind === "level" && b.unlock.kind === "level" ? a.unlock.n - b.unlock.n : 0))[0];
  return (
    <Link
      href="/profile?tab=progress"
      className="landing-progress-card paper-flat animate-rise mt-6 flex max-w-sm items-center gap-3 p-3 [animation-delay:240ms] hover:brightness-105"
    >
      <LevelBadge level={level.level} size={36} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-bold text-ink">Level {level.level}</span>
          <span className="text-xs font-bold tabular text-ink-soft">{level.into} / {level.need} XP</span>
        </span>
        <span className="mt-1 block h-2 overflow-hidden rounded-[4px] border-2 border-ink bg-paper-2" role="progressbar" aria-valuenow={level.into} aria-valuemax={level.need} aria-label="XP to next level">
          <span className="block h-full bg-amber" style={{ width: `${level.need ? Math.min(100, (level.into / level.need) * 100) : 0}%` }} />
        </span>
        {next && next.unlock.kind === "level" && (
          <span className="mt-1.5 block truncate text-xs font-bold text-ink-soft">Next: {next.name} at level {next.unlock.n}</span>
        )}
      </span>
    </Link>
  );
}

export function Landing() {
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(cachedSession);
  const [sessionFailed, setSessionFailed] = useState(false);
  const [joining, setJoining] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [menu, setMenu] = useState(false);
  const [rules, setRules] = useState(false);
  const [code, setCode] = useState("");
  const [tables, setTables] = useState<ActiveRoom[]>([]);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prefs = usePrefs();
  // A dot on the patch notes button until this browser has opened the latest notes.
  const [newPatch, setNewPatch] = useState(false);
  useEffect(() => {
    try {
      setNewPatch(localStorage.getItem(PATCH_SEEN_KEY) !== LATEST_PATCH);
    } catch {
      setNewPatch(false);
    }
  }, []);

  const loadProgress = () => {
    fetchProgress()
      .then((d) => d && setProgress(d))
      .catch(() => undefined);
  };
  useEffect(() => {
    prefs.load();
    loadProgress();
    fetchSession()
      .then(setSession)
      .catch(() => setSessionFailed(true));
    fetch("/api/rooms/active", { credentials: "same-origin", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { rooms: [] }))
      .then((data: { rooms?: ActiveRoom[] }) => setTables(data.rooms ?? []))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (joining) inputRef.current?.focus();
  }, [joining]);

  const [abandoning, setAbandoning] = useState<ActiveRoom | null>(null);
  const [abandonBusy, setAbandonBusy] = useState(false);
  const [abandonError, setAbandonError] = useState<string | null>(null);
  const confirmAbandon = async () => {
    if (!abandoning) return;
    setAbandonBusy(true);
    setAbandonError(null);
    try {
      const res = await fetch("/api/rooms/abandon", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: abandoning.code }),
      });
      if (!res.ok) throw new Error();
      setTables((t) => t.filter((r) => r.code !== abandoning.code));
      setAbandoning(null);
    } catch {
      setAbandonError("Couldn't leave that table right now. Try again in a moment.");
    } finally {
      setAbandonBusy(false);
    }
  };

  const submitJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const c = extractCode(code);
    if (!c) {
      setCodeError("Room codes have 8 letters/digits, like ABCD-2345");
      return;
    }
    router.push(`/r/${c}`);
  };

  const signedIn = session?.kind === "user";
  // Until the session is known, hold the Sign in spot with an invisible twin, never the signed-out UI.
  const showSignIn = session ? !signedIn : sessionFailed;
  const name = session?.displayName || prefs.name || "Guest";
  const color = session?.color ?? prefs.color;

  return (
    <main className="landing-page relative min-h-dvh overflow-hidden">
      {/* the island lives in HomeBackdrop, mounted above the route so it survives navigation */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-sea-950/95 via-sea-950/40 to-transparent max-md:bg-sea-950/55" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-sea-950 to-transparent" />

      <header className="landing-header relative z-10 flex items-center justify-between gap-3 px-5 pt-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <Logomark size={30} />
          <span className="display text-lg font-black tracking-wide text-paper">
            {APP_WORDMARK}
          </span>
          <BetaBadge />
        </div>
        <nav className="hidden flex-1 items-center gap-6 pl-8 text-sm font-bold text-foam/70 md:flex" aria-label="Main navigation">
          <Link href="/profile?tab=progress" className="landing-link">Progress</Link>
          <Link href="/leaderboard" className="landing-link">Leaderboard</Link>
          <button type="button" className="landing-link" onClick={() => setRules(true)}>Rules</button>
          <Link href="/patch-notes" className="landing-link" aria-label={newPatch ? `What’s new: ${LATEST_PATCH} is new` : "What’s new"} title={`Patch notes (${LATEST_PATCH})`}>
            What’s new
            {newPatch && <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-terracotta align-middle" aria-hidden />}
          </Link>
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          {!session && !sessionFailed && (
            <span className="invisible text-sm font-bold" aria-hidden>Sign in</span>
          )}
          {showSignIn && (
            <button type="button" className="landing-link text-sm font-bold text-foam/70" onClick={() => setSigningIn(true)}>
              Sign in
            </button>
          )}
          <Link href="/profile?tab=progress" className="btn btn-dark px-3 py-1.5 text-sm">
            <KnightBadge color={color} size={24} />
            {progress?.enabled && <LevelBadge level={progress.level.level} size={22} />}
            <span className="max-w-28 truncate">{name}</span>
          </Link>
          <button type="button" className="btn btn-dark h-9 w-9 p-0" aria-label="Settings" title="Settings" onClick={() => useSettingsUI.getState().show()}><Settings size={18} /></button>
        </div>
        <div className="flex shrink-0 items-center gap-2 md:hidden">
          <Link href="/profile" className="btn btn-dark h-11 gap-1 px-2" aria-label="Your profile"><KnightBadge color={color} size={28} />{progress?.enabled && <LevelBadge level={progress.level.level} size={20} />}</Link>
          <button className="btn btn-dark h-11 w-11 p-0" aria-label="Open navigation" aria-haspopup="dialog" onClick={() => setMenu(true)}><Menu size={20} /></button>
        </div>
      </header>

      <section className={`landing-hero ${progress?.enabled ? "landing-hero-quay" : ""} relative z-10 flex min-h-[calc(100dvh-72px)] flex-col justify-center px-5 pb-16 sm:px-10 md:max-w-160`}>
        <h1
          className="display animate-rise text-[clamp(3.6rem,13vw,8.5rem)] font-black leading-[0.86] tracking-[-0.02em] text-paper"
          style={{ fontVariationSettings: "'SOFT' 100, 'WONK' 1, 'opsz' 144" }}
        >
          {APP_WORDMARK}
        </h1>

        {tables.length > 0 && <ResumeTables rooms={tables} onAbandon={(r) => { setAbandonError(null); setAbandoning(r); }} />}

        <div className={`landing-actions animate-rise ${tables.length ? "mt-5" : "mt-9"} flex flex-wrap items-center gap-3 [animation-delay:160ms]`}>
          {/* With a table to go back to, Rejoin takes the accent colour. */}
          <Link href="/create" className={`btn ${tables.length ? "" : "btn-primary"} px-7 py-3.5 text-lg`}>
            Create game <ArrowRight size={20} strokeWidth={3} />
          </Link>
          {!joining ? (
            <button
              type="button"
              className="btn px-6 py-3.5 text-lg"
              onClick={() => setJoining(true)}
            >
              Join game
            </button>
          ) : (
            <form
              onSubmit={submitJoin}
              className="paper-flat flex items-center gap-2 p-1.5 pl-3"
            >
              <input
                ref={inputRef}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setCodeError(null);
                }}
                placeholder="ABCD-2345"
                aria-label="Room code or invite link"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                aria-invalid={!!codeError}
                aria-describedby={codeError ? 'room-code-error' : undefined}
                className="min-w-0 w-36 flex-1 bg-transparent text-lg font-bold uppercase tabular tracking-label text-ink outline-none placeholder:text-ink/30"
              />
              <button type="submit" className="btn btn-dark px-4 py-2">
                Join
              </button>
            </form>
          )}
        </div>
        {codeError && (
          <p id="room-code-error" role="alert" className="mt-2 text-sm font-semibold text-terracotta">
            {codeError}
          </p>
        )}
        {progress?.enabled && <ProgressCard data={progress} />}
      </section>

      {progress?.enabled && <Quay data={progress} name={name} color={color} onChanged={loadProgress} />}

      <footer className="landing-footer relative z-10 flex gap-4 px-5 pb-4 text-xs font-bold text-foam/60 sm:px-10">
        <Link href="/privacy" className="hover:text-paper">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-paper">
          Terms
        </Link>
      </footer>

      <Modal open={!!abandoning} onClose={() => !abandonBusy && setAbandoning(null)} title={abandoning?.status === "lobby" ? "Leave this table?" : "Abandon this game?"}>
        <p className="mb-4 text-sm text-ink-soft">
          {abandoning?.status === "lobby"
            ? "You give up your seat at this table."
            : "A bot takes over your seat and the game disappears from your home screen. You can't rejoin it. It counts as a loss in last place, and in a rated game it costs extra rating."}
        </p>
        {abandonError && <p role="alert" className="mb-3 text-sm font-bold text-terracotta">{abandonError}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn px-4 py-2" disabled={abandonBusy} onClick={() => setAbandoning(null)}>Keep playing</button>
          <button className="btn btn-danger px-4 py-2" disabled={abandonBusy} onClick={confirmAbandon}>{abandoning?.status === "lobby" ? "Leave" : "Abandon"}</button>
        </div>
      </Modal>

      <RulebookDialog open={rules} onClose={() => setRules(false)} />

      <Modal open={menu} onClose={() => setMenu(false)} title="Menu">
        <nav className="grid gap-2" aria-label="Main navigation">
          <Link href="/profile" className="btn justify-start px-4 py-3"><KnightBadge color={color} size={24} /> Your profile</Link>
          <Link href="/profile?tab=progress" className="btn justify-start px-4 py-3"><Sparkles size={18} /> Progress</Link>
          <Link href="/leaderboard" className="btn justify-start px-4 py-3"><Trophy size={18} /> Leaderboard</Link>
          <Link href="/patch-notes" className="btn justify-start px-4 py-3"><ScrollText size={18} /> What’s new {newPatch && <span className="ml-auto h-2 w-2 rounded-full bg-terracotta" />}</Link>
          <button className="btn justify-start px-4 py-3" onClick={() => { setMenu(false); setRules(true); }}><BookOpen size={18} /> Rules</button>
          <button className="btn justify-start px-4 py-3" onClick={() => { setMenu(false); useSettingsUI.getState().show(); }}><Settings size={18} /> Settings</button>
          {showSignIn && <button className="btn btn-primary justify-start px-4 py-3" onClick={() => { setMenu(false); setSigningIn(true); }}><LogIn size={18} /> Sign in</button>}
        </nav>
      </Modal>

      <Modal
        open={signingIn}
        onClose={() => setSigningIn(false)}
        title="Sign in"
      >
        <p className="mb-4 text-sm text-ink-soft">
          No account needed to play. Sign in to keep your stats across
          devices.
        </p>
        <SignInChoices auth={session?.auth ?? null} failed={sessionFailed} />
      </Modal>
    </main>
  );
}
