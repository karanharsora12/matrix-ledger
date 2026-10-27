import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Plus, Search, RefreshCw, Filter } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { BalanceBadge } from '@/components/shared/CurrencyDisplay';
import { CustomerDialog } from '@/components/customers/CustomerDialog';
import { api, type Customer, type PaginatedResponse } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate, formatCurrency, parseDecimal } from '@/lib/utils';
import { Users } from 'lucide-react';

export function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [balanceFilter, setBalanceFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
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
      ...(balanceFilter !== 'all' && { balanceFilter }),
    });

    api.get<PaginatedResponse<Customer>>(`/customers?${params}`)
      .then((res) => {
        setCustomers(res.data);
        setTotalPages(res.pagination.totalPages);
        setTotal(res.pagination.total);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, balanceFilter]);

  useEffect(() => {
    load();
  }, [debouncedSearch, balanceFilter, page]);

  return (
    <AppLayout breadcrumb="Customers">
      <PageHeader
        title="Customers"
        description="Manage customer accounts and outstanding balances."
        actions={
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8"
          />
        </div>
        <Select value={balanceFilter} onValueChange={setBalanceFilter}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            <SelectItem value="outstanding">Outstanding</SelectItem>
            <SelectItem value="advance">Advance</SelectItem>
            <SelectItem value="settled">Settled</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={load} aria-label="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <div className="ml-auto text-xs text-muted-foreground">
          {!loading && `${total} customer${total !== 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-md overflow-hidden">
        {loading ? (
          <LoadingState rows={8} columns={6} />
        ) : error ? (
          <EmptyState title="Failed to load customers" description={error} error onRetry={load} />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers found"
            description={search ? 'Try adjusting your search.' : 'Add your first customer to get started.'}
            action={!search ? { label: 'Add Customer', onClick: () => setShowAddDialog(true) } : undefined}
          />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Customer</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Mobile</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Opening Balance</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Current Balance</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Last Transaction</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                    onClick={() => navigate({ to: `/customers/${c.id}` as any })}
                  >
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-foreground">{c.name}</div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs tabular-nums">
                      {c.mobile ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <BalanceBadge
                        balance={c.openingBalance}
                        type={c.openingBalanceType}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <BalanceBadge
                        balance={c.currentBalance ?? '0'}
                        type={c.currentBalanceType ?? 'dr'}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs">
                      {c.lastTransaction ? formatDate(c.lastTransaction) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-2 border-t text-xs text-muted-foreground">
                <span>Page {page} of {totalPages}</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <CustomerDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSaved={load}
      />
    </AppLayout>
  );
}
