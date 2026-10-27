import { type LucideIcon, Inbox, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  error?: boolean;
  onRetry?: () => void;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  error = false,
  onRetry,
}: EmptyStateProps) {
  const DisplayIcon = error ? AlertCircle : Icon;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 text-center',
        className
      )}
    >
      <div
        className={cn(
          'mb-4 flex h-12 w-12 items-center justify-center rounded-full',
          error ? 'bg-destructive/10' : 'bg-muted'
        )}
      >
        <DisplayIcon
          className={cn(
            'h-6 w-6',
            error ? 'text-destructive' : 'text-muted-foreground'
          )}
        />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">{description}</p>
      )}
      <div className="mt-4 flex gap-2">
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
        {action && (
          <Button size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
