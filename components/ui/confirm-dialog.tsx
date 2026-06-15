"use client";

import { Loader2, AlertCircle, AlertTriangle } from "lucide-react";

import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { cn } from "@/lib/utils";

export type ConfirmInput = {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "default",
  busy = false,
  error,
  input,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  tone?: "default" | "danger";
  busy?: boolean;
  error?: string | null;
  input?: ConfirmInput;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  const blocked = busy || (input?.required && !input.value.trim());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={() => !busy && onCancel()}
    >
      <div
        className="w-full max-w-md rounded-[var(--radius-card)] border border-border/50 bg-white p-6 shadow-[var(--shadow-xl)] animate-in fade-in-0 zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              tone === "danger" ? "bg-red-100 text-red-600" : "bg-brand-navy/10 text-brand-navy"
            )}
          >
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-brand-navy">{title}</h3>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>

        {input && (
          <div className="mt-4 space-y-1.5">
            {input.label && <Label className="text-sm">{input.label}</Label>}
            <Input
              autoFocus
              value={input.value}
              placeholder={input.placeholder}
              onChange={(e) => input.onChange(e.target.value)}
            />
          </div>
        )}

        {error && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={blocked}
            className={
              tone === "danger"
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-brand-navy text-white hover:bg-brand-navy/90"
            }
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Working…
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
