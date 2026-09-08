import { z } from "zod";

export const memberStatusSchema = z.enum(["ACTIVE", "INACTIVE", "EXPIRED"]);

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const memberFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(30),
  email: z.string().trim().email("Enter a valid email address").max(160).optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  gender: optionalText(40),
  address: optionalText(300),
  emergencyContactName: optionalText(120),
  emergencyContactPhone: optionalText(30),
  joiningDate: z.string().min(1, "Join date is required"),
  status: memberStatusSchema,
});

export const memberUpdateSchema = memberFormSchema.extend({ id: z.string().min(1) });
export type MemberFormValues = z.infer<typeof memberFormSchema>;