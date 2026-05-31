// Build the SAFS-formatted ATIS copy string.
//
// Format: the copied text starts "/setatis <ICAO>" then each ATIS line is
// prefixed with a colour code "^1 ", "^2 ", ... up to "^9 ", with a real line
// break before each so the colour code starts each line. Lines beyond 9 reuse
// "^9 " (the highest supported colour).
export function buildAtisCopyText(icao: string, bodyLines: string[]): string {
  const colored = bodyLines
    .filter((l) => l.trim().length > 0)
    .map((line, i) => `^${Math.min(i + 1, 9)} ${line}`);
  return `/setatis ${icao}\n${colored.join('\n')}`;
}
