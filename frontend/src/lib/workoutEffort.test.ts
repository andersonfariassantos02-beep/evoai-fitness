import { describe, expect, it } from "vitest";
import { repsInReserveFromRpe, rpeFromRepsInReserve } from "./workoutEffort";

describe("RPE automático por repetições em reserva", () => {
  it("converte RIR em RPE", () => {
    expect([0, 1, 2, 3, 4].map(rpeFromRepsInReserve)).toEqual([10, 9, 8, 7, 6]);
  });

  it("restaura a opção de esforço ao editar uma série", () => {
    expect(repsInReserveFromRpe(8)).toBe("2");
    expect(repsInReserveFromRpe(null)).toBe("");
  });
});
