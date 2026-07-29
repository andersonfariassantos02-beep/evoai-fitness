import { getSupabaseClient } from "../lib/supabase";

export type AppRole = "admin" | "user";
export interface ManagedUser { id:string; email:string; role:AppRole; createdAt:string; lastSignInAt:string|null; emailConfirmedAt:string|null; disabled:boolean; testUser:boolean; profileComplete:boolean; profileName:string|null; }

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabaseClient().functions.invoke("admin-users", { body });
  if (error) {
    const context = "context" in error ? error.context : null;
    if (context instanceof Response) {
      const payload = await context.clone().json().catch(() => null) as { error?: string } | null;
      if (payload?.error) throw new Error(payload.error);
    }
    throw error;
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export async function listManagedUsers() { return (await invoke<{users:ManagedUser[]}>({action:"list"})).users; }
export function inviteManagedUser(email:string) { return invoke<{message:string}>({action:"invite",email}); }
export function updateManagedUserRole(userId:string, role:AppRole) { return invoke<{message:string}>({action:"set-role",userId,role}); }
export function sendManagedUserPasswordReset(email:string) { return invoke<{message:string}>({action:"reset-password",email}); }
export function createManagedTestUser(email:string,password:string) { return invoke<{message:string;email:string}>({action:"create-test-user",email,password}); }
export function setManagedUserDisabled(userId:string,disabled:boolean) { return invoke<{message:string}>({action:"set-disabled",userId,disabled}); }
export function deleteManagedUser(userId:string,confirmationEmail:string) { return invoke<{message:string}>({action:"delete-user",userId,confirmationEmail}); }
