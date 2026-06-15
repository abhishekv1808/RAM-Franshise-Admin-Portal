import {
  Route,
  ArrowRightLeft,
  ArrowLeftRight,
  Building2,
  Pencil,
  Ban,
  ShieldCheck,
  IndianRupee,
  BadgeCheck,
  Undo2,
  Wallet,
  Activity,
  type LucideIcon,
} from "lucide-react";

import { formatINR } from "./format";

// Action groups for the activity-type filter.
export const ACTION_GROUPS: Record<string, string[]> = {
  lead: ["lead_routed", "status_changed", "lead_reassigned"],
  payment: ["payment_recorded", "payment_verified", "payment_cancelled", "payment_refunded"],
  franchise: ["franchise_created", "franchise_updated", "franchise_suspended", "franchise_reactivated"],
  commission: ["commission_settled"],
};

export const ACTIVITY_TYPES = [
  { key: "lead", label: "Leads" },
  { key: "payment", label: "Payments" },
  { key: "franchise", label: "Franchises" },
  { key: "commission", label: "Commission" },
];

export function actionsForGroup(group: string | undefined | null): string[] | null {
  if (!group) return null;
  return ACTION_GROUPS[group] ?? null;
}

export type ActivityRecord = {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  franchise_code: string | null;
  actor_name: string | null;
};

const cap = (s: unknown) => String(s ?? "").replace(/_/g, " ");

// Humanized description + icon. `paymentAmount` is looked up for payment events
// whose log details don't carry the amount (verify/cancel).
export function describeActivity(
  a: ActivityRecord,
  paymentAmount?: number | null
): { icon: LucideIcon; text: string } {
  const d = a.details ?? {};
  const fc = a.franchise_code ?? "—";
  const inr = (v: unknown) => formatINR(Number(v ?? 0));
  switch (a.action) {
    case "lead_routed":
      return { icon: Route, text: `Lead routed to ${d.franchise_code ?? fc}` };
    case "status_changed":
      return { icon: ArrowRightLeft, text: `Lead moved ${cap(d.from)} → ${cap(d.to)}` };
    case "lead_reassigned":
      return { icon: ArrowLeftRight, text: `Lead reassigned ${d.from_franchise ?? "?"} → ${d.to_franchise ?? "?"}` };
    case "franchise_created":
      return { icon: Building2, text: `Franchise created — ${d.name ?? d.code ?? fc}` };
    case "franchise_updated":
      return { icon: Pencil, text: `Franchise updated — ${fc}` };
    case "franchise_suspended":
      return { icon: Ban, text: `Franchise suspended — ${fc}` };
    case "franchise_reactivated":
      return { icon: ShieldCheck, text: `Franchise reactivated — ${fc}` };
    case "payment_recorded":
      return { icon: IndianRupee, text: `Payment recorded — ${inr(d.amount)}` };
    case "payment_verified":
      return { icon: BadgeCheck, text: `Payment verified — ${inr(paymentAmount)}` };
    case "payment_cancelled":
      return { icon: Ban, text: `Payment cancelled — ${inr(paymentAmount)}` };
    case "payment_refunded":
      return { icon: Undo2, text: `Payment refunded — ${inr(d.amount)}` };
    case "commission_settled":
      return { icon: Wallet, text: `Commission settled — ${fc} ${inr(d.amount)}` };
    default:
      return { icon: Activity, text: cap(a.action) };
  }
}
