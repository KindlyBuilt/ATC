import { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboard } from '@/lib/clipboard';
import { spokenCallsign } from '@/data/airlines';
import { DEFAULT_AIRPORTS } from '@/data/airports';
import { randomSquawk } from '@/lib/squawk';
import { useAppState } from '@/lib/appState';
import { SectionCard } from '@/components/SectionCard';
import type { AtisContext } from '@/components/AtisGenerator';
import type { GeneratedSid } from '@/components/SidGenerator';
import type { StatusValue, Strip } from '@/pages/Strips';
import { MessageSquareText, Copy, Sparkles, ChevronDown } from 'lucide-react';

const SQUAWKS = ['RANDOM', '1200', '2000', '7000'];
const DEST_VALUE = 'DEST';
const FACE_DIRS = ['North', 'East', 'South', 'West', 'Straight'] as const;

interface Common { callsign: string }

function fmtCallsign(cs: string): string {
  const spoken = spokenCallsign(cs);
  return spoken || cs.toUpperCase();
}

interface PhraseGeneratorProps {
  atisContext?: AtisContext;
  generatedSid?: GeneratedSid;
  onCreateStrip: (strip: Strip) => void;
  onUpdateStripStatus: (callsign: string, status: StatusValue) => boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editMode?: boolean;
  onDelete?: () => void;
  dragHandleProps?: Record<string, unknown>;
}

export function PhraseGenerator({
  atisContext, generatedSid, onCreateStrip, onUpdateStripStatus,
  open: openProp, onOpenChange, editMode, onDelete, dragHandleProps,
}: PhraseGeneratorProps) {
  const { toast } = useToast();
  const { savedCallsigns, addSavedCallsign } = useAppState();
  const [callsign, setCallsign] = useState('');
  const [internalOpen, setInternalOpen] = useState(true);
  // Coloured text applies to EVERY copy output below. Ticked by default.
  const [coloured, setColoured] = useState(true);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const spoken = useMemo(() => fmtCallsign(callsign), [callsign]);
  // Output callsign is the RAW callsign entered/saved (not the spoken form).
  const displayCs = useMemo(() => (callsign.trim().toUpperCase() || 'Aircraft'), [callsign]);

  // Build the final clipboard string. Generators produce body text that starts
  // with the (raw) callsign followed by ", ...". When coloured is on we split
  // that leading callsign out and wrap as: "/atc ^8 CALLSIGN ^4 rest". When off
  // we keep the existing "/atc" prefix with no colour codes.
  function buildCopyText(text: string): string {
    if (!coloured) return `/atc ${text}`;
    const cs = displayCs;
    // Strip a leading "CALLSIGN, " (or "CALLSIGN ") so we don't duplicate it.
    let rest = text;
    if (text.toUpperCase().startsWith(cs.toUpperCase())) {
      rest = text.slice(cs.length).replace(/^[,\s]+/, '');
    }
    return `/atc ^8 ${cs} ^4 ${rest}`;
  }

  async function copyLine(label: string, text: string, stripStatus?: StatusValue) {
    const copiedText = buildCopyText(text);
    const stripUpdated = stripStatus ? onUpdateStripStatus(callsign, stripStatus) : false;
    const ok = await copyToClipboard(copiedText);
    toast({
      title: ok ? `${label} copied` : 'Copy failed',
      description: ok
        ? `${stripUpdated ? `Flightstrip updated to ${stripStatus}. ` : ''}${copiedText}`
        : 'Could not access clipboard.',
      variant: ok ? 'default' : 'destructive',
    });
  }

  function saveCallsign() {
    const trimmed = callsign.trim().toUpperCase();
    if (!trimmed) {
      toast({ title: 'Callsign required', description: 'Type a callsign before saving it.', variant: 'destructive' });
      return;
    }
    addSavedCallsign(trimmed);
    setCallsign('');
    toast({ title: 'Callsign saved', description: `${trimmed} is ready as a quick-select button.` });
  }

  return (
    <SectionCard
      title="Text Phrase Generator"
      icon={<MessageSquareText className="h-4 w-4 text-primary" />}
      hint="For text-mode pilots"
      open={open}
      onOpenChange={setOpen}
      testId="card-phrases"
      editMode={editMode}
      onDelete={onDelete}
      dragHandleProps={dragHandleProps}
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Aircraft callsign</Label>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input
              value={callsign}
              onChange={(e) => setCallsign(e.target.value.toUpperCase())}
              className="font-mono uppercase"
              placeholder="e.g. BAW123"
              data-testid="input-phrase-callsign"
            />
            <Button variant="outline" onClick={saveCallsign} data-testid="button-save-callsign">
              Save callsign
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Spoken: <span className="font-mono text-foreground">{callsign ? spoken : '—'}</span>
          </p>
          {savedCallsigns.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" data-testid="grid-saved-callsigns">
              {savedCallsigns.map((cs) => (
                <Button
                  key={cs}
                  variant={callsign === cs ? 'default' : 'secondary'}
                  size="sm"
                  className="justify-center font-mono"
                  onClick={() => setCallsign(cs)}
                  data-testid={`button-saved-callsign-${cs}`}
                >
                  {cs}
                </Button>
              ))}
            </div>
          )}
          {/* Coloured text toggle — applies to every copy output below. */}
          <label className="flex cursor-pointer items-center gap-2 text-sm" data-testid="checkbox-phrase-coloured-label">
            <Checkbox checked={coloured} onCheckedChange={(c) => setColoured(!!c)} data-testid="checkbox-phrase-coloured" />
            Coloured text
          </label>
        </div>

        <IfrClearance
          callsign={callsign}
          spoken={spoken}
          displayCs={displayCs}
          atisContext={atisContext}
          generatedSid={generatedSid}
          onCopy={copyLine}
          onCreateStrip={onCreateStrip}
        />
        <FreeText callsign={callsign} spoken={spoken} displayCs={displayCs} coloured={coloured} onCopy={copyLine} />
        <Pushback callsign={callsign} spoken={spoken} displayCs={displayCs} onCopy={copyLine} />
        <Taxi callsign={callsign} spoken={spoken} displayCs={displayCs} onCopy={copyLine} />
        <Takeoff callsign={callsign} spoken={spoken} displayCs={displayCs} atisContext={atisContext} onCopy={copyLine} />
        <Descend callsign={callsign} spoken={spoken} displayCs={displayCs} atisContext={atisContext} onCopy={copyLine} />
        <RadarVectors callsign={callsign} spoken={spoken} displayCs={displayCs} onCopy={copyLine} />
        <Approach callsign={callsign} spoken={spoken} displayCs={displayCs} onCopy={copyLine} />
        <Landing callsign={callsign} spoken={spoken} displayCs={displayCs} atisContext={atisContext} onCopy={copyLine} />
      </div>
    </SectionCard>
  );
}

