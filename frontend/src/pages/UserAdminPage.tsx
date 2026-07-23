import { useEffect,useState,type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { isExerciseCatalogAdmin } from "../services/exerciseCatalogService";
import { inviteManagedUser,listManagedUsers,sendManagedUserPasswordReset,updateManagedUserRole,type ManagedUser } from "../services/adminUserService";

export default function UserAdminPage(){
  const {user}=useAuth();const [allowed,setAllowed]=useState<boolean|null>(null);const [users,setUsers]=useState<ManagedUser[]>([]);const [email,setEmail]=useState("");const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
  async function refresh(){setUsers(await listManagedUsers());}
  useEffect(()=>{if(!user)return;void isExerciseCatalogAdmin(user.id).then(async ok=>{setAllowed(ok);if(ok)await refresh();});},[user]);
  async function run(action:()=>Promise<unknown>,success:string){setBusy(true);setMessage("");try{await action();await refresh();setMessage(success);}catch(error){setMessage(error instanceof Error?error.message:"Não foi possível concluir a operação.");}finally{setBusy(false);}}
  async function invite(event:FormEvent){event.preventDefault();await run(()=>inviteManagedUser(email.trim()),"Convite enviado.");setEmail("");}
  if(allowed===null)return <main className="centered-screen"><span className="spinner"/><p>Verificando acesso…</p></main>;
  if(!allowed)return <main className="centered-screen"><section className="notice-card"><p className="eyebrow">ACESSO RESTRITO</p><h1>Administração não autorizada.</h1><Link to="/app">Voltar</Link></section></main>;
  return <main className="admin-shell"><header className="profile-header"><Link to="/app">← Calendário</Link><div><span className="eyebrow">ADMINISTRAÇÃO</span><h1>Usuários e acessos</h1><p>Novos cadastros entram como usuário. Somente administradores podem alterar papéis.</p></div></header>{message&&<p className="profile-message" role="status">{message}</p>}<form className="admin-invite" onSubmit={invite}><label>Convidar por e-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="pessoa@exemplo.com"/></label><button disabled={busy||!email}>Enviar convite</button></form><section className="admin-users" aria-label="Usuários cadastrados">{users.map(item=><article key={item.id} className="admin-user-card"><div><strong>{item.email}</strong><span className={`role-badge role-badge--${item.role}`}>{item.role==="admin"?"Administrador":"Usuário"}</span><small>Criado em {new Date(item.createdAt).toLocaleDateString("pt-BR")}{item.lastSignInAt?` · Último acesso ${new Date(item.lastSignInAt).toLocaleDateString("pt-BR")}`:""}</small></div><div><button type="button" disabled={busy||item.id===user?.id} onClick={()=>void run(()=>updateManagedUserRole(item.id,item.role==="admin"?"user":"admin"),"Acesso atualizado.")}>{item.role==="admin"?"Tornar usuário":"Tornar administrador"}</button><button type="button" disabled={busy} onClick={()=>void run(()=>sendManagedUserPasswordReset(item.email),"E-mail de redefinição enviado.")}>Redefinir senha</button></div></article>)}</section></main>;
}
