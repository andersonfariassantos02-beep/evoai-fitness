alter table public.workout_sessions
  add column if not exists session_rpe numeric(3,1) check (session_rpe between 1 and 10),
  add column if not exists session_quality smallint check (session_quality between 1 and 5),
  add column if not exists post_workout_discomfort boolean not null default false;

comment on column public.workout_sessions.session_rpe is
  'Esforço global percebido no encerramento da sessão, de 1 a 10.';
comment on column public.workout_sessions.session_quality is
  'Qualidade percebida da sessão no encerramento, de 1 a 5.';
comment on column public.workout_sessions.post_workout_discomfort is
  'Indica desconforto articular ou muscular incomum ao encerrar a sessão.';
