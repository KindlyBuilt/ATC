import { Link, useLocation } from 'wouter';
import { Logo } from './Logo';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Tools' },
  { href: '/strips', label: 'Flight Strips' },
] as const;

export function Header() {
  const [location] = useLocation();
  return (
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
        <nav className="flex items-center gap-1" aria-label="Primary">
          {NAV.map((n) => {
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
        </nav>
      </div>
    </header>
  );
}
