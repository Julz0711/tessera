# Stats, history, ratings, and leaderboards

Status: implemented October 1, 2026. The catalogue below records the original design and future metric ideas; the shipped scope and limits are listed here.

## Delivered

- Detailed post-game reports with player comparisons, economy/resource breakdowns, spending, trading, construction, cards, C&K/exploration events, actual dice expectations, timelines, milestones, and CSV/JSON exports. Reports reopen from history and require match participation.
- Profile Overview/History/Friends sections, compact expandable history, URL filters, full filtered aggregates and stable 20-game pagination.
- Independent Classic and Cities & Knights Elo, provisional status, rating snapshots and transactional/idempotent completion with sorted identity locks. World/Friends leaderboards include search, pagination, around-me navigation and a pinned personal rank.
- Accepted-friend profiles include mode ratings, lifetime results, head-to-head records, recent matches and presence/join/watch controls.

## Rollout and limits

- The local development database was updated with `npm run db:push`. `prisma/social-update.sql` contains the additive SQL for an existing installation; apply it once before deploying this server and regenerate Prisma with `npm run db:generate`. No production deployment was performed.
- Both mode pools start at 1000 when a player first completes a rated game. Existing combined ratings and deltas remain labeled legacy; earned cosmetic unlocks are preserved. Scenarios share their ruleset's rating pool. Seasons remain deferred.
- New completed games save reports. Old finished games are not reconstructed; resumed old games identify partial tracking. Missing historical details remain unavailable.
- Expected production is a pre-roll baseline, including the actual dice distribution, board, robber and bank. Gold choices, aqueduct and subsequent event-die effects are excluded and explained in the report.
- Timeline samples and milestones are bounded. The original catalogue's more specialized measures (such as every progress-card acquisition by type, merchant-specific income attribution, and lead-change counts) remain follow-up work rather than inferred statistics.
- Production build remains blocked by the existing legal-environment validation: configure real `NEXT_PUBLIC_LEGAL_OPERATOR`, `NEXT_PUBLIC_LEGAL_ADDRESS`, and `NEXT_PUBLIC_LEGAL_EMAIL` before production deployment.
- Verification: full suite 192 passed (19 database-dependent tests skipped), separate social/persistence integration run 13 passed, privacy integration run 6 passed, and TypeScript passed. Browser checks cover authenticated friends, history pagination/filtering, reports and narrow-screen layouts.

## Baseline before this change

- `src/engine/stats.ts` accumulates dice totals, production by resource/commodity, other income, robber/pirate steals and losses, discards, bank/player trade counts, development cards purchased, knights played, and progress cards played. The in-memory event log is capped, so new totals must be accumulated during play.
- `GameOver.tsx` presents standings, point sources, a dice chart, and six comparison columns. It collapses most resource detail and has no time series.
- `profileApi.ts` returns only the most recent 25 completed games. `GameHistory.tsx` combines summary tiles, recent form, mode summaries, and colorful opponent chips. “Show all” only reveals those 25, not the full history.
- `Profile.rating/ratedGames` stores one shared Elo. Classic and Cities & Knights are the engine's two `Mode` values. Sea/voyage scenarios and map variants live in game settings, not separate modes.
- `social.ts` returns the world top 50 and an out-of-list personal row. It has no mode or friends filter. Wins are lifetime wins while games displayed are rated games, so the denominators differ. Ties are also ranked inconsistently between the list and personal row.
- Game settings, final VP, turns, players, actions, and snapshots are persisted. Rich completed-game stats have no dedicated retrieval API. Raw snapshots contain private game state and must never be returned wholesale.

## 1. Expanded post-game statistics

### Layout

Keep the immediate result screen short: winner, final standings, VP sources, Elo change for the selected mode, and rematch controls. Add **Explore stats**, opening a full-width report that is also reachable from history.

Report sections: **Overview · Economy · Trades · Building · Dice · Timeline**, plus **Cities & Knights** and **Exploration** when relevant. On mobile use a section selector and a single-player view; allow a second player or the table average as a comparison. Desktop supports all-player comparisons. Explain every metric's definition in a tooltip or details panel and show units/sample sizes.

### Metric catalogue

