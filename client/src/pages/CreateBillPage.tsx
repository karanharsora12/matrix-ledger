import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { CustomerCombobox } from '@/components/shared/CustomerCombobox';
import { CustomerDialog } from '@/components/customers/CustomerDialog';
import { api, type Customer } from '@/lib/api';
import { formatCurrency, today } from '@/lib/utils';

const schema = z.object({
  billDate: z.string().min(1),
  customerId: z.number({ required_error: 'Customer is required' }).int().positive(),
  description: z.string().min(1, 'Description is required'),
  repairCharges: z.coerce.number().min(0, 'Must be 0 or more'),
  additionalCharges: z.coerce.number().min(0),
  discount: z.coerce.number().min(0),
  amountReceived: z.coerce.number().min(0),
  notes: z.string().optional(),
  paymentMethod: z.enum(['cash', 'upi', 'bank_transfer', 'other']),
  paymentReference: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function CreateBillPage() {
  const navigate = useNavigate();
  const [nextNumber, setNextNumber] = useState('...');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      billDate: today(),
      repairCharges: 0,
      additionalCharges: 0,
      discount: 0,
      amountReceived: 0,
      paymentMethod: 'cash',
    },
  });

  // Load next bill number
  useEffect(() => {
    api.get<{ nextNumber: string }>('/bills/next-number')
      .then((r) => setNextNumber(r.nextNumber))
      .catch(() => {});
  }, []);

  // Watched values for live calculation
  const repairCharges = watch('repairCharges') ?? 0;
  const additionalCharges = watch('additionalCharges') ?? 0;
  const discount = watch('discount') ?? 0;
  const amountReceived = watch('amountReceived') ?? 0;
  const paymentMethod = watch('paymentMethod');

  const subtotal = Number(repairCharges) + Number(additionalCharges);
  const totalAmount = Math.max(0, subtotal - Number(discount));
  const balanceDue = Math.max(0, totalAmount - Number(amountReceived));
  const advance = Math.max(0, Number(amountReceived) - totalAmount);

  let paymentStatus = 'Unpaid';
  if (Number(amountReceived) >= totalAmount && totalAmount > 0) {
    paymentStatus = 'Paid';
  } else if (Number(amountReceived) > 0) {
    paymentStatus = 'Partially Paid';
  }

  const onSubmit = async (data: FormData) => {
    try {
      const result = await api.post<{ bill: any; receiptNumber: string | null }>('/bills', {
        ...data,
        repairCharges: Number(data.repairCharges),
        additionalCharges: Number(data.additionalCharges),
        discount: Number(data.discount),
        amountReceived: Number(data.amountReceived),
      });

      toast.success(`Bill ${result.bill.billNumber} created successfully.`);
      navigate({ to: `/bills/${result.bill.id}` as any });
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to create bill.');
    }
  };

  return (
    <AppLayout breadcrumb="New Bill">
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate({ to: '/bills' })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">New Repairing Bill</h1>
          <p className="text-sm text-muted-foreground">Bill No: <span className="font-mono font-medium">{nextNumber}</span></p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: Sections A + B */}
          <div className="lg:col-span-2 space-y-5">
            {/* Section A: Bill Details */}
            <div className="border border-border rounded-md p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Bill Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Bill Date *</Label>
                  <Input type="date" {...register('billDate')} />
                  {errors.billDate && <p className="text-xs text-destructive">{errors.billDate.message}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Customer *</Label>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => setShowAddCustomer(true)}
                  >
                    + Add New
                  </button>
                </div>
                <CustomerCombobox
                  value={watch('customerId') ?? null}
                  onChange={(id, cust) => {
                    setValue('customerId', id ?? 0 as any);
                    setSelectedCustomer(cust);
                  }}
                  onAddNew={() => setShowAddCustomer(true)}
                />
                {errors.customerId && <p className="text-xs text-destructive">{errors.customerId.message}</p>}
                {selectedCustomer && (
                  <p className="text-xs text-muted-foreground">
                    Balance: {formatCurrency(Number(selectedCustomer.currentBalance ?? 0))}
                    {' '}{(selectedCustomer.currentBalanceType === 'cr' || (selectedCustomer.currentBalanceType as any) === 'ADVANCE') ? 'CR (Advance)' : 'DR (Outstanding)'}
                  </p>
                )}
              </div>
            </div>

            {/* Section B: Repair Details */}
            <div className="border border-border rounded-md p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Repair Details</h2>

              <div className="space-y-1.5">
                <Label>Repairing Description *</Label>
                <Textarea
                  {...register('description')}
                  placeholder="e.g. Screen replacement, battery repair..."
                  rows={3}
                />
                {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Repair Charges (₹) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('repairCharges')}
                    className="tabular-nums"
                  />
                  {errors.repairCharges && <p className="text-xs text-destructive">{errors.repairCharges.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Additional Charges (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('additionalCharges')}
                    className="tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Discount (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('discount')}
                    className="tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea {...register('notes')} rows={2} placeholder="Optional internal notes" />
              </div>
            </div>

            {/* Payment method (shows when amount > 0) */}
            {Number(amountReceived) > 0 && (
              <div className="border border-border rounded-md p-5 space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Payment Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={(v) => setValue('paymentMethod', v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Reference Number</Label>
                    <Input {...register('paymentReference')} placeholder="UPI/NEFT reference" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Payment Summary (sticky) */}
          <div>
            <div className="border border-border rounded-md p-5 space-y-3 sticky top-5">
              <h2 className="text-sm font-semibold text-foreground">Payment Summary</h2>
              <Separator />

              <div className="space-y-2 text-sm">
                <SummaryRow label="Repair Charges" value={formatCurrency(Number(repairCharges))} />
                {Number(additionalCharges) > 0 && (
                  <SummaryRow label="Additional Charges" value={formatCurrency(Number(additionalCharges))} />
                )}
                <SummaryRow label="Subtotal" value={formatCurrency(subtotal)} />
                {Number(discount) > 0 && (
                  <SummaryRow label="Discount" value={`- ${formatCurrency(Number(discount))}`} valueClass="text-financial-positive" />
                )}
                <Separator />
                <SummaryRow label="Total Amount" value={formatCurrency(totalAmount)} bold />
              </div>

              <div className="pt-2 space-y-1.5">
                <Label>Amount Received (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('amountReceived')}
                  className="tabular-nums text-base h-10"
                  placeholder="0.00"
                />
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <SummaryRow
                  label="Balance Due"
                  value={formatCurrency(balanceDue)}
                  valueClass={balanceDue > 0 ? 'text-financial-negative font-semibold' : 'text-financial-positive'}
                />
                {advance > 0 && (
                  <SummaryRow
                    label="Advance Credit"
                    value={formatCurrency(advance)}
                    valueClass="text-financial-positive"
                  />
                )}
              </div>

              {/* Status indicator */}
              <div className={`text-center text-xs font-medium py-1.5 rounded ${
                paymentStatus === 'Paid'
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : paymentStatus === 'Partially Paid'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
              }`}>
                {paymentStatus}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Bill
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => navigate({ to: '/bills' })}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </form>

      {showAddCustomer && (
        <CustomerDialog
          open
          onClose={() => setShowAddCustomer(false)}
          onSaved={(cust) => {
            setShowAddCustomer(false);
            setSelectedCustomer(cust);
            setValue('customerId', cust.id);
          }}
        />
      )}
    </AppLayout>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  valueClass,
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
      <span className={`tabular-nums ${bold ? 'font-semibold' : ''} ${valueClass ?? ''}`}>{value}</span>
    </div>
  );
}
