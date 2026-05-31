// Editable airport QNH / altimeter settings.
// Keep each value as one display string so the app can show and copy it exactly
// the way controllers expect. Add or edit entries by ICAO below.

export const AIRPORT_ALTIMETER: Record<string, string> = {
  KSSI: 'QNH 1016, Altimeter 3000',
  KZAA: 'QNH 1028, Altimeter 3036',
  KLSX: 'QNH 1018, Altimeter 3007',
  KGJJ: 'QNH 1028, Altimeter 3036',
  KEYW: 'QNH 1015, Altimeter 2997',
  KZAN: 'QNH 1025, Altimeter 3027',
  KSSR: 'QNH 1016, Altimeter 3000',
  KMCD: 'QNH 1020, Altimeter 3014',
  KMCK: 'QNH 1026, Altimeter 3033',
  KMDW: 'QNH 1021, Altimeter 3013',
  KSZA: 'QNH 1016, Altimeter 3001',
  KICJ: 'QNH 1025, Altimeter 3027',
  KPFC: 'QNH 1017, Altimeter 3004',
  KRDI: 'QNH 1016, Altimeter 3001',
  KPIA: 'QNH 1015, Altimeter 2997',
  KBID: 'QNH 1012, Altimeter 2989',
  KVNW: 'QNH 1002, Altimeter 2959',
};

export function getAltimeterSetting(icao: string): string {
  return AIRPORT_ALTIMETER[icao.toUpperCase()] ?? '';
}
