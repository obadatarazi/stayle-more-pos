let lastId = 0;

/**
 * Client-generated record id (sales, expenses, exchanges). Microsecond-scale timestamp plus a
 * random tail so two devices recording in the same millisecond — or offline queues replayed
 * later — don't collide. Strictly increasing per device, and safely below 2^53 for centuries.
 */
export function createRecordId(): number {
  const candidate = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  lastId = Math.max(candidate, lastId + 1);
  return lastId;
}
