// Runways per airport ICAO. Each runway is an end designation (e.g. "11", "29",
// "22L"). Edit this map directly to add new airports or change runways.

export const AIRPORT_RUNWAYS: Record<string, string[]> = {
  KSSI: ['11', '29'],
  KZAA: ['18', '36'],
  KLSX: ['12', '30'],
  KGJJ: ['08', '26'],
  KEYW: ['09', '27'],
  KMDW: ['22L', '22R', '13L', '31R', '4L', '4R'],
  KICJ: ['07', '25', '02', '20'],
  KPFC: ['06L', '06R', '24L', '24R'],
  KRDI: ['18', '36'],
  KPIA: ['09', '27'],
};

export function getRunways(icao: string): string[] {
  return AIRPORT_RUNWAYS[icao] ?? [];
}

// KLSX presents 12L/12R/30L/30R to controllers for ATIS / Mass ATIS selection,
// but the SID/STAR/runway database uses the bare "12" and "30" identifiers.
// normalizeRunwayForData maps a display runway down to the database runway so
// SID/PDC route lookups still find a match. Other airports keep their exact
// runway string (only the L/R suffix is stripped when the base runway exists
// in the database).
export function normalizeRunwayForData(icao: string, runway: string): string {
  if (!runway) return runway;
  const r = runway.trim().toUpperCase();
  const dbRunways = getRunways(icao);
  if (dbRunways.includes(r)) return r;
  // Strip a trailing L/R/C and retry (handles KLSX 30R -> 30, 12L -> 12).
  const base = r.replace(/[LRC]$/i, '');
  if (dbRunways.includes(base)) return base;
  return r;
}

// KLSX ATIS/Mass ATIS uses an L/R split that is NOT in the runways database.
// These are the controller-facing runway options for KLSX.
export const KLSX_ATIS_RUNWAYS = ['12L', '12R', '30L', '30R'];

// Runway options shown in ATIS-style selectors for an airport. KLSX overrides
// the database with its L/R split; everything else uses the database list.
export function getAtisRunways(icao: string): string[] {
  if (icao === 'KLSX') return [...KLSX_ATIS_RUNWAYS];
  return getRunways(icao);
}
