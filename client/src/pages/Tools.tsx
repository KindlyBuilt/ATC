import { AtisGenerator } from '@/components/AtisGenerator';
import type { AtisContext } from '@/components/AtisGenerator';
import { AirlineLookup } from '@/components/AirlineLookup';
import { AirportSettings } from '@/components/AirportSettings';
import { PhraseGenerator } from '@/components/PhraseGenerator';
import { SidGenerator } from '@/components/SidGenerator';
import type { GeneratedSid } from '@/components/SidGenerator';
import type { StatusValue, Strip } from '@/pages/Strips';

interface ToolsPageProps {
  atisContext?: AtisContext;
  onAtisContextChange: (context: AtisContext) => void;
  generatedSid?: GeneratedSid;
  onGeneratedSidChange: (g: GeneratedSid | undefined) => void;
  onCreateStrip: (strip: Strip) => void;
  onUpdateStripStatus: (callsign: string, status: StatusValue) => boolean;
}

export default function ToolsPage({
  atisContext,
  onAtisContextChange,
  generatedSid,
  onGeneratedSidChange,
  onCreateStrip,
  onUpdateStripStatus,
}: ToolsPageProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Controller Tools</h1>
          <p className="text-sm text-muted-foreground">
            ATIS, airline lookup, SID generator, and text phraseology for online controllers by Buckers for SAFS.
          </p>
        </div>
        <span className="hidden font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">
          session state — preserved in app
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Left column: ATIS */}
        <div className="lg:col-span-7 xl:col-span-7">
          <AtisGenerator onContextChange={onAtisContextChange} />
        </div>

        {/* Right column: Airline Lookup (compact) + SID Generator (with map) */}
        <div className="grid gap-5 lg:col-span-5 xl:col-span-5">
          <AirlineLookup />
          <AirportSettings />
          {/* Desktop: SID generator stacks below airline lookup. Mobile: order placed above PhraseGenerator below. */}
          <div className="hidden lg:block">
            <SidGenerator generated={generatedSid} onGeneratedChange={onGeneratedSidChange} />
          </div>
        </div>

        {/* Mobile-only SID generator placement — above PhraseGenerator */}
        <div className="lg:col-span-12 lg:hidden">
          <SidGenerator generated={generatedSid} onGeneratedChange={onGeneratedSidChange} />
        </div>

        <div className="lg:col-span-12">
          <PhraseGenerator
            atisContext={atisContext}
            generatedSid={generatedSid}
            onCreateStrip={onCreateStrip}
            onUpdateStripStatus={onUpdateStripStatus}
          />
        </div>
      </div>
    </div>
  );
}
