# Seafarers foundation and Veiled Isles discovery plan

Date: 2026-09-29 · Working name: **Veiled Isles** · Status: discovery plan (core discovery and treasure rules captured; remaining details open)

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
rewards. A treasure is collected when one of the player's ships reaches its marked intersection. The 0–2 hidden-ocean
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
- Generate fog contents with the seeded RNG: 0–2 water, 0–1 gold, otherwise random resource terrain, and land numbers
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
  player count and seed; fog has 0–2 ocean and 0–1 gold tiles, every hidden land number is 3–11 excluding 7, and no
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
