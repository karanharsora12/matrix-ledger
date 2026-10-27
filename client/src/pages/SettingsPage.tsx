import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Store, Save } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api, type ShopSettings } from '@/lib/api';
import { LoadingState } from '@/components/shared/LoadingState';

const schema = z.object({
  shopName: z.string().min(1, 'Shop name is required').max(255),
  mobile: z.string().max(20).optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  gstNumber: z.string().max(20).optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

export function SettingsPage() {
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      shopName: '',
      mobile: '',
      address: '',
      gstNumber: '',
    },
  });

  useEffect(() => {
    api.get<ShopSettings>('/settings')
      .then((settings) => {
        reset({
          shopName: settings.shopName || 'Matrix Ledger',
          mobile: settings.mobile || '',
          address: settings.address || '',
          gstNumber: settings.gstNumber || '',
        });
      })
      .catch((err) => {
        toast.error('Failed to load shop settings: ' + err.message);
      })
      .finally(() => setLoading(false));
  }, [reset]);

  const onSubmit = async (data: FormData) => {
    try {
      await api.put<ShopSettings>('/settings', {
        shopName: data.shopName,
        mobile: data.mobile || null,
        address: data.address || null,
        gstNumber: data.gstNumber || null,
      });
      toast.success('Shop settings updated successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update settings');
    }
  };

  return (
    <AppLayout breadcrumb="Settings">
      <PageHeader
        title="Settings"
        description="Configure your repair shop profile and application preferences."
      />

      <div className="max-w-2xl">
        <div className="border border-border rounded-md bg-card p-6">
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-border">
            <div className="p-2 rounded bg-muted text-muted-foreground">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Shop Profile</h2>
              <p className="text-xs text-muted-foreground">
                These details will appear on printed repairing bills, vouchers, and statement headers.
              </p>
            </div>
          </div>

          {loading ? (
            <LoadingState rows={4} type="form" />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="shopName">Shop Name *</Label>
                <Input
                  id="shopName"
                  {...register('shopName')}
                  placeholder="e.g. Matrix Mobile & Electronics Care"
                />
                {errors.shopName && (
                  <p className="text-xs text-destructive">{errors.shopName.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="mobile">Contact Phone / Mobile</Label>
                  <Input
                    id="mobile"
                    {...register('mobile')}
                    placeholder="e.g. +91 98765 43210"
                  />
                  {errors.mobile && (
                    <p className="text-xs text-destructive">{errors.mobile.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gstNumber">GST Number / Tax ID (Optional)</Label>
                  <Input
                    id="gstNumber"
                    {...register('gstNumber')}
                    placeholder="e.g. 27ABCDE1234F1Z5"
                  />
                  {errors.gstNumber && (
                    <p className="text-xs text-destructive">{errors.gstNumber.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">Shop Address</Label>
                <Textarea
                  id="address"
                  {...register('address')}
                  rows={3}
                  placeholder="Street address, shop number, city, pin code"
                />
                {errors.address && (
                  <p className="text-xs text-destructive">{errors.address.message}</p>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
