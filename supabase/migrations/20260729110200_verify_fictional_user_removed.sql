do $$
begin
  if exists (
    select 1
    from auth.users
    where lower(email) = 'teste.evoai@example.com'
  ) then
    raise exception using message = 'FICTIONAL_USER_STILL_EXISTS';
  end if;
end;
$$;
