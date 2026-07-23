create table if not exists public.user_admin_audit (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('invite_user', 'grant_admin', 'revoke_admin', 'send_password_reset')),
  created_at timestamptz not null default now()
);

alter table public.user_admin_audit enable row level security;
drop policy if exists "app admins read user administration audit" on public.user_admin_audit;
create policy "app admins read user administration audit" on public.user_admin_audit
  for select to authenticated using ((select private.is_app_admin()));

revoke all on public.user_admin_audit from public, anon, authenticated;
grant select on public.user_admin_audit to authenticated;
grant all on public.user_admin_audit to service_role;
grant usage, select on sequence public.user_admin_audit_id_seq to service_role;
