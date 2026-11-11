#!/usr/bin/env node
// Local/manual run of the job import: npm run ingest  (uses DATABASE_URL if set, else local PGlite)
import { openDb } from '../lib/db.mjs';
import { runIngest } from '../lib/ingest.mjs';
const db = await openDb();
await runIngest(db);
await db.close();
