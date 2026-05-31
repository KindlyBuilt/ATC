import { mkdir, writeFile } from 'node:fs/promises';
import { AIRLINES } from '../client/src/data/airlines';
import { DEFAULT_AIRPORTS } from '../client/src/data/airports';
import { AIRPORT_ALTIMETER } from '../client/src/data/altimeter';
import { AIRPORT_RUNWAYS } from '../client/src/data/runways';
import { SIDS } from '../client/src/data/sids';
import { STARS } from '../client/src/data/stars';
import { WAYPOINTS } from '../client/src/data/waypoints';
import { CHART_MANIFEST } from '../client/src/data/charts';

export async function writeRuntimeData() {
  const outputDir = 'client/public/data';
  await mkdir(outputDir, { recursive: true });
  await writeFile(
    `${outputDir}/runtime-data.json`,
    JSON.stringify({
      airlines: AIRLINES,
      airports: DEFAULT_AIRPORTS,
      altimeter: AIRPORT_ALTIMETER,
      runways: AIRPORT_RUNWAYS,
      sids: SIDS,
      stars: STARS,
      waypoints: WAYPOINTS,
      charts: CHART_MANIFEST,
    }, null, 2),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeRuntimeData().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
