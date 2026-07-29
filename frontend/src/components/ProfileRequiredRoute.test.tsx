import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProfileRequiredRoute from "./ProfileRequiredRoute";

const mocks = vi.hoisted(() => ({ hasProfile: vi.fn(), user: { id: "user-1" } }));
vi.mock("../contexts/AuthContext", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("../services/profileRestrictionService", () => ({ hasLinkedProfile: () => mocks.hasProfile() }));

describe("proteção de perfil obrigatório", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("libera o aplicativo quando o perfil está vinculado", async () => {
    mocks.hasProfile.mockResolvedValue(true);
    render(<MemoryRouter initialEntries={["/app"]}><Routes>
      <Route path="/onboarding" element={<p>Onboarding</p>} />
      <Route element={<ProfileRequiredRoute />}><Route path="/app" element={<p>Painel</p>} /></Route>
    </Routes></MemoryRouter>);
    expect(await screen.findByText("Painel")).toBeInTheDocument();
  });

  it("encaminha o primeiro acesso para o onboarding", async () => {
    mocks.hasProfile.mockResolvedValue(false);
    render(<MemoryRouter initialEntries={["/app"]}><Routes>
      <Route path="/onboarding" element={<p>Onboarding</p>} />
      <Route element={<ProfileRequiredRoute />}><Route path="/app" element={<p>Painel</p>} /></Route>
    </Routes></MemoryRouter>);
    expect(await screen.findByText("Onboarding")).toBeInTheDocument();
    expect(screen.queryByText("Painel")).not.toBeInTheDocument();
  });
});
