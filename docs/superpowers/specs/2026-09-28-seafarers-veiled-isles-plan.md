# Seafarers foundation and Veiled Isles discovery plan

Date: 2026-09-29 · Working name: **Veiled Isles** · Status: **implemented** (see "Implementation status" below)

## Implementation status (2026-09-29)

Built on branch `codex/find-rules-for-treasure-islands-mode`:

- **Engine:** sea terrain; ships (cost, 15 per player, placement, road/ship links only at own buildings, one
  move per turn of an open-route end, never a ship built this turn); pirate (sea only, chosen instead of the
  robber on a 7 or knight, robs ship owners, blocks placing and sailing away); longest trade route; ship instead
  of a starting road; Road Building places roads or ships; island special points; settlements may stand at the
  end of a ship route.
- **Maps:** Far Shores (14 VP classic / 17 C&K, 2 VP per small isle), Four Realms (13 / 16, 2 VP per foreign
  island, robber starts on the 12), Veiled Isles (Special, C&K only, 16 VP, 1 VP per foreign isle). Each is our
  own layout after the rulebook's scenario; terrain and numbers are dealt per game.
- **Veiled Isles:** laid out after the reference board: the base island in a 9-row frame (8–12 wide) with 15 fog
  hexes scattered around it and no visible outer isles (exactly 2 sea, 0–1 gold, numbers 3–11 without 7, repeats
  allowed), discovery pays the terrain's resource (gold: a pick), 15 treasures from a shuffled 5/4/3/3 deck on the
  reference board's fixed chest corners, collected by a
  road or ship reaching the corner; hidden sea pays an independent random bonus treasure. Treasure contents and fog are
  redacted from views.
- **Clients:** open water, ships, the pirate and treasure chests on the 2D and 3D boards; Ship and Sail buttons;
  road-or-ship popups in setup, Road Building and build hints; lobby map groups (Base game / Voyagers / Special).
- **Bots:** plan ships toward settlement spots, foreign islands, treasures and fog; move the pirate; handle every
  new prompt. Self-play covers all three maps.

Tessera interpretations made while building (change them in one place if the original differs):

1. Fog contents are drawn at game creation with the seeded RNG and kept server-side (as Black Forest does),
   rather than at reveal time. Players see the same thing: nothing leaks until a reveal.
2. A fogged hex counts as land for placement legality until revealed, so move legality never leaks the fog.
3. A ship reveals fog on every hex touching its two corners (the existing Black Forest rule for roads).
4. "Development card of choice" in Knights & Barbarians draws a progress card from a deck of the player's choice.
5. In Knights & Barbarians the pirate, like the robber, stays put until the first barbarian attack; the Bishop and
   knight chases move only the robber.
6. Knights are recruited on, and move along, roads and ships alike (as in the combined rules); a ship whose open
   end holds its owner's knight can't sail. Intrigue reaches knights beside your roads or ships.
