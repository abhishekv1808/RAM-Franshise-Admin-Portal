import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CreateFranchiseForm } from "@/components/dashboard/CreateFranchiseForm";

export const metadata = { title: "Add Franchise · RAM Admin" };

export default function NewFranchisePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <Link
        href="/dashboard/franchises"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-brand-navy"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to franchises
      </Link>

      <div className="mt-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
          Add Franchise
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a territory and invite its admin. The admin receives an email
          with a link to set their own password.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <CreateFranchiseForm />
      </div>
    </div>
  );
}
