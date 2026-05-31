// Runway selector used by ATIS-style controls.
//  - If the airport has <= 2 runway options, render a normal single Select.
//  - If > 2 options, render a multiselect dropdown (checkbox list) so multiple
//    runways can be active at once.
//  - Always include a "Custom" option that reveals a free-text input.
// The value is a single comma-joined string (e.g. "12L, 30R") so it slots into
// existing string-based ATIS fields. Wind components, when supplied, are shown
// in very small text beneath.
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronDown } from 'lucide-react';
import { windComponents, shortWindLabel } from '@/lib/wind';

const CUSTOM = '__custom__';

interface RunwaySelectProps {
  options: string[];
  value: string; // comma-joined
  onChange: (value: string) => void;
  windDir?: number | null;
  windSpeed?: number | null;
  // Highlight the best (highest headwind) runway in the list.
  bestRunway?: string;
  testId?: string;
}

function windHint(runway: string, windDir?: number | null, windSpeed?: number | null) {
  if (windDir == null || windSpeed == null) return null;
  const comp = windComponents(runway, windDir, windSpeed);
  if (!comp) return null;
  return shortWindLabel(comp);
}

export function RunwaySelect({
  options,
  value,
  onChange,
  windDir,
  windSpeed,
  bestRunway,
  testId,
}: RunwaySelectProps) {
  const selected = useMemo(
    () => value.split(',').map((s) => s.trim()).filter(Boolean),
    [value],
  );
  const isCustom = selected.length > 0 && selected.some((s) => !options.includes(s));
  const [customMode, setCustomMode] = useState(isCustom);

  // Single select for <= 2 options.
  if (options.length <= 2) {
    const current = customMode ? CUSTOM : (selected[0] ?? '');
    return (
      <div className="grid gap-1">
        <Select
          value={current || undefined}
          onValueChange={(v) => {
            if (v === CUSTOM) { setCustomMode(true); onChange(''); }
            else { setCustomMode(false); onChange(v); }
          }}
        >
          <SelectTrigger data-testid={testId}><SelectValue placeholder="Select runway" /></SelectTrigger>
          <SelectContent>
            {options.map((r) => (
              <SelectItem key={r} value={r}>
                {r}{bestRunway === r ? ' ★' : ''}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM}>Custom…</SelectItem>
          </SelectContent>
        </Select>
        {customMode && (
          <Input
            value={selected.join(', ')}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            placeholder="Custom runway"
            className="font-mono uppercase"
            data-testid={`${testId}-custom`}
          />
        )}
        {!customMode && current && windHint(current, windDir, windSpeed) && (
          <span className="font-mono text-[9px] text-muted-foreground">{windHint(current, windDir, windSpeed)}</span>
        )}
      </div>
    );
  }

  // Multiselect for > 2 options.
  function toggle(r: string) {
    const set = new Set(selected.filter((s) => options.includes(s)));
    if (set.has(r)) set.delete(r); else set.add(r);
    onChange(Array.from(set).join(', '));
  }

  return (
    <div className="grid gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-between font-mono" data-testid={testId}>
            <span className="truncate">{selected.length ? selected.join(', ') : 'Select runway(s)'}</span>
            <ChevronDown className="ml-2 h-3.5 w-3.5 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="grid gap-1">
            {options.map((r) => {
              const hint = windHint(r, windDir, windSpeed);
              return (
                <label
                  key={r}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-secondary"
                  data-testid={`${testId}-opt-${r}`}
                >
                  <Checkbox
                    checked={selected.includes(r)}
                    onCheckedChange={() => toggle(r)}
                  />
                  <span className="font-mono">{r}</span>
                  {bestRunway === r && <span className="text-amber-300">★</span>}
                  {hint && <span className="ml-auto font-mono text-[9px] text-muted-foreground">{hint}</span>}
                </label>
              );
            })}
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-secondary">
              <Checkbox checked={customMode} onCheckedChange={(c) => { setCustomMode(!!c); if (!c) onChange(''); }} />
              <span>Custom…</span>
            </label>
          </div>
        </PopoverContent>
      </Popover>
      {customMode && (
        <Input
          value={selected.filter((s) => !options.includes(s)).join(', ')}
          onChange={(e) => onChange([...selected.filter((s) => options.includes(s)), e.target.value.toUpperCase()].join(', '))}
          placeholder="Custom runway"
          className="font-mono uppercase"
          data-testid={`${testId}-custom`}
        />
      )}
    </div>
  );
}
