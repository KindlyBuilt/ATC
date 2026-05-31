// Reusable collapsible section card used across the Home page. Header shows a
// title with an icon, an optional right-side hint, and a Hide/Show toggle. When
// `editMode` is on it also shows a delete (hide for session) button and a drag
// handle for reordering.
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, GripVertical, X } from 'lucide-react';
import type { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  icon?: ReactNode;
  hint?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  testId?: string;
  // Edit-layout extras
  editMode?: boolean;
  onDelete?: () => void;
  dragHandleProps?: Record<string, unknown>;
}

export function SectionCard({
  title,
  icon,
  hint,
  open,
  onOpenChange,
  children,
  testId,
  editMode,
  onDelete,
  dragHandleProps,
}: SectionCardProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card data-testid={testId}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {editMode && (
              <button
                type="button"
                className="-ml-1 cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:text-foreground active:cursor-grabbing"
                aria-label="Drag to reorder"
                data-testid={`drag-${testId}`}
                {...dragHandleProps}
              >
                <GripVertical className="h-4 w-4" />
              </button>
            )}
            {icon}
            {title}
          </CardTitle>
          <div className="flex items-center gap-1">
            {hint ? (
              <span className="hidden font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">
                {hint}
              </span>
            ) : null}
            {editMode && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={onDelete}
                aria-label={`Hide ${title}`}
                data-testid={`delete-${testId}`}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" data-testid={`toggle-${testId}`}>
                {open ? 'Hide' : 'Show'}
                <ChevronDown className={`ml-1.5 h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="grid gap-3">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
