import { render,screen,waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe,expect,it,vi } from "vitest";
import ForgotPasswordPage from "./ForgotPasswordPage";

const requestReset=vi.hoisted(()=>vi.fn().mockResolvedValue({error:null}));
vi.mock("../services/authService",()=>({requestPasswordReset:(...args:unknown[])=>requestReset(...args)}));

describe("recuperação de senha",()=>{
  it("envia instruções sem revelar se o e-mail existe",async()=>{const user=userEvent.setup();render(<MemoryRouter><ForgotPasswordPage/></MemoryRouter>);await user.type(screen.getByRole("textbox",{name:"E-mail"}),"pessoa@exemplo.com");await user.click(screen.getByRole("button",{name:"Enviar instruções"}));await waitFor(()=>expect(requestReset).toHaveBeenCalledWith("pessoa@exemplo.com"));expect(screen.getByRole("status")).toHaveTextContent("Se este e-mail estiver cadastrado");});
});
