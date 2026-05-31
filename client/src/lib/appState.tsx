// Central app session state shared across pages. Everything here lives in React
// state only (NO localStorage / sessionStorage) and resets on a full page
// refresh, per product requirements.
//
// Provides:
//  - savedCallsigns: shared between PhraseGenerator, Notes, PDC page.
//  - runwayPrefs: per-airport runway defaults synced across the site. Mass ATIS
//    has priority over Home ATIS (see setRunwayPref `source`).
//  - atisViewer: compact generated-ATIS summaries shown on Mass ATIS + Home.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export interface AtisViewerEntry {
  icao: string;
  letter: string;
  qnh: string; // QNH / Altimeter display string
  depRunway: string;
  arrRunway: string;
  windDir: string;
  windSpeed: string;
}

export type RunwaySource = 'mass' | 'home';

export interface AircraftNote {
  id: string;
  callsign: string;
  spoken: string;
  notes: string;
}

interface RunwayPref {
  dep: string;
  arr: string;
  source: RunwaySource;
}

interface AppStateValue {
  // Saved callsigns (uppercase, unique, insertion order).
  savedCallsigns: string[];
  addSavedCallsign: (cs: string) => boolean;
  removeSavedCallsign: (cs: string) => void;

  // Runway preferences per airport ICAO.
  runwayPrefs: Record<string, RunwayPref>;
  // Set a runway preference. Mass ATIS ('mass') always wins; Home ('home') only
  // sets when there is no existing mass-sourced pref for that airport.
  setRunwayPref: (icao: string, dep: string, arr: string, source: RunwaySource) => void;
  getRunwayPref: (icao: string) => RunwayPref | undefined;

  // ATIS viewer entries keyed by ICAO, synced between Mass ATIS and Home.
  atisViewer: AtisViewerEntry[];
  setAtisViewer: (entries: AtisViewerEntry[]) => void;

  // Global ATIS-update notification flag (set when the 30-min timer fires).
  atisUpdateDue: boolean;
  setAtisUpdateDue: (v: boolean) => void;

  // Shared aircraft notes (used by the Notes section AND auto-populated from
  // PDC / Text Phrase "Add to Notes when Copied").
  aircraftNotes: AircraftNote[];
  setAircraftNotes: (updater: AircraftNote[] | ((prev: AircraftNote[]) => AircraftNote[])) => void;
  addAircraftNote: (callsign: string, spoken: string) => string | null;
  // Insert text into a callsign's note following the copy rules:
  //  - missing aircraft   -> create it with the text
  //  - exists but empty    -> set the text
  //  - exists with a note  -> do nothing
  noteAircraftFromCopy: (callsign: string, spoken: string, text: string) => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [savedCallsigns, setSavedCallsigns] = useState<string[]>([]);
  const [runwayPrefs, setRunwayPrefs] = useState<Record<string, RunwayPref>>({});
  const [atisViewer, setAtisViewer] = useState<AtisViewerEntry[]>([]);
  const [atisUpdateDue, setAtisUpdateDue] = useState(false);
  const [aircraftNotes, setAircraftNotes] = useState<AircraftNote[]>([]);

  const addSavedCallsign = useCallback((cs: string) => {
    const trimmed = cs.trim().toUpperCase();
    if (!trimmed) return false;
    let added = false;
    setSavedCallsigns((items) => {
      if (items.includes(trimmed)) return items;
      added = true;
      return [...items, trimmed];
    });
    return added;
  }, []);

  const removeSavedCallsign = useCallback((cs: string) => {
    setSavedCallsigns((items) => items.filter((c) => c !== cs));
  }, []);

  const setRunwayPref = useCallback(
    (icao: string, dep: string, arr: string, source: RunwaySource) => {
      setRunwayPrefs((prev) => {
        const existing = prev[icao];
        // Home updates must not overwrite a Mass ATIS preference.
        if (source === 'home' && existing?.source === 'mass') return prev;
        return { ...prev, [icao]: { dep, arr, source } };
      });
    },
    [],
  );

  const getRunwayPref = useCallback(
    (icao: string) => runwayPrefs[icao],
    [runwayPrefs],
  );

  const addAircraftNote = useCallback((callsign: string, spoken: string): string | null => {
    const cs = callsign.trim().toUpperCase();
    if (!cs) return null;
    const id = `${cs}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setAircraftNotes((list) => [...list, { id, callsign: cs, spoken: spoken !== cs ? spoken : '', notes: '' }]);
    return id;
  }, []);

  const noteAircraftFromCopy = useCallback((callsign: string, spoken: string, text: string) => {
    const cs = callsign.trim().toUpperCase();
    if (!cs) return;
    setAircraftNotes((list) => {
      const idx = list.findIndex((a) => a.callsign === cs);
      if (idx === -1) {
        // Missing -> create with the copied text.
        const id = `${cs}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        return [...list, { id, callsign: cs, spoken: spoken !== cs ? spoken : '', notes: text }];
      }
      const existing = list[idx];
      if (existing.notes.trim()) return list; // already has a note -> do nothing
      // Exists but empty -> fill it in.
      const next = [...list];
      next[idx] = { ...existing, notes: text };
      return next;
    });
  }, []);

  const value = useMemo<AppStateValue>(
    () => ({
      savedCallsigns,
      addSavedCallsign,
      removeSavedCallsign,
      runwayPrefs,
      setRunwayPref,
      getRunwayPref,
      atisViewer,
      setAtisViewer,
      atisUpdateDue,
      setAtisUpdateDue,
      aircraftNotes,
      setAircraftNotes,
      addAircraftNote,
      noteAircraftFromCopy,
    }),
    [
      savedCallsigns,
      addSavedCallsign,
      removeSavedCallsign,
      runwayPrefs,
      setRunwayPref,
      getRunwayPref,
      atisViewer,
      atisUpdateDue,
      aircraftNotes,
      addAircraftNote,
      noteAircraftFromCopy,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
