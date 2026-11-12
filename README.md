# Tessera

A browser-based multiplayer strategy board game for friends. Create a private room, share its link, and build, trade, and compete on an interactive 3D board—or switch to a 2D view.

**Beta:** features and rules are still evolving. The repository's default branch is `feat/game`.

[Features](#features) · [Quick start](#quick-start) · [Optional services](#optional-services) · [Deployment](#deployment) · [Development](#development)

## Features

| Area | What is included |
| --- | --- |
| Rules | Classic play and Knights & Barbarians, with multiple board layouts and sea/exploration scenarios. |
| Multiplayer | Private rooms, invite links, spectators, chat, and player trading. |
| Solo play | Fill seats with heuristic bots. |
| Boards | Switch between a low-poly 3D board and a 2D SVG board, with configurable themes. |
| Reconnection | Rejoin your seat after a reload or connection change; autopilot handles required moves for absent players. |
| Profiles | Optional Google/Discord sign-in, statistics, and game history when PostgreSQL is configured. |
| Review | Finished-game replay and analysis code for reviewing decisions. |

The server validates player actions and sends player-specific views that omit opponents' private cards and hidden engine state.

## Quick start

Requirements: **Node.js 22.12+** and npm.

```sh
git clone --branch feat/game https://github.com/Julz0711/tessera.git
cd tessera
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000), or the port printed by the server.

Create a room, choose the game settings in the lobby, and share the `/r/<code>` invite link. Add bots in the lobby to play solo.

Guest rooms, bots, chat, spectators, and reconnection work without a database. In this mode, server state is held in memory and is lost when the server restarts.

## Optional services

### PostgreSQL

A database enables persistent profiles, history, statistics, and restart-safe game snapshots.

```sh
npm run db:local
```

Keep that process running. In `.env`, set:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/settlers
```

Then, in another terminal:

```sh
npm run db:push
npm run dev
```

An external PostgreSQL instance can replace the bundled local database.

### Google and Discord sign-in

Configure the provider credentials in [.env.example](.env.example) and set `DATABASE_URL`.

| Provider | Local callback |
| --- | --- |
| Google | `http://localhost:3000/api/auth/callback/google` |
| Discord | `http://localhost:3000/api/auth/callback/discord` |

Use your deployed HTTPS origin for production callbacks. Guests can use **Save my profile** to retain their profile and history when signing in.

## Deployment

Tessera runs a custom Node server with long-lived Socket.IO connections. Deploy to a host that supports that process and WebSockets.

```sh
npm run build
npm start
```

Configure `AUTH_SECRET` and `DATABASE_URL` in the host environment. Serve over HTTPS; behind a reverse proxy set `TRUST_PROXY=1` and `APP_URL` to your public origin.

[render.yaml](render.yaml) provides a Render deployment blueprint. See [the deployment checklist](docs/deploy-checklist.md) for operational checks and [privacy operations](docs/privacy-operations.md) for data handling. Hosting limits and pricing depend on the provider's current plan.

## Development

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js and the game server in development. |
| `npm run build` / `npm start` | Build and serve production. |
| `npm test` | Unit, bot self-play, and server integration tests. |
| `npm run typecheck` | Check TypeScript. |
| `npm run db:local` | Run local PostgreSQL. |
| `npm run db:push` | Apply the Prisma schema. |
| `npm run test:privacy` / `npm run test:social` | Additional privacy and social checks. |

Database-dependent tests need `DATABASE_URL`.

## Architecture

| Path | Responsibility |
| --- | --- |
| [server.ts](server.ts) | Custom Node process serving Next.js, sockets, and API handlers. |
| [src/engine/](src/engine/) | Pure, seeded rules engine and hidden-information views. |
| [src/bots/](src/bots/) | Heuristic players, simulations, and analysis. |
| [src/server/](src/server/) | Rooms, identity, persistence, validation, and rate limits. |
| [src/components/](src/components/) | Lobby, game interface, 2D/3D boards, and replay views. |
| [src/client/](src/client/) | Client state, preferences, interaction, audio, and themes. |
| [prisma/schema.prisma](prisma/schema.prisma) | Persistent identity, room, game, and event records. |
| [src/config/app.ts](src/config/app.ts) | Product name, tagline, and beta label. |

See [rules as implemented](src/engine/ck/README.md) for Knights & Barbarians interpretations and [board themes](docs/board-themes.md) for visual customization.
