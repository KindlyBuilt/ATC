import { useState } from 'react';
import { Router, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Header } from '@/components/Header';
import ToolsPage from '@/pages/Tools';
import StripsPage, { type StatusValue, type Strip } from '@/pages/Strips';
import type { AtisContext } from '@/components/AtisGenerator';
import type { GeneratedSid } from '@/components/SidGenerator';

function AppRouter() {
  const [location] = useLocation();
  const [atisContext, setAtisContext] = useState<AtisContext | undefined>();
  const [generatedSid, setGeneratedSid] = useState<GeneratedSid | undefined>();
  const [strips, setStrips] = useState<Strip[]>([]);

  function updateStripStatus(callsign: string, status: StatusValue): boolean {
    const target = callsign.trim().toUpperCase();
    if (!target) return false;
    const exists = strips.some((strip) => strip.callsign.toUpperCase() === target);
    if (!exists) return false;
    setStrips((current) => current.map((strip) => (
      strip.callsign.toUpperCase() === target ? { ...strip, status } : strip
    )));
    return true;
  }

  if (location !== '/' && location !== '/strips') {
    return <NotFound />;
  }

  return (
    <>
      <section hidden={location !== '/'} aria-hidden={location !== '/'}>
        <ToolsPage
          atisContext={atisContext}
          onAtisContextChange={setAtisContext}
          generatedSid={generatedSid}
          onGeneratedSidChange={setGeneratedSid}
          onCreateStrip={(strip) => setStrips((p) => [strip, ...p])}
          onUpdateStripStatus={updateStripStatus}
        />
      </section>
      <section hidden={location !== '/strips'} aria-hidden={location !== '/strips'}>
        <StripsPage
          strips={strips}
          onStripsChange={setStrips}
          generatedSid={generatedSid}
        />
      </section>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <div className="min-h-dvh">
            <Header />
            <main>
              <AppRouter />
            </main>
            <footer className="mx-auto max-w-7xl px-4 py-8 text-center text-[11px] leading-relaxed text-muted-foreground sm:px-6">
              <div className="font-medium text-foreground/80">
                ATC Tools made by Kindly Built. Contact hello@kindlybuiltweb.com
              </div>
              <div>
                Not for real-world Operations. AI used, no jobs lost. Copyright 2026 Kindly Built.
              </div>
            </footer>
          </div>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
