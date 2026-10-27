// Shared TypeScript types for the server

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export interface CustomerBalance {
  customerId: number;
  currentBalance: string;
  balanceType: 'dr' | 'cr';
}

export interface LedgerSummary {
  openingBalance: string;
  openingBalanceType: 'dr' | 'cr';
  totalDebit: string;
  totalCredit: string;
  closingBalance: string;
  closingBalanceType: 'dr' | 'cr';
}
