# Real Holat - Telegram Mini App MVP

Real Holat is a Telegram Mini App (Web App) MVP for public infrastructure transparency.

## What is already built

- 3-tab mobile-first app:
  - Submission
  - Dashboard
  - Profile
- Fast report submission flow
- Public dashboard with search, filters, sorting, status badges
- Local state updates: new submissions appear immediately in dashboard and profile
- Telegram user fallback support (reads Telegram WebApp user when opened inside Telegram)

## Run locally

1. Install dependencies:
   npm install

2. Start development server:
   npm run dev

3. Open the local URL shown by Vite in your browser.

## Android app (Capacitor)

Android wrapper is added to this repository.

Important files:
- capacitor.config.json
- android/

One-time setup:
1. Install dependencies:
   npm install
2. Make sure Android Studio is installed.
3. Make sure Android SDK + emulator are installed in Android Studio.

Daily workflow:
1. Build web app and sync to Android project:
   npm run android:sync
2. Open Android Studio project:
   npm run android:open
3. In Android Studio, run app on emulator/device.

APK build:
1. Open android folder in Android Studio.
2. Build -> Build Bundle(s) / APK(s) -> Build APK(s)
3. Android Studio shows path to generated APK.

If you change frontend code, run npm run android:sync again before rebuilding APK.

## Bot backend setup (.env, Python)

This project now includes a simple Python Telegram bot backend that sends a Web App button.

1. Open .env and fill values:
   TELEGRAM_BOT_TOKEN=your_new_bot_token
   MINI_APP_URL=https://your-https-url
   MENU_BUTTON_TEXT=Open Real Holat

2. Install frontend dependencies:
   npm install

3. Install Python dependencies:
   python -m pip install -r requirements.txt

4. Run frontend:
   npm run dev

5. Run bot backend in another terminal:
   npm run bot:dev

Commands supported by bot:
- /start -> welcome message + Web App button
- /open -> direct Web App button

Notes:
- MINI_APP_URL must be HTTPS (Telegram requirement)
- .env is gitignored
- Use .env.example as template

## Map API key integration

The dashboard map reads map config from Vite env variables.

Add these fields to .env:
VITE_MAP_API_KEY=YOUR_ORGANIZER_KEY
VITE_MAP_TILE_URL_TEMPLATE=https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key={key}
VITE_MAP_ATTRIBUTION=&copy; MapTiler &copy; OpenStreetMap contributors

Notes:
- If your provider uses another tile URL format, put it in VITE_MAP_TILE_URL_TEMPLATE.
- Keep {key} in the URL template so the app can inject VITE_MAP_API_KEY.
- Restart frontend after changing .env.

## GEOASR API integration

Dashboard now loads organizer datasets from GEOASR APIs with Bearer token.

Add to .env:
VITE_GEOASR_BEARER_TOKEN=YOUR_GEOASR_BEARER
VITE_GEOASR_MAKTAB44_URL=https://duasr.uz/api4/maktab44
VITE_GEOASR_BOGCHA_URL=https://duasr.uz/api4/bogcha
VITE_GEOASR_SSV_URL=https://duasr.uz/api4/ssv

Behavior:
- GEOASR dataset counters are shown in Dashboard (maktab44, bogcha, ssv).
- If GEOASR response includes coordinate fields (lat/lng variants), they are auto-plotted on map.
- If coordinates are absent, data still loads in counters while map shows only report markers.

Security note:
- .env is not committed, but VITE_* values are exposed to browser runtime.
- For production, move Bearer token to backend proxy and call proxy from frontend.

## Server-side AI assistance

The app now uses GROQ only through internal server endpoints. The client never calls GROQ directly and does not read the API key.

Add to `.env`:
`GROQ_API_KEY=YOUR_GROQ_KEY`
`GROQ_MODEL=llama-3.3-70b-versatile`

Internal endpoints:
- `/api/ai/duplicate-check`
- `/api/ai/title-summary`
- `/api/ai/priority-explanation`

What they do:
- duplicate check before final submission
- short title + summary preview while typing
- short priority explanation on report detail surfaces

Fallback mode:
- if GROQ is unavailable or env vars are missing, the app returns deterministic fallback values
- report submission still works
- duplicate check defaults to non-blocking create-new guidance
- title/summary and priority explanation remain short and UI-safe

Implementation notes:
- local development uses Vite internal middleware for `/api/ai/*`
- Netlify production uses serverless functions routed through `netlify.toml`
- no `GROQ_API_KEY` is exposed through `import.meta.env`

## Build

- Production build:
  npm run build

- Preview build:
  npm run preview

## Connect this Mini App to a Telegram bot

You will do this in 3 phases:
1) create bot, 2) expose HTTPS URL, 3) attach Web App URL to bot.

### 1) Create bot in BotFather

1. In Telegram, open BotFather.
2. Run /newbot.
3. Set bot name and username.
4. Save the bot token safely.

Optional bot profile setup:
- /setuserpic
- /setdescription
- /setabouttext

### 2) Make your Mini App reachable via HTTPS

Telegram Web Apps require HTTPS.

For local development, use a tunnel:

Option A: ngrok
1. Install ngrok.
2. Start app: npm run dev
3. In a second terminal run:
   ngrok http 5173
4. Copy generated HTTPS URL, for example:
   https://abc123.ngrok-free.app

Option B: Cloudflare Tunnel
1. Install cloudflared.
2. Start app: npm run dev
3. Run:
   cloudflared tunnel --url http://localhost:5173
4. Copy generated HTTPS URL.

### 3) Attach Mini App URL to your bot

You can expose Mini App from:
- bot menu button
- inline keyboard button

#### Method A: Menu button (recommended)

In BotFather:
1. Run /mybots
2. Select your bot
3. Bot Settings -> Menu Button -> Configure Menu Button
4. Set:
   - Button text (example: Open Real Holat)
   - Web App URL (your HTTPS URL from tunnel or deployed site)

Then open your bot chat and tap menu button.

#### Method B: Inline keyboard Web App button

Send a message from your bot with a web_app button pointing to your Mini App URL.

This repository includes that behavior in backend/bot.py via /start and /open.

If you are not writing backend yet, Method A is enough for MVP demos.

## Telegram WebApp behavior in this project

- File: src/main.jsx
  - Calls Telegram.WebApp.ready() and Telegram.WebApp.expand() when inside Telegram.

- File: src/App.jsx
  - Reads Telegram user from Telegram.WebApp.initDataUnsafe.user
  - Falls back to demo user outside Telegram

## Recommended hackathon demo flow

1. Open bot menu button in Telegram.
2. Submit a report from Submission tab.
3. App auto-navigates to Dashboard.
4. Show the new report at top (newest first).
5. Open Profile tab and show submitted report count update.

## Deploy for stable URL (instead of tunnel)

Deploy frontend to one of:
- Vercel
- Netlify
- Cloudflare Pages

After deploy:
1. Copy HTTPS production URL.
2. Update bot menu button Web App URL in BotFather.
3. Re-open bot and test.

## Next backend step (optional)

When ready, connect:
- frontend report submit action -> API endpoint
- dashboard list -> database query
- Telegram init data signature verification on backend

This MVP intentionally uses local state to stay simple and demo-ready.
