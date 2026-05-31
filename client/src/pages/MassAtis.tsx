// Mass ATIS Generator — quick ATIS for multiple airports at once, with a
// 30-minute auto-update timer. State is preserved between pages via the page
// staying mounted (App.tsx hides rather than unmounts).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboard } from '@/lib/clipboard';
import { DEFAULT_AIRPORTS, getAirport } from '@/data/airports';
import { getAtisRunways, normalizeRunwayForData } from '@/data/runways';
import { buildAtisCopyText } from '@/lib/atisFormat';
import { useAppState } from '@/lib/appState';
import { RunwaySelect } from '@/components/RunwaySelect';
import { AtisViewer } from '@/components/AtisViewer';
import {
  CENTER_PRESETS, buildMiniAtis, miniAtisLines, nextLetter,
  randomDistinctLetters, randomBaseTemp, type MiniAtis,
} from '@/lib/massAtis';
import { Radio, Copy, Play, RefreshCw, Timer, ChevronDown, Check } from 'lucide-react';

const ATIS_AIRPORTS = DEFAULT_AIRPORTS.filter((a) => !a.notForAtis);
const NONE = '__none__';
const UPDATE_MS = 30 * 60 * 1000; // 30 minutes

export default function MassAtisPage() {
  const { toast } = useToast();
  const { setAtisViewer, setRunwayPref, setAtisUpdateDue } = useAppState();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preset, setPreset] = useState(NONE);
  const [pickerOpen, setPickerOpen] = useState(true);
  const [globalDir, setGlobalDir] = useState('');
  const [globalSpeed, setGlobalSpeed] = useState('');
  const [pdc, setPdc] = useState(false);
  const [singleOps, setSingleOps] = useState(false);
  const [contactLine, setContactLine] = useState('');

  const [atises, setAtises] = useState<MiniAtis[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<number | null>(null);

  function toggleAirport(icao: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(icao)) next.delete(icao); else next.add(icao);
      return next;
    });
  }

  function applyPreset(key: string) {
    setPreset(key);
    if (key === NONE) return;
    const p = CENTER_PRESETS.find((x) => x.key === key);
    if (!p) return;
    const airports = p.key === 'sa' ? ATIS_AIRPORTS.map((a) => a.icao) : p.airports;
    setSelected(new Set(airports));
    setContactLine(p.contact);
  }

  // Generate (or regenerate) the mini ATISs for the selected airports.
  function generate(advanceLetters = false) {
    const dir = parseInt(globalDir, 10);
    const speed = parseInt(globalSpeed, 10);
    const gDir = Number.isNaN(dir) ? 0 : dir;
    const gSpeed = Number.isNaN(speed) ? 0 : speed;
    const baseTemp = randomBaseTemp();
    // Each airport gets its own random info letter (distinct where possible).
    const icaos = Array.from(selected);
    const letters = randomDistinctLetters(icaos.length);

    const list: MiniAtis[] = icaos.map((icao, i) => {
      const prev = atises.find((a) => a.icao === icao);
      const letter = advanceLetters && prev ? nextLetter(prev.letter) : letters[i];
      const m = buildMiniAtis(icao, letter, baseTemp, gDir, gSpeed, singleOps);
      return m;
    });
    setAtises(list);
    setHasGenerated(true);
    setPickerOpen(false);
    syncOut(list);
    startTimer();
    setAtisUpdateDue(false);
  }

  // Sync ATIS viewer + runway prefs (Mass ATIS has priority) to app state.
  function syncOut(list: MiniAtis[]) {
    setAtisViewer(list.map((m) => ({
      icao: m.icao,
      letter: m.letter,
      qnh: m.qnh,
      depRunway: m.depRunway,
      arrRunway: m.arrRunway,
      windDir: m.windDir.toString(),
      windSpeed: m.windSpeed.toString(),
    })));
    list.forEach((m) => {
      // Normalize KLSX 30R -> 30 etc. for SID/PDC consumers.
      const dep = normalizeRunwayForData(m.icao, m.depRunway);
      const arr = normalizeRunwayForData(m.icao, m.arrRunway);
      setRunwayPref(m.icao, dep, arr, 'mass');
    });
  }

  function startTimer() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setSecondsLeft(UPDATE_MS / 1000);
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          // 30 minutes elapsed — notify + auto update.
          setAtisUpdateDue(true);
          toast({ title: 'ATIS update due', description: 'Letters advanced and winds varied automatically.' });
          generate(true);
          return UPDATE_MS / 1000;
        }
        return s - 1;
      });
    }, 1000);
  }

  useEffect(() => () => { if (timerRef.current) window.clearInterval(timerRef.current); }, []);

  function updateMini(icao: string, patch: Partial<MiniAtis>) {
    setAtises((list) => {
      const next = list.map((m) => (m.icao === icao ? { ...m, ...patch, copied: false } : m));
      syncOut(next);
      return next;
    });
  }

  async function copyMini(m: MiniAtis) {
    const ap = getAirport(m.icao);
    const lines = miniAtisLines(m, ap?.name ?? m.icao, pdc, contactLine);
    const ok = await copyToClipboard(buildAtisCopyText(m.icao, lines));
    if (ok) {
      setAtises((list) => list.map((x) => (x.icao === m.icao ? { ...x, copied: true } : x)));
    }
    toast({ title: ok ? `${m.icao} ATIS copied` : 'Copy failed', variant: ok ? 'default' : 'destructive' });
  }

  const mmss = useMemo(() => {
    const mm = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
    const ss = Math.floor(secondsLeft % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }, [secondsLeft]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Radio className="h-5 w-5 text-primary" /> Mass ATIS Generator
        </h1>
        <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
          <p>Useful for CTR controllers to dish out ATIS's quickly.</p>
          <p>Also used to autofill data on other sections such as Text Phrase and Runways.</p>
          <p>Recommend to generate all ATIS's anyway as it works hand in hand with the rest of the website.</p>
        </div>
      </div>

      {/* ATIS Viewer at the top of the page (synced with Home). */}
      <div className="mb-5">
        <AtisViewer columns />
      </div>

      {/* Controls */}
      <Card className="mb-5">
        <CardContent className="grid gap-3 p-4">
          {/* Airport picker (collapsible) */}
          <Collapsible open={pickerOpen} onOpenChange={setPickerOpen}>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <button type="button" className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-primary/90" data-testid="button-mass-picker-toggle">
                  Select airports ({selected.size}) <ChevronDown className={`h-3 w-3 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {ATIS_AIRPORTS.map((a) => (
                  <label key={a.icao} className="flex cursor-pointer items-center gap-2 rounded border border-border bg-secondary/30 px-2 py-1.5 text-sm" data-testid={`checkbox-mass-${a.icao}`}>
                    <Checkbox checked={selected.has(a.icao)} onCheckedChange={() => toggleAirport(a.icao)} />
                    <span className="font-mono">{a.icao}</span>
                  </label>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Preset">
              <Select value={preset} onValueChange={applyPreset}>
                <SelectTrigger data-testid="select-mass-preset"><SelectValue placeholder="Select preset" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {CENTER_PRESETS.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Global wind dir (°)">
              <Input value={globalDir} onChange={(e) => setGlobalDir(e.target.value)} className="font-mono" data-testid="input-mass-wind-dir" />
            </Field>
            <Field label="Global wind speed (kt)">
              <Input value={globalSpeed} onChange={(e) => setGlobalSpeed(e.target.value)} className="font-mono" data-testid="input-mass-wind-speed" />
            </Field>
            <Field label="Options">
              <div className="grid gap-1.5 pt-1.5">
                <label className="flex cursor-pointer items-center gap-2 text-xs"><Checkbox checked={pdc} onCheckedChange={(c) => setPdc(!!c)} data-testid="checkbox-mass-pdc" /> PDC available</label>
                <label className="flex cursor-pointer items-center gap-2 text-xs"><Checkbox checked={singleOps} onCheckedChange={(c) => setSingleOps(!!c)} data-testid="checkbox-mass-singleops" /> KLSX Single RWY Ops</label>
              </div>
            </Field>
          </div>

          <Field label="Final contact line (optional)">
            <Input value={contactLine} onChange={(e) => setContactLine(e.target.value)} placeholder="e.g. Contact Los Santos Center on 130.750 for all clearances" data-testid="input-mass-contact" />
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => generate(false)} disabled={selected.size === 0} className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400" data-testid="button-mass-generate">
              <Play className="mr-2 h-4 w-4" /> Generate
            </Button>
            {hasGenerated && (
              <>
                <Button variant="outline" onClick={() => generate(true)} data-testid="button-mass-update-now">
                  <RefreshCw className="mr-2 h-4 w-4" /> Auto Update now
                </Button>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-3 py-1.5 font-mono text-xs text-muted-foreground" data-testid="text-mass-timer">
                  <Timer className="h-3.5 w-3.5" /> Next update in {mmss}
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mini ATIS sections */}
      {atises.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" data-testid="mass-atis-list">
          {atises.map((m) => (
            <MiniAtisCard key={m.icao} m={m} onChange={(patch) => updateMini(m.icao, patch)} onCopy={() => copyMini(m)} />
          ))}
        </div>
      )}
    </div>
  );
}

function MiniAtisCard({ m, onChange, onCopy }: { m: MiniAtis; onChange: (p: Partial<MiniAtis>) => void; onCopy: () => void }) {
  const runwayOptions = useMemo(() => {
    if (m.icao === 'KLSX') return m.singleRwyOps ? ['12R', '30L'] : ['12L', '12R', '30L', '30R'];
    return getAtisRunways(m.icao);
  }, [m.icao, m.singleRwyOps]);
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <Card data-testid={`mini-atis-${m.icao}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="font-mono text-base">{m.icao}</CardTitle>
        <Button
          size="sm"
          variant={m.copied ? 'default' : 'secondary'}
          className={m.copied ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400' : ''}
          onClick={onCopy}
          data-testid={`button-mini-copy-${m.icao}`}
        >
          {m.copied ? <><Check className="mr-1.5 h-3.5 w-3.5" /> Copied</> : <><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy</>}
        </Button>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="grid grid-cols-2 gap-2">
          <MiniField label="Letter">
            <Select value={m.letter} onValueChange={(v) => onChange({ letter: v })}>
              <SelectTrigger className="h-8" data-testid={`mini-letter-${m.icao}`}><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60">{LETTERS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </MiniField>
          <MiniField label="Temp °C">
            <Input className="h-8 font-mono" value={m.tempC} onChange={(e) => onChange({ tempC: parseInt(e.target.value, 10) || 0 })} data-testid={`mini-temp-${m.icao}`} />
          </MiniField>
          <MiniField label="QNH / Alt (read-only)">
            <div className="flex h-8 items-center rounded-md border border-border bg-background/60 px-2 font-mono text-[11px] text-muted-foreground" data-testid={`mini-qnh-${m.icao}`}>{m.qnh || '—'}</div>
          </MiniField>
          <MiniField label="Visibility">
            <Input className="h-8 font-mono" value={m.visibility} onChange={(e) => onChange({ visibility: e.target.value })} data-testid={`mini-vis-${m.icao}`} />
          </MiniField>
          <MiniField label="Cloud height">
            <Input className="h-8 font-mono uppercase" value={m.cloudHeight} onChange={(e) => onChange({ cloudHeight: e.target.value })} placeholder="e.g. 2500 BKN" data-testid={`mini-cloud-${m.icao}`} />
          </MiniField>
          <div className="grid grid-cols-2 gap-2">
            <MiniField label="Wind °"><Input className="h-8 font-mono" value={m.windDir} onChange={(e) => onChange({ windDir: parseInt(e.target.value, 10) || 0 })} data-testid={`mini-winddir-${m.icao}`} /></MiniField>
            <MiniField label="Spd"><Input className="h-8 font-mono" value={m.windSpeed} onChange={(e) => onChange({ windSpeed: parseInt(e.target.value, 10) || 0 })} data-testid={`mini-windspd-${m.icao}`} /></MiniField>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MiniField label="Dep runway">
            <RunwaySelect options={runwayOptions} value={m.depRunway} onChange={(v) => onChange({ depRunway: v })} windDir={m.windDir} windSpeed={m.windSpeed} testId={`mini-dep-${m.icao}`} />
          </MiniField>
          <MiniField label="Arr runway">
            <RunwaySelect options={runwayOptions} value={m.arrRunway} onChange={(v) => onChange({ arrRunway: v })} windDir={m.windDir} windSpeed={m.windSpeed} testId={`mini-arr-${m.icao}`} />
          </MiniField>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function MiniField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <Label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
