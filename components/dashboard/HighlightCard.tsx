import Link from "next/link";
import { ArrowRight, Coins, TrendingUp, Building2 } from "lucide-react";

/**
 * Branded highlight / call-to-action card (bottom-left of the dashboard).
 * Mirrors the reference "promo" card: a headline value, a primary action,
 * and a two-up mini-stat footer — adapted to commission settlement.
 */
export function HighlightCard({
  commissionOwed,
  conversion,
  activeFranchises,
}: {
  commissionOwed: string;
  conversion: number;
  activeFranchises: number;
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-brand-navy to-[#0f1f3d] p-6 text-white shadow-[0_8px_30px_rgba(15,31,61,0.25)]">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-gold/15 blur-3xl" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">
            Commission Owed
          </p>
          <p className="font-heading mt-2 text-3xl font-extrabold tracking-tight leading-none">
            {commissionOwed}
          </p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gold/15 text-brand-gold ring-1 ring-brand-gold/20">
          <Coins className="h-5 w-5" />
        </span>
      </div>

      <p className="relative mt-3 max-w-[34ch] text-[13px] leading-relaxed text-white/55">
        Settle outstanding partner commissions to keep your franchise network healthy and motivated.
      </p>

      <Link
        href="/dashboard/payments"
        className="relative mt-4 inline-flex w-fit items-center gap-2 rounded-lg bg-brand-gold px-4 py-2 text-[13px] font-semibold text-brand-navy shadow-[0_2px_8px_rgba(201,168,76,0.3)] transition-all duration-150 hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] hover:brightness-105 active:scale-[0.97]"
      >
        Review payments
        <ArrowRight className="h-4 w-4" />
      </Link>

      {/* Two-up mini-stat footer */}
      <div className="relative mt-auto grid grid-cols-2 gap-3 border-t border-white/[0.08] pt-4">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-white/45">
            <TrendingUp className="h-3.5 w-3.5 text-brand-gold" />
            Conversion
          </p>
          <p className="font-heading mt-1 text-lg font-bold tabular-nums">{conversion}%</p>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-white/45">
            <Building2 className="h-3.5 w-3.5 text-brand-gold" />
            Active
          </p>
          <p className="font-heading mt-1 text-lg font-bold tabular-nums">{activeFranchises}</p>
        </div>
      </div>
    </div>
  );
}
