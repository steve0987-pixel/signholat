create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint,
  username text,
  display_name text not null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists users_telegram_user_id_key
on public.users (telegram_user_id)
where telegram_user_id is not null;

alter table public.reports
add column if not exists object_id text;

alter table public.reports
add column if not exists object_type text;

create index if not exists reports_object_id_idx
on public.reports (object_id);

create table if not exists public.peer_actions (
  id uuid primary key default gen_random_uuid(),
  report_id text not null,
  user_id uuid not null references public.users(id) on delete cascade,
  action_type text not null check (action_type in ('confirm', 'evidence', 'still_unresolved', 'confirm_object', 'suggest_duplicate')),
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists peer_actions_report_id_idx
on public.peer_actions (report_id, created_at desc);

create index if not exists peer_actions_user_id_idx
on public.peer_actions (user_id, created_at desc);

create unique index if not exists peer_actions_unique_confirm_per_user_report
on public.peer_actions (report_id, user_id)
where action_type = 'confirm';
