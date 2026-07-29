create or replace function public.create_my_profile(
  profile_display_name text,
  profile_birth_date date default null,
  profile_training_goal text default 'general_fitness',
  profile_training_focus text[] default array['full_body']::text[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  new_family_id uuid;
  new_profile_id uuid;
  clean_name text := trim(profile_display_name);
begin
  if current_user_id is null then
    raise exception using message = 'AUTHENTICATION_REQUIRED';
  end if;

  if clean_name is null or char_length(clean_name) not between 1 and 120 then
    raise exception using message = 'INVALID_PROFILE_NAME';
  end if;

  if exists (
    select 1
    from public.profiles
    where linked_user_id = current_user_id
  ) then
    raise exception using message = 'PROFILE_ALREADY_EXISTS';
  end if;

  insert into public.families (name, created_by)
  values (clean_name || ' · EvoAI', current_user_id)
  returning id into new_family_id;

  insert into public.family_members (family_id, user_id, role, created_by)
  values (new_family_id, current_user_id, 'owner', current_user_id);

  insert into public.profiles (
    family_id,
    linked_user_id,
    display_name,
    birth_date,
    active,
    created_by,
    training_goal,
    training_focus
  )
  values (
    new_family_id,
    current_user_id,
    clean_name,
    profile_birth_date,
    true,
    current_user_id,
    profile_training_goal,
    profile_training_focus
  )
  returning id into new_profile_id;

  return new_profile_id;
end;
$$;

revoke all on function public.create_my_profile(text, date, text, text[]) from public, anon;
grant execute on function public.create_my_profile(text, date, text, text[]) to authenticated;

comment on function public.create_my_profile(text, date, text, text[]) is
  'Creates the authenticated user family, owner membership, and linked profile atomically during onboarding.';
