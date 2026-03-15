# Real Holat Project Summary

## 1. Overview

Real Holat is a Telegram Mini App for civic infrastructure reporting and public transparency. Citizens can submit issues with media and geolocation, browse reports on a live map, and track their own contribution history and progress.

This repository currently combines three product paths:

- React + Vite frontend (primary user experience)
- Capacitor Android wrapper (mobile packaging path)
- Python Telegram bot backend (launch entry point into the mini app)

The project is no longer just a plain MVP form-and-list demo. It now includes:

- multilingual UI
- gamification and profile progression
- GEOASR dataset integration
- AI-assisted report enrichment via GROQ
- map-based hotspot and severity visualization

## 2. Tech Stack

### Frontend

- React 18
- ReactDOM
- Vite 5
- Leaflet + react-leaflet

### Integrations

- Telegram WebApp API
- GROQ Chat Completions API
- GEOASR infrastructure datasets

### Native Packaging

- Capacitor Core
- Capacitor Android
- Capacitor CLI

### Backend Bot

- Python 3
- python-telegram-bot
- python-dotenv

## 3. Product Modules

### Submission Tab

Purpose: fast citizen issue submission.

Current behavior:

- category selection
- photo/video upload
- description input
- place/object name input
- manual `lat,lng` location input or geolocation helper
- validation before submit
- local report creation in React state
- XP reward calculation on successful submit
- streak update in `localStorage`
- optional AI enrichment before save if report is near GEOASR objects

If enrichment succeeds, the saved report may include:

- `summary`
- `context`
- `severity`
- `impact_score`

If enrichment fails, the report still saves normally.

### Dashboard Tab

Purpose: public transparency and exploration layer.

Current features:

- keyword search
- status filter
- date filter
- source toggles for citizen reports and GEOASR sources
- mixed Leaflet map with report markers and GEOASR markers
- severity-based report markers
- AI-aware popups with context and impact
- lazy AI enrichment on popup open for older reports without AI fields
- hotspot strip above the map
- contributor leaderboard row
- report list view below the map

### Profile Tab

Purpose: personal contribution and progression view.

Current features:

- Telegram identity or demo fallback user
- reputation / XP display
- XP gain animation
- rank progression bar
- streak counter
- badge grid with locked/unlocked states
- user-specific report history

## 4. Gamification Layer

The app now includes a local progression system built entirely in React state plus `localStorage`.

### XP Rules

XP is awarded per submitted report:

- base submit: `+10`
- report contains media: `+15`
- description longer than 50 chars: `+5`
- valid numeric `lat,lng` location: `+8`
- category present: `+3`

### Rank Tiers

- `Kuzatuvchi` from 0
- `Faol` from 51
- `Qo'riqchi` from 201
- `Sarvar` from 501
- `Shahar afsonasi` from 1200

### Streak Logic

Submission streak is stored in `localStorage` using submit dates.

- same day: streak is preserved
- next day: streak increments
- gap greater than 1 day: streak resets

### Badge Logic

Current badge set:

- `road-guard`
- `water-patrol`
- `explorer`
- `verified-hero`

## 5. Multilingual Support

The frontend now has a lightweight i18n layer with:

- Uzbek
- Russian
- English

Behavior:

- detects Telegram/browser language when possible
- stores selected language in `localStorage`
- translates shared UI strings, categories, statuses, ranks, and badges
- includes an in-app language switcher

The underlying report/state values remain stable; localization is handled in presentation helpers.

## 6. Map and GEOASR Layer

### GEOASR Sources

The dashboard consumes three organizer datasets:

- `maktab44`
- `bogcha`
- `ssv`

GEOASR data is loaded once in shared app state and passed to both submission and dashboard flows.

### Report Marker Rules

Citizen reports render on the map only when `location` matches numeric `lat,lng`.

Severity marker styling:

- `critical`: red, radius 10
- `high`: orange, radius 9
- `medium`: yellow, radius 8
- `low`: green, radius 7
- default: gray, radius 7

### Popup UX

Report popups show:

- AI summary or truncated description
- location plus relative time
- AI context block when available
- impact badge when available
- urgent warning for critical severity

If a report has no AI fields yet, popup open can trigger lazy enrichment using nearby GEOASR objects.

