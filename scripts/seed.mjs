#!/usr/bin/env node
// npm run seed  → demo jobs + demo users (password demo1234). Add -- --reset to wipe the local PGlite database first.
import fs from 'node:fs';
import path from 'node:path';
import { openDb } from '../lib/db.mjs';
import { seedDemoJobs, seedDemoUsers } from '../lib/seed.mjs';

if (process.argv.includes('--reset')) {
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    console.error('--reset only works on the local PGlite database.');
    process.exit(1);
  }
  fs.rmSync(path.join(process.cwd(), 'data', 'pg'), { recursive: true, force: true });
}
const db = await openDb();
const n = await seedDemoJobs(db);
await seedDemoUsers(db);
console.log(`Seeded ${n} demo jobs and 3 demo users (password: demo1234)`);
await db.close();
