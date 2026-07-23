import { createClient } from "npm:@supabase/supabase-js@2.110.5";

const allowedOrigins = new Set(["https://andersonfariassantos02-beep.github.io", "http://localhost:5173", "http://127.0.0.1:5173"]);
const json = (body: unknown, status = 200, origin = "") => new Response(JSON.stringify(body), { status, headers: { "content-type":"application/json", "access-control-allow-origin":allowedOrigins.has(origin)?origin:"https://andersonfariassantos02-beep.github.io", "access-control-allow-headers":"authorization, x-client-info, apikey, content-type", "vary":"Origin" } });

Deno.serve(async req => {
  const origin=req.headers.get("origin")??"";
  if(req.method==="OPTIONS")return json({},200,origin);
  if(req.method!=="POST")return json({error:"Método não permitido."},405,origin);
  try{
    const url=Deno.env.get("SUPABASE_URL")!;const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;const anonKey=Deno.env.get("SUPABASE_ANON_KEY")!;
    const authorization=req.headers.get("authorization")??"";const token=authorization.replace(/^Bearer\s+/i,"");
    if(!token)return json({error:"Sessão obrigatória."},401,origin);
    const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user},error:userError}=await admin.auth.getUser(token);
    if(userError||!user)return json({error:"Sessão inválida."},401,origin);
    const {data:membership}=await admin.from("app_admins").select("user_id").eq("user_id",user.id).maybeSingle();
    if(!membership)return json({error:"Acesso administrativo não autorizado."},403,origin);
    const body=await req.json();const action=String(body.action??"");
    if(action==="list"){
      const [{data:authData,error:listError},{data:admins,error:rolesError}]=await Promise.all([admin.auth.admin.listUsers({page:1,perPage:200}),admin.from("app_admins").select("user_id")]);
      if(listError||rolesError)throw listError??rolesError;
      const adminIds=new Set((admins??[]).map(item=>item.user_id));
      return json({users:authData.users.map(item=>({id:item.id,email:item.email??"Sem e-mail",role:adminIds.has(item.id)?"admin":"user",createdAt:item.created_at,lastSignInAt:item.last_sign_in_at??null,emailConfirmedAt:item.email_confirmed_at??null}))},200,origin);
    }
    if(action==="set-role"){
      const userId=String(body.userId??"");const role=String(body.role??"");
      if(!userId||!(["admin","user"].includes(role)))return json({error:"Dados de acesso inválidos."},400,origin);
      if(userId===user.id)return json({error:"Você não pode alterar o próprio acesso administrativo."},400,origin);
      const operation=role==="admin"?admin.from("app_admins").upsert({user_id:userId}):admin.from("app_admins").delete().eq("user_id",userId);
      const {error}=await operation;if(error)throw error;
      await admin.from("user_admin_audit").insert({actor_user_id:user.id,target_user_id:userId,action:role==="admin"?"grant_admin":"revoke_admin"});
      return json({message:"Acesso atualizado."},200,origin);
    }
    const email=String(body.email??"").trim().toLowerCase();if(!email||!email.includes("@"))return json({error:"Informe um e-mail válido."},400,origin);
    const appUrl="https://andersonfariassantos02-beep.github.io/evoai-fitness/";
    if(action==="invite"){
      const {error}=await admin.auth.admin.inviteUserByEmail(email,{redirectTo:`${appUrl}#/redefinir-senha`});if(error)throw error;
      await admin.from("user_admin_audit").insert({actor_user_id:user.id,action:"invite_user"});return json({message:"Convite enviado."},200,origin);
    }
    if(action==="reset-password"){
      const publicClient=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});const {error}=await publicClient.auth.resetPasswordForEmail(email,{redirectTo:`${appUrl}#/redefinir-senha`});if(error)throw error;
      await admin.from("user_admin_audit").insert({actor_user_id:user.id,action:"send_password_reset"});return json({message:"Redefinição enviada."},200,origin);
    }
    return json({error:"Ação inválida."},400,origin);
  }catch(error){console.error(error);return json({error:"Não foi possível concluir a operação administrativa."},500,origin);}
});
