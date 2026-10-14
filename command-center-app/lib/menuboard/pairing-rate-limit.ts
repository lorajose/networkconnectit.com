const WINDOW_MS = 60_000;
const MAX_ATTEMPTS_PER_WINDOW = 12;

type PairingAttemptBucket = {
  startedAt: number;
  attempts: number;
};

const buckets = new Map<string, PairingAttemptBucket>();

export function checkMenuBoardPairingRateLimit(
  key: string,
  now = Date.now()
) {
  const normalizedKey = key.trim() || "unknown";
  const current = buckets.get(normalizedKey);

  if (!current || now - current.startedAt >= WINDOW_MS) {
    buckets.set(normalizedKey, {
      startedAt: now,
      attempts: 1
    });

    return {
      allowed: true,
      retryAfterSeconds: 0
    };
  }

  if (current.attempts >= MAX_ATTEMPTS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((WINDOW_MS - (now - current.startedAt)) / 1000)
      )
    };
  }

  current.attempts += 1;
  buckets.set(normalizedKey, current);

  if (buckets.size > 5000) {
    for (const [bucketKey, bucket] of buckets) {
      if (now - bucket.startedAt >= WINDOW_MS) {
        buckets.delete(bucketKey);
      }
    }
  }

  return {
    allowed: true,
    retryAfterSeconds: 0
  };
}
