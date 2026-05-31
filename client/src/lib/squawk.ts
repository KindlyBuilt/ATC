// Realistic game/ATC squawks use octal digits only: 0-7.
// Avoid common VFR/default codes here so generated IFR codes feel useful.

const RESERVED = new Set(['0000', '1200', '2000', '7000', '7500', '7600', '7700']);

export function randomSquawk(): string {
  let value = '';
  do {
    value = Array.from({ length: 4 }, () => Math.floor(Math.random() * 8).toString()).join('');
  } while (RESERVED.has(value));
  return value;
}
