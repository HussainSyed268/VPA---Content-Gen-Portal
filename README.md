# Dr Bob's Content Engine

An internal content dashboard for a pediatric dental practice ("Dr Bob's Content Engine").
It turns one idea — a link, a topic, or an outline — into a script and a branded video, and
tracks each piece through a review-and-publish pipeline. Built by VectorPath AI.

This is a faithful Next.js port of the original single-file HTML dashboard. The visual design,
copy, colors, icons, sample data, and behavior are unchanged — the only difference is that the
data layer now lives on the server behind an API, so it can later be wired to Google Sheets
without touching the UI.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

To build for production:

```bash
npm run build
npm run start
```

## Project structure

```
dr-bob-content-engine/
├── app/
│   ├── globals.css                 # ENTIRE original <style> block, copied verbatim
│   ├── layout.tsx                  # sets <title>, imports globals.css
│   ├── page.tsx                    # renders <Dashboard />
│   └── api/
│       └── content/
│           ├── route.ts            # GET (list) + POST (create)
│           └── [id]/route.ts       # PATCH (set status)
├── components/
│   └── Dashboard.tsx               # 'use client' — the whole UI (single-page, internal view state)
├── lib/
│   ├── types.ts                    # ContentRow type + Status union
│   ├── mock-data.ts                # seed rows, ported exactly from the original ROWS array
│   ├── store.ts                    # in-memory store (getRows / addRow / setStatus)
│   └── client.ts                   # fetchRows / createRow / updateStatus (call the API routes)
├── package.json
├── tsconfig.json
├── next.config.mjs
├── next-env.d.ts
└── .gitignore
```

The three views — **New Video**, **My Content**, and **Export** — are all rendered by the single
`Dashboard` component with internal view state, matching the original single-page behavior.
Splitting them into separate Next.js routes (`/`, `/my-content`, `/export`) is a possible future
refactor, but is intentionally left out to keep this a faithful port.

## Connecting to Google Sheets

The data layer is isolated behind a small seam so a developer can plug in Google Sheets without
touching the UI:

- **`lib/store.ts`** is currently an in-memory, module-level array seeded from `lib/mock-data.ts`.
  Replace its three functions — `getRows()`, `addRow(partial)`, `setStatus(id, status)` — with
  calls to a **Google Apps Script Web App** (`doGet`/`doPost`) or the **Google Sheets API**.
  Alternatively, leave `store.ts` alone and reimplement the two API routes
  (`app/api/content/route.ts` and `app/api/content/[id]/route.ts`) directly against Sheets.
- **Field names map 1:1 to the sheet columns** (manual §3.1): `id, title, sourceType, sourceUrl,
  topic, outline, platforms, status, summary, keyBullets, script, captionIG, captionWeb, audioUrl,
  videoUrl, driveUrl, postUrls, postedAt, errorMessage`.
- The status values the **UI writes back** are: `approved`, `retry`, `rejected`, and `scheduled`.
  (All other statuses — `intake`, `scraping`, `drafting`, `needs_review`, `voice_generating`,
  `voice_ready`, `video_generating`, `video_ready`, `posted`, `failed_scrape`, `failed_voice`,
  `failed_video` — are produced by the backend pipeline and only read by the UI.)
- New rows created from the **New Video** form are stamped `status: 'intake'` with today's date.

> **Note:** Until real persistence is wired up, the in-memory store **resets on every server
> restart**. Any videos you create or approvals you make during a session are lost when the dev/prod
> server restarts.

## Client data helpers

`lib/client.ts` mirrors the original three functions so the UI code changed as little as possible:

| Client helper                 | HTTP call                        | Purpose                         |
| ----------------------------- | -------------------------------- | ------------------------------- |
| `fetchRows()`                 | `GET /api/content`               | read every row                  |
| `createRow(row)`              | `POST /api/content`              | add a new idea (status=intake)  |
| `updateStatus(id, status)`    | `PATCH /api/content/:id`         | approved / retry / rejected / scheduled |
