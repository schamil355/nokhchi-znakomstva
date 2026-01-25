type CacheEntry = {
  uri: string;
  expiresAt: number;
  lastAccess: number;
};

const CACHE_KEY = "photo-cache:v2";
const MAX_ENTRIES = 200;
const DEFAULT_PUBLIC_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_SIGNED_TTL_MS = 110 * 1000;

const cache = new Map<string, CacheEntry>();
let hydrated = false;
let persistHandle: ReturnType<typeof setTimeout> | null = null;

const isWeb = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const inferSignedUrl = (uri: string) =>
  /token=|x-amz-signature=|signature=|sig=|auth=|expires=/.test(uri.toLowerCase());

const hydrateCache = () => {
  if (hydrated || !isWeb()) {
    hydrated = true;
    return;
  }
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
    const now = Date.now();
    Object.entries(parsed).forEach(([key, entry]) => {
      if (entry && typeof entry.uri === "string" && entry.expiresAt > now) {
        cache.set(key, entry);
      }
    });
  } catch {
    // ignore storage errors
  }
};

const schedulePersist = () => {
  if (!isWeb()) return;
  if (persistHandle) {
    return;
  }
  persistHandle = setTimeout(() => {
    persistHandle = null;
    try {
      const payload: Record<string, CacheEntry> = {};
      cache.forEach((entry, key) => {
        payload[key] = entry;
      });
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }, 500);
};

const pruneCache = () => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
  if (cache.size <= MAX_ENTRIES) {
    return;
  }
  const sorted = Array.from(cache.entries()).sort((a, b) => a[1].lastAccess - b[1].lastAccess);
  const toRemove = sorted.slice(0, Math.max(0, sorted.length - MAX_ENTRIES));
  toRemove.forEach(([key]) => cache.delete(key));
};

export const getCachedPhotoUri = (key?: string | null) => {
  if (!key) {
    return null;
  }
  hydrateCache();
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    schedulePersist();
    return null;
  }
  entry.lastAccess = Date.now();
  schedulePersist();
  return entry.uri;
};

export const setCachedPhotoUri = (
  key?: string | null,
  uri?: string | null,
  options?: { ttlSeconds?: number }
) => {
  if (!key || !uri) {
    return;
  }
  hydrateCache();
  const now = Date.now();
  const ttlMs = options?.ttlSeconds
    ? Math.max(5_000, options.ttlSeconds * 1000)
    : inferSignedUrl(uri)
      ? DEFAULT_SIGNED_TTL_MS
      : DEFAULT_PUBLIC_TTL_MS;
  cache.set(key, { uri, expiresAt: now + ttlMs, lastAccess: now });
  pruneCache();
  schedulePersist();
};

export const clearPhotoCache = () => {
  cache.clear();
  if (!isWeb()) return;
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore storage errors
  }
};
