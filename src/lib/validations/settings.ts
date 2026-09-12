import { z } from "zod";

// ---------------------------------------------------------------------------
// Organization profile — only fields that already exist on the Organization
// model (name, phone, email, address). No city/state/country/postal code:
// the schema doesn't have them, and the brief is explicit not to invent
// fields that aren't there.
// ---------------------------------------------------------------------------

export const organizationUpdateSchema = z.object({
  name: z.string().trim().min(1, "Gym name is required").max(150),
  email: z.string().trim().email("Enter a valid email address").max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
});

export type OrganizationFormValues = z.infer<typeof organizationUpdateSchema>;

// ---------------------------------------------------------------------------
// Preferences — Organization.timezone/currency are plain strings in the
// database (see prisma/schema.prisma), validated here against a short,
// curated allow-list so the column can never end up holding garbage. Adding
// a new supported currency/timezone later is a one-line change here, not a
// migration.
// ---------------------------------------------------------------------------

export const SUPPORTED_CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED"] as const;
export const SUPPORTED_TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Dhaka",
  "UTC",
  "Europe/London",
  "America/New_York",
] as const;

export const preferencesSchema = z.object({
  currency: z.enum(SUPPORTED_CURRENCIES, { error: "Select a supported currency" }),
  timezone: z.enum(SUPPORTED_TIMEZONES, { error: "Select a supported timezone" }),
});

export type PreferencesFormValues = z.infer<typeof preferencesSchema>;

// ---------------------------------------------------------------------------
// Staff accounts — role is intentionally NOT a field on any of these
// schemas. New accounts created via createStaff are always STAFF, decided
// server-side (see src/actions/settings.ts); nothing here lets a client
// request a different role.
// ---------------------------------------------------------------------------

const staffPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long"); // bcrypt silently truncates beyond 72 bytes

export const staffCreateSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email address").max(160),
    password: staffPassword,
    confirmPassword: z.string().min(1, "Confirm the password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type StaffCreateValues = z.infer<typeof staffCreateSchema>;

export const staffUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address").max(160),
  isActive: z.boolean(),
});

export type StaffUpdateValues = z.infer<typeof staffUpdateSchema>;
