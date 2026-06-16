"use client";

import { useState, type KeyboardEvent, type ReactNode, type ElementType } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  X,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Percent,
  Users,
  CalendarDays,
  Ban,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Building2,
  Clock,
} from "lucide-react";

import {
  updateFranchise,
  setFranchiseAdminPassword,
  setFranchiseStatus,
} from "@/app/dashboard/franchises/actions";
import {
  updateFranchiseSchema,
  type UpdateFranchiseInput,
  type FranchiseStatus,
} from "@/app/dashboard/franchises/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type FranchiseDetail = {
  id: string;
  name: string;
  code: string;
  city: string | null;
  status: string;
  pincodes: string[];
  commission_percent: number;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
  leadCount: number;
};

export type FranchiseAdmin = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
} | null;

export type ActivityEntry = {
  id: string;
  action: string;
  created_at: string;
  details: Record<string, unknown> | null;
};

const HQ_CODE = "HQ";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/* ── Shared building blocks (match dashboard / lead-detail aesthetic) ── */
function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border/40 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]", className)}>
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, children, action }: { icon: ElementType; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <p className="flex items-center gap-2 font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
        <Icon className="h-3.5 w-3.5" /> {children}
      </p>
      {action}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize",
        isActive ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
      )}
    >
      <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", isActive ? "bg-emerald-500" : "bg-amber-500")} />
      {status}
    </span>
  );
}

