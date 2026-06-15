"use client";

import { Suspense, useState, useEffect, type ElementType } from "react";
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
  Search,
  HelpCircle,
  Download,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/* ─── Types & Config ─── */
type Role = "super_admin" | "franchise_admin";
type NavItem = { label: string; href: string; icon: ElementType; exact?: boolean; badge?: number };
type NavConfig = { groups: { label: string; items: NavItem[] }[]; bottom: NavItem[] };

const SIDEBAR_W = 260;
const SIDEBAR_W_MINI = 76;

const NAV: Record<Role, NavConfig> = {
  super_admin: {
    groups: [
      {
        label: "Main Menu",
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
      {
        label: "Account",
        items: [
          { label: "Help Center", href: "/dashboard", icon: HelpCircle, exact: true },
          { label: "Settings", href: "/dashboard/settings", icon: Settings },
        ],
      },
    ],
    bottom: [],
  },
  franchise_admin: {
    groups: [
      {
        label: "Main Menu",
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

/* ─── NavLink — dual-mode: expanded (label) & collapsed (icon + tooltip) ─── */
function NavLink({
  item,
  pathname,
  onClick,
  mini,
}: {
  item: NavItem;
  pathname: string;
  onClick: () => void;
  mini: boolean;
}) {
  const active = isActive(item, pathname);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={mini ? item.label : undefined}
      className={cn(
        "group/nav relative flex items-center rounded-lg text-[13px] font-medium",
        "transition-all duration-200 ease-out",
        mini ? "justify-center h-10 w-10 mx-auto" : "gap-3 px-3 py-2.5",
        active
          ? "bg-brand-gold/15 text-brand-gold shadow-[inset_0_0_0_1px_rgba(201,168,76,0.15)]"
          : "text-white/55 hover:bg-white/[0.06] hover:text-white/90"
      )}
    >
      {/* Active indicator bar */}
      {active && !mini && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-gold" />
      )}
      {active && mini && (
        <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-brand-gold" />
      )}

      <Icon
        className={cn(
          "shrink-0 transition-colors duration-150",
          mini ? "h-[20px] w-[20px]" : "h-[18px] w-[18px]",
          active ? "text-brand-gold" : "",
        )}
      />

      {/* Label — only in expanded mode */}
      {!mini && <span className="flex-1 truncate">{item.label}</span>}

      {/* Badge — only in expanded mode */}
      {!mini && item.badge !== undefined && item.badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/10 px-1.5 text-[10px] font-bold tabular-nums text-white/70">
          {item.badge}
        </span>
      )}

      {/* Tooltip — only in collapsed mode */}
      {mini && (
        <span
          className={cn(
            "pointer-events-none absolute left-full ml-3 z-[70]",
            "whitespace-nowrap rounded-lg bg-[#1a1a2e] px-3 py-1.5 text-[12px] font-medium text-white",
            "opacity-0 translate-x-1 transition-all duration-150",
            "shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
            "group-hover/nav:opacity-100 group-hover/nav:translate-x-0",
          )}
        >
          {item.label}
          {/* Tooltip arrow */}
          <span className="absolute -left-1 top-1/2 -translate-y-1/2 h-2 w-2 rotate-45 bg-[#1a1a2e]" />
        </span>
      )}
    </Link>
  );
}

/* ─── Period Selector ─── */
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
          "transition-all duration-150 hover:shadow-[var(--shadow-sm)] hover:border-border",
        )}
      >
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <span className="hidden sm:inline">{label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-150", open && "rotate-180")} />
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
                  "flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm transition-colors duration-150",
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

/* ═══════════════════════════════════════════════════════
   AppShell — Collapsible sidebar + polished header
   ═══════════════════════════════════════════════════════ */
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
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Hydrate collapse preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("ram-sidebar");
    if (saved === "collapsed") setCollapsed(true);
    setMounted(true);
  }, []);

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("ram-sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  }

  const nav = NAV[role];
  const title = titleFor(pathname, nav);
  const roleLabel = role === "super_admin" ? "Super Admin" : "Franchise Admin";
  const initials = (email.split("@")[0]?.slice(0, 2) || "U").toUpperCase();
  const displayName = email.split("@")[0] || "Admin";
  void contextLabel;
  const homeHref = role === "super_admin" ? "/dashboard" : "/franchise";
  const showPeriod = pathname === "/dashboard";
  const sidebarWidth = collapsed ? SIDEBAR_W_MINI : SIDEBAR_W;

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const closeMobile = () => setMobileOpen(false);
  const mainGroups = nav.groups.filter((g) => g.label !== "Account");
  const accountGroup = nav.groups.find((g) => g.label === "Account");

  // On mobile overlay, always show expanded sidebar
  const isMini = collapsed && !mobileOpen;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden",
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={closeMobile}
      />

      {/* ═══════════ Sidebar ═══════════ */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden",
          "bg-[var(--sidebar-bg)] text-white",
          "transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
          // Mobile: always full width, slide in/out
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        )}
        style={{
          width: mobileOpen ? SIDEBAR_W : (mounted ? sidebarWidth : SIDEBAR_W),
        }}
      >
        {/* ── Brand header ── */}
        <div
          className={cn(
            "flex h-[64px] shrink-0 items-center border-b border-white/[0.06]",
            isMini ? "justify-center px-3" : "justify-between px-5",
          )}
        >
          <Link href={homeHref} className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-gold text-sm font-bold text-brand-navy shadow-[0_2px_8px_rgba(201,168,76,0.3)]">
              R
            </span>
            {!isMini && (
              <span className="font-heading text-base font-bold tracking-tight whitespace-nowrap">
                RAM<span className="text-brand-gold">Admin</span>
              </span>
            )}
          </Link>

          {/* Desktop collapse toggle */}
          {!isMini && (
            <button
              onClick={toggleCollapse}
              className="hidden lg:flex shrink-0 h-8 w-8 items-center justify-center rounded-lg text-white/35 transition-all duration-200 hover:bg-white/[0.08] hover:text-white/70"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
          {isMini && (
            <button
              onClick={toggleCollapse}
              className="hidden lg:flex absolute -right-0 top-[18px] h-7 w-7 items-center justify-center rounded-lg text-white/35 transition-all duration-200 hover:bg-white/[0.08] hover:text-white/70"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Mobile close */}
          <button
            onClick={closeMobile}
            className="ml-auto rounded-lg p-1.5 text-white/40 transition-colors duration-150 hover:bg-white/[0.08] hover:text-white/70 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav
          className={cn(
            "sidebar-scroll flex flex-1 flex-col overflow-y-auto overflow-x-hidden",
            isMini ? "px-2 pt-4 pb-2" : "px-3 pt-2 pb-2",
          )}
        >
          {mainGroups.map((group, gi) => (
            <div key={group.label} className={gi > 0 ? "mt-2" : ""}>
              {!isMini ? (
                <p className="font-heading px-3 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25">
                  {group.label}
                </p>
              ) : (
                gi > 0 && <div className="my-3 mx-2 h-px bg-white/[0.06]" />
              )}
              <div className={cn("space-y-0.5", isMini && "flex flex-col items-center gap-1")}>
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} onClick={closeMobile} mini={isMini} />
                ))}
              </div>
            </div>
          ))}

          {/* Account group — bottom */}
          {accountGroup && (
            <div className="mt-auto">
              {!isMini ? (
                <p className="font-heading px-3 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25">
                  {accountGroup.label}
                </p>
              ) : (
                <div className="my-3 mx-2 h-px bg-white/[0.06]" />
              )}
              <div className={cn("space-y-0.5", isMini && "flex flex-col items-center gap-1")}>
                {accountGroup.items.map((item) => (
                  <NavLink key={item.href + "-acct"} item={item} pathname={pathname} onClick={closeMobile} mini={isMini} />
                ))}
              </div>
            </div>
          )}

          {/* Bottom nav items (franchise_admin) */}
          {nav.bottom.length > 0 && (
            <div className={cn("mt-auto", isMini && "flex flex-col items-center gap-1")}>
              {isMini && <div className="my-3 mx-2 h-px bg-white/[0.06]" />}
              {nav.bottom.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} onClick={closeMobile} mini={isMini} />
              ))}
            </div>
          )}
        </nav>

        {/* ── Profile footer ── */}
        <div
          className={cn(
            "shrink-0 border-t border-white/[0.06]",
            isMini ? "px-2 py-3" : "px-4 py-3",
          )}
        >
          <div className={cn("flex items-center", isMini ? "justify-center" : "gap-3")}>
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-gold/30 to-brand-gold/10 text-xs font-bold text-brand-gold",
                isMini ? "h-10 w-10" : "h-9 w-9 ring-2 ring-brand-gold/10",
              )}
            >
              {initials}
            </span>
            {!isMini && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="font-heading truncate text-[13px] font-semibold text-white/90">{displayName}</p>
                  <p className="truncate text-[11px] text-white/35">{roleLabel}</p>
                </div>
                <button
                  onClick={signOut}
                  className="shrink-0 rounded-lg p-1.5 text-white/30 transition-all duration-150 hover:bg-red-500/10 hover:text-red-400"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ═══════════ Main column ═══════════ */}
      <div
        className="min-h-screen transition-[margin-left] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
        style={{ marginLeft: mounted ? undefined : 0 }}
      >
        {/* Dynamic margin via injected style */}
        <style>{`
          @media (min-width: 1024px) {
            [data-main-area] { margin-left: ${sidebarWidth}px; }
          }
        `}</style>

        <div data-main-area className="transition-[margin-left] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]">
          {/* ── Top bar ── */}
          <header className="sticky top-0 z-30 flex h-[64px] items-center gap-3 border-b border-border/40 bg-white/85 px-4 backdrop-blur-xl sm:px-6">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Title + subtitle */}
            <div className="min-w-0 shrink-0">
              <h1 className="font-heading text-base font-bold text-brand-navy leading-tight">{title}</h1>
              {showPeriod && (
                <p className="text-[12px] text-muted-foreground/70 leading-tight mt-0.5">Welcome back, {displayName}</p>
              )}
            </div>

            {/* ── Header Search Bar ── */}
            <div className="mx-6 hidden md:flex flex-1 max-w-sm">
              <label className="flex w-full items-center gap-2.5 rounded-xl border border-border/50 bg-muted/30 px-3.5 py-2 transition-all duration-200 focus-within:bg-white focus-within:border-brand-navy/20 focus-within:shadow-[0_0_0_3px_rgba(27,58,107,0.06)]">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                <input
                  type="text"
                  placeholder="Search here..."
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none"
                />
              </label>
            </div>

            {/* Right actions */}
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              {/* Mobile search */}
              <button className="md:hidden rounded-lg p-2 text-muted-foreground transition-colors duration-150 hover:bg-muted/60 hover:text-foreground">
                <Search className="h-[18px] w-[18px]" />
              </button>

              {showPeriod && (
                <Suspense fallback={null}>
                  <PeriodSelector />
                </Suspense>
              )}

              {/* Bell */}
              <button className="relative rounded-lg p-2 text-muted-foreground transition-all duration-150 hover:bg-muted/60 hover:text-foreground">
                <Bell className="h-[18px] w-[18px]" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-gold ring-2 ring-white" />
              </button>

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg p-1 pr-2 transition-all duration-150",
                    menuOpen ? "bg-muted" : "hover:bg-muted/40",
                  )}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-navy text-[11px] font-bold text-white ring-2 ring-brand-navy/10">
                    {initials}
                  </span>
                  <ChevronDown className={cn("hidden h-3 w-3 text-muted-foreground transition-transform duration-150 sm:block", menuOpen && "rotate-180")} />
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-border/40 bg-white shadow-[var(--shadow-lg)] animate-in fade-in-0 zoom-in-95 duration-150">
                      <div className="border-b border-border/40 px-4 py-3.5">
                        <p className="truncate text-sm font-medium text-foreground">{email}</p>
                        <span className="mt-1.5 inline-flex items-center rounded-full bg-brand-navy/[0.06] px-2.5 py-0.5 text-[11px] font-semibold text-brand-navy">
                          {roleLabel}
                        </span>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={signOut}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-foreground transition-colors duration-150 hover:bg-red-50 hover:text-red-600"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Export button */}
              {showPeriod && (
                <button className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-navy shadow-[0_2px_8px_rgba(201,168,76,0.3)] transition-all duration-150 hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] hover:brightness-105 active:scale-[0.97]">
                  Export
                  <Download className="h-4 w-4" />
                </button>
              )}
            </div>
          </header>

          <main className="min-h-[calc(100vh-64px)]">{children}</main>
        </div>
      </div>
    </div>
  );
}
