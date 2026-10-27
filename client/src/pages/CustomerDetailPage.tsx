import { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Plus, CreditCard, Pencil, Printer } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { CurrencyDisplay, BalanceBadge } from '@/components/shared/CurrencyDisplay';
import { CustomerDialog } from '@/components/customers/CustomerDialog';
import { PaymentDialog } from '@/components/customers/PaymentDialog';
import { api, type Customer, type LedgerEntry, type PaginatedResponse } from '@/lib/api';
import { formatDate, formatCurrency, parseDecimal } from '@/lib/utils';

interface CustomerDetailParams {
  customerId: string;
}

export function CustomerDetailPage() {
  const { customerId } = useParams({ strict: false }) as CustomerDetailParams;
  const navigate = useNavigate();
  const id = parseInt(customerId ?? '0');

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cust, ledgerRes] = await Promise.all([
        api.get<Customer>(`/customers/${id}`),
        api.get<PaginatedResponse<LedgerEntry>>(`/customers/${id}/ledger?limit=100`),
      ]);
      setCustomer(cust);
      setLedger(ledgerRes.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) {
    return (
      <AppLayout breadcrumb="Customer">
        <LoadingState type="form" rows={6} />
      </AppLayout>
    );
  }

  if (error || !customer) {
    return (
      <AppLayout breadcrumb="Customer">
        <EmptyState title="Customer not found" description={error ?? ''} error onRetry={load} />
      </AppLayout>
    );
  }

  const balance = parseDecimal(customer.currentBalance);
  const balanceType = customer.currentBalanceType ?? 'dr';

  // Calculate totals from ledger
  const totalDebit = ledger.reduce((s, e) => s + parseDecimal(e.debit), 0);
  const totalCredit = ledger.reduce((s, e) => s + parseDecimal(e.credit), 0);

  return (
    <AppLayout breadcrumb={customer.name}>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 pb-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate({ to: '/customers' })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{customer.name}</h1>
            <div className="text-sm text-muted-foreground">
              {customer.mobile && <span className="mr-3">{customer.mobile}</span>}
              {customer.address && <span>{customer.address}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate({ to: '/bills/new' as any })}>
            <Plus className="h-4 w-4" />
            New Bill
          </Button>
          <Button size="sm" onClick={() => setShowPayment(true)}>
            <CreditCard className="h-4 w-4" />
            Receive Payment
          </Button>
        </div>
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-2 gap-px bg-border border border-border rounded-md overflow-hidden sm:grid-cols-4 mb-5">
        <SummaryCell label="Current Balance">
          <BalanceBadge balance={customer.currentBalance ?? '0'} type={balanceType} />
        </SummaryCell>
        <SummaryCell label="Opening Balance">
          <BalanceBadge balance={customer.openingBalance} type={customer.openingBalanceType} />
        </SummaryCell>
        <SummaryCell label="Total Charges">
          <span className="text-sm font-semibold tabular-nums text-financial-negative">
            {formatCurrency(totalDebit)}
          </span>
        </SummaryCell>
        <SummaryCell label="Total Payments">
          <span className="text-sm font-semibold tabular-nums text-financial-positive">
            {formatCurrency(totalCredit)}
          </span>
        </SummaryCell>
      </div>

      {/* Ledger */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Account Ledger</h2>
      </div>

      <div className="border border-border rounded-md overflow-hidden">
        {ledger.length === 0 ? (
          <EmptyState
            title="No transactions"
            description="Transactions will appear here once you create a bill or payment."
            className="py-10"
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Voucher</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Description</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Debit</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Credit</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((entry) => {
                const runningBal = parseDecimal((entry as any).running_balance);
                return (
                  <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-2 text-muted-foreground text-xs tabular-nums">
                      {formatDate(entry.entryDate)}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono text-muted-foreground">
                      {entry.voucherNumber ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-sm max-w-xs truncate">{entry.description}</td>
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
                    <td className="px-3 py-2 text-right tabular-nums text-xs">
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
        )}
      </div>

      {showEdit && (
        <CustomerDialog
          open
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load(); }}
          customer={customer}
        />
      )}

      {showPayment && (
        <PaymentDialog
          open
          onClose={() => setShowPayment(false)}
          onSaved={() => { setShowPayment(false); load(); }}
          customer={customer}
        />
      )}
    </AppLayout>
  );
}

function SummaryCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
