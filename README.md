# 🌍 Tour4Tomorrow — Sustainable Travel (MERN)

A full-stack rebuild of the original single-file `index.html` as a **MongoDB + Express + React + Node** app.
Same branding, colours, sections and interactions — now with real accounts, a real database, real maps,
and a real AI travel assistant.

```
tour4tomorrow/
├── client/                 React 19 + Vite + plain CSS
│   ├── index.html          Loads Inter font + Font Awesome (same as the original)
│   ├── vite.config.js      Proxies /api → http://localhost:5000 in development
│   └── src/
│       ├── api/client.js           fetch() wrapper (cookies + error handling)
│       ├── context/                AuthContext (logged-in user), ModalContext (pop-up)
│       ├── hooks/                  useInView (fade-in on scroll), useCountUp (number animation)
│       ├── components/             Navbar, Hero, Mission, CarbonCalculator, TripPlanner,
│       │                           TripResults, RouteMap, EcoRide, Rewards, ChatWidget, …
│       ├── pages/                  Home, Login, Register, Dashboard (protected), NotFound
│       └── styles/global.css       Colour variables + shared styles
└── server/                 Express 5 + Mongoose 8
    ├── src/
    │   ├── server.js               Starts everything (config → DB → listen)
    │   ├── app.js                  Express app: security, CORS, JSON, routes, errors
    │   ├── config/                 env.js, db.js, emissionFactors.js
    │   ├── data/catalog.js         Reward tiers, stay styles, simulated ride fleet
    │   ├── models/                 User, Trip, RideBooking, PointsTransaction, ChatMessage
    │   ├── middleware/             auth (JWT cookie), validate (Zod), errorHandler
    │   ├── validators.js           Every input rule in one place
    │   ├── controllers/            auth, trip, ride, rewards, chat, carbon
    │   ├── services/               geoService, placesService, tripPlanner, pointsService, llmService
    │   └── routes/index.js         The whole API on one page
    ├── tests/api.test.js   25 automated tests (no DB or API keys needed)
    └── scripts/smoke-test.js  End-to-end check against your real MongoDB
```

---

## 1. Prerequisites

- **Node.js 22 or newer** → check with `node -v`
- A free **MongoDB Atlas** account → https://www.mongodb.com/cloud/atlas
- *(For the chatbot)* a **Google Gemini** API key (free tier) **or** an **Anthropic** API key
- *(Optional)* a free **openrouteservice** key for real road routes

## 2. Set up MongoDB Atlas (≈5 minutes)

1. Create a free **M0** cluster.
2. **Database Access** → *Add New Database User* → username + password (save them).
3. **Network Access** → *Add IP Address* → *Add Current IP Address* (or `0.0.0.0/0` while learning — less secure).
4. **Connect** → *Drivers* → copy the `mongodb+srv://…` string.
5. Put your username/password in it and add the database name `tour4tomorrow` before the `?`:
   `mongodb+srv://asha:MyPass123@cluster0.abcde.mongodb.net/tour4tomorrow?retryWrites=true&w=majority`

> If your password has special characters like `@` or `#`, URL-encode them (`@` → `%40`).

## 3. Configure the backend

```bash
cd server
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

Open `server/.env` and fill in:

| Variable | Required? | What to put |
|---|---|---|
| `MONGODB_URI` | ✅ | The Atlas string from step 2 |
| `JWT_SECRET` | ✅ | Run `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` and paste the output |
| `AI_PROVIDER` | for chatbot | `gemini` or `anthropic` |
| `GEMINI_API_KEY` | if `gemini` | From https://aistudio.google.com/apikey |
| `GEMINI_MODEL` | | Default `gemini-3.8-flash`. If you get "model not found", pick a current model from https://ai.google.dev/gemini-api/docs/models |
| `ANTHROPIC_API_KEY` | if `anthropic` | From https://platform.claude.com (needs prepaid credits) |
| `ANTHROPIC_MODEL` | | Default `claude-haiku-5-5` |
| `ORS_API_KEY` | optional | Free key from https://openrouteservice.org/dev/#/signup |
| `NOMINATIM_USER_AGENT` | recommended | Put your own email in it (OpenStreetMap's usage policy) |

**Never commit `.env`.** It's already in `.gitignore`.

## 4. Install & run (two terminals)

**Terminal 1 — backend**
```bash
cd server
npm install
npm run dev
```
You should see:
```
✅ MongoDB connected (database: tour4tomorrow)
🚀 API running on http://localhost:5000/api
   AI chatbot: gemini (gemini-3.8-flash)          ← or "NOT configured"
   Routing: estimated distances (no ORS_API_KEY)  ← or "openrouteservice"
