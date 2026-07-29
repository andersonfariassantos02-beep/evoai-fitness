create or replace function public.delete_test_user_data(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from auth.users account
    where account.id = $1
      and coalesce(account.raw_app_meta_data ->> 'evoai_test_user', 'false') = 'true'
  ) then
    raise exception using message = 'ONLY_TEST_USERS_CAN_BE_DELETED';
  end if;

  if exists (
    select 1
    from public.families family
    join public.family_members member on member.family_id = family.id
    where family.created_by = $1
      and member.user_id <> $1
  ) or exists (
    select 1
    from public.family_members member
    where member.created_by = $1
      and member.user_id <> $1
  ) or exists (
    select 1
    from public.profiles profile
    where profile.created_by = $1
      and profile.linked_user_id is distinct from $1
  ) or exists (
    select 1
    from public.user_admin_audit audit
    where audit.actor_user_id = $1
  ) then
    raise exception using message = 'TEST_USER_HAS_SHARED_OR_AUDITED_DATA';
  end if;

  perform set_config('app.verified_test_user_cleanup', 'on', true);

  delete from public.workout_sessions session where session.user_id = $1;
  delete from public.profile_restrictions restriction where restriction.created_by = $1;
  delete from public.profiles profile
  where profile.linked_user_id = $1 or profile.created_by = $1;
  delete from public.family_members member
  where member.user_id = $1 or member.created_by = $1;
  delete from public.families family where family.created_by = $1;
end;
$$;

create or replace function public.delete_fictional_user_completely(
  target_user_id uuid,
  confirmation_email text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(trim($2));
begin
  if not exists (
    select 1
    from auth.users account
    where account.id = $1
      and lower(account.email) = normalized_email
      and coalesce(account.raw_app_meta_data ->> 'evoai_test_user', 'false') = 'true'
  ) then
    raise exception using message = 'FICTIONAL_USER_CONFIRMATION_FAILED';
  end if;

  update public.user_admin_audit audit
  set actor_user_id = null
  where audit.actor_user_id = $1;

  perform public.delete_test_user_data($1);

  delete from auth.users account
  where account.id = $1
    and lower(account.email) = normalized_email
    and coalesce(account.raw_app_meta_data ->> 'evoai_test_user', 'false') = 'true';

  if not found then
    raise exception using message = 'FICTIONAL_USER_WAS_NOT_REMOVED';
  end if;
end;
$$;

revoke all on function public.delete_test_user_data(uuid)
  from public, anon, authenticated;
grant execute on function public.delete_test_user_data(uuid)
  to service_role;

revoke all on function public.delete_fictional_user_completely(uuid, text)
  from public, anon, authenticated;
grant execute on function public.delete_fictional_user_completely(uuid, text)
  to service_role;
