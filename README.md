# DeadlineX

**Execution OS — AI Chief of Staff**

DeadlineX is an AI-powered team productivity platform that combines mission management, deadline risk prediction, gamification, Google Calendar sync, and a Groq-powered AI Chief of Staff. Managers assign missions, monitor team health, and deploy AI rescue strategies; employees execute tasks, earn XP and coins, and redeem rewards.

---

## Features

### Mission & execution management
- Create, assign, and track missions with priorities, subtasks, deadlines, and status workflows
- AI-calculated **risk scores** (0–100) with explanations for each mission
- **Rescue actions** when deadlines slip: delegate, split tasks, extend deadline, apply templates, enable crunch mode
- Mission templates, tags, and activity feed

### AI Chief of Staff (Groq)
- **Daily Brief** — morning summary of bottlenecks and recommended actions
- **Chat co-pilot** — strategic advice grounded in live team and mission data
- **Voice commands** — speech-to-text input with spoken responses and executable intents (delegate, extend, crunch, report)
- Smart **fallback responses** when `GROQ_API_KEY` is not configured

### Gamification
- XP, levels, and coins for completed missions
- **Leaderboard** with team performance metrics (on-time rate, completed missions)
- **Rewards store** — redeem coins for productivity perks, breaks, and fun items

### Calendar & scheduling
- Internal calendar view with mission-linked focus blocks
- **Google Calendar integration** via Firebase Auth (OAuth popup)
- Automatic calendar sync on login and every 15 minutes
- Manual sync from the Calendar tab

### Workspace UX
- **Manager** and **Employee** portals with Google SSO
- **Demo mode** — skip sign-in and explore all features instantly
- **Focus mode** — distraction-free mission execution view
- Global mission search, light/midnight themes, push notifications for critical risk (>85%)
- Live connection status and manual server sync

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Tailwind CSS 4, Motion, Recharts, D3, Lucide |
| Backend | Express 4, Node.js |
| Dev server | Vite 6 (middleware mode) + `tsx` |
| AI | Groq API (`llama-3.3-70b-versatile` by default) |
| Auth | Firebase Auth + Google OAuth |
| Data | In-memory server state (resets on restart) |

---

## Prerequisites

