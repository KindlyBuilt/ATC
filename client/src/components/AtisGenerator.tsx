import { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboard } from '@/lib/clipboard';
import { DEFAULT_AIRPORTS, PHONETIC, type Airport } from '@/data/airports';
import { getAltimeterSetting } from '@/data/altimeter';
import { getAtisRunways } from '@/data/runways';
import { buildAtisCopyText } from '@/lib/atisFormat';
import { pickRunwayByWind } from '@/lib/wind';
import { useAppState } from '@/lib/appState';
import { SectionCard } from '@/components/SectionCard';
import { RunwaySelect } from '@/components/RunwaySelect';
import { Radio, Copy, Plus } from 'lucide-react';

const STATIONS = ['Tower', 'Ground', 'Approach', 'Delivery', 'LS Center', 'PA Center', 'SA Center'] as const;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface AtisFields {
  airportIcao: string;
  station: string;
  letter: string;
  tempC: string;
  qnh: string;
  visibility: string;
  cloudHeight: string;
  windDir: string;
  windSpeed: string;
  depRunway: string;
  arrRunway: string;
  notam: string;
  pdcAvailable: boolean;
}

export interface AtisContext {
  airportIcao: string;
  station: string;
  letter: string;
  qnh: string;
  windDir: string;
  windSpeed: string;
}

// Build the ATIS body as an array of lines. The copy helper colour-codes them.
function buildAtisLines(f: AtisFields, airport?: Airport): string[] {
  const apt = airport?.name ?? f.airportIcao;
  const letter = f.letter || 'A';
  const phon = PHONETIC[letter] ?? letter;
  const wind = f.windDir && f.windSpeed
    ? `${f.windDir.padStart(3, '0')} AT ${f.windSpeed}KT`
    : '---';
  const dep = f.depRunway || '--';
  const arr = f.arrRunway || '--';
  const clouds = f.cloudHeight.trim()
    ? `CLOUDS ${f.cloudHeight.trim().toUpperCase()}.`
    : 'SKY CONDITION CLEAR.';

  const lines = [
    `${apt.toUpperCase()} ATIS INFORMATION ${phon} ${zuluNow()}.`,
    `WIND ${wind}. VISIBILITY ${f.visibility || '10SM'}. ${clouds}`,
    `TEMPERATURE ${f.tempC || '--'}C. ${f.qnh ? f.qnh.toUpperCase() : 'ALTIMETER --'}.`,
    `DEPARTING RUNWAY ${dep}. LANDING RUNWAY ${arr}.`,
  ];
  if (f.pdcAvailable) {
    lines.push('PDC CLEARANCE AVAILABLE VIA TEXT CHAT, REQUEST IFR CLEARANCE AS NORMAL.');
  }
  if (f.notam) lines.push(`NOTAM: ${f.notam.toUpperCase()}`);
  lines.push(`ADVISE ON INITIAL CONTACT YOU HAVE INFORMATION ${phon}.`);
  return lines.filter(Boolean);
}

function pad2(n: number) { return n.toString().padStart(2, '0'); }
function zuluNow() {
  const d = new Date();
  return `${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}Z`;
}

interface AtisGeneratorProps {
  onContextChange?: (context: AtisContext) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editMode?: boolean;
  onDelete?: () => void;
  dragHandleProps?: Record<string, unknown>;
}

