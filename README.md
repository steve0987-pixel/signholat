# Real Holat Pulse

Real Holat Pulse is a Telegram Mini App for **community-powered public object monitoring** in Uzbekistan.

It is not just a complaint form. The product is designed around:
- object-centric transparency (schools, clinics, water, roads)
- public lifecycle visibility (from submission to resolution)
- community verification (confirmations + evidence)
- explainable AI assistance (duplicate check, title/summary, priority explanation)

## Stack

- Frontend: React 18 + Vite
- Map: Leaflet + React Leaflet
- Data/storage: Supabase (reports + participation + status history + media)
- Server-side AI: GROQ via internal `/api/ai/*` routes
- Server-side GEOASR proxy: internal `/api/geoasr/*` routes
- Optional bot backend: Python (`backend/bot.py`)

## Current Product Architecture

Main user sections:
- Submission
- Dashboard (map + civic transparency signals)
- Profile

Detail pages:
- Issue Detail page (timeline, confirmations, related issues, priority explanation)
- Object Detail page (object-linked issues, repeated issue visibility)

Security architecture:
- `GROQ_API_KEY` is backend-only
- `GEOASR_BEARER_TOKEN` is backend-only
- frontend never calls GROQ or GEOASR protected endpoints directly
- frontend calls only internal safe routes

## Internal API Routes

AI routes:
- `POST /api/ai/duplicate-check`
- `POST /api/ai/title-summary`
- `POST /api/ai/priority-explanation`
- `POST /api/ai/onboarding-assistant`

GEOASR routes:
- `GET /api/geoasr/maktab44`
- `GET /api/geoasr/bogcha`
- `GET /api/geoasr/ssv`

Community backend routes:
- `GET /api/reports/:id/community`
- `POST /api/reports/:id/peer-actions`
- `GET /api/objects/:objectId`

`POST /api/reports/:id/peer-actions` payload:

```json
{
  "actionType": "confirm",
  "note": "optional note",
  "metadata": {},
  "actor": {
    "telegramUserId": 123456789,
    "username": "real_user",
    "displayName": "Real User"
  }
}
```

Supported `actionType` values:
- `confirm`
- `evidence`
- `still_unresolved`
- `confirm_object`
- `suggest_duplicate`

In local dev these are served by Vite middleware.
In production on Vercel these are served by Vercel Functions (`api/*`).

## Civic-Tech MVP Features

- Report submission with media + geolocation + map pin selection
- AI-assisted title/summary preview (non-blocking, fallback-safe)
- Duplicate detection before final submit with user choice:
  - confirm existing issue
  - create a new issue
- Object-linked issue visibility
- Community confirmation + evidence flow
- Public status lifecycle:
  - Submitted
  - Under Review
  - Verified
  - In Progress
  - Resolved
- Status timeline support (including persistent status events when configured)
- Priority explanation cards and issue-level explanations

## Environment Variables

Create `.env` (copy from `.env.example`).

Required for AI:
- `GROQ_API_KEY`
- `GROQ_MODEL` (example: `llama-3.3-70b-versatile`)

Required for GEOASR proxy:
- `GEOASR_BEARER_TOKEN`
- optional upstream overrides:
  - `GEOASR_MAKTAB44_URL`
  - `GEOASR_BOGCHA_URL`
  - `GEOASR_SSV_URL`

Supabase:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL` (for backend API routes; can match `VITE_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY` (backend only, never expose to client)
- `SUPABASE_USERS_TABLE=users`
- `SUPABASE_PEER_ACTIONS_TABLE=peer_actions`
- `VITE_SUPABASE_REPORTS_TABLE=reports`
- `VITE_SUPABASE_REPORT_MEDIA_BUCKET=report-media`
- `VITE_SUPABASE_PARTICIPATION_TABLE=report_participation`
- `VITE_SUPABASE_STATUS_HISTORY_TABLE=report_status_history`

Map tiles:
- `VITE_MAP_API_KEY` (if your tile provider needs key)
- `VITE_MAP_TILE_URL_TEMPLATE`
- `VITE_MAP_ATTRIBUTION`

Important:
- Do not use `VITE_GROQ_API_KEY`.
- Do not expose `GEOASR_BEARER_TOKEN` in any `VITE_*` var.

## Supabase Setup (Recommended)

Run in SQL editor:

```sql
create extension if not exists pgcrypto;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint,
  reporter_name text,
  category text not null,
  description text not null,
  location text not null,
  place_name text,
  media_url text,
  media_type text default 'image',
  status text default 'Submitted',
  created_at timestamptz default now(),
  summary text,
  context text,
  severity text,
  impact_score numeric,
  xp_awarded int4 default 0,
  seed_key text
);

create unique index if not exists reports_seed_key_idx
on public.reports (seed_key)
where seed_key is not null;

create table if not exists public.report_participation (
  id uuid primary key default gen_random_uuid(),
  report_id text not null,
  user_id text not null,
  action_type text not null check (action_type in ('confirm', 'evidence')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists report_participation_report_id_idx
on public.report_participation (report_id);

create index if not exists report_participation_user_id_idx
on public.report_participation (user_id);

create table if not exists public.report_status_history (
  id uuid primary key default gen_random_uuid(),
  report_id text not null,
  status text not null,
  note text,
  changed_by text,
  created_at timestamptz not null default now()
);

create index if not exists report_status_history_report_id_idx
on public.report_status_history (report_id, created_at);
```

For backend community activity (demo users + peer actions), run these scripts in Supabase SQL editor:
- `supabase/community_schema.sql`
- `supabase/seed_demo_community.sql`

This adds:
- `public.users`
- `public.peer_actions`
- anti-abuse unique rule for confirms (one user cannot confirm same report twice)
- optional `object_id` / `object_type` columns on `public.reports`

Storage bucket:

```sql
insert into storage.buckets (id, name, public)
values ('report-media', 'report-media', true)
on conflict (id) do nothing;
```

Basic storage policies (authenticated users):

```sql
create policy "report_media_upload_authenticated"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'report-media');

create policy "report_media_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'report-media'
  and owner_id = (select auth.jwt()->>'sub')
)
with check (
  bucket_id = 'report-media'
  and owner_id = (select auth.jwt()->>'sub')
);

create policy "report_media_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'report-media'
  and owner_id = (select auth.jwt()->>'sub')
);
```

## Local Run

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```

Seed demo community activity (optional, for hackathon demo):

```bash
npm run seed:community
```

## Vercel Deploy

1. Push repo to GitHub
2. Import project in Vercel
3. Framework preset: `Vite`
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add environment variables in Vercel Project Settings -> Environment Variables
7. Deploy

Vercel API routes are already added in `api/ai/*` and `api/geoasr/*`.
SPA fallback rewrites are configured in `vercel.json`.

## Telegram Mini App Connection

Fast path via BotFather:
1. Open `@BotFather`
2. `/mybots` -> choose your bot
3. `Bot Settings` -> `Menu Button`
4. Set text and HTTPS URL of deployed app

## Fallback Behavior

If AI is unavailable:
- submission still works
- duplicate check falls back to safe “create new” default
- title/summary fallback is generated deterministically
- priority explanation falls back to rule-based short text

If Supabase participation/status tables are unavailable:
- app keeps working with local fallback state
- reports submission remains non-blocking

## Scripts

- `npm run dev` - frontend dev server
- `npm run build` - production build
- `npm run preview` - local preview of build
- `npm run bot:dev` - optional Telegram Python bot
- `npm run android:sync` - build + Capacitor sync Android
- `npm run android:open` - open Android Studio project
