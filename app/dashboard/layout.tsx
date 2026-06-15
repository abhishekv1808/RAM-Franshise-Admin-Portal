import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Middleware guarantees only super_admin reaches /dashboard.
  return (
    <AppShell role="super_admin" email={user.email ?? ""} contextLabel="Head Office">
      {children}
    </AppShell>
  );
}
