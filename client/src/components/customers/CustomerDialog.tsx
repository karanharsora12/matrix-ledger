import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api, type Customer } from '@/lib/api';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  mobile: z.string().max(20).optional().or(z.literal('')),
  address: z.string().optional(),
  openingBalance: z.coerce.number().min(0, 'Must be 0 or positive'),
  openingBalanceType: z.enum(['dr', 'cr']),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface CustomerDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: (customer: Customer) => void;
  customer?: Customer | null;
}

export function CustomerDialog({ open, onClose, onSaved, customer }: CustomerDialogProps) {
  const isEdit = !!customer;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: customer
      ? {
          name: customer.name,
          mobile: customer.mobile ?? '',
          address: customer.address ?? '',
          openingBalance: parseFloat(customer.openingBalance),
          openingBalanceType: customer.openingBalanceType,
          notes: customer.notes ?? '',
        }
      : {
          openingBalanceType: 'dr',
          openingBalance: 0,
        },
  });

  const openingBalanceType = watch('openingBalanceType');

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        mobile: data.mobile || null,
        address: data.address || null,
        notes: data.notes || null,
      };

      let saved: Customer;
      if (isEdit && customer) {
        saved = await api.put<Customer>(`/customers/${customer.id}`, payload);
      } else {
        saved = await api.post<Customer>('/customers', payload);
      }

      toast.success(isEdit ? 'Customer updated.' : 'Customer added.');
      reset();
      onSaved(saved);
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save customer.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle>{isEdit ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 py-4 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Customer Name *</Label>
              <Input id="name" {...register('name')} placeholder="Full name" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            {/* Mobile */}
            <div className="space-y-1.5">
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input id="mobile" {...register('mobile')} placeholder="e.g. 9876543210" />
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" {...register('address')} placeholder="Optional" rows={2} />
            </div>

            {/* Opening balance */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="openingBalance">Opening Balance</Label>
                <Input
                  id="openingBalance"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('openingBalance')}
                  className="tabular-nums"
                  disabled={isEdit}
                />
                {errors.openingBalance && (
                  <p className="text-xs text-destructive">{errors.openingBalance.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Balance Type</Label>
                <Select
                  value={openingBalanceType}
                  onValueChange={(v) => setValue('openingBalanceType', v as 'dr' | 'cr')}
                  disabled={isEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dr">DR (Customer Owes)</SelectItem>
                    <SelectItem value="cr">CR (Advance / Credit)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isEdit && (
              <p className="text-xs text-muted-foreground">
                Opening balance cannot be changed after creation.
              </p>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...register('notes')} placeholder="Optional notes" rows={2} />
            </div>
          </div>

          <DialogFooter className="px-6 pb-5 pt-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
