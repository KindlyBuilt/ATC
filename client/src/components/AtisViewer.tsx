// Compact summary of generated ATISs, synced (via app state) between the Mass
// ATIS page and the Home page. Shows ICAO, info letter, QNH/Altimeter, dep/arr
// runway (collapsed to one when identical), and wind dir/speed.
import { useState } from 'react';
import { useAppState } from '@/lib/appState';
import { SectionCard } from '@/components/SectionCard';
import { MonitorDot } from 'lucide-react';

interface AtisViewerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editMode?: boolean;
  onDelete?: () => void;
  dragHandleProps?: Record<string, unknown>;
  columns?: boolean;
}

export function AtisViewer({ open: openProp, onOpenChange, editMode, onDelete, dragHandleProps, columns }: AtisViewerProps) {
  const { atisViewer } = useAppState();
  const [internalOpen, setInternalOpen] = useState(true);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <SectionCard
      title="ATIS Viewer"
      icon={<MonitorDot className="h-4 w-4 text-primary" />}
      hint="Synced from Mass ATIS"
      open={open}
      onOpenChange={setOpen}
      testId="card-atis-viewer"
      editMode={editMode}
      onDelete={onDelete}
      dragHandleProps={dragHandleProps}
    >
      {atisViewer.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-secondary/20 p-3 text-xs text-muted-foreground" data-testid="hint-atis-viewer">
          No ATIS generated yet. Generate ATIS on the Home or Mass ATIS page to populate this viewer.
        </p>
      ) : (
        <div className={`grid gap-1.5 ${columns ? 'sm:grid-cols-2 xl:grid-cols-3' : ''}`} data-testid="list-atis-viewer">
          {atisViewer.map((e) => {
            const sameRwy = e.depRunway === e.arrRunway;
            // Round wind DIRECTION to the nearest 10; leave the SPEED as-is.
            const dirNum = parseInt(e.windDir, 10);
            const roundedDir = Number.isNaN(dirNum)
              ? e.windDir
              : (((Math.round(dirNum / 10) * 10) % 360 + 360) % 360).toString().padStart(3, '0');
            const wind = e.windDir && e.windSpeed ? `${roundedDir}/${e.windSpeed}kt` : '---';
            return (
              <div
                key={e.icao}
                className={`flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-md border border-border bg-background/60 px-3 font-mono text-xs ${
                  columns ? 'py-1.5' : 'py-2'
                }`}
                data-testid={`atis-viewer-${e.icao}`}
              >
                <span className="text-sm font-bold text-primary">{e.icao}</span>
                <span className="text-emerald-300">Info {e.letter}</span>
                <span className="text-muted-foreground">{e.qnh || 'QNH --'}</span>
                <span>
                  {sameRwy ? `RWY ${e.depRunway}` : `DEP ${e.depRunway} / ARR ${e.arrRunway}`}
                </span>
                <span className="text-muted-foreground">Wind {wind}</span>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
