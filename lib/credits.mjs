/** Recruiter credits: unlock candidate profiles, feature jobs. Every change is written to credit_ledger. */
export const STARTER_CREDITS = 5;
export const UNLOCK_COST = 1;
export const FEATURE_COST = 10;
export const FEATURE_DAYS = 14;
export const CREDIT_PACKS = [
  { id: 'p10', credits: 10, price: '₹2,999', note: 'Try it out' },
  { id: 'p50', credits: 50, price: '₹11,999', note: 'Most popular · ₹240 per credit' },
  { id: 'p200', credits: 200, price: '₹39,999', note: 'Agencies · ₹200 per credit' },
];

export class CreditError extends Error {}

/** Atomically spend credits; throws CreditError if the balance is too low. Returns the new balance. */
export async function spendCredits(db, userId, amount, reason) {
  const row = await db.get(
    'UPDATE users SET credits = credits - $2 WHERE id = $1 AND credits >= $2 RETURNING credits',
    [userId, amount]
  );
  if (!row) throw new CreditError(`This needs ${amount} credit${amount > 1 ? 's' : ''}. Buy more credits to continue.`);
  await db.run('INSERT INTO credit_ledger (user_id, delta, reason) VALUES ($1, $2, $3)', [userId, -amount, reason]);
  return row.credits;
}

export async function grantCredits(db, userId, amount, reason) {
  const row = await db.get('UPDATE users SET credits = credits + $2 WHERE id = $1 RETURNING credits', [userId, amount]);
  await db.run('INSERT INTO credit_ledger (user_id, delta, reason) VALUES ($1, $2, $3)', [userId, amount, reason]);
  return row?.credits;
}