interface SubProps extends Common {
  spoken: string;
  displayCs: string; // raw callsign used in OUTPUT text (not the spoken form)
  onCopy: (label: string, text: string, stripStatus?: StatusValue) => void;
  atisContext?: AtisContext;
  generatedSid?: GeneratedSid;
  onCreateStrip?: (strip: Strip) => void;
}

// Each phraseology subsection is independently collapsible (expanded on first
// load). Collapsing materially reduces vertical space.
function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section className="rounded-md border border-border bg-secondary/30 p-3">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="mb-2 flex w-full items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-primary/90"
            data-testid={`toggle-phrase-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`}
          >
            <span>{title}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>{children}</CollapsibleContent>
      </section>
    </Collapsible>
  );
}

function GenerateBar({
  preview,
  onClick,
  testId,
  secondaryAction,
}: {
  preview: string;
  onClick: () => void;
  testId: string;
  secondaryAction?: { label: string; testId: string; onClick: () => void };
}) {
  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
      <div className="rounded border border-border bg-background/60 p-2 font-mono text-xs text-foreground/90" data-testid={`${testId}-preview`}>{preview}</div>
      <div className="grid gap-2 sm:w-max">
        <Button
          variant="secondary"
          size="sm"
          onClick={onClick}
          data-testid={testId}
        >
          <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
        </Button>
        {secondaryAction ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={secondaryAction.onClick}
            data-testid={secondaryAction.testId}
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" /> {secondaryAction.label}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function stationAbbrev(station?: string): string {
  const map: Record<string, string> = {
    Tower: 'TWR',
    Ground: 'GND',
    Approach: 'APP',
    Delivery: 'DEL',
    'LS Center': 'LS CTR',
    'PA Center': 'PA CTR',
    'SA Center': 'SA CTR',
  };
  return station ? (map[station] ?? station.toUpperCase()) : '';
}

function windPhrase(atisContext?: AtisContext): string {
  if (!atisContext?.windDir || !atisContext?.windSpeed) return '';
  return `Surface Wind ${atisContext.windDir.padStart(3, '0')} at ${atisContext.windSpeed} knots, `;
}

function facilityLabel(atisContext?: AtisContext): string {
  if (!atisContext?.airportIcao || !atisContext?.station) return '';
  return `${atisContext.airportIcao} ${stationAbbrev(atisContext.station)}`;
}

type SidMode = 'generated' | 'direct' | 'rv' | 'other';
const GENERATED_MODE: SidMode = 'generated';

function IfrClearance({ callsign, displayCs, atisContext, generatedSid, onCopy, onCreateStrip }: SubProps) {
  const { atisViewer } = useAppState();
  const [dep, setDep] = useState('KLSX');
  const [arr, setArr] = useState(DEST_VALUE);
  const [sidMode, setSidMode] = useState<SidMode>('other');
  const [sidInput, setSidInput] = useState('');
  const [sq, setSq] = useState(SQUAWKS[0]);
  const [randomSq, setRandomSq] = useState(() => randomSquawk());
  // SID Routing ticked (default) keeps the SID-mode behaviour. Unticked, the
  // clearance behaves like "Other" but WITHOUT "climb via SID" — just "as filed".
  const [sidRouting, setSidRouting] = useState(true);

  const generatedSidName = generatedSid?.sid.name?.toUpperCase() ?? '';
  const hasGenerated = Boolean(generatedSidName);

  useEffect(() => {
    if (!generatedSid) return;
    setDep(generatedSid.departure);
    setArr(generatedSid.arrival);
    setSidMode('generated');
  }, [generatedSid]);

  // ATC station/facility name is intentionally NOT included in the IFR output.
  // Information letter + altimeter (auto-filled from Mass ATIS / Detailed ATIS)
  // are kept when available.
  // Mass ATIS has priority for the selected departure airport. Detailed ATIS is
  // only used when it matches the same airport and no Mass ATIS entry exists.
  const massAtis = atisViewer.find((e) => e.icao === dep);
  const detailAtis = atisContext?.airportIcao === dep ? atisContext : undefined;
  const effectiveAtis = massAtis
    ? { letter: massAtis.letter, qnh: massAtis.qnh }
    : detailAtis
      ? { letter: detailAtis.letter, qnh: detailAtis.qnh }
      : undefined;

  const atisParts = [
    effectiveAtis?.letter ? `Information ${effectiveAtis.letter}` : '',
    effectiveAtis?.qnh
      ? (/qnh|altimeter/i.test(effectiveAtis.qnh) ? effectiveAtis.qnh : `Altimeter ${effectiveAtis.qnh}`)
      : '',
  ].filter(Boolean);
  const prefix = [displayCs, ...atisParts].filter(Boolean).join(', ');
  const arrivalText = arr === DEST_VALUE ? 'destination' : arr;
  const squawkText = sq === 'RANDOM' ? randomSq : sq;

  // Build clearance text based on SID mode (or the no-SID-routing variant).
  const cleanedInput = sidInput.trim().toUpperCase();
  let body = '';
  let stripSid = '—';
  if (!sidRouting) {
    // No SID routing: behave like "Other" but without "climb via SID".
    body = `cleared to ${arrivalText}, as filed, squawk ${squawkText}`;
    stripSid = 'AS FILED';
  } else if (sidMode === 'generated') {
    if (hasGenerated) {
      body = `cleared to ${arrivalText} via the ${generatedSidName} departure, climb via SID, squawk ${squawkText}`;
      stripSid = generatedSidName;
    } else {
      body = `cleared to ${arrivalText}, climb via SID, squawk ${squawkText}`;
    }
  } else if (sidMode === 'direct') {
    const wp = cleanedInput || '<WAYPOINT>';
    body = `cleared to ${arrivalText}, after departure, turn direct ${wp}, squawk ${squawkText}`;
    stripSid = cleanedInput ? `DCT ${cleanedInput}` : 'DCT';
  } else if (sidMode === 'rv') {
    const loc = cleanedInput || '<WAYPOINT>';
    body = `cleared to ${arrivalText} via Radar Vectors to ${loc}, then as filed, squawk ${squawkText}`;
    stripSid = cleanedInput ? `RV ${cleanedInput}` : 'RV';
  } else {
    // other / free text. Removes the word "departure", keeps "as filed".
    const free = cleanedInput;
    body = free
      ? `cleared to ${arrivalText} via ${free}, as filed, climb via SID, squawk ${squawkText}`
      : `cleared to ${arrivalText}, as filed, climb via SID, squawk ${squawkText}`;
    stripSid = free || '—';
  }
  const text = `${prefix || 'Aircraft'}, ${body}.`;

  async function copyAndMakeStrip() {
    await onCopy('IFR clearance', text);
    const cs = callsign.trim().toUpperCase();
    if (!cs) {
      return;
    }
    onCreateStrip?.({
      id: `${cs}-${Date.now()}`,
      callsign: cs,
      dep,
      arr: arr === DEST_VALUE ? 'DEST' : arr,
      sid: stripSid,
      status: 'Given Clearance',
      hold: false,
    });
    if (sq === 'RANDOM') {
      setRandomSq(randomSquawk());
    }
  }

  async function copyOnly() {
    await onCopy('IFR clearance', text);
    if (sq === 'RANDOM') {
      setRandomSq(randomSquawk());
    }
  }

  const inputHint =
    sidMode === 'direct' ? 'Input waypoint' :
    sidMode === 'rv' ? 'Input waypoint or location' :
    sidMode === 'other' ? 'Free text — e.g. as filed remark' : '';

  return (
    <Subsection title="IFR Clearance">
      <label className="mb-2 flex w-max cursor-pointer items-center gap-2 text-sm" data-testid="checkbox-ifr-sidrouting-label">
        <Checkbox checked={sidRouting} onCheckedChange={(c) => setSidRouting(!!c)} data-testid="checkbox-ifr-sidrouting" />
        SID Routing
      </label>
      <div className={`grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,0.85fr)] ${sidRouting ? '' : ''}`}>
        <Field label="Departing ICAO">
          <Select value={dep} onValueChange={setDep}>
            <SelectTrigger data-testid="select-ifr-dep"><SelectValue /></SelectTrigger>
            <SelectContent>{DEFAULT_AIRPORTS.map((a) => (
              <SelectItem key={a.icao} value={a.icao}>{a.icao} {a.name}</SelectItem>
            ))}</SelectContent>
          </Select>
        </Field>
        <Field label="SID mode">
          <Select value={sidMode} onValueChange={(v) => setSidMode(v as SidMode)} disabled={!sidRouting}>
            <SelectTrigger data-testid="select-ifr-sid-mode" className={sidRouting ? '' : 'opacity-50'}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={GENERATED_MODE} data-testid="option-ifr-sid-generated">
                {hasGenerated ? (
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="font-mono font-bold text-emerald-300">{generatedSidName}</span>
                    <span className="text-muted-foreground">(Generated)</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Generated SID — none yet</span>
                )}
              </SelectItem>
              <SelectItem value="direct">Direct Waypoint</SelectItem>
              <SelectItem value="rv">Radar Vectors (RV)</SelectItem>
              <SelectItem value="other">Other / Free text</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={sidMode === 'generated' ? 'Generated SID' : (inputHint || 'Input')}>
          {!sidRouting ? (
            <div className="flex h-10 items-center rounded-md border border-dashed border-border bg-secondary/30 px-3 text-xs text-muted-foreground" data-testid="text-ifr-sid-disabled">SID routing off — "as filed"</div>
          ) : sidMode === 'generated' ? (
            <div
              className={`flex h-10 items-center gap-2 rounded-md border px-3 font-mono text-sm ${
                hasGenerated
                  ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                  : 'border-dashed border-border bg-secondary/30 text-muted-foreground'
              }`}
              data-testid="text-ifr-generated-sid"
            >
              {hasGenerated ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span className="font-bold">{generatedSidName}</span>
                </>
              ) : (
                <span className="text-xs">Use SID Generator to pick a SID</span>
              )}
            </div>
          ) : (
            <Input
              value={sidInput}
              onChange={(e) => setSidInput(e.target.value.toUpperCase())}
              placeholder={inputHint}
              className="font-mono uppercase"
              data-testid="input-ifr-sid"
            />
          )}
        </Field>
        <Field label="Arrival ICAO (Optional)">
          <Select value={arr} onValueChange={setArr}>
            <SelectTrigger data-testid="select-ifr-arr"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={DEST_VALUE}>Destination</SelectItem>
              {DEFAULT_AIRPORTS.map((a) => (
                <SelectItem key={a.icao} value={a.icao}>{a.icao} {a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Squawk">
          <Select value={sq} onValueChange={setSq}>
            <SelectTrigger data-testid="select-ifr-squawk"><SelectValue /></SelectTrigger>
            <SelectContent>{SQUAWKS.map((s) => <SelectItem key={s} value={s}>{s === 'RANDOM' ? `Random (${randomSq})` : s}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
      <GenerateBar
        preview={text}
        testId="button-copy-ifr"
        onClick={copyOnly}
        secondaryAction={{
          label: 'Copy and generate flightstrip',
          testId: 'button-copy-ifr-generate-strip',
          onClick: copyAndMakeStrip,
        }}
      />
    </Subsection>
  );
}

// Free text phrase. One input; output = the selected callsign followed by the
// free text. When coloured is on the parent wraps it as "/atc ^8 CS ^4 ...";
// for the free-text body we additionally tint it ^5 so it reads
// "/atc ^8 CS ^4 ^5 free text". When off, plain "/atc CS free text".
function FreeText({ displayCs, coloured, onCopy }: SubProps & { coloured: boolean }) {
  const [free, setFree] = useState('');
  const aircraft = displayCs;
  const bodyText = free.trim();
  // Preview shows what the message reads as; the ^5 colour code is added only
  // when coloured is enabled (the parent adds the /atc ^8 ^4 wrapper).
  const previewBody = bodyText || '<free text>';
  const text = coloured
    ? `${aircraft}, ^5 ${previewBody}`
    : `${aircraft}, ${previewBody}`;
  return (
    <Subsection title="Free text">
      <Field label="Free text">
        <Input
          value={free}
          onChange={(e) => setFree(e.target.value)}
          placeholder="Type any free text message…"
          data-testid="input-freetext"
        />
      </Field>
      <GenerateBar preview={text} testId="button-copy-freetext" onClick={() => onCopy('Free text', text)} />
    </Subsection>
  );
}

function Pushback({ displayCs, onCopy }: SubProps) {
  const [tw, setTw] = useState('');
  const [face, setFace] = useState<typeof FACE_DIRS[number]>('North');
  const aircraft = displayCs;
  const taxiway = tw.trim().toUpperCase() || '--';
  const text = face === 'Straight'
    ? `${aircraft}, pushback approved onto taxiway ${taxiway}, push straight.`
    : `${aircraft}, pushback approved onto taxiway ${taxiway}, face ${face.toLowerCase()}.`;
  return (
    <Subsection title="Pushback">
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Taxiway">
          <Input
            value={tw}
            onChange={(e) => setTw(e.target.value.toUpperCase())}
            placeholder="e.g. A"
            className="font-mono uppercase"
            data-testid="input-push-taxiway"
          />
        </Field>
        <Field label="Face direction">
          <Select value={face} onValueChange={(v) => setFace(v as typeof FACE_DIRS[number])}>
            <SelectTrigger data-testid="select-push-face"><SelectValue /></SelectTrigger>
            <SelectContent>{FACE_DIRS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
      <GenerateBar preview={text} testId="button-copy-push" onClick={() => onCopy('Pushback', text, 'Pushing Back')} />
    </Subsection>
  );
}

function Taxi({ displayCs, onCopy }: SubProps) {
  const [rwy, setRwy] = useState('');
  const [hold, setHold] = useState('');
  const [via, setVia] = useState('');
  const aircraft = displayCs;
  const rwyText = rwy.trim().toUpperCase() || '--';
  const holdText = hold.trim().toUpperCase() || '--';
  const viaText = via.trim().toUpperCase() || '--';
  const text = `${aircraft}, taxi to holding point ${holdText} runway ${rwyText} via ${viaText}.`;
  return (
    <Subsection title="Taxi">
      <div className="grid gap-2 sm:grid-cols-3">
        <Field label="Runway">
          <Input
            value={rwy}
            onChange={(e) => setRwy(e.target.value.toUpperCase())}
            placeholder="e.g. 30R"
            className="font-mono uppercase"
            data-testid="input-taxi-runway"
          />
        </Field>
        <Field label="Holding point">
          <Input
            value={hold}
            onChange={(e) => setHold(e.target.value.toUpperCase())}
            placeholder="e.g. A1"
            className="font-mono uppercase"
            data-testid="input-taxi-hold"
          />
        </Field>
        <Field label="Via taxiways">
          <Input
            value={via}
            onChange={(e) => setVia(e.target.value.toUpperCase())}
            placeholder="e.g. A B C"
            className="font-mono uppercase"
            data-testid="input-taxi-via"
          />
        </Field>
      </div>
      <GenerateBar preview={text} testId="button-copy-taxi" onClick={() => onCopy('Taxi', text, 'Taxiiing')} />
    </Subsection>
  );
}

function Takeoff({ displayCs, atisContext, onCopy }: SubProps) {
  const [rwy, setRwy] = useState('');
  const aircraft = displayCs;
  const rwyText = rwy.trim().toUpperCase() || '--';
  const text = `${aircraft}, ${windPhrase(atisContext)}Runway ${rwyText}, Cleared for takeoff.`;
  return (
    <Subsection title="Takeoff">
      <Field label="Runway">
        <Input
          value={rwy}
          onChange={(e) => setRwy(e.target.value.toUpperCase())}
          placeholder="e.g. 30R"
          className="font-mono uppercase"
          data-testid="input-takeoff-runway"
        />
      </Field>
      <GenerateBar preview={text} testId="button-copy-takeoff" onClick={() => onCopy('Takeoff', text, 'Departure')} />
    </Subsection>
  );
}

function Descend({ displayCs, atisContext, onCopy }: SubProps) {
  const [mode, setMode] = useState<'discretion' | 'star'>('discretion');
  const [approachType, setApproachType] = useState<'Visual' | 'ILS'>('Visual');
  const [rwy, setRwy] = useState('');
  const aircraft = displayCs;
  const descendText = mode === 'star' ? 'Descend via the STAR' : 'Descend at your discretion';
  const runwayText = rwy.trim().toUpperCase();
  const approachPhrase = approachType === 'ILS' ? 'ILS' : 'visual';
  const approachText = runwayText
    ? `Expect Radar Vectors for ${approachPhrase} approach runway ${runwayText}`
    : `Expect Radar Vectors for ${approachPhrase} approach`;
  const text = `${aircraft}, ${descendText}, ${approachText}.`;

  return (
    <Subsection title="Descend">
      <div className="grid gap-2 sm:grid-cols-3">
        <Field label="Descent instruction">
          <SegmentedToggle
            value={mode}
            options={[
              { value: 'discretion', label: 'Discretion' },
              { value: 'star', label: 'STAR' },
            ]}
            onChange={(v) => setMode(v as 'discretion' | 'star')}
            testId="toggle-descend-mode"
          />
        </Field>
        <Field label="Expect approach">
          <SegmentedToggle
            value={approachType}
            options={[
              { value: 'Visual', label: 'Visual' },
              { value: 'ILS', label: 'ILS' },
            ]}
            onChange={(v) => setApproachType(v as 'Visual' | 'ILS')}
            testId="toggle-descend-approach"
          />
        </Field>
        <Field label="Runway">
          <Input
            value={rwy}
            onChange={(e) => setRwy(e.target.value.toUpperCase())}
            placeholder="e.g. 30R"
            className="font-mono uppercase"
            data-testid="input-descend-runway"
          />
        </Field>
      </div>
      <GenerateBar preview={text} testId="button-copy-descend" onClick={() => onCopy('Descend', text, 'Descent')} />
    </Subsection>
  );
}

function formatAltitude(raw: string): string {
  const value = raw.trim().toUpperCase();
  if (!value) return '';
  return /^\d+$/.test(value) ? `${value}ft` : value;
}

function RadarVectors({ displayCs, onCopy }: SubProps) {
  const [turn, setTurn] = useState<'left' | 'right'>('left');
  const [heading, setHeading] = useState('');
  const [altitude, setAltitude] = useState('');
  const aircraft = displayCs;
  const headingText = heading.trim();
  const altitudeText = formatAltitude(altitude);
  let instruction = '';
  if (headingText && altitudeText) {
    instruction = `turn ${turn} heading ${headingText}, maintain ${altitudeText}`;
  } else if (headingText) {
    instruction = `turn ${turn} heading ${headingText}`;
  } else if (altitudeText) {
    instruction = altitudeText;
  } else {
    instruction = 'radar vectors as instructed';
  }
  const text = `${aircraft}, ${instruction}.`;

  return (
    <Subsection title="Radar Vectors (RV)">
      <div className="grid gap-2 sm:grid-cols-3">
        <Field label="Turn direction">
          <SegmentedToggle
            value={turn}
            options={[
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' },
            ]}
            onChange={(v) => setTurn(v as 'left' | 'right')}
            testId="toggle-rv-turn"
          />
        </Field>
        <Field label="Heading">
          <Input
            value={heading}
            onChange={(e) => setHeading(e.target.value.toUpperCase())}
            placeholder="e.g. 270"
            className="font-mono uppercase"
            data-testid="input-rv-heading"
          />
        </Field>
        <Field label="Altitude and other info">
          <Input
            value={altitude}
            onChange={(e) => setAltitude(e.target.value.toUpperCase())}
            placeholder="e.g. 4000 or FL80"
            className="font-mono uppercase"
            data-testid="input-rv-altitude"
          />
        </Field>
      </div>
      <GenerateBar preview={text} testId="button-copy-rv" onClick={() => onCopy('Radar vectors', text)} />
    </Subsection>
  );
}

function Approach({ displayCs, onCopy }: SubProps) {
  const [approachType, setApproachType] = useState<'Visual' | 'ILS'>('ILS');
  const [rwy, setRwy] = useState('');
  const aircraft = displayCs;
  const runwayText = rwy.trim().toUpperCase();
  const approachPhrase = approachType === 'ILS' ? 'ILS' : 'visual';
  const reportText = approachType === 'ILS' ? 'Report Established' : 'Report field in sight';
  const text = runwayText
    ? `${aircraft}, cleared ${approachPhrase} approach runway ${runwayText}, ${reportText}.`
    : `${aircraft}, cleared ${approachPhrase} approach, ${reportText}.`;

  return (
    <Subsection title="Approach">
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Approach type">
          <SegmentedToggle
            value={approachType}
            options={[
              { value: 'ILS', label: 'ILS' },
              { value: 'Visual', label: 'Visual' },
            ]}
            onChange={(v) => setApproachType(v as 'Visual' | 'ILS')}
            testId="toggle-approach-type"
          />
        </Field>
        <Field label="Runway">
          <Input
            value={rwy}
            onChange={(e) => setRwy(e.target.value.toUpperCase())}
            placeholder="e.g. 30R"
            className="font-mono uppercase"
            data-testid="input-approach-runway"
          />
        </Field>
      </div>
      <GenerateBar
        preview={text}
        testId="button-copy-approach"
        onClick={() => onCopy('Approach', text, approachType === 'ILS' ? 'ILS' : 'Visual')}
      />
    </Subsection>
  );
}

function Landing({ displayCs, atisContext, onCopy }: SubProps) {
  const [rwy, setRwy] = useState('');
  const aircraft = displayCs;
  const rwyText = rwy.trim().toUpperCase() || '--';
  const text = `${aircraft}, ${windPhrase(atisContext)}Runway ${rwyText}, Cleared to land.`;
  return (
    <Subsection title="Landing">
      <Field label="Runway">
        <Input
          value={rwy}
          onChange={(e) => setRwy(e.target.value.toUpperCase())}
          placeholder="e.g. 30R"
          className="font-mono uppercase"
          data-testid="input-landing-runway"
        />
      </Field>
      <GenerateBar preview={text} testId="button-copy-landing" onClick={() => onCopy('Landing', text, 'Land')} />
    </Subsection>
  );
}

function SegmentedToggle({
  value,
  options,
  onChange,
  testId,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  testId: string;
}) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border" data-testid={testId}>
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <Button
            key={option.value}
            type="button"
            variant={active ? 'default' : 'ghost'}
            size="sm"
            className={[
              'rounded-none font-mono text-[11px] uppercase tracking-wider',
              index > 0 ? 'border-l border-border' : '',
              active ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
            onClick={() => onChange(option.value)}
            data-testid={`${testId}-${option.value}`}
            aria-pressed={active}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
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
