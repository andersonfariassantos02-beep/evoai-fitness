import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BodyProgressPage from "./BodyProgressPage";

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("../contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("../services/bodyMeasurementService", async (importOriginal) => {
  const original = await importOriginal<typeof import("../services/bodyMeasurementService")>();
  return {
    ...original,
    loadBodyMeasurements: (...args: unknown[]) => mocks.load(...args),
    saveBodyMeasurement: (...args: unknown[]) => mocks.save(...args),
    deleteBodyMeasurement: (...args: unknown[]) => mocks.remove(...args),
  };
});

const history = [
  {
    id: "m2", measuredOn: "2026-07-30", weightKg: 81, bodyFatPercentage: 18,
    waistCm: 88, chestCm: 102, hipsCm: 98, armCm: 37, thighCm: 60, notes: "Em jejum",
  },
  {
    id: "m1", measuredOn: "2026-07-01", weightKg: 83, bodyFatPercentage: null,
    waistCm: 91, chestCm: null, hipsCm: null, armCm: null, thighCm: null, notes: "",
  },
];

describe("evolução corporal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.load.mockResolvedValue(history);
    mocks.save.mockResolvedValue(undefined);
    mocks.remove.mockResolvedValue(undefined);
  });
  afterEach(cleanup);

  it("mostra o resumo, tendência e histórico", async () => {
    render(<BodyProgressPage />);

    expect(await screen.findByRole("heading", { name: "Peso e medidas" })).toBeInTheDocument();
    expect(screen.getByText("81 kg")).toBeInTheDocument();
    expect(screen.getByText("-2 kg")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /evolução do peso/i })).toBeInTheDocument();
    expect(screen.getByText("Em jejum")).toBeInTheDocument();
  });

  it("salva uma medição válida e recarrega o histórico", async () => {
    const user = userEvent.setup();
    render(<BodyProgressPage />);
    await screen.findByText("Em jejum");
    await waitFor(() => expect(screen.queryByText(/Carregando evolução/i)).not.toBeInTheDocument());

    await user.type(screen.getByLabelText(/Peso/), "82,5");
    await user.click(screen.getByRole("button", { name: "Salvar medição" }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith("user-1", expect.objectContaining({ weightKg: "82,5" })));
    expect(await screen.findByText(/Medição salva/)).toBeInTheDocument();
  });

  it("não envia um formulário sem medidas", async () => {
    const user = userEvent.setup();
    render(<BodyProgressPage />);
    await screen.findByText("Em jejum");
    await waitFor(() => expect(screen.queryByText(/Carregando evolução/i)).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Salvar medição" }));

    expect(mocks.save).not.toHaveBeenCalled();
    expect(screen.getByText(/pelo menos uma medida/i)).toBeInTheDocument();
  });
});
