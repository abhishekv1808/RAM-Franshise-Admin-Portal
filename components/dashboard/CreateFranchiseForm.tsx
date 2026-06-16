"use client";

import { useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";

import { createFranchise } from "@/app/dashboard/franchises/actions";
import {
  createFranchiseSchema,
  type CreateFranchiseInput,
} from "@/app/dashboard/franchises/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateFranchiseForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [pincodeDraft, setPincodeDraft] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [success, setSuccess] = useState<{ email: string } | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateFranchiseInput>({
    resolver: zodResolver(createFranchiseSchema),
    defaultValues: {
      name: "",
      code: "",
      city: "",
      pincodes: [],
      commission: 0,
      adminEmail: "",
      adminName: "",
      adminPassword: "",
      contactPhone: "",
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

  async function onSubmit(values: CreateFranchiseInput) {
    setFormError(null);
    const result = await createFranchise({ ...values, code: values.code.toUpperCase() });
    if (result.ok) {
      setSuccess({ email: values.adminEmail });
      return;
    }
    if (result.field) {
      setError(result.field, { message: result.error });
    } else {
      setFormError(result.error);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold text-emerald-800">Franchise created</p>
            <p className="mt-1 text-sm text-emerald-700">
              The admin can sign in now at the login page with{" "}
              <span className="font-semibold">{success.email}</span> and the password you set.
              Share these credentials with them securely.
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => router.push("/dashboard/franchises")}
                className="bg-brand-navy hover:bg-brand-navy/90"
              >
                Back to franchises
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {formError && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Franchise Name" error={errors.name?.message}>
          <Input placeholder="Mysore Franchise" {...register("name")} />
        </Field>
        <Field label="Code" error={errors.code?.message} hint="Uppercase, used in invoice numbers">
          <Input
            placeholder="MYS"
            className="uppercase"
            maxLength={10}
            {...register("code", {
              onChange: (e) => (e.target.value = e.target.value.toUpperCase()),
            })}
          />
        </Field>
        <Field label="City" error={errors.city?.message}>
          <Input placeholder="Mysore" {...register("city")} />
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
      </div>

      {/* Pincodes */}
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

      <div className="border-t border-border pt-5">
        <p className="mb-1 text-sm font-semibold text-brand-navy">Franchise Admin</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Set the admin&apos;s sign-in credentials. They log in with this email and password —
          no email invite is sent. You can change the password later from the franchise page.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Admin Name" error={errors.adminName?.message}>
            <Input placeholder="Ravi Kumar" {...register("adminName")} />
          </Field>
          <Field label="Admin Email" error={errors.adminEmail?.message} hint="Used as their login username">
            <Input
              type="email"
              placeholder="mysore@rightassetsmanagement.com"
              {...register("adminEmail")}
            />
          </Field>
          <Field label="Password" error={errors.adminPassword?.message} hint="At least 8 characters">
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                placeholder="Set a password"
                autoComplete="new-password"
                className="pr-10"
                {...register("adminPassword")}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                tabIndex={-1}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground/50 transition-colors hover:text-foreground"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <Field label="Contact Phone" error={errors.contactPhone?.message}>
            <Input placeholder="+91 98xxxxxxx" {...register("contactPhone")} />
          </Field>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-5">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/franchises")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-brand-navy hover:bg-brand-navy/90"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creating…
            </>
          ) : (
            "Create Franchise"
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
