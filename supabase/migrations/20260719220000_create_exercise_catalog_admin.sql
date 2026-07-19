create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;
drop policy if exists "users read own app admin membership" on public.app_admins;
create policy "users read own app admin membership" on public.app_admins for select to authenticated using ((select auth.uid()) = user_id);

create or replace function private.is_app_admin() returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.app_admins where user_id = (select auth.uid())) $$;
revoke all on function private.is_app_admin() from public, anon;
grant execute on function private.is_app_admin() to authenticated;

drop policy if exists "app admins read all exercise catalog" on public.exercise_catalog;
create policy "app admins read all exercise catalog" on public.exercise_catalog for select to authenticated using ((select private.is_app_admin()));
drop policy if exists "app admins create exercise catalog" on public.exercise_catalog;
create policy "app admins create exercise catalog" on public.exercise_catalog for insert to authenticated with check ((select private.is_app_admin()));
drop policy if exists "app admins update exercise catalog" on public.exercise_catalog;
create policy "app admins update exercise catalog" on public.exercise_catalog for update to authenticated using ((select private.is_app_admin())) with check ((select private.is_app_admin()));

revoke all on public.app_admins from anon, authenticated;
grant select on public.app_admins to authenticated;
grant insert, update on public.exercise_catalog to authenticated;
