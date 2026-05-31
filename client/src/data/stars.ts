// STAR (Standard Terminal Arrival Route) procedures keyed by arrival ICAO.
// Each entry lists the arriving ICAO, the runway it applies to, the STAR name,
// and the ordered waypoint list (uppercase) from the enroute start down toward
// the landing/approach. Edit/add STARs by appending to the STARS array below.
//
// Waypoints reference either an entry in waypoints.ts or an airport in
// airports.ts. Route logic gracefully ignores waypoints with missing
// coordinates (it skips them when plotting / measuring) so an unknown fix never
// crashes the generator.

import { getAirport, type Airport } from './airports';
import { getWaypointCoord, type WaypointCoord } from './waypoints';

export interface Star {
  airport: string;
  runway: string;
  name: string;
  waypoints: string[];
}

export const STARS: Star[] = [
  { airport: 'KSSI', runway: '11', name: 'BEROK5', waypoints: ['RATON', 'MAREL', 'BEROK'] },
  { airport: 'KSSI', runway: '29', name: 'TOSCO8', waypoints: ['ISLND', 'HIPIE'] },
  { airport: 'KZAA', runway: '18', name: 'EMRAG1', waypoints: ['KPIA', 'EMRAG', 'ORESO'] },
  { airport: 'KZAA', runway: '36', name: 'LENGU3', waypoints: ['HADLO', 'LENGU', 'IGPOL'] },
  { airport: 'KLSX', runway: '12', name: 'OSHNN1', waypoints: ['OSHNN', 'WADUP'] },
  { airport: 'KLSX', runway: '30', name: 'WINDD1', waypoints: ['WINDD', 'AVATR', 'SHELL', 'PORTT', 'MNROE'] },
  { airport: 'KLSX', runway: '30', name: 'STDUM1', waypoints: ['STDUM', 'RUSTY', 'PORTT', 'MNROE'] },
  { airport: 'KGJJ', runway: '08', name: 'BOSET2', waypoints: ['BOSET', 'DESTO', 'MURAN'] },
  { airport: 'KGJJ', runway: '26', name: 'TASAR1', waypoints: ['SURFF', 'STEYN', 'HADLO'] },
  { airport: 'KEYW', runway: '09', name: 'FNTSY1', waypoints: ['MURAN', 'MOODI'] },
  { airport: 'KEYW', runway: '27', name: 'KRAKN1', waypoints: ['TASAR', 'WISUL'] },
  { airport: 'KMDW', runway: '4L', name: 'FISSK6', waypoints: ['HIPIE', 'COAST', 'ACITO'] },
  { airport: 'KMDW', runway: '4R', name: 'FISSK5', waypoints: ['QWRTZ', 'ISLND', 'BACEN'] },
  { airport: 'KMDW', runway: '13L', name: 'PANGG5', waypoints: ['CBILL', 'TCHDN'] },
  { airport: 'KMDW', runway: '22L', name: 'MEGGZ7', waypoints: ['CBILL', 'IROCK', 'AWSUM'] },
  { airport: 'KMDW', runway: '22R', name: 'STASH2', waypoints: ['CBILL', 'IROCK', 'BOCAH'] },
  { airport: 'KMDW', runway: '31R', name: 'ENDEE6', waypoints: ['WINDD', 'BREEN', 'WNNRS', 'GAGGA'] },
  { airport: 'KICJ', runway: '02', name: 'GIANO7A', waypoints: ['KAPIL', 'GIANO'] },
  { airport: 'KICJ', runway: '07', name: 'LURON6R', waypoints: ['DANDE', 'LURON'] },
  { airport: 'KICJ', runway: '20', name: 'ROSAS9B', waypoints: ['AVATR', 'KOLOR', 'ROSAS'] },
  { airport: 'KICJ', runway: '25', name: 'LAVRU2C', waypoints: ['SHELL', 'BADUK', 'LAVRU'] },
  { airport: 'KPFC', runway: '06L', name: 'GLORY1', waypoints: ['GLORY', 'BABEL', 'LUIGE'] },
  { airport: 'KPFC', runway: '06R', name: 'AKASI1', waypoints: ['AKASI', 'ZELDA', 'ATACK'] },
  { airport: 'KPFC', runway: '24L', name: 'ICEMN6', waypoints: ['ICEMN', 'DANDE', 'JOLLY'] },
  { airport: 'KPFC', runway: '24R', name: 'ROSAS1', waypoints: ['ROSAS', 'LURON', 'MAYAH'] },
  { airport: 'KRDI', runway: '18', name: 'RNDAL2', waypoints: ['RNDAL', 'ISLND', 'BREEN'] },
  { airport: 'KRDI', runway: '18', name: 'MSTRY2', waypoints: ['MSTRY', 'BACEN', 'DOCEB'] },
  { airport: 'KRDI', runway: '36', name: 'ICEMN1', waypoints: ['ICEMN', 'SHELL', 'HOMEY'] },
  { airport: 'KRDI', runway: '36', name: 'ROSAS2', waypoints: ['ROSAS', 'KOLOR', 'HOMEY'] },
  { airport: 'KPIA', runway: '09', name: 'FORTT1', waypoints: ['FORTT', 'FLWRZ'] },
  { airport: 'KPIA', runway: '27', name: 'ACITO1', waypoints: ['ACITO', 'MONKY'] },
];

// Resolve a waypoint or airport reference to chart coordinates. Returns
// undefined if the name is not found in either dataset (e.g. FERRO).
export function resolveCoord(name: string): WaypointCoord | undefined {
  const wp = getWaypointCoord(name);
  if (wp) return wp;
  const ap: Airport | undefined = getAirport(name.toUpperCase());
  if (ap?.x != null && ap.y != null) return { x: ap.x, y: ap.y };
  return undefined;
}

// PDC/route-generator note: the PDC page maps display runways like KLSX "30R"
// down to the SID/STAR database runway "30". Pass an already-normalized runway
// (see normalizeRunwayForData in runways.ts) when calling these helpers.
export function getStarsFor(airport: string, runway?: string): Star[] {
  return STARS.filter((s) => s.airport === airport && (runway ? s.runway === runway : true));
}

// When multiple STARs match an arrival airport+runway, pick the one whose first
// waypoint (the enroute entry point) is closest to a reference coordinate —
// typically the last SID waypoint of the departure route. Falls back to the
// first candidate when no reference / coords are available.
export function pickBestStar(
  arrival: string,
  runway: string,
  fromCoord?: WaypointCoord,
): Star | undefined {
  const candidates = getStarsFor(arrival, runway);
  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0];
  if (!fromCoord) return candidates[0];

  let best: Star | undefined;
  let bestDist = Infinity;
  for (const star of candidates) {
    const firstName = star.waypoints[0];
    const coord = resolveCoord(firstName);
    if (!coord) continue;
    const d = Math.hypot(coord.x - fromCoord.x, coord.y - fromCoord.y);
    if (d < bestDist) {
      bestDist = d;
      best = star;
    }
  }
  return best ?? candidates[0];
}

// Return the coordinate of the first STAR waypoint that actually resolves.
export function starEntryCoord(star: Star): WaypointCoord | undefined {
  for (const name of star.waypoints) {
    const c = resolveCoord(name);
    if (c) return c;
  }
  return undefined;
}
