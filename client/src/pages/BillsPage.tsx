import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Plus, Search, Filter, RefreshCw } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { api, type Bill, type PaginatedResponse } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate, formatCurrency, parseDecimal } from '@/lib/utils';
import { Receipt } from 'lucide-react';

function billStatusBadge(status: string) {
  if (status === 'paid') return <Badge variant="success">Paid</Badge>;
  if (status === 'partial') return <Badge variant="partial">Partial</Badge>;
  return <Badge variant="outline" className="text-financial-negative border-financial-negative/30">Unpaid</Badge>;
}

export function BillsPage() {
  const navigate = useNavigate();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const debouncedSearch = useDebounce(search, 300);

  const load = () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: String(page),
      limit: '50',
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(statusFilter !== 'all' && { status: statusFilter }),
    });

    api.get<PaginatedResponse<Bill>>(`/bills?${params}`)
      .then((res) => {
        setBills(res.data);
        setTotalPages(res.pagination.totalPages);
        setTotal(res.pagination.total);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);
  useEffect(() => { load(); }, [debouncedSearch, statusFilter, page]);

  return (
    <AppLayout breadcrumb="Repairing Bills">
      <PageHeader
        title="Repairing Bills"
        description="Create and manage customer repairing bills."
        actions={
          <Button size="sm" onClick={() => navigate({ to: '/bills/new' })}>
            <Plus className="h-4 w-4" />
            New Bill
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={load} aria-label="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <div className="ml-auto text-xs text-muted-foreground">
          {!loading && `${total} bill${total !== 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-md overflow-hidden">
        {loading ? (
          <LoadingState rows={8} columns={7} />
        ) : error ? (
          <EmptyState title="Failed to load bills" description={error} error onRetry={load} />
        ) : bills.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No bills found"
            description={search ? 'Try adjusting your search.' : 'Create your first repairing bill.'}
            action={!search ? { label: 'New Bill', onClick: () => navigate({ to: '/bills/new' }) } : undefined}
          />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Bill No.</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Customer</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Description</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Total</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Balance</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr
                    key={bill.id}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                    onClick={() => navigate({ to: `/bills/${bill.id}` as any })}
                  >
                    <td className="px-3 py-2.5 font-mono text-xs text-primary font-medium">{bill.billNumber}</td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs tabular-nums">{formatDate(bill.billDate)}</td>
                    <td className="px-3 py-2.5 font-medium">{bill.customerName || (bill as any).customer_name || bill.customerId}</td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[200px] truncate">{bill.description}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium">{formatCurrency(parseDecimal(bill.totalAmount))}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs">
                      {parseDecimal(bill.balanceDue) > 0 ? (
                        <span className="text-financial-negative font-medium">
                          {formatCurrency(parseDecimal(bill.balanceDue))}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">{billStatusBadge(bill.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-2 border-t text-xs text-muted-foreground">
                <span>Page {page} of {totalPages}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                    Previous
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
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
