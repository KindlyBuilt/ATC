// Route generation for the PDC / Route Generator page.
//
// Combines a departure SID, a short enroute leg, and an arrival STAR into a
// single de-duplicated routing. All geometry is done on the SAFS_Navaids chart
// pixel coordinates (resolveCoord from sids/stars). Fixes without coordinates
// are skipped for plotting/measuring but the route still works.

import { getAirport } from '@/data/airports';
import { normalizeRunwayForData } from '@/data/runways';
import { pickBestSid, resolveCoord, type Sid } from '@/data/sids';
import { pickBestStar, starEntryCoord, type Star } from '@/data/stars';
import { WAYPOINTS, type WaypointCoord } from '@/data/waypoints';

export interface GeneratedRoute {
  callsign: string;
  departure: string;
  depRunway: string; // display runway (may be KLSX 30R)
  arrival: string;
  arrRunway: string; // display runway
  sid?: Sid;
  star?: Star;
  enroute: string[]; // enroute waypoint names (deduped, excludes SID/STAR fixes)
  sidOnly: boolean;
}

// Names that belong to the SID or STAR, so they are never repeated in enroute.
function procedureFixNames(sid?: Sid, star?: Star): Set<string> {
  const s = new Set<string>();
  sid?.waypoints.forEach((w) => s.add(w.toUpperCase()));
  star?.waypoints.forEach((w) => s.add(w.toUpperCase()));
  return s;
}

// Pick 1-4 enroute waypoints that step roughly in a straight line from the SID
// end toward the STAR start. We greedily walk toward the target, always
// choosing the nearest unused fix that makes forward progress, keeping the
// route short and avoiding repeats.
export function pickEnroute(
  from: WaypointCoord,
  to: WaypointCoord,
  exclude: Set<string>,
  max = 4,
): string[] {
  const total = Math.hypot(to.x - from.x, to.y - from.y);
  if (total < 120) return []; // already adjacent — no enroute needed

  const used = new Set<string>(exclude);
  const chosen: string[] = [];
  let current = from;

  for (let step = 0; step < max; step += 1) {
    const remaining = Math.hypot(to.x - current.x, to.y - current.y);
    if (remaining < 160) break; // close enough to the STAR entry

    let bestName: string | null = null;
    let bestScore = Infinity;
    for (const [name, coord] of Object.entries(WAYPOINTS)) {
      if (used.has(name)) continue;
      const dCur = Math.hypot(coord.x - current.x, coord.y - current.y);
      const dTo = Math.hypot(coord.x - to.x, coord.y - to.y);
      // Must make forward progress toward the target and not backtrack.
      if (dTo >= remaining) continue;
      if (dCur < 60) continue; // too close to current point
      // Score favours fixes that are close to the current point yet clearly
      // advance toward the destination (short hops, low detour).
      const score = dCur + dTo;
      if (score < bestScore) {
        bestScore = score;
        bestName = name;
      }
    }
    if (!bestName) break;
    used.add(bestName);
    chosen.push(bestName);
    current = WAYPOINTS[bestName];
  }
  return chosen;
}

// Build a full route from inputs. Runways are display runways; they are
// normalized to the SID/STAR database runway before lookup.
export function generateRoute(input: {
  callsign: string;
  departure: string;
  depRunway: string;
  arrival: string;
  arrRunway: string;
  sidOnly: boolean;
}): GeneratedRoute {
  const depDbRwy = normalizeRunwayForData(input.departure, input.depRunway);
  const arrDbRwy = normalizeRunwayForData(input.arrival, input.arrRunway);

  const sid = pickBestSid(input.departure, depDbRwy, input.arrival);

  let star: Star | undefined;
  let enroute: string[] = [];

  if (!input.sidOnly) {
    // Reference coordinate from SID end (last resolvable SID waypoint).
    let sidEndCoord: WaypointCoord | undefined;
    if (sid) {
      for (let i = sid.waypoints.length - 1; i >= 0; i -= 1) {
        const c = resolveCoord(sid.waypoints[i]);
        if (c) { sidEndCoord = c; break; }
      }
    }
    star = pickBestStar(input.arrival, arrDbRwy, sidEndCoord);

    const starStart = star ? starEntryCoord(star) : undefined;
    if (sidEndCoord && starStart) {
      enroute = pickEnroute(sidEndCoord, starStart, procedureFixNames(sid, star));
    }
  }

  // Final de-dupe across everything (defensive).
  const proc = procedureFixNames(sid, star);
  const seen = new Set<string>();
  enroute = enroute.filter((w) => {
    const u = w.toUpperCase();
    if (proc.has(u) || seen.has(u)) return false;
    seen.add(u);
    return true;
  });

  return {
    callsign: input.callsign,
    departure: input.departure,
    depRunway: input.depRunway,
    arrival: input.arrival,
    arrRunway: input.arrRunway,
    sid,
    star,
    enroute,
    sidOnly: input.sidOnly,
  };
}

// ---- Output formatting ------------------------------------------------------

