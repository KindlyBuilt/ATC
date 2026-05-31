// Shared airport data used by ATIS, Phrase Generator, Flight Strips, and SID Generator.
// Coords are X/Y pixel positions on the 2000x1719 SAFS_Navaids chart and are used by
// the SID Generator to plot routes.
// To add or edit an airport, simply add/update a row in DEFAULT_AIRPORTS below.

export interface Airport {
  icao: string;
  name: string;
  city?: string;
  notForAtis?: boolean;
  // Pixel position on the 2000x1719 SAFS_Navaids chart. Optional so the legacy
  // VFR entry can opt out.
  x?: number;
  y?: number;
}

export const DEFAULT_AIRPORTS: Airport[] = [
  { icao: 'KLSX', name: 'Los Santos International Airport', x: 797, y: 843 },
  { icao: 'KEYW', name: 'Key West International Airport', x: 449, y: 1159 },
  { icao: 'KGJJ', name: 'Jersey International Airport', x: 455, y: 671 },
  { icao: 'KZAA', name: 'Auckland International Airport', x: 529, y: 250 },
  { icao: 'KZAN', name: 'Fort Zancudo', x: 740, y: 446 },
  { icao: 'KSSI', name: 'Sandy Shores International Airport', x: 928, y: 372 },
  { icao: 'KSSR', name: 'Sandy Shores Regional Airport', x: 975, y: 435 },
  { icao: 'KMCD', name: 'Mount Chiliad Airfield', x: 953, y: 301 },
  { icao: 'KMCK', name: 'McKenzie Airfield', x: 1020, y: 325 },
  { icao: 'KPIA', name: 'Procopio International Airport', x: 970, y: 116 },
  { icao: 'KMDW', name: 'Midway International Airport', x: 1301, y: 225 },
  { icao: 'KSZA', name: 'Lugano Regional Airport', x: 1110, y: 537 },
  { icao: 'KRDI', name: 'Red Dead International Airport', x: 1291, y: 610 },
  { icao: 'KBID', name: 'Block Island State Airport', x: 1205, y: 816 },
  { icao: 'KICJ', name: 'Palermo International Airport', x: 1265, y: 1121 },
  { icao: 'KPFC', name: 'Pacific International Airport', x: 710, y: 1382 },
  { icao: 'KVNW', name: 'Vinewood', x: 880, y: 581 },
  { icao: 'VFR', name: 'VFR Local', notForAtis: true },
];

// NATO phonetic for ATIS info letter
export const PHONETIC: Record<string, string> = {
  A: 'ALPHA', B: 'BRAVO', C: 'CHARLIE', D: 'DELTA', E: 'ECHO', F: 'FOXTROT',
  G: 'GOLF', H: 'HOTEL', I: 'INDIA', J: 'JULIET', K: 'KILO', L: 'LIMA',
  M: 'MIKE', N: 'NOVEMBER', O: 'OSCAR', P: 'PAPA', Q: 'QUEBEC', R: 'ROMEO',
  S: 'SIERRA', T: 'TANGO', U: 'UNIFORM', V: 'VICTOR', W: 'WHISKEY', X: 'XRAY',
  Y: 'YANKEE', Z: 'ZULU',
};

export function getAirport(icao: string): Airport | undefined {
  return DEFAULT_AIRPORTS.find((a) => a.icao === icao);
}
