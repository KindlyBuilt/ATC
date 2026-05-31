import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DEFAULT_AIRPORTS } from '@/data/airports';
import { getAltimeterSetting } from '@/data/altimeter';
import { randomSquawk } from '@/lib/squawk';
import { Gauge, RefreshCw } from 'lucide-react';

const AIRPORTS = DEFAULT_AIRPORTS.filter((a) => !a.notForAtis);

export function AirportSettings() {
  const [airport, setAirport] = useState('KLSX');
  const [squawk, setSquawk] = useState(() => randomSquawk());
  const [history, setHistory] = useState<string[]>([]);

  const altimeter = useMemo(() => getAltimeterSetting(airport), [airport]);

  function reloadSquawk() {
    setHistory((items) => [squawk, ...items.filter((item) => item !== squawk)].slice(0, 5));
    setSquawk(randomSquawk());
  }

  return (
    <Card data-testid="card-airport-settings">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="h-4 w-4 text-primary" />
          Airport Settings
        </CardTitle>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          QNH & Squawk
        </span>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Airfield
          </Label>
          <Select value={airport} onValueChange={setAirport}>
            <SelectTrigger data-testid="select-settings-airport">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AIRPORTS.map((a) => (
                <SelectItem key={a.icao} value={a.icao} data-testid={`option-settings-airport-${a.icao}`}>
                  <span className="font-mono">{a.icao}</span>{' '}
                  <span className="text-muted-foreground">{a.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border border-border bg-background/60 p-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Altimeter / QNH
          </div>
          <div className="mt-1 font-mono text-sm font-semibold text-foreground" data-testid="text-settings-altimeter">
            {altimeter || 'No value saved'}
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
      </CardContent>
    </Card>
  );
}
