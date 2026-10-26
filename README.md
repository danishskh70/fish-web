# FishSeed Manager

A mobile-first web app for running fish seed distribution trips. Plan what each customer wants, order from the supplier, receive the stock, hand out bags in the field, print slips and bills, and close the trip. Installs on a phone like a normal app (PWA).

Built for one owner who works on the move, with a growing team in mind. Everything is designed to take as few taps as possible and to keep the owner's selling rates secret.

> This repository is the **frontend only**. It talks to a separate FastAPI backend (`/api`).

## What it does

A trip has two phases.

**1. Prepare**
1. Create the trip: date, supplier, fish types.
2. Add customers from your customer list.
3. Set each customer's requirement (bags per fish).
4. Review the order list. The packing view uses the same data.
5. Save the trip configuration.

**2. Distribute (the session)**
1. Start the session by recording the bags actually received from the supplier.
2. A card grid shows every customer. Tap one, check the prefilled bags, confirm.
3. Add stock if the supplier sends more. Add an unexpected customer if someone turns up.
4. Finish: hand leftover bags to a customer named `Self`, show the bill, close the trip.

Once a trip is closed it is read-only and moves to the Trips tab history.

## Features

- **One open trip at a time.** The app always shows the next step.
- **Session lock.** While a trip is in progress, the app keeps you in the session. The lock comes from the trip status saved on the server, so a refresh does not escape it.
- **Safe handovers.** Quantities are prefilled from the plan. A retry after a network drop uses the same reference, so the server cannot record a handover twice. Over-stock gives a warning, not a block.
- **Print and export.** Requirement list, order list, packing list, trip summary, handover slip, complete bill and customer bill. Use the browser's Print or Save as PDF. CSV export for requirements, handovers, customers and past trips.
- **Settings in categories.** General, Trips & stock, Customers & suppliers, Printing & sharing, Data & synchronization, About.
- **Default rates.** Set a rate per fish once. It is applied to each new trip automatically. See [Security notes](#security-notes).
- **Unsaved-changes guard.** Leaving a form with unsaved work asks first, including the Android back gesture.
- **Plain-language errors.** Network and server problems are explained in everyday words and your entries stay on screen.
- **Live session.** Session screens refresh every 15 seconds, so a second phone sees new handovers.
- **Field-ready.** Light and dark themes, large text option, bright-sun mode, vibration, keep-screen-awake, bundled Inter font that works offline.

## Tech stack

| Area | Choice |
|---|---|
| UI | React 18, TypeScript |
| Build | Vite 5 |
| Routing | React Router 6 (data router, `useBlocker` for the leave guard) |
| Server state | TanStack Query 5 |
| PWA | `vite-plugin-pwa` (prompted updates, app shell only, never caches the API) |
| Tests | Vitest, Testing Library, jsdom |
| Hosting | Netlify (static) with the API proxied through it |

## Getting started

You need Node 20 or newer and the backend running locally on port 8000.

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. In development, requests to `/api` are proxied to `http://localhost:8000`.

### Environment variable

Create `.env` (never commit it):

```
VITE_API_BASE_URL=/api
```

- `/api` is the default. In development the Vite proxy sends it to your local backend. On Netlify the redirect in `netlify.toml` sends it to your hosted backend.
- Set a full URL (for example `http://localhost:8000/api`) only if you want to bypass the proxy. In production that makes the login cookie third-party, which Safari and Firefox may block.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check, then build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the test suite once |

## Project structure

```
src/
  App.tsx              Routes, session lock, data router
  main.tsx             Providers and router
  api.ts               Fetch wrapper, error mapping, cookies
  errors.ts            Plain-language error messages
  lib.tsx              Shared hooks and UI atoms
  extras.tsx           Offline banner, wake lock, install prompt, leave guard
  prefs.tsx            Device preferences (theme, text size, defaults)
  defaultRates.ts      Default rates kept on this device
  handoverRef.ts       Idempotency reference for handovers
  settings-ui.tsx      Settings row components
  ui-feedback.tsx      Toasts, confirm dialogs, error boundary
  types.ts, keys.ts, format.ts
  pages/               One file per screen
    settings/          One file per settings category
  __tests__/           Unit and smoke tests
public/                Icons (including maskable), bundled font
netlify.toml           Proxy, SPA fallback, cache headers
```

## Trip phases

The app derives a trip's phase from data saved on the server, never from local state.

| Phase | Rule | Main action |
|---|---|---|
| Preparing | Status `PLANNING`, no final order list | Continue setting up |
| Configured | Status `PLANNING`, final order list saved | Start session |
| In progress | Status `IN_PROGRESS` | Continue session |
| Closed | Status `CLOSED` | View (read only) |

## Security notes

- **Selling rates are write-only.** The UI never shows a saved rate. Rate fields are password-style inputs and are cleared after saving.
- **Bills are not cached.** The bill is fetched on demand, kept in memory only, and hidden again after 30 seconds, when the window loses focus, or when you leave the page.
- **No tokens in browser storage.** Login uses a cookie set by the server.
- **The service worker caches only the app files**, never API responses.
- **Default rates are stored in this browser** (frontend-only for now). They cannot be viewed in the app, but someone with access to the phone's browser data could read them. Use this feature only on your own device. Moving default rates to the server is the planned fix.
- **Do not publish your backend's `/docs` and `/openapi.json` in production.** Turn them off in FastAPI.

## Backend requirements

The app expects a FastAPI backend under `/api` with cookie-based login. The main resources are customers, suppliers, fish types, trips, trip customers and requirements, supplier lists, packing lists, supplier deliveries, handovers, stock, rates and bill. Rates are set with write-only calls; the read side returns only whether a rate is set.

## Deployment (Netlify)

1. Connect the repository. Build command `npm run build`, publish directory `dist`.
2. Set `VITE_API_BASE_URL=/api`, or leave it unset.
3. In `netlify.toml`, set the `to` address of the `/api/*` redirect to your backend.
4. Deploy. After each deploy, open the installed app and confirm the "New version ready" bar appears, then tap Update.

On Android, open the site in Chrome and choose Install app. On iPhone, open it in Safari, tap Share, then Add to Home Screen, and log in once inside the app.

## Testing

```bash
npm test
```

The suite covers money formatting, trip phase rules, error messages, default rates, the handover reference, the unsaved-changes guard, and cold-start loading of the core screens (session grid, handover, settings).

If tests fail on a newer Node version with an `AbortSignal` error, make sure `src/test-setup.ts` is listed under `setupFiles` in `vite.config.ts`.

## Roadmap

- Payments and customer ledger (manual entry, no gateway)
- Helper accounts with limited access, and per-user history
- Default rates stored on the server
- Marathi and English
- Offline queue for handovers

## License

Add a license before making the repository public. Without one, the code is all rights reserved by default.
