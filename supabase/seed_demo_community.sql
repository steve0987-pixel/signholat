insert into public.users (telegram_user_id, username, display_name, is_demo)
values
  (900001, 'mahalla_aziza', 'Aziza Karimova', true),
  (900002, 'observer_jasur', 'Jasur Rakhmatov', true),
  (900003, 'clinic_nodira', 'Nodira Yunusova', true),
  (900004, 'roads_bekzod', 'Bekzod Akhmedov', true),
  (900005, 'water_sitora', 'Sitora Tursunova', true)
on conflict (telegram_user_id) do update
set
  username = excluded.username,
  display_name = excluded.display_name,
  is_demo = true;

with demo_users as (
  select id, row_number() over(order by telegram_user_id asc) as rn
  from public.users
  where is_demo = true
),
ranked_reports as (
  select id::text as report_id, row_number() over(order by created_at desc, id desc) as rn
  from public.reports
  limit 12
)
insert into public.peer_actions (report_id, user_id, action_type, note, metadata, created_at)
select
  rr.report_id,
  du.id,
  'confirm',
  null,
  jsonb_build_object('source', 'demo-seed', 'weight', 1),
  now() - make_interval(hours => (rr.rn + du.rn))
from ranked_reports rr
join demo_users du on du.rn <= 3
where rr.rn <= 8
and not exists (
  select 1
  from public.peer_actions pa
  where pa.report_id = rr.report_id
    and pa.user_id = du.id
    and pa.action_type = 'confirm'
);

with demo_users as (
  select id, row_number() over(order by telegram_user_id asc) as rn
  from public.users
  where is_demo = true
),
ranked_reports as (
  select id::text as report_id, row_number() over(order by created_at desc, id desc) as rn
  from public.reports
  limit 10
)
insert into public.peer_actions (report_id, user_id, action_type, note, metadata, created_at)
select
  rr.report_id,
  du.id,
  'evidence',
  'Observed recurring queue and service interruption at this location.',
  jsonb_build_object('source', 'demo-seed', 'media_hint', 'photo'),
  now() - make_interval(hours => (rr.rn * 2))
from ranked_reports rr
join demo_users du on du.rn = 4
where rr.rn in (1, 2, 4, 6)
and not exists (
  select 1
  from public.peer_actions pa
  where pa.report_id = rr.report_id
    and pa.user_id = du.id
    and pa.action_type = 'evidence'
    and coalesce(pa.note, '') = 'Observed recurring queue and service interruption at this location.'
);

with demo_users as (
  select id, row_number() over(order by telegram_user_id asc) as rn
  from public.users
  where is_demo = true
),
ranked_reports as (
  select id::text as report_id, row_number() over(order by created_at desc, id desc) as rn
  from public.reports
  limit 10
)
insert into public.peer_actions (report_id, user_id, action_type, note, metadata, created_at)
select
  rr.report_id,
  du.id,
  'still_unresolved',
  'Issue still unresolved after community follow-up check.',
  jsonb_build_object('source', 'demo-seed', 'follow_up_days', 3),
  now() - make_interval(hours => (rr.rn * 3))
from ranked_reports rr
join demo_users du on du.rn = 5
where rr.rn in (1, 3, 5, 7)
and not exists (
  select 1
  from public.peer_actions pa
  where pa.report_id = rr.report_id
    and pa.user_id = du.id
    and pa.action_type = 'still_unresolved'
    and coalesce(pa.note, '') = 'Issue still unresolved after community follow-up check.'
);
