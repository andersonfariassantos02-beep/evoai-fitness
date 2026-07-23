import { render,screen,waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach,describe,expect,it,vi } from "vitest";
import UserAdminPage from "./UserAdminPage";

const mocks=vi.hoisted(()=>({
  list:vi.fn(),invite:vi.fn(),reset:vi.fn(),role:vi.fn(),isAdmin:vi.fn(),
  current:{id:"admin-1"},
  users:[{id:"admin-1",email:"admin@evoai.com",role:"admin",createdAt:"2026-07-22T00:00:00Z",lastSignInAt:null,emailConfirmedAt:"2026-07-22T00:00:00Z"},{id:"user-1",email:"user@evoai.com",role:"user",createdAt:"2026-07-22T00:00:00Z",lastSignInAt:null,emailConfirmedAt:null}],
}));
vi.mock("../contexts/AuthContext",()=>({useAuth:()=>({user:mocks.current})}));
vi.mock("../services/exerciseCatalogService",()=>({isExerciseCatalogAdmin:(...args:unknown[])=>mocks.isAdmin(...args)}));
vi.mock("../services/adminUserService",()=>({listManagedUsers:()=>mocks.list(),inviteManagedUser:(...args:unknown[])=>mocks.invite(...args),sendManagedUserPasswordReset:(...args:unknown[])=>mocks.reset(...args),updateManagedUserRole:(...args:unknown[])=>mocks.role(...args)}));

describe("administração de usuários",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.isAdmin.mockResolvedValue(true);mocks.list.mockResolvedValue(mocks.users);mocks.invite.mockResolvedValue({});mocks.reset.mockResolvedValue({});mocks.role.mockResolvedValue({});});
  it("lista usuários e permite promover apenas outra conta",async()=>{const user=userEvent.setup();render(<MemoryRouter><UserAdminPage/></MemoryRouter>);expect(await screen.findByText("user@evoai.com")).toBeInTheDocument();expect(screen.getByRole("button",{name:"Tornar usuário"})).toBeDisabled();await user.click(screen.getByRole("button",{name:"Tornar administrador"}));await waitFor(()=>expect(mocks.role).toHaveBeenCalledWith("user-1","admin"));});
  it("não carrega a lista para usuário comum",async()=>{mocks.isAdmin.mockResolvedValue(false);render(<MemoryRouter><UserAdminPage/></MemoryRouter>);expect(await screen.findByText("Administração não autorizada.")).toBeInTheDocument();expect(mocks.list).not.toHaveBeenCalled();});
});
