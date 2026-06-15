"use client";

import { Suspense, useState, type ElementType } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  KanbanSquare,
  CreditCard,
  BarChart3,
  Activity,
  Settings,
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  X,
  CalendarDays,
  Check,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Role = "super_admin" | "franchise_admin";
type NavItem = { label: string; href: string; icon: ElementType; exact?: boolean };
type NavConfig = { groups: { label: string; items: NavItem[] }[]; bottom: NavItem[] };

const NAV: Record<Role, NavConfig> = {
  super_admin: {
    groups: [
      {
        label: "Main",
        items: [
          { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
          { label: "Franchises", href: "/dashboard/franchises", icon: Building2 },
          { label: "Leads", href: "/dashboard/leads", icon: KanbanSquare },
          { label: "Payments", href: "/dashboard/payments", icon: CreditCard },
        ],
      },
      {
        label: "Insights",
        items: [
          { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
          { label: "Activity", href: "/dashboard/activity", icon: Activity },
        ],
      },
    ],
    bottom: [{ label: "Settings", href: "/dashboard/settings", icon: Settings }],
  },
  franchise_admin: {
    groups: [
      {
        label: "Main",
        items: [
          { label: "Dashboard", href: "/franchise", icon: LayoutDashboard, exact: true },
          { label: "My Leads", href: "/franchise/leads", icon: KanbanSquare },
          { label: "Payments", href: "/franchise/payments", icon: CreditCard },
        ],
      },
    ],
    bottom: [{ label: "Settings", href: "/franchise/settings", icon: Settings }],
  },
};

const PERIODS = [
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "last_3_months", label: "Last 3 Months" },
  { key: "ytd", label: "Year to Date" },
];

function isActive(item: NavItem, pathname: string) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");
}

function titleFor(pathname: string, nav: NavConfig) {
  if (pathname === "/dashboard/franchises/new") return "Add Franchise";
  if (/^\/dashboard\/franchises\/[^/]+$/.test(pathname)) return "Franchise Detail";
  const all = [...nav.groups.flatMap((g) => g.items), ...nav.bottom];
  const match = [...all].sort((a, b) => b.href.length - a.href.length).find((n) => isActive(n, pathname));
  return match?.label ?? "RAM Admin";
}

function NavLink({ item, pathname, onClick }: { item: NavItem; pathname: string; onClick: () => void }) {
  const active = isActive(item, pathname);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-3 rounded-[var(--radius-button)] px-3 py-2.5 text-[13px] font-medium transition-all duration-[var(--transition-fast)]",
        active
          ? "bg-white/[0.08] text-white"
          : "text-white/60 hover:bg-white/[0.05] hover:text-white/90"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-gold" />
      )}
      <Icon className={cn("h-[18px] w-[18px] transition-colors duration-[var(--transition-fast)]", active ? "text-brand-gold" : "")} />
      {item.label}
    </Link>
  );
}

function PeriodSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const current = sp.get("period") || "this_month";
  const label = PERIODS.find((p) => p.key === current)?.label ?? "This Month";

  function pick(key: string) {
    const params = new URLSearchParams(sp.toString());
    if (key === "this_month") params.delete("period");
    else params.set("period", key);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 items-center gap-2 rounded-[var(--radius-button)] border border-border/60 bg-white px-3 text-sm text-foreground shadow-[var(--shadow-xs)]",
          "transition-all duration-[var(--transition-fast)] hover:shadow-[var(--shadow-sm)] hover:border-border",
        )}
      >
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <span className="hidden sm:inline">{label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-[var(--transition-fast)]", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-[var(--radius-dropdown)] border border-border/50 bg-white shadow-[var(--shadow-lg)] animate-in fade-in-0 zoom-in-95 duration-150">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => pick(p.key)}
                className={cn(
                  "flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm transition-colors duration-[var(--transition-fast)]",
                  p.key === current
                    ? "bg-brand-navy/[0.04] text-brand-navy font-medium"
                    : "text-foreground hover:bg-muted/50",
                )}
              >
                {p.label}
                {p.key === current && <Check className="h-4 w-4 text-brand-gold" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function AppShell({
  role,
  email,
  contextLabel,
  children,
}: {
  role: Role;
  email: string;
  contextLabel: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const nav = NAV[role];
  const title = titleFor(pathname, nav);
  const roleLabel = role === "super_admin" ? "Super Admin" : "Franchise Admin";
  const initials = (email.split("@")[0]?.slice(0, 2) || "U").toUpperCase();
  const homeHref = role === "super_admin" ? "/dashboard" : "/franchise";
  const showPeriod = pathname === "/dashboard";

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="min-h-screen">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={closeMobile} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-brand-navy text-white transition-transform duration-[var(--transition-slow)] lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between gap-2 border-b border-white/[0.08] px-5">
          <Link href={homeHref} className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-button)] bg-brand-gold text-sm font-bold text-brand-navy">
              R
            </span>
            <span className="text-[15px] font-semibold tracking-tight">
              RAM<span className="text-brand-gold">Admin</span>
            </span>
          </Link>
          <button onClick={closeMobile} className="rounded-[var(--radius-button)] p-1.5 text-white/50 transition-colors duration-[var(--transition-fast)] hover:bg-white/10 hover:text-white/80 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Context */}
        <div className="px-5 py-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-white/35">Context</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-white">
            <Building2 className="h-3.5 w-3.5 text-brand-gold" />
            {contextLabel}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-7 overflow-y-auto px-3 py-3">
          {nav.groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} onClick={closeMobile} />
                ))}
              </div>
            </div>
          ))}
          <div className="mt-auto space-y-1">
            {nav.bottom.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} onClick={closeMobile} />
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-white/[0.08] px-5 py-4">
          <p className="text-[11px] font-medium text-white/50">Right Assets Management</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-widest text-white/25">Franchise Portal</p>
        </div>
      </aside>

      {/* Main column */}
      <div className="lg:pl-[260px]">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/50 bg-white/80 px-4 backdrop-blur-md sm:px-6">
          <button onClick={() => setMobileOpen(true)} className="rounded-[var(--radius-button)] p-1.5 text-muted-foreground transition-colors duration-[var(--transition-fast)] hover:bg-muted hover:text-foreground lg:hidden">
            <Menu className="h-5 w-5" />
          </button>

          <h1 className="text-[15px] font-semibold text-brand-navy">{title}</h1>

          <div className="ml-auto flex items-center gap-2">
            {showPeriod && (
              <Suspense fallback={null}>
                <PeriodSelector />
              </Suspense>
            )}

            {/* Bell */}
            <button className="relative rounded-[var(--radius-button)] p-2 text-muted-foreground transition-all duration-[var(--transition-fast)] hover:bg-muted/60 hover:text-foreground">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-gold ring-2 ring-white" />
            </button>

            {/* Profile menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className={cn(
                  "flex items-center gap-2 rounded-[var(--radius-button)] p-1 pr-2 transition-all duration-[var(--transition-fast)]",
                  menuOpen ? "bg-muted" : "hover:bg-muted/50",
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-navy text-xs font-semibold text-white ring-2 ring-brand-navy/10">
                  {initials}
                </span>
                <ChevronDown className={cn("hidden h-3.5 w-3.5 text-muted-foreground transition-transform duration-[var(--transition-fast)] sm:block", menuOpen && "rotate-180")} />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-[var(--radius-dropdown)] border border-border/50 bg-white shadow-[var(--shadow-lg)] animate-in fade-in-0 zoom-in-95 duration-150">
                    <div className="border-b border-border/50 px-4 py-3.5">
                      <p className="truncate text-sm font-medium text-foreground">{email}</p>
                      <span className="mt-1.5 inline-flex items-center rounded-full bg-brand-navy/[0.06] px-2.5 py-0.5 text-[11px] font-semibold text-brand-navy">
                        {roleLabel}
                      </span>
                    </div>
                    <div className="py-1.5">
                      <button
                        onClick={signOut}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-foreground transition-colors duration-[var(--transition-fast)] hover:bg-muted/50"
                      >
                        <LogOut className="h-4 w-4 text-muted-foreground" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-64px)] bg-background">{children}</main>
      </div>
    </div>
  );
}
