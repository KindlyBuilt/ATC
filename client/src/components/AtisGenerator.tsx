import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboard } from '@/lib/clipboard';
import { DEFAULT_AIRPORTS, PHONETIC, type Airport } from '@/data/airports';
import { getAltimeterSetting } from '@/data/altimeter';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Radio, Copy, Plus, ChevronDown } from 'lucide-react';

const STATIONS = ['Tower', 'Ground', 'Approach', 'Delivery', 'LS Center', 'PA Center', 'SA Center'] as const;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function pad2(n: number) { return n.toString().padStart(2, '0'); }
function zuluNow() {
  const d = new Date();
  return `${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}Z`;
}

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
}

export interface AtisContext {
  airportIcao: string;
  station: string;
  letter: string;
  qnh: string;
  windDir: string;
  windSpeed: string;
}

function buildAtis(f: AtisFields, airport?: Airport): string {
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

  return [
    `${apt.toUpperCase()} ATIS INFORMATION ${phon} ${zuluNow()}.`,
    `WIND ${wind}. VISIBILITY ${f.visibility || '10SM'}. ${clouds}`,
    `TEMPERATURE ${f.tempC || '--'}C. ${f.qnh ? f.qnh.toUpperCase() : 'ALTIMETER --'}.`,
    `DEPARTING RUNWAY ${dep}. LANDING RUNWAY ${arr}.`,
    f.notam ? `NOTAM: ${f.notam.toUpperCase()}` : '',
    `ADVISE ON INITIAL CONTACT YOU HAVE INFORMATION ${phon}.`,
  ].filter(Boolean).join('\n');
}

interface AtisGeneratorProps {
  onContextChange?: (context: AtisContext) => void;
}

export function AtisGenerator({ onContextChange }: AtisGeneratorProps) {
  const { toast } = useToast();
  const [airports, setAirports] = useState<Airport[]>(DEFAULT_AIRPORTS.filter((a) => !a.notForAtis));
  const [showAdd, setShowAdd] = useState(false);
  const [open, setOpen] = useState(true);
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
  });

  const airport = useMemo(
    () => airports.find((a) => a.icao === f.airportIcao),
    [airports, f.airportIcao],
  );
  const preview = useMemo(() => buildAtis(f, airport), [f, airport]);

  useEffect(() => {
    const setting = getAltimeterSetting(f.airportIcao);
    if (!setting) return;
    setF((p) => (p.qnh === setting ? p : { ...p, qnh: setting }));
  }, [f.airportIcao]);

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
    const text = buildAtis(f, airport);
    const copiedText = `/setatis ${f.airportIcao} ${text}`;
    const ok = await copyToClipboard(copiedText);
    toast({
      title: ok ? 'ATIS copied' : 'Copy failed',
      description: ok
        ? `Information ${PHONETIC[f.letter] ?? f.letter} placed on clipboard.`
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

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
    <Card data-testid="card-atis">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Radio className="h-4 w-4 text-primary" />
          ATIS Generator
        </CardTitle>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" data-testid="button-toggle-atis">
            {open ? 'Hide' : 'Show'}
            <ChevronDown className={`ml-1.5 h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
      </CardHeader>
      <CollapsibleContent>
      <CardContent className="grid gap-3">
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
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Wind dir (°)">
            <Input value={f.windDir} onChange={(e) => update('windDir', e.target.value)} className="font-mono" data-testid="input-atis-wind-dir" />
          </Field>
          <Field label="Wind speed (kt)">
            <Input value={f.windSpeed} onChange={(e) => update('windSpeed', e.target.value)} className="font-mono" data-testid="input-atis-wind-speed" />
          </Field>
          <Field label="Departure runway">
            <Input value={f.depRunway} onChange={(e) => update('depRunway', e.target.value)} className="font-mono uppercase" data-testid="input-atis-dep-runway" />
          </Field>
          <Field label="Arrival runway">
            <Input value={f.arrRunway} onChange={(e) => update('arrRunway', e.target.value)} className="font-mono uppercase" data-testid="input-atis-arr-runway" />
          </Field>
        </div>

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
      </CardContent>
      </CollapsibleContent>
    </Card>
    </Collapsible>
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
