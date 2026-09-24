Settlers
Product Requirements Document

Working title only.

"Settlers" is a temporary project name and must be treated as a placeholder. The final product name will be chosen later after checking trademark, domain, and branding availability.

1. Product Vision

Build a free, browser-based multiplayer strategy board game for friend groups.

The core experience should allow a group of friends to:

Open the website
Create a private game
Share a link
Have friends join
Join either as a guest or with a profile
Choose a game mode
Start playing within roughly 1–2 minutes

The game should provide a polished, modern 3D tabletop experience with:

3D board
multiplayer
private rooms
guest access
optional user profiles
Google authentication
Discord authentication
bots
spectators
chat
trading
development cards
customizable knights
classic mode
Cities & Knights mode
reconnect support
game history
responsive UI

The initial target audience is groups of friends who want to play together online without paying for a premium multiplayer board-game platform.

2. Authentication & Identity

Authentication must be optional.

A player should be able to use the entire core game without creating an account.

There are two identity modes:

Guest
Profile
2.1 Guest Access

A guest can:

create a game
join a game
choose a display name
choose a player color
customize their knight
play Classic
play Cities & Knights
chat
spectate
reconnect during the current session

Guest access should require no email address and no OAuth login.

Example:

Welcome to Settlers

[ Play as Guest ]

or

[ Continue with Google ]
[ Continue with Discord ]

The guest experience should be the fastest path into a game.

3. User Profiles

Authenticated users can have persistent profiles.

A profile may contain:

Display Name
Avatar
Player Color
Knight Customization
Games Played
Games Won
Favorite Game Mode
Game History

Future profile features:

friends
friend requests
statistics
achievements
saved knight presets
custom avatars
game history
matchmaking
leaderboards

Do not require profiles for the core product.

4. Authentication Providers

Support OAuth authentication through:

Google
Continue with Google
Discord
Continue with Discord

The authentication architecture should be provider-agnostic so additional providers can be added later.

Potential future providers:

Apple
GitHub
email/password

Do not implement all of these initially.

5. Recommended Authentication Architecture

Use an established authentication library rather than implementing OAuth manually.

Recommended:

Auth.js

or another mature OAuth-compatible authentication solution supported by the selected Next.js architecture.

The authentication layer should provide:

type UserIdentity = {
userId: string

provider?: "google" | "discord"

displayName: string

avatarUrl?: string
}

A user may have multiple OAuth providers linked to the same profile in the future.

6. Guest → Profile Upgrade

A guest should be able to convert their guest identity into a permanent profile.

Example:

Guest Alex

Games Played: 7
Wins: 3

[ Save My Profile ]

Clicking:

Save My Profile

opens:

Choose authentication method

[ Continue with Google ]
[ Continue with Discord ]

After successful authentication, migrate appropriate guest data to the new profile.

Potentially preserve:

display name
knight customization
player preferences
game statistics
completed games
achievements

Do not allow duplicate or conflicting identity records.

7. Account vs Guest UX

The product should never make users feel forced to register.

Recommended landing experience:

SETTLERS

Play a strategy board game
with your friends.

[ CREATE GAME ]

[ JOIN GAME ]

──────────────

No account required.

[ Continue with Google ]
[ Continue with Discord ]

A user should be able to create a game immediately.

8. Session Identity

Every player needs a stable identity during a game.

Guests receive a temporary player identity:

type GuestIdentity = {
sessionId: string
displayName: string
}

Authenticated players receive:

type AuthenticatedIdentity = {
userId: string
displayName: string
}

The game engine should not care whether a player is a guest or authenticated user.

Both should implement the same conceptual interface:

type PlayerIdentity = {
id: string
displayName: string
avatarUrl?: string
isGuest: boolean
} 9. Database Model

Initial database structure:

users
accounts
sessions

guest_sessions

profiles

games
rooms
players
game_events
game_snapshots

Potential schema:

## users

id
createdAt
updatedAt

## profiles

userId
displayName
avatarUrl
createdAt
updatedAt

## accounts

id
userId
provider
providerAccountId

## guest_sessions

id
displayName
createdAt
expiresAt

Game participation:

## players

id
gameId
userId?
guestSessionId?
displayName
color
knightCustomization

A player should reference either:

userId

or:

guestSessionId

but not both unless explicitly implementing guest-to-account migration.

10. Profile Page

Authenticated users should have a profile page.

Example:

┌──────────────────────────────────┐
│ Alex │
│ │
│ [ Avatar ] │
│ │
│ Games Played 42 │
│ Games Won 17 │
│ │
│ Favorite Mode C&K │
│ │
│ Knight │
│ [ 3D Knight Preview ] │
│ │
│ [ Edit Profile ] │
└──────────────────────────────────┘ 11. Profile Settings

Allow users to modify:

Display Name
Avatar
Default Player Color
Knight Customization
Sound Preferences
Graphics Preferences
Language

Do not make profile settings required for playing.

12. Game Lobby Identity

