// Charts page — uses a LOCAL MANIFEST (charts.ts / public chart-manifest.json),
// NOT a live Google Drive integration. Lets controllers browse charts grouped
// by category and view images.
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { DEFAULT_AIRPORTS } from '@/data/airports';
import {
  CHART_MANIFEST, CHART_CATEGORIES, chartsForAirport, chartAirports,
  type ChartEntry, type ChartCategory,
} from '@/data/charts';
import { Map, ChevronDown, Plus, ZoomIn, ZoomOut, X } from 'lucide-react';

const GLOBAL = 'GLOBAL';
const AIRPORT_NAME: Record<string, string> = Object.fromEntries(
  DEFAULT_AIRPORTS.map((a) => [a.icao, a.name]),
);

export default function ChartsPage() {
  // Runtime manifest could be loaded from public/data/chart-manifest.json; for
  // now we use the built-in manifest from charts.ts.
  const [manifest] = useState<ChartEntry[]>(CHART_MANIFEST);
  // Extra "New Chart" panels (independent viewers). Just panel ids.
  const [extraPanels, setExtraPanels] = useState<number[]>([]);
  const [nextPanel, setNextPanel] = useState(1);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Charts</h1>
          <p className="text-sm text-muted-foreground">Browse charts by airport. Only airports with charts are listed; Global shows global charts only. Use the zoom buttons to crop in, drag the bottom edge to resize, click to enlarge.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setExtraPanels((p) => [...p, nextPanel]); setNextPanel((n) => n + 1); }} data-testid="button-new-chart">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> New Chart
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartPanel manifest={manifest} />
        {extraPanels.map((id) => (
          <ChartPanel key={id} manifest={manifest} onRemove={() => setExtraPanels((p) => p.filter((x) => x !== id))} />
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground" data-testid="charts-footer">
        Contact Buckers or Kindly Built Web to add or remove charts
      </p>
    </div>
  );
}

function ChartPanel({ manifest, onRemove }: { manifest: ChartEntry[]; onRemove?: () => void }) {
  // Only airports/folders that actually have charts (plus GLOBAL if present).
  const airportOptions = useMemo(() => chartAirports(manifest), [manifest]);
  const [airport, setAirport] = useState(() => airportOptions[0] ?? GLOBAL);
  const [selected, setSelected] = useState<ChartEntry | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [imageOpen, setImageOpen] = useState(true);
  // zoom = CSS scale applied to the image inside an overflow container, so
  // zooming in actually crops/scales the visible region rather than no-op.
  const [zoom, setZoom] = useState(1);
  const [enlarged, setEnlarged] = useState(false);

  const charts = useMemo(() => chartsForAirport(manifest, airport), [manifest, airport]);
  const grouped = useMemo(() => {
    const m: Record<ChartCategory, ChartEntry[]> = { GEN: [], GND: [], SID: [], STAR: [], APP: [] };
    charts.forEach((c) => m[c.category].push(c));
    return m;
  }, [charts]);

  useEffect(() => { setSelected(null); setZoom(1); }, [airport]);

  return (
    <Card className="lg:col-span-1" data-testid="card-chart-panel">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Map className="h-4 w-4 text-primary" /> Chart Viewer
        </CardTitle>
        <div className="flex items-center gap-1">
          {onRemove && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove} aria-label="Remove panel" data-testid="button-remove-chart-panel"><X className="h-4 w-4" /></Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setPanelOpen((s) => !s)} data-testid="button-chart-panel-toggle">{panelOpen ? 'Hide' : 'Show'}</Button>
        </div>
      </CardHeader>
      {panelOpen && (
        <CardContent className="grid gap-3">
          {/* Airport dropdown, centered */}
          <div className="mx-auto w-full max-w-xs">
            <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Airport</Label>
            <Select value={airport} onValueChange={setAirport}>
              <SelectTrigger data-testid="select-chart-airport"><SelectValue /></SelectTrigger>
              <SelectContent>
                {airportOptions.map((icao) => (
                  <SelectItem key={icao} value={icao}>
                    {icao === GLOBAL ? 'Global' : `${icao} ${AIRPORT_NAME[icao] ?? ''}`.trim()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Available charts grouped by category, collapsible */}
          <div className="grid gap-2" data-testid="chart-categories">
            {CHART_CATEGORIES.map((cat) => (
              grouped[cat].length > 0 && (
                <CategoryGroup
                  key={cat}
                  category={cat}
                  charts={grouped[cat]}
                  selected={selected}
                  onSelect={setSelected}
                  highlightName={null}
                />
              )
            ))}
          </div>

          {/* Chart image (collapsible, resizable, zoomable) */}
          <Collapsible open={imageOpen} onOpenChange={setImageOpen}>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <button type="button" className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground" data-testid="button-chart-image-toggle">
                  Chart image <ChevronDown className={`h-3 w-3 transition-transform ${imageOpen ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))} aria-label="Zoom out" data-testid="button-chart-zoom-out"><ZoomOut className="h-3.5 w-3.5" /></Button>
                <span className="min-w-[2.5rem] text-center font-mono text-[11px] text-muted-foreground" data-testid="text-chart-zoom">{Math.round(zoom * 100)}%</span>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} aria-label="Zoom in" data-testid="button-chart-zoom-in"><ZoomIn className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            <CollapsibleContent>
              {selected ? (
                <div
                  className="mt-1 resize-y overflow-auto rounded-md border border-border bg-black/40"
                  style={{ height: 360 }}
                  data-testid="chart-image-container"
                >
                  {/* The inner width grows with zoom so the scroll area crops
                      and pans the enlarged image instead of merely repainting. */}
                  <div style={{ width: `${zoom * 100}%`, transition: 'width 120ms ease-out' }}>
                    <img
                      src={selected.file}
                      alt={selected.name}
                      className="w-full cursor-zoom-in object-contain"
                      onClick={() => setEnlarged(true)}
                      draggable={false}
                      data-testid="chart-image"
                    />
                  </div>
                </div>
              ) : (
                <p className="mt-1 rounded-md border border-dashed border-border bg-secondary/20 p-3 text-xs text-muted-foreground">Select a chart above to display it here.</p>
              )}
            </CollapsibleContent>
          </Collapsible>

          {enlarged && selected && (
            <div className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-black/85 p-4" onClick={() => setEnlarged(false)} data-testid="chart-image-enlarged">
              <img src={selected.file} alt={selected.name} className="max-h-[95vh] max-w-[95vw] object-contain" draggable={false} />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function CategoryGroup({
  category, charts, selected, onSelect, highlightName,
}: {
  category: ChartCategory;
  charts: ChartEntry[];
  selected: ChartEntry | null;
  onSelect: (c: ChartEntry) => void;
  highlightName: string | null;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button type="button" className="flex w-full items-center justify-between rounded bg-secondary/40 px-2 py-1 font-mono text-[11px] uppercase tracking-widest text-primary/90" data-testid={`chart-group-${category}`}>
          <span>{category} ({charts.length})</span>
          <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 grid gap-1">
          {charts.map((c) => {
            const isHighlight = highlightName && c.name.toUpperCase() === highlightName.toUpperCase();
            const isSelected = selected?.file === c.file && selected?.name === c.name;
            return (
              <button
                key={`${c.airport}-${c.name}-${c.file}`}
                type="button"
                onClick={() => onSelect(c)}
                className={`rounded border px-2 py-1 text-left font-mono text-xs ${
                  isSelected ? 'border-primary bg-primary/10 text-primary'
                  : isHighlight ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                  : 'border-border hover:bg-secondary'
                }`}
                data-testid={`chart-item-${c.name}`}
              >
                {c.name}{isHighlight ? ' ★' : ''}
              </button>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
