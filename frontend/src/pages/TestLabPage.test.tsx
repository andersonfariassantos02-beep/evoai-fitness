import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TestLabPage from "./TestLabPage";

const mocks = vi.hoisted(() => ({
  isAdmin: vi.fn(),
  list: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "admin-1", email: "admin@evoai.com" } }),
}));
vi.mock("../services/exerciseCatalogService", () => ({
  isExerciseCatalogAdmin: (...args: unknown[]) => mocks.isAdmin(...args),
}));
vi.mock("../services/testLabService", () => ({
  listTestWorkouts: (...args: unknown[]) => mocks.list(...args),
  confirmPasswordAndDeleteTest: (...args: unknown[]) => mocks.remove(...args),
}));

describe("laboratório administrativo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAdmin.mockResolvedValue(true);
    mocks.list.mockResolvedValue([{
      id: "test-1",
      trainingDate: "2026-07-28",
      workoutLabel: "Teste de temporizador",
      status: "completed",
      createdAt: "2026-07-28T12:00:00Z",
      completedAt: "2026-07-28T13:00:00Z",
    }]);
    mocks.remove.mockResolvedValue(undefined);
  });

  it("fica disponível apenas para administrador", async () => {
    mocks.isAdmin.mockResolvedValue(false);
    render(<MemoryRouter><TestLabPage /></MemoryRouter>);
    expect(await screen.findByText("Laboratório não autorizado.")).toBeInTheDocument();
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("exige senha antes de excluir um teste", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><TestLabPage /></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: "Excluir teste" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Senha atual"), "senha-segura");
    await user.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith("test-1", "senha-segura"));
    expect(await screen.findByText("Teste excluído. Nenhum dado real foi alterado.")).toBeInTheDocument();
  });
});
