import { cn, formatCurrency, parseDecimal } from '@/lib/utils';

interface CurrencyDisplayProps {
  value: string | number | null | undefined;
  type?: 'dr' | 'cr' | 'neutral';
  className?: string;
  showSign?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CurrencyDisplay({
  value,
  type = 'neutral',
  className,
  showSign = false,
  size = 'md',
}: CurrencyDisplayProps) {
  const num = parseDecimal(value);
  const formatted = formatCurrency(num);

  const colorClass =
    type === 'dr'
      ? 'text-financial-negative'
      : type === 'cr'
      ? 'text-financial-positive'
      : 'text-foreground';

  const sizeClass =
    size === 'lg' ? 'text-xl font-semibold' : size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span
      className={cn('tabular-nums font-medium', colorClass, sizeClass, className)}
    >
      {showSign && type === 'dr' && num > 0 ? '+' : ''}
      {formatted}
      {type !== 'neutral' && num !== 0 && (
        <span className="ml-1 text-xs font-normal opacity-70 uppercase">
          {type}
        </span>
      )}
    </span>
  );
}

interface BalanceBadgeProps {
  balance: string | number;
  type: 'dr' | 'cr';
  className?: string;
}

export function BalanceBadge({ balance, type, className }: BalanceBadgeProps) {
  const num = parseDecimal(balance);
  if (num === 0) {
    return (
      <span className={cn('text-xs text-muted-foreground', className)}>Settled</span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium tabular-nums',
        type === 'dr' ? 'text-financial-negative' : 'text-financial-positive',
        className
      )}
    >
      {formatCurrency(num)}
      <span className="opacity-60 uppercase text-[10px]">{type}</span>
    </span>
  );
}