export function FranchiseDetailEditor({
  initial,
  admin,
  activity,
}: {
  initial: FranchiseDetail;
  admin: FranchiseAdmin;
  activity: ActivityEntry[];
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(initial);
  const [editing, setEditing] = useState(false);
  const isHQ = current.code === HQ_CODE;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-brand-navy">{current.name}</h1>
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">{current.code}</span>
            <StatusBadge status={current.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground/70">
            {current.city ?? "—"} · {current.leadCount} {current.leadCount === 1 ? "lead" : "leads"} · created {fmtDate(current.created_at)}
          </p>
        </div>
        {!editing && !isHQ && (
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        )}
      </div>

      {isHQ && (
        <div className="flex items-start gap-2 rounded-xl border border-brand-gold/30 bg-brand-gold/5 px-3.5 py-2.5 text-sm text-brand-navy">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Head Office is the system&apos;s unassigned-lead pool, not a real franchise — its territory and
            admin aren&apos;t editable here.
          </span>
        </div>
      )}

      {editing ? (
        <EditForm
          current={current}
          onCancel={() => setEditing(false)}
          onSaved={(next) => {
            setCurrent((c) => ({ ...c, ...next }));
            setEditing(false);
            router.refresh();
          }}
        />
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-3">
            {/* Left: territory + activity */}
            <div className="space-y-5 lg:col-span-2">
              <Card>
                <SectionTitle icon={Building2}>Territory &amp; terms</SectionTitle>
                <dl className="divide-y divide-border/30">
                  <DetailRow icon={MapPin} label="City">{current.city ?? "—"}</DetailRow>
                  <DetailRow icon={Percent} label="Commission">{current.commission_percent}%</DetailRow>
                  <DetailRow icon={CalendarDays} label="Created">{fmtDate(current.created_at)}</DetailRow>
                </dl>
                <div className="mt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                    Territory pincodes
                  </p>
                  {current.pincodes.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {current.pincodes.map((p) => (
                        <span key={p} className="rounded-md bg-brand-navy/[0.07] px-2 py-0.5 font-mono text-xs font-medium text-brand-navy">
                          {p}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground/60">No pincodes assigned.</p>
                  )}
                </div>
              </Card>

              {activity.length > 0 && (
                <Card>
                  <SectionTitle icon={Clock}>Recent activity</SectionTitle>
                  <ol className="space-y-4 border-l border-border/40 pl-5">
                    {activity.map((a) => (
                      <li key={a.id} className="relative">
                        <span className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full bg-brand-navy/30 ring-4 ring-white" />
                        <p className="text-[13px] font-medium capitalize text-foreground">{a.action.replace(/_/g, " ")}</p>
                        <p className="text-[11px] text-muted-foreground/60">{fmtDate(a.created_at)}</p>
                      </li>
                    ))}
                  </ol>
                </Card>
              )}
            </div>

            {/* Right: admin + access */}
            <div className="space-y-5">
              <Card>
                <SectionTitle icon={Users}>Franchise admin</SectionTitle>
                {isHQ || !admin ? (
                  <p className="text-sm text-muted-foreground/60">No franchise admin assigned.</p>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-navy/10 to-brand-navy/[0.03] text-sm font-bold text-brand-navy ring-1 ring-brand-navy/[0.06]">
                        {admin.full_name?.charAt(0)?.toUpperCase() ?? "A"}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-foreground">{admin.full_name ?? "—"}</p>
                        <p className="text-[12px] text-muted-foreground/60">Franchise Admin</p>
                      </div>
                    </div>
                    <dl className="mt-4 divide-y divide-border/30">
                      <DetailRow icon={Mail} label="Email">{admin.email ?? current.contact_email ?? "—"}</DetailRow>
                      <DetailRow icon={Phone} label="Phone">{admin.phone ?? current.contact_phone ?? "—"}</DetailRow>
                    </dl>
                    <AdminPassword franchiseId={current.id} />
                  </>
                )}
              </Card>

              {!isHQ && (
                <StatusManager
                  franchiseId={current.id}
                  status={current.status}
                  adminEmail={admin?.email ?? "this admin"}
                  onChanged={(next) => {
                    setCurrent((c) => ({ ...c, status: next }));
                    router.refresh();
                  }}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DetailRow({ icon: Icon, label, children }: { icon: ElementType; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="flex items-center gap-2 text-[13px] text-muted-foreground/70">
        <Icon className="h-3.5 w-3.5 text-muted-foreground/40" /> {label}
      </span>
      <span className="min-w-0 truncate text-right text-[13px] font-medium text-foreground">{children}</span>
    </div>
  );
}

function AdminPassword({ franchiseId }: { franchiseId: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    if (password.length < 8) {
      setState("error");
      setMsg("Password must be at least 8 characters.");
      return;
    }
    setState("saving");
    setMsg(null);
    const res = await setFranchiseAdminPassword(franchiseId, password);
    if (res.ok) {
      setState("saved");
      setPassword("");
      setOpen(false);
      setTimeout(() => setState("idle"), 2500);
    } else {
      setState("error");
      setMsg(res.error);
    }
  }

  return (
    <div className="mt-4 border-t border-border/30 pt-4">
      {!open ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setOpen(true); setState("idle"); setMsg(null); }}>
            <KeyRound className="h-4 w-4" /> Set / change password
          </Button>
          {state === "saved" && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Password updated.
            </span>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
            New password for this admin
          </Label>
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              tabIndex={-1}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground/50 transition-colors hover:text-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={state === "saving"} className="bg-brand-navy hover:bg-brand-navy/90">
              {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save password"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setOpen(false); setPassword(""); setMsg(null); setState("idle"); }} disabled={state === "saving"}>
              Cancel
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground/60">
            The admin signs in with their email and this password. Share it securely.
          </p>
        </div>
      )}
      {state === "error" && msg && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" /> {msg}
        </p>
      )}
    </div>
  );
}

function StatusManager({
  franchiseId,
  status,
  adminEmail,
  onChanged,
}: {
  franchiseId: string;
  status: string;
  adminEmail: string;
  onChanged: (next: FranchiseStatus) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function apply(next: FranchiseStatus) {
    setBusy(true);
    setErr(null);
    const res = await setFranchiseStatus(franchiseId, next);
    setBusy(false);
    if (res.ok) {
      setConfirming(false);
      onChanged(next);
    } else {
      setErr(res.error);
    }
  }

  if (status === "suspended") {
    return (
      <Card className="border-amber-200/70 bg-amber-50/40">
        <SectionTitle icon={Ban}>Access suspended</SectionTitle>
        <p className="text-[13px] text-amber-700/90">
          {adminEmail} cannot sign in. All data is retained and restored on reactivation.
        </p>
        <Button onClick={() => apply("active")} disabled={busy} className="mt-4 w-full bg-emerald-600 text-white hover:bg-emerald-700">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Reactivate access
        </Button>
        {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle icon={ShieldCheck}>Access</SectionTitle>
      <p className="text-[13px] text-muted-foreground/70">
        Suspend to immediately block this franchise admin&apos;s sign-in. Data is never deleted.
      </p>
      <Button onClick={() => setConfirming(true)} className="mt-4 w-full bg-red-600 text-white hover:bg-red-700">
        <Ban className="h-4 w-4" /> Suspend access
      </Button>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && setConfirming(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border/40 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
                <Ban className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-brand-navy">Suspend this franchise?</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  This blocks <span className="font-medium text-foreground">{adminEmail}</span>&apos;s access.
                  Their data is retained. Continue?
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirming(false)} disabled={busy}>Cancel</Button>
              <Button onClick={() => apply("suspended")} disabled={busy} className="bg-red-600 text-white hover:bg-red-700">
                {busy ? (<><Loader2 className="h-4 w-4 animate-spin" /> Suspending…</>) : "Confirm suspend"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function EditForm({
  current,
  onCancel,
  onSaved,
}: {
  current: FranchiseDetail;
  onCancel: () => void;
  onSaved: (next: Partial<FranchiseDetail>) => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [pincodeDraft, setPincodeDraft] = useState("");

  const {
    register,
    handleSubmit,
    control,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UpdateFranchiseInput>({
    resolver: zodResolver(updateFranchiseSchema),
    defaultValues: {
      id: current.id,
      name: current.name,
      city: current.city ?? "",
      pincodes: current.pincodes,
      commission: current.commission_percent,
      contactEmail: current.contact_email ?? "",
      contactPhone: current.contact_phone ?? "",
    },
  });

  const pincodes = watch("pincodes");

  function addPincode() {
    const v = pincodeDraft.trim();
    if (!/^\d{6}$/.test(v)) return;
    if (!pincodes.includes(v)) setValue("pincodes", [...pincodes, v], { shouldValidate: true });
    setPincodeDraft("");
  }

  function onPincodeKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addPincode();
    }
  }

  async function onSubmit(values: UpdateFranchiseInput) {
    setFormError(null);
    const res = await updateFranchise(values);
    if (res.ok) {
      onSaved({
        name: values.name,
        city: values.city,
        pincodes: values.pincodes,
        commission_percent: values.commission,
        contact_email: values.contactEmail || null,
        contact_phone: values.contactPhone || null,
      });
      return;
    }
    if (res.field) setError(res.field, { message: res.error });
    else setFormError(res.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-2xl border border-border/40 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]" noValidate>
      {formError && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/[0.06] px-3.5 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Franchise Name" error={errors.name?.message}>
          <Input {...register("name")} />
        </Field>
        <Field label="Code" hint="Immutable — used in invoice numbers">
          <Input value={current.code} disabled className="font-mono" />
        </Field>
        <Field label="City" error={errors.city?.message}>
          <Input {...register("city")} />
        </Field>
        <Field label="Commission %" error={errors.commission?.message}>
          <Input type="number" min={0} max={100} step="0.5" {...register("commission", { valueAsNumber: true })} />
        </Field>
        <Field label="Contact Email" error={errors.contactEmail?.message}>
          <Input type="email" {...register("contactEmail")} />
        </Field>
        <Field label="Contact Phone" error={errors.contactPhone?.message}>
          <Input {...register("contactPhone")} />
        </Field>
      </div>

      <Controller
        control={control}
        name="pincodes"
        render={() => (
          <Field label="Territory Pincodes" error={errors.pincodes?.message} hint="Type a 6-digit pincode and press Enter">
            <div className="rounded-xl border border-border/50 bg-muted/30 px-2 py-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {pincodes.map((p) => (
                  <span key={p} className="inline-flex items-center gap-1 rounded-md bg-brand-navy/[0.07] px-2 py-0.5 font-mono text-xs font-medium text-brand-navy">
                    {p}
                    <button
                      type="button"
                      onClick={() => setValue("pincodes", pincodes.filter((x) => x !== p), { shouldValidate: true })}
                      className="text-brand-navy/60 hover:text-brand-navy"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  value={pincodeDraft}
                  onChange={(e) => setPincodeDraft(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={onPincodeKey}
                  onBlur={addPincode}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder={pincodes.length ? "" : "570001"}
                  className="min-w-[80px] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none"
                />
              </div>
            </div>
          </Field>
        )}
      />

      <div className="flex justify-end gap-2 border-t border-border/30 pt-5">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" className="bg-brand-navy hover:bg-brand-navy/90" disabled={isSubmitting}>
          {isSubmitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>) : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-foreground">{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
