// Notes section for the Home page.
//  - General Notes: a resizable textarea (bottom-right handle via CSS resize).
//  - Saved callsigns controls (shared with PhraseGenerator via app state).
//  - Aircraft Notes: a structured list of aircraft blocks. Picking/typing a
//    callsign adds a new aircraft heading line, with the callsign shown bold +
//    larger and the spoken callsign smaller below (from the airline dataset).
//    Focus then moves to the notes textarea for that aircraft.
// All state lives in React and resets on refresh.
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { spokenCallsign } from '@/data/airlines';
import { useAppState } from '@/lib/appState';
import { SectionCard } from '@/components/SectionCard';
import { StickyNote, Plus, Trash2 } from 'lucide-react';

interface NotesProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editMode?: boolean;
  onDelete?: () => void;
  dragHandleProps?: Record<string, unknown>;
}

export function Notes({ open: openProp, onOpenChange, editMode, onDelete, dragHandleProps }: NotesProps) {
  const { toast } = useToast();
  const { savedCallsigns, addSavedCallsign, aircraftNotes: aircraft, setAircraftNotes, addAircraftNote } = useAppState();
  const [internalOpen, setInternalOpen] = useState(true);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [general, setGeneral] = useState('');
  const [callsignInput, setCallsignInput] = useState('');
  const noteRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // Add a new aircraft note block for the given callsign and focus its notes.
  function addAircraft(cs: string) {
    const trimmed = cs.trim().toUpperCase();
    if (!trimmed) return;
    const spoken = spokenCallsign(trimmed);
    const id = addAircraftNote(trimmed, spoken);
    setCallsignInput('');
    // Focus the new note textarea on the next paint.
    if (id) setTimeout(() => noteRefs.current[id]?.focus(), 0);
  }

  function saveCallsign() {
    const trimmed = callsignInput.trim().toUpperCase();
    if (!trimmed) {
      toast({ title: 'Callsign required', description: 'Type a callsign first.', variant: 'destructive' });
      return;
    }
    addSavedCallsign(trimmed);
    toast({ title: 'Callsign saved', description: `${trimmed} added to saved callsigns.` });
  }

  function updateNote(id: string, value: string) {
    setAircraftNotes((list) => list.map((a) => (a.id === id ? { ...a, notes: value } : a)));
  }

  function removeAircraft(id: string) {
    setAircraftNotes((list) => list.filter((a) => a.id !== id));
  }

  return (
    <SectionCard
      title="Notes"
      icon={<StickyNote className="h-4 w-4 text-primary" />}
      hint="Session only"
      open={open}
      onOpenChange={setOpen}
      testId="card-notes"
      editMode={editMode}
      onDelete={onDelete}
      dragHandleProps={dragHandleProps}
    >
      {/* General notes */}
      <div className="grid gap-1.5">
        <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">General notes</Label>
        <Textarea
          value={general}
          onChange={(e) => setGeneral(e.target.value)}
          placeholder="Scratchpad — runway in use, traffic, reminders…"
          className="min-h-[80px] resize-y"
          data-testid="input-notes-general"
        />
      </div>

      {/* Saved callsign controls between the two boxes */}
      <div className="grid gap-2 rounded-md border border-border bg-secondary/30 p-3">
        <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Aircraft callsign</Label>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <Input
            value={callsignInput}
            onChange={(e) => setCallsignInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter') addAircraft(callsignInput); }}
            placeholder="e.g. BAW123"
            className="font-mono uppercase"
            data-testid="input-notes-callsign"
          />
          <Button variant="secondary" onClick={() => addAircraft(callsignInput)} data-testid="button-notes-add-aircraft">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add aircraft line
          </Button>
          <Button variant="outline" onClick={saveCallsign} data-testid="button-notes-save-callsign">
            Save callsign
          </Button>
        </div>
        {savedCallsigns.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6" data-testid="grid-notes-saved-callsigns">
            {savedCallsigns.map((cs) => (
              <Button
                key={cs}
                variant="secondary"
                size="sm"
                className="justify-center font-mono"
                onClick={() => addAircraft(cs)}
                data-testid={`button-notes-saved-${cs}`}
              >
                {cs}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Aircraft notes blocks */}
      <div className="grid gap-1.5">
        <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Aircraft notes</Label>
        {aircraft.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-secondary/20 p-3 text-xs text-muted-foreground" data-testid="hint-notes-aircraft">
            Tap a saved callsign or type one and press "Add aircraft line" to start a note for that aircraft.
          </p>
        ) : (
          <div className="grid gap-2" data-testid="list-aircraft-notes">
            {aircraft.map((a) => (
              <div key={a.id} className="rounded-md border border-border bg-background/60 p-3" data-testid={`aircraft-note-${a.callsign}`}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-lg font-bold text-foreground">{a.callsign}</span>
                    {a.spoken && (
                      <span className="font-mono text-xs text-muted-foreground">{a.spoken}</span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => removeAircraft(a.id)}
                    aria-label={`Remove ${a.callsign}`}
                    data-testid={`button-remove-aircraft-${a.callsign}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Textarea
                  ref={(el) => { noteRefs.current[a.id] = el; }}
                  value={a.notes}
                  onChange={(e) => updateNote(a.id, e.target.value)}
                  placeholder="Notes for this aircraft…"
                  className="min-h-[48px] resize-y text-sm"
                  data-testid={`input-aircraft-note-${a.callsign}`}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
