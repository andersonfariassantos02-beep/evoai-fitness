import { cleanup,render,screen,waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import UserAdminPage from "./UserAdminPage";

const mocks=vi.hoisted(()=>({
  list:vi.fn(),invite:vi.fn(),reset:vi.fn(),role:vi.fn(),createTest:vi.fn(),disable:vi.fn(),deleteUser:vi.fn(),isAdmin:vi.fn(),
  current:{id:"admin-1"},
  users:[
    {id:"admin-1",email:"admin@evoai.com",role:"admin",createdAt:"2026-07-22T00:00:00Z",lastSignInAt:null,emailConfirmedAt:"2026-07-22T00:00:00Z",disabled:false,testUser:false,profileComplete:true,profileName:"Administrador"},
    {id:"user-1",email:"user@evoai.com",role:"user",createdAt:"2026-07-22T00:00:00Z",lastSignInAt:null,emailConfirmedAt:null,disabled:false,testUser:true,profileComplete:false,profileName:null},
  ],
}));
vi.mock("../contexts/AuthContext",()=>({useAuth:()=>({user:mocks.current})}));
vi.mock("../services/exerciseCatalogService",()=>({isExerciseCatalogAdmin:(...args:unknown[])=>mocks.isAdmin(...args)}));
vi.mock("../services/adminUserService",()=>({
  listManagedUsers:()=>mocks.list(),
  inviteManagedUser:(...args:unknown[])=>mocks.invite(...args),
  sendManagedUserPasswordReset:(...args:unknown[])=>mocks.reset(...args),
  updateManagedUserRole:(...args:unknown[])=>mocks.role(...args),
  createManagedTestUser:(...args:unknown[])=>mocks.createTest(...args),
  setManagedUserDisabled:(...args:unknown[])=>mocks.disable(...args),
  deleteManagedUser:(...args:unknown[])=>mocks.deleteUser(...args),
}));

describe("administração de usuários",()=>{
  afterEach(cleanup);

  beforeEach(()=>{
    vi.clearAllMocks();
    mocks.isAdmin.mockResolvedValue(true);
    mocks.list.mockResolvedValue(mocks.users);
    mocks.invite.mockResolvedValue({});
    mocks.reset.mockResolvedValue({});
    mocks.role.mockResolvedValue({});
    mocks.createTest.mockResolvedValue({});
    mocks.disable.mockResolvedValue({});
    mocks.deleteUser.mockResolvedValue({});
  });

  it("lista usuários, identifica conta de teste e protege a conta atual",async()=>{
    const user=userEvent.setup();
    render(<MemoryRouter><UserAdminPage/></MemoryRouter>);
    expect(await screen.findByText("user@evoai.com")).toBeInTheDocument();
    expect(screen.getByText("Conta de teste")).toBeInTheDocument();
    expect(screen.getByText("Perfil completo")).toBeInTheDocument();
    expect(screen.getByText("Perfil pendente")).toBeInTheDocument();
    expect(screen.getByRole("button",{name:"Tornar usuário"})).toBeDisabled();
    await user.click(screen.getByRole("button",{name:"Tornar administrador"}));
    await waitFor(()=>expect(mocks.role).toHaveBeenCalledWith("user-1","admin"));
  });

  it("cria uma conta fictícia com senha temporária",async()=>{
    const user=userEvent.setup();
    render(<MemoryRouter><UserAdminPage/></MemoryRouter>);
    await screen.findByText("user@evoai.com");
    await user.click(screen.getByRole("button",{name:"＋ Criar usuário fictício"}));
    await user.type(screen.getByLabelText("Senha temporária"),"Teste@123");
    await user.click(screen.getByRole("button",{name:"Criar conta de teste"}));
    await waitFor(()=>expect(mocks.createTest).toHaveBeenCalledWith("teste.evoai@example.com","Teste@123"));
  });

  it("desativa outro usuário",async()=>{
    const user=userEvent.setup();
    render(<MemoryRouter><UserAdminPage/></MemoryRouter>);
    await screen.findByText("user@evoai.com");
    const buttons=screen.getAllByRole("button",{name:"Desativar"});
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toBeDisabled();
    await user.click(buttons[1]);
    await waitFor(()=>expect(mocks.disable).toHaveBeenCalledWith("user-1",true));
  });

  it("exige o e-mail completo antes de excluir",async()=>{
    const user=userEvent.setup();
    render(<MemoryRouter><UserAdminPage/></MemoryRouter>);
    await screen.findByText("user@evoai.com");
    const button=screen.getByRole("button",{name:"Excluir"});
    await user.click(button);
    const confirm=screen.getByRole("button",{name:"Excluir definitivamente"});
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText("E-mail de confirmação"),"user@evoai.com");
    await user.click(confirm);
    await waitFor(()=>expect(mocks.deleteUser).toHaveBeenCalledWith("user-1","user@evoai.com"));
  });

  it("preserva contas reais e oferece exclusão apenas para conta fictícia",async()=>{
    render(<MemoryRouter><UserAdminPage/></MemoryRouter>);
    await screen.findByText("user@evoai.com");
    expect(screen.getByText("Conta real: use Desativar para preservar o histórico.")).toBeInTheDocument();
    expect(screen.getAllByRole("button",{name:"Excluir"})).toHaveLength(1);
  });

  it("mantém o diálogo aberto e mostra o erro de exclusão",async()=>{
    mocks.deleteUser.mockRejectedValueOnce(new Error("Vínculo protegido."));
    const user=userEvent.setup();
    render(<MemoryRouter><UserAdminPage/></MemoryRouter>);
    await screen.findByText("user@evoai.com");
    await user.click(screen.getByRole("button",{name:"Excluir"}));
    await user.type(screen.getByLabelText("E-mail de confirmação"),"user@evoai.com");
    await user.click(screen.getByRole("button",{name:"Excluir definitivamente"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("Vínculo protegido.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("não carrega a lista para usuário comum",async()=>{
    mocks.isAdmin.mockResolvedValue(false);
    render(<MemoryRouter><UserAdminPage/></MemoryRouter>);
    expect(await screen.findByText("Administração não autorizada.")).toBeInTheDocument();
    expect(mocks.list).not.toHaveBeenCalled();
  });
});
