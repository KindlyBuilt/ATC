import { Link, useLocation } from 'wouter';
import { Logo } from './Logo';
import { cn } from '@/lib/utils';
import { useAppState } from '@/lib/appState';
import { AlertTriangle } from 'lucide-react';

const HOME_SECTIONS = [
  { id: 'airport-info', label: 'Airport Info' },
  { id: 'notes', label: 'Notes' },
  { id: 'text-generator', label: 'Text Generator' },
  { id: 'detailed-atis', label: 'Detailed ATIS' },
  { id: 'atis-viewer', label: 'ATIS Viewer' },
] as const;

const PAGE_NAV = [
  { href: '/', label: 'Home' },
  { href: '/pdc', label: 'PDC' },
  { href: '/charts', label: 'Charts' },
  { href: '/mass-atis', label: 'Mass ATIS' },
  { href: '/strips', label: 'Flightstrips' },
] as const;

export function Header() {
  const [location, setLocation] = useLocation();
  const { atisUpdateDue, setAtisUpdateDue } = useAppState();

  function jumpToHomeSection(sectionId: string) {
    if (location !== '/') {
      setLocation('/');
    }
    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, location === '/' ? 0 : 80);
  }

  return (
    <>
    {atisUpdateDue && (
      <div
        className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-center text-xs font-semibold text-amber-950"
        role="alert"
        data-testid="banner-atis-update"
      >
        <AlertTriangle className="h-3.5 w-3.5" /> ATIS needs updating — letters and winds were auto-updated on the Mass ATIS page.
        <button className="underline" onClick={() => setAtisUpdateDue(false)} data-testid="button-dismiss-atis-banner">Dismiss</button>
      </div>
    )}
    <header
      className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl"
      data-testid="app-header"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3 text-primary hover-elevate rounded-md px-2 py-1 -ml-2" data-testid="link-home">
          <Logo size={28} />
          <div className="flex flex-col leading-tight">
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <strong className="font-bold text-foreground/85">Kindly Built</strong> by Buckers
            </span>
            <span className="text-base font-semibold text-foreground">ATC Tools</span>
          </div>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1" aria-label="Primary">
          {PAGE_NAV.slice(0, 1).map((n) => {
            const active = n.href === '/' ? location === '/' : location.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover-elevate',
                  active
                    ? 'bg-secondary text-primary border border-primary/30'
                    : 'text-muted-foreground border border-transparent',
                )}
              >
                {n.label}
              </Link>
            );
          })}
          {HOME_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => jumpToHomeSection(section.id)}
              data-testid={`nav-section-${section.id}`}
              className="rounded-md border border-transparent px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover-elevate hover:text-foreground"
            >
              {section.label}
            </button>
          ))}
          <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
          {PAGE_NAV.slice(1).map((n) => {
            const active = location.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover-elevate',
                  active
                    ? 'bg-secondary text-primary border border-primary/30'
                    : 'text-muted-foreground border border-transparent',
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
    </>
  );
}
