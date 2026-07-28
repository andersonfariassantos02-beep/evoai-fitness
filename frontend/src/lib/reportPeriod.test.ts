import { describe, expect, it } from "vitest";
import { previousReportRange, reportRange } from "./reportPeriod";

describe("períodos dos relatórios", () => {
  it("considera a semana de segunda a domingo", () => {
    expect(reportRange("weekly", "2026-07-29")).toEqual({
      startDate: "2026-07-27",
      endDate: "2026-08-02",
    });
  });

  it("considera o mês civil completo e encontra o anterior", () => {
    const current = reportRange("monthly", "2026-07-15");
    expect(current).toEqual({ startDate: "2026-07-01", endDate: "2026-07-31" });
    expect(previousReportRange("monthly", current.startDate)).toEqual({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
  });
});
