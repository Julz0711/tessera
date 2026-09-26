# Settlers

*Working title — the name lives in `src/config/app.ts` (or `NEXT_PUBLIC_APP_NAME`).*

A free, browser-based multiplayer strategy board game for friend groups: open the site, create a
private room, share the link, and play on a low-poly **3D** board — or flip to a clean **2D** board
at any time. Classic rules and **Cities & Knights**, bots, spectators, chat, trading, reconnect,
optional Google/Discord profiles with stats and game history.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000 (next free port if 3000 is taken)
```

That's all you need to play: guests, private rooms, bots, both game modes, chat, spectators and
reconnect all work **in memory, without a database**.

Play solo against bots: **Create game → Fill seats with bots → Create room → Start game.**
Play with friends: create a room and send them the invite link (`/r/ABCD2345`).

### Optional: database (profiles, history, stats, restart-safe games)

```bash
npm run db:local     # embedded PostgreSQL on :5433 (keep it running)
# add to .env:  DATABASE_URL=postgresql://postgres:postgres@localhost:5433/settlers
npm run db:push      # create the tables
npm run dev
```

Any PostgreSQL works (Neon, Supabase, RDS, Docker…). With a database, running games are
snapshotted and **survive a server restart** — players just reload and continue.

### Optional: Google / Discord sign-in

Create OAuth apps and put the credentials in `.env` (see `.env.example`):

| Provider | Console | Redirect URL |
| --- | --- | --- |
| Google | console.cloud.google.com → Credentials → OAuth client (Web) | `http://localhost:3000/api/auth/callback/google` |
| Discord | discord.com/developers → Applications → OAuth2 | `http://localhost:3000/api/auth/callback/discord` |

Sign-in needs `DATABASE_URL`. Guests who sign in keep their stats, finished games and knight —
"Save my profile" on the profile page.

### Production

```bash
npm run build
AUTH_SECRET=... DATABASE_URL=... npm start
```

Serve it behind HTTPS (the guest cookie becomes `Secure` automatically). Behind a proxy set
`TRUST_PROXY=1` and `APP_URL`.

### Deploy for free (Render + Neon)

The game server keeps websocket connections open, so it needs a real Node host (not serverless).

1. **Database:** create a free project at [neon.com](https://neon.com) (0.5 GB, no card needed, doesn't expire)
   and copy its connection string.
2. **Server:** at [render.com](https://render.com), New → Blueprint → pick this repo. `render.yaml` sets up a free
   web service; paste the Neon string as `DATABASE_URL`. The build creates the tables (`prisma db push`).
3. Optional: set `APP_URL` to the public address (e.g. `https://pioneers.onrender.com`). Only needed if the
   game is also opened from another domain; its own address always works.
4. Sign-in (optional): add `AUTH_GOOGLE_*` / `AUTH_DISCORD_*` with the live callback URLs
   (`https://<your-app>/api/auth/callback/google`, …). Without them everyone plays as a guest.

Free-tier limits: the server sleeps after 15 minutes without visitors, and the first visit after that
takes about a minute to wake it. Games in progress survive that (they're restored from the database).

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js + game server in development |
| `npm run build` / `npm start` | Production build / server |
| `npm test` | Unit, self-play and server integration tests (DB tests run when `DATABASE_URL` is set) |
| `npm run typecheck` | TypeScript |
| `npm run db:local` / `db:push` | Local embedded PostgreSQL / sync the Prisma schema |

## How it's built

```
server.ts                 one process: Next.js pages + Socket.IO game server + /api/auth, /api/session, /api/face
src/engine/               pure, seeded rules engine (Classic + Cities & Knights), views with hidden info removed
src/bots/                 heuristic bots for both modes (also used for autopilot of absent players)
src/server/               rooms/lobby, identity (guest cookies, Auth.js sessions), persistence, rate limits
src/app, src/components/  pages, lobby, HUD; board3d (React Three Fiber, low-poly) and board2d (SVG)
prisma/schema.prisma      users, accounts, sessions, profiles, guest_sessions, rooms, games, players, events, snapshots
```

- **Server-authoritative.** Clients send intents; the engine validates them; each player receives a
  view without other players' cards, deck order or the RNG state.
- **Reconnect.** Seats belong to your identity, not your socket: reload, switch Wi-Fi or come back
  later and you're back in your seat. While you're away (or when the optional turn timer runs out)
  an autopilot makes only the required moves so the table never stalls.
- **Privacy & security.** Random per-game player ids (never account ids or names), non-guessable
  8-character room codes, HMAC-signed httpOnly guest cookies, database sessions, OAuth tokens never
  stored, Origin-checked WebSockets, rate limits on sessions, rooms, joins, actions, chat and
  uploads, and uploaded knight faces are re-encoded, type-checked and served with strict headers.

Rules as implemented, including the Cities & Knights interpretations, are documented in
[`src/engine/ck/README.md`](src/engine/ck/README.md). Design notes: [`docs/superpowers/specs`](docs/superpowers/specs).