- **Node.js** 18+ (tested on v24)
- **npm**
- **Groq API key** (optional but recommended) — [console.groq.com/keys](https://console.groq.com/keys)
- **Firebase project** with Google sign-in enabled (for SSO and Calendar sync)
- **Google Cloud OAuth** with Calendar API scopes (for calendar sync)

---

## Quick start

### 1. Clone and install

```bash
git clone <your-repo-url>
cd deadlinex1
npm install
```

### 2. Environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Recommended | Powers AI brief, chat, voice, and mission risk analysis |
| `GROQ_MODEL` | Optional | Default: `llama-3.3-70b-versatile` |
| `PORT` | Optional | Dev server port. Default: `5173` |
| `APP_URL` | Optional | Public app URL for OAuth callbacks and links |

### 3. Firebase client config

Update `firebase-applet-config.json` with your Firebase web app credentials from the [Firebase Console](https://console.firebase.google.com) → Project settings → Your apps.

```json
{
  "projectId": "your-project-id",
  "appId": "your-app-id",
  "apiKey": "your-api-key",
  "authDomain": "your-project.firebaseapp.com",
  "storageBucket": "your-project.firebasestorage.app",
  "messagingSenderId": "your-sender-id",
  "measurementId": ""
}
```

> **Note:** Firebase web config (apiKey, projectId, etc.) is **client-side by design** and is bundled into the frontend. Protect your project with Firebase Auth rules, authorized domains, and Google Cloud API key restrictions — not by hiding this file.

**Firebase Console checklist:**
1. Enable **Google** sign-in under Authentication → Sign-in method
2. Add authorized domains: `localhost`, your production domain (e.g. `your-app.vercel.app`)
3. In Google Cloud Console, restrict the browser API key to your domains

### 4. Run locally

```bash
npm run dev
```

Open **http://localhost:5173** (or the port set in `PORT`).

**Demo mode:** On the login screen, click **Launch Demo Workspace** to skip Google sign-in and use the built-in manager profile with full AI features.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Express + Vite dev server (`tsx server.ts`) |
| `npm run build` | Build frontend (`vite build`) and bundle server (`esbuild`) |
| `npm start` | Run production server (`node dist/server.cjs`) |
| `npm run lint` | Type-check with TypeScript (`tsc --noEmit`) |
| `npm run clean` | Remove `dist/` |

---

## Production build

```bash
npm run build
NODE_ENV=production npm start
```

Set environment variables on your host:

- `GROQ_API_KEY`
- `GROQ_MODEL` (optional)
- `PORT` (often provided by the platform, e.g. Vercel/Railway)
- `APP_URL` (your deployed URL)

The production server serves static files from `dist/` and handles all `/api/*` routes.

---

## Deploying to Vercel

This app uses a **custom Express server**, not a static Vite-only export. For Vercel you typically need either:

- A [Vercel serverless adapter](https://vercel.com/docs/functions) for Express, or
- Deploy to a Node-friendly host (Railway, Render, Fly.io, etc.) using `npm run build && npm start`

**Environment variables on Vercel** (Project → Settings → Environment Variables):

| Variable | Secret? |
|----------|---------|
| `GROQ_API_KEY` | Yes — never commit |
| `GROQ_MODEL` | No |
| `APP_URL` | No |
| `PORT` | Usually set by Vercel |

Commit `firebase-applet-config.json` (client config) or inject via build-time env vars — values still appear in the client bundle.

---

## API reference

All routes are served from the same origin as the app.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/state` | Full app state (missions, members, rewards, activities, calendar) |
| `POST` | `/api/missions` | Create mission (AI risk analysis on create) |
| `PUT` | `/api/missions/:id` | Update mission status, subtasks, etc. |
| `POST` | `/api/missions/:id/rescue` | Apply a rescue action |
| `POST` | `/api/members` | Add team member |
| `PUT` | `/api/members/:id` | Update member (e.g. role toggle) |
| `POST` | `/api/rewards/redeem` | Redeem a reward with coins |
| `POST` | `/api/calendar/sync` | Sync Google Calendar events |
| `GET` | `/api/ai/status` | Groq configuration status |
| `GET` | `/api/ai/brief` | AI daily brief |
| `POST` | `/api/ai/chat` | Chief of Staff chat |
| `POST` | `/api/ai/voice` | Parse and execute voice commands |

---

## Project structure

```
deadlinex1/
├── server.ts                 # Express API, Groq integration, in-memory DB
├── firebase-applet-config.json
├── vite.config.ts
├── src/
│   ├── App.tsx               # Root layout, auth, global state, routing
│   ├── types.ts              # Shared TypeScript interfaces
│   ├── main.tsx
│   ├── index.css
│   ├── lib/
│   │   └── googleCalendar.ts # Firebase Auth + Calendar sync
│   └── components/
│       ├── Sidebar.tsx
│       ├── Dashboard.tsx
│       ├── MissionsList.tsx
│       ├── CalendarView.tsx
│       ├── Leaderboard.tsx
│       ├── RewardsStore.tsx
│       ├── ChiefOfStaffChat.tsx
│       └── FocusModeView.tsx
├── .env.example
└── package.json
```

---

## Authentication flows

### Google SSO (Manager / Employee)
1. User clicks **Sign In as Manager** or **Sign In as Employee**
2. Firebase opens Google OAuth popup with Calendar scopes
3. New users are auto-onboarded to the team database
4. Calendar sync runs immediately and every 15 minutes

### Demo mode
- Stored in `localStorage` as `deadlinex-demo-mode`
- Uses the default manager profile (`mem-1`) without Google auth
- Exit via **Exit Demo** in the header

---

## Troubleshooting

### `EADDRINUSE` — port already in use

Another dev server is still running:

```powershell
netstat -ano | findstr ":5173"
Stop-Process -Id <PID> -Force
npm run dev
```

Or set a different port in `.env`:

```env
PORT=3001
```

### Groq shows "AI Fallback"

Add a valid `GROQ_API_KEY` to `.env` and restart the server. Check status in the header badge or `GET /api/ai/status`.

### Google sign-in fails on production

- Add your deployment domain to Firebase **Authorized domains**
- Restrict (don't block) the Firebase API key to your domains in Google Cloud Console
- Ensure Google Calendar API is enabled for your OAuth client

### Data resets after restart

Mission, member, and reward data lives in **in-memory server state**. Restarting the Node process resets to seed data. For persistence, connect a database (Firestore, PostgreSQL, etc.).

---

## Security

| Safe to commit | Keep secret |
|----------------|-------------|
| `firebase-applet-config.json` (client config) | `.env` / `GROQ_API_KEY` |
| Source code | Firebase Admin SDK service account JSON |
| `.env.example` (placeholders only) | OAuth client secrets (server-side) |

---

## License

Private project. All rights reserved.
