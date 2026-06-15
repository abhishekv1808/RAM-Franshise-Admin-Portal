import { z } from "zod";

export const PAYMENT_METHODS = [
  { key: "cash", label: "Cash" },
  { key: "bank_transfer", label: "Bank Transfer" },
  { key: "upi", label: "UPI" },
  { key: "cheque", label: "Cheque" },
  { key: "card", label: "Card" },
] as const;

export const recordPaymentSchema = z.object({
  franchiseId: z.string().uuid("Choose a franchise"),
  amount: z.number({ message: "Amount is required" }).positive("Amount must be greater than 0"),
  method: z.enum(["cash", "bank_transfer", "upi", "cheque", "card"]),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the date paid"),
  clientName: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export type PaymentRow = {
  id: string;
  client_name: string | null;
  amount: number;
  commission_amount: number;
  payment_method: string | null;
  status: string;
  kind: string;
  paid_at: string;
  created_at: string;
  franchise_code: string | null;
  reverses_id: string | null;
  settlement_id: string | null;
  notes: string | null;
};

export type LedgerRow = {
  franchise_id: string;
  name: string;
  code: string;
  gross_collected: number;
  commission_earned: number;
  commission_settled: number;
  commission_owed: number;
  pending_count: number;
};

export type ActionResult = { ok: true } | { ok: false; error: string };
export type RecordResult =
  | { ok: true; id: string }
  | { ok: false; error: string; field?: keyof RecordPaymentInput };
