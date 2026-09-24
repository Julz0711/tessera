# Settlers — Design Spec

Date: 2026-09-24 · Source requirements: [`prompt.md`](../../../prompt.md) (PRD) · Status: approved-by-default (auto mode; PRD was treated as the approved brief)

"Settlers" is a placeholder. The name lives in exactly one place (`src/config/app.ts`, overridable with `NEXT_PUBLIC_APP_NAME`).

## 1. Goal

A free, browser-based, 3D multiplayer hex-island trading/building game for friend groups: open the site → create a private room → share the link → friends join as guests or with a Google/Discord profile → pick Classic or Cities & Knights → play within 1–2 minutes. Bots, spectators, chat, trading, reconnect, history.

## 2. Decisions (made without a Q&A round — revisit any of them freely)

| Topic | Decision | Why |
|---|---|---|
| Stack | Next.js 16 (App Router) · React 19 · TypeScript 5.9 · React Three Fiber 9 + drei · Socket.IO 4 · Prisma 7 + PostgreSQL · Auth.js v5 · Tailwind 4 · Zustand · Vitest | Exactly the PRD stack. TS pinned to 5.9 because TS 7 (Go port) is not yet a safe dependency for Next's type-check step. |
| Process model | One Node process: a custom `server.ts` serves Next.js **and** Socket.IO on the same port | Same-origin cookies for socket auth, one command to run, no CORS. |
| Authority | Server-authoritative. Clients send *intents*; the server validates them with the pure engine and broadcasts per-player redacted views | Anti-cheat, hidden information, reconnect for free. |
| Engine | Pure, deterministic TypeScript (`src/engine`), seeded PRNG kept server-side, `applyAction(state, seat, action) → {state, events} | error` | Unit-testable, replayable from `game_events`, shared by server/bots/client (client only for legality hints). |
| Database | **Optional at runtime.** No `DATABASE_URL` → everything runs in memory (guest play fully works), auth buttons show "not configured". With a DB → persistence, profiles, history, OAuth | Zero-setup local play; Postgres/Docker are not installed on this machine. `npm run db:local` starts an embedded Postgres for development. |
| Auth | Auth.js v5 (beta, as recommended by the PRD) with Google + Discord, Prisma adapter, **database sessions**; providers enabled only when their env vars exist | PRD recommendation; DB sessions let the socket server validate sessions server-side by cookie → `sessions` row. |
| Provider tokens | Adapter wrapped so OAuth access/refresh/id tokens are **never stored** | Satisfies "no provider tokens in plaintext" — we only need identity. |
| Guests | Signed (HMAC-SHA256) httpOnly cookie holding a random UUID guest-session id, 30-day expiry; row in `guest_sessions` when a DB exists | Secure random ids, server-side validation, reconnect across reloads. |
| Player ids | Every seat gets a fresh `randomUUID()` player id; the identity key (user / guest id) never leaves the server | PRD privacy + "never playerId = displayName". |
| Room ids | 8 chars from an unambiguous 31-symbol alphabet via `crypto.randomInt` (~8.5·10¹¹ codes) + join rate limiting | Non-predictable, easy to read aloud. |
| Players | 2–4 seats per game (bots fill any seat), unlimited spectators (host toggle) | Standard 19-hex board; 5–6 player board is future work (layout is data-driven). |
| 3D assets | 100 % procedural low-poly geometry + canvas textures (no model files, no font CDN) | Works offline, tiny bundle, fully themeable by player color. |
| i18n | English only; Language setting present but only "English" selectable | Out of MVP scope; noted as follow-up. |

## 3. Architecture

```
Browser (Next.js pages, R3F board, Zustand)
   │  HTTP: pages, /api/auth/* (Auth.js), /api/session/guest, /api/me
   │  WS:   Socket.IO (typed protocol, cookie-authenticated handshake, Origin-checked)
   ▼
server.ts ──► Next request handler
          ├─► Socket.IO ──► RoomManager ──► Room ──► engine.applyAction()
          │                     │             ├─► BotRunner / Autopilot / TurnTimer
          │                     │             └─► Persistence (optional Prisma)
          └─► Guest session endpoint (signs cookie)
```

Units and their contracts:

- `src/config/app.ts` — product name, colors, limits. Everything user-visible that says the product name reads from here.
- `src/engine/` — types, board topology & generation, rules for Classic and C&K, longest road, VP, per-viewer redaction (`viewFor`), legality queries (`legalRoads`, `legalSettlements`, …). No I/O, no `Date.now()`, no `Math.random()`.
- `src/bots/` — `decide(view, seat) → Action | null` for every decision type (setup, roll, robber, discard, build, trade responses, progress cards, knights, barbarian choices). Pure.
- `src/shared/` — Socket protocol types, `PlayerIdentity`, `KnightCustomization`, lobby DTOs.
- `src/server/` — identity (guest cookie signing, Auth.js session lookup), `RoomManager`/`Room` (lobby, seats, spectators, host, start, rematch), bot scheduling, turn timer & disconnect autopilot, chat (sanitised, rate-limited), persistence adapter, rate limiters.
- `src/app/` + `src/components/` + `src/three/` + `src/client/` — pages, UI panels, 3D scene, socket/store/sound.