export function AtisGenerator({
  onContextChange,
  open: openProp,
  onOpenChange,
  editMode,
  onDelete,
  dragHandleProps,
}: AtisGeneratorProps) {
  const { toast } = useToast();
  const { setRunwayPref, getRunwayPref, setAtisViewer, atisViewer } = useAppState();
  const [airports, setAirports] = useState<Airport[]>(DEFAULT_AIRPORTS.filter((a) => !a.notForAtis));
  const [showAdd, setShowAdd] = useState(false);
  const [internalOpen, setInternalOpen] = useState(true);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [newIcao, setNewIcao] = useState('');
  const [newName, setNewName] = useState('');

  const [f, setF] = useState<AtisFields>({
    airportIcao: 'KLSX',
    station: '',
    letter: 'A',
    tempC: '',
    qnh: '',
    visibility: '',
    cloudHeight: '',
    windDir: '',
    windSpeed: '',
    depRunway: '',
    arrRunway: '',
    notam: '',
    pdcAvailable: false,
  });

  const airport = useMemo(
    () => airports.find((a) => a.icao === f.airportIcao),
    [airports, f.airportIcao],
  );
  const lines = useMemo(() => buildAtisLines(f, airport), [f, airport]);
  const preview = useMemo(() => lines.join('\n'), [lines]);

  const runwayOptions = useMemo(() => getAtisRunways(f.airportIcao), [f.airportIcao]);
  const windDirNum = f.windDir ? parseInt(f.windDir, 10) : null;
  const windSpeedNum = f.windSpeed ? parseInt(f.windSpeed, 10) : null;
  const windPick = useMemo(
    () => pickRunwayByWind(runwayOptions, windDirNum, windSpeedNum),
    [runwayOptions, windDirNum, windSpeedNum],
  );

  useEffect(() => {
    const setting = getAltimeterSetting(f.airportIcao);
    if (!setting) return;
    setF((p) => (p.qnh === setting ? p : { ...p, qnh: setting }));
  }, [f.airportIcao]);

  // When airport changes, seed runways from any synced pref (Mass ATIS priority).
  useEffect(() => {
    const pref = getRunwayPref(f.airportIcao);
    if (pref) {
      setF((p) => ({ ...p, depRunway: pref.dep, arrRunway: pref.arr }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.airportIcao]);

  // Auto-select highest-headwind runway when wind is entered and no runway set.
  useEffect(() => {
    if (!windPick) return;
    setF((p) => {
      if (p.depRunway && p.arrRunway) return p;
      return {
        ...p,
        depRunway: p.depRunway || windPick.best,
        arrRunway: p.arrRunway || windPick.best,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windPick?.best]);

  useEffect(() => {
    onContextChange?.({
      airportIcao: f.airportIcao,
      station: f.station,
      letter: f.letter,
      qnh: f.qnh,
      windDir: f.windDir,
      windSpeed: f.windSpeed,
    });
  }, [f.airportIcao, f.station, f.letter, f.qnh, f.windDir, f.windSpeed, onContextChange]);

  function update<K extends keyof AtisFields>(k: K, v: AtisFields[K]) {
    setF((p) => ({ ...p, [k]: v }));
  }

  async function generate() {
    const text = buildAtisCopyText(f.airportIcao, buildAtisLines(f, airport));
    const ok = await copyToClipboard(text);
    // Sync runway preference (home priority — Mass ATIS wins if it set one).
    if (f.depRunway || f.arrRunway) {
      setRunwayPref(f.airportIcao, f.depRunway, f.arrRunway, 'home');
    }
    // Feed the ATIS viewer.
    const entry = {
      icao: f.airportIcao,
      letter: f.letter,
      qnh: f.qnh,
      depRunway: f.depRunway || '--',
      arrRunway: f.arrRunway || '--',
      windDir: f.windDir,
      windSpeed: f.windSpeed,
    };
    setAtisViewer([
      ...atisViewer.filter((e) => e.icao !== f.airportIcao),
      entry,
    ]);
    toast({
      title: ok ? 'ATIS copied' : 'Copy failed',
      description: ok
        ? `Information ${PHONETIC[f.letter] ?? f.letter} placed on clipboard (colour-coded).`
        : 'Could not access clipboard. Select and copy the preview manually.',
      variant: ok ? 'default' : 'destructive',
    });
  }

  function addAirport() {
    const icao = newIcao.trim().toUpperCase();
    const name = newName.trim();
    if (!icao || !name) return;
    if (airports.some((a) => a.icao === icao)) {
      toast({ title: 'Already in list', description: `${icao} is already present.` });
      return;
    }
    setAirports((p) => [...p, { icao, name }]);
    update('airportIcao', icao);
    setNewIcao('');
    setNewName('');
    setShowAdd(false);
  }

  // Custom single/multi runway field built inline (uses runwayOptions + wind).
  return (
    <SectionCard
      title="Detailed ATIS Generator"
      icon={<Radio className="h-4 w-4 text-primary" />}
      hint="Home ATIS"
      open={open}
      onOpenChange={setOpen}
      testId="card-atis"
      editMode={editMode}
      onDelete={onDelete}
      dragHandleProps={dragHandleProps}
    >
      <p className="rounded-md border border-dashed border-border bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
        Use Mass ATIS generator for autofill across the site.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Airport">
          <div className="flex gap-2">
            <Select value={f.airportIcao} onValueChange={(v) => update('airportIcao', v)}>
              <SelectTrigger data-testid="select-atis-airport"><SelectValue /></SelectTrigger>
              <SelectContent>
                {airports.map((a) => (
                  <SelectItem key={a.icao} value={a.icao} data-testid={`option-airport-${a.icao}`}>
                    <span className="font-mono">{a.icao}</span> <span className="text-muted-foreground">{a.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowAdd((s) => !s)}
              aria-label="Add airport"
              data-testid="button-add-airport"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </Field>
        <Field label="Station">
          <Select value={f.station} onValueChange={(v) => update('station', v)}>
            <SelectTrigger data-testid="select-atis-station"><SelectValue placeholder="Select station" /></SelectTrigger>
            <SelectContent>
              {STATIONS.map((s) => (
                <SelectItem key={s} value={s} data-testid={`option-station-${s}`}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {showAdd && (
        <div className="grid gap-2 rounded-md border border-dashed border-border bg-secondary/40 p-3 sm:grid-cols-[110px_1fr_auto]" data-testid="form-add-airport">
          <Input
            placeholder="ICAO"
            value={newIcao}
            onChange={(e) => setNewIcao(e.target.value.toUpperCase())}
            maxLength={4}
            className="font-mono uppercase"
            data-testid="input-new-airport-icao"
          />
          <Input
            placeholder="Airport name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            data-testid="input-new-airport-name"
          />
          <Button onClick={addAirport} variant="secondary" data-testid="button-confirm-add-airport">Add</Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Info letter">
          <Select value={f.letter} onValueChange={(v) => update('letter', v)}>
            <SelectTrigger data-testid="select-atis-letter"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              {LETTERS.map((l) => (
                <SelectItem key={l} value={l} data-testid={`option-letter-${l}`}>{l} — {PHONETIC[l]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Temp °C">
          <Input value={f.tempC} onChange={(e) => update('tempC', e.target.value)} className="font-mono" data-testid="input-atis-temp" />
        </Field>
        <Field label="QNH / Altimeter" className="sm:col-span-2">
          <Input value={f.qnh} onChange={(e) => update('qnh', e.target.value)} className="font-mono" data-testid="input-atis-qnh" />
        </Field>
        <Field label="Visibility">
          <Input value={f.visibility} onChange={(e) => update('visibility', e.target.value)} className="font-mono" data-testid="input-atis-visibility" />
        </Field>
        <Field label="Cloud height">
          <Input
            value={f.cloudHeight}
            onChange={(e) => update('cloudHeight', e.target.value)}
            placeholder="e.g. 2500 BKN"
            className="font-mono uppercase"
            data-testid="input-atis-cloud-height"
          />
        </Field>
        <Field label="Wind dir (°)">
          <Input value={f.windDir} onChange={(e) => update('windDir', e.target.value)} className="font-mono" data-testid="input-atis-wind-dir" />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Wind speed (kt)">
          <Input value={f.windSpeed} onChange={(e) => update('windSpeed', e.target.value)} className="font-mono" data-testid="input-atis-wind-speed" />
        </Field>
        <Field label="Departure runway">
          <RunwayField
            options={runwayOptions}
            value={f.depRunway}
            onChange={(v) => update('depRunway', v)}
            windDir={windDirNum}
            windSpeed={windSpeedNum}
            best={windPick?.best}
            testId="select-atis-dep-runway"
          />
        </Field>
        <Field label="Arrival runway">
          <RunwayField
            options={runwayOptions}
            value={f.arrRunway}
            onChange={(v) => update('arrRunway', v)}
            windDir={windDirNum}
            windSpeed={windSpeedNum}
            best={windPick?.best}
            testId="select-atis-arr-runway"
          />
        </Field>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm" data-testid="checkbox-atis-pdc-label">
        <Checkbox checked={f.pdcAvailable} onCheckedChange={(c) => update('pdcAvailable', !!c)} data-testid="checkbox-atis-pdc" />
        PDC Clearances available
      </label>

      <Field label="NOTAM / remarks">
        <Textarea
          rows={2}
          placeholder="Optional. e.g. TWY B CLOSED BETWEEN B4 AND B6."
          value={f.notam}
          onChange={(e) => update('notam', e.target.value)}
          data-testid="input-atis-notam"
        />
      </Field>

      <div className="rounded-md border border-border bg-background/60 p-3" data-testid="text-atis-preview">
        <div className="mb-1 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Preview</span>
        </div>
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/90">
{preview}
        </pre>
      </div>

      <Button
        onClick={generate}
        className="w-full bg-emerald-500 text-emerald-950 hover:bg-emerald-400 focus-visible:ring-emerald-400"
        data-testid="button-generate-atis"
      >
        <Copy className="mr-2 h-4 w-4" /> Generate & copy to clipboard
      </Button>
    </SectionCard>
  );
}

// Inline runway field: single Select for <=2 options, multiselect for more,
// with a Custom text option and wind-based "best" highlight.
function RunwayField({
  options, value, onChange, windDir, windSpeed, best, testId,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  windDir: number | null;
  windSpeed: number | null;
  best?: string;
  testId: string;
}) {
  return (
    <RunwaySelect
      options={options}
      value={value}
      onChange={onChange}
      windDir={windDir}
      windSpeed={windSpeed}
      bestRunway={best}
      testId={testId}
    />
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid gap-1.5 ${className}`}>
      <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
