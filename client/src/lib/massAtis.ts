// Mass ATIS generation helpers.
import { PHONETIC } from '@/data/airports';
import { getAltimeterSetting } from '@/data/altimeter';
import { getAtisRunways } from '@/data/runways';
import { pickRunwayByWind } from '@/lib/wind';

export interface MiniAtis {
  icao: string;
  letter: string;
  tempC: number;
  qnh: string;
  visibility: string;
  cloudHeight: string;
  windDir: number;
  windSpeed: number;
  depRunway: string;
  arrRunway: string;
  singleRwyOps: boolean; // KLSX only
  copied: boolean;
}

// Center presets: which airports they select + the final contact line.
export interface CenterPreset {
  key: string;
  label: string;
  airports: string[];
  contact: string;
}

export const CENTER_PRESETS: CenterPreset[] = [
  {
    key: 'pa',
    label: 'PA CTR',
    airports: ['KZAA', 'KPIA', 'KMDW', 'KRDI', 'KSZA', 'KZAN', 'KSSR', 'KSSI'],
    contact: 'Contact Paleto Center on 130.250 for all clearances',
  },
  {
    key: 'ls',
    label: 'LS CTR',
    airports: ['KRDI', 'KBID', 'KSZA', 'KGJJ', 'KLSX', 'KEYW', 'KPFC', 'KICJ'],
    contact: 'Contact Los Santos Center on 130.750 for all clearances',
  },
  {
    key: 'sa',
    label: 'SA CTR',
    airports: [], // filled at call-site with all ATIS airports
    contact: 'Contact San Andreas Center on 129.750 for all clearances',
  },
];

const FIRST_THIRD = 'ABCDEFGHI'.split(''); // first third of the alphabet

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function nextLetter(letter: string): string {
  const idx = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(letter.toUpperCase());
  if (idx < 0) return 'A';
  return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[(idx + 1) % 26];
}

export function phonetic(letter: string): string {
  return PHONETIC[letter.toUpperCase()] ?? letter;
}

// Vary the global wind for one airport: +/-10% direction, +/-40% speed.
export function varyWind(globalDir: number, globalSpeed: number): { dir: number; speed: number } {
  const dirDelta = globalDir * 0.1;
  const dir = Math.round((globalDir + randInt(-Math.round(dirDelta), Math.round(dirDelta)) + 360) % 360);
  const speedDelta = Math.max(1, Math.round(globalSpeed * 0.4));
  const speed = Math.max(0, Math.round(globalSpeed + randInt(-speedDelta, speedDelta)));
  return { dir, speed };
}

// KLSX uses 12L/12R/30L/30R for ATIS; Single RWY Ops limits to 12R/30L.
function runwayOptionsFor(icao: string, singleOps: boolean): string[] {
  if (icao === 'KLSX') {
    return singleOps ? ['12R', '30L'] : ['12L', '12R', '30L', '30R'];
  }
  return getAtisRunways(icao);
}

// Build a mini ATIS for an airport from the global wind + letter base.
export function buildMiniAtis(
  icao: string,
  baseLetter: string,
  baseTempC: number,
  globalDir: number,
  globalSpeed: number,
  singleOps: boolean,
): MiniAtis {
  const { dir, speed } = varyWind(globalDir, globalSpeed);
  const options = runwayOptionsFor(icao, singleOps);
  const pick = pickRunwayByWind(options, dir, speed);
  const best = pick?.best ?? options[0] ?? '';
  return {
    icao,
    letter: baseLetter,
    tempC: baseTempC + randInt(-2, 2),
    qnh: getAltimeterSetting(icao),
    visibility: '10SM',
    cloudHeight: '',
    windDir: dir,
    windSpeed: speed,
    depRunway: best,
    arrRunway: best,
    singleRwyOps: singleOps && icao === 'KLSX',
    copied: false,
  };
}

// Random base info letter from the first third of the alphabet.
export function randomBaseLetter(): string {
  return FIRST_THIRD[randInt(0, FIRST_THIRD.length - 1)];
}

// Pick `count` info letters from the first third of the alphabet, all distinct
// where possible. If more airports than available letters, the remainder fall
// back to additional random first-third letters (duplicates allowed only then).
export function randomDistinctLetters(count: number): string[] {
  const pool = [...FIRST_THIRD];
  // Fisher-Yates shuffle.
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = randInt(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(pool[i] ?? FIRST_THIRD[randInt(0, FIRST_THIRD.length - 1)]);
  }
  return out;
}

// Random base temperature 10-25C (all airports cluster within ~5C of this).
export function randomBaseTemp(): number {
  return randInt(12, 22);
}

// Build the ATIS body lines for a mini ATIS (used for the colour-coded copy).
export function miniAtisLines(
  m: MiniAtis,
  airportName: string,
  pdcAvailable: boolean,
  contactLine: string,
): string[] {
  const phon = phonetic(m.letter);
  const wind = `${m.windDir.toString().padStart(3, '0')} AT ${m.windSpeed}KT`;
  const clouds = m.cloudHeight.trim() ? `CLOUDS ${m.cloudHeight.trim().toUpperCase()}.` : 'SKY CONDITION CLEAR.';
  const sameRwy = m.depRunway === m.arrRunway;
  const rwyLine = sameRwy
    ? `RUNWAY IN USE ${m.depRunway}.`
    : `DEPARTING RUNWAY ${m.depRunway}. LANDING RUNWAY ${m.arrRunway}.`;
  const lines = [
    `${airportName.toUpperCase()} ATIS INFORMATION ${phon}.`,
    `WIND ${wind}. VISIBILITY ${m.visibility}. ${clouds}`,
    `TEMPERATURE ${m.tempC}C. ${(m.qnh || 'ALTIMETER --').toUpperCase()}.`,
    rwyLine,
  ];
  if (m.singleRwyOps) {
    lines.push('SINGLE RUNWAY OPS IN USE, 12L/30R CLSD USED AS TAXIWAY ONLY.');
  }
  if (pdcAvailable) {
    lines.push('PDC CLEARANCE AVAILABLE VIA TEXT CHAT, REQUEST IFR CLEARANCE AS NORMAL.');
  }
  if (contactLine) lines.push(contactLine.toUpperCase());
  lines.push(`ADVISE AIRCRAFT TYPE AND RECEIPT OF INFORMATION ${m.letter} ON INITIAL CONTACT.`);
  return lines;
}
