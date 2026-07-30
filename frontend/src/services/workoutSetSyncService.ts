import { getSupabaseClient } from "../lib/supabase";
import type { SetLog } from "./workoutSessionService";

export type WorkoutSetSyncState = "synced" | "pending" | "offline" | "error";

export interface PendingSetMutation {
  id: string;
  setId: string;
  values: {
    actual_reps: number | null;
    load_kg: number | null;
    rpe: number | null;
    notes: string;
    completed: boolean;
    completed_at: string | null;
    target_rest_seconds: number | null;
    actual_rest_seconds: number | null;
  };
}

const activeFlushes = new Map<string, Promise<void>>();

function outboxKey(userId: string) {
  return `evoai:workout-set-outbox:${userId}`;
}

export function loadSetOutbox(userId: string): PendingSetMutation[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(outboxKey(userId)) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSetOutbox(userId: string, mutations: PendingSetMutation[]) {
  localStorage.setItem(outboxKey(userId), JSON.stringify(mutations));
}

function mutationFromSet(set: SetLog): PendingSetMutation {
  return {
    id: crypto.randomUUID(),
    setId: set.id,
    values: {
      actual_reps: set.actual_reps,
      load_kg: set.load_kg,
      rpe: set.rpe,
      notes: set.notes,
      completed: set.completed,
      completed_at: set.completed ? set.completed_at ?? new Date().toISOString() : null,
      target_rest_seconds: set.target_rest_seconds,
      actual_rest_seconds: set.actual_rest_seconds,
    },
  };
}

export function enqueueSetMutation(userId: string, set: SetLog) {
  const next = loadSetOutbox(userId).filter((mutation) => mutation.setId !== set.id);
  const mutation = mutationFromSet(set);
  next.push(mutation);
  saveSetOutbox(userId, next);
  return mutation;
}

async function sendMutation(userId: string, mutation: PendingSetMutation) {
  const { error } = await getSupabaseClient().from("set_logs").update(mutation.values)
    .eq("id", mutation.setId)
    .eq("user_id", userId);
  if (error) throw error;
}

async function flushPending(userId: string) {
  while (true) {
    const mutation = loadSetOutbox(userId)[0];
    if (!mutation) return;
    await sendMutation(userId, mutation);
    const remaining = loadSetOutbox(userId).filter((item) => item.id !== mutation.id);
    saveSetOutbox(userId, remaining);
  }
}

export function flushSetOutbox(userId: string) {
  const active = activeFlushes.get(userId);
  if (active) return active;
  const request = flushPending(userId).finally(() => activeFlushes.delete(userId));
  activeFlushes.set(userId, request);
  return request;
}

export async function queueSetMutation(userId: string, set: SetLog): Promise<WorkoutSetSyncState> {
  try {
    enqueueSetMutation(userId, set);
  } catch {
    return "error";
  }
  try {
    await flushSetOutbox(userId);
    return "synced";
  } catch {
    return navigator.onLine ? "error" : "offline";
  }
}

export function pendingSetCount(userId: string) {
  return loadSetOutbox(userId).length;
}