## 4. Game rules implemented

**Classic (base game, 10 VP):** 19 hexes (4 forest, 3 hills, 4 pasture, 4 fields, 3 mountains, 1 desert), 18 number tokens with no adjacent 6/8 and no adjacent equal numbers, 9 harbors (4 generic 3:1, 5 specific 2:1) on the coast frame; random seat order; snake setup (2nd settlement pays out); dice production with bank-shortage rule; 7 → discard half if >7 cards → robber + steal; build road/settlement/city with piece limits (15/5/4) and distance rule; 25 development cards (14 knight, 5 VP, 2 road building, 2 year of plenty, 2 monopoly; one per turn, not the turn it was bought, knight may be played before rolling); largest army (≥3), longest road (≥5, broken by opponent buildings, tie keeps holder); domestic trade (active player ↔ others, counter-offers, no gifts / like-for-like) and maritime 4:1 / 3:1 / 2:1; win at target VP on your own turn.

**Cities & Knights (13 VP):** second setup placement is a city; commodities (paper/cloth/coin from city on forest/pasture/mountains), hand limit 7 + 2 per city wall (max 3 walls); three improvement tracks (Trade/cloth, Politics/coin, Science/paper), level n costs n commodities, level-3 abilities (Trading House 2:1 commodities, Fortress → mighty knights, Aqueduct resource when a roll gives you nothing), metropolis at level 4 (stolen by reaching 5 first; permanent at 5; +2 VP; immune to barbarians); knights (basic/strong/mighty; build 1 wool + 1 ore, promote 1 wool + 1 ore, activate 1 grain; move / displace / chase robber, not on the turn activated; block roads and break longest road); event die (3 ship, 3 gates) with barbarian track of 7 — attack strength = cities + metropolises vs sum of active knight levels; win → single top defender gets Defender VP, ties draw a progress card of their chosen color; loss → lowest contributor(s) with a non-metropolis city lose one city; all knights deactivate; robber inactive until the first attack; progress cards drawn when the event die shows a gate and red die ≤ level+1 (54 cards: full Science/Politics/Trade decks incl. interactive ones such as Wedding, Spy, Deserter, Diplomat, Intrigue, Saboteur, Commercial Harbor, Master Merchant), max 4 in hand (VP cards revealed immediately); merchant piece (2:1 on its hex's resource, +1 VP).
House interpretations where the rulebook is ambiguous are documented in `src/engine/ck/README.md`.

## 5. Real-time protocol (Socket.IO)

Client→server (all acked `{ok:true,…}|{ok:false,error}`): `room:create`, `room:join`, `room:leave`, `room:settings`, `room:seat` (name/color/knight/ready), `room:addBot`, `room:removeBot`, `room:kick`, `room:start`, `room:rematch`, `game:action`, `chat:send`.
Server→client: `room:state` (lobby DTO), `game:view` (redacted `PlayerView` + recent events for animation), `chat:message`, `room:closed`, `session:replaced`.

Reconnect: seats are bound to the server-side identity key; a new socket with the same identity re-attaches to its seat (older socket is told `session:replaced`). While a seated human is disconnected, after a grace period an autopilot takes minimal actions (roll, resolve prompts, end turn) so the table never stalls; an optional turn timer does the same for AFK players.

## 6. Data model (Prisma, PRD §9)

`users`, `accounts`, `sessions`, `verification_tokens` (Auth.js), `profiles`, `guest_sessions`, `rooms`, `games`, `players`, `game_events`, `game_snapshots`. `players` references either `userId` or `guestSessionId` (both only after explicit guest→account migration). Guest → profile upgrade runs once per guest session inside a transaction (`guest_sessions.migratedToUserId` guards duplicates), carrying over stats, completed games, display name and knight customization.

## 7. Security

HMAC-signed httpOnly guest cookie (Secure in production, SameSite=Lax); Auth.js CSRF/state handling; DB-session validation for sockets; Socket.IO `allowRequest` Origin check (prevents cross-site WebSocket hijacking); token-bucket rate limits on guest creation, room creation, joins, game actions and chat; chat length cap and control-char stripping (rendered as text, never HTML); no emails / provider / internal ids in any payload other players receive.

## 8. Testing & verification

Vitest: topology invariants, board generation constraints, every rule path above, longest-road edge cases, trade validation, redaction (no hidden info leaks), and **bot self-play** (hundreds of full Classic and C&K games must end with a winner and zero rejected bot actions). `tsc --noEmit`, `next build`, and browser runs (Playwright) for: guest create → bots → full game; second browser joins via link; spectator; chat; reload mid-game (reconnect).

## 9. Out of scope for this build (PRD "future")

Friends, friend requests, achievements, leaderboards, matchmaking, saved knight presets, extra OAuth providers, 5–6 player board, translations, seafarers-style expansions.
