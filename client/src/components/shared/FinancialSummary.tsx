import { formatCurrency, parseDecimal } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { LedgerSummary } from '@/lib/api';

interface FinancialSummaryProps {
  summary: LedgerSummary;
  className?: string;
}

export function FinancialSummary({ summary, className }: FinancialSummaryProps) {
  const items = [
    {
      label: 'Opening Balance',
      value: parseDecimal(summary.openingBalance),
      type: summary.openingBalanceType,
    },
    {
      label: 'Total Debit',
      value: parseDecimal(summary.totalDebit),
      type: 'dr' as const,
    },
    {
      label: 'Total Credit',
      value: parseDecimal(summary.totalCredit),
      type: 'cr' as const,
    },
    {
      label: 'Closing Balance',
      value: parseDecimal(summary.closingBalance),
      type: summary.closingBalanceType,
      bold: true,
    },
  ];

  return (
    <div className={cn('grid grid-cols-2 gap-px bg-border border border-border rounded-md overflow-hidden sm:grid-cols-4', className)}>
      {items.map(({ label, value, type, bold }) => (
        <div key={label} className="bg-card px-4 py-3">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div
            className={cn(
              'mt-1 tabular-nums',
              bold ? 'text-base font-semibold' : 'text-sm font-medium',
              type === 'dr' ? 'text-financial-negative' : 'text-financial-positive',
              value === 0 && 'text-muted-foreground'
            )}
          >
            {formatCurrency(value)}
            {value !== 0 && (
              <span className="ml-1 text-xs font-normal opacity-60 uppercase">
                {type}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
