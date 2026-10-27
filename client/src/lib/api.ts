// Typed API client with error handling

const API_BASE = '/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let body: any = {};
    try {
      body = await res.json();
    } catch {}
    throw new ApiError(res.status, body.message || res.statusText, body.errors);
  }

  // Handle CSV / non-JSON responses
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
    return res.text() as unknown as T;
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  download: (path: string) =>
    fetch(`${API_BASE}${path}`).then(async (res) => {
      if (!res.ok) throw new ApiError(res.status, 'Download failed');
      const blob = await res.blob();
      const cd = res.headers.get('content-disposition') ?? '';
      const match = cd.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? 'export.csv';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }),
};

// ── Domain types ──────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface Customer {
  id: number;
  name: string;
  mobile: string | null;
  address: string | null;
  openingBalance: string;
  openingBalanceType: 'dr' | 'cr';
  notes: string | null;
  isActive: boolean;
  currentBalance?: string;
  currentBalanceType?: 'dr' | 'cr';
  lastTransaction?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Bill {
  id: number;
  billNumber: string;
  billDate: string;
  customerId: number;
  customerName?: string;
  customerMobile?: string;
  customerAddress?: string;
  description: string;
  repairCharges: string;
  additionalCharges: string;
  discount: string;
  totalAmount: string;
  amountReceived: string;
  balanceDue: string;
  status: 'unpaid' | 'partial' | 'paid';
  notes: string | null;
  payments?: Payment[];
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: number;
  receiptNumber: string;
  paymentDate: string;
  customerId: number;
  customerName?: string;
  billId: number | null;
  billNumber?: string | null;
  amount: string;
  paymentMethod: 'cash' | 'upi' | 'bank_transfer' | 'other';
  referenceNumber: string | null;
  notes: string | null;
  createdAt: string;
}

export interface LedgerEntry {
  id: number;
  entryDate: string;
  customerId: number;
  customerName?: string;
  customerMobile?: string;
  referenceType: 'opening_balance' | 'bill' | 'payment' | 'adjustment';
  referenceId: number | null;
  voucherNumber: string | null;
  description: string;
  debit: string;
  credit: string;
  runningBalance?: string;
  createdAt: string;
}

export interface LedgerSummary {
  openingBalance: string;
  openingBalanceType: 'dr' | 'cr';
  totalDebit: string;
  totalCredit: string;
  closingBalance: string;
  closingBalanceType: 'dr' | 'cr';
}

export interface DashboardData {
  metrics: {
    totalOutstanding: string;
    repairChargesThisMonth: string;
    paymentsReceivedThisMonth: string;
    totalCustomers: string;
  };
  recentActivity: Array<{
    date: string;
    customer: string;
    reference: string;
    type: 'bill' | 'payment';
    amount: string;
    status: string;
  }>;
  outstandingAccounts: Array<{
    id: number;
    name: string;
    mobile: string | null;
    outstanding_amount: string;
    last_activity: string | null;
  }>;
}

export interface ShopSettings {
  shopName: string;
  address: string | null;
  mobile: string | null;
  gstNumber: string | null;
}
