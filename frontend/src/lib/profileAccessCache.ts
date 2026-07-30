const CACHE_VERSION = 1;
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
const CACHE_PREFIX = "evoai:verified-profile-access:";

type ProfileAccessCache = {
  version: number;
  userId: string;
  verifiedAtMs: number;
};

function cacheKey(userId: string) {
  return `${CACHE_PREFIX}${userId}`;
}

export function cacheProfileAccess(userId: string, verifiedAtMs = Date.now()) {
  if (!userId) return;
  const value: ProfileAccessCache = {
    version: CACHE_VERSION,
    userId,
    verifiedAtMs,
  };
  try {
    window.localStorage.setItem(cacheKey(userId), JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
  }
}

export function clearCachedProfileAccess(userId: string) {
  if (!userId) return;
  try {
    window.localStorage.removeItem(cacheKey(userId));
  } catch {
    // The online profile check remains authoritative if storage is unavailable.
  }
}

export function hasCachedProfileAccess(userId: string, nowMs = Date.now()) {
  if (!userId) return false;

  try {
    const raw = window.localStorage.getItem(cacheKey(userId));
    if (!raw) return false;

    const value = JSON.parse(raw) as Partial<ProfileAccessCache>;
    const isValid =
      value.version === CACHE_VERSION
      && value.userId === userId
      && typeof value.verifiedAtMs === "number"
      && nowMs >= value.verifiedAtMs
      && nowMs - value.verifiedAtMs <= CACHE_MAX_AGE_MS;

    if (!isValid) clearCachedProfileAccess(userId);
    return isValid;
  } catch {
    clearCachedProfileAccess(userId);
    return false;
  }
}