7. Home islands are the islands a player built on during setup; special points count each other island once.
8. Maps use one layout for 2–4 players (the rulebook has separate 3- and 4-player boards).
9. Veiled Isles wins at 16 (owner's call); Far Shores and Four Realms add C&K's +3 to their target.

## 0. Product decisions (confirmed by the owner)

- **Scenario name:** keep the working title **Veiled Isles** (`veiledIsles`); it must not copy the source game's title.
- **Seafarers boards:** ship **two default Seafarers maps** (non-fog starters, `requires: ['seafarers']`) plus **one**
  Veiled Isles board. Confirmed: the two defaults are non-fog starters. Rules come from the official rulebook (§0.1).
- **Own names, not the source game's:** the expansion is called **Voyagers** (id `seafarers` stays internal); the two
  starters are **Far Shores** (rulebook scenario 1, "Heading for New Shores") and **Four Realms** (scenario 2,
  "The Four Islands"). Layouts are re-created from the diagrams; names, art and text are our own.
- **Veiled Isles is Seafarers + Cities & Knights merged.** It is not a third rules module; it is a scenario that
  requires both.
- **Category recommendation (accepted default):** keep `Mode` as-is and add `category` to map metadata, because
  `Mode` means "card and city rules" and is used across ~20 files. Voyagers and Special maps set the rule flags
  they need (`requires`, `modes`); the lobby groups by category.
- **Lobby categories:** `Classic`, `C&K`, `Seafarers` and `Special`. Category is a *presentation/selection* concept
  layered over the existing rule flags, so `Mode` (`classic` | `ck`) keeps meaning "card and city rules" and is not
  extended. Veiled Isles lives under `Special`; its `requires` is `['seafarers']` and its `modes` is `['ck']`.
  Implementation: add `category` to `MapDefinition` and group the lobby map picker by it.
- Remaining Phase 0 items are resolved from the official rulebook wherever it covers them; anything it does not cover
  stays a labelled Tessera interpretation.

### 0.1 Rules decision table (source: Catan Seafarers 2021 rulebook, 5th English ed., Dec 2020 rules take precedence)

| Topic | Rule (rulebook) | Engine note |
| --- | --- | --- |
| Ship cost / supply | 1 wool + 1 lumber; 15 ships per player | New `COSTS.ship`, per-player piece limit 15 |
| Placement | Only on edges between sea/sea or sea/land (never land/land); never on an edge that has a road, and vice versa; one piece per edge | Needs sea terrain and coastal edge queries |
| Ship connectivity | Adjacent to own settlement/city on the coast, or to another own ship; branching allowed | Same graph rule as roads |
| Road/ship junction | Roads and ships connect only through an own settlement/city at the shared vertex | Route graph splits at joints without a building |
| Closed route | Unbroken ships joining two of the owner's settlements/cities; never movable | Derived, not stored |
| Moving ships | 1 per turn, build phase only, not one built this turn, must follow placement rules, only if one end touches none of the owner's other pieces (open-route end) | New `moveShip` action + legality query |
| Longest Trade Route | Replaces Longest Road; counts roads and ships, open or closed; single longest branch; 2 VP; road/ship link needs a building | Generalize longest-road |
| Road Building card | Two pieces, each a road or a ship | Reuses Road Building prompt |
| Gold fields | On a roll, each adjacent settlement takes 1 (city 2) of any resources, any mix | Choice prompt; no gold resource |
| Start with a ship | A coastal starting settlement may take a ship instead of a road | Setup rule |
| Pirate | Placed on sea hexes only; on a 7 move robber **or** pirate; a knight may move either; the pirate steals one random card from one player with an adjacent ship; it blocks new ships on its hex borders and blocks moving away ships on those borders; scenarios with no desert start the robber off-board | Robber/pirate choice on 7 and knight |
| Special VP | Scenario-defined chits placed under the earning settlement/city | `Far Shores`: 2 VP per small island; `Four Realms`: 2 VP per foreign island; Veiled Isles: 1 VP per foreign island |
| Harbors | Use the large Seafarers harbor tokens, placed randomly on the marked coasts | Existing harbor logic per layout |
| `Far Shores` | 3-4 players; main island + small islands; 14 VP; main-island and small-island terrain and numbers randomized (red numbers not adjacent); setup on the main island; pirate + robber | Slot-based generation |
| `Four Realms` | 3-4 players; four fixed island contours, terrain and numbers freely redistributed; start on one or two islands; 13 VP; pirate + robber | Slot-based generation |

Open item found while reading: the 3-player `Far Shores` text says the pirate starts on the hills hex marked "12", which
conflicts with a sea-only pirate rule; treat as a rulebook typo and start the pirate on the marked sea hex until the
diagram is checked. The rulebook does not cover Cities & Knights, so C&K interactions for Veiled Isles remain
Tessera interpretations.

## 1. What we can decide now

### Scenario name

Do not ship under the source game's scenario name. The recommended working title is **Veiled Isles**: it describes
fog-hidden islands without copying the original title and fits the existing short map names. Other viable options are
**Shrouded Shores**, **Lost Archipelago**, **Mistbound Isles**, and **Hidden Havens**. Use `veiledIsles` as the stable
internal id even if the display name changes before release, so renaming does not break saved games.

The supplied in-game help establishes the core scenario loop: the normal Seafarers rules apply; players explore fog
with ships; placing a ship next to a fog hex immediately reveals land or sea; discovering land grants one resource
matching that terrain; reaching a treasure-marked intersection with a ship collects its treasure; and each player's
first settlement on each small/foreign island grants one special victory point. The supplied rules clarification also
defines the treasure mix and the special reward for discovering hidden ocean. Setup, pirate behavior, the final
victory target, and some Cities & Knights interactions still need confirmation rather than guesses.

We can safely build Seafarers first. It supplies the reusable rules and presentation needed by Veiled Isles:

- water hexes and disconnected islands;
- ships on sea/coastal edges, including ship building, route continuity, movement, and piece limits;
- the pirate and its effect on shipping;
- longest trade route across roads and ships;
- gold-field production and resource-choice prompts;
- scenario-authored board layouts, setup regions, and victory-point targets;
- rendering and interaction for ships, water, the pirate, and larger boards in both 2D and 3D;
- bot/autopilot support for every new mandatory decision.

Seafarers should be a rules **feature layered onto a scenario**, not a third mutually exclusive mode. The existing
`classic` / `ck` mode selects the card and city rules, while scenario features select water, ships, pirate,
exploration, treasures, and scenario-specific scoring. That allows Veiled Isles to compose Seafarers with
Cities & Knights without duplicating either ruleset.

## 2. Captured Veiled Isles rules

Treat the following as the current scenario contract:

### Exploration and island scoring

- The scenario uses the Seafarers rules.
- A fog hex is revealed immediately whenever a newly placed ship borders it.
- A revealed land hex rewards the explorer with one resource matching the revealed terrain.
- The hidden region contains zero, one, or two ocean hexes; two is a maximum, not a guarantee.
- The hidden region contains zero or one gold hex; one is a maximum, not a guarantee.
- Every hidden hex's terrain is selected randomly. Hidden land receives a random number from
  `3, 4, 5, 6, 8, 9, 10, 11`; hidden land never receives 2, 7, or 12.
- No balancing rule for adjacent 6/8, duplicate numbers, or fixed terrain/number bags has been supplied yet; those
  details must not be invented from "completely random" and remain part of the rules-evidence checklist.
- Revealing a hidden ocean hex awards a bonus treasure. Each such bonus is an independent, fully random draw from
  the four treasure **types** below; it does not consume one of the 15 placed treasure tokens.
- A player receives one special victory point for their first settlement on **each** small/foreign island. Later
  settlements by that same player on the same island do not award another point. Different players can each earn the
  island's point once.
- Fog contents are generated at **reveal time**, using the same deterministic reveal-event pattern as Black Forest.
  The server RNG decides the tile and number, stores the result, and emits the reveal; reconnect and replay must never
  draw it again.
- Land tiles, number tokens, and harbors are randomized for each game. The supplied reference images define the board
  silhouette, starting-island footprint, fog slots, outer-island slots, and eligible harbor coasts—not a fixed deal.

### Placed treasure deck

There are exactly 15 treasure spots. At game creation, shuffle this fixed multiset with the seeded engine RNG and
assign one reward to every spot:

| Count | Reward | Resolution |
| ---: | --- | --- |
| 5 | Resource of choice | Player selects one resource; then take it from the bank. |
| 4 | Road building | Player places up to two free route pieces, each chosen as a road or ship subject to normal placement and supply rules. |
| 3 | Three resources | Take exactly one wool, one grain, and one brick from the bank. |
| 3 | Development card of choice | Player selects a development-card type and receives that card. |

The pool is shuffled **without replacement**, so every game has this distribution rather than 15 independent random
rewards. A treasure is collected when one of the player's roads or ships reaches its marked intersection. The 2 hidden-ocean
bonuses are separate random rewards and therefore may make the total rewards received in a game exceed 15.

### Decisions required for deterministic implementation

The following reward details are not specified by the help text. Unless further game footage contradicts them, use
these explicit Tessera interpretations:

- "Up to two" free routes permits taking only one when no legal second placement exists; unused placements expire.
- Each free route is independently a road or a ship, and the second is resolved after the first, using the resulting
  board position.
- A chosen development card goes into the ordinary development-card hand and follows the normal newly-acquired-card
  restriction. If that type is exhausted, it cannot be selected.
- Resource rewards obey bank shortages per resource: unavailable cards are not substituted and the rest of a
  multi-resource reward is still granted.
- Treasure identities remain hidden until collected; treasure locations and whether a token has been collected are
  public.
- Hidden-ocean bonus treasure uses an independent uniform choice among the four reward types. It does not alter or
  deplete the 15-token deck.
- Revealing gold grants a resource of the explorer's choice, matching normal Seafarers gold-field behavior.

These are deliberately isolated rules, so they can be changed without changing map generation if the original game
demonstrates different behavior.

## 3. Rules evidence still required

The in-game help screenshot is an authoritative source for the exploration trigger, land-discovery resource, treasure
collection trigger, and per-player foreign-island point. The supplied clarification specifies the treasure counts,
reward details, and hidden-ocean behavior. Before final implementation, capture the following remaining details from
the game, its manual, or a complete recording:

Capture the following in a short rules transcript. Exact UI wording is useful, but a description plus screenshots
of each prompt is enough.

1. **Identity and version** — game title, platform, language, version/year, and the exact scenario name. This avoids
   conflating similarly named fan scenarios or editions.
2. **Board and setup** — exact player-count layouts; legal starting islands/corners; starting pieces and cards;
   first-player and setup order. Tiles, numbers, and harbors are already confirmed as randomized within the slot
   regions reconstructed from the supplied reference images.
3. **Sea rules** — ship cost and supply; where ships may be placed; open/closed route definition; when and how the
   last ship of a route moves; whether roads and ships may meet without a building; pirate placement, blocking, and
   stealing; longest-route rules.
4. **Discovery** — whether random terrain/numbers use fixed bags or independent draws; whether duplicates and adjacent
   6/8 are allowed; whether multiple fog hexes can be revealed by one placement; and whether the proposed gold
   discovery reward matches the original game. Reveal-time generation is confirmed.
5. **Treasure edge cases** — whether rewards may be deferred; what happens with an exhausted bank, route supply, or
   development-card type; and whether treasure identities are visible before collection.
6. **Cities & Knights** — initial city/settlement placement; barbarian and robber/pirate activation; knight movement
   across sea routes; whether knights can occupy discovered islands; merchant, aqueduct, progress-card, metropolis,
   and city-loss interactions; whether treasures affect commodities or progress cards.
7. **Scoring and endgame** — foreign-island settlement points, treasure points, scenario bonuses, target VP, and
   whether victory is checked only on the active player's turn.
8. **Edge cases** — simultaneous prompts, blocked ships, displaced routes, exhausted pieces, bank shortages, and
   every exception explicitly shown by the digital game.

If an official source remains unavailable, the fallback is an explicitly labelled **Tessera interpretation**. It
must be approved before coding and documented in the same style as the existing C&K house interpretations.

## 4. Proposed architecture

### Scenario model

Replace the growing `MapId` switch with data-driven `ScenarioDefinition` records. A definition owns stable ids,
player-count bounds, layout coordinates, tile/token/harbor distribution, setup zones, target VP, and enabled rules:

```ts
interface ScenarioFeatures {
  seafarers?: boolean;
  pirate?: boolean;
  exploration?: 'none' | 'fog';
  treasures?: TreasureRules;
  citiesAndKnights?: 'allowed' | 'required' | 'forbidden';
}
```

Persist a scenario id plus its generated board state; never regenerate an active game from a possibly changed
definition. Keep compatibility aliases for today's map ids so saved games and room links continue to load.

Every map definition carries visible compatibility tags. Initially support `base` and `seafarers`, plus compatible
card/city modes (`classic` and/or `ck`). The lobby filters or disables incompatible combinations, and both the room
server and `createGame` reject forged combinations. In particular, a map requiring `seafarers` must never start with
only the base rules enabled.

### Engine state

- Extend terrain with water and make topology distinguish land, sea, and coastal edges/vertices.
- Store roads and ships separately (or use a discriminated route piece) so ownership, supply, legal placement, and
  movement are unambiguous.
- Add pirate position, movable-ship state, discovered tile state, and public treasure tokens/rewards to `GameState`.
- Generate fog contents with the seeded RNG: exactly 2 water, 0–1 gold, otherwise random resource terrain, and land numbers
  limited to `3, 4, 5, 6, 8, 9, 10, 11`. Keep the draw strategy configurable until its bag/replacement rules are
  confirmed.
- Represent the placed treasure rewards as a seeded shuffle of the exact 5/4/3/3 multiset. Resolve hidden-ocean
  rewards from a separate uniform four-type roll so those draws neither consume nor distort the placed pool.
- Model resource choices and treasure choices as normal `Prompt` variants. Model reveal, collection, pirate movement,
  and reward resolution as `GameEvent`s so replay, animation, persistence, and redaction remain deterministic.
- Keep all random tile, number, treasure, and steal choices on the seeded engine RNG.
- Generalize longest road into longest trade route, splitting a road-to-ship connection unless the owner has a
  building at the joint and respecting opponent buildings and pirate blocks.

### Protocol and compatibility

- Add feature/scenario fields rather than inferring behavior from board shape.
- Version serialized snapshots or supply migration/default functions for every optional field.
- Redact unrevealed terrain, numbers, and treasure identities from `PlayerView`; do not rely on the renderer to hide
  secret engine state.
- Validate room combinations server-side (for example, Veiled Isles requiring C&K) and derive defaults from the
  selected scenario.

### Clients and bots

- Both renderers consume the same derived board model for water, ships, movable-ship targets, pirate, fog, and
  treasure markers.
- Lobby map cards state required expansions, player range, target VP, and whether the board is fixed.
- Interaction hints use engine legality queries; the client must not duplicate ship or discovery legality.
- Extend bots in small steps: legal ship placement first, then route evaluation, exploration value, treasure choices,
  pirate targeting, and finally C&K/sea trade-offs. Autopilot must always resolve mandatory prompts even before the
  strategic bot is sophisticated.

## 5. Delivery sequence

### Phase 0 — evidence and executable rules table

1. Preserve the supplied help text, reference boards, and treasure clarification in the rules decision table.
2. Obtain the official Seafarers rulebook and cite its edition for every shared ship/pirate/trade-route rule.
3. Produce a rule-by-rule decision table with source references and a separate list of unresolved interpretations.
4. Reconstruct randomized slot regions from the reference images and confirm the silhouettes visually.
5. Approve the table before engine work specific to Veiled Isles begins.

**Exit:** every action, prompt, reward, score source, and C&K interaction has a deterministic answer or an approved,
labelled house rule.

### Phase 1 — scenario/topology refactor (no behavior change)

1. Introduce scenario definitions and compatibility mappings for every current map.
2. Make topology support sparse maps and water without changing current legality.
3. Add snapshot normalization/migration and generation invariant tests.

**Exit:** all existing tests and seeded boards remain stable; old snapshots load.

### Phase 2 — core Seafarers

1. Implement the official rulebook's water/coasts, ships, ship supply/cost, placement, movement, road/ship junctions,
   and longest trade route without filling gaps from memory.
2. Add pirate placement/blocking/stealing and robber-versus-pirate choice where required.
3. Add gold fields and the generic choice-prompt plumbing needed by scenarios.
4. Add 2D/3D assets and interaction targets, then basic bot/autopilot behavior.
5. Ship and validate three official starter scenarios before Veiled Isles: **Heading for New Shores**, **The Four
   Islands**, and **The Fog Island** (use the exact titles/layouts from the acquired rulebook; adjust these working
   labels if that edition names them differently). Their definitions require the `seafarers` tag.

**Exit:** a minimal, non-fog Seafarers scenario completes correctly in local multiplayer and repeated bot self-play.

### Phase 3 — exploration and reusable treasure framework

1. Add hidden tiles/numbers, deterministic reveal events, rewards, and redacted views.
2. Implement data-driven treasure placement and reward resolvers rather than scenario-name branches.
3. Add reconnect/replay tests at each prompt boundary and visual coverage in both renderers.

**Exit:** a test scenario can reveal every tile and collect every reward with no hidden-information leaks.

### Phase 4 — Veiled Isles + C&K composition

1. Encode the verified layout, setup, treasure table, scoring, and target VP.
2. Implement and test every approved C&K interaction from the Phase 0 table.
3. Teach bots scenario strategy; add deterministic full-game simulations over many seeds/player counts.
4. Add lobby copy and an in-game rules summary that labels any Tessera interpretations.

**Exit:** golden rule tests, self-play, reconnect/persistence tests, and manual two-client play all pass.

## 6. Test matrix and acceptance criteria

- **Generation:** tile/token/harbor/treasure counts, fixed coordinates, setup zones, and constraints for every supported
  player count and seed; fog has exactly 2 ocean and 0–1 gold tiles, every hidden land number is 3–11 excluding 7, and no
  hidden land ever receives 2 or 12. Add distribution/adjacency assertions after the draw rules are confirmed.
- **Ships:** all legal/illegal placements; road/ship transitions; movable-route endpoints; closed routes; piece
  exhaustion; pirate blocks; trade-route ties and interruption.
- **Discovery/treasure:** exactly 15 placed rewards with a 5/4/3/3 distribution; independent ocean bonus draws;
  terrain-matching discovery resources; gold discovery choice; first-settlement-per-player-per-island points; reveal
  timing; reward exhaustion; queued choices; reconnect mid-choice; public/private views; deterministic replay from
  events and snapshots.
- **C&K composition:** production/commodities on remote islands; knights beside sea routes; aqueduct and merchant on
  gold fields if allowed; robber/pirate activation; barbarian loss; progress cards that modify routes or pieces.
- **Server:** reject invalid feature combinations and forged actions; persist/migrate new state; spectators receive
  only public information.
- **Bots:** no rejected actions in long self-play runs and no stalled mandatory prompt.
- **UI:** keyboard/touch selection, clear ship versus road targets, 2D/3D parity, color-independent treasure/fog
  markers, and usable framing on the larger board.

## 7. Recommended immediate next step

Finish the smaller Phase 0 gap before scenario-specific implementation. The most useful remaining input is the exact
game/platform/version plus any help page covering setup, victory target, pirate behavior, or Cities & Knights
exceptions. Meanwhile, Phase 1 and the non-scenario-specific portion of Phase 2 can start from a verified Seafarers
rulebook; the treasure deck, exploration rewards, and foreign-island scoring are now concrete enough to test.
