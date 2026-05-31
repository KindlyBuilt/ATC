import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { spokenCallsign } from '@/data/airlines';
import { DEFAULT_AIRPORTS } from '@/data/airports';
import { getSidsFor } from '@/data/sids';
import type { GeneratedSid } from '@/components/SidGenerator';
import { Plane, Trash2, Pause, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// User-specified status values (kept verbatim where requested, including 'Taxiiing').
export const STATUS_OPTIONS = [
  'Given Clearance',
  'Pushing Back',
  'Taxiiing',
  'Ready for Dep',
  'Departure',
  'Climb/Enroute',
  'Descent',
  'ILS',
  'Visual',
  'Land',
  'Taxiing to Gate',
  'At gate',
] as const;
export type StatusValue = (typeof STATUS_OPTIONS)[number];

export interface Strip {
  id: string;
  callsign: string;
  dep: string;
  arr: string;
  sid: string;
  status: StatusValue;
  hold: boolean;
}

// Color cue per phase for the left status bar.
function statusTone(s: StatusValue): string {
  switch (s) {
    case 'Given Clearance':
    case 'Pushing Back':
    case 'Taxiiing':
    case 'Ready for Dep':
      return 'bg-amber-400';
    case 'Departure':
    case 'Climb/Enroute':
      return 'bg-cyan-400';
    case 'Descent':
    case 'ILS':
    case 'Visual':
    case 'Land':
      return 'bg-violet-400';
    case 'Taxiing to Gate':
    case 'At gate':
      return 'bg-emerald-400';
    default:
      return 'bg-muted-foreground';
  }
}

interface StripsPageProps {
  strips: Strip[];
  onStripsChange: Dispatch<SetStateAction<Strip[]>>;
  generatedSid?: GeneratedSid;
}

type SidMode = 'generated' | 'available' | 'direct' | 'rv' | 'other';

export default function StripsPage({ strips, onStripsChange, generatedSid }: StripsPageProps) {
  const { toast } = useToast();
  const [deleteMode, setDeleteMode] = useState(false);

  // New-strip form state
  const [form, setForm] = useState<Omit<Strip, 'id' | 'hold'>>({
    callsign: '',
    dep: 'KLSX',
    arr: 'KEYW',
    sid: '',
    status: 'Given Clearance',
  });
  const [sidMode, setSidMode] = useState<SidMode>('other');
  const [sidPick, setSidPick] = useState<string>('');
  const [sidInput, setSidInput] = useState<string>('');

  const generatedSidName = generatedSid?.sid.name?.toUpperCase() ?? '';
  const hasGenerated = Boolean(generatedSidName) && generatedSid?.departure === form.dep;
  const availableSids = getSidsFor(form.dep);

  useEffect(() => {
    if (!generatedSid) return;
    setForm((f) => ({
      ...f,
      dep: generatedSid.departure,
      arr: generatedSid.arrival,
      sid: generatedSid.sid.name.toUpperCase(),
    }));
    setSidMode('generated');
    setSidPick(generatedSid.sid.name.toUpperCase());
    setSidInput('');
  }, [generatedSid]);

  function resolvedSidValue(): string {
    const input = sidInput.trim().toUpperCase();
    if (sidMode === 'generated') return hasGenerated ? generatedSidName : '—';
    if (sidMode === 'available') return sidPick || '—';
    if (sidMode === 'direct') return input ? `DCT ${input}` : 'DCT';
    if (sidMode === 'rv') return input ? `RV ${input}` : 'RV';
    return input || '—';
  }

  function addStrip() {
    const cs = form.callsign.trim().toUpperCase();
    if (!cs) {
      toast({ title: 'Callsign required', description: 'Enter a callsign before adding a strip.', variant: 'destructive' });
      return;
    }
    const strip: Strip = {
      id: `${cs}-${Date.now()}`,
      ...form,
      sid: resolvedSidValue(),
      callsign: cs,
      hold: false,
    };
    onStripsChange((p) => [strip, ...p]);
    setForm((f) => ({ ...f, callsign: '' }));
    setSidInput('');
  }

  function toggleHold(id: string) {
    onStripsChange((p) => p.map((s) => (s.id === id ? { ...s, hold: !s.hold } : s)));
  }

  function updateStatus(id: string, v: StatusValue) {
    onStripsChange((p) => p.map((s) => (s.id === id ? { ...s, status: v } : s)));
  }

  function handleStripClick(id: string) {
    if (!deleteMode) return;
    onStripsChange((p) => p.filter((s) => s.id !== id));
    setDeleteMode(false);
    toast({ title: 'Strip removed', description: 'Delete mode disabled.' });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Digital Flight Strips</h1>
          <p className="text-sm text-muted-foreground">
            Compact electronic progress strips. Click <em className="not-italic font-mono">Hold</em> to flag, or enable delete mode to remove one.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {strips.length} active
          </span>
        </div>
      </div>

      <StripBoard
        strips={strips}
        deleteMode={deleteMode}
        onToggleHold={toggleHold}
        onStatusChange={updateStatus}
        onStripClick={handleStripClick}
      />

      <div className="mt-6 grid gap-4 2xl:grid-cols-[1fr_auto]">
        <Card data-testid="card-add-strip">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plane className="h-4 w-4 text-primary" /> Add aircraft
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
              <Field label="Callsign" className="xl:col-span-2">
                <Input
                  value={form.callsign}
                  onChange={(e) => setForm({ ...form, callsign: e.target.value.toUpperCase() })}
                  placeholder="e.g. BAW123"
                  className="font-mono uppercase"
                  data-testid="input-strip-callsign"
                />
              </Field>
              <Field label="Departure ICAO" className="xl:col-span-2">
                <Select value={form.dep} onValueChange={(v) => setForm({ ...form, dep: v })}>
                  <SelectTrigger data-testid="select-strip-dep"><SelectValue /></SelectTrigger>
                  <SelectContent>{DEFAULT_AIRPORTS.map((a) => (
                    <SelectItem key={a.icao} value={a.icao}>{a.icao} {a.name}</SelectItem>
                  ))}</SelectContent>
                </Select>
              </Field>
              <Field label="Arrival ICAO" className="xl:col-span-2">
                <Select value={form.arr} onValueChange={(v) => setForm({ ...form, arr: v })}>
                  <SelectTrigger data-testid="select-strip-arr"><SelectValue /></SelectTrigger>
                  <SelectContent>{DEFAULT_AIRPORTS.map((a) => (
                    <SelectItem key={a.icao} value={a.icao}>{a.icao} {a.name}</SelectItem>
                  ))}</SelectContent>
                </Select>
              </Field>
              <Field label="SID mode" className="xl:col-span-2">
                <Select value={sidMode} onValueChange={(v) => setSidMode(v as SidMode)}>
                  <SelectTrigger className="min-w-0" data-testid="select-strip-sid-mode">
                    <span className="truncate">
                      <SelectValue />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="generated">
                      {hasGenerated ? (
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="font-mono font-bold text-emerald-300">{generatedSidName}</span>
                          <span className="text-muted-foreground">Rec</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Generated SID — none</span>
                      )}
                    </SelectItem>
                    <SelectItem value="available">Available SIDs ({availableSids.length})</SelectItem>
                    <SelectItem value="direct">Direct Waypoint</SelectItem>
                    <SelectItem value="rv">Radar Vectors (RV)</SelectItem>
                    <SelectItem value="other">Other / Free text</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field
                className="sm:col-span-2 xl:col-span-2"
                label={
                sidMode === 'generated' ? 'Generated SID' :
                sidMode === 'available' ? 'Pick SID' :
                sidMode === 'direct' ? 'Waypoint' :
                sidMode === 'rv' ? 'Waypoint or location' :
                'SID / free text'
              }>
                {sidMode === 'generated' ? (
                  <div
                    className={`flex h-10 items-center gap-2 rounded-md border px-3 font-mono text-sm ${
                      hasGenerated
                        ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                        : 'border-dashed border-border bg-secondary/30 text-muted-foreground'
                    }`}
                    data-testid="text-strip-generated-sid"
                  >
                    {hasGenerated ? (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span className="font-bold">{generatedSidName}</span>
                      </>
                    ) : (
                      <span className="text-xs">Use SID Generator on Tools page</span>
                    )}
                  </div>
                ) : sidMode === 'available' ? (
                  availableSids.length > 0 ? (
                    <Select value={sidPick} onValueChange={setSidPick}>
                      <SelectTrigger data-testid="select-strip-sid-pick"><SelectValue placeholder="Select SID" /></SelectTrigger>
                      <SelectContent>
                        {availableSids.map((s) => {
                          const isRecommended = s.name.toUpperCase() === generatedSidName && hasGenerated;
                          return (
                            <SelectItem key={`${s.name}-${s.runway}`} value={s.name}>
                              {isRecommended && (
                                <span className="mr-1 inline-flex items-center gap-1 rounded-sm bg-emerald-500/15 px-1 font-mono text-[10px] text-emerald-300">
                                  <Sparkles className="h-3 w-3" /> Recommended
                                </span>
                              )}
                              <span className="font-mono font-bold">{s.name}</span>{' '}
                              <span className="text-muted-foreground">Rwy {s.runway}</span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex h-10 items-center rounded-md border border-dashed border-border bg-secondary/30 px-3 text-xs text-muted-foreground">
                      No SIDs for {form.dep}
                    </div>
                  )
                ) : (
                  <Input
                    value={sidInput}
                    onChange={(e) => setSidInput(e.target.value.toUpperCase())}
                    placeholder={
                      sidMode === 'direct' ? 'Input waypoint' :
                      sidMode === 'rv' ? 'Input waypoint or location' :
                      'e.g. OSHNN2'
                    }
                    className="font-mono uppercase"
                    data-testid="input-strip-sid"
                  />
                )}
              </Field>
              <Field label="Status" className="xl:col-span-3 2xl:col-span-2">
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as StatusValue })}>
                  <SelectTrigger data-testid="select-strip-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                onClick={addStrip}
                className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                data-testid="button-add-strip"
              >
                <Plus className="mr-2 h-4 w-4" /> Add strip
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="2xl:w-[260px]" data-testid="card-tools">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Board tools</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button
              variant={deleteMode ? 'destructive' : 'outline'}
              onClick={() => setDeleteMode((d) => !d)}
              className="w-full justify-start"
              data-testid="button-delete-mode"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleteMode ? 'Click any strip to delete…' : 'Delete a strip'}
            </Button>
            <p className="text-[11px] leading-snug text-muted-foreground">
              When enabled, the next strip you click is removed and delete mode turns off.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

interface BoardProps {
  strips: Strip[];
  deleteMode: boolean;
  onToggleHold: (id: string) => void;
  onStatusChange: (id: string, v: StatusValue) => void;
  onStripClick: (id: string) => void;
}

function StripBoard({ strips, deleteMode, onToggleHold, onStatusChange, onStripClick }: BoardProps) {
  if (strips.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-secondary/30 p-10 text-center text-sm text-muted-foreground" data-testid="empty-strips">
        No strips on the board. Add an aircraft below to start sequencing.
      </div>
    );
  }
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        deleteMode && 'cursor-crosshair',
      )}
      data-testid="grid-strips"
    >
      {strips.map((s) => (
        <FlightStrip
          key={s.id}
          strip={s}
          deleteMode={deleteMode}
          onToggleHold={onToggleHold}
          onStatusChange={onStatusChange}
          onStripClick={onStripClick}
        />
      ))}
    </div>
  );
}

