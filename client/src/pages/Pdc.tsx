// PDC / Route Generator page.
//
// Generates a SID + enroute + STAR routing and produces ATC-coordination and
// full PDC clearance text. Includes an editable route panel and a chart map
// plotting SID (purple solid), enroute (blue dashed), STAR (green solid).
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboard } from '@/lib/clipboard';
import { DEFAULT_AIRPORTS, getAirport } from '@/data/airports';
import { getAtisRunways } from '@/data/runways';
import { getAltimeterSetting } from '@/data/altimeter';
import { SIDS, resolveCoord, getSidsFor } from '@/data/sids';
import { STARS, getStarsFor } from '@/data/stars';
import { normalizeRunwayForData } from '@/data/runways';
import { spokenCallsign } from '@/data/airlines';
import { useAppState } from '@/lib/appState';
import {
  generateRoute, formatAtcText, formatPdcTextColoured, type GeneratedRoute,
} from '@/lib/route';
import { Radio, Copy, Navigation, RotateCcw, ExternalLink, FileText } from 'lucide-react';

const NONE = '__none__';
const NEW_CS = '__new__';
const CHART_W = 2000;
const CHART_H = 1719;
const CHART_SRC = './SAFS_Navaids.jpeg';

export default function PdcPage() {
  const { toast } = useToast();
  const { savedCallsigns, addSavedCallsign, getRunwayPref, noteAircraftFromCopy } = useAppState();

  const [callsignSel, setCallsignSel] = useState(NEW_CS);
  const [callsign, setCallsign] = useState('');
  const [dep, setDep] = useState('KLSX');
  const [depRwy, setDepRwy] = useState('');
  const [arr, setArr] = useState('KMDW');
  const [arrRwy, setArrRwy] = useState('');
  const [sidOnly, setSidOnly] = useState(false);
  // When checked, copying ATC coordination OR PDC clearance also writes the
  // exact copied text into the aircraft's Notes block (see noteAircraftFromCopy).
  const [addToNotes, setAddToNotes] = useState(true);

  const depAirports = useMemo(
    () => DEFAULT_AIRPORTS.filter((a) => !a.notForAtis && getAtisRunways(a.icao).length > 0),
    [],
  );
  const arrAirports = useMemo(
    () => DEFAULT_AIRPORTS.filter((a) => !a.notForAtis),
    [],
  );
  const depRunways = useMemo(() => getAtisRunways(dep), [dep]);
  const arrRunways = useMemo(() => getAtisRunways(arr), [arr]);

  // Seed runways from synced prefs when airports change.
  useEffect(() => {
    const pref = getRunwayPref(dep);
    if (pref?.dep && getAtisRunways(dep).includes(pref.dep)) setDepRwy(pref.dep);
    else if (!getAtisRunways(dep).includes(depRwy)) setDepRwy('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep]);
  useEffect(() => {
    const pref = getRunwayPref(arr);
    if (pref?.arr && getAtisRunways(arr).includes(pref.arr)) setArrRwy(pref.arr);
    else if (!getAtisRunways(arr).includes(arrRwy)) setArrRwy('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arr]);

  const effectiveCallsign = callsignSel === NEW_CS ? callsign : callsignSel;

  const [route, setRoute] = useState<GeneratedRoute | null>(null);

  // Editable route fields (initialised from the suggested route on generate).
  // SID/STAR are dropdowns of the procedures available for the dep/arr runway;
  // enroute stays free text.
  const [editSid, setEditSid] = useState('');
  const [editEnroute, setEditEnroute] = useState('');
  const [editStar, setEditStar] = useState('');

  // Available SIDs/STARs for the selected dep/arr runway (drives the dropdowns).
  const availableSids = useMemo(
    () => (depRwy ? getSidsFor(dep, normalizeRunwayForData(dep, depRwy)) : []),
    [dep, depRwy],
  );
  const availableStars = useMemo(
    () => (arrRwy ? getStarsFor(arr, normalizeRunwayForData(arr, arrRwy)) : []),
    [arr, arrRwy],
  );

  function handleGenerate() {
    if (!depRwy || (!sidOnly && !arrRwy)) {
      toast({ title: 'Runways required', description: 'Choose departure and arrival runways.', variant: 'destructive' });
      return;
    }
    const r = generateRoute({
      callsign: effectiveCallsign,
      departure: dep,
      depRunway: depRwy,
      arrival: arr,
      arrRunway: arrRwy,
      sidOnly,
    });
    setRoute(r);
    setEditSid(r.sid?.name ?? '');
    setEditEnroute(r.enroute.join(' '));
    setEditStar(r.star?.name ?? '');
    if (callsignSel === NEW_CS && callsign.trim()) addSavedCallsign(callsign);
  }

  function reset() {
    setRoute(null);
    setEditSid(''); setEditEnroute(''); setEditStar('');
  }

  const altimeter = getAltimeterSetting(dep);

  // Suggested-route output texts.
  const suggested = route && {
    callsign: route.callsign,
    departure: route.departure,
    depRunway: route.depRunway,
    arrival: route.arrival,
    arrRunway: route.arrRunway,
    sidName: route.sid?.name ?? '',
    enroute: route.enroute,
    starName: route.star?.name ?? '',
    sidOnly: route.sidOnly,
  };

  // Edited-route output (uses the editable fields, does NOT change suggested).
  const edited = route && {
    callsign: route.callsign,
    departure: route.departure,
    depRunway: route.depRunway,
    arrival: route.arrival,
    arrRunway: route.arrRunway,
    sidName: editSid.trim().toUpperCase(),
    enroute: editEnroute.trim().split(/\s+/).filter(Boolean).map((w) => w.toUpperCase()),
    starName: editStar.trim().toUpperCase(),
    sidOnly: route.sidOnly,
  };

  async function copyText(text: string, label: string) {
    const ok = await copyToClipboard(text);
    toast({ title: ok ? `${label} copied` : 'Copy failed', description: ok ? text.split('\n')[0] : 'Clipboard unavailable.', variant: ok ? 'default' : 'destructive' });
    return ok;
  }

  // Copy + optionally drop the route's ATC coordination text into the aircraft's
  // notes. For PDC-clearance copies, the user asked Notes to receive the matching
  // ATC coordination text (suggested or edited), not the long /atc PDC body.
  async function copyAndMaybeNote(text: string, label: string, noteText = text) {
    const ok = await copyText(text, label);
    if (ok && addToNotes) {
      const cs = effectiveCallsign.trim().toUpperCase();
      if (cs) noteAircraftFromCopy(cs, spokenCallsign(cs), noteText);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight">PDC Route Generator</h1>
      </div>

      {/* Info panel */}
      <Card className="mb-5">
        <CardContent className="grid gap-2 p-4 text-sm text-muted-foreground">
          <p>
            Pre Determined Clearance (PDC) allows you to give a full routing from Departure to Arrival realistically,
            instead of a normal IFR clearance you can use a PDC instead. Tell pilot in voice/text to check chat for PDC
            after they request IFR clearance, then paste the routing in chat. In the real world a PDC is delivered
            digitally over text via ACARS.
          </p>
          <p className="text-foreground/80">"SID only routing" recommended if CTR/APP is offline.</p>
          <div className="flex flex-wrap gap-3">
            <a className="inline-flex items-center gap-1 text-primary hover:underline" href="https://skybrary.aero/articles/pre-departure-clearance-pdc" target="_blank" rel="noopener noreferrer" data-testid="link-skybrary">
              Skybrary <ExternalLink className="h-3 w-3" />
            </a>
            <a className="inline-flex items-center gap-1 text-primary hover:underline" href="https://docs.vatsim.uk/General/Use%20of%20Software/Issuing%20PDC/" target="_blank" rel="noopener noreferrer" data-testid="link-vatsim">
              VATSIM UK <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Inputs */}
        <Card data-testid="card-pdc-inputs">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Navigation className="h-4 w-4 text-primary" /> Route Inputs
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Callsign">
                <Select value={callsignSel} onValueChange={setCallsignSel}>
                  <SelectTrigger data-testid="select-pdc-callsign"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NEW_CS}>New callsign…</SelectItem>
                    {savedCallsigns.map((cs) => (
                      <SelectItem key={cs} value={cs}>{cs}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {callsignSel === NEW_CS && (
                <Field label="New callsign">
                  <Input value={callsign} onChange={(e) => setCallsign(e.target.value.toUpperCase())} placeholder="e.g. BAW123" className="font-mono uppercase" data-testid="input-pdc-callsign" />
                </Field>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Departure airport">
                <Select value={dep} onValueChange={setDep}>
                  <SelectTrigger data-testid="select-pdc-dep"><SelectValue /></SelectTrigger>
                  <SelectContent>{depAirports.map((a) => <SelectItem key={a.icao} value={a.icao}>{a.icao} {a.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Departure runway">
                <Select value={depRwy || NONE} onValueChange={(v) => setDepRwy(v === NONE ? '' : v)}>
                  <SelectTrigger data-testid="select-pdc-dep-rwy"><SelectValue placeholder="Select runway" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE} disabled>Select runway</SelectItem>
                    {depRunways.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Arrival airport">
                <Select value={arr} onValueChange={setArr}>
                  <SelectTrigger data-testid="select-pdc-arr"><SelectValue /></SelectTrigger>
                  <SelectContent>{arrAirports.map((a) => <SelectItem key={a.icao} value={a.icao}>{a.icao} {a.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Arrival runway">
                <Select value={arrRwy || NONE} onValueChange={(v) => setArrRwy(v === NONE ? '' : v)} disabled={sidOnly}>
                  <SelectTrigger data-testid="select-pdc-arr-rwy"><SelectValue placeholder="Select runway" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE} disabled>Select runway</SelectItem>
                    {arrRunways.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm" data-testid="checkbox-pdc-sidonly-label">
                <Checkbox checked={sidOnly} onCheckedChange={(c) => setSidOnly(!!c)} data-testid="checkbox-pdc-sidonly" />
                SID only routing
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm" data-testid="checkbox-pdc-addnotes-label">
                <Checkbox checked={addToNotes} onCheckedChange={(c) => setAddToNotes(!!c)} data-testid="checkbox-pdc-addnotes" />
                Add to Notes when Copied
              </label>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleGenerate} className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400" data-testid="button-pdc-generate">
                <Navigation className="mr-2 h-4 w-4" /> Generate route
              </Button>
              <Button variant="outline" onClick={reset} data-testid="button-pdc-reset">
                <RotateCcw className="mr-2 h-4 w-4" /> Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Suggested + Edited outputs */}
        <Card data-testid="card-pdc-output">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" /> Suggested Routing
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {!route || !suggested ? (
              <p className="text-sm text-muted-foreground" data-testid="hint-pdc-output">Generate a route to see the suggested routing.</p>
            ) : (
              <>
                <RouteChips
                  dep={`${route.departure}/${route.depRunway} ${suggested.sidName || 'NO SID'}`}
                  enroute={route.sidOnly ? [] : route.enroute}
                  arr={route.sidOnly ? `inbound ${route.arrival}` : `${suggested.starName || 'NO STAR'} ${route.arrival}/${route.arrRunway}`}
                />
                <OutputBlock label="ATC coordination text" text={formatAtcText(suggested)} onCopy={() => copyAndMaybeNote(formatAtcText(suggested), 'ATC coordination')} testId="pdc-atc" />
                <OutputBlock label="PDC clearance" text={formatPdcTextColoured({ ...suggested, altimeter })} onCopy={() => copyAndMaybeNote(formatPdcTextColoured({ ...suggested, altimeter }), 'PDC clearance', formatAtcText(suggested))} testId="pdc-full" multiline />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit route */}
      {route && edited && (
        <Card className="mt-5" data-testid="card-pdc-edit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Edit Route</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-xs text-muted-foreground">Pick a different SID/STAR to update the edited route and the map. Enroute waypoints are free text. The suggested routing above is unchanged.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="SID">
                <Select value={editSid || NONE} onValueChange={(v) => setEditSid(v === NONE ? '' : v)}>
                  <SelectTrigger data-testid="select-edit-sid"><SelectValue placeholder="SID" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {availableSids.map((s) => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Enroute waypoints (space separated)"><Input value={editEnroute} onChange={(e) => setEditEnroute(e.target.value.toUpperCase())} className="font-mono uppercase" data-testid="input-edit-enroute" /></Field>
              <Field label="STAR">
                <Select value={editStar || NONE} onValueChange={(v) => setEditStar(v === NONE ? '' : v)} disabled={route.sidOnly}>
                  <SelectTrigger data-testid="select-edit-star"><SelectValue placeholder="STAR" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {availableStars.map((s) => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            {/* Only edited-route copy buttons live here. Suggested routing keeps its own copy buttons above. */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button variant="secondary" size="sm" onClick={() => copyAndMaybeNote(formatAtcText(edited), 'Edited ATC coordination')} data-testid="button-edit-copy-atc"><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Edited ATC Coordination Text</Button>
              <Button variant="secondary" size="sm" onClick={() => copyAndMaybeNote(formatPdcTextColoured({ ...edited, altimeter }), 'Edited PDC', formatAtcText(edited))} data-testid="button-edit-copy-pdc"><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Edited PDC Text</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Map */}
      <div className="mt-5">
        <PdcMap edited={edited} />
      </div>
    </div>
  );
}

function RouteChips({ dep, enroute, arr }: { dep: string; enroute: string[]; arr: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="pdc-route-chips">
      <Chip tone="dep" label="DEP" value={dep} />
      {enroute.length > 0 && <Chip tone="enr" label="ENR" value={enroute.join(' ')} />}
      <Chip tone="arr" label="ARR" value={arr} />
    </div>
  );
}

function Chip({ tone, label, value }: { tone: 'dep' | 'enr' | 'arr'; label: string; value: string }) {
  const cls = tone === 'dep' ? 'border-purple-500/50 bg-purple-500/10 text-purple-200'
    : tone === 'enr' ? 'border-blue-500/50 bg-blue-500/10 text-blue-200'
    : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200';
  return (
    <div className={`rounded-md border px-3 py-1.5 font-mono text-xs ${cls}`}>
      <span className="mr-2 text-[9px] uppercase tracking-widest opacity-70">{label}</span>{value}
    </div>
  );
}

function OutputBlock({ label, text, onCopy, testId, multiline }: { label: string; text: string; onCopy: () => void; testId: string; multiline?: boolean }) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</Label>
        <Button variant="secondary" size="sm" onClick={onCopy} data-testid={`button-copy-${testId}`}><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy</Button>
      </div>
      <pre className={`whitespace-pre-wrap rounded-md border border-border bg-background/60 p-3 font-mono text-xs text-foreground/90 ${multiline ? '' : ''}`} data-testid={`text-${testId}`}>{text}</pre>
    </div>
  );
}

// Map plots dep -> SID (purple) -> enroute (blue dashed) -> STAR (green) using
// the edited route fields. Missing coords are skipped gracefully.
interface MapPoint { x: number; y: number; label: string; }

function PdcMap({ edited }: { edited: ReturnType<typeof Object> | null | any }) {
  const [enlarged, setEnlarged] = useState(false);
  const [show, setShow] = useState(true);

  const segments = useMemo(() => {
    if (!edited) return null;
    const depAp = getAirport(edited.departure);
    const sid = edited.sidName as string;
    const enroute = edited.enroute as string[];
    const star = edited.starName as string;

    // Resolve SID waypoints from the data (by name lookup) — but the edited SID
    // is just a name; we look its waypoints up from the sids dataset.
    const sidWps = resolveSidWaypoints(edited.departure, sid);
    const starWps = resolveStarWaypoints(edited.arrival, star);

    const purple: MapPoint[] = [];
    if (depAp?.x != null && depAp?.y != null) purple.push({ x: depAp.x, y: depAp.y, label: edited.departure });
    sidWps.forEach((w) => { const c = resolveCoord(w); if (c) purple.push({ x: c.x, y: c.y, label: w }); });

    const blue: MapPoint[] = [];
    if (purple.length) blue.push(purple[purple.length - 1]);
    enroute.forEach((w) => { const c = resolveCoord(w); if (c) blue.push({ x: c.x, y: c.y, label: w }); });

    const green: MapPoint[] = [];
    starWps.forEach((w) => { const c = resolveCoord(w); if (c) green.push({ x: c.x, y: c.y, label: w }); });
    const arrAp = getAirport(edited.arrival);
    if (!edited.sidOnly && arrAp?.x != null && arrAp?.y != null) green.push({ x: arrAp.x, y: arrAp.y, label: edited.arrival });

    // Blue should finish at the start of the STAR.
    if (!edited.sidOnly && green.length) blue.push(green[0]);

    return { purple, blue: edited.sidOnly ? [] : blue, green: edited.sidOnly ? [] : green };
  }, [edited]);

  return (
    <Card data-testid="card-pdc-map">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Route Map</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setShow((s) => !s)} data-testid="button-pdc-map-toggle">{show ? 'Hide' : 'Show'}</Button>
      </CardHeader>
      {show && (
        <CardContent className="grid gap-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">SAFS Navaids chart — click / tap to enlarge</span>
            <span className="font-mono text-[10px] text-muted-foreground"><span className="text-purple-300">SID</span> · <span className="text-blue-300">enroute</span> · <span className="text-emerald-300">STAR</span></span>
          </div>
          <div
            className="relative w-full cursor-zoom-in select-none overflow-hidden rounded-md border border-border bg-black/40"
            style={{ aspectRatio: `${CHART_W} / ${CHART_H}` }}
            onClick={() => setEnlarged(true)}
            data-testid="pdc-map-wrapper"
          >
            <MapContents segments={segments} />
          </div>
          {enlarged && (
            <div className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-black/85 p-4" onClick={() => setEnlarged(false)} data-testid="pdc-map-enlarged">
              <div className="relative max-h-[95vh] max-w-[95vw] overflow-hidden rounded-md border border-border bg-black" style={{ aspectRatio: `${CHART_W} / ${CHART_H}`, width: 'min(95vw, calc(95vh * 2000 / 1719))' }}>
                <MapContents segments={segments} />
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function MapContents({ segments }: { segments: { purple: MapPoint[]; blue: MapPoint[]; green: MapPoint[] } | null }) {
  return (
    <>
      <img src={CHART_SRC} alt="SAFS Navaids chart" className="absolute inset-0 h-full w-full object-contain" draggable={false} data-testid="pdc-map-image" />
      {segments && (
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="xMidYMid meet" aria-hidden>
          {renderLeg(segments.purple, '#a855f7', false, 'p')}
          {renderLeg(segments.blue, '#3b82f6', true, 'b')}
          {renderLeg(segments.green, '#22c55e', false, 'g')}
          {[...segments.purple, ...segments.blue, ...segments.green].map((p, i) => (
            <g key={`pt-${i}`}>
              <circle cx={p.x} cy={p.y} r={12} fill="#fff" stroke="#000" strokeWidth={3} />
              <text x={p.x + 20} y={p.y - 14} fill="#fff" stroke="#000" strokeWidth={4} paintOrder="stroke" fontFamily="ui-monospace, monospace" fontWeight={700} fontSize={28}>{p.label}</text>
            </g>
          ))}
        </svg>
      )}
    </>
  );
}

function renderLeg(points: MapPoint[], color: string, dashed: boolean, key: string) {
  return points.slice(0, -1).map((p, i) => {
    const n = points[i + 1];
    return <line key={`${key}-${i}`} x1={p.x} y1={p.y} x2={n.x} y2={n.y} stroke={color} strokeWidth={9} strokeDasharray={dashed ? '22 14' : undefined} strokeLinecap="round" />;
  });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

// Resolve SID/STAR waypoint lists by name for plotting the edited route.
function resolveSidWaypoints(airport: string, name: string): string[] {
  if (!name) return [];
  const match = SIDS.find((s) => s.airport === airport && s.name === name);
  return match?.waypoints ?? [];
}
function resolveStarWaypoints(airport: string, name: string): string[] {
  if (!name) return [];
  const match = STARS.find((s) => s.airport === airport && s.name === name);
  return match?.waypoints ?? [];
}
