import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProfileRequiredRoute from "./ProfileRequiredRoute";

const mocks = vi.hoisted(() => ({ hasProfile: vi.fn(), user: { id: "user-1" } }));
vi.mock("../contexts/AuthContext", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("../services/profileRestrictionService", () => ({ hasLinkedProfile: () => mocks.hasProfile() }));

describe("proteção de perfil obrigatório", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });
  afterEach(cleanup);

  it("libera o aplicativo quando o perfil está vinculado", async () => {
    mocks.hasProfile.mockResolvedValue(true);
    render(<MemoryRouter initialEntries={["/app"]}><Routes>
      <Route path="/onboarding" element={<p>Onboarding</p>} />
      <Route element={<ProfileRequiredRoute />}><Route path="/app" element={<p>Painel</p>} /></Route>
    </Routes></MemoryRouter>);
    expect(await screen.findByText("Painel")).toBeInTheDocument();
    expect(window.localStorage.getItem("evoai:verified-profile-access:user-1")).not.toBeNull();
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

  it("mantém o aplicativo disponível offline depois de uma verificação bem-sucedida", async () => {
    window.localStorage.setItem("evoai:verified-profile-access:user-1", JSON.stringify({
      version: 1,
      userId: "user-1",
      verifiedAtMs: Date.now(),
    }));
    mocks.hasProfile.mockRejectedValue(new Error("offline"));

    render(<MemoryRouter initialEntries={["/app"]}><Routes>
      <Route path="/onboarding" element={<p>Onboarding</p>} />
      <Route element={<ProfileRequiredRoute />}><Route path="/app" element={<p>Painel</p>} /></Route>
    </Routes></MemoryRouter>);

    expect(await screen.findByText("Painel")).toBeInTheDocument();
    expect(screen.queryByText(/Não foi possível verificar/i)).not.toBeInTheDocument();
  });

  it("exige conexão quando o aparelho nunca verificou o perfil", async () => {
    mocks.hasProfile.mockRejectedValue(new Error("offline"));

    render(<MemoryRouter initialEntries={["/app"]}><Routes>
      <Route path="/onboarding" element={<p>Onboarding</p>} />
      <Route element={<ProfileRequiredRoute />}><Route path="/app" element={<p>Painel</p>} /></Route>
    </Routes></MemoryRouter>);

    expect(await screen.findByText(/Não foi possível verificar/i)).toBeInTheDocument();
    expect(screen.queryByText("Painel")).not.toBeInTheDocument();
  });

  it("revoga o cache quando a verificação online informa perfil ausente", async () => {
    window.localStorage.setItem("evoai:verified-profile-access:user-1", JSON.stringify({
      version: 1,
      userId: "user-1",
      verifiedAtMs: Date.now(),
    }));
    mocks.hasProfile.mockResolvedValue(false);

    render(<MemoryRouter initialEntries={["/app"]}><Routes>
      <Route path="/onboarding" element={<p>Onboarding</p>} />
      <Route element={<ProfileRequiredRoute />}><Route path="/app" element={<p>Painel</p>} /></Route>
    </Routes></MemoryRouter>);

    expect(await screen.findByText("Onboarding")).toBeInTheDocument();
    expect(window.localStorage.getItem("evoai:verified-profile-access:user-1")).toBeNull();
  });
});
