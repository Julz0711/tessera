'use client';

import { ArrowRight, Bot, Box, LogIn, Swords, Users } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { APP_TAGLINE, APP_WORDMARK } from '@/config/app';
import { fetchSession } from '@/client/session';
import { startSignIn } from '@/client/auth';
import type { SessionInfo } from '@/shared/protocol';
import { DiscordMark, GoogleMark } from '@/components/ui/Glyphs';
import { Logomark } from '@/components/ui/Logomark';

const ShowcaseIsland = dynamic(() => import('./ShowcaseIsland'), { ssr: false });

/** Accepts "ABCD-EFGH", "abcdefgh" or a pasted invite link. */
export function extractCode(input: string): string | null {
  const fromUrl = input.match(/\/r\/([A-Za-z0-9-]+)/)?.[1] ?? input;
  const code = fromUrl.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return code.length === 8 ? code : null;
}

export function Landing() {
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSession().then(setSession).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (joining) inputRef.current?.focus();
  }, [joining]);

  const submitJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const c = extractCode(code);
    if (!c) {
      setCodeError('Room codes have 8 letters/digits, like ABCD-2345');
      return;
    }
    router.push(`/r/${c}`);
  };

  const signedIn = session?.kind === 'user';
  const authReady = session ? session.auth.google || session.auth.discord : false;

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
          <span className="display text-lg font-black tracking-wide text-paper">{APP_WORDMARK}</span>
        </div>
        {signedIn ? (
          <Link href="/profile" className="btn btn-dark px-3 py-1.5 text-sm">
            {session?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.avatarUrl} alt="" className="h-6 w-6 rounded-full border border-black" />
            ) : null}
            {session?.displayName ?? 'Profile'}
          </Link>
        ) : (
          <Link href="/profile" className="label-light hover:text-paper">
            Your stats
          </Link>
        )}
      </header>

      <section className="relative z-10 flex min-h-[calc(100dvh-72px)] flex-col justify-center px-5 pb-16 sm:px-10 md:max-w-160">
        <h1
          className="display animate-rise text-[clamp(3.6rem,13vw,8.5rem)] font-black leading-[0.86] tracking-[-0.02em] text-paper"
          style={{ fontVariationSettings: "'SOFT' 100, 'WONK' 1, 'opsz' 144" }}
        >
          {APP_WORDMARK}
        </h1>
        <p className="animate-rise mt-4 max-w-md text-xl font-semibold text-foam/85 [animation-delay:80ms] sm:text-2xl">{APP_TAGLINE}</p>
        <p className="animate-rise mt-1 max-w-md text-foam/55 [animation-delay:120ms]">
          Build, trade and outwit your friends on a low-poly island. Share a link — everyone&apos;s in within a minute.
        </p>

        <div className="animate-rise mt-9 flex flex-wrap items-center gap-3 [animation-delay:160ms]">
          <Link href="/create" className="btn btn-primary px-7 py-3.5 text-lg">
            Create game <ArrowRight size={20} strokeWidth={3} />
          </Link>
          {!joining ? (
            <button type="button" className="btn px-6 py-3.5 text-lg" onClick={() => setJoining(true)}>
              Join game
            </button>
          ) : (
            <form onSubmit={submitJoin} className="paper-flat flex items-center gap-2 p-1.5 pl-3">
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
        {codeError && <p className="mt-2 text-sm font-semibold text-terracotta">{codeError}</p>}
        <p className="animate-rise mt-4 text-sm font-bold text-foam/70 [animation-delay:200ms]">No account required.</p>

        {!signedIn && (
          <div className="animate-rise mt-8 max-w-md [animation-delay:240ms]">
            <div className="flex items-center gap-3 text-foam/45">
              <span className="h-px flex-1 bg-foam/20" />
              <span className="text-xs font-bold uppercase tracking-[0.18em]">or keep your stats</span>
              <span className="h-px flex-1 bg-foam/20" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button type="button" className="btn btn-dark px-4 py-2 text-sm" disabled={!session?.auth.google} onClick={() => startSignIn('google')}>
                <GoogleMark /> Continue with Google
              </button>
              <button type="button" className="btn btn-dark px-4 py-2 text-sm" disabled={!session?.auth.discord} onClick={() => startSignIn('discord')}>
                <DiscordMark /> Continue with Discord
              </button>
            </div>
            {session && !authReady && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-foam/45">
                <LogIn size={12} /> Sign-in isn&apos;t configured on this server — guests can play everything.
              </p>
            )}
          </div>
        )}

        <ul className="animate-rise mt-12 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-foam/60 [animation-delay:300ms]">
          <li className="flex items-center gap-2">
            <Users size={16} /> 2–4 players
          </li>
          <li className="flex items-center gap-2">
            <Bot size={16} /> Bots fill empty seats
          </li>
          <li className="flex items-center gap-2">
            <Swords size={16} /> Classic · Cities &amp; Knights
          </li>
          <li className="flex items-center gap-2">
            <Box size={16} /> 3D or 2D board
          </li>
        </ul>
      </section>
    </main>
  );
}
