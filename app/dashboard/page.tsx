export default function DashboardPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="rounded-full bg-brand-navy/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-navy">
        Super Admin
      </span>
      <h1 className="text-3xl font-bold tracking-tight text-brand-navy">
        Super Admin — coming soon
      </h1>
      <p className="max-w-md text-muted-foreground">
        The head-office dashboard will live here. Routing and access control are
        wired up.
      </p>
    </main>
  );
}
