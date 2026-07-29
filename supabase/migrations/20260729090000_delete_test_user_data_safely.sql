create or replace function public.delete_test_user_data(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from auth.users
    where id = target_user_id
      and coalesce(raw_app_meta_data ->> 'evoai_test_user', 'false') = 'true'
  ) then
    raise exception using message = 'ONLY_TEST_USERS_CAN_BE_DELETED';
  end if;

  if exists (
    select 1
    from public.families family
    join public.family_members member on member.family_id = family.id
    where family.created_by = target_user_id
      and member.user_id <> target_user_id
  ) or exists (
    select 1
    from public.family_members
    where created_by = target_user_id
      and user_id <> target_user_id
  ) or exists (
    select 1
    from public.profiles
    where created_by = target_user_id
      and linked_user_id is distinct from target_user_id
  ) or exists (
    select 1
    from public.user_admin_audit
    where actor_user_id = target_user_id
  ) then
    raise exception using message = 'TEST_USER_HAS_SHARED_OR_AUDITED_DATA';
  end if;

  delete from public.workout_sessions where user_id = target_user_id;
  delete from public.profile_restrictions where created_by = target_user_id;
  delete from public.profiles
  where linked_user_id = target_user_id or created_by = target_user_id;
  delete from public.family_members
  where user_id = target_user_id or created_by = target_user_id;
  delete from public.families where created_by = target_user_id;
end;
$$;

revoke all on function public.delete_test_user_data(uuid) from public, anon, authenticated;
grant execute on function public.delete_test_user_data(uuid) to service_role;

comment on function public.delete_test_user_data(uuid) is
  'Remove dados isolados de uma conta fictícia antes da exclusão no Supabase Auth. Somente service_role.';
