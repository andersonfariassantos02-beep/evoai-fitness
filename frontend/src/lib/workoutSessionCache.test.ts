import { beforeEach, describe, expect, it } from "vitest";
import type { WorkoutSession } from "../services/workoutSessionService";
import { clearCachedWorkoutSession, loadCachedWorkoutSession, saveCachedWorkoutSession } from "./workoutSessionCache";

const session: WorkoutSession = {
  id: "session-1",
  training_date: "2026-07-29",
  workout_label: "PULL",
  session_kind: "test",
  status: "active",
  notes: "",
  profile_id: null,
  profile_name: null,
  applied_restrictions: [],
  exercises: [],
};

describe("cache local da sessão em andamento", () => {
  beforeEach(() => localStorage.clear());

  it("restaura somente a sessão do mesmo usuário, data e ambiente", () => {
    saveCachedWorkoutSession("user-1", "2026-07-29", "test", session);

    expect(loadCachedWorkoutSession("user-1", "2026-07-29", "test")).toEqual(session);
    expect(loadCachedWorkoutSession("user-1", "2026-07-29", "real")).toBeNull();
    expect(loadCachedWorkoutSession("user-2", "2026-07-29", "test")).toBeNull();
  });

  it("remove a cópia depois de concluir ou sair da sessão", () => {
    saveCachedWorkoutSession("user-1", "2026-07-29", "test", session);
    clearCachedWorkoutSession("user-1", "2026-07-29", "test");

    expect(loadCachedWorkoutSession("user-1", "2026-07-29", "test")).toBeNull();
  });
});
