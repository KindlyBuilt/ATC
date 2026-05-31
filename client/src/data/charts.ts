// Local chart manifest (NOT a live Google Drive integration).
//
// Charts live as static images under client/public/charts/<ICAO|GLOBAL>/<file>.
// The file naming convention is <ICAO|Global>-<CATEGORY>-<DisplayName>.<ext>
// (e.g. KLSX-SID-OILLL1.jpg => category SID, display name "OILLL1").
//
// HOW TO ADD A CHART LATER:
//   1. Drop the image into client/public/charts/<ICAO>/  (create the folder if
//      it does not exist). Use the <ICAO>-<CATEGORY>-<DisplayName>.<ext> name.
//   2. Append an entry to CHART_MANIFEST below.
//   NOTE: a purely static site cannot enumerate folders at runtime without a
//   manifest, so this manifest IS the source of truth. The Charts page only
//   lists airports that appear here, plus GLOBAL when GLOBAL charts exist.
//
// To add or remove charts in bulk: contact Buckers or Kindly Built Web.

export type ChartCategory = 'GEN' | 'GND' | 'SID' | 'STAR' | 'APP';

export const CHART_CATEGORIES: ChartCategory[] = ['GEN', 'GND', 'SID', 'STAR', 'APP'];

export const CHART_CATEGORY_LABEL: Record<ChartCategory, string> = {
  GEN: 'General',
  GND: 'Ground',
  SID: 'SIDs',
  STAR: 'STARs',
  APP: 'Approaches',
};

export interface ChartEntry {
  airport: string; // ICAO, or 'GLOBAL' for charts not tied to one airport
  category: ChartCategory;
  name: string; // display name, e.g. "OILLL1" or "Ground Movement Chart"
  file: string; // path relative to site root, e.g. "./charts/KLSX/KLSX-SID-OILLL1.jpg"
}

// Built from the files currently in client/public/charts/. Display names are the
// human-friendly portion after the category in each filename.
export const CHART_MANIFEST: ChartEntry[] = [
  // Global charts (shown under the "Global" option). Only true global charts —
  // no SAFS navaids / alternate navaids here.
  { airport: 'GLOBAL', category: 'GEN', name: 'Navaids', file: './charts/GLOBAL/Global-GEN-Navaids.jpg' },

  // KLSX
  { airport: 'KLSX', category: 'GND', name: 'Ground Movement Chart', file: './charts/KLSX/KLSX-GND-Ground-Movement-Chart.jpg' },
  { airport: 'KLSX', category: 'SID', name: 'JJAWS1', file: './charts/KLSX/KLSX-SID-JJAWS1.jpg' },
  { airport: 'KLSX', category: 'SID', name: 'OILLL1', file: './charts/KLSX/KLSX-SID-OILLL1.jpg' },
  { airport: 'KLSX', category: 'SID', name: 'VALEY1', file: './charts/KLSX/KLSX-SID-VALEY1.jpg' },
  { airport: 'KLSX', category: 'STAR', name: 'STDUM1', file: './charts/KLSX/KLSX-STAR-STDUM1.jpg' },
  { airport: 'KLSX', category: 'STAR', name: 'WINDD1', file: './charts/KLSX/KLSX-STAR-WINDD1.jpg' },

  // KMDW
  { airport: 'KMDW', category: 'GND', name: 'Ground Movement Chart', file: './charts/KMDW/KMDW-GND-Ground-Movement-Chart.jpg' },
  { airport: 'KMDW', category: 'GND', name: 'Terminal Parking', file: './charts/KMDW/KMDW-GND-Ground-Termnal-Parking.jpg' },
  { airport: 'KMDW', category: 'SID', name: 'BAGEL5', file: './charts/KMDW/KMDW-SID-BAGEL5.jpg' },
  { airport: 'KMDW', category: 'SID', name: 'PMPKN3', file: './charts/KMDW/KMDW-SID-PMPKN3png.jpg' },
  { airport: 'KMDW', category: 'SID', name: 'RAYNR7', file: './charts/KMDW/KMDW-SID-RAYNR7.jpg' },
];

// Parse <ICAO>-<CATEGORY>-<NAME>.<ext> into structured parts. Returns null when
// the filename does not follow the convention. "Global" maps to GLOBAL.
export function parseChartFilename(file: string): {
  airport: string;
  category: ChartCategory;
  name: string;
} | null {
  const base = file.split('/').pop() ?? file;
  const noExt = base.replace(/\.[a-z0-9]+$/i, '');
  const parts = noExt.split('-');
  if (parts.length < 3) return null;
  const [airport, category, ...rest] = parts;
  const cat = category.toUpperCase() as ChartCategory;
  if (!CHART_CATEGORIES.includes(cat)) return null;
  const ap = airport.toUpperCase() === 'GLOBAL' ? 'GLOBAL' : airport.toUpperCase();
  // Tidy up a stray "png" suffix in display names (e.g. PMPKN3png => PMPKN3).
  const name = rest.join('-').replace(/png$/i, '');
  return { airport: ap, category: cat, name };
}

// Airports that have charts available (plus GLOBAL if any global charts exist).
export function chartAirports(manifest: ChartEntry[]): string[] {
  const set = new Set<string>();
  let hasGlobal = false;
  for (const c of manifest) {
    if (c.airport === 'GLOBAL') hasGlobal = true;
    else set.add(c.airport);
  }
  const list = Array.from(set).sort();
  return hasGlobal ? [...list, 'GLOBAL'] : list;
}

// Charts to show for the selected airport/folder. GLOBAL shows ONLY global
// charts; an airport shows ONLY that airport's charts (not global).
export function chartsForAirport(
  manifest: ChartEntry[],
  airport: string,
): ChartEntry[] {
  if (airport === 'GLOBAL') return manifest.filter((c) => c.airport === 'GLOBAL');
  return manifest.filter((c) => c.airport === airport);
}

// Group charts by category in canonical order.
export function groupChartsByCategory(
  charts: ChartEntry[],
): { category: ChartCategory; charts: ChartEntry[] }[] {
  return CHART_CATEGORIES.map((category) => ({
    category,
    charts: charts.filter((c) => c.category === category),
  })).filter((g) => g.charts.length > 0);
}
