import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => ({
  from: vi.fn(),
  upsert: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  order: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({ getSupabaseClient: () => ({ from: query.from }) }));

import { loadDailyReadiness, saveDailyReadiness } from "./readinessService";

describe("serviço de prontidão diária", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query.from.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.gte.mockReturnValue(query);
    query.lte.mockReturnValue(query);
    query.order.mockResolvedValue({ data: [], error: null });
    query.maybeSingle.mockResolvedValue({ data: null, error: null });
    query.upsert.mockResolvedValue({ error: null });
  });

  it("carrega somente o registro do usuário e da data informados", async () => {
    await loadDailyReadiness("user-1", "2026-07-29");
    expect(query.eq).toHaveBeenNthCalledWith(1, "user_id", "user-1");
    expect(query.eq).toHaveBeenNthCalledWith(2, "checkin_date", "2026-07-29");
  });

  it("salva por usuário e data sem criar duplicidade", async () => {
    await saveDailyReadiness("user-1", "2026-07-29", {
      sleepHours: 7.5, energy: 4, soreness: 2, fatigue: 2, jointDiscomfort: false, availableMinutes: 60,
    });
    expect(query.upsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "user-1", checkin_date: "2026-07-29", sleep_hours: 7.5,
    }), { onConflict: "user_id,checkin_date" });
  });
});
