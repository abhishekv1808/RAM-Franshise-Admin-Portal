"use client";

import { useState, type KeyboardEvent } from "react";
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
} from "lucide-react";

import {
  updateFranchise,
  resendInvite,
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
import { Badge } from "@/components/ui/badge";
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
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent font-medium capitalize",
        isActive ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
      )}
    >
      {status}
    </Badge>
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
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
              {current.name}
            </h1>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
              {current.code}
            </span>
            <StatusBadge status={current.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {current.city ?? "—"} · {current.leadCount}{" "}
            {current.leadCount === 1 ? "lead" : "leads"} · created {fmtDate(current.created_at)}
          </p>
        </div>
        {!editing && !isHQ && (
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        )}
      </div>

      {isHQ && (
        <div className="flex items-start gap-2 rounded-md border border-brand-gold/30 bg-brand-gold/5 px-3 py-2 text-sm text-brand-navy">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Head Office is the system&apos;s unassigned-lead pool, not a real franchise —
            its territory and admin aren&apos;t editable here.
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
          <DetailView current={current} admin={admin} isHQ={isHQ} />
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
        </>
      )}

      {/* Recent activity */}
      {activity.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-brand-navy">Recent activity</h2>
          <ul className="space-y-2">
            {activity.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-sm">
                <span className="capitalize text-foreground">
                  {a.action.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-muted-foreground">{fmtDate(a.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm text-foreground">{children}</div>
      </div>
    </div>
  );
}

function DetailView({
  current,
  admin,
  isHQ,
}: {
  current: FranchiseDetail;
  admin: FranchiseAdmin;
  isHQ: boolean;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Territory & terms */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-brand-navy">Territory &amp; terms</h2>
        <div className="space-y-4">
          <InfoRow icon={MapPin} label="City">
            {current.city ?? "—"}
          </InfoRow>
          <InfoRow icon={Percent} label="Commission">
            {current.commission_percent}%
          </InfoRow>
          <InfoRow icon={Users} label="Territory pincodes">
            {current.pincodes.length ? (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {current.pincodes.map((p) => (
                  <span
                    key={p}
                    className="rounded bg-brand-navy/10 px-2 py-0.5 text-xs font-medium text-brand-navy"
                  >
                    {p}
                  </span>
                ))}
              </div>
            ) : (
              "—"
            )}
          </InfoRow>
          <InfoRow icon={CalendarDays} label="Created">
            {fmtDate(current.created_at)}
          </InfoRow>
        </div>
      </div>

      {/* Admin / contact */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-brand-navy">Franchise admin</h2>
        {isHQ || !admin ? (
          <p className="text-sm text-muted-foreground">No franchise admin assigned.</p>
        ) : (
          <div className="space-y-4">
            <InfoRow icon={Users} label="Name">
              {admin.full_name ?? "—"}
            </InfoRow>
            <InfoRow icon={Mail} label="Email">
              {admin.email ?? current.contact_email ?? "—"}
            </InfoRow>
            <InfoRow icon={Phone} label="Phone">
              {admin.phone ?? current.contact_phone ?? "—"}
            </InfoRow>
            <ResendInvite franchiseId={current.id} />
          </div>
        )}
      </div>
    </div>
  );
}

function ResendInvite({ franchiseId }: { franchiseId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  async function send() {
    setState("sending");
    setMsg(null);
    const res = await resendInvite(franchiseId);
    if (res.ok) {
      setState("sent");
    } else {
      setState("error");
      setMsg(res.error);
    }
  }

  return (
    <div className="border-t border-border pt-4">
      <Button variant="outline" size="sm" onClick={send} disabled={state === "sending"}>
        {state === "sending" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending…
          </>
        ) : (
          <>
            <Mail className="h-4 w-4" /> Resend invite
          </>
        )}
      </Button>
      {state === "sent" && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" /> Password-setup email sent.
        </p>
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
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <Ban className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Access suspended</p>
              <p className="text-xs text-amber-700">
                {adminEmail} cannot sign in. All data is retained and restored on
                reactivation.
              </p>
            </div>
          </div>
          <Button
            onClick={() => apply("active")}
            disabled={busy}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Reactivate
          </Button>
        </div>
        {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-navy">Access</p>
          <p className="text-xs text-muted-foreground">
            Suspend to immediately block this franchise admin&apos;s sign-in. Data is
            never deleted.
          </p>
        </div>
        <Button
          onClick={() => setConfirming(true)}
          className="bg-red-600 text-white hover:bg-red-700"
        >
          <Ban className="h-4 w-4" /> Suspend access
        </Button>
      </div>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !busy && setConfirming(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
                <Ban className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-brand-navy">Suspend this franchise?</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  This blocks <span className="font-medium text-foreground">{adminEmail}</span>
                  &apos;s access. Their data is retained. Continue?
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirming(false)} disabled={busy}>
                Cancel
              </Button>
              <Button
                onClick={() => apply("suspended")}
                disabled={busy}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Suspending…
                  </>
                ) : (
                  "Confirm suspend"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
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
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5 rounded-xl border border-border bg-card p-6"
      noValidate
    >
      {formError && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
          <Input
            type="number"
            min={0}
            max={100}
            step="0.5"
            {...register("commission", { valueAsNumber: true })}
          />
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
          <Field
            label="Territory Pincodes"
            error={errors.pincodes?.message}
            hint="Type a 6-digit pincode and press Enter"
          >
            <div className="rounded-md border border-input bg-transparent px-2 py-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {pincodes.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1 rounded bg-brand-navy/10 px-2 py-0.5 text-xs font-medium text-brand-navy"
                  >
                    {p}
                    <button
                      type="button"
                      onClick={() =>
                        setValue(
                          "pincodes",
                          pincodes.filter((x) => x !== p),
                          { shouldValidate: true }
                        )
                      }
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

      <div className="flex justify-end gap-2 border-t border-border pt-5">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-brand-navy hover:bg-brand-navy/90"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            "Save changes"
          )}
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
  children: React.ReactNode;
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
