import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { deletePersonalData } from '../src/server/deletePersonalData';
import { PrivacyMaintenanceError } from '../src/server/privacyMaintenance';

async function main() {
  const { values } = parseArgs({ options: {
    user: { type: 'string' }, guest: { type: 'string' }, apply: { type: 'boolean' },
    'server-stopped': { type: 'boolean' }, help: { type: 'boolean' },
  } });
  if (values.help) {
    console.log('npm run privacy:delete -- --user <id> | --guest <id> [--apply --server-stopped]\nDefault: dry-run. See docs/privacy-operations.md.');
    return;
  }
  if (!!values.user === !!values.guest) throw new PrivacyMaintenanceError('Provide exactly one of --user <id> or --guest <id>.');
  if (values.apply && !values['server-stopped']) throw new PrivacyMaintenanceError('Stop every server instance, disable automatic restarts, then supply --apply --server-stopped.');
  for (const file of ['.env.local', '.env']) if (existsSync(file)) process.loadEnvFile(file);
  const url = process.env.DATABASE_URL;
  if (!url) throw new PrivacyMaintenanceError('DATABASE_URL is required. No database was changed.');
  // Preview and apply must use the same endpoint. The deletion lock and writes also
  // share one transaction, so they cannot target different databases.
  const directUrl = process.env.DIRECT_DATABASE_URL || url;
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: directUrl }) });
  try {
    const report = await deletePersonalData(db, { kind: values.user ? 'user' : 'guest', id: values.user || values.guest! }, { apply: values.apply });
    console.log(JSON.stringify(report, null, 2));
    if (report.blockers.length) process.exitCode = 2;
  } finally {
    await db.$disconnect();
  }
}

main().catch((err: unknown) => {
  // Prisma errors can embed query data. Do not print raw errors in this operator tool.
  console.error(err instanceof PrivacyMaintenanceError ? err.message : 'Deletion failed. No successful commit was reported. Check database availability and retry the dry run; do not paste connection strings or raw query errors into logs.');
  process.exitCode = 1;
});
