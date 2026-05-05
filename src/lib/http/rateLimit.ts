type Bucket = {
  count: number;
  windowStart: number;
};

const store = new Map<string, Bucket>();

/** Test helper: clear counters between Vitest cases. */
export function resetFixedWindowStoreForTests(): void {
  store.clear();
}

/**
 * Fixed-window counter. Not shared across serverless instances; use Redis/Upstash for distributed limits.
 */
export function rateLimitFixedWindow(
  key: string,
  max: number,
  windowMs: number,
  now = Date.now()
): { ok: true } | { ok: false; retryAfterMs: number } {
  if (max <= 0 || windowMs <= 0) {
    return { ok: true };
  }

  const bucket = store.get(key);
  if (!bucket || now - bucket.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now });
    pruneStale(now, windowMs);
    return { ok: true };
  }

  if (bucket.count >= max) {
    const retryAfterMs = Math.max(0, windowMs - (now - bucket.windowStart));
    return { ok: false, retryAfterMs };
  }

  bucket.count += 1;
  pruneStale(now, windowMs);
  return { ok: true };
}

function pruneStale(now: number, windowMs: number): void {
  if (store.size < 2000) {
    return;
  }
  const cutoff = now - windowMs * 3;
  for (const [k, v] of store) {
    if (v.windowStart < cutoff) {
      store.delete(k);
    }
  }
}
