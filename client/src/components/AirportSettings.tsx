import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DEFAULT_AIRPORTS } from '@/data/airports';
import { getAltimeterSetting } from '@/data/altimeter';
import { randomSquawk } from '@/lib/squawk';
import { Gauge, RefreshCw } from 'lucide-react';
import { SectionCard } from '@/components/SectionCard';
import { useAppState } from '@/lib/appState';

interface AirportSettingsProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editMode?: boolean;
  onDelete?: () => void;
  dragHandleProps?: Record<string, unknown>;
}

export function AirportSettings({ open: openProp, onOpenChange, editMode, onDelete, dragHandleProps }: AirportSettingsProps = {}) {
  const { atisViewer } = useAppState();
  const [internalOpen, setInternalOpen] = useState(true);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [airport, setAirport] = useState('KLSX');
  const [squawk, setSquawk] = useState(() => randomSquawk());
  const [history, setHistory] = useState<string[]>([]);

  const airports = useMemo(() => DEFAULT_AIRPORTS.filter((a) => !a.notForAtis), []);
  const altimeter = useMemo(() => getAltimeterSetting(airport), [airport]);
  const liveAtis = useMemo(() => atisViewer.find((e) => e.icao === airport), [atisViewer, airport]);
  const roundedWind = useMemo(() => {
    if (!liveAtis?.windDir || !liveAtis.windSpeed) return 'No Mass ATIS wind';
    const dir = parseInt(liveAtis.windDir, 10);
    const rounded = Number.isNaN(dir)
      ? liveAtis.windDir
      : (((Math.round(dir / 10) * 10) % 360 + 360) % 360).toString().padStart(3, '0');
    return `${rounded}/${liveAtis.windSpeed}kt`;
  }, [liveAtis]);
  const runwayText = liveAtis
    ? liveAtis.depRunway === liveAtis.arrRunway
      ? `RWY ${liveAtis.depRunway}`
      : `DEP ${liveAtis.depRunway} / ARR ${liveAtis.arrRunway}`
    : 'No Mass ATIS runway';

  function reloadSquawk() {
    setHistory((items) => [squawk, ...items.filter((item) => item !== squawk)].slice(0, 5));
    setSquawk(randomSquawk());
  }

  return (
    <SectionCard
      title="Airport Information"
      icon={<Gauge className="h-4 w-4 text-primary" />}
      hint="ATIS · QNH · Squawk"
      open={open}
      onOpenChange={setOpen}
      testId="card-airport-settings"
      editMode={editMode}
      onDelete={onDelete}
      dragHandleProps={dragHandleProps}
    >
        <div className="grid gap-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Airfield
          </Label>
          <Select value={airport} onValueChange={setAirport}>
            <SelectTrigger data-testid="select-settings-airport">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {airports.map((a) => (
                <SelectItem key={a.icao} value={a.icao} data-testid={`option-settings-airport-${a.icao}`}>
                  <span className="font-mono">{a.icao}</span>{' '}
                  <span className="text-muted-foreground">{a.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2 rounded-md border border-border bg-background/60 p-3 font-mono text-xs">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            <Info label="ATIS" value={liveAtis ? `Info ${liveAtis.letter}` : 'No Mass ATIS'} testId="text-settings-atis-letter" />
            <Info label="Wind" value={roundedWind} testId="text-settings-wind" />
            <Info label="Runways" value={runwayText} testId="text-settings-runways" wide />
            <Info label="Altimeter / QNH" value={liveAtis?.qnh || altimeter || 'No value saved'} testId="text-settings-altimeter" wide />
          </div>
        </div>

        <div className="rounded-md border border-border bg-background/60 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Random squawk
              </div>
              <div className="mt-1 font-mono text-2xl font-bold text-emerald-300" data-testid="text-random-squawk">
                {squawk}
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={reloadSquawk} data-testid="button-save-reload-squawk">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Save & reload
            </Button>
          </div>
          {history.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5" data-testid="list-squawk-history">
              {history.map((item) => (
                <span
                  key={item}
                  className="rounded border border-border bg-secondary px-2 py-1 font-mono text-[11px] text-muted-foreground"
                >
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>
    </SectionCard>
  );
}

function Info({ label, value, testId, wide }: { label: string; value: string; testId: string; wide?: boolean }) {
  return (
    <div className={`min-w-0 ${wide ? 'col-span-2' : ''}`}>
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="break-words font-semibold leading-snug text-foreground" data-testid={testId}>{value}</div>
    </div>
  );
}