interface StripProps {
  strip: Strip;
  deleteMode: boolean;
  onToggleHold: (id: string) => void;
  onStatusChange: (id: string, v: StatusValue) => void;
  onStripClick: (id: string) => void;
}

function FlightStrip({ strip, deleteMode, onToggleHold, onStatusChange, onStripClick }: StripProps) {
  const spoken = useMemo(() => spokenCallsign(strip.callsign), [strip.callsign]);
  const tone = statusTone(strip.status);
  return (
    <div
      role="article"
      data-testid={`strip-${strip.id}`}
      onClick={() => onStripClick(strip.id)}
      className={cn(
        'relative grid grid-cols-[6px_1fr] overflow-hidden rounded-md border bg-card/90 text-card-foreground shadow-sm transition-colors',
        strip.hold
          ? 'border-rose-500/70 bg-rose-950/40 ring-2 ring-rose-500/60'
          : 'border-border hover:border-primary/40',
        deleteMode && 'ring-2 ring-destructive/70 hover:bg-destructive/10',
      )}
    >
      <div className={cn('h-full w-1.5', strip.hold ? 'bg-rose-500' : tone)} aria-hidden />
      <div className="grid gap-1.5 p-2.5">
        {/* Row 1: callsign + spoken + status pill */}
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2 truncate">
            <span className="font-mono text-base font-bold leading-tight text-foreground" data-testid={`text-callsign-${strip.id}`}>
              {strip.callsign}
            </span>
            <span className="truncate font-mono text-[11px] uppercase tracking-wider text-muted-foreground" data-testid={`text-spoken-${strip.id}`}>
              {spoken !== strip.callsign ? spoken : '—'}
            </span>
          </div>
          {strip.hold ? (
            <span className="rounded-sm bg-rose-500 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-rose-50">
              Hold
            </span>
          ) : null}
        </div>

        {/* Row 2: dep / arr / sid grid — strip cells */}
        <div className="grid grid-cols-3 overflow-hidden rounded border border-border bg-background/50 font-mono text-[11px]">
          <Cell label="DEP" value={strip.dep} testId={`cell-dep-${strip.id}`} />
          <Cell label="ARR" value={strip.arr} testId={`cell-arr-${strip.id}`} border />
          <Cell label="SID" value={strip.sid} testId={`cell-sid-${strip.id}`} border />
        </div>

        {/* Row 3: status select + hold toggle */}
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Select value={strip.status} onValueChange={(v) => onStatusChange(strip.id, v as StatusValue)}>
            <SelectTrigger
              className="h-8 text-xs"
              onClick={(e) => e.stopPropagation()}
              data-testid={`select-status-${strip.id}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            variant={strip.hold ? 'destructive' : 'outline'}
            size="sm"
            className="h-8 px-2"
            onClick={(e) => { e.stopPropagation(); onToggleHold(strip.id); }}
            data-testid={`button-hold-${strip.id}`}
            aria-pressed={strip.hold}
          >
            <Pause className="mr-1 h-3.5 w-3.5" />
            {strip.hold ? 'Release' : 'Hold'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value, testId, border }: { label: string; value: string; testId: string; border?: boolean }) {
  return (
    <div className={cn('flex flex-col items-start justify-center px-2 py-1.5', border && 'border-l border-border')}>
      <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="truncate font-semibold text-foreground" data-testid={testId}>{value}</span>
    </div>
  );
}
