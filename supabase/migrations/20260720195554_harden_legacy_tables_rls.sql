-- These legacy tables do not carry an owner/user identifier and are not used
-- by the current client. Keep their existing data available to administrative
-- roles while removing unrestricted Data API access.
drop policy if exists "Liberar acesso total exames"
on public.exames_bioimpedancia;

drop policy if exists "Liberar acesso total treinos"
on public.historico_treinos;

revoke all privileges on table public.exames_bioimpedancia
from anon, authenticated;

revoke all privileges on table public.historico_treinos
from anon, authenticated;
