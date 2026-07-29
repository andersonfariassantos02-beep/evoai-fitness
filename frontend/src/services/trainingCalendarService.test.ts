import { describe, expect, it } from "vitest";
import { reconcileSyncedCalendar } from "./trainingCalendarService";

describe("sincronização do calendário", () => {
  it("não ressuscita uma disponibilidade ausente no Supabase", () => {
    expect(reconcileSyncedCalendar([], [])).toEqual([]);
  });

  it("preserva uma alteração offline ainda presente na fila", () => {
    const pendingEntry = {
      date: "2026-07-29",
      available: true,
      completed: false,
    };

    expect(reconcileSyncedCalendar([], [{
      id: "pending-1",
      date: pendingEntry.date,
      entry: pendingEntry,
    }])).toEqual([pendingEntry]);
  });

  it("aplica uma exclusão pendente sobre o valor remoto", () => {
    const remoteEntry = {
      date: "2026-07-19",
      available: true,
      completed: false,
    };

    expect(reconcileSyncedCalendar([remoteEntry], [{
      id: "pending-delete",
      date: remoteEntry.date,
      entry: null,
    }])).toEqual([]);
  });
});
