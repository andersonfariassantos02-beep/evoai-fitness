import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PersonalRecordsPage from "./PersonalRecordsPage";

const load = vi.fn();
vi.mock("../contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("../services/personalRecordService", () => ({
  loadPersonalRecords: (...args: unknown[]) => load(...args),
}));

const records = [{
  key: "bench",
  name: "Supino articulado",
  sessions: 4,
  bestLoad: { loadKg: 80, reps: 6, estimated1Rm: 96, date: "2026-07-30" },
  bestEstimated1Rm: { loadKg: 75, reps: 10, estimated1Rm: 100, date: "2026-07-23" },
  bestSessionVolume: { volumeKg: 2200, date: "2026-07-30" },
}, {
  key: "row",
  name: "Remada",
  sessions: 3,
  bestLoad: { loadKg: 70, reps: 8, estimated1Rm: 88.7, date: "2026-07-29" },
  bestEstimated1Rm: { loadKg: 70, reps: 8, estimated1Rm: 88.7, date: "2026-07-29" },
  bestSessionVolume: { volumeKg: 1800, date: "2026-07-29" },
}];

describe("página de recordes pessoais", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    load.mockResolvedValue(records);
  });
  afterEach(cleanup);

  it("mostra destaques e recordes por exercício", async () => {
    render(<PersonalRecordsPage />);

    expect(await screen.findByRole("heading", { name: "Recordes pessoais" })).toBeInTheDocument();
    expect(screen.getAllByText("Supino articulado · 30/07/2026")).not.toHaveLength(0);
    expect(screen.getByRole("heading", { name: "Supino articulado" })).toBeInTheDocument();
    expect(screen.getAllByText("100 kg")).not.toHaveLength(0);
  });

  it("filtra os recordes pelo nome do exercício", async () => {
    render(<PersonalRecordsPage />);
    await screen.findByRole("heading", { name: "Supino articulado" });

    fireEvent.change(screen.getByLabelText("Buscar exercício"), { target: { value: "remada" } });

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Supino articulado" })).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Remada" })).toBeInTheDocument();
  });
});
