# ATC Tools — Handoff

A two-page React/Vite controller helper for VATSIM / IVAO style ATC simulators.

## Run locally

```bash
cd /home/user/workspace/atc-tools
npm install        # only once
npm run dev        # http://localhost:5000
npm run build      # outputs dist/public + dist/index.cjs
npm run check      # tsc --noEmit
```

The template runs Express + Vite on the same port (5000). No backend logic is
currently used by this app — the server only serves the SPA. The app is
suitable for static hosting from `dist/public/` if desired.

## Project layout

```
client/src/
  App.tsx                 # router, header, footer shell (hash routing)
  index.css               # aviation night-mode tokens (single dark theme)
  components/
    Logo.tsx              # inline SVG radar logo
    Header.tsx            # sticky nav with Tools / Flight Strips
    AtisGenerator.tsx     # ATIS card + add-airport flow
    AirlineLookup.tsx     # ICAO/callsign lookup
    PhraseGenerator.tsx   # IFR / pushback / taxi / takeoff / landing
  pages/
    Tools.tsx             # main page (ATIS + Airline + Phrases)
    Strips.tsx            # digital flight strips board + add form
  data/
    airlines.ts           # 76 seeded ICAO airlines + parse / spoken helpers
    airports.ts           # seeded airport list + NATO phonetic map
  lib/clipboard.ts        # navigator.clipboard with execCommand fallback
```

## Design / content decisions

- **Art direction:** Night-mode cockpit / radar. Midnight teal background
  (`hsl(210 30% 6%)`), radar-green primary (`hsl(152 70% 45%)`), monospace
  details. Subtle 32px radar grid + soft radial gradients on body.
- **Fonts:** Satoshi (body / display) + JetBrains Mono (data, codes, ATIS) via
  Fontshare.
- **Single dark theme:** `:root` and `.dark` share the same palette so the app
  always looks consistent in the sandboxed iframe.
- **No persistence:** All state is React `useState` (localStorage/sessionStorage
  are blocked in the sandbox). The footer notes "live state — not persisted".
- **Toasts:** shadcn `useToast` for every clipboard action.
- **Runway numbers are strings everywhere** (`"31L"`, `"04R"`).
- **Spoken callsign derivation:** `spokenCallsign("BAW123")` → `"Speedbird 123"`
  via the local airline map. Used in flight strips and phrase generator.

## Status options for flight strips

Implemented exactly as requested, including the user's spellings of
`Taxiiing` and `Depature`:

```
Given Clearance · Pushing Back · Taxiiing · Ready for Dep · Depature
· Climb/Enroute · Approach · ILS · Land · Taxiing to Gate · At gate
```

Each phase gets a color-coded left bar (amber / cyan / violet / emerald).
"Hold" toggles a high-visibility rose ring and pill. Delete mode arms a
single-shot click-to-delete and auto-disarms after one removal.

## Airline dataset

- File: `client/src/data/airlines.ts`
- Shape: `Record<string, { name: string; callsign: string; country?: string }>`
  keyed by uppercase ICAO 3-letter code.
- 76 common airlines seeded (BAW, DLH, AAL, AFR, KLM, UAE, QTR, JAL, etc.).
- **Recommended authoritative source** to expand or replace this file:
  Wikipedia [List of airline codes](https://en.wikipedia.org/wiki/List_of_airline_codes)
  (use the ICAO + callsign columns). Free, well-maintained, and the same source
  used by most ATC simulators. Alternative authoritative sources:
  - ICAO Doc 8585 (Designators for Aircraft Operating Agencies) — paid.
  - OpenSky Network airline DB (CSV) — community-maintained mirror.

The lookup also accepts full flight callsigns (`BAW123`) and parses out the
ICAO prefix automatically via `parseCallsign()`.

## Add-airport convention

The ATIS generator has an inline "+" to add an airport for the current session
only (in-memory). For permanent additions, append entries to
`DEFAULT_AIRPORTS` in `client/src/data/airports.ts`.

## Accessibility & test-ids

- Semantic `<header>`, `<nav aria-label="Primary">`, `<main>`, `<footer>`.
- All form controls have `<Label>` and `data-testid` attributes following
  `{action}-{target}` / `{type}-{content}` (with `-${id}` suffix for repeated
  strips). See: `button-generate-atis`, `select-atis-airport`, `strip-${id}`,
  `button-hold-${id}`, `cell-dep-${id}`, etc.

## Deploy URL

The built `dist/public` has been deployed via `deploy_website`. To redeploy
after edits: `npm run build` then `deploy_website(project_path="/home/user/workspace/atc-tools/dist/public", ...)`.

## Follow-up conventions

- New tools → add a component under `client/src/components/`, register in
  `pages/Tools.tsx`.
- New pages → register in `client/src/App.tsx` (`<Route path="/foo" ... />`) and
  add to the `NAV` array in `components/Header.tsx`.
- Keep new copy buttons routed through `lib/clipboard.ts` and `useToast` so the
  fallback path stays consistent.
- If persistent storage is later required, the template ships with SQLite via
  Drizzle (`server/storage.ts`, `shared/schema.ts`).