```

**Terminal 2 — frontend**
```bash
cd client
npm install
npm run dev
```
Open **http://localhost:5173**.

## 5. Test it

```bash
cd server
npm test          # 25 unit/API tests — no DB or keys needed
npm run smoke     # full end-to-end check — needs `npm run dev` running + real .env
```

`npm run smoke` registers a throwaway user, plans and saves a trip, books and cancels a ride, checks rewards
and the leaderboard, and — **if an AI key is set** — sends one real message to the chatbot.

Production build of the frontend: `cd client && npm run build` (output in `client/dist/`).

---

## 6. What's real, what's estimated, what's simulated

Honesty was a design rule: the UI labels every number that isn't real.

| Feature | Status | Details |
|---|---|---|
| Accounts, login, logout | ✅ Real | bcrypt-hashed passwords, JWT in an httpOnly cookie, stored in MongoDB |
| Saved trips, rides, points, history, chat | ✅ Real (persisted) | All stored in MongoDB per user |
| Leaderboard | ✅ Real | Ranks actual registered users (first names only) |
| AI chatbot "EcoGuide" | ✅ Real **once you add a key** | Calls Gemini or Claude from the server. Shows "not configured" otherwise — no fake replies |
| Geocoding (place → coordinates) | ✅ Real | openrouteservice if key set, otherwise OpenStreetMap Nominatim (free) |
| Road distance & route line on map | ✅ Real with `ORS_API_KEY` / 🟡 Estimated without | Fallback = straight line × 1.25, labelled **Estimated**, drawn dashed |
| Map | ✅ Real | Leaflet + OpenStreetMap tiles |
| Nearby places to stay | ✅ Real names | OpenStreetMap via Overpass API — **no prices or availability** |
| CO₂ figures | 🟡 Estimated | Approximate factors in `server/src/config/emissionFactors.js` |
| Stay styles & price ranges | 🟡 Estimated | No free API has live hotel prices; shown as ranges, clearly labelled |
| "Save This Plan" | ✅ Real save, ❌ not a booking | Original said "Book This Package" — we don't sell tickets, so it saves a plan |
| Eco-rides (drivers, ETA, tracking) | 🟣 Simulated demo | Locations/distances are real; drivers & tracking are not. Labelled in the UI |

### APIs used

| API | Key? | Cost | Used for |
|---|---|---|---|
| Google Gemini API | Yes | Free tier available | Chatbot (default) |
| Anthropic Claude API | Yes | Paid (prepaid credits) | Chatbot (alternative) |
| openrouteservice | Yes (free) | Free tier with daily limits | Geocoding + road routes |
| OpenStreetMap Nominatim | No | Free, max 1 request/second | Geocoding fallback |
| Overpass API (OpenStreetMap) | No | Free community service, can be slow | Nearby hotels/hostels |
| OpenStreetMap tiles | No | Free for light use, attribution required | Map background |

---

## 7. API reference

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /api/auth/register` | – | Create account (sets cookie) |
| `POST /api/auth/login` | – | Log in (sets cookie) |
| `POST /api/auth/logout` | – | Clear cookie |
| `GET /api/auth/me` | – | Current user or `null` |
| `GET /api/carbon/factors` | – | Emission factors for the calculator |
| `POST /api/trips/plan` | – | Geocode, route, build packages, nearby stays |
| `POST /api/trips` | ✅ | Save a plan (+points) |
| `GET /api/trips` | ✅ | My saved plans |
| `DELETE /api/trips/:id` | ✅ owner | Delete plan (points reversed) |
| `GET /api/rides/options` | – | Simulated ride options + signed quote |
| `POST /api/rides` | ✅ | Book simulated ride (+10 points) |
| `GET /api/rides/active` | ✅ | Ride currently "on the way" |
| `GET /api/rides` | ✅ | Ride history |
| `POST /api/rides/:id/cancel` | ✅ owner | Cancel (points reversed) |
| `GET /api/rewards/tiers` | – | Tier list |
| `GET /api/rewards/leaderboard` | optional | Top 10 (+ your rank if logged in) |
| `GET /api/rewards/me` | ✅ | Balance, tier progress, history |
| `GET /api/chat/status` | – | Is the AI configured? |
| `GET /api/chat/history` | ✅ | My chat messages |
| `POST /api/chat` | ✅ | Send a message, get an AI reply |
| `DELETE /api/chat/history` | ✅ | Clear my chat |

---

## 8. Key decisions, explained simply

- **Why is the token in an httpOnly cookie, not localStorage?** JavaScript can't read httpOnly cookies, so even if
  someone injects a script into the page, they can't steal your login.
- **Why does the Vite proxy matter?** The browser sees the React app and the API on the same address
  (`localhost:5173`), so cookies work and there are no CORS headaches in development.
