CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"mobile" varchar(20) NOT NULL,
	"address" text,
	"opening_balance" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"opening_balance_type" varchar(20) DEFAULT 'RECEIVABLE' NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"entry_date" date NOT NULL,
	"voucher_type" varchar(30) NOT NULL,
	"voucher_id" integer,
	"voucher_number" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"debit" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"credit" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"receipt_number" varchar(50) NOT NULL,
	"payment_date" date DEFAULT now() NOT NULL,
	"customer_id" integer NOT NULL,
	"bill_id" integer,
	"amount_received" numeric(12, 2) NOT NULL,
	"payment_method" varchar(50) DEFAULT 'CASH' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_receipt_number_unique" UNIQUE("receipt_number")
);
--> statement-breakpoint
CREATE TABLE "repairing_bills" (
	"id" serial PRIMARY KEY NOT NULL,
	"bill_number" varchar(50) NOT NULL,
	"bill_date" date DEFAULT now() NOT NULL,
	"customer_id" integer NOT NULL,
	"repair_description" text NOT NULL,
	"repair_charges" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"additional_charges" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"discount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"amount_received" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"remaining_balance" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"payment_status" varchar(20) DEFAULT 'UNPAID' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repairing_bills_bill_number_unique" UNIQUE("bill_number")
);
--> statement-breakpoint
CREATE TABLE "shop_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_name" varchar(255) DEFAULT 'Matrix Repairing Works' NOT NULL,
	"tagline" varchar(255) DEFAULT 'Simple Ledger. Clear Hisab.' NOT NULL,
	"phone" varchar(50) DEFAULT '+91 98765 43210' NOT NULL,
	"address" text DEFAULT 'Main Market Road, Near Clock Tower' NOT NULL,
	"currency_symbol" varchar(10) DEFAULT '₹' NOT NULL,
	"bill_terms" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voucher_sequences" (
	"id" serial PRIMARY KEY NOT NULL,
	"sequence_type" varchar(30) NOT NULL,
	"prefix" varchar(10) NOT NULL,
	"current_number" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voucher_sequences_sequence_type_unique" UNIQUE("sequence_type")
);
--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_bill_id_repairing_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."repairing_bills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repairing_bills" ADD CONSTRAINT "repairing_bills_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_customers_name" ON "customers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_customers_mobile" ON "customers" USING btree ("mobile");--> statement-breakpoint
CREATE INDEX "idx_customers_is_active" ON "customers" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_ledger_customer_id" ON "ledger_entries" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_ledger_entry_date" ON "ledger_entries" USING btree ("entry_date");--> statement-breakpoint
CREATE INDEX "idx_ledger_voucher_number" ON "ledger_entries" USING btree ("voucher_number");--> statement-breakpoint
CREATE INDEX "idx_ledger_created_at" ON "ledger_entries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_payments_customer_id" ON "payments" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_payments_date" ON "payments" USING btree ("payment_date");--> statement-breakpoint
CREATE INDEX "idx_payments_receipt_number" ON "payments" USING btree ("receipt_number");--> statement-breakpoint
CREATE INDEX "idx_bills_customer_id" ON "repairing_bills" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_bills_date" ON "repairing_bills" USING btree ("bill_date");--> statement-breakpoint
CREATE INDEX "idx_bills_number" ON "repairing_bills" USING btree ("bill_number");