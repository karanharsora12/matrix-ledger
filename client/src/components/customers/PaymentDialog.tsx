import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api, type Customer, type Payment } from '@/lib/api';
import { formatCurrency, parseDecimal, today } from '@/lib/utils';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';

const schema = z.object({
  paymentDate: z.string().min(1, 'Date is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  paymentMethod: z.enum(['cash', 'upi', 'bank_transfer', 'other']),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  customer: Customer;
  billId?: number;
}

export function PaymentDialog({ open, onClose, onSaved, customer, billId }: PaymentDialogProps) {
  const balance = parseDecimal(customer.currentBalance);
  const balanceType = customer.currentBalanceType ?? 'dr';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      paymentDate: today(),
      paymentMethod: 'cash',
    },
  });

  const paymentMethod = watch('paymentMethod');
  const amount = watch('amount');
  const remaining = balance - (parseDecimal(amount) || 0);

  const onSubmit = async (data: FormData) => {
    try {
      await api.post<Payment>('/payments', {
        ...data,
        customerId: customer.id,
        billId: billId ?? null,
        referenceNumber: data.referenceNumber || null,
        notes: data.notes || null,
      });

      toast.success(`Payment of ${formatCurrency(data.amount)} recorded.`);
      reset();
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to record payment.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm p-0">
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle>Receive Payment</DialogTitle>
          <DialogDescription>
            Recording payment for <strong>{customer.name}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Balance display */}
        <div className="px-6 py-3 bg-muted/30 border-y border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current Balance</span>
            <CurrencyDisplay
              value={customer.currentBalance ?? '0'}
              type={balanceType}
              size="md"
            />
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Payment Date *</Label>
                <Input type="date" {...register('paymentDate')} />
                {errors.paymentDate && <p className="text-xs text-destructive">{errors.paymentDate.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  {...register('amount')}
                  className="tabular-nums"
                />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setValue('paymentMethod', v as any)}
              >
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
              <Input {...register('referenceNumber')} placeholder="UPI/NEFT reference (optional)" />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea {...register('notes')} rows={2} placeholder="Optional" />
            </div>

            {/* Remaining balance preview */}
            {amount > 0 && balanceType === 'dr' && (
              <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>Balance after payment</span>
                  <span className={remaining > 0 ? 'text-financial-negative tabular-nums' : 'text-financial-positive tabular-nums'}>
                    {remaining > 0 ? formatCurrency(remaining) + ' DR' : remaining < 0 ? formatCurrency(Math.abs(remaining)) + ' CR (Advance)' : 'Settled'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 pb-5 pt-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