| Area | Metrics | Data work |
| --- | --- | --- |
| Result | Winner, tied placement, final/target VP, VP sources, mode, map/scenario, player/bot count, turns, elapsed time, Elo before/after/change | Mostly final state/settings and persisted fields; persist rating snapshots; audit exploration VP sources |
| Production | Total production; each resource and commodity; share of table production; production per roll; best production roll | Resource totals exist; per-roll maximum needs tracking |
| Income | Production vs discovery/gold/card effects/aqueduct; total income; stolen income; starting resources separately | Split `otherGain` by source; keep mutually exclusive buckets |
| Losses | Discarded cards by resource; cards stolen; monopoly losses; robbery targets; production blocked by robber/pirate; bank shortages | Some totals exist; new event detail/counters needed for source and prevented production |
| Efficiency | Cards spent by build/card/upgrade category; cards remaining; discard share of gross non-trade income; actual vs expected production | Track spending and expected production; label zero denominators unavailable |
| Trading | Bank vs port trades, 4:1/3:1/2:1 ratios, player trade count and volume, resources given/received, partners, net resource flow, offers accepted/declined/expired | Counts exist; track quantities, ratios, partners and offer lifecycle; avoid claiming subjective trade “value” |
| Building | Roads/ships/settlements/cities built; upgrades, walls, destroyed pieces, longest route peak, award gains/losses/turns held, first city timing | Final board only gives remaining pieces; accumulate build/destroy/award events |
| Classic cards | Cards bought and played by type; VP cards revealed after finish; unused cards; monopoly yield; road-building gains | Existing totals plus new per-type and effect counters |
| C&K | Improvements by track; knights recruited/promoted/activated; strength committed to barbarian battles; defender awards; cities lost; metropolis history; progress cards gained/played by type; merchant income | Instrument C&K events and effects; keep resource/commodity categories separate |
| Exploration | Ships built/moved/lost; hexes discovered; islands settled; treasure, gold and discovery rewards; exploration VP | Only show fields supported by the active scenario; instrument scenario events |
| Dice | Observed totals vs expected counts, red/yellow distributions, sevens by roller, longest drought per number, C&K event die/barbarian advances | Total histogram exists; track other distributions and streaks |
| Timeline | VP, production, spending, hand size, improvements, award changes and major milestones over turns; lead changes, comeback from largest VP deficit | Capture a compact end-of-turn sample plus milestone events |
| Highlights | Highest production, most trading, fewest discarded cards, biggest comeback | Derived from complete metrics; allow ties and avoid misleading zero-game awards |

Definitions matter: a “turn” is one player's turn, a “round” is a table rotation. Display elapsed time as wall-clock time unless active play time is explicitly recorded. Use the game's actual dice rules when computing expectations: balanced dice cannot be analyzed as independent random rolls. Expected production must account for board changes, blocking, bank availability, C&K production and rule-specific events. Present luck as measured deviation, not a claim that a player deserved to win.

### Storage and API

1. Introduce versioned stats with independent optional sections and coverage metadata. Upgrade old saved states lazily; missing historical counters are **not recorded**, never zero.
2. Continue accumulating from authoritative engine events. Add narrowly scoped hooks for information the current events lack, especially spending, blocked production and trade lifecycle. Exclude rejected actions, setup grants, reconnects and event replay duplication as appropriate.
3. Persist a compact completed-game report (version, coverage, per-seat totals, turn samples, public milestones) as part of game completion. Bound samples by turn count and avoid persisting full board/hand snapshots per metric.
4. Expose `GET /api/games/:id/report` to game participants initially. A friend profile does not automatically grant access to private match reports. Return a sanitized DTO, with hidden information available only under the completed-game reveal policy.
5. Recover historical stats only from complete, verifiable snapshots/action streams. Privacy deletion or retention may remove these; leave unavailable sections empty rather than manufacture data.
6. Offer CSV/JSON export from the same authorized report after the report UI is stable. Include definitions/version and exclude private identifiers.

## 2. History, mode Elo, and leaderboards

### A calmer history

- Separate profile **Overview**, **History**, and **Friends**. Put lifetime aggregates in Overview; keep History focused on finding and opening games.
- Use one compact row: result/placement, mode + scenario, date, duration, VP, Elo delta or Unrated. Put opponents and score breakdown behind expansion; open the full report on demand.
- Filters: ruleset, scenario/map, rated/unrated, win/other result, date range, and played-with friend. Keep filter state in the URL and provide Clear filters.
- Paginate on the server using a stable `(startedAt, gameId)` cursor, 20 games per page. Filter before pagination. Show “Load more,” not “Show all,” and distinguish no games from no matches.
- Compute aggregates over the requested full scope on the server. Label lifetime, filtered period and recent-N summaries explicitly. Do not add Classic and C&K Elo deltas into one number.
- Mobile rows keep result/mode/VP/Elo visible with secondary information beneath; use restrained color for result and rating changes, not a chip for every opponent.

### Independent ratings

Default proposal: **Classic** and **Cities & Knights** each start at 1000 with their own rated-game count and provisional period. No combined Elo. Make a central rating-pool resolver instead of scattering `mode === ...` checks.

