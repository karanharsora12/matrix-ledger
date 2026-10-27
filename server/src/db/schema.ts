import {
  pgTable,
  serial,
  varchar,
  text,
  numeric,
  integer,
  timestamp,
  date,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ── Tables matching existing PostgreSQL database ─────────────────────────────

export const shopSettings = pgTable('shop_settings', {
  id: serial('id').primaryKey(),
  shopName: varchar('shop_name', { length: 255 }).notNull().default('Matrix Repairing Works'),
  tagline: varchar('tagline', { length: 255 }).notNull().default('Simple Ledger. Clear Hisab.'),
  phone: varchar('phone', { length: 50 }).notNull().default('+91 98765 43210'),
  address: text('address').notNull().default('Main Market Road, Near Clock Tower'),
  currencySymbol: varchar('currency_symbol', { length: 10 }).notNull().default('₹'),
  billTerms: text('bill_terms'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const voucherSequences = pgTable('voucher_sequences', {
  id: serial('id').primaryKey(),
  sequenceType: varchar('sequence_type', { length: 30 }).notNull().unique(),
  prefix: varchar('prefix', { length: 10 }).notNull(),
  currentNumber: integer('current_number').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const customers = pgTable(
  'customers',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    mobile: varchar('mobile', { length: 20 }).notNull(),
    address: text('address'),
    openingBalance: numeric('opening_balance', { precision: 12, scale: 2 })
      .notNull()
      .default('0.00'),
    openingBalanceType: varchar('opening_balance_type', { length: 20 })
      .notNull()
      .default('RECEIVABLE'),
    notes: text('notes'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_customers_name').on(table.name),
    index('idx_customers_mobile').on(table.mobile),
    index('idx_customers_is_active').on(table.isActive),
  ]
);

export const repairingBills = pgTable(
  'repairing_bills',
  {
    id: serial('id').primaryKey(),
    billNumber: varchar('bill_number', { length: 50 }).notNull().unique(),
    billDate: date('bill_date').notNull().defaultNow(),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id),
    repairDescription: text('repair_description').notNull(),
    repairCharges: numeric('repair_charges', { precision: 12, scale: 2 })
      .notNull()
      .default('0.00'),
    additionalCharges: numeric('additional_charges', { precision: 12, scale: 2 })
      .notNull()
      .default('0.00'),
    discount: numeric('discount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    amountReceived: numeric('amount_received', { precision: 12, scale: 2 })
      .notNull()
      .default('0.00'),
    remainingBalance: numeric('remaining_balance', { precision: 12, scale: 2 })
      .notNull()
      .default('0.00'),
    paymentStatus: varchar('payment_status', { length: 20 }).notNull().default('UNPAID'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_bills_customer_id').on(table.customerId),
    index('idx_bills_date').on(table.billDate),
    index('idx_bills_number').on(table.billNumber),
  ]
);

export const payments = pgTable(
  'payments',
  {
    id: serial('id').primaryKey(),
    receiptNumber: varchar('receipt_number', { length: 50 }).notNull().unique(),
    paymentDate: date('payment_date').notNull().defaultNow(),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id),
    billId: integer('bill_id').references(() => repairingBills.id),
    amountReceived: numeric('amount_received', { precision: 12, scale: 2 }).notNull(),
    paymentMethod: varchar('payment_method', { length: 50 }).notNull().default('CASH'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_payments_customer_id').on(table.customerId),
    index('idx_payments_date').on(table.paymentDate),
    index('idx_payments_receipt_number').on(table.receiptNumber),
  ]
);

export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: serial('id').primaryKey(),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id),
    entryDate: date('entry_date').notNull(),
    voucherType: varchar('voucher_type', { length: 30 }).notNull(),
    voucherId: integer('voucher_id'),
    voucherNumber: varchar('voucher_number', { length: 50 }).notNull(),
    description: text('description').notNull(),
    debit: numeric('debit', { precision: 12, scale: 2 }).notNull().default('0.00'),
    credit: numeric('credit', { precision: 12, scale: 2 }).notNull().default('0.00'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_ledger_customer_id').on(table.customerId),
    index('idx_ledger_entry_date').on(table.entryDate),
    index('idx_ledger_voucher_number').on(table.voucherNumber),
    index('idx_ledger_created_at').on(table.createdAt),
  ]
);

// ── Relations ──────────────────────────────────────────────────────────────────

export const customersRelations = relations(customers, ({ many }) => ({
  bills: many(repairingBills),
  payments: many(payments),
  ledgerEntries: many(ledgerEntries),
}));

export const repairingBillsRelations = relations(repairingBills, ({ one, many }) => ({
  customer: one(customers, {
    fields: [repairingBills.customerId],
    references: [customers.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  customer: one(customers, {
    fields: [payments.customerId],
    references: [customers.id],
  }),
  bill: one(repairingBills, {
    fields: [payments.billId],
    references: [repairingBills.id],
  }),
}));

export const ledgerEntriesRelations = relations(ledgerEntries, ({ one }) => ({
  customer: one(customers, {
    fields: [ledgerEntries.customerId],
    references: [customers.id],
  }),
}));
