drop policy if exists "app admins read all exercise catalog"
  on public.exercise_catalog;

drop policy if exists "authenticated users read active exercise catalog"
  on public.exercise_catalog;

create policy "authenticated users read permitted exercise catalog"
  on public.exercise_catalog
  for select
  to authenticated
  using (
    active = true
    or (select private.is_app_admin())
  );
