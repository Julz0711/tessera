// Side-effect module: must be the first import of server.ts so every other module sees .env values.
import { existsSync } from 'node:fs';

for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) process.loadEnvFile(file);
}
