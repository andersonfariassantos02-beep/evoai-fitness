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
  normalized_email text := lower(trim(confirmation_email));
begin
  if not exists (
    select 1
    from auth.users
    where id = target_user_id
      and lower(email) = normalized_email
      and coalesce(raw_app_meta_data ->> 'evoai_test_user', 'false') = 'true'
  ) then
    raise exception using message = 'FICTIONAL_USER_CONFIRMATION_FAILED';
  end if;

  update public.user_admin_audit
  set actor_user_id = null
  where actor_user_id = target_user_id;

  perform public.delete_test_user_data(target_user_id);

  delete from auth.users
  where id = target_user_id
    and lower(email) = normalized_email
    and coalesce(raw_app_meta_data ->> 'evoai_test_user', 'false') = 'true';

  if not found then
    raise exception using message = 'FICTIONAL_USER_WAS_NOT_REMOVED';
  end if;
end;
$$;

revoke all on function public.delete_fictional_user_completely(uuid, text)
  from public, anon, authenticated;
grant execute on function public.delete_fictional_user_completely(uuid, text)
  to service_role;

comment on function public.delete_fictional_user_completely(uuid, text) is
  'Exclui atomicamente uma conta fictícia confirmada e seus dados isolados. Somente service_role.';