When joining a room, display:

Alex
[Authenticated]

or:

Alex
[Guest]

The guest label does not need to be visually prominent.

The game should primarily care about the player's display identity.

13. Privacy

Do not expose unnecessary profile information to other players.

During a game, other players should generally see:

Display Name
Avatar
Player Color
Public Game Statistics

They should not automatically see:

Email
OAuth provider
Internal user ID
Authentication details 14. Authentication Security

Never implement OAuth manually.

Use established providers and libraries.

Requirements:

secure OAuth state handling
secure cookies
CSRF protection where applicable
server-side session validation
no OAuth tokens sent to the game client unnecessarily
no provider access tokens stored in plaintext
secure session expiration
account linking validation 15. Guest Security

Guest identities must still be protected against basic abuse.

Use:

secure random session IDs
non-predictable room IDs
server-side identity validation
rate limiting
chat rate limiting

Do not rely on display names as player identity.

Bad:

playerId = displayName

Good:

playerId = randomUUID()
displayName = "Alex" 16. Authentication Should Not Block the Vertical Slice

The initial development sequence should remain:

Guest
↓
Create Room
↓
Join Room
↓
Lobby
↓
Start Game
↓
Play

OAuth should be architected from the beginning but can be implemented after the basic guest multiplayer flow works.

Recommended order:

Phase 1

Guest identity.

Phase 2

Persistent profile model.

Phase 3

Google OAuth.

Phase 4

Discord OAuth.

Phase 5

Guest → authenticated account migration.

17. Updated Landing Page

Initial landing page:

┌────────────────────────────────────────────┐
│ │
│ SETTLERS │
│ │
│ Play strategy games with friends. │
│ │
│ [ CREATE GAME ] │
│ │
│ [ JOIN GAME ] │
│ │
│ No account required. │
│ │
│ [ Google ] [ Discord ] │
│ │
└────────────────────────────────────────────┘

The primary CTA should remain:

Create Game

not:

Create Account

18. Updated Lobby Flow
    Guest
    Landing
    ↓
    Create Game
    ↓
    Enter display name
    ↓
    Choose color
    ↓
    Customize knight
    ↓
    Create room
    Authenticated
    Landing
    ↓
    Continue with Google / Discord
    ↓
    Create Game
    ↓
    Profile defaults loaded
    ↓
    Create room

The authenticated flow should be faster for returning users.

19. Updated Player Model
    type Player = {
    id: string

userId?: string

guestSessionId?: string

displayName: string

avatarUrl?: string

color: PlayerColor

knightCustomization: KnightCustomization

resources: Resources

commodities?: Commodities

victoryPoints: number
}

The game engine should not need to know whether:

userId exists

in order to execute gameplay.

Authentication is an identity/persistence concern, not a game-rule concern.

20. Updated MVP

MVP should include:

Identity

Guest access

Display name

Player color

Temporary player identity

Google OAuth

Discord OAuth

Persistent profile

Game

Private rooms

Classic

Cities & Knights

3D board

Multiplayer

Trading

Bots

Spectators

Chat

Reconnect

Knight customization

Authentication should not delay the initial playable prototype.

21. Updated Development Roadmap
    Phase 1 — Core Infrastructure

Build:

Next.js
TypeScript
React Three Fiber
Socket.IO
PostgreSQL
Prisma
shared types
game engine
guest identity
Phase 2 — Multiplayer Vertical Slice

Build:

Browser A
↓
Guest identity
↓
Create Room
↓
Browser B
↓
Guest identity
↓
Join Room
↓
Lobby
↓
Start Game
↓
3D Board
↓
Dice
↓
Turn
↓
Build Road
Phase 3 — Classic Game

Implement the complete base game.

Phase 4 — Authentication

Implement:

Persistent profile model
Google authentication
Discord authentication
Account linking
Guest → account migration
Profile page
Profile settings
Phase 5 — Cities & Knights

Implement:

knights
customizable knights
city improvements
commodities
progress cards
barbarians
metropolises
city walls
Phase 6 — Multiplayer Polish

Implement:

bots
spectators
chat
reconnect
rematch
game history
Phase 7 — Visual Polish

Implement:

advanced 3D models
knight animations
dice animations
particles
lighting
sound
UI polish
performance optimization 22. Coding-Agent Instruction

Treat Settlers as a temporary working title.

Do not hard-code the product name throughout the application.

Instead:

const APP_NAME = "Settlers";

or use an environment/configuration value.

This makes it easy to rename the product later.

The final name should be changeable without modifying game logic, database architecture, or UI components individually.

23. Final Product Principle

The product should have two equally valid entry points:

FASTEST PATH

Guest
↓
Create / Join
↓
Play

and:

PERSISTENT PATH

Google / Discord
↓
Profile
↓
Create / Join
↓
Play
↓
Statistics / History / Customization

Neither path should feel second-class.

The product's fundamental promise remains:

Open the website, invite your friends, and start playing.
