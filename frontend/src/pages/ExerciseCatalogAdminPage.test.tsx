import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExerciseCatalogAdminPage from "./ExerciseCatalogAdminPage";

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
  setActive: vi.fn(),
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "admin-1" } }),
}));

vi.mock("../services/exerciseCatalogService", async () => {
  const actual = await vi.importActual<typeof import("../services/exerciseCatalogService")>("../services/exerciseCatalogService");
  return {
    ...actual,
    isExerciseCatalogAdmin: vi.fn().mockResolvedValue(true),
    loadExerciseCatalogAdmin: mocks.load,
    saveExerciseCatalogItem: mocks.save,
    setExerciseCatalogItemActive: mocks.setActive,
  };
});

const base = {
  default_sets: 3,
  reps_min: 8,
  reps_max: 12,
  movement: "empurrar",
  equipment: "máquina",
  avoid_when: [],
  instructions: "",
  cautions: [],
  media_url: null,
  equipment_variants: [],
  muscle_region: "fibras esternocostais",
  secondary_muscles: [],
  mechanics: "composto",
  laterality: "bilateral",
  resistance_profile: "variavel",
  movement_vector: "empurrar horizontal",
  systemic_demand: "moderada",
  stability_demand: "baixa",
  technical_complexity: "baixa",
  exercise_family: "supino",
  active: true,
};

function renderPage() {
  return render(<MemoryRouter><ExerciseCatalogAdminPage /></MemoryRouter>);
}

describe("catálogo administrativo compacto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.load.mockResolvedValue([
      { ...base, key: "bench", name: "Supino articulado", muscle: "peito" },
      { ...base, key: "crossover", name: "Crossover", muscle: "peito" },
      { ...base, key: "row", name: "Remada", muscle: "costas" },
    ]);
    mocks.save.mockResolvedValue(undefined);
    mocks.setActive.mockResolvedValue(undefined);
  });
  afterEach(() => cleanup());

  it("inicia sem seleção e abre somente o grupo escolhido", async () => {
    const user = userEvent.setup();
    renderPage();

    const peito = await screen.findByRole("tab", { name: "Peito, 2 exercícios" });
    expect(peito).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("Selecione um grupo muscular")).toBeInTheDocument();
    expect(screen.queryByText("Supino articulado")).not.toBeInTheDocument();
    expect(screen.queryByText("Remada")).not.toBeInTheDocument();

    await user.click(peito);
    expect(screen.getByText("Supino articulado")).toBeInTheDocument();

    await user.click(peito);
    expect(screen.getByText("Selecione um grupo muscular")).toBeInTheDocument();
    expect(screen.queryByText("Supino articulado")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Costas, 1 exercício" }));
    expect(screen.getByText("Remada")).toBeInTheDocument();
    expect(screen.queryByText("Supino articulado")).not.toBeInTheDocument();
  });

  it("abre o cadastro em português e preenche o músculo selecionado", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("tab", { name: "Peito, 2 exercícios" }));
    await user.click(screen.getByRole("button", { name: "+ Novo exercício" }));

    const dialog = screen.getByRole("dialog", { name: "Novo exercício" });
    expect(within(dialog).getByLabelText("Nome do exercício")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Grupo muscular")).toHaveValue("peito");
    expect(within(dialog).getByLabelText("Padrão de movimento")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Mecânica")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Perfil de resistência")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Demanda sistêmica")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Equipamento")).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Séries")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Reps mín.")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("key")).not.toBeInTheDocument();
  });
});
