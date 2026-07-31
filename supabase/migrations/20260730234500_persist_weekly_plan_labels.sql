alter table public.training_calendar_entries
  add column if not exists planned_label text;

alter table public.training_calendar_entries
  drop constraint if exists training_calendar_planned_label_length;

alter table public.training_calendar_entries
  add constraint training_calendar_planned_label_length
  check (planned_label is null or char_length(btrim(planned_label)) between 1 and 80);

comment on column public.training_calendar_entries.planned_label is
  'Divisão semanal confirmada pelo próprio usuário; nunca substitui o rótulo de uma sessão concluída.';

revoke all on public.training_calendar_entries from anon;
grant select, insert, update, delete on public.training_calendar_entries to authenticated;