// Small ATC-coordination text. Full route ends with the enroute waypoints, the
// STAR, and the arrival ICAO/runway:
// "[Callsign], [DEP]/[RWY],[SID] via [enroute] , [ENR], [STAR], [ARR]/[ARR RWY]"
// SID-only: "[Callsign], [DEP ICAO]/[RWY],[SID] inbound to [ARR ICAO]"
export function formatAtcText(r: {
  callsign: string;
  departure: string;
  depRunway: string;
  arrival: string;
  arrRunway: string;
  sidName: string;
  enroute: string[];
  starName: string;
  sidOnly: boolean;
}): string {
  const cs = r.callsign.trim().toUpperCase() || 'AIRCRAFT';
  const sid = r.sidName || 'NO SID';
  if (r.sidOnly) {
    return `${cs}, ${r.departure}/${r.depRunway},${sid} inbound to ${r.arrival}`;
  }
  // Tail = "via [Enroute Waypoints], [STAR], [Arrival ICAO]/[Arrival Runway]".
  const tailParts = [
    r.enroute.join(' '),
    r.starName,
    `${r.arrival}/${r.arrRunway}`,
  ].filter(Boolean);
  const tail = tailParts.length ? ` via ${tailParts.join(', ')}` : '';
  return `${cs}, ${r.departure}/${r.depRunway},${sid}${tail}`;
}

// Build the flight-plan routing line used inside the PDC.
export function flightPlanRouting(r: {
  departure: string;
  depRunway: string;
  arrival: string;
  arrRunway: string;
  sidName: string;
  enroute: string[];
  starName: string;
  sidOnly: boolean;
}): string {
  if (r.sidOnly) {
    return `${r.departure}/${r.depRunway} ${r.sidName} THEN AS FILED`;
  }
  const parts = [
    `${r.departure}/${r.depRunway}`,
    r.sidName,
    ...r.enroute,
    r.starName,
    `${r.arrival}/${r.arrRunway}`,
  ].filter(Boolean);
  return parts.join(' ');
}

function zuluNow(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}Z`;
}

export interface PdcInput {
  callsign: string;
  departure: string;
  depRunway: string;
  arrival: string;
  arrRunway: string;
  sidName: string;
  enroute: string[];
  starName: string;
  sidOnly: boolean;
  altimeter: string;
}

// The six PDC body lines (ALL CAPS). No trailing "//" — line breaks only.
// The third line (FLIGHT PLAN ROUTING) is returned with its route segments so
// the coloured variant can tint each segment. `routingColoured` embeds the
// segment colour codes; `routingPlain` is the same content without codes.
function pdcLines(r: PdcInput): { lines: string[]; routingColoured: string } {
  const cs = (r.callsign.trim().toUpperCase()) || 'AIRCRAFT';
  const routingPlain = flightPlanRouting(r);

  // Coloured routing: "^6^*^ [DEP ICAO]/[DEP RWY], [SID], ^5 [ENR], ^2 [STAR], [ARR ICAO]/[ARR RWY] ^r".
  let routingColoured: string;
  if (r.sidOnly) {
    routingColoured = `^6^*^ ${r.departure}/${r.depRunway}, ${r.sidName || 'AS FILED'}, THEN AS FILED ^r`;
  } else {
    const dep = `${r.departure}/${r.depRunway}, ${r.sidName}`.trim();
    const enr = r.enroute.length ? ` ^5 ${r.enroute.join(' ')},` : '';
    const arr = `${r.starName ? `${r.starName}, ` : ''}${r.arrival}/${r.arrRunway}`;
    routingColoured = `^6^*^ ${dep},${enr} ^2 ${arr} ^r`;
  }

  const lines = [
    `${cs}, ${r.departure} AT ${zuluNow()}`,
    `CLEARED TO ${r.arrival} AIRPORT VIA ${r.sidName || 'AS FILED'}`,
    `FLIGHT PLAN ROUTING ${routingPlain}`,
    `INITIAL CLIMB 2000 EXPECT FL60 02 MIN AFTER DEP`,
    `${(r.altimeter || 'QNH ----').toUpperCase()}`,
    `READBACK NOT REQUIRED, CONTACT ME WHEN READY FOR PUSHBACK. USE F5 MENU 'FLIGHT PLAN' SECTION TO COMPLY WITH THIS ROUTING.`,
  ];
  return { lines, routingColoured };
}

// Plain PDC text (no colour codes). Starts with "/atc" and no "//" endings.
export function formatPdcText(r: PdcInput): string {
  const { lines } = pdcLines(r);
  return `/atc ${lines.join('\n')}`;
}

// Coloured PDC text. Each line is prefixed with an incrementing colour code
// (^1, ^2, ^3 ...); line 1 carries the leading "/atc". Line 3's routing is
// additionally split into coloured route segments.
export function formatPdcTextColoured(r: PdcInput): string {
  const { lines, routingColoured } = pdcLines(r);
  return lines
    .map((line, i) => {
      const code = `^${i + 1}`;
      const body = i === 2 ? `FLIGHT PLAN ROUTING ${routingColoured}` : line;
      const prefix = i === 0 ? `/atc ${code}` : code;
      return `${prefix} ${body}`;
    })
    .join('\n');
}
