import { useState } from 'react';
import { AtisGenerator } from '@/components/AtisGenerator';
import type { AtisContext } from '@/components/AtisGenerator';
import { AirlineLookup } from '@/components/AirlineLookup';
import { AirportSettings } from '@/components/AirportSettings';
import { PhraseGenerator } from '@/components/PhraseGenerator';
import { SidGenerator } from '@/components/SidGenerator';
import type { GeneratedSid } from '@/components/SidGenerator';
import { Notes } from '@/components/Notes';
import { AtisViewer } from '@/components/AtisViewer';
import type { StatusValue, Strip } from '@/pages/Strips';

interface ToolsPageProps {
  atisContext?: AtisContext;
  onAtisContextChange: (context: AtisContext) => void;
  generatedSid?: GeneratedSid;
  onGeneratedSidChange: (g: GeneratedSid | undefined) => void;
  onCreateStrip: (strip: Strip) => void;
  onUpdateStripStatus: (callsign: string, status: StatusValue) => boolean;
}

type SectionId = 'notes' | 'airline' | 'settings' | 'sid' | 'viewer' | 'phrases' | 'atis';

export default function ToolsPage({
  atisContext,
  onAtisContextChange,
  generatedSid,
  onGeneratedSidChange,
  onCreateStrip,
  onUpdateStripStatus,
}: ToolsPageProps) {
  const [openMap, setOpenMap] = useState<Record<SectionId, boolean>>({
    notes: true,
    airline: true,
    settings: true,
    sid: true,
    viewer: true,
    phrases: true,
    atis: true,
  });

  function setOpen(id: SectionId, open: boolean) {
    setOpenMap((current) => ({ ...current, [id]: open }));
  }

  const sectionProps = (id: SectionId) => ({
    open: openMap[id],
    onOpenChange: (open: boolean) => setOpen(id, open),
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight">Controller Tools</h1>
        <p className="text-sm text-muted-foreground">
          ATIS, airline lookup, SID generator, and text phraseology for online controllers by Buckers for SAFS.
        </p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-12">
        <div id="notes" className="scroll-mt-28 lg:col-span-7" data-testid="section-wrap-notes">
          <Notes {...sectionProps('notes')} />
        </div>

        <div className="grid gap-5 lg:col-span-5">
          <div className="scroll-mt-28" data-testid="section-wrap-airline">
            <AirlineLookup {...sectionProps('airline')} />
          </div>
          <div id="airport-info" className="scroll-mt-28" data-testid="section-wrap-settings">
            <AirportSettings {...sectionProps('settings')} />
          </div>
          <div className="scroll-mt-28" data-testid="section-wrap-sid">
            <SidGenerator generated={generatedSid} onGeneratedChange={onGeneratedSidChange} {...sectionProps('sid')} />
          </div>
        </div>

        <div id="atis-viewer" className="scroll-mt-28 lg:col-span-12" data-testid="section-wrap-viewer">
          <AtisViewer {...sectionProps('viewer')} />
        </div>

        <div id="text-generator" className="scroll-mt-28 lg:col-span-12" data-testid="section-wrap-phrases">
          <PhraseGenerator
            atisContext={atisContext}
            generatedSid={generatedSid}
            onCreateStrip={onCreateStrip}
            onUpdateStripStatus={onUpdateStripStatus}
            {...sectionProps('phrases')}
          />
        </div>

        <div id="detailed-atis" className="scroll-mt-28 lg:col-span-12" data-testid="section-wrap-atis">
          <AtisGenerator onContextChange={onAtisContextChange} {...sectionProps('atis')} />
        </div>
      </div>
    </div>
  );
}
