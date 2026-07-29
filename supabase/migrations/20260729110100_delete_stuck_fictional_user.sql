create temporary table fictional_user_cleanup_target
on commit drop
as
select id
from auth.users candidate
where lower(candidate.email) = 'teste.evoai@example.com'
  and coalesce(candidate.raw_app_meta_data ->> 'evoai_test_user', 'false') = 'true'
  and not exists (
    select 1
    from public.families family
    join public.family_members member on member.family_id = family.id
    where family.created_by = candidate.id
      and member.user_id <> candidate.id
  )
  and not exists (
    select 1
    from public.family_members member
    where member.created_by = candidate.id
      and member.user_id <> candidate.id
  )
  and not exists (
    select 1
    from public.profiles profile
    where profile.created_by = candidate.id
      and profile.linked_user_id is distinct from candidate.id
  );

update public.user_admin_audit
set actor_user_id = null
where actor_user_id in (select id from fictional_user_cleanup_target);

select set_config('app.verified_test_user_cleanup', 'on', true);

delete from public.workout_sessions
where user_id in (select id from fictional_user_cleanup_target);

delete from public.profile_restrictions
where created_by in (select id from fictional_user_cleanup_target);

delete from public.profiles
where linked_user_id in (select id from fictional_user_cleanup_target)
   or created_by in (select id from fictional_user_cleanup_target);

delete from public.family_members
where user_id in (select id from fictional_user_cleanup_target)
   or created_by in (select id from fictional_user_cleanup_target);

delete from public.families
where created_by in (select id from fictional_user_cleanup_target);

delete from auth.users
where id in (select id from fictional_user_cleanup_target)
  and lower(email) = 'teste.evoai@example.com'
  and coalesce(raw_app_meta_data ->> 'evoai_test_user', 'false') = 'true';
