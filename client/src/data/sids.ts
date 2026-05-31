// SID procedures keyed by departure ICAO. Edit/add SIDs by appending to the
// SIDS array below. Each entry lists the departing ICAO, the runway it
// applies to, the SID name, and the ordered waypoint list (uppercase).
//
// Waypoints reference either an entry in waypoints.ts or an airport in
// airports.ts (since both have chart coordinates and may be used as the
// last waypoint for distance calculations).

import { getAirport, type Airport } from './airports';
import { getWaypointCoord, type WaypointCoord } from './waypoints';

export interface Sid {
  airport: string;
  runway: string;
  name: string;
  waypoints: string[];
}

export const SIDS: Sid[] = [
  { airport: 'KSSI', runway: '29', name: 'RATON3', waypoints: ['BEROK', 'MAREL', 'RATON'] },
  { airport: 'KSSI', runway: '11', name: 'ISLND1', waypoints: ['HIPIE', 'ISLND'] },
  { airport: 'KZAA', runway: '18', name: 'IGPOL7', waypoints: ['IGPOL', 'LENGU', 'HADLO'] },
  { airport: 'KZAA', runway: '36', name: 'ORESO2', waypoints: ['ORESO', 'EMRAG', 'CBILL'] },
  { airport: 'KLSX', runway: '12', name: 'OILLL1', waypoints: ['MNROE', 'OILLL'] },
  { airport: 'KLSX', runway: '30', name: 'VALEY1', waypoints: ['WADUP', 'OSHNN', 'DODGR', 'VALEY'] },
  { airport: 'KLSX', runway: '30', name: 'JJWAS1', waypoints: ['WADUP', 'OSHNN', 'JJAWS'] },
  { airport: 'KGJJ', runway: '26', name: 'CAIRN2R', waypoints: ['MURAN', 'DESTO', 'CAIRN'] },
  { airport: 'KGJJ', runway: '08', name: 'BEACH2F', waypoints: ['HADLO', 'BEACH'] },
  { airport: 'KGJJ', runway: '08', name: 'TASAR2F', waypoints: ['HADLO', 'STEYN'] },
  { airport: 'KEYW', runway: '09', name: 'BUFFT1', waypoints: ['WISUL', 'TASAR'] },
  { airport: 'KEYW', runway: '27', name: 'GRIDS4', waypoints: ['MOODI', 'MURAN'] },
  { airport: 'KMDW', runway: '22L', name: 'CICERO3', waypoints: ['BACEN', 'ISLND'] },
  { airport: 'KMDW', runway: '22R', name: 'CICERO4', waypoints: ['ACITO', 'COAST'] },
  { airport: 'KMDW', runway: '13L', name: 'MIDWY7', waypoints: ['GAGGA', 'WNNRS', 'BREEN'] },
  { airport: 'KMDW', runway: '31R', name: 'RAYNR7', waypoints: ['TCHDN', 'CBILL', 'SNEAK'] },
  { airport: 'KMDW', runway: '4L', name: 'PMPKN3', waypoints: ['BOCAH', 'IROCK', 'CBILL', 'SNEAK'] },
  { airport: 'KMDW', runway: '4R', name: 'BAGEL5', waypoints: ['AWSUM', 'IROCK', 'CBILL', 'SNEAK'] },
  { airport: 'KICJ', runway: '02', name: 'PAL5S', waypoints: ['ROSAS', 'KOLOR', 'AVATR'] },
  { airport: 'KICJ', runway: '07', name: 'TRP6W', waypoints: ['BADUK', 'SHELL'] },
  { airport: 'KICJ', runway: '20', name: 'KAPIL6A', waypoints: ['GIANO', 'KAPIL', 'DANDE'] },
  { airport: 'KICJ', runway: '25', name: 'GIANO1G', waypoints: ['LURON', 'DANDE'] },
  { airport: 'KPIA', runway: '09', name: 'MONKY1', waypoints: ['MONKY', 'ACITO'] },
  { airport: 'KPIA', runway: '27', name: 'FLWRZ1', waypoints: ['FLWRZ', 'FORTT'] },
  { airport: 'KPFC', runway: '06R', name: 'MAYAH1', waypoints: ['MAYAH', 'LURON', 'ROSAS'] },
  { airport: 'KPFC', runway: '24L', name: 'ATACK1', waypoints: ['ATACK', 'ZELDA', 'AKASI'] },
  { airport: 'KPFC', runway: '24R', name: 'LUIGE1', waypoints: ['LUIGE', 'BABELGLORY'] },
  { airport: 'KPFC', runway: '06L', name: 'JOLLY1', waypoints: ['JOLLY', 'DANDE', 'ICEMN'] },
  { airport: 'KRDI', runway: '18', name: 'HOMEY1', waypoints: ['HOMEY', 'KOLOR', 'ROSAS'] },
  { airport: 'KRDI', runway: '18', name: 'HOMEY2', waypoints: ['HOMEY', 'SHELL', 'ICEMN'] },
  { airport: 'KRDI', runway: '36', name: 'BREEN2', waypoints: ['BREEN', 'ISLND', 'RNDAL'] },
  { airport: 'KRDI', runway: '36', name: 'DOCEB2', waypoints: ['DOCEB', 'BACEN', 'MSTRY'] },
];

// Resolve a waypoint or airport reference to chart coordinates. Returns
// undefined if the name is not found in either dataset.
export function resolveCoord(name: string): WaypointCoord | undefined {
  const wp = getWaypointCoord(name);
  if (wp) return wp;
  const ap: Airport | undefined = getAirport(name.toUpperCase());
  if (ap?.x != null && ap.y != null) return { x: ap.x, y: ap.y };
  return undefined;
}

export function getSidsFor(airport: string, runway?: string): Sid[] {
  return SIDS.filter((s) => s.airport === airport && (runway ? s.runway === runway : true));
}

// When multiple SIDs match a departure airport+runway, pick the one whose
// last waypoint coordinate is closest to the arrival airport coordinate.
// Returns the chosen SID, or undefined if none match.
export function pickBestSid(
  departure: string,
  runway: string,
  arrival: string,
): Sid | undefined {
  const candidates = getSidsFor(departure, runway);
  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0];

  const arr = getAirport(arrival);
  if (!arr || arr.x == null || arr.y == null) return candidates[0];

  let best: Sid | undefined;
  let bestDist = Infinity;
  for (const sid of candidates) {
    const lastName = sid.waypoints[sid.waypoints.length - 1];
    const coord = resolveCoord(lastName);
    if (!coord) continue;
    const dx = coord.x - arr.x;
    const dy = coord.y - arr.y;
    const d = Math.hypot(dx, dy);
    if (d < bestDist) {
      bestDist = d;
      best = sid;
    }
  }
  return best ?? candidates[0];
}
