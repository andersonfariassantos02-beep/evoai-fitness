begin;

select plan(8);

select has_table('public', 'training_calendar_entries');
select has_table('public', 'schedule_adjustments');
select row_security_active('public.training_calendar_entries');
select row_security_active('public.schedule_adjustments');

select policies_are(
  'public',
  'training_calendar_entries',
  array[
    'users can create own training calendar',
    'users can delete own training calendar',
    'users can read own training calendar',
    'users can update own training calendar'
  ]
);

select policies_are(
  'public',
  'schedule_adjustments',
  array['users can read own schedule adjustments']
);

select col_is_pk('public', 'training_calendar_entries', array['user_id', 'training_date']);
select has_trigger('public', 'training_calendar_entries', 'training_calendar_audit_unplanned');

select * from finish();
rollback;
