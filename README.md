# MatsyaSetu app (v3): web page + PWA, runs on stub data

One React app. On a phone it is an installable PWA with bottom navigation. On a laptop it is a normal web page with a sidebar. Every screen works today with **stub data** saved in the browser, so you can use and judge the whole flow before the backend exists.

## Run (Ubuntu / bash)
The app talks to your **FastAPI backend on http://localhost:8000** by default. Vite forwards `/api` to it, so there is no CORS or cookie setup.
```bash
unzip matsyasetu-frontend-v3-live.zip && cd matsyasetu-app
npm install
# 1) start the backend (in the backend repo):  uv run uvicorn app.main:app --port 8000
# 2) start the app:
npm run dev                          # http://localhost:5173  (log in with your backend user)
VITE_API_PROXY=http://localhost:9000 npm run dev    # if the backend uses another port
VITE_USE_STUB=1 npm run dev          # no backend at all: whole app on demo data
npm test                             # money rules
npm run build && npm run preview     # installable PWA build (preview also proxies /api)
```
Phone on the same Wi-Fi: `npm run dev -- --host`, open the shown address. Install needs HTTPS (deploy `dist/`, or put the same reverse proxy in front of the backend).

## What is live and what is still local

| Screen / action | Source |
|---|---|
| Login, logout, session | **Backend** `/api/auth/*` |
| Suppliers, fish list, fish on/off | **Backend** |
| Customers: list, add | **Backend** (phone and place are required by the backend) |
| New trip: trip, customers, bags, rates | **Backend** (several calls: trip, customers, requirements, rates) |
| Trip overview, customer in trip | **Backend**, combined from requirements-table, handovers, payments-summary |
| Handover | **Backend** `POST /trips/{id}/handovers` (bags of 0 are skipped) |
| Advance and current payment, history, cancel | **Backend** `.../customers/{tc}/payments` and `/void` |
| Close trip | **Backend** `POST /trips/{id}/close` |
| Customer balances per trip, To collect total | **Backend data**, summed on the phone (one summary call per trip) |
| Low stock banner | Backend `GET /trips/{id}/stock` against your limit |
| Profile, preferences (theme, defaults, low-stock limits, alerts) | **This device only** (no backend endpoint yet) |
| Default rates | **This device only**, sent to the backend with each *new* trip (`PUT /trips/{id}/rates`) |
| Fish photos | **This device only** |
| Receipt screen | Built from real payments. Remaining is replayed from saved payments (backend has no snapshot yet). PDF is a demo PDF made in the browser. |

Because the backend cannot give an **expected amount before handover**, the app shows "after handover" for amounts until the bags are handed over. Advance still works.

Not possible with the current backend: a per-bag rate label on the handover screen (rates are write-only) and a handover of zero bags.

## The flow (as designed)
1. **Customer list** (Trip → customers). Tap **Advance** on a row, or on the Order list tab, to take an advance before the bags are handed over.
2. **Handover** (tap a customer → Record handover). Bags per fish, notes, Record Handover. Locked after saving.
3. **Payment** opens after handover. It is always **Current payment**. The screen **stays open** after each payment so you can add another one. Balance updates in place.
4. **History** lists every payment (All / Advance / Current). **Receipt** shows amount received and the remaining for that trip at that moment. Share or Download PDF. A wrong payment is **cancelled with a reason**, never deleted.
5. After a payment a snackbar offers **Undo** for 7 seconds.
6. **Close trip** works even with unpaid balances. Unpaid money stays collectable from Customers or Dashboard → To collect.

Balances are always per trip. A customer who owes ₹800 on trip A and ₹500 on trip B sees two separate balances (and a total of ₹1,300 above them).

## Screens
Login · Dashboard (3 blocks) · Trips · New trip · Trip overview (Customers / Order list) · Customer in trip · Handover · Payment · History · Receipt · Customers · Customer → trips · To collect · Settings (list in list: Profile, Default supplier, Default fish, Low stock, Default rates, Stock alerts, Fish photos, Appearance, About/install).

## Where things live
```
src/api/types.ts   shapes the backend must return
src/api/money.ts   the money rules (tested)
src/api/stub.ts    in-browser fake database + seed data (localStorage "ms_stub_v3")
src/api/api.ts     THE ONLY data file the screens use. Each function = one endpoint
src/pages, src/settings, src/ui   screens and components
```
When a new backend endpoint is ready, change only the matching function in `src/api/liveApi.ts`. Screens do not change. `BACKEND_GUIDE.md` lists the endpoints still to build (its paths for payments are from my first draft: use the trip-scoped paths above).

## Notes
- Settings → About shows the connection status and resets device-only settings.
- Payment and handover retries reuse one reference, so a double tap never records twice.
- "Show rate per bag" (Settings → Profile) hides the per-bag rate on the handover screen. It is a privacy convenience, not security.
- Not built: offline queue, real stock ledger, reports screen (backend report file is described in the guide).
