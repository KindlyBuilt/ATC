import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DEFAULT_AIRPORTS, getAirport } from '@/data/airports';
import { getRunways } from '@/data/runways';
import { pickBestSid, resolveCoord, type Sid } from '@/data/sids';
import { Route, Eye, EyeOff, RotateCcw, Navigation } from 'lucide-react';

const NONE = '__none__';
const CHART_W = 2000;
const CHART_H = 1719;
const CHART_SRC = './SAFS_Navaids.jpeg';

const AIRPORTS_WITH_RUNWAYS = DEFAULT_AIRPORTS.filter(
  (a) => !a.notForAtis && getRunways(a.icao).length > 0,
);
const AIRPORTS_FOR_ARRIVAL = DEFAULT_AIRPORTS.filter((a) => !a.notForAtis);

export interface GeneratedSid {
  departure: string;
  runway: string;
  arrival: string;
  sid: Sid;
}

interface SidGeneratorProps {
  generated?: GeneratedSid;
  onGeneratedChange: (g: GeneratedSid | undefined) => void;
}

interface RoutePoint {
  x: number;
  y: number;
  label: string;
  kind: 'dep' | 'wp' | 'arr';
}

export function SidGenerator({ generated, onGeneratedChange }: SidGeneratorProps) {
  const [dep, setDep] = useState('');
  const [runway, setRunway] = useState('');
  const [arr, setArr] = useState(NONE);
  const [showImage, setShowImage] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const runways = useMemo(() => (dep ? getRunways(dep) : []), [dep]);

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
    if (arr === NONE) {
      setMessage('Choose an arrival airport.');
      return;
    }
    const sid = pickBestSid(dep, runway, arr);
    if (!sid) {
      onGeneratedChange(undefined);
      setMessage(`No SID available for ${dep} runway ${runway}.`);
      return;
    }
    onGeneratedChange({ departure: dep, runway, arrival: arr, sid });
    setMessage(null);
  }

  function reset() {
    setDep('');
    setRunway('');
    setArr(NONE);
    setShowImage(true);
    onGeneratedChange(undefined);
    setMessage(null);
  }

  // Build the route points from the currently displayed generated SID.
  const route: RoutePoint[] | null = useMemo(() => {
    if (!generated) return null;
    const depAp = getAirport(generated.departure);
    const arrAp = getAirport(generated.arrival);
    if (!depAp?.x || !depAp?.y || !arrAp?.x || !arrAp?.y) return null;
    const points: RoutePoint[] = [];
    points.push({ x: depAp.x, y: depAp.y, label: depAp.icao, kind: 'dep' });
    for (const name of generated.sid.waypoints) {
      const c = resolveCoord(name);
      if (c) points.push({ x: c.x, y: c.y, label: name, kind: 'wp' });
    }
    points.push({ x: arrAp.x, y: arrAp.y, label: arrAp.icao, kind: 'arr' });
    return points;
  }, [generated]);

  return (
    <Card data-testid="card-sid">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Route className="h-4 w-4 text-primary" />
          SID Generator
        </CardTitle>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Beta
        </span>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Departure">
            <Select value={dep || NONE} onValueChange={(v) => v !== NONE && changeDep(v)}>
              <SelectTrigger data-testid="select-sid-dep"><SelectValue placeholder="Select departure" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE} disabled>Select departure</SelectItem>
                {AIRPORTS_WITH_RUNWAYS.map((a) => (
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
          <Field label="Arrival">
            <Select value={arr} onValueChange={setArr}>
              <SelectTrigger data-testid="select-sid-arr">
                <SelectValue placeholder="Select arrival" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE} disabled>Select arrival</SelectItem>
                {AIRPORTS_FOR_ARRIVAL.map((a) => (
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
                {generated.departure} Rwy {generated.runway} → {generated.arrival}
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
      </CardContent>
    </Card>
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
