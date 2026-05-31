import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AIRLINES, lookupAirline, parseCallsign, spokenCallsign } from '@/data/airlines';
import { Search, PlaneTakeoff } from 'lucide-react';

export function AirlineLookup() {
  const [q, setQ] = useState('');
  const trimmed = q.trim().toUpperCase();

  // If user types a full callsign like BAW123, parse it.
  const parsed = useMemo(() => parseCallsign(trimmed), [trimmed]);
  const directLookup = parsed ? lookupAirline(parsed.icao) : lookupAirline(trimmed);
  const spoken = parsed ? spokenCallsign(trimmed) : null;

  const suggestions = useMemo(() => {
    if (!trimmed) return [];
    return Object.entries(AIRLINES)
      .filter(([code, a]) =>
        code.startsWith(trimmed) ||
        a.name.toUpperCase().includes(trimmed) ||
        a.callsign.toUpperCase().includes(trimmed),
      )
      .slice(0, 6);
  }, [trimmed]);

  return (
    <Card data-testid="card-airline">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <PlaneTakeoff className="h-4 w-4 text-primary" />
          Airline Lookup
        </CardTitle>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Beta, Source: Open Flight</span>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Enter ICAO code, callsign, or full flight number
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. BAW or BAW123 or Speedbird"
              className="pl-9 font-mono uppercase"
              autoComplete="off"
              spellCheck={false}
              data-testid="input-airline-query"
            />
          </div>
        </div>

        {directLookup ? (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3" data-testid="result-airline">
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary/80">Match</div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-2xl font-bold text-primary" data-testid="text-airline-icao">
                {parsed?.icao ?? trimmed}
              </span>
              <span className="text-lg font-semibold text-foreground" data-testid="text-airline-name">
                {directLookup.name}
              </span>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              Spoken callsign:{' '}
              <span className="font-mono text-foreground" data-testid="text-airline-callsign">
                {spoken ?? directLookup.callsign}
              </span>
              {directLookup.country && (
                <span className="ml-3 text-xs text-muted-foreground/80">{directLookup.country}</span>
              )}
            </div>
          </div>
        ) : trimmed ? (
          <div className="rounded-md border border-dashed border-border bg-secondary/30 p-3 text-sm text-muted-foreground" data-testid="result-airline-empty">
            No direct match for <span className="font-mono">{trimmed}</span>.
            {suggestions.length === 0 && ' Try a 3-letter ICAO code (e.g. BAW).'}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border bg-secondary/20 p-3 text-xs text-muted-foreground" data-testid="hint-airline">
            Tip: type a 3-letter ICAO code (BAW, DLH, AAL) or a full flight callsign (BAW123) to get the spoken callsign.
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="grid gap-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Suggestions</Label>
            <ul className="divide-y divide-border rounded-md border border-border" data-testid="list-airline-suggestions">
              {suggestions.map(([code, a]) => (
                <li key={code}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover-elevate"
                    onClick={() => setQ(code)}
                    data-testid={`suggestion-airline-${code}`}
                  >
                    <span className="font-mono text-sm font-semibold text-primary">{code}</span>
                    <span className="flex-1 truncate text-sm">{a.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{a.callsign}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
