alter table public.user_admin_audit
  drop constraint if exists user_admin_audit_action_check;

alter table public.user_admin_audit
  add constraint user_admin_audit_action_check
  check (action in (
    'invite_user',
    'grant_admin',
    'revoke_admin',
    'send_password_reset',
    'delete_test_workout',
    'create_test_user',
    'disable_user',
    'enable_user',
    'delete_user'
  ));
