// Wind component helpers shared by ATIS and Mass ATIS runway auto-selection.
//
// Runway heading is derived from its numeric designation (e.g. "30R" -> 300°,
// "4L" -> 40°). Headwind is the component of wind blowing down the runway
// toward the aircraft; crosswind is the perpendicular component. A positive
// headwind means wind opposes the takeoff/landing direction (good — you want
// the highest headwind runway).

export interface WindComponents {
  headwind: number; // positive = headwind, negative = tailwind
  crosswind: number; // absolute magnitude
  tailwind: number; // positive number when there is a tailwind, else 0
}

// Extract the numeric runway heading in degrees from a runway designation.
export function runwayHeading(runway: string): number | null {
  const m = runway.trim().match(/^(\d{1,2})/);
  if (!m) return null;
  const num = parseInt(m[1], 10);
  if (Number.isNaN(num)) return null;
  return num * 10;
}

// Compute wind components for a runway given wind direction (degrees) + speed.
export function windComponents(
  runway: string,
  windDir: number,
  windSpeed: number,
): WindComponents | null {
  const rwyHdg = runwayHeading(runway);
  if (rwyHdg == null) return null;
  // Angle between wind and runway heading.
  const angle = ((windDir - rwyHdg) * Math.PI) / 180;
  const head = windSpeed * Math.cos(angle); // + = headwind
  const cross = Math.abs(windSpeed * Math.sin(angle));
  return {
    headwind: head,
    crosswind: cross,
    tailwind: head < 0 ? Math.abs(head) : 0,
  };
}

// Pick the runway(s) with the highest headwind for the given wind. Returns the
// best runway and the full sorted list with components. Returns null when wind
// inputs are invalid or no runways are supplied.
export interface RunwayWindPick {
  best: string;
  ranked: Array<{ runway: string; comp: WindComponents }>;
}

export function pickRunwayByWind(
  runways: string[],
  windDir: number | null,
  windSpeed: number | null,
): RunwayWindPick | null {
  if (windDir == null || windSpeed == null || Number.isNaN(windDir) || Number.isNaN(windSpeed)) {
    return null;
  }
  if (runways.length === 0) return null;
  const ranked = runways
    .map((runway) => ({ runway, comp: windComponents(runway, windDir, windSpeed) }))
    .filter((r): r is { runway: string; comp: WindComponents } => r.comp != null)
    .sort((a, b) => b.comp.headwind - a.comp.headwind);
  if (ranked.length === 0) return null;
  return { best: ranked[0].runway, ranked };
}

// Short human-readable component summary, e.g. "H7 X3" (headwind 7, cross 3) or
// "T2 X5" when there is a tailwind.
export function shortWindLabel(comp: WindComponents): string {
  const main = comp.headwind >= 0
    ? `H${Math.round(comp.headwind)}`
    : `T${Math.round(Math.abs(comp.headwind))}`;
  return `${main} X${Math.round(comp.crosswind)}`;
}
