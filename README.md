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
