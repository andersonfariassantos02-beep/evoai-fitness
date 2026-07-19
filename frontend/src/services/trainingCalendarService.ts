import { getSupabaseClient } from "../lib/supabase";
import type { TrainingCalendarEntry } from "../lib/trainingCalendar";

interface CalendarRow {
  training_date: string;
  available: boolean;
  completed: boolean;
  completed_was_planned: boolean | null;
}

interface PendingCalendarMutation {
  id: string;
  date: string;
  entry: TrainingCalendarEntry | null;
}

export type CalendarSyncState = "loading" | "synced" | "pending" | "offline" | "error";

function mutationStorageKey(userId: string) {
  return `evoai:training-calendar-outbox:${userId}`;
}

function loadOutbox(userId: string): PendingCalendarMutation[] {
  try {
    const raw = localStorage.getItem(mutationStorageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOutbox(userId: string, mutations: PendingCalendarMutation[]) {
  localStorage.setItem(mutationStorageKey(userId), JSON.stringify(mutations));
}

function rowToEntry(row: CalendarRow): TrainingCalendarEntry {
  return {
    date: row.training_date,
    available: row.available,
    completed: row.completed,
    completedWasPlanned: row.completed_was_planned ?? undefined,
  };
}

function applyOutbox(
  entries: TrainingCalendarEntry[],
  mutations: PendingCalendarMutation[],
) {
  const byDate = new Map(entries.map((entry) => [entry.date, entry]));
  mutations.forEach((mutation) => {
    if (mutation.entry) byDate.set(mutation.date, mutation.entry);
    else byDate.delete(mutation.date);
  });
  return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date));
}

async function sendMutation(userId: string, mutation: PendingCalendarMutation) {
  const supabase = getSupabaseClient();

  if (!mutation.entry) {
    const { error } = await supabase
      .from("training_calendar_entries")
      .delete()
      .eq("user_id", userId)
      .eq("training_date", mutation.date);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("training_calendar_entries").upsert({
    user_id: userId,
    training_date: mutation.entry.date,
    available: mutation.entry.available,
    completed: mutation.entry.completed,
    completed_was_planned: mutation.entry.completedWasPlanned ?? null,
  }, { onConflict: "user_id,training_date" });

  if (error) throw error;
}

export async function flushCalendarOutbox(userId: string) {
  const pending = loadOutbox(userId);

  for (const mutation of pending) {
    await sendMutation(userId, mutation);
    const remaining = loadOutbox(userId).filter((item) => item.id !== mutation.id);
    saveOutbox(userId, remaining);
  }
}

export async function loadSyncedCalendar(userId: string, localEntries: TrainingCalendarEntry[]) {
  const outbox = loadOutbox(userId);

  try {
    const { data, error } = await getSupabaseClient()
      .from("training_calendar_entries")
      .select("training_date, available, completed, completed_was_planned")
      .eq("user_id", userId)
      .order("training_date");

    if (error) throw error;
    const remoteEntries = (data as CalendarRow[]).map(rowToEntry);

    const remoteDates = new Set(remoteEntries.map((entry) => entry.date));
    const localOnlyEntries = localEntries.filter((entry) => !remoteDates.has(entry.date));

    if (localOnlyEntries.length > 0 && outbox.length === 0) {
      saveOutbox(userId, localOnlyEntries.map((entry) => ({
        id: crypto.randomUUID(),
        date: entry.date,
        entry,
      })));
      await flushCalendarOutbox(userId);
      return {
        entries: [...remoteEntries, ...localOnlyEntries]
          .sort((left, right) => left.date.localeCompare(right.date)),
        state: "synced",
      } as const;
    }

    const base = remoteEntries.length > 0 ? remoteEntries : localEntries;
    return { entries: applyOutbox(base, outbox), state: outbox.length ? "pending" : "synced" } as const;
  } catch {
    return { entries: applyOutbox(localEntries, outbox), state: "offline" } as const;
  }
}

export async function queueCalendarMutation(
  userId: string,
  date: string,
  entry: TrainingCalendarEntry | null,
) {
  const current = loadOutbox(userId).filter((mutation) => mutation.date !== date);
  current.push({ id: crypto.randomUUID(), date, entry });
  saveOutbox(userId, current);

  try {
    await flushCalendarOutbox(userId);
    return "synced" as const;
  } catch {
    return navigator.onLine ? "error" as const : "offline" as const;
  }
}
