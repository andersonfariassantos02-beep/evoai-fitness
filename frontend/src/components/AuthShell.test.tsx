import { render,screen } from "@testing-library/react";
import { describe,expect,it } from "vitest";
import { AuthShell } from "./AuthShell";

describe("identidade visual",()=>{it("exibe a logo oficial na entrada",()=>{render(<AuthShell eyebrow="ACESSO" title="Entrar" description="Teste"><span>Formulário</span></AuthShell>);const brand=screen.getByRole("link",{name:"EvoAI Fitness"});expect(brand.querySelector("img")).toHaveAttribute("src",expect.stringContaining("evoai-fitness-logo.png"));});});
