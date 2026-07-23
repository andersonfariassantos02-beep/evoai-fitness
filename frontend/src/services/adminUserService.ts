import { getSupabaseClient } from "../lib/supabase";

export type AppRole = "admin" | "user";
export interface ManagedUser { id:string; email:string; role:AppRole; createdAt:string; lastSignInAt:string|null; emailConfirmedAt:string|null; }

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabaseClient().functions.invoke("admin-users", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export async function listManagedUsers() { return (await invoke<{users:ManagedUser[]}>({action:"list"})).users; }
export function inviteManagedUser(email:string) { return invoke<{message:string}>({action:"invite",email}); }
export function updateManagedUserRole(userId:string, role:AppRole) { return invoke<{message:string}>({action:"set-role",userId,role}); }
export function sendManagedUserPasswordReset(email:string) { return invoke<{message:string}>({action:"reset-password",email}); }
