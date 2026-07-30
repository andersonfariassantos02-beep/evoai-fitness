import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cacheProfileAccess,
  clearCachedProfileAccess,
  hasCachedProfileAccess,
} from "./profileAccessCache";

describe("cache de acesso offline ao perfil", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("reconhece apenas o mesmo usuário validado recentemente", () => {
    cacheProfileAccess("user-1", 1_000);

    expect(hasCachedProfileAccess("user-1", 2_000)).toBe(true);
    expect(hasCachedProfileAccess("user-2", 2_000)).toBe(false);
  });

  it("expira a validação depois de sete dias", () => {
    const eightDays = 8 * 24 * 60 * 60 * 1_000;
    cacheProfileAccess("user-1", 1_000);

    expect(hasCachedProfileAccess("user-1", 1_000 + eightDays)).toBe(false);
  });

  it("ignora e remove conteúdo inválido", () => {
    window.localStorage.setItem("evoai:verified-profile-access:user-1", "{inválido");

    expect(hasCachedProfileAccess("user-1")).toBe(false);
    expect(window.localStorage.getItem("evoai:verified-profile-access:user-1")).toBeNull();
  });

  it("permite revogar explicitamente o acesso salvo", () => {
    cacheProfileAccess("user-1");
    clearCachedProfileAccess("user-1");

    expect(hasCachedProfileAccess("user-1")).toBe(false);
  });
});
