// Dataset page — RUNTIME JSON approach (static-hosting compatible).
//
// Accessible by typed URL/hash (#/dataset); intentionally NOT in the main nav.
//
// Why runtime JSON: a static browser build cannot recompile the Vite/TS bundle,
// so we cannot regenerate the compiled app from edited source in-browser.
// Instead this page exposes every data table as editable JSON, lets you
// download individual JSON files and a combined runtime-data.json, which can be
// uploaded to your web host / GitHub to persist changes. The app could be
// extended to prefer an uploaded runtime-data.json over the built-in TS
// defaults at startup (see loadRuntimeData note below).
//
// To add a new data file: add an entry to DATASETS with its JSON serialiser.
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { AIRLINES } from '@/data/airlines';
import { DEFAULT_AIRPORTS } from '@/data/airports';
import { AIRPORT_ALTIMETER } from '@/data/altimeter';
import { AIRPORT_RUNWAYS } from '@/data/runways';
import { SIDS } from '@/data/sids';
import { STARS } from '@/data/stars';
import { WAYPOINTS } from '@/data/waypoints';
import { CHART_MANIFEST } from '@/data/charts';
import { Database, Download, RotateCcw, ChevronDown } from 'lucide-react';

interface DatasetDef {
  key: string;
  label: string;
  data: unknown;
}

// Manifest of editable datasets. Add new files here.
const DATASETS: DatasetDef[] = [
  { key: 'airlines', label: 'Airlines', data: AIRLINES },
  { key: 'airports', label: 'Airports', data: DEFAULT_AIRPORTS },
  { key: 'altimeter', label: 'Altimeter / QNH', data: AIRPORT_ALTIMETER },
  { key: 'runways', label: 'Runways', data: AIRPORT_RUNWAYS },
  { key: 'sids', label: 'SIDs', data: SIDS },
  { key: 'stars', label: 'STARs', data: STARS },
  { key: 'waypoints', label: 'Waypoints', data: WAYPOINTS },
  { key: 'charts', label: 'Chart manifest', data: CHART_MANIFEST },
];

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function DatasetPage() {
  const { toast } = useToast();
  const defaults = useMemo(
    () => Object.fromEntries(DATASETS.map((d) => [d.key, JSON.stringify(d.data, null, 2)])),
    [],
  );
  const [values, setValues] = useState<Record<string, string>>(defaults);

  function combinedJson(): string {
    const obj: Record<string, unknown> = {};
    for (const d of DATASETS) {
      try { obj[d.key] = JSON.parse(values[d.key]); }
      catch { obj[d.key] = d.data; }
    }
    return JSON.stringify(obj, null, 2);
  }

  function downloadOne(key: string) {
    try { JSON.parse(values[key]); }
    catch { toast({ title: 'Invalid JSON', description: `${key} is not valid JSON.`, variant: 'destructive' }); return; }
    download(`${key}.json`, values[key]);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-4">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Database className="h-5 w-5 text-primary" /> Dataset Editor
        </h1>
      </div>

      <p className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200" data-testid="dataset-note">
        Note: Changes are NOT synced to server. Download and upload your changes manually to your web hosting and/or github to save them
      </p>

      <div className="mb-5 flex flex-wrap gap-2">
        <Button onClick={() => download('runtime-data.json', combinedJson())} className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400" data-testid="button-download-runtime">
          <Download className="mr-2 h-4 w-4" /> Download combined runtime-data.json
        </Button>
        <Button variant="outline" onClick={() => setValues(defaults)} data-testid="button-reset-all">
          <RotateCcw className="mr-2 h-4 w-4" /> Reset all to defaults
        </Button>
      </div>

      <Card className="mb-5">
        <CardContent className="p-4 text-xs text-muted-foreground">
          <p>
            Static hosting cannot compile TypeScript/source in the browser, so there is no in-browser "rebuild app"
            download. The no-build path is the runtime JSON above: download <code>runtime-data.json</code> (or individual
            files), commit them to your hosting/GitHub, and the app can be wired to prefer that JSON over the built-in
            defaults on load. Each section below is prefilled with the current data and can be edited, downloaded, or reset.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {DATASETS.map((d) => (
          <DatasetSection
            key={d.key}
            def={d}
            value={values[d.key]}
            onChange={(v) => setValues((p) => ({ ...p, [d.key]: v }))}
            onDownload={() => downloadOne(d.key)}
            onReset={() => setValues((p) => ({ ...p, [d.key]: defaults[d.key] }))}
          />
        ))}
      </div>
    </div>
  );
}

function DatasetSection({
  def, value, onChange, onDownload, onReset,
}: {
  def: DatasetDef;
  value: string;
  onChange: (v: string) => void;
  onDownload: () => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card data-testid={`dataset-card-${def.key}`}>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">{def.label} <span className="font-mono text-xs text-muted-foreground">({def.key}.json)</span></CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={onReset} data-testid={`button-dataset-reset-${def.key}`}><RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset</Button>
            <Button variant="secondary" size="sm" onClick={onDownload} data-testid={`button-dataset-download-${def.key}`}><Download className="mr-1.5 h-3.5 w-3.5" /> Download</Button>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" data-testid={`button-dataset-toggle-${def.key}`}>{open ? 'Hide' : 'Edit'}<ChevronDown className={`ml-1.5 h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} /></Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="min-h-[240px] resize-y font-mono text-xs"
              spellCheck={false}
              data-testid={`textarea-dataset-${def.key}`}
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
