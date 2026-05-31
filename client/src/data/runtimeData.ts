import { AIRLINES, type AirlineEntry } from './airlines';
import { DEFAULT_AIRPORTS, type Airport } from './airports';
import { AIRPORT_ALTIMETER } from './altimeter';
import { AIRPORT_RUNWAYS } from './runways';
import { SIDS, type Sid } from './sids';
import { STARS, type Star } from './stars';
import { WAYPOINTS, type WaypointCoord } from './waypoints';
import { CHART_MANIFEST, type ChartEntry } from './charts';

export interface RuntimeData {
  airlines?: Record<string, AirlineEntry>;
  airports?: Airport[];
  altimeter?: Record<string, string>;
  runways?: Record<string, string[]>;
  sids?: Sid[];
  stars?: Star[];
  waypoints?: Record<string, WaypointCoord>;
  charts?: ChartEntry[];
}

function replaceArray<T>(target: T[], source: unknown): boolean {
  if (!Array.isArray(source)) return false;
  target.splice(0, target.length, ...(source as T[]));
  return true;
}

function replaceObject<T extends Record<string, unknown>>(target: T, source: unknown): boolean {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return false;
  for (const key of Object.keys(target)) delete target[key as keyof T];
  Object.assign(target, source);
  return true;
}

export function applyRuntimeData(data: RuntimeData): string[] {
  const applied: string[] = [];
  if (replaceObject(AIRLINES as Record<string, unknown>, data.airlines)) applied.push('airlines');
  if (replaceArray(DEFAULT_AIRPORTS, data.airports)) applied.push('airports');
  if (replaceObject(AIRPORT_ALTIMETER as Record<string, unknown>, data.altimeter)) applied.push('altimeter');
  if (replaceObject(AIRPORT_RUNWAYS as Record<string, unknown>, data.runways)) applied.push('runways');
  if (replaceArray(SIDS, data.sids)) applied.push('sids');
  if (replaceArray(STARS, data.stars)) applied.push('stars');
  if (replaceObject(WAYPOINTS as Record<string, unknown>, data.waypoints)) applied.push('waypoints');
  if (replaceArray(CHART_MANIFEST, data.charts)) applied.push('charts');
  return applied;
}

export async function loadRuntimeData(): Promise<string[]> {
  const url = new URL('./data/runtime-data.json', window.location.href);
  url.searchParams.set('v', Date.now().toString());

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return [];
    const data = (await response.json()) as RuntimeData;
    const applied = applyRuntimeData(data);
    if (applied.length) {
      console.info(`Loaded runtime-data.json for: ${applied.join(', ')}`);
    }
    return applied;
  } catch (error) {
    console.warn('runtime-data.json was not loaded; using bundled defaults.', error);
    return [];
  }
}
