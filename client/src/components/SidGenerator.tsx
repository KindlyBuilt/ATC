import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DEFAULT_AIRPORTS, getAirport } from '@/data/airports';
import { getRunways, normalizeRunwayForData } from '@/data/runways';
import { getSidsFor, pickBestSid, resolveCoord, type Sid } from '@/data/sids';
import { useAppState } from '@/lib/appState';
import { SectionCard } from '@/components/SectionCard';
import { Route, Eye, EyeOff, RotateCcw, Navigation } from 'lucide-react';

const NONE = '__none__';
const CHART_W = 2000;
const CHART_H = 1719;
const CHART_SRC = './SAFS_Navaids.jpeg';

export interface GeneratedSid {
  departure: string;
  runway: string;
  arrival: string;
  sid: Sid;
}

interface SidGeneratorProps {
  generated?: GeneratedSid;
  onGeneratedChange: (g: GeneratedSid | undefined) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editMode?: boolean;
  onDelete?: () => void;
  dragHandleProps?: Record<string, unknown>;
}

interface RoutePoint {
  x: number;
  y: number;
  label: string;
  kind: 'dep' | 'wp' | 'arr';
}

export function SidGenerator({
  generated, onGeneratedChange,
  open: openProp, onOpenChange, editMode, onDelete, dragHandleProps,
}: SidGeneratorProps) {
  const { getRunwayPref } = useAppState();
  const [internalOpen, setInternalOpen] = useState(true);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [dep, setDep] = useState('');
  const [runway, setRunway] = useState('');
  const [arr, setArr] = useState(NONE);
  const [showImage, setShowImage] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const airportsWithRunways = useMemo(
    () => DEFAULT_AIRPORTS.filter((a) => !a.notForAtis && getRunways(a.icao).length > 0),
    [],
  );
  const airportsForArrival = useMemo(
    () => DEFAULT_AIRPORTS.filter((a) => !a.notForAtis),
    [],
  );
  const runways = useMemo(() => (dep ? getRunways(dep) : []), [dep]);

  // When a departure is chosen, prefer the synced runway default (normalized
  // from Mass ATIS / Home ATIS) if it applies to this airport.
  useEffect(() => {
    if (!dep) return;
    const pref = getRunwayPref(dep);
    if (!pref?.dep) return;
    const norm = normalizeRunwayForData(dep, pref.dep);
    if (getRunways(dep).includes(norm)) setRunway(norm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep]);

  // Clear runway when departure changes (and the previously chosen runway no
  // longer applies to the new airport).
  useEffect(() => {
    if (runway && !runways.includes(runway)) setRunway('');
  }, [runways, runway]);

  function changeDep(v: string) {
    setDep(v);
    setRunway('');
  }

  function generate() {
    if (!dep || !runway) {
      setMessage('Choose a departure airport and runway first.');
      return;
    }
    // Arrival is optional. With no arrival, pick the first matching SID; with an
    // arrival, pick the SID whose end is closest to the arrival airport.
    const matches = getSidsFor(dep, runway);
    const sid = arr === NONE ? matches[0] : pickBestSid(dep, runway, arr);
    if (!sid) {
      onGeneratedChange(undefined);
      setMessage(`No SID available for ${dep} runway ${runway}.`);
      return;
    }
    onGeneratedChange({ departure: dep, runway, arrival: arr === NONE ? '' : arr, sid });
    setMessage(null);
  }

  function reset() {
    setDep('');
    setRunway('');
    setArr(NONE);
    setShowImage(false);
    onGeneratedChange(undefined);
    setMessage(null);
  }

  // Build the route points from the currently displayed generated SID. Arrival
  // is optional; when absent we just plot dep -> SID waypoints.
  const route: RoutePoint[] | null = useMemo(() => {
    if (!generated) return null;
    const depAp = getAirport(generated.departure);
    if (!depAp?.x || !depAp?.y) return null;
    const points: RoutePoint[] = [];
    points.push({ x: depAp.x, y: depAp.y, label: depAp.icao, kind: 'dep' });
    for (const name of generated.sid.waypoints) {
      const c = resolveCoord(name);
      if (c) points.push({ x: c.x, y: c.y, label: name, kind: 'wp' });
    }
    const arrAp = generated.arrival ? getAirport(generated.arrival) : undefined;
    if (arrAp?.x != null && arrAp?.y != null) {
      points.push({ x: arrAp.x, y: arrAp.y, label: arrAp.icao, kind: 'arr' });
    }
    return points;
  }, [generated]);

  return (
    <SectionCard
      title="SID Generator"
      icon={<Route className="h-4 w-4 text-primary" />}
      hint="Beta"
      open={open}
      onOpenChange={setOpen}
      testId="card-sid"
      editMode={editMode}
      onDelete={onDelete}
      dragHandleProps={dragHandleProps}
    >
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Departure">
            <Select value={dep || NONE} onValueChange={(v) => v !== NONE && changeDep(v)}>
              <SelectTrigger data-testid="select-sid-dep"><SelectValue placeholder="Select departure" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE} disabled>Select departure</SelectItem>
                {airportsWithRunways.map((a) => (
                  <SelectItem key={a.icao} value={a.icao} data-testid={`option-sid-dep-${a.icao}`}>
                    <span className="font-mono">{a.icao}</span>{' '}
                    <span className="text-muted-foreground">{a.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Runway">
            <Select value={runway || NONE} onValueChange={(v) => setRunway(v === NONE ? '' : v)}>
              <SelectTrigger data-testid="select-sid-runway">
                <SelectValue placeholder={runways.length ? 'Select runway' : 'No runways'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE} disabled>Select runway</SelectItem>
                {runways.map((r) => (
                  <SelectItem key={r} value={r} data-testid={`option-sid-rwy-${r}`}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Arrival (optional)">
            <Select value={arr} onValueChange={setArr}>
              <SelectTrigger data-testid="select-sid-arr">
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None (optional)</SelectItem>
                {airportsForArrival.map((a) => (
                  <SelectItem key={a.icao} value={a.icao} data-testid={`option-sid-arr-${a.icao}`}>
                    <span className="font-mono">{a.icao}</span>{' '}
                    <span className="text-muted-foreground">{a.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={generate}
            className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400 focus-visible:ring-emerald-400"
            data-testid="button-generate-sid"
          >
            <Navigation className="mr-2 h-4 w-4" /> Generate SID
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={reset}
            data-testid="button-reset-sid"
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Reset
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowImage((s) => !s)}
            data-testid="button-toggle-sid-image"
          >
            {showImage ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {showImage ? 'Hide image' : 'Show image'}
          </Button>
        </div>

        {/* Result line */}
        <div
          className="rounded-md border border-border bg-background/60 p-3"
          data-testid="sid-result"
        >
          {generated ? (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Selected SID
              </span>
              <span
                className="font-mono text-xl font-bold text-emerald-300"
                data-testid="text-sid-name"
              >
                {generated.sid.name}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {generated.departure} Rwy {generated.runway}{generated.arrival ? ` → ${generated.arrival}` : ''}
              </span>
              <span className="font-mono text-xs text-foreground/80">
                {generated.sid.waypoints.join(' · ')}
              </span>
            </div>
          ) : message ? (
            <p className="text-sm text-amber-300" data-testid="text-sid-message">{message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Pick a departure airport, runway and arrival, then press Generate.
            </p>
          )}
        </div>

        {showImage && (
          <MapView
            route={route}
            depIcao={generated?.departure}
            arrIcao={generated?.arrival}
            sid={generated?.sid}
          />
        )}
    </SectionCard>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

interface MapViewProps {
  route: RoutePoint[] | null;
  depIcao?: string;
  arrIcao?: string;
  sid?: Sid;
}

function MapView({ route }: MapViewProps) {
  const [enlarged, setEnlarged] = useState(false);

  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          SAFS Navaids chart
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          click / tap to enlarge
        </span>
      </div>
      <div
        className="relative w-full cursor-zoom-in select-none overflow-hidden rounded-md border border-border bg-black/40"
        style={{ aspectRatio: `${CHART_W} / ${CHART_H}` }}
        onClick={() => setEnlarged(true)}
        data-testid="sid-map-wrapper"
        role="img"
        aria-label="SAFS Navaids chart with generated SID route"
      >
        <ChartContents route={route} />
      </div>

      {enlarged && (
        <div
          className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-black/85 p-4"
          onClick={() => setEnlarged(false)}
          data-testid="sid-map-enlarged"
        >
          <div
            className="relative max-h-[95vh] max-w-[95vw] overflow-hidden rounded-md border border-border bg-black"
            style={{ aspectRatio: `${CHART_W} / ${CHART_H}`, width: 'min(95vw, calc(95vh * 2000 / 1719))' }}
          >
            <ChartContents route={route} />
          </div>
        </div>
      )}
    </div>
  );
}

function ChartContents({ route }: { route: RoutePoint[] | null }) {
  return (
    <>
      <img
        src={CHART_SRC}
        alt="SAFS Navaids chart"
        className="absolute inset-0 h-full w-full object-contain"
        draggable={false}
        data-testid="sid-map-image"
      />
      {route && route.length >= 2 && (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
          data-testid="sid-map-route"
        >
          {/* Segments */}
          {route.slice(0, -1).map((p, i) => {
            const n = route[i + 1];
            // dep -> first wp dashed blue; last wp -> arr dashed blue;
            // wp -> wp solid purple.
            const isFirst = p.kind === 'dep';
            const isLast = n.kind === 'arr';
            const dashed = isFirst || isLast;
            const color = dashed ? '#3b82f6' : '#a855f7';
            return (
              <line
                key={`seg-${i}`}
                x1={p.x}
                y1={p.y}
                x2={n.x}
                y2={n.y}
                stroke={color}
                strokeWidth={9}
                strokeDasharray={dashed ? '22 14' : undefined}
                strokeLinecap="round"
                data-testid={`sid-map-segment-${i}`}
              />
            );
          })}
          {/* Points */}
          {route.map((p, i) => (
            <g key={`pt-${i}`}>
              <circle
                cx={p.x}
                cy={p.y}
                r={p.kind === 'wp' ? 12 : 16}
                fill={p.kind === 'wp' ? '#a855f7' : '#3b82f6'}
                stroke="#fff"
                strokeWidth={3}
              />
              <text
                x={p.x + 22}
                y={p.y - 16}
                fill="#fff"
                stroke="#000"
                strokeWidth={4}
                paintOrder="stroke"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fontWeight={700}
                fontSize={30}
              >
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      )}
    </>
  );
}
