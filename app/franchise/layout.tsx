import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";

export default async function FranchiseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("franchises(name)")
    .eq("id", user.id)
    .maybeSingle();
  const fr = me?.franchises as unknown as { name: string } | null;

  return (
    <AppShell
      role="franchise_admin"
      email={user.email ?? ""}
      contextLabel={fr?.name ?? "Franchise"}
    >
      {children}
    </AppShell>
  );
}
