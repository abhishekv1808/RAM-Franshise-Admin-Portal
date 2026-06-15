import {
  Route,
  ArrowRightLeft,
  ArrowLeftRight,
  Building2,
  Ban,
  ShieldCheck,
  Pencil,
  Activity as ActivityIcon,
  type LucideIcon,
} from "lucide-react";

export type ActivityRow = {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
  franchise_code: string | null;
};

function timeSince(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function render(a: ActivityRow): { icon: LucideIcon; text: string } {
  const d = a.details ?? {};
  switch (a.action) {
    case "lead_routed":
      return { icon: Route, text: `Lead routed to ${d.franchise_code ?? a.franchise_code ?? "—"}` };
    case "status_changed":
      return { icon: ArrowRightLeft, text: `Lead moved ${d.from} → ${d.to}` };
    case "lead_reassigned":
      return { icon: ArrowLeftRight, text: `Lead reassigned ${d.from_franchise ?? "?"} → ${d.to_franchise ?? "?"}` };
    case "franchise_created":
      return { icon: Building2, text: `Franchise created: ${d.name ?? d.code ?? a.franchise_code ?? ""}` };
    case "franchise_updated":
      return { icon: Pencil, text: `Franchise updated${a.franchise_code ? `: ${a.franchise_code}` : ""}` };
    case "franchise_suspended":
      return { icon: Ban, text: `Franchise suspended${a.franchise_code ? `: ${a.franchise_code}` : ""}` };
    case "franchise_reactivated":
      return { icon: ShieldCheck, text: `Franchise reactivated${a.franchise_code ? `: ${a.franchise_code}` : ""}` };
    default:
      return { icon: ActivityIcon, text: a.action.replace(/_/g, " ") };
  }
}

export function ActivityFeed({ rows }: { rows: ActivityRow[] }) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>;
  }
  return (
    <ul className="space-y-0.5">
      {rows.map((a) => {
        const { icon: Icon, text } = render(a);
        return (
          <li
            key={a.id}
            className="flex items-center gap-3 rounded-[var(--radius-button)] px-3 py-2.5 transition-colors duration-[var(--transition-fast)] hover:bg-muted/40"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-icon)] bg-brand-navy/[0.06] text-brand-navy">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">{text}</span>
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{timeSince(a.created_at)}</span>
          </li>
        );
      })}
    </ul>
  );
}
