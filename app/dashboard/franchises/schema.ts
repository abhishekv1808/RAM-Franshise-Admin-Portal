import { z } from "zod";

// Shared by the server action and the client form.
export const createFranchiseSchema = z.object({
  name: z.string().trim().min(2, "Franchise name is required"),
  code: z
    .string()
    .trim()
    .min(2, "Code must be at least 2 characters")
    .max(10, "Code must be at most 10 characters")
    .regex(/^[A-Za-z0-9]+$/, "Code must be letters/numbers only"),
  city: z.string().trim().min(1, "City is required"),
  pincodes: z
    .array(z.string().regex(/^\d{6}$/, "Each pincode must be 6 digits"))
    .min(1, "Add at least one pincode"),
  commission: z
    .number({ message: "Commission is required" })
    .min(0, "Min 0")
    .max(100, "Max 100"),
  adminEmail: z.string().trim().email("Enter a valid email"),
  adminName: z.string().trim().min(2, "Admin name is required"),
  contactPhone: z.string().trim().min(7, "Enter a valid phone number"),
});

export type CreateFranchiseInput = z.infer<typeof createFranchiseSchema>;

export type CreateFranchiseResult =
  | { ok: true; franchiseId: string; inviteSent: boolean; inviteWarning?: string }
  | { ok: false; error: string; field?: keyof CreateFranchiseInput };

// Editable franchise fields (code is immutable — it appears in invoice numbers;
// status is handled separately by Suspend/Reactivate).
export const updateFranchiseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2, "Franchise name is required"),
  city: z.string().trim().min(1, "City is required"),
  pincodes: z
    .array(z.string().regex(/^\d{6}$/, "Each pincode must be 6 digits"))
    .min(1, "Add at least one pincode"),
  commission: z
    .number({ message: "Commission is required" })
    .min(0, "Min 0")
    .max(100, "Max 100"),
  contactEmail: z
    .union([z.string().trim().email("Enter a valid email"), z.literal("")])
    .optional(),
  contactPhone: z
    .union([z.string().trim().min(7, "Enter a valid phone number"), z.literal("")])
    .optional(),
});

export type UpdateFranchiseInput = z.infer<typeof updateFranchiseSchema>;

export type UpdateFranchiseResult =
  | { ok: true; franchiseId: string }
  | { ok: false; error: string; field?: keyof UpdateFranchiseInput };

export type ResendInviteResult = { ok: true } | { ok: false; error: string };

export type FranchiseStatus = "active" | "suspended";

export type SetStatusResult =
  | { ok: true; status: FranchiseStatus }
  | { ok: false; error: string };
