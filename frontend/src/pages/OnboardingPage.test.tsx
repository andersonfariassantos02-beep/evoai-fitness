import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingPage from "./OnboardingPage";

const mocks = vi.hoisted(() => ({
  createProfile: vi.fn(),
  user: { id: "test-1", email: "teste.evoai@example.com", user_metadata: {}, app_metadata: { evoai_test_user: true } },
}));
vi.mock("../contexts/AuthContext", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("../services/profileRestrictionService", () => ({ createMyProfile: (...args: unknown[]) => mocks.createProfile(...args) }));

describe("onboarding de primeiro acesso", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.createProfile.mockResolvedValue("profile-1"); });
  afterEach(cleanup);

  it("preenche e cria rapidamente o perfil da conta fictícia", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/onboarding"]}><Routes>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/app" element={<p>Calendário aberto</p>} />
    </Routes></MemoryRouter>);
    expect(screen.getByDisplayValue("Usuário Teste")).toBeInTheDocument();
    expect(screen.getByText(/conta fictícia detectada/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Salvar e abrir calendário" }));
    await waitFor(() => expect(mocks.createProfile).toHaveBeenCalledWith("Usuário Teste", "", "general_fitness", ["full_body"]));
    expect(await screen.findByText("Calendário aberto")).toBeInTheDocument();
  });
});