Before release, decide whether sea/voyage variants need their own competition pools. The engine currently represents these as scenarios. If they should count as separate game modes for ranking, give them explicit pool keys (including the base ruleset); do not group them accidentally. Default to two ruleset pools initially, with scenario filters and visibly documented eligibility.

Data design:

- `PlayerRating(userId, poolKey, rating, ratedGames, ratedWins, peakRating, updatedAt)`, unique on `(userId, poolKey)` and indexed for rating order.
- An immutable rating result per `(gameId, userId)` storing pool/rules version, before/after/delta, eligibility and finish time. Persist the unrated reason where applicable.
- Keep the existing multiplayer pairwise Elo and its K factors initially, scoped to the pool's game count. Preserve current two-signed-in-player eligibility unless explicitly changing the ranked rules. Bots/guests are excluded from rating comparisons. Show whether a match is rated before play.
- Finalization must be transactional and idempotent. Coordinate concurrent games involving the same users in a stable lock order, so ratings and counters cannot be lost or applied twice. Existing completion writes are not one atomic transaction.
- Use one placement definition for standings, history and rating, including winner priority and equal-VP ties. The current stored history ranks are sequential while rating uses shared places.
- Profiles display one card per pool; zero games means **Unrated**, the first 10 rated games are provisional. Cosmetics currently read the global rating: preserve earned unlocks and define a replacement (e.g. best eligible pool rating) before retiring the legacy field.

Migration recommendation: start new independent pools at 1000 on an announced cutover, preserve old history deltas as **Legacy rating**, and retain a legacy rating snapshot. Copying the shared Elo into every mode would imply unsupported skill evidence. Historical replay is an alternative only if identities, final results and completion order are complete and reproducible; do not sum old deltas to reconstruct per-mode Elo.

### Leaderboards

- Top controls: **Classic / Cities & Knights** (or approved pools), **World / Friends**. World means all eligible players on this server. Friends means accepted friends plus you; guests see a sign-in prompt for this filter.
- Rows: position, portrait/name, Elo, rated games, rated wins, rated win rate, provisional badge. Use the selected pool for every numeric column. Keep cosmetics subtle and provide a direct profile link for accepted friends.
- Show a pinned **You** row with rank and nearby players even outside the first page. Highlight friends in World. Friends positions are positions within that list; label world rank separately if shown.
- Pagination, stable tie handling and a shared ranking query: equal Elo shares competition rank (`1, 2, 2, 4`), with a stable secondary ordering for display/pagination. Personal rank must match the table.
- Add “Around me” and search by player name/code after mode and scope filtering work. Defer seasons and reset logic until the permanent ladders are established.
- Specify loading, retry, no rated games, no friends, unrated self, and database-unavailable states; show rated win rate only with a nonzero denominator.

## 3. Friend profiles (implemented in this change)

Accepted friends' names in the profile/lobby friends lists open `/profile/[code]`. The read-only page shows appearance/title, presence, lifetime games/wins/win rate, independent mode ratings, head-to-head records, ten recent finished results, and join/watch when available. The API verifies an accepted friendship in either direction on every fetch and returns a dedicated DTO. It exposes no session, providers, preferences, internal user IDs or other players' match data. Provider-avatar opt-out is respected in social cards. Unknown, removed and pending friends receive the same unavailable response.

Mode rating cards and head-to-head shared-game records are included in this implementation.

## Delivery order and acceptance

1. **Foundations:** metric definitions/coverage, report DTO/storage, rating pool decision and transactional completion. Verify old saves load, retries do not double-count and parallel finishes preserve ratings.
2. **Ratings + leaderboard:** schema/migration, independent mode updates, World/Friends filtering, consistent ranks and cosmetics compatibility. Verify playing Classic changes no C&K rating; bots/guests do not gain Elo; pending friends never enter Friends scope; ties and personal rank match across pages.
3. **History:** compact rows, filters, cursor pagination and authoritative summaries. Verify more than 25 games, stable same-time pagination, filter resets, missing dates, tied results, legacy/unrated labels and mobile layout.
4. **Stats first release:** rich breakdowns available from current counters/final state, report link from history, explicit incomplete historical coverage. Test conservation of resources and parity between report totals and engine events; audit all VP sources.
5. **Stats expansion:** spending, trade lifecycle, blocked/expected production, C&K/exploration sections, timelines and export. Use deterministic scenario tests per metric; verify mode-specific fields are absent when inapplicable, balanced-dice expectations and zero denominators.
6. **Polish:** head-to-head friend comparisons, keyboard/touch navigation, readable charts/tables, reduced motion, empty/error states and performance with long games/large histories.

Friend-profile acceptance: signed-in accepted friends can open each other's profile in either friendship direction; strangers, guests, pending requests and removed friends cannot; disabled avatars stay disabled; empty history and fetch failures are usable; no account secrets appear in the response.
