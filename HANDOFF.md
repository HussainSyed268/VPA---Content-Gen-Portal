# Dr Bob's Content Engine — Developer Hand-off

This package contains everything you need to run and finish the **Dr Bob's Content Engine**
dashboard — a small internal tool for a pediatric dental practice that lets non-technical staff
create videos, review AI-written scripts, track them through a pipeline, and export data.

It is a **front-end that is fully built**; your job is to connect it to the existing Google Sheet
that the automation already reads/writes.

---

## What's in this zip

| Item | What it is |
|---|---|
| `dr-bob-content-engine/` | The **Next.js project** (App Router + TypeScript). This is the main deliverable. |
| `DrBob_Content_Engine_Dashboard.html` | The original single-file prototype. Open it in a browser for a quick, dependency-free preview of the intended design/behavior. |
| `DrBob_Content_Engine_Manual_May2026.pdf` | The product manual. **§3.1 defines the sheet columns; §4 defines every status.** This is the source of truth for field names and statuses. |
| `HANDOFF.md` | This file. |

---

## Run it

```bash
cd dr-bob-content-engine
npm install
npm run dev            # http://localhost:3000
```

> Note: the app has not yet been compiled in a Node environment — first `npm run dev` is the real
> smoke test. It runs on in-memory mock data until the Google Sheet is wired in.

---

## Stack & structure (defaults — change if you prefer)

- **Next.js 14 (App Router) + React 18 + TypeScript**
- **Plain CSS** in `app/globals.css` (the design as-is; not Tailwind)
- Single client component `components/Dashboard.tsx` holds the whole UI with internal view state.
  Splitting New Video / My Content / Export into separate routes is a fine future refactor.

```
app/
  layout.tsx                 # <title>, imports globals.css
  page.tsx                   # renders <Dashboard/>
  globals.css                # all styling (verbatim from the prototype)
  api/content/route.ts       # GET (list) + POST (create)
  api/content/[id]/route.ts  # PATCH (set status)
components/Dashboard.tsx      # the full UI
lib/
  types.ts                   # ContentRow + Status union (all statuses)
  mock-data.ts               # seed rows
  store.ts                   # in-memory store  <-- REPLACE WITH GOOGLE SHEETS
  client.ts                  # fetchRows / createRow / updateStatus (browser -> API)
```

---

## The one job: connect Google Sheets

The UI never talks to Google directly — it calls three API endpoints. Swap the in-memory
`lib/store.ts` (or the route handlers) for real Sheet reads/writes. Credentials stay server-side.

- `getRows()`      → read every row from the sheet
- `addRow(row)`    → append a new row with Status = `intake`
- `setStatus(id,s)`→ set the Status column

**Field names in `ContentRow` map 1:1 to the sheet columns in manual §3.1.**
**The UI only ever writes these Status values:** `approved`, `retry`, `rejected`, `scheduled`.

Easiest path: a **Google Apps Script Web App** (`doGet`/`doPost`) bound to the sheet, called from
the API routes. The Sheets API with a service account also works.

The in-memory store resets on server restart until real persistence is wired in.

---

## Known notes

- Dynamic lists/board/modal are rendered from HTML strings via `dangerouslySetInnerHTML` (mirroring
  the original prototype exactly), with clicks delegated through `data-*` attributes. Behavior is
  identical to the prototype; refactor to pure JSX later if desired.
- All `new Date()` / `document` / `window` usage is inside effects/handlers (no SSR/hydration issues).
- The "Export to CSV" button generates the file client-side with a UTF-8 BOM (so Excel renders emoji
  and accented characters correctly).

Questions on intended behavior? Compare against `DrBob_Content_Engine_Dashboard.html` — it's the
canonical reference for how everything should look and act.
