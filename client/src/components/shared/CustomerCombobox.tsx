import { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, type Customer } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

interface CustomerComboboxProps {
  value: number | null;
  onChange: (customerId: number | null, customer: Customer | null) => void;
  onAddNew?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CustomerCombobox({
  value,
  onChange,
  onAddNew,
  placeholder = 'Search customer...',
  disabled,
}: CustomerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const debouncedSearch = useDebounce(search, 250);

  // Load selected customer name
  useEffect(() => {
    if (value && !selectedCustomer) {
      api.get<Customer>(`/customers/${value}`)
        .then(setSelectedCustomer)
        .catch(() => {});
    }
    if (!value) setSelectedCustomer(null);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get<{ data: Customer[] }>(`/customers?search=${encodeURIComponent(debouncedSearch)}&limit=20`)
      .then((res) => setCustomers(res.data))
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  }, [debouncedSearch, open]);

  const handleSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    onChange(customer.id, customer);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {selectedCustomer ? (
            <span className="truncate">{selectedCustomer.name}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder="Search by name or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
            autoFocus
          />
        </div>
        <div className="max-h-60 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : customers.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No customers found.
            </div>
          ) : (
            customers.map((customer) => (
              <button
                key={customer.id}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left',
                  value === customer.id && 'bg-accent'
                )}
                onClick={() => handleSelect(customer)}
              >
                <Check
                  className={cn(
                    'h-4 w-4 shrink-0',
                    value === customer.id ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="min-w-0">
                  <div className="font-medium truncate">{customer.name}</div>
                  {customer.mobile && (
                    <div className="text-xs text-muted-foreground">{customer.mobile}</div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
        {onAddNew && (
          <div className="border-t p-2">
            <button
              className="flex w-full items-center gap-2 px-2 py-1.5 text-sm text-primary hover:bg-accent rounded-sm"
              onClick={() => { setOpen(false); onAddNew(); }}
            >
              <Plus className="h-4 w-4" />
              Add new customer
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
