/** Disposable local database; never uses the application's DATABASE_URL. */
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import EmbeddedPostgres from 'embedded-postgres';

const root = resolve('.data');
await mkdir(root, { recursive: true });
const databaseDir = await mkdtemp(join(root, 'privacy-test-'));
const probe = createServer();
await new Promise((done, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', done); });
const port = probe.address().port;
await new Promise((done) => probe.close(done));
// Keep the directory for diagnosing failures; stop() never recursively deletes files.
const postgres = new EmbeddedPostgres({ databaseDir, port, user: 'postgres', password: 'privacy-test', persistent: true, onLog: () => {} });
const url = `postgresql://postgres:privacy-test@127.0.0.1:${port}/privacy_test`;
function run(file, args, env) {
  return new Promise((done, reject) => {
    const child = spawn(process.execPath, [file, ...args], { env: { ...process.env, ...env }, stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? done() : reject(new Error(`Test command exited with ${code}`)));
  });
}
let resultCode = 0;
try {
  await postgres.initialise();
  await postgres.start();
  await postgres.createDatabase('privacy_test');
  await run('node_modules/prisma/build/index.js', ['db', 'push'], { DATABASE_URL: url });
  await run('node_modules/vitest/vitest.mjs', ['run', 'src/server/__tests__/privacy.test.ts'], { DATABASE_URL: '', TEST_DATABASE_URL: url });
} catch (err) {
  console.error(err.message);
  resultCode = 1;
} finally {
  await postgres.stop();
}
// embedded-postgres installs an exit hook; pass the result explicitly so a failed
// child process cannot be reported as a successful test run by that hook.
process.exit(resultCode);
