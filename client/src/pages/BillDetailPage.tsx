import { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, CreditCard, Printer } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { PaymentDialog } from '@/components/customers/PaymentDialog';
import { api, type Bill, type Customer } from '@/lib/api';
import { formatDate, formatCurrency, parseDecimal } from '@/lib/utils';

function billStatusBadge(status: string) {
  if (status === 'paid') return <Badge variant="success">Paid</Badge>;
  if (status === 'partial') return <Badge variant="partial">Partially Paid</Badge>;
  return <Badge variant="outline" className="text-financial-negative border-financial-negative/30">Unpaid</Badge>;
}

export function BillDetailPage() {
  const { billId } = useParams({ strict: false }) as { billId: string };
  const navigate = useNavigate();
  const id = parseInt(billId ?? '0');

  const [bill, setBill] = useState<Bill | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const b = await api.get<Bill>(`/bills/${id}`);
      setBill(b);
      const c = await api.get<Customer>(`/customers/${b.customerId}`);
      setCustomer(c);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) {
    return <AppLayout breadcrumb="Bill"><LoadingState type="form" rows={6} /></AppLayout>;
  }

  if (error || !bill) {
    return <AppLayout breadcrumb="Bill"><EmptyState title="Bill not found" description={error ?? ''} error onRetry={load} /></AppLayout>;
  }

  const totalAmount = parseDecimal(bill.totalAmount);
  const amountReceived = parseDecimal(bill.amountReceived);
  const balanceDue = parseDecimal(bill.balanceDue);

  return (
    <AppLayout breadcrumb={bill.billNumber}>
      <div className="flex items-start justify-between gap-4 pb-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate({ to: '/bills' })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold font-mono">{bill.billNumber}</h1>
              {billStatusBadge(bill.status)}
            </div>
            <p className="text-sm text-muted-foreground">{formatDate(bill.billDate)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
          {bill.status !== 'paid' && customer && (
            <Button size="sm" onClick={() => setShowPayment(true)}>
              <CreditCard className="h-4 w-4" />
              Receive Payment
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Bill info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer */}
          <div className="border border-border rounded-md p-4">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Customer</h2>
            <div
              className="font-medium text-primary cursor-pointer hover:underline"
              onClick={() => navigate({ to: `/customers/${bill.customerId}` as any })}
            >
              {bill.customerName || (bill as any).customer_name}
            </div>
            {(bill.customerMobile || (bill as any).customer_mobile) && (
              <div className="text-sm text-muted-foreground mt-0.5">{bill.customerMobile || (bill as any).customer_mobile}</div>
            )}
            {(bill.customerAddress || (bill as any).customer_address) && (
              <div className="text-sm text-muted-foreground">{bill.customerAddress || (bill as any).customer_address}</div>
            )}
          </div>

          {/* Repair details */}
          <div className="border border-border rounded-md p-4">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Repair Details</h2>
            <p className="text-sm">{bill.description}</p>
            {bill.notes && (
              <p className="text-xs text-muted-foreground mt-2">{bill.notes}</p>
            )}
          </div>

          {/* Payment history */}
          {bill.payments && bill.payments.length > 0 && (
            <div className="border border-border rounded-md p-4">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Payment History</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Date</th>
                    <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Receipt No.</th>
                    <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Method</th>
                    <th className="pb-2 text-right text-xs font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.payments.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 text-xs text-muted-foreground">{formatDate(p.paymentDate)}</td>
                      <td className="py-2 text-xs font-mono">{p.receiptNumber}</td>
                      <td className="py-2 text-xs capitalize">{p.paymentMethod.replace('_', ' ')}</td>
                      <td className="py-2 text-right tabular-nums font-medium text-financial-positive">
                        {formatCurrency(parseDecimal(p.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        <div>
          <div className="border border-border rounded-md p-4 space-y-3">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bill Summary</h2>
            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Repair Charges</span>
                <span className="tabular-nums">{formatCurrency(parseDecimal(bill.repairCharges))}</span>
              </div>
              {parseDecimal(bill.additionalCharges) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Additional Charges</span>
                  <span className="tabular-nums">{formatCurrency(parseDecimal(bill.additionalCharges))}</span>
                </div>
              )}
              {parseDecimal(bill.discount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="tabular-nums text-financial-positive">- {formatCurrency(parseDecimal(bill.discount))}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total Amount</span>
                <span className="tabular-nums">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Received</span>
                <span className="tabular-nums text-financial-positive">{formatCurrency(amountReceived)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Balance Due</span>
                <span className={`tabular-nums ${balanceDue > 0 ? 'text-financial-negative' : 'text-financial-positive'}`}>
                  {formatCurrency(balanceDue)}
                </span>
              </div>
            </div>

            <div className="mt-2">
              {billStatusBadge(bill.status)}
            </div>
          </div>
        </div>
      </div>

      {showPayment && customer && (
        <PaymentDialog
          open
          onClose={() => setShowPayment(false)}
          onSaved={() => { setShowPayment(false); load(); }}
          customer={customer}
          billId={bill.id}
        />
      )}
    </AppLayout>
  );
}
