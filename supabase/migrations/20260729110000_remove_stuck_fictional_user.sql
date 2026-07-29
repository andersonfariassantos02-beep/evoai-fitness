alter table public.user_admin_audit
  alter column actor_user_id drop not null;

alter table public.user_admin_audit
  drop constraint if exists user_admin_audit_actor_user_id_fkey;

alter table public.user_admin_audit
  add constraint user_admin_audit_actor_user_id_fkey
  foreign key (actor_user_id) references auth.users(id) on delete set null;
