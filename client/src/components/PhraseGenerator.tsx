import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboard } from '@/lib/clipboard';
import { spokenCallsign } from '@/data/airlines';
import { DEFAULT_AIRPORTS } from '@/data/airports';
import { randomSquawk } from '@/lib/squawk';
import type { AtisContext } from '@/components/AtisGenerator';
import type { GeneratedSid } from '@/components/SidGenerator';
import type { StatusValue, Strip } from '@/pages/Strips';
import { MessageSquareText, Copy, Sparkles } from 'lucide-react';

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
}

export function PhraseGenerator({ atisContext, generatedSid, onCreateStrip, onUpdateStripStatus }: PhraseGeneratorProps) {
  const { toast } = useToast();
  const [callsign, setCallsign] = useState('');
  const [savedCallsigns, setSavedCallsigns] = useState<string[]>([]);

  const spoken = useMemo(() => fmtCallsign(callsign), [callsign]);

  async function copyLine(label: string, text: string, stripStatus?: StatusValue) {
    const copiedText = `/ATC ${text}`;
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
    setSavedCallsigns((items) => (items.includes(trimmed) ? items : [...items, trimmed]));
    setCallsign('');
    toast({ title: 'Callsign saved', description: `${trimmed} is ready as a quick-select button.` });
  }

  return (
    <Card data-testid="card-phrases">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquareText className="h-4 w-4 text-primary" />
          Text Phrase Generator
        </CardTitle>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">For text-mode pilots</span>
      </CardHeader>
      <CardContent className="grid gap-4">
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
        </div>

        <IfrClearance
          callsign={callsign}
          spoken={spoken}
          atisContext={atisContext}
          generatedSid={generatedSid}
          onCopy={copyLine}
          onCreateStrip={onCreateStrip}
        />
        <Pushback callsign={callsign} spoken={spoken} onCopy={copyLine} />
        <Taxi callsign={callsign} spoken={spoken} onCopy={copyLine} />
        <Takeoff callsign={callsign} spoken={spoken} atisContext={atisContext} onCopy={copyLine} />
        <Descend callsign={callsign} spoken={spoken} atisContext={atisContext} onCopy={copyLine} />
        <RadarVectors callsign={callsign} spoken={spoken} onCopy={copyLine} />
        <Approach callsign={callsign} spoken={spoken} onCopy={copyLine} />
        <Landing callsign={callsign} spoken={spoken} atisContext={atisContext} onCopy={copyLine} />
      </CardContent>
    </Card>
  );
}

interface SubProps extends Common {
  spoken: string;
  onCopy: (label: string, text: string, stripStatus?: StatusValue) => void;
  atisContext?: AtisContext;
  generatedSid?: GeneratedSid;
  onCreateStrip?: (strip: Strip) => void;
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-secondary/30 p-3">
      <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-primary/90">{title}</h3>
      {children}
    </section>
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

function IfrClearance({ callsign, spoken, atisContext, generatedSid, onCopy, onCreateStrip }: SubProps) {
  const [dep, setDep] = useState('KLSX');
  const [arr, setArr] = useState(DEST_VALUE);
  const [sidMode, setSidMode] = useState<SidMode>('other');
  const [sidInput, setSidInput] = useState('');
  const [sq, setSq] = useState(SQUAWKS[0]);
  const [randomSq, setRandomSq] = useState(() => randomSquawk());

  const generatedSidName = generatedSid?.sid.name?.toUpperCase() ?? '';
  const hasGenerated = Boolean(generatedSidName);

  useEffect(() => {
    if (!generatedSid) return;
    setDep(generatedSid.departure);
    setArr(generatedSid.arrival);
    setSidMode('generated');
  }, [generatedSid]);

  const atisParts = [
    atisContext?.airportIcao && atisContext?.station
      ? `${atisContext.airportIcao} ${stationAbbrev(atisContext.station)}`
      : '',
    atisContext?.letter ? `Information ${atisContext.letter}` : '',
    atisContext?.qnh
      ? (/qnh|altimeter/i.test(atisContext.qnh) ? atisContext.qnh : `Altimeter ${atisContext.qnh}`)
      : '',
  ].filter(Boolean);
  const prefix = [spoken, ...atisParts].filter(Boolean).join(', ');
  const arrivalText = arr === DEST_VALUE ? 'destination' : arr;
  const squawkText = sq === 'RANDOM' ? randomSq : sq;

  // Build clearance text based on SID mode.
  const cleanedInput = sidInput.trim().toUpperCase();
  let body = '';
  let stripSid = '—';
  if (sidMode === 'generated') {
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
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,0.85fr)]">
        <Field label="Departing ICAO">
          <Select value={dep} onValueChange={setDep}>
            <SelectTrigger data-testid="select-ifr-dep"><SelectValue /></SelectTrigger>
            <SelectContent>{DEFAULT_AIRPORTS.map((a) => (
              <SelectItem key={a.icao} value={a.icao}>{a.icao} {a.name}</SelectItem>
            ))}</SelectContent>
          </Select>
        </Field>
        <Field label="SID mode">
          <Select value={sidMode} onValueChange={(v) => setSidMode(v as SidMode)}>
            <SelectTrigger data-testid="select-ifr-sid-mode"><SelectValue /></SelectTrigger>
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
          {sidMode === 'generated' ? (
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

function Pushback({ spoken, onCopy }: SubProps) {
  const [tw, setTw] = useState('');
  const [face, setFace] = useState<typeof FACE_DIRS[number]>('North');
  const aircraft = spoken || 'Aircraft';
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

function Taxi({ spoken, onCopy }: SubProps) {
  const [rwy, setRwy] = useState('');
  const [hold, setHold] = useState('');
  const [via, setVia] = useState('');
  const aircraft = spoken || 'Aircraft';
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

function Takeoff({ spoken, atisContext, onCopy }: SubProps) {
  const [rwy, setRwy] = useState('');
  const aircraft = spoken || 'Aircraft';
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

function Descend({ spoken, atisContext, onCopy }: SubProps) {
  const [mode, setMode] = useState<'discretion' | 'star'>('discretion');
  const [approachType, setApproachType] = useState<'Visual' | 'ILS'>('Visual');
  const [rwy, setRwy] = useState('');
  const aircraft = spoken || 'Aircraft';
  const facility = facilityLabel(atisContext);
  const facilityText = facility ? `, ${facility}` : '';
  const descendText = mode === 'star' ? 'Descend via the STAR' : 'Descend at your discretion';
  const runwayText = rwy.trim().toUpperCase();
  const approachPhrase = approachType === 'ILS' ? 'ILS' : 'visual';
  const approachText = runwayText
    ? `Expect Radar Vectors for ${approachPhrase} approach runway ${runwayText}`
    : `Expect Radar Vectors for ${approachPhrase} approach`;
  const text = `${aircraft}${facilityText}, ${descendText}, ${approachText}.`;

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

function RadarVectors({ spoken, onCopy }: SubProps) {
  const [turn, setTurn] = useState<'left' | 'right'>('left');
  const [heading, setHeading] = useState('');
  const [altitude, setAltitude] = useState('');
  const aircraft = spoken || 'Aircraft';
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

function Approach({ spoken, onCopy }: SubProps) {
  const [approachType, setApproachType] = useState<'Visual' | 'ILS'>('ILS');
  const [rwy, setRwy] = useState('');
  const aircraft = spoken || 'Aircraft';
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

function Landing({ spoken, atisContext, onCopy }: SubProps) {
  const [rwy, setRwy] = useState('');
  const aircraft = spoken || 'Aircraft';
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
