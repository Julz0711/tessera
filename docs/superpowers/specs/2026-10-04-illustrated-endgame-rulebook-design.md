# Illustrated end-game screen and rule book

Date: 2026-10-04 · Branch: `feat/board-visibility` (uncommitted)

## Goal

Less text, more pictures, on the two most text-heavy screens. Pictures reuse what the game already
draws (card art, player-coloured pieces, number tokens, dice, the 2D board itself); anything missing
gets a new drawing in the same flat, dark-outlined style.

## End-game screen (GameOver, "Standings" tab)

- **Podium** (`game/endgame/Podium.tsx`): top three on steps (2nd · 1st · 3rd), each with their
  `KnightBadge` in its cosmetic frame, name, VP in big display type, rating delta. The winner is raised
  and crowned. Fourth and lower: slim rows below. Phones: the steps shrink, never scroll sideways.
- **Points as pictures** (`game/endgame/PointIcons.tsx`): a player's `report.players[i].points` drawn as
  icons: one house per settlement, one city per city (in the player's colour), a road card for Longest
  route, a knight card for Largest army, VP-card / progress-VP icons, a metropolis crown, a defender
  shield, merchant, island flag. Each icon has a `title` naming the points. Count > 5 → "×n" badge.
- **Award badges** (`game/endgame/AwardBadges.tsx`): the overview awards (computed today inside
  `GameReportView`) as round badges: an icon per award title, ring in the winner's colour, the winner's
  name and value under it. The award computation moves to `client/reportAwards.ts` and both screens
  use it; the "Explore stats" overview keeps its award list.
- "Explore stats" is otherwise unchanged.

## Rule book (pictures where useful; text stays)

`RuleSection.body` accepts a new block `{ figure: FigureId }` (rendered by
`rules/figures/index.tsx`), placed above the paragraph it illustrates. Figures, one component each in
`components/rules/figures/`:

| Figure | Where | Shows |
|---|---|---|
| `resources` | Basics › Resources | each terrain as a small hex with its card beside it (desert: nothing) |
| `odds` | Basics › Number tokens | tokens 2–12 (rounded squares, dots, 6/8 red) over bars sized by odds |
| `setup` | Setting up › Placing | snake order 1→2→3→4→4→3→2→1 as player-coloured houses with arrows |
| `turn` | Taking a turn › Step by step | roll → collect → trade → build → end, icons with one-word labels |
| `costs` | Building › Costs | the building-costs card (shared with the phone sheet in `Dock.tsx`) |
| `longestRoad` | Building › Longest Road | a board snippet with a 5-road chain + "+2 VP" card |
| `harbors` | Trading › Bank | 4:1 bank, 3:1 harbor ship, 2:1 harbor ship (as on the board) |
| `robber` | The robber › Rolling a 7 | board snippet: robber on a tile, its number struck, an adjacent house losing a card; "8+ cards → discard half" |
| `devCards` | Development cards › The cards | the printed dev card faces with deck counts |
| `largestArmy` | Development cards › Largest Army | three knight cards → +2 VP |
| `improvements` | K&B › City improvements | three tracks, levels 1–5, ★ at 3, crown at 4–5 |
| `knights` | K&B › Knights | basic / strong / mighty, strength 1/2/3, inactive vs active |
| `eventDie` | K&B › Event die | the six faces: 3 × ship, 3 gates in track colours |
| `barbarians` | K&B › Barbarians | the track: ship steps to the island; cities vs active knights |
| `ships` | Voyagers › Ships | ship piece, a route from coast to coast, the pirate |

Board snippets use a new `MiniBoard` (`rules/figures/MiniBoard.tsx`) that renders `Board2D`
non-interactive for a handful of hexes and pieces, so they follow the chosen 2D theme.

## Shared pieces

- `BuildCostsCard` moves out of `Dock.tsx` into `game/BuildCostsCard.tsx` (Dock and the `costs`
  figure both use it).
- New drawings live next to their figure; anything reused by 2+ figures goes in
  `rules/figures/art.tsx`.

## Not in scope

Other screens (lobby, profile, patch notes) — later, if this style lands well.

## Verification

Types (`tsc`), the full vitest suite, and screenshots: the standings for a 3- and a 4-player game
(desktop and phone width) and every rule-book figure. Rule text is unchanged except for the inserted
figure blocks.

## Work split

1. Main session: `{ figure }` block type + renderer, `BuildCostsCard` extraction, `reportAwards.ts`,
   `MiniBoard`, a screenshot harness.
2. Subagent A (Sonnet): end-game Podium, PointIcons, AwardBadges, GameOver wiring.
3. Subagent B (Sonnet): figures `resources, odds, setup, turn, costs, harbors, devCards, largestArmy`.
4. Subagent C (Sonnet): figures `longestRoad, robber, improvements, knights, eventDie, barbarians, ships`.
5. Main session: review diffs + screenshots, fixes, final checks.
