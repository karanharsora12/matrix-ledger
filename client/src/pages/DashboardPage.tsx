import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Plus, Users } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { api, type DashboardData } from '@/lib/api';
import { formatCurrency, formatDate, parseDecimal } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

import { CustomerDialog } from '@/components/customers/CustomerDialog';

export function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    api.get<DashboardData>('/dashboard')
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const metrics = data?.metrics;

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        description="An overview of your shop's accounts and recent activity."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowAddCustomer(true)}>
              <Users className="h-4 w-4" />
              Add Customer
            </Button>
            <Button size="sm" onClick={() => navigate({ to: '/bills/new' })}>
              <Plus className="h-4 w-4" />
              Create Bill
            </Button>
          </>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        {loading ? (
          <LoadingState type="cards" />
        ) : error ? (
          <div className="col-span-4">
            <EmptyState
              title="Failed to load dashboard"
              description={error}
              error
              onRetry={load}
            />
          </div>
        ) : (
          <>
            <MetricCard
              label="Total Outstanding"
              value={formatCurrency(parseDecimal(metrics?.totalOutstanding))}
              hint="All unpaid balances"
              valueClass="text-financial-negative"
            />
            <MetricCard
              label="Repairs This Month"
              value={formatCurrency(parseDecimal(metrics?.repairChargesThisMonth))}
              hint="Billed this month"
            />
            <MetricCard
              label="Payments This Month"
              value={formatCurrency(parseDecimal(metrics?.paymentsReceivedThisMonth))}
              hint="Received this month"
              valueClass="text-financial-positive"
            />
            <MetricCard
              label="Total Customers"
              value={metrics?.totalCustomers ?? '0'}
              hint="Active accounts"
            />
          </>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Recent activity */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
          </div>
          <div className="border border-border rounded-md overflow-hidden">
            {loading ? (
              <LoadingState rows={5} columns={5} />
            ) : !data?.recentActivity?.length ? (
              <EmptyState
                title="No recent activity"
                description="Bills and payments will appear here."
                className="py-10"
              />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Customer</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Reference</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Type</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentActivity.map((item, i) => (
                    <tr
                      key={i}
                      className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                      onClick={() => {
                        if (item.type === 'bill') {
                          navigate({ to: `/bills/${(item as any).id || item.reference}` as any });
                        }
                      }}
                    >
                      <td className="px-3 py-2 text-muted-foreground tabular-nums text-xs">
                        {formatDate(item.date)}
                      </td>
                      <td className="px-3 py-2 font-medium text-foreground">{item.customer}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground font-mono">{item.reference}</td>
                      <td className="px-3 py-2">
                        <Badge variant={item.type === 'payment' ? 'success' : 'secondary'} className="text-xs">
                          {item.type === 'payment' ? 'Payment' : 'Bill'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">
                        {formatCurrency(parseDecimal(item.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Outstanding accounts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Outstanding</h2>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate({ to: '/customers' })}>
              View all →
            </Button>
          </div>
          <div className="border border-border rounded-md overflow-hidden">
            {loading ? (
              <LoadingState rows={5} columns={3} />
            ) : !data?.outstandingAccounts?.length ? (
              <EmptyState
                title="No outstanding accounts"
                description="All customers are settled."
                className="py-8"
              />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Customer</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.outstandingAccounts.map((account) => (
                    <tr
                      key={account.id}
                      className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                      onClick={() => navigate({ to: `/customers/${account.id}` as any })}
                    >
                      <td className="px-3 py-2">
                        <div className="font-medium text-foreground text-sm leading-tight">{account.name}</div>
                        {account.mobile && (
                          <div className="text-xs text-muted-foreground">{account.mobile}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        <span className="text-financial-negative font-medium text-sm">
                          {formatCurrency(parseDecimal(account.outstanding_amount))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <CustomerDialog
        open={showAddCustomer}
        onClose={() => setShowAddCustomer(false)}
        onSaved={load}
      />
    </AppLayout>
  );
}

function MetricCard({
  label,
  value,
  hint,
  valueClass,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <div className="border border-border rounded-md bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground font-medium">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums leading-tight ${valueClass ?? 'text-foreground'}`}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
