import { db } from '../db/index.js';
import {
  customers,
  repairingBills,
  payments,
  ledgerEntries,
} from '../db/schema.js';
import { generateVoucherNumber } from './voucher.service.js';
import { eq } from 'drizzle-orm';

export interface CreateBillInput {
  billDate: string;
  customerId: number;
  description: string;
  repairCharges: number;
  additionalCharges?: number;
  discount?: number;
  amountReceived?: number;
  notes?: string | null;
  paymentMethod?: 'cash' | 'upi' | 'bank_transfer' | 'other';
  paymentReference?: string | null;
}

export interface CreatePaymentInput {
  paymentDate: string;
  customerId: number;
  billId?: number | null;
  amount: number;
  paymentMethod: 'cash' | 'upi' | 'bank_transfer' | 'other';
  referenceNumber?: string | null;
  notes?: string | null;
}

/**
 * Create a repairing bill atomically with optional initial payment.
 * All related ledger entries are created within the same transaction.
 */
export async function createBill(input: CreateBillInput) {
  return await db.transaction(async (tx) => {
    const repairCharges = input.repairCharges ?? 0;
    const additionalCharges = input.additionalCharges ?? 0;
    const discount = input.discount ?? 0;
    const amountReceived = input.amountReceived ?? 0;

    const totalAmount = Math.max(0, repairCharges + additionalCharges - discount);
    const remainingBalance = Math.max(0, totalAmount - amountReceived);

    let paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' = 'UNPAID';
    if (amountReceived >= totalAmount && totalAmount > 0) {
      paymentStatus = 'PAID';
    } else if (amountReceived > 0) {
      paymentStatus = 'PARTIALLY_PAID';
    }

    // Generate bill number
    const billNumber = await generateVoucherNumber('BILL', tx as any);

    // Insert the bill
    const [bill] = await tx
      .insert(repairingBills)
      .values({
        billNumber,
        billDate: input.billDate,
        customerId: input.customerId,
        repairDescription: input.description,
        repairCharges: repairCharges.toFixed(2),
        additionalCharges: additionalCharges.toFixed(2),
        discount: discount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        amountReceived: amountReceived.toFixed(2),
        remainingBalance: remainingBalance.toFixed(2),
        paymentStatus,
        notes: input.notes ?? null,
      })
      .returning();

    // Create ledger entry for the bill (debit - customer owes)
    await tx.insert(ledgerEntries).values({
      entryDate: input.billDate,
      customerId: input.customerId,
      voucherType: 'REPAIR_BILL',
      voucherId: bill.id,
      voucherNumber: billNumber,
      description: `Repairing Charges: ${input.description}`,
      debit: totalAmount.toFixed(2),
      credit: '0.00',
    });

    let receiptNumber: string | null = null;

    // If there's an initial payment, record it too
    if (amountReceived > 0) {
      receiptNumber = await generateVoucherNumber('RECEIPT', tx as any);
      const method = (input.paymentMethod ?? 'cash').toUpperCase();
      const paymentNotes = input.paymentReference
        ? `Payment against Bill #${billNumber} (${input.paymentReference})`
        : `Payment against Bill #${billNumber}`;

      const [payment] = await tx
        .insert(payments)
        .values({
          receiptNumber,
          paymentDate: input.billDate,
          customerId: input.customerId,
          billId: bill.id,
          amountReceived: amountReceived.toFixed(2),
          paymentMethod: method,
          notes: paymentNotes,
        })
        .returning();

      // Create ledger entry for the payment (credit - customer paid)
      await tx.insert(ledgerEntries).values({
        entryDate: input.billDate,
        customerId: input.customerId,
        voucherType: 'PAYMENT',
        voucherId: payment.id,
        voucherNumber: receiptNumber,
        description: `Payment against Bill #${billNumber} (${method})`,
        debit: '0.00',
        credit: amountReceived.toFixed(2),
      });
    }

    return { bill, receiptNumber };
  });
}

/**
 * Create a standalone payment for a customer (advance or against a bill).
 * If billId is provided, updates the bill status.
 */
export async function createPayment(input: CreatePaymentInput) {
  return await db.transaction(async (tx) => {
    const receiptNumber = await generateVoucherNumber('RECEIPT', tx as any);
    const method = (input.paymentMethod ?? 'cash').toUpperCase();

    let billNumber: string | null = null;
    if (input.billId) {
      const [b] = await tx
        .select()
        .from(repairingBills)
        .where(eq(repairingBills.id, input.billId));
      if (b) {
        billNumber = b.billNumber;
      }
    }

    const descNote = billNumber
      ? `Payment against Bill #${billNumber} (${method})`
      : `Advance payment received (${method})`;

    const notes = input.referenceNumber
      ? `${descNote} - Ref: ${input.referenceNumber}`
      : (input.notes || descNote);

    const [payment] = await tx
      .insert(payments)
      .values({
        receiptNumber,
        paymentDate: input.paymentDate,
        customerId: input.customerId,
        billId: input.billId ?? null,
        amountReceived: input.amount.toFixed(2),
        paymentMethod: method,
        notes,
      })
      .returning();

    // Create ledger entry (credit)
    await tx.insert(ledgerEntries).values({
      entryDate: input.paymentDate,
      customerId: input.customerId,
      voucherType: 'PAYMENT',
      voucherId: payment.id,
      voucherNumber: receiptNumber,
      description: billNumber
        ? `Payment received via ${method} against Bill #${billNumber}${input.notes ? ' - ' + input.notes : ''}`
        : `Advance payment received via ${method}${input.notes ? ' - ' + input.notes : ''}`,
      debit: '0.00',
      credit: input.amount.toFixed(2),
    });

    // If payment is against a specific bill, update bill status
    if (input.billId) {
      const [bill] = await tx
        .select()
        .from(repairingBills)
        .where(eq(repairingBills.id, input.billId));

      if (bill) {
        const totalPaid = parseFloat(bill.amountReceived) + input.amount;
        const totalAmount = parseFloat(bill.totalAmount);
        const newRemaining = Math.max(0, totalAmount - totalPaid);

        let newStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' = 'UNPAID';
        if (totalPaid >= totalAmount) {
          newStatus = 'PAID';
        } else if (totalPaid > 0) {
          newStatus = 'PARTIALLY_PAID';
        }

        await tx
          .update(repairingBills)
          .set({
            amountReceived: totalPaid.toFixed(2),
            remainingBalance: newRemaining.toFixed(2),
            paymentStatus: newStatus,
            updatedAt: new Date(),
          })
          .where(eq(repairingBills.id, input.billId));
      }
    }

    return payment;
  });
}

/**
 * Create opening balance ledger entry for a new customer.
 */
export async function createOpeningBalanceLedgerEntry(
  customerId: number,
  amount: number,
  type: 'dr' | 'cr' | 'RECEIVABLE' | 'ADVANCE',
  tx?: typeof db
) {
  if (amount === 0) return;

  const client = tx ?? db;
  const isDr = type === 'dr' || type === 'RECEIVABLE';

  await (client as typeof db).insert(ledgerEntries).values({
    entryDate: new Date().toISOString().split('T')[0],
    customerId,
    voucherType: 'OPENING_BALANCE',
    voucherId: null,
    voucherNumber: `OB-CUST-${customerId}`,
    description: isDr
      ? 'Opening Balance (Receivable / Debit)'
      : 'Opening Balance (Advance / Credit)',
    debit: isDr ? amount.toFixed(2) : '0.00',
    credit: !isDr ? amount.toFixed(2) : '0.00',
  });
}
