do $$
declare
  missing_columns integer;
  rls_enabled boolean;
begin
  select count(*) into missing_columns
  from (values ('instructions'), ('cautions'), ('media_url'), ('equipment_variants')) expected(column_name)
  where not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'exercise_catalog'
      and columns.column_name = expected.column_name
  );

  if missing_columns <> 0 then
    raise exception 'Campos de orientação técnica ausentes';
  end if;

  select relrowsecurity into rls_enabled
  from pg_class where oid = 'public.exercise_catalog'::regclass;

  if rls_enabled is not true then
    raise exception 'RLS deve permanecer habilitada no catálogo';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.exercise_catalog'::regclass
      and conname = 'exercise_catalog_media_url_https'
  ) then
    raise exception 'Restrição HTTPS da mídia ausente';
  end if;
end $$;
