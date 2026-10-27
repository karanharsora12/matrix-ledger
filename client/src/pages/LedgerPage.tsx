import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Download, Printer, RefreshCw, X } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { FinancialSummary } from '@/components/shared/FinancialSummary';
import { CustomerCombobox } from '@/components/shared/CustomerCombobox';
import { api, type LedgerEntry, type LedgerSummary, type PaginatedResponse } from '@/lib/api';
import { formatDate, formatCurrency, parseDecimal, currentMonthStart, today } from '@/lib/utils';
import { BookOpen } from 'lucide-react';

interface LedgerResponse {
  data: LedgerEntry[];
  summary: LedgerSummary;
  filters: { startDate: string; endDate: string };
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  opening_balance: 'Opening Balance',
  bill: 'Repairing Bill',
  payment: 'Payment',
  adjustment: 'Adjustment',
};

export function LedgerPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<LedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Filters
  const [startDate, setStartDate] = useState(currentMonthStart());
  const [endDate, setEndDate] = useState(today());
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [transactionType, setTransactionType] = useState('all');
  const [voucherSearch, setVoucherSearch] = useState('');

  const load = () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: String(page),
      limit: '50',
      startDate,
      endDate,
      transactionType,
      ...(customerId && { customerId: String(customerId) }),
      ...(voucherSearch && { voucherSearch }),
    });

    api.get<LedgerResponse>(`/ledger?${params}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); }, [startDate, endDate, customerId, transactionType, voucherSearch]);
  useEffect(() => { load(); }, [startDate, endDate, customerId, transactionType, voucherSearch, page]);

  const handleExport = () => {
    const params = new URLSearchParams({
      startDate,
      endDate,
      transactionType,
      ...(customerId && { customerId: String(customerId) }),
      ...(voucherSearch && { voucherSearch }),
    });
    api.download(`/ledger/export?${params}`).catch((err) => alert(err.message));
  };

  const handleReset = () => {
    setStartDate(currentMonthStart());
    setEndDate(today());
    setCustomerId(null);
    setTransactionType('all');
    setVoucherSearch('');
    setPage(1);
  };

  return (
    <AppLayout breadcrumb="Ledger Report">
      <PageHeader
        title="Ledger Report"
        description="Review customer charges, payments, and account balances."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </>
        }
      />

      {/* Filters */}
      <div className="border border-border rounded-md p-4 mb-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="space-y-1">
            <Label className="text-xs">From Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To Date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <Label className="text-xs">Customer</Label>
            <CustomerCombobox
              value={customerId}
              onChange={(id) => setCustomerId(id)}
              placeholder="All customers"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={transactionType} onValueChange={setTransactionType}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="bill">Repairing Bill</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="opening_balance">Opening Balance</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Voucher Search</Label>
            <Input
              value={voucherSearch}
              onChange={(e) => setVoucherSearch(e.target.value)}
              placeholder="BILL-0001..."
              className="h-8 text-xs"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleReset}>
            <X className="h-3 w-3 mr-1" />
            Reset
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={load}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
          {data && (
            <span className="ml-auto text-xs text-muted-foreground">
              {data.pagination.total} transaction{data.pagination.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      {data?.summary && (
        <FinancialSummary summary={data.summary} className="mb-4" />
      )}

      {/* Table */}
      <div className="border border-border rounded-md overflow-hidden">
        {loading ? (
          <LoadingState rows={10} columns={7} />
        ) : error ? (
          <EmptyState title="Failed to load ledger" description={error} error onRetry={load} />
        ) : !data?.data?.length ? (
          <EmptyState
            icon={BookOpen}
            title="No transactions found"
            description="Try adjusting your filters or date range."
            onRetry={handleReset}
          />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b bg-muted/80 backdrop-blur-sm">
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Date</th>
                  {!customerId && <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Customer</th>}
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Voucher</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Description</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Debit</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Credit</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((entry) => {
                  const runningBal = parseDecimal((entry as any).running_balance ?? 0);
                  return (
                    <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatDate(entry.entryDate)}
                      </td>
                      {!customerId && (
                        <td className="px-3 py-2">
                          <button
                            className="text-sm text-primary hover:underline font-medium text-left"
                            onClick={() => navigate({ to: `/customers/${entry.customerId}` as any })}
                          >
                            {(entry as any).customer_name}
                          </button>
                        </td>
                      )}
                      <td className="px-3 py-2 text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {entry.voucherNumber ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        {TRANSACTION_TYPE_LABELS[entry.referenceType] ?? entry.referenceType}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground max-w-[200px] truncate hidden md:table-cell">
                        {entry.description}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs">
                        {parseDecimal(entry.debit) > 0 ? (
                          <span className="text-financial-negative font-medium">
                            {formatCurrency(parseDecimal(entry.debit))}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs">
                        {parseDecimal(entry.credit) > 0 ? (
                          <span className="text-financial-positive font-medium">
                            {formatCurrency(parseDecimal(entry.credit))}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs whitespace-nowrap">
                        <span className={runningBal >= 0 ? 'text-financial-negative' : 'text-financial-positive'}>
                          {formatCurrency(Math.abs(runningBal))}
                          <span className="ml-1 text-[10px] opacity-60 uppercase">
                            {runningBal >= 0 ? 'dr' : 'cr'}
                          </span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-2 border-t text-xs text-muted-foreground">
                <span>Page {page} of {data.pagination.totalPages}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                    Previous
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
