# ATC Tools — Major Feature Batch Handoff

Local preview build only. No GitHub ops, no releases, no remote changes. Charts use a
local manifest; Dataset uses the runtime-JSON approach. No localStorage/sessionStorage and
no persistent layout save (per instructions).

## Build & QA results
- `npx tsc --noEmit` — passes, zero errors.
- `npm run build` — succeeds (client ~498 kB JS / gzip 152 kB, CSS 78 kB; server bundle 790 kB).
- Playwright QA (production server on :5000) — all pages load with **no console/page errors**.
  Screenshots saved in repo root: `qa-home-new.png`, `qa-pdc.png`, `qa-pdc-gen.png`,
  `qa-massatis.png`, `qa-charts.png`, `qa-dataset.png`.
- Verified end-to-end: PDC route gen (SID+enroute+STAR, ATC + full PDC text, map legs),
  Mass ATIS (8-airport LS CTR preset, colour-coded copy with `^1..^n` + PDC line, timer,
  Copied state), ATIS Viewer sync Home↔Mass ATIS, Charts SID generator + associated chart
  highlight, Dataset note/downloads, Edit Layout hide/reveal, Flight Strips unaffected.

## Files added
- `client/src/data/stars.ts` — STAR table + `getStarsFor`, `pickBestStar`, `starEntryCoord`, `resolveCoord`. FERRO (in LURON6R) has no coord and is skipped gracefully.
- `client/src/data/charts.ts` — local chart manifest + `parseChartFilename`, `chartsForAirport`.
- `client/src/lib/appState.tsx` — `AppStateProvider`/`useAppState`: saved callsigns, runway prefs (Mass>Home priority), ATIS viewer entries, `atisUpdateDue` flag.
- `client/src/lib/route.ts` — `generateRoute`, `pickEnroute` (geometry), `formatAtcText`, `flightPlanRouting`, `formatPdcText`.
- `client/src/lib/wind.ts` — wind components, `pickRunwayByWind`, `shortWindLabel`.
- `client/src/lib/atisFormat.ts` — `buildAtisCopyText` (`/setatis ICAO` + `^1..^9` colour codes).
- `client/src/lib/massAtis.ts` — center presets, `buildMiniAtis`, `varyWind`, `nextLetter`, `miniAtisLines`, random letter/temp.
- `client/src/components/SectionCard.tsx` — reusable collapsible card with edit-mode delete + drag handle.
- `client/src/components/RunwaySelect.tsx` — ≤2 runways = single select, >2 = multiselect dropdown, plus Custom + wind hints/best (★).
- `client/src/components/Notes.tsx` — General notes + saved-callsign controls + aircraft note blocks (callsign bold/larger, spoken smaller, focus jumps to notes).
- `client/src/components/AtisViewer.tsx` — compact synced ATIS summary.
- `client/src/pages/Pdc.tsx`, `Charts.tsx`, `MassAtis.tsx`, `Dataset.tsx` — new pages.
- `client/public/data/chart-manifest.json`, `client/public/data/runtime-data.json` — runtime placeholders with comments; `client/public/charts/` dir created.

## Files modified
- `client/src/App.tsx` — wraps app in `AppStateProvider`; mounts all 6 pages hidden (state preserved across nav); routes `/ /pdc /charts /mass-atis /strips /dataset`.
- `client/src/components/Header.tsx` — nav Tools→Home + PDC/Charts/Mass ATIS; global amber ATIS-update banner.
- `client/src/pages/Tools.tsx` (Home) — Edit Layout (drag-reorder via HTML5 DnD, hide/reveal, responsive 2-col grid with wide/half presets), "Refresh the tab to reset." text, adds Notes + ATIS Viewer; all sections collapsible.
- `client/src/components/AtisGenerator.tsx` — SectionCard; PDC checkbox; colour-coded copy; runway selectors (KLSX→12L/12R/30L/30R) with wind auto-select; feeds ATIS Viewer + runway prefs.
- `client/src/components/PhraseGenerator.tsx` — SectionCard; per-subsection collapsibles; shared saved callsigns.
- `client/src/components/SidGenerator.tsx` — SectionCard; arrival now optional (first SID if none); seeds runway from synced pref.
- `client/src/components/AirlineLookup.tsx`, `AirportSettings.tsx` — SectionCard wrappers (collapsible + edit-mode aware).
- `client/src/data/runways.ts` — `normalizeRunwayForData` (KLSX 30R→30, 12L→12), `getAtisRunways`, `KLSX_ATIS_RUNWAYS`.

## Key implementation notes
- **Runway sync**: Mass ATIS writes prefs with source `'mass'` (priority); Home ATIS writes `'home'` and never overrides a mass pref. SID/PDC read prefs and normalize KLSX L/R to the database runway.
- **Enroute picker**: greedy nearest-forward-progress walk over `WAYPOINTS`, 1–4 fixes, dedupes against SID/STAR fixes; SID/STAR internal waypoints are never emitted individually (only SID/STAR names).
- **PDC outputs**: small ATC text and full ALL-CAPS `//` PDC; SID-only uses "inbound to ARR" / "THEN AS FILED". Edited-route panel has independent 2×2 copy buttons and only affects the map.
- **Map legs**: SID purple solid, enroute blue dashed (starts at SID end, ends at STAR start), STAR green solid; missing coords skipped.
- **Mass ATIS timer**: 30-min countdown; on expiry sets global banner, advances letters, re-varies winds, recomputes runways.

## Limitations / static-hosting notes
- **Dataset**: static browsers cannot recompile the Vite/TS bundle, so there is no in-browser "rebuild app" download. Implemented the no-build runtime-JSON path: per-file + combined `runtime-data.json` download, each section editable/resettable, with the exact required note and an on-page explanation. A future hook can prefer an uploaded `runtime-data.json` over built-in defaults at startup (no extra deps; JSZip not added).
- **Charts**: uses the built-in manifest from `charts.ts` (plus a runtime `chart-manifest.json` placeholder for future runtime loading). No Drive integration. Example entries point at the existing navaids image until real chart PNGs are dropped into `public/charts/` using the `<ICAO>-<CATEGORY>-<NAME>.png` convention. Panel resize is via CSS `resize-y`; full free-form drag/positioning of panels was not implemented (kept to resizable cards + New Chart panels to avoid over-engineering).
- **Edit Layout**: reorder uses native HTML5 drag (works with mouse and most touch browsers); hide/reveal/reset supported. Not persisted (intentional — no localStorage).
- **KBID/KSZA** have no runways in `runways.ts`, so their Mass ATIS/ATIS runway selectors show "Select runway". Add entries to `AIRPORT_RUNWAYS` if desired.
- Vite warns the JS chunk >500 kB (pre-existing single-bundle setup); not addressed to avoid build-config changes.

## How to preview
`npm run build` then `start_server`/`node dist/index.cjs` on port 5000 (or `npm run dev`).
