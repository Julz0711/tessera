# Privacy operations

## Before deploying this version

Set real `NEXT_PUBLIC_LEGAL_OPERATOR`, `NEXT_PUBLIC_LEGAL_ADDRESS`, and
`NEXT_PUBLIC_LEGAL_EMAIL` on the host before building. These values are public and baked
into the build. Placeholder or missing values fail production builds; development works
without them. Verify the rendered `/privacy` and `/terms` pages after deployment.

Verify that the providers, database region, backup retention, and international transfer
arrangements described on `/privacy` match the actual service configuration. The code
cannot establish these operational facts.

Every database-backed server holds a PostgreSQL shared session advisory lock. Deletion
takes the corresponding exclusive lock. Transaction pooling cannot preserve session
locks: when using Neon's pooled endpoint, set `DIRECT_DATABASE_URL` to the unpooled
endpoint for the **same database**. Other transaction poolers also require a direct URL.
Losing the lock connection stops the app process to prevent conflicting writes.

## Processing a deletion request

On Windows PowerShell, use `npm.cmd` in the commands below so arguments after `--`
reach the deletion tool unchanged.

1. Verify control of the account using the established account/contact channel. Do not
   identify someone by a display name alone or request unnecessary identity documents.
   For a guest, verify control of the guest session through a trusted support interaction;
   never ask someone to email their authentication cookie or OAuth token. If ownership
   cannot be established, resolve it manually before using this operator-only tool.
2. Resolve the internal user or guest ID through trusted administration access. A migrated
   guest must be handled through the associated account request. This CLI deliberately
   does not provide a public ID lookup or unauthenticated deletion endpoint.
3. Preview the scope (no writes):

   ```sh
   npm run privacy:delete -- --user USER_ID
   npm run privacy:delete -- --guest GUEST_ID
   ```

4. Review counts and blockers. Unfinished games must be completed first. For abandoned
   games, investigate with the operator before making any separate data changes; this
   tool does not silently discard a running game. Shared portraits need individual
   review and removal of the appropriate references before the request can proceed.
5. Schedule maintenance. Disable automatic restarts/deploys and stop **every** game-server
   instance connected to this database, including local development instances. Verify
   the processes have exited in the host dashboard/process list and the service no
   longer serves game requests. Drain queued writes using normal shutdown. Old builds
   do not take the lock, so the CLI also requires your explicit `--server-stopped`
   acknowledgement. Do not use the acknowledgement while any old instance is alive.
6. Apply after verifying the intended database configuration and rerunning the preview:

   ```sh
   npm run privacy:delete -- --user USER_ID --apply --server-stopped
   ```

   Use `--guest` instead for an unmigrated guest. The exclusive lock prevents updated
   servers from starting during the transaction. A blocked report makes no changes and
   exits with code 2. Failures exit with code 1. A repeated completed request is a no-op.
7. Confirm `applied: true`, then rerun the preview to confirm `found: false`. Restart the
   servers and check another player's history and sign-in. Retain a minimal private
   record of the handled request; never paste database URLs or raw query errors into it.

## What is removed and retained

- Account, profile, OAuth account links, sessions, friendships, associated migrated
  guests, and email verification tokens are removed transactionally.
- Target player records lose account/guest references, names and knight portraits.
  Scores, ranks, rating changes and per-game player IDs remain for other players' history.
  This is removal of stored identity links, not a claim of irreversible anonymisation.
- All snapshots and move logs of affected finished games are removed, including legacy
  JSON and free-form log text. Game summaries remain readable.
- Portrait uploads historically have no owner field. The operation therefore removes
  **all unreferenced portraits across the database**, including unrelated unsaved uploads.
  The preview reports this scope explicitly. Referenced portraits belonging to others
  are preserved. A known target portrait shared by another record blocks the operation
  for review rather than silently deleting or retaining that shared image.
- Server restart clears in-memory rooms, chat and portrait caches. Old signed guest
  cookies cannot recreate deleted database identities. Browser-local preferences stay
  on the user's device; users can remove them through browser site-data controls.

New portrait responses use `private, no-store`. Earlier deployments served portraits
with long-lived public cache headers: purge any configured CDN caches separately.
Already-downloaded browser copies cannot be recalled. Hosting logs and backups require
provider-specific handling; verify retention and prevent restored backups from making
deleted accounts/data available again before reopening the service.

## Verification and limits

Run `npm run test:privacy` for a newly created local PostgreSQL database; it never uses
the application's database URL. Test database directories remain under `.data/` for
diagnosis. The tests cover preview/apply, old cookies, migrated guests, shared images,
unfinished games, server locks, preserved histories, retries and transaction rollback.

The tool scans retained JSON to locate portrait references, so it is intended for the
current small deployment and maintenance windows. Large databases need paginated scans.
Request verification, shared-content decisions, provider backups, and abandoned games
remain operator responsibilities. Self-service deletion and automatic retention cleanup
are not implemented by this change.
