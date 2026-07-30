import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PersonalRecordsPage from "./PersonalRecordsPage";

const load = vi.fn();
const loadEvolution = vi.fn();
const authUser = { id: "user-1" };
vi.mock("../contexts/AuthContext", () => ({ useAuth: () => ({ user: authUser }) }));
vi.mock("../services/personalRecordService", () => ({
  loadPersonalRecords: (...args: unknown[]) => load(...args),
}));
vi.mock("../services/exerciseEvolutionService", () => ({
  loadExerciseEvolution: (...args: unknown[]) => loadEvolution(...args),
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
const evolution = [{
  key: "bench",
  name: "Supino articulado",
  points: [
    { date: "2026-07-16", loadKg: 70, reps: 10, volume: 1800, estimated1Rm: 93.3 },
    { date: "2026-07-30", loadKg: 80, reps: 6, volume: 2200, estimated1Rm: 96 },
  ],
}, {
  key: "row",
  name: "Remada",
  points: [
    { date: "2026-07-15", loadKg: 65, reps: 8, volume: 1500, estimated1Rm: 82.3 },
    { date: "2026-07-29", loadKg: 70, reps: 8, volume: 1800, estimated1Rm: 88.7 },
  ],
}];

describe("página de recordes pessoais", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    load.mockResolvedValue(records);
    loadEvolution.mockResolvedValue(evolution);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });
  afterEach(cleanup);

  it("mostra destaques e recordes por exercício", async () => {
    render(<PersonalRecordsPage />);

    expect(await screen.findByRole("heading", { name: "Recordes pessoais" })).toBeInTheDocument();
    expect(screen.getAllByText("Supino articulado · 30/07/2026")).not.toHaveLength(0);
    expect(screen.getByRole("heading", { name: "Supino articulado" })).toBeInTheDocument();
    expect(screen.getAllByText("100 kg")).not.toHaveLength(0);
  });

  it("abre a evolução do exercício selecionado e compara com a sessão anterior", async () => {
    render(<PersonalRecordsPage />);
    await screen.findByRole("heading", { name: "Supino articulado" });

    fireEvent.click(screen.getAllByRole("button", { name: "Ver evolução" })[1]);

    expect(screen.getByLabelText("Exercício do gráfico")).toHaveValue("row");
    expect(screen.getByText("Comparação com a anterior")).toBeInTheDocument();
    expect(screen.getByText("+7,7%")).toBeInTheDocument();
  });

  it("filtra os recordes pelo nome do exercício", async () => {
    render(<PersonalRecordsPage />);
    await screen.findByRole("heading", { name: "Supino articulado" });

    fireEvent.change(screen.getByLabelText("Buscar exercício"), { target: { value: "remada" } });

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Supino articulado" })).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Remada" })).toBeInTheDocument();
  });
});
