import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import WorkoutSetupPage from "./WorkoutSetupPage";

const createManualWorkout = vi.fn().mockResolvedValue({});

vi.mock("../contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "admin-1" } }) }));
vi.mock("../services/exerciseCatalogService", () => ({
  isExerciseCatalogAdmin: vi.fn().mockResolvedValue(true),
  loadExerciseCatalog: vi.fn().mockResolvedValue([
    { key: "row", name: "Remada", sets: 3, repsMin: 8, repsMax: 12, muscle: "costas", movement: "puxar-horizontal", equipment: "máquina" },
    { key: "leg-press", name: "Leg press", sets: 3, repsMin: 10, repsMax: 15, muscle: "quadriceps", movement: "agachar", equipment: "máquina" },
  ]),
}));
vi.mock("../services/profileRestrictionService", () => ({
  exerciseConflictsWithRestrictions: vi.fn().mockReturnValue(false),
  loadActiveProfileContext: vi.fn().mockResolvedValue({ restrictions: [] }),
}));
vi.mock("../services/workoutSessionService", () => ({ createManualWorkout: (...args: unknown[]) => createManualWorkout(...args) }));

describe("preparação do treino", () => {
  it("oferece montagem automática ou manual e cria a ficha escolhida", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/preparar-treino/2026-07-22?label=Full%20body%20A&planned=1"]}><Routes><Route path="/preparar-treino/:date" element={<WorkoutSetupPage />} /><Route path="/treino/:date" element={<p>Sessão aberta</p>} /></Routes></MemoryRouter>);

    expect(await screen.findByRole("link", { name: "Usar treino sugerido" })).toHaveAttribute("href", "/treino/2026-07-22?label=Full%20body%20A&planned=1");
    expect(screen.getByText("Conta administradora")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Montar minha ficha" }));
    await user.click(await screen.findByRole("checkbox", { name: /Remada/ }));
    await user.click(screen.getByRole("button", { name: "Criar e abrir treino" }));

    await waitFor(() => expect(createManualWorkout).toHaveBeenCalledWith("admin-1", "2026-07-22", "Full body A", [expect.objectContaining({ key: "row" })]));
    expect(await screen.findByText("Sessão aberta")).toBeInTheDocument();
  });
});
