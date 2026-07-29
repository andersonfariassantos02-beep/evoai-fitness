import { useEffect,useState,type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { isExerciseCatalogAdmin } from "../services/exerciseCatalogService";
import {
  createManagedTestUser,
  deleteManagedUser,
  inviteManagedUser,
  listManagedUsers,
  sendManagedUserPasswordReset,
  setManagedUserDisabled,
  updateManagedUserRole,
  type ManagedUser,
} from "../services/adminUserService";

const DEFAULT_TEST_EMAIL="teste.evoai@example.com";

export default function UserAdminPage(){
  const {user}=useAuth();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [users,setUsers]=useState<ManagedUser[]>([]);
  const [email,setEmail]=useState("");
  const [testEmail,setTestEmail]=useState(DEFAULT_TEST_EMAIL);
  const [testPassword,setTestPassword]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [showTestForm,setShowTestForm]=useState(false);
  const [deleteTarget,setDeleteTarget]=useState<ManagedUser|null>(null);
  const [deleteConfirmation,setDeleteConfirmation]=useState("");

  async function refresh(){setUsers(await listManagedUsers());}
  useEffect(()=>{if(!user)return;void isExerciseCatalogAdmin(user.id).then(async ok=>{setAllowed(ok);if(ok)await refresh();});},[user]);
  async function run(action:()=>Promise<unknown>,success:string){setBusy(true);setMessage("");try{await action();await refresh();setMessage(success);return true;}catch(error){setMessage(error instanceof Error?error.message:"Não foi possível concluir a operação.");return false;}finally{setBusy(false);}}
  async function invite(event:FormEvent){event.preventDefault();if(await run(()=>inviteManagedUser(email.trim()),"Convite enviado."))setEmail("");}
  async function createTestUser(event:FormEvent){
    event.preventDefault();
    if(await run(()=>createManagedTestUser(testEmail.trim(),testPassword),"Conta de teste criada. Use o e-mail e a senha temporária informados para entrar.")){
      setTestPassword("");
      setShowTestForm(false);
    }
  }
  async function confirmDelete(){
    if(!deleteTarget)return;
    if(await run(()=>deleteManagedUser(deleteTarget.id,deleteConfirmation),"Usuário excluído definitivamente.")){
      setDeleteTarget(null);
      setDeleteConfirmation("");
    }
  }

  if(allowed===null)return <main className="centered-screen"><span className="spinner"/><p>Verificando acesso…</p></main>;
  if(!allowed)return <main className="centered-screen"><section className="notice-card"><p className="eyebrow">ACESSO RESTRITO</p><h1>Administração não autorizada.</h1><Link to="/app">Voltar</Link></section></main>;
  return <main className="admin-shell">
    <header className="profile-header"><Link to="/app">← Calendário</Link><div><span className="eyebrow">ADMINISTRAÇÃO</span><h1>Usuários e acessos</h1><p>Novos cadastros entram como usuário. Somente administradores podem alterar papéis.</p></div></header>
    {message&&<p className="profile-message" role="status">{message}</p>}
    <section className="admin-user-create">
      <form className="admin-invite" onSubmit={invite}><label>Convidar por e-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="pessoa@exemplo.com"/></label><button disabled={busy||!email}>Enviar convite</button></form>
      <button className="admin-test-toggle" type="button" onClick={()=>setShowTestForm(value=>!value)}>{showTestForm?"Cancelar criação":"＋ Criar usuário fictício"}</button>
      {showTestForm&&<form className="admin-test-form" onSubmit={createTestUser}>
        <div><span className="eyebrow">CONTA DE TESTE</span><h2>Criar usuário fictício</h2><p>O e-mail não precisa receber mensagens. Guarde a senha temporária para entrar como usuário comum.</p></div>
        <label>E-mail de teste<input type="email" required value={testEmail} onChange={event=>setTestEmail(event.target.value)}/></label>
        <label>Senha temporária<input type="password" required minLength={8} autoComplete="new-password" value={testPassword} onChange={event=>setTestPassword(event.target.value)} placeholder="Mínimo de 8 caracteres"/></label>
        <button disabled={busy||testPassword.length<8}>Criar conta de teste</button>
      </form>}
    </section>
    <section className="admin-users" aria-label="Usuários cadastrados">{users.map(item=>{
      const current=item.id===user?.id;
      return <article key={item.id} className={`admin-user-card${item.disabled?" admin-user-card--disabled":""}`}>
        <div><strong>{item.email}</strong><div className="admin-user-badges"><span className={`role-badge role-badge--${item.role}`}>{item.role==="admin"?"Administrador":"Usuário"}</span>{item.testUser&&<span className="role-badge role-badge--test">Conta de teste</span>}{item.disabled&&<span className="role-badge role-badge--disabled">Desativado</span>}</div><small>Criado em {new Date(item.createdAt).toLocaleDateString("pt-BR")}{item.lastSignInAt?` · Último acesso ${new Date(item.lastSignInAt).toLocaleDateString("pt-BR")}`:""}</small></div>
        <div><button type="button" disabled={busy||current||item.disabled} onClick={()=>void run(()=>updateManagedUserRole(item.id,item.role==="admin"?"user":"admin"),"Acesso atualizado.")}>{item.role==="admin"?"Tornar usuário":"Tornar administrador"}</button><button type="button" disabled={busy||item.disabled} onClick={()=>void run(()=>sendManagedUserPasswordReset(item.email),"E-mail de redefinição enviado.")}>Redefinir senha</button><button type="button" disabled={busy||current} onClick={()=>void run(()=>setManagedUserDisabled(item.id,!item.disabled),item.disabled?"Usuário reativado.":"Usuário desativado.")}>{item.disabled?"Reativar":"Desativar"}</button><button className="danger-button" type="button" disabled={busy||current} onClick={()=>{setDeleteTarget(item);setDeleteConfirmation("");}}>Excluir</button></div>
      </article>;
    })}</section>
    {deleteTarget&&<div className="confirmation-backdrop"><section className="confirmation-dialog admin-delete-user-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-user-title"><span className="setup-status setup-status--locked">AÇÃO IRREVERSÍVEL</span><h2 id="delete-user-title">Excluir usuário?</h2><p>Esta ação remove a conta <strong>{deleteTarget.email}</strong> e pode apagar seus dados vinculados. Para confirmar, digite o e-mail completo.</p><label>E-mail de confirmação<input autoFocus value={deleteConfirmation} onChange={event=>setDeleteConfirmation(event.target.value)}/></label><div className="admin-delete-user-actions"><button type="button" onClick={()=>setDeleteTarget(null)}>Cancelar</button><button className="danger-action" type="button" disabled={busy||deleteConfirmation.trim().toLowerCase()!==deleteTarget.email.toLowerCase()} onClick={()=>void confirmDelete()}>Excluir definitivamente</button></div></section></div>}
  </main>;
}
