# Privacy and accessibility implementation plan

Status: first batch implemented and validated. Full keyboard gameplay deferred
at the user's request. See `docs/privacy-operations.md` for the deletion workflow and limits.

Implementation decision: preserve score summaries and remove affected finished games'
raw snapshots/events rather than rewriting potentially historical free-form payloads.
Unfinished games and shared target portraits block apply for operator review. The CLI
uses a maintenance lock shared with the server; public self-service deletion is deferred.

Validation: TypeScript and production build passed using fixture operator details;
missing legal configuration correctly blocks the build. The regression suite passed
183 tests, and six additional database tests passed on disposable PostgreSQL. Browser
checks covered desktop/mobile layout, dialog names, Tab/Shift+Tab wrapping, Escape and
focus restoration. No deployment or production deletion was performed.

## Objective and scope

Make Tessera's published privacy promises operational, verify operator configuration,
and address concrete accessibility gaps. Deliver the first batch as three independently
reviewable changes: deletion tooling, operator configuration checks, and dialogs.
Follow with board keyboard access, retention, and license documentation.

This is an engineering plan, not a determination of legal compliance. The repository
was inspected; live configuration, provider contracts, and deployment behavior were not verified.
Do not execute deletion against production data as part of implementing this plan.

## 1. Deletion tooling and request procedure

Relevant code: `prisma/schema.prisma`, `src/server/prismaPersistence.ts`,
`src/server/migrateGuest.ts`, `src/server/faces.ts`, `src/server/identity.ts`,
and `src/server/__tests__/persistence.test.ts`.

- Inventory identifiers and personal content in users, accounts, sessions, profiles,
  friendships, guest records, player records, room settings, event payloads, snapshots,
  and uploaded portraits. Trace guests migrated to an account before removing links.
- Implement a reusable server-side deletion service and an operator CLI. Accept an
  explicit user or guest ID, default to dry-run, and require an explicit apply flag.
  Report affected record counts without dumping emails, names, tokens, or image bytes.
- Use maintenance mode for the first version: stop all game-server instances and queued
  writers before applying, then restart after completion. Document how to verify the
  server is stopped and how to prevent automatic restart during the operation. Do not
  advertise safe deletion while the app is serving traffic.
- Delete account/session/profile/friendship data and associated guest identities.
  Replace identifying names and customisations in retained game data, removing account
  and guest references while preserving scores, turns, and other players' history.
  Inspect structured JSON explicitly; do not use broad string replacement.
- Resolve portrait references across live profile data and historical JSON. Remove
  unreferenced image bytes after scrubbing. Deduplicated images may be referenced by
  others: report shared references for explicit review rather than assuming they are
  either safe to erase globally or automatically outside a deletion request's scope.
- Keep relational changes and JSON scrubbing transactional. Make retries safe and
  repeated requests harmless. Abort on unsupported historical data shapes that cannot
  be scrubbed safely, reporting the issue without exposing the payload.
- Document request verification without requiring unnecessary identity documents,
  guest verification, operator execution, failure recovery, and backup/restore handling.
  Do not promise that application deletion immediately erases provider backups.
- Update privacy wording to match the verified behavior. Keep email as the request
  channel initially; defer self-service deletion until concurrent live writes and
  connected sessions are handled safely.

Acceptance:

- Isolated database tests cover users, guests, migrated guests, snapshots/events,
  portraits, shared references, rollback, dry-run, and repeated application.
- Distinctive fixture names, identity IDs, and targeted portrait references no longer
  occur in retained application records after a successful deletion.
- Old account sessions fail; unrelated accounts, friendships and game histories remain
  correct; retained games can still be read by the existing history code.
- Tests use a disposable database and never fall back to the configured production DB.

## 2. Operator configuration and accurate notices

Relevant code: `src/config/legal.ts`, `src/app/privacy/page.tsx`,
`src/components/auth/SignInChoices.tsx`, `.env.example`, `render.yaml`,
`package.json`, and `docs/deploy-checklist.md`.

- Add a build-time production check for operator name, postal address and contact email.
  Reject missing values and the known placeholder defaults; validate basic email syntax.
  Development should remain usable with clearly marked placeholders.
- Document required variables in the example environment and deployment setup. Supply
  genuine operator details before the first deployment using the new build check.
  Do not invent these details or publish private information from unrelated sources.
