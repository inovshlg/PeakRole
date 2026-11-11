#!/usr/bin/env node
// Local/manual run of the alert emails: npm run send-alerts
import { openDb } from '../lib/db.mjs';
import { runAlerts } from '../lib/alerts.mjs';
const db = await openDb();
await runAlerts(db);
await db.close();
