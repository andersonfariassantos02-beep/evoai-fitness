import type { WorkoutSession, WorkoutSessionKind } from "../services/workoutSessionService";

const CACHE_VERSION = 1;
const MAX_CACHE_AGE_MS = 48 * 60 * 60 * 1000;

interface CachedWorkoutSession {
  version: number;
  userId: string;
  date: string;
  sessionKind: WorkoutSessionKind;
  savedAtMs: number;
  session: WorkoutSession;
}

function cacheKey(userId: string, date: string, sessionKind: WorkoutSessionKind) {
  return `evoai:workout-session:${userId}:${date}:${sessionKind}`;
}

function isWorkoutSession(value: unknown): value is WorkoutSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<WorkoutSession>;
  return typeof session.id === "string"
    && typeof session.training_date === "string"
    && (session.session_kind === "real" || session.session_kind === "test")
    && Array.isArray(session.exercises);
}

export function loadCachedWorkoutSession(
  userId: string,
  date: string,
  sessionKind: WorkoutSessionKind,
  nowMs = Date.now(),
): WorkoutSession | null {
  try {
    const key = cacheKey(userId, date, sessionKind);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw) as Partial<CachedWorkoutSession>;
    const valid = cached.version === CACHE_VERSION
      && cached.userId === userId
      && cached.date === date
      && cached.sessionKind === sessionKind
      && typeof cached.savedAtMs === "number"
      && nowMs - cached.savedAtMs <= MAX_CACHE_AGE_MS
      && isWorkoutSession(cached.session)
      && cached.session.training_date === date
      && cached.session.session_kind === sessionKind;
    if (!valid) {
      localStorage.removeItem(key);
      return null;
    }
    return cached.session ?? null;
  } catch {
    return null;
  }
}

export function saveCachedWorkoutSession(
  userId: string,
  date: string,
  sessionKind: WorkoutSessionKind,
  session: WorkoutSession,
) {
  try {
    const cached: CachedWorkoutSession = {
      version: CACHE_VERSION,
      userId,
      date,
      sessionKind,
      savedAtMs: Date.now(),
      session,
    };
    localStorage.setItem(cacheKey(userId, date, sessionKind), JSON.stringify(cached));
  } catch {
    // O Supabase continua sendo a fonte principal caso o dispositivo bloqueie o cache.
  }
}

export function clearCachedWorkoutSession(userId: string, date: string, sessionKind: WorkoutSessionKind) {
  try {
    localStorage.removeItem(cacheKey(userId, date, sessionKind));
  } catch {
    // Sem ação: a entrada expira automaticamente.
  }
}
