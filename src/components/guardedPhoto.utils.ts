export const REFRESH_MARGIN_MS = 15_000;

export const getRefreshDelay = (ttlSeconds = 120) => Math.max(30_000, (ttlSeconds * 1000) - REFRESH_MARGIN_MS);
