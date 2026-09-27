"use client";

import { ArrowRight, LogIn, ScrollText, Settings, Trophy } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { APP_WORDMARK } from "@/config/app";
import { LATEST_PATCH, PATCH_SEEN_KEY } from "@/config/patchNotes";
import { usePrefs } from "@/client/prefs";
import { useSettingsUI } from "@/client/settingsUI";
import { fetchSession } from "@/client/session";
import type { SessionInfo } from "@/shared/protocol";
import { DEFAULT_KNIGHT } from "@/shared/knight";
import { SignInChoices } from "@/components/auth/SignInChoices";
import { KnightBadge } from "@/components/knight/KnightBadge";
import { Logomark } from "@/components/ui/Logomark";
import { Modal } from "@/components/ui/Modal";

const ShowcaseIsland = dynamic(() => import("./ShowcaseIsland"), {
  ssr: false,
});

/** Accepts "ABCD-EFGH", "abcdefgh" or a pasted invite link. */
export function extractCode(input: string): string | null {
  const fromUrl = input.match(/\/r\/([A-Za-z0-9-]+)/)?.[1] ?? input;
  const code = fromUrl.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return code.length === 8 ? code : null;
}

export function Landing() {
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionFailed, setSessionFailed] = useState(false);
  const [joining, setJoining] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [code, setCode] = useState("");
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

  useEffect(() => {
    prefs.load();
    fetchSession()
      .then(setSession)
      .catch(() => setSessionFailed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (joining) inputRef.current?.focus();
  }, [joining]);

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
  const name = session?.displayName || prefs.name || "Guest";
  const color = session?.color ?? prefs.color;
  const knight = session?.knight ?? prefs.knight ?? DEFAULT_KNIGHT;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-sea-950">
      {/* the island */}
      <div className="absolute inset-0" aria-hidden>
        <ShowcaseIsland />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-sea-950/95 via-sea-950/40 to-transparent max-md:bg-sea-950/55" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-sea-950 to-transparent" />

      <header className="relative z-10 flex items-center justify-between px-5 pt-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <Logomark size={30} />
          <span className="display text-lg font-black tracking-wide text-paper">
            {APP_WORDMARK}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/patch-notes"
            className="btn btn-dark relative h-9 w-9 p-0"
            title={`Patch notes (${LATEST_PATCH})`}
            aria-label={newPatch ? `Patch notes: ${LATEST_PATCH} is new` : "Patch notes"}
          >
            <ScrollText size={17} />
            {newPatch && (
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-ink bg-amber" />
            )}
          </Link>
          <Link
            href="/leaderboard"
            className="btn btn-dark h-9 w-9 p-0"
            title="Leaderboard"
            aria-label="Leaderboard"
          >
            <Trophy size={17} />
          </Link>
          {!signedIn && (
            <button
              type="button"
              className="btn btn-dark px-3 py-1.5 text-sm"
              title="Sign in"
              aria-label="Sign in"
              onClick={() => setSigningIn(true)}
            >
              <LogIn size={16} />{" "}
              <span className="hidden sm:inline">Sign in</span>
            </button>
          )}
          <button
            type="button"
            className="btn btn-dark h-9 w-9 p-0"
            title="Settings"
            aria-label="Settings"
            onClick={() => useSettingsUI.getState().show()}
          >
            <Settings size={17} />
          </button>
          <Link href="/profile" className="btn btn-dark px-3 py-1.5 text-sm">
            <KnightBadge knight={knight} color={color} size={24} />
            <span className="max-w-28 truncate">{name}</span>
          </Link>
        </div>
      </header>

      <section className="relative z-10 flex min-h-[calc(100dvh-72px)] flex-col justify-center px-5 pb-16 sm:px-10 md:max-w-160">
        <h1
          className="display animate-rise text-[clamp(3.6rem,13vw,8.5rem)] font-black leading-[0.86] tracking-[-0.02em] text-paper"
          style={{ fontVariationSettings: "'SOFT' 100, 'WONK' 1, 'opsz' 144" }}
        >
          {APP_WORDMARK}
        </h1>

        <div className="animate-rise mt-9 flex flex-wrap items-center gap-3 [animation-delay:160ms]">
          <Link href="/create" className="btn btn-primary px-7 py-3.5 text-lg">
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
                className="w-36 bg-transparent font-mono text-lg font-bold uppercase tracking-widest text-ink outline-none placeholder:text-ink/30"
              />
              <button type="submit" className="btn btn-dark px-4 py-2">
                Join
              </button>
            </form>
          )}
        </div>
        {codeError && (
          <p className="mt-2 text-sm font-semibold text-terracotta">
            {codeError}
          </p>
        )}
      </section>

      <footer className="absolute inset-x-0 bottom-0 z-10 flex gap-4 px-5 pb-4 text-xs font-bold text-foam/60 sm:px-10">
        <Link href="/privacy" className="hover:text-paper">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-paper">
          Terms
        </Link>
      </footer>

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
