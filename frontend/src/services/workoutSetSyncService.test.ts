import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SetLog } from "./workoutSessionService";
import { enqueueSetMutation, loadSetOutbox } from "./workoutSetSyncService";

const set: SetLog = {
  id: "set-1",
  set_number: 1,
  target_reps_min: 8,
  target_reps_max: 12,
  actual_reps: 10,
  load_kg: 40,
  rpe: 8,
  notes: "",
  completed: true,
  target_rest_seconds: 120,
  actual_rest_seconds: null,
  is_extra: false,
  skipped_at: null,
  skip_reason: null,
};

describe("fila offline das séries", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000001");
  });

  it("grava todos os valores necessários antes de tentar sincronizar", () => {
    enqueueSetMutation("user-1", set);

    expect(loadSetOutbox("user-1")).toEqual([expect.objectContaining({
      setId: "set-1",
      values: expect.objectContaining({
        actual_reps: 10,
        load_kg: 40,
        rpe: 8,
        completed: true,
        target_rest_seconds: 120,
      }),
    })]);
  });

  it("mantém somente a versão mais recente da mesma série", () => {
    enqueueSetMutation("user-1", set);
    enqueueSetMutation("user-1", { ...set, actual_reps: 12, load_kg: 42.5 });

    expect(loadSetOutbox("user-1")).toHaveLength(1);
    expect(loadSetOutbox("user-1")[0].values).toMatchObject({ actual_reps: 12, load_kg: 42.5 });
  });

  it("isola as filas de contas diferentes", () => {
    enqueueSetMutation("user-1", set);
    expect(loadSetOutbox("user-2")).toEqual([]);
  });
});