- Account for NEXT_PUBLIC values being embedded during the build: changing runtime
  environment values alone must not be presented as updating the published details.
- Verify hosting/database regions, providers, transfer statements and contact links
  against actual deployment information before declaring the notices complete.
- Change sign-in wording to: "By signing in, you agree to the Terms. See our Privacy Policy."
- Review whether a separately labelled operator/legal notice is appropriate for the
  actual operator and audience; do not infer its legal scope merely from being free.

Acceptance:

- Production configuration validation fails clearly for missing or placeholder data
  and succeeds for complete fixture values; local development still starts.
- A production build renders the supplied details and working contact links.
- Existing privacy and terms links remain easy to reach.

## 3. Accessible dialogs

Relevant code: `src/components/ui/Modal.tsx` and all of its callers.

- Associate each dialog with an accessible title, including callers without visible titles.
- Move focus to a suitable initial control or content element, contain Tab/Shift+Tab,
  and restore focus to the opener when it still exists.
- Preserve dismissable behavior, Escape handling, backdrop clicks, and scroll behavior.
  Review nested/stacked dialogs so only the active modal controls focus and background access.
- Review uses of `dim={false}`: shading and interaction modality are separate decisions.
  Make background content inert for modal dialogs; explicitly identify any callers that
  need a non-modal interaction instead of trapping focus indiscriminately.

Acceptance:

- Browser verification covers title announcement, forward/backward tabbing, Escape,
  non-dismissable dialogs, focus restoration, stacked dialogs, and mobile scrolling.
- Add focused behavioral regression tests using an appropriate DOM/browser test setup;
  the existing Vitest configuration runs in Node and cannot verify focus by itself.

## 4. Deferred: complete keyboard play and contrast

Full keyboard gameplay is outside the current implementation scope at the user's request.

- Use the 2D board as the initial accessible game interaction path, available from
  the 3D view. Add meaningful labels and keyboard operation for legal placement,
  robber/pirate selection, and other board actions.
- Use a manageable focus model (roving focus or a semantic action list), rather than
  requiring a Tab press for every board element. Preserve pointer and touch controls.
- Make selected targets, legal actions, turn changes and validation feedback perceivable
  without relying on colour alone. Audit contrast in representative themes and states.
- Verify a complete keyboard-only game and representative expansion-specific actions,
  plus a screen-reader pass. Do not label the whole game accessible based only on dialogs.

## 5. Retention and cleanup

- Define a retention table before adding destructive scheduled work. Use guest expiry
  as an input, but protect active games and resolve migrated-account relationships.
- Decide separately what is necessary for game history, recovery snapshots, detailed
  events, guest profiles and uploads. Proposed defaults should be reviewed against
  actual product needs before cleanup is enabled.
- Reuse deletion/scrubbing primitives; add bounded, repeatable cleanup with dry-run,
  record counts and failure reporting. Resolve safe scheduling and concurrent writes
  before running cleanup in the live server.
- Test cutoff boundaries, active games, references and retries. Synchronize privacy
  statements with actual retention and hosting backup behavior.

## 6. Asset licenses and release checks

- Add an asset/dependency provenance record covering fonts, icons, procedural art,
  third-party packages and any bundled images, with sources, licenses and notices.
- Separate development reference images from shipped assets; do not assume generated
  or procedural assets establish clearance for copied designs or trademarks.
- Retain required notices and document the uploaded-content removal process.
- Extend the deployment checklist to revisit disclosures when collecting new data,
  adding providers, changing the audience, or introducing payments or marketing.

## Deferred scope and verification

- Cookie consent UI: review each storage purpose first, including guest persistence
  and patch-note state. Remove unnecessary storage where feasible; add a consent
  mechanism when the actual storage/services require one.
- Refunds, unsubscribe and payment disclosures: revisit when those features exist.
- Age verification: decide intended audience and processing basis before collecting
  age data or implementing parental-consent flows.
- Self-service account deletion: follow the tested maintenance tool with a separate
  design for request authentication, active games, connected clients and write races.

For code changes, run focused tests, `npm run typecheck`, the repository test suite,
and a production build with fixture legal configuration. Database checks require an
isolated test database. Verify UI changes in the browser. No deployment or production
data mutation is included in this planning task.
