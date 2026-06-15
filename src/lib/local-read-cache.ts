type CacheEnvelope<T> = {
  version: 1;
  savedAt: number;
  value: T;
};

const CACHE_PREFIX = "hermes:read-cache:v1:";

export function readLocalReportCache<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) {
      return null;
    }

    const envelope = JSON.parse(raw) as CacheEnvelope<T>;
    return envelope.version === 1 ? envelope.value : null;
  } catch {
    return null;
  }
}

export function writeLocalReportCache<T>(key: string, value: T): T {
  if (typeof window !== "undefined") {
    try {
      const envelope: CacheEnvelope<T> = {
        version: 1,
        savedAt: Date.now(),
        value,
      };
      window.localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(envelope));
    } catch {
      // Cache is an optimization only; engine reads remain the source of truth.
    }
  }

  return value;
}

export function clearLocalReportCache(key: string) {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  }
}