### Hotspot Strip

Above the map, the app shows top 3 hotspot reports ranked by:

1. `impact_score` descending
2. fallback to newest `createdAt`

Each card can refocus the map via `flyTo`.

## 7. AI Enrichment with GROQ

The app integrates GROQ using the OpenAI-compatible chat completions API.

Model currently used:

- `llama-3.3-70b-versatile`

AI enrichment flow:

1. Parse report coordinates from `location`
2. Find nearby GEOASR objects within 500 meters
3. Build a Russian prompt with report data plus nearby objects
4. Request structured JSON from GROQ
5. Save parsed `summary`, `context`, `severity`, and `impact_score`

Reliability behavior:

- all AI fields are optional
- request/parsing is wrapped in `try/catch`
- markdown fences are stripped before JSON parsing
- failed enrichment never blocks submission or map rendering

## 8. State and Data Model

Current report model may contain:

- `id`
- `category`
- `description`
- `location`
- `placeName`
- `status`
- `createdAt`
- `submittedAt`
- `userId`
- `reporterName`
- `media`
- `mediaUrl`
- `mediaType`
- `xpAwarded`
- optional AI fields: `summary`, `context`, `severity`, `impact_score`

Current storage model:

- reports: in React state
- streak/language: in `localStorage`
- no backend persistence for report CRUD yet

## 9. Telegram Integration

Frontend behavior:

- calls `Telegram.WebApp.ready()`
- calls `Telegram.WebApp.expand()`
- reads Telegram user from `initDataUnsafe`
- falls back to demo user outside Telegram

Bot behavior:

- reads `.env`
- sends WebApp launch buttons
- supports `/start` and `/open`
- can configure menu button flow for the mini app

## 10. Environment Surface

### Bot

- `TELEGRAM_BOT_TOKEN`
- `MINI_APP_URL`
- `MENU_BUTTON_TEXT`

### Map

- `VITE_MAP_API_KEY`
- `VITE_MAP_TILE_URL_TEMPLATE`
- `VITE_MAP_ATTRIBUTION`

### GEOASR

- `VITE_GEOASR_BEARER_TOKEN`
- `GEOASR_BEARER_TOKEN`
- `VITE_GEOASR_USE_PROXY`
- `VITE_GEOASR_MAKTAB44_URL`
- `VITE_GEOASR_BOGCHA_URL`
- `VITE_GEOASR_SSV_URL`

### GROQ

- `GROQ_API_KEY`
- `GROQ_MODEL`

## 11. Current Strengths

1. Clear mobile-first Telegram Mini App flow
2. Shared app state keeps submission, dashboard, and profile in sync
3. Useful civic map that combines citizen reports with official infrastructure datasets
4. Gamification layer makes repeated participation more engaging
5. Multilingual UI makes demoing and adoption easier
6. AI enrichment adds context without becoming a hard dependency
7. Build and local dev flow are working

## 12. Current Gaps and Risks

1. Reports are still not persisted to a backend database
2. `VITE_*` variables are client-exposed in production
3. AI enrichment depends on valid numeric coordinates and nearby GEOASR data
4. No geocoding pipeline for human-readable addresses
5. Limited automated test coverage
6. No moderation/admin workflow for report verification and lifecycle management

## 13. Suggested Next Priorities

1. Add backend persistence for reports and user progression
2. Move sensitive API access behind a backend proxy
3. Add geocoding for non-numeric addresses
4. Add moderation and verification workflows
5. Introduce tests for utilities, enrichment logic, and main flows
6. Add analytics or admin reporting for civic operations teams

## 14. Repository Map

- `src/`: frontend source
- `src/pages/`: Submission, Dashboard, Profile
- `src/components/`: map, cards, nav, stats, language UI
- `src/utils/`: XP, ranks, streak, badges, enrichment, report helpers
- `src/services/`: GEOASR integration
- `src/i18n/`: translations and provider
- `backend/`: Telegram bot
- `android/`: Capacitor Android project
- `vite.config.js`: Vite + GEOASR proxy configuration
- `.env.example`: environment template
- `README.md`: setup and usage

---

Prepared on: 2026-03-15
Scope: current repository implementation snapshot after gamification, i18n, GEOASR, and GROQ AI enrichment updates