- **Why are points calculated on the server?** If the browser sent "add 500 points", anyone could cheat using
  DevTools. The server recomputes eco scores itself, caps points per day (`DAILY_POINTS_CAP`), and reverses points
  when you cancel a ride or delete a trip.
- **What's the "quote token" in rides?** When you search, the server signs the measured distance into a short-lived
  token. When you book, it reads the distance from that token — so the fare can't be edited in the browser.
- **Why Zod validation?** Every request is checked *before* it reaches a controller. Wrong types (like
  `{ "$gt": "" }` instead of an email — a NoSQL-injection trick) are rejected with a clear 400 error.
  Mongoose's `sanitizeFilter` is a second safety net.
- **Why does `Trip.findOne({ _id, user })` include the user?** That's the authorization check — you can't touch
  someone else's trip even if you guess its ID.
- **Why call the AI from the server?** API keys in React code are visible to anyone who opens DevTools. The browser
  talks only to `/api/chat`; the key never leaves `server/.env`. Chat requires login and is rate-limited, so a stranger
  can't run up your bill.
- **How does the AI give consistent CO₂ numbers?** The system prompt (`services/llmService.js`) includes the same
  emission factors the calculator uses, and tells the model never to invent prices or bookings.
- **Why no error `try/catch` in every controller?** Express 5 forwards errors from async functions to the central
  `errorHandler` automatically.
- **Plain CSS instead of Tailwind:** colours are CSS variables named after the Tailwind shades the original used
  (e.g. `--green-600` = `bg-green-600`), so you can map old classes to new styles.

## 9. Changes from the original `index.html`

- **Stats corrected to match sources** (shown on the back of each card): tourism ≈8% of global GHG emissions
  (originally "of CO2 from tourism transport"); 2015–2024 were the 10 warmest years (originally "90%");
  43% cut by 2030 vs 2019 for 1.5°C per IPCC AR6 (originally "50%").
- **EVs are not zero-emission** in the calculator — India's grid is coal-heavy, so EV factors are non-zero.
- Invented hotels with exact prices → accommodation *styles* with estimated price ranges + real OSM listings.
- "Book This Package" → "Save This Plan & Earn Points".
- Login modal → `/login` and `/register` pages styled like the modal, plus a protected `/dashboard`.
- Flip cards also flip on **tap** (hover doesn't exist on phones).
- New: AI chatbot, real map with route, CO₂ comparison of every transport option, dashboard.

## 10. Testing status (honest)

| Check | Result |
|---|---|
| `npm test` — routing, validation, auth protection, planner maths, AI request format (fake fetch) | ✅ 25/25 passed |
| Frontend production build | ✅ builds with no errors |
| Browser walkthrough (desktop + mobile): plan trip → login redirect → save → ride → rewards → chat → dashboard → protected-route redirect | ✅ passed with **mocked** DB-backed responses, no console errors |
| Real MongoDB Atlas, real Gemini/Claude replies, real ORS/Nominatim/Overpass calls | ⚠️ **Not run by me** — my build environment couldn't reach MongoDB or the AI/map APIs. Run `npm run smoke` with your `.env` to verify |

## 11. Troubleshooting

| Symptom | Fix |
|---|---|
| `Missing required environment variables` | You didn't create `server/.env` or left `MONGODB_URI` / `JWT_SECRET` empty |
| `MongoServerSelectionError` / timeout | Add your IP in Atlas → Network Access; check username/password in the URI |
| `bad auth : authentication failed` | Wrong DB user password, or special characters not URL-encoded |
| Frontend says "Cannot reach the server" | Backend isn't running on port 5000 |
| Chatbot says "isn't configured" | Add the key for your `AI_PROVIDER` to `server/.env` and restart the backend |
| "model was not found" | Change `GEMINI_MODEL` / `ANTHROPIC_MODEL` to a current model name |
| "We couldn't find …" | Add state/country, e.g. "Pachmarhi, Madhya Pradesh" |
| "Nearby stays are unavailable" | Overpass is busy — the rest of the plan still works; try again later |
| Logged out right after login in production | Client and API on different domains need HTTPS + `sameSite: 'none'` (already set when `NODE_ENV=production`) and `CLIENT_ORIGIN` set to your frontend URL |

## 12. Ideas for next steps

- Email verification & password reset
- Deploy: API on Render/Railway, client on Vercel/Netlify (set `VITE_API_URL` and `CLIENT_ORIGIN`)
- Let the chatbot call `/api/trips/plan` as a *tool* so it can plan trips directly
- Replace estimated factors with a carbon API such as Climatiq (paid tiers)
- Train timetables via an Indian Railways data provider
