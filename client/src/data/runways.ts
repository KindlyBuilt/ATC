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
